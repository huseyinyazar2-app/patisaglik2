import { getDbClient } from './dbClient.js';
import { postApiJson } from './apiClient.js';
import { recordFeatureUsage } from './billing.js';
import { translateForLocale } from '../i18n/tr.js';
import { CLIENT_ERROR_CODES, makeCodedError } from './errorCodes.js';

const LOCAL_KEY = 'pati_form_submissions';

function makeId(prefix = 'submission') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveLocal(record) {
  const current = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  current.unshift(record);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(current.slice(0, 50)));
}

function shouldRequireRemote(userId) {
  return !import.meta.env?.DEV && userId && userId !== 'user-1';
}

function first(value) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function pick(payload, labels, fallback = '') {
  for (const label of labels) {
    if (payload[label] !== undefined) return payload[label];
  }
  return fallback;
}

function centsFromMoney(value) {
  const raw = String(value || '').replace(/[^\d,.-]/g, '');
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw.replace(/,/g, '');
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

function isoDateOrToday(value) {
  if (value && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return new Date().toISOString();
}

function isoDatePlusDays(value, days = 0) {
  if (!value || Number.isNaN(Date.parse(value))) return '';
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function titleFromPayload(payload, labels, fallback) {
  const value = first(pick(payload, labels));
  return value || fallback;
}

function text(record, key, vars = {}) {
  const value = translateForLocale(record?.locale || 'tr', key);
  return String(value).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

function label(key) {
  return translateForLocale('tr', `formLabels.${key}`);
}

function fieldLabels(key) {
  return [
    translateForLocale('tr', `formLabels.${key}`),
    translateForLocale('en', `formLabels.${key}`),
    translateForLocale('tr', `featureForm.labels.${key}`),
    translateForLocale('en', `featureForm.labels.${key}`)
  ].filter((value, index, list) => value && list.indexOf(value) === index);
}

function checkedLabels(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string' || item.checked)
    .map((item) => typeof item === 'string' ? item : item.label)
    .filter(Boolean);
}

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || Math.random().toString(36).slice(2, 10);
}

function sitterInviteDraft({ record, payload, memberId = '' }) {
  const displayName = titleFromPayload(payload, fieldLabels('invited_person'), text(record, 'freeRecords.submissions.sitter_default_name'));
  const duration = first(pick(payload, fieldLabels('access_duration'), [label('one_week')])) || label('one_week');
  const selected = checkedLabels(pick(payload, fieldLabels('permissions'), []));
  const inviteId = memberId || `invite-${record.pet_id || 'pet'}-${slug(displayName)}-${Math.random().toString(36).slice(2, 8)}`;
  const permissions = selected.join(', ') || text(record, 'freeRecords.submissions.invite_no_permissions');
  return {
    table: 'pet_members',
    inviteId,
    invitePath: `/invite/sitter/${inviteId}`,
    inviteText: text(record, 'freeRecords.submissions.invite_text', { name: displayName, duration, permissions })
  };
}

function parseJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocalQrCard(record, payload) {
  const token = `qr-${record.pet_id}-${Math.random().toString(36).slice(2, 10)}`;
  const current = parseJson(localStorage.getItem('pati_public_cards'), []);
  current.unshift({
    id: record.pet_id,
    name: 'Pet',
    species_code: 'cat',
    public_profile_token: token,
    metadata: JSON.stringify({
        qr_health_card: {
          form_submission_id: record.id,
          public_token: token,
          public_path: `/public/pet/${token}`,
        shared_fields: checkedLabels(pick(payload, fieldLabels('shared_fields'), [])),
        access_duration: first(pick(payload, fieldLabels('access_duration'), [label('one_day')])) || label('one_day'),
        updated_at: new Date().toISOString()
      }
    })
  });
  localStorage.setItem('pati_public_cards', JSON.stringify(current.slice(0, 20)));
  return { table: 'pets', publicToken: token, publicPath: `/public/pet/${token}` };
}

async function insertExpense(db, record, payload) {
  const amountCents = centsFromMoney(pick(payload, fieldLabels('amount')));
  const category = first(pick(payload, fieldLabels('category'), [text(record, 'freeRecords.submissions.expense_other')])) || text(record, 'freeRecords.submissions.expense_other');
  const spentAt = isoDateOrToday(pick(payload, fieldLabels('date')));
  const note = pick(payload, fieldLabels('note'), '');

  await db.execute({
    sql: `INSERT INTO expenses
      (id, pet_id, created_by_user_id, category, amount_cents, currency, spent_at, title, note, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      makeId('expense'),
      record.pet_id,
      record.user_id,
      category,
      amountCents,
      'TRY',
      spentAt,
      category,
      note,
      JSON.stringify({ form_submission_id: record.id, payload })
    ]
  });

  return 'expenses';
}

async function insertReminder(db, record, payload) {
  const reminderType = first(pick(payload, fieldLabels('reminder_type'), [text(record, 'freeRecords.submissions.reminder_general')])) || text(record, 'freeRecords.submissions.reminder_general');
  const title = titleFromPayload(payload, fieldLabels('title'), reminderType);
  const dueAt = isoDateOrToday(pick(payload, fieldLabels('date')));
  const repeatRule = first(pick(payload, fieldLabels('repeat'), [text(record, 'freeRecords.submissions.reminder_once')])) || text(record, 'freeRecords.submissions.reminder_once');
  const note = pick(payload, fieldLabels('note'), '');

  await db.execute({
    sql: `INSERT INTO reminders
      (id, pet_id, created_by_user_id, reminder_type, title, due_at, repeat_rule, status, note, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      makeId('reminder'),
      record.pet_id,
      record.user_id,
      reminderType,
      title,
      dueAt,
      repeatRule,
      'scheduled',
      note,
      JSON.stringify({ form_submission_id: record.id, payload })
    ]
  });

  return 'reminders';
}

function automaticReminderPayload(record, payload) {
  if (record.feature_code === 'postop') {
    const nextDate = first(pick(payload, fieldLabels('next_dose_check'), ''));
    if (!nextDate || Number.isNaN(Date.parse(nextDate))) return null;
    const medStatus = first(pick(payload, fieldLabels('medication_use'), [label('given')])) || label('given');
    return {
      [label('reminder_type')]: [label('medication')],
      [label('title')]: text(record, 'freeRecords.submissions.postop_reminder_title'),
      [label('date')]: nextDate,
      [label('repeat')]: [medStatus === label('done') ? label('once') : label('daily')],
      [label('note')]: text(record, 'freeRecords.submissions.postop_reminder_note', { status: medStatus })
    };
  }

  if (record.feature_code === 'reproduction') {
    const startDate = first(pick(payload, fieldLabels('start_date'), ''));
    const controlDate = isoDatePlusDays(startDate, 7);
    if (!controlDate) return null;
    const followType = first(pick(payload, fieldLabels('followup_type'), [text(record, 'freeRecords.submissions.reproduction_default_followup')])) || text(record, 'freeRecords.submissions.reproduction_default_followup');
    return {
      [label('reminder_type')]: [label('appointment')],
      [label('title')]: text(record, 'freeRecords.submissions.reproduction_reminder_title', { type: followType }),
      [label('date')]: controlDate,
      [label('repeat')]: [label('once')],
      [label('note')]: text(record, 'freeRecords.submissions.reproduction_reminder_note')
    };
  }

  return null;
}

async function insertAutomaticReminder(db, record, payload) {
  const reminderPayload = automaticReminderPayload(record, payload);
  if (!reminderPayload) return null;
  await insertReminder(db, record, reminderPayload);
  return 'reminders';
}

function saveLocalAutomaticReminder(record, payload) {
  const reminderPayload = automaticReminderPayload(record, payload);
  if (!reminderPayload) return null;
  const now = new Date().toISOString();
  const reminderRecord = {
    ...record,
    id: makeId('form'),
    feature_code: 'reminders',
    payload: JSON.stringify(reminderPayload),
    created_at: now,
    updated_at: now
  };
  saveLocal(reminderRecord);
  return 'reminders';
}

const healthRecordConfig = {
  'photo-followup': {
    type: 'photo_followup',
    titleLabels: fieldLabels('followup_subject'),
    fallbackKey: 'freeRecords.submissions.fallbacks.photo_followup',
    summaryLabels: fieldLabels('short_note')
  },
  'poop-score': {
    type: 'poop_score',
    titleLabels: fieldLabels('score'),
    fallbackKey: 'freeRecords.submissions.fallbacks.poop_score',
    summaryLabels: fieldLabels('note')
  },
  'diet-log': {
    type: 'diet_log',
    titleLabels: fieldLabels('new_food_meal'),
    fallbackKey: 'freeRecords.submissions.fallbacks.diet_log',
    summaryLabels: fieldLabels('diet_note')
  },
  chronic: {
    type: 'chronic_followup',
    titleLabels: fieldLabels('template'),
    fallbackKey: 'freeRecords.submissions.fallbacks.chronic',
    summaryLabels: fieldLabels('followup_note')
  },
  postop: {
    type: 'postop_followup',
    titleLabels: fieldLabels('surgery_day'),
    fallbackKey: 'freeRecords.submissions.fallbacks.postop',
    summaryLabels: fieldLabels('general_status')
  },
  reproduction: {
    type: 'reproduction_followup',
    titleLabels: fieldLabels('followup_type'),
    fallbackKey: 'freeRecords.submissions.fallbacks.reproduction',
    summaryLabels: fieldLabels('note')
  },
  senior: {
    type: 'senior_followup',
    titleLabels: fieldLabels('daily_status'),
    fallbackKey: 'freeRecords.submissions.fallbacks.senior',
    summaryLabels: fieldLabels('note')
  },
  toxic: {
    type: 'toxin_foreign_body',
    titleLabels: fieldLabels('what_ingested'),
    fallbackKey: 'freeRecords.submissions.fallbacks.toxic',
    summaryLabels: fieldLabels('detail')
  },
  issue: {
    type: 'issue',
    titleLabels: [label('issue_name')],
    fallbackKey: 'freeRecords.submissions.fallbacks.issue',
    summaryLabels: [label('description')]
  }
};

async function insertHealthRecord(db, record, payload, config) {
  const title = titleFromPayload(payload, config.titleLabels, text(record, config.fallbackKey));
  const summary = first(pick(payload, config.summaryLabels, ''));

  await db.execute({
    sql: `INSERT INTO health_records
      (id, pet_id, created_by_user_id, record_type, title, occurred_at, summary, payload, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      makeId('health'),
      record.pet_id,
      record.user_id,
      config.type,
      title,
      new Date().toISOString(),
      summary,
      JSON.stringify({ form_submission_id: record.id, feature_code: record.feature_code, ...payload }),
      'feature_form'
    ]
  });

  return 'health_records';
}

async function insertClinicExportDocument(db, record, payload) {
  const purpose = first(pick(payload, fieldLabels('file_purpose'), [text(record, 'freeRecords.submissions.clinic_visit')])) || text(record, 'freeRecords.submissions.clinic_visit');
  const note = pick(payload, ['Veterinere not', 'Veterinarian note'], '');
  const included = checkedLabels(pick(payload, fieldLabels('included_sections'), []));

  await db.execute({
    sql: `INSERT INTO documents
      (id, pet_id, uploaded_by_user_id, document_type, title, extracted_text, extracted_data, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      makeId('document'),
      record.pet_id,
      record.user_id,
      'clinic_export',
      text(record, 'freeRecords.submissions.clinic_export_title', { purpose }),
      note,
      JSON.stringify({ form_submission_id: record.id, feature_code: record.feature_code, purpose, included, note, payload }),
      'draft'
    ]
  });

  return 'documents';
}

async function insertUploadedDocument(db, record, payload) {
  const documentKind = first(pick(payload, fieldLabels('document_type'), [text(record, 'freeRecords.submissions.document_default_kind')])) || text(record, 'freeRecords.submissions.document_default_kind');
  const note = pick(payload, fieldLabels('extra_note'), '');
  const readGoal = first(pick(payload, fieldLabels('read_goal'), [text(record, 'freeRecords.submissions.document_default_goal')])) || text(record, 'freeRecords.submissions.document_default_goal');
  const visibleValues = pick(payload, fieldLabels('visible_important_values'), '');
  const extractionOptions = checkedLabels(pick(payload, [...fieldLabels('extraction_options'), ...fieldLabels('ai_extraction')], []));
  const files = Array.isArray(payload.__media_files) ? payload.__media_files : [];
  const aiOcr = payload.__ai_ocr_result || null;
  const extractedText = [
    aiOcr?.summary,
    aiOcr?.rawText,
    visibleValues,
    note
  ].filter(Boolean).join('\n\n');

  await db.execute({
    sql: `INSERT INTO documents
      (id, pet_id, uploaded_by_user_id, document_type, title, extracted_text, extracted_data, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      makeId('document'),
      record.pet_id,
      record.user_id,
      'health_document',
      text(record, 'freeRecords.submissions.document_title', { kind: documentKind }),
      extractedText,
      JSON.stringify({
        form_submission_id: record.id,
        feature_code: record.feature_code,
        document_kind: documentKind,
        read_goal: readGoal,
        extraction_options: extractionOptions,
        visible_values: visibleValues,
        ai_ocr: aiOcr || {
          status: 'queued_for_server',
          message: text(record, 'freeRecords.submissions.ocr_pending')
        },
        files,
        payload
      }),
      aiOcr ? 'processed' : 'ai_pending'
    ]
  });

  return 'documents';
}

async function insertVetPrepDocument(db, record, payload) {
  const reason = pick(payload, fieldLabels('visit_reason'), '');
  const urgency = first(pick(payload, fieldLabels('urgency'), [text(record, 'freeRecords.submissions.vet_prep_default_urgency')])) || text(record, 'freeRecords.submissions.vet_prep_default_urgency');
  const checklist = checkedLabels(pick(payload, fieldLabels('bring_checklist'), []));
  const questions = pick(payload, fieldLabels('my_questions'), '');

  await db.execute({
    sql: `INSERT INTO documents
      (id, pet_id, uploaded_by_user_id, document_type, title, extracted_text, extracted_data, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      makeId('document'),
      record.pet_id,
      record.user_id,
      'vet_prep',
      text(record, 'freeRecords.submissions.vet_prep_title', { urgency }),
      [reason, questions].filter(Boolean).join('\n\n'),
      JSON.stringify({
        form_submission_id: record.id,
        feature_code: record.feature_code,
        purpose: text(record, 'freeRecords.submissions.vet_visit'),
        urgency,
        included: checklist,
        reason,
        questions,
        payload
      }),
      'draft'
    ]
  });

  return 'documents';
}

async function updateQrHealthCard(db, record, payload) {
  const token = `qr-${record.pet_id}-${Math.random().toString(36).slice(2, 10)}`;
  const current = await db.execute({
    sql: 'SELECT metadata, public_profile_token FROM pets WHERE id = ? LIMIT 1',
    args: [record.pet_id]
  });
  const metadata = parseJson(current.rows[0]?.metadata);
  const publicToken = current.rows[0]?.public_profile_token || token;

  await db.execute({
    sql: `UPDATE pets
          SET public_profile_token = COALESCE(public_profile_token, ?),
              metadata = ?,
              updated_at = ?
          WHERE id = ?`,
    args: [
      publicToken,
      JSON.stringify({
        ...metadata,
        qr_health_card: {
          form_submission_id: record.id,
          public_token: publicToken,
          public_path: `/public/pet/${publicToken}`,
          shared_fields: checkedLabels(pick(payload, fieldLabels('shared_fields'), [])),
          access_duration: first(pick(payload, fieldLabels('access_duration'), [label('one_day')])) || label('one_day'),
          updated_at: new Date().toISOString()
        }
      }),
      new Date().toISOString(),
      record.pet_id
    ]
  });

  return { table: 'pets', publicToken, publicPath: `/public/pet/${publicToken}` };
}

async function insertMediaFiles(db, record, payload) {
  const files = Array.isArray(payload.__media_files) ? payload.__media_files : [];
  if (!files.length) return 0;

  await Promise.all(files.map((file) => db.execute({
    sql: `INSERT INTO media_files
      (id, pet_id, uploaded_by_user_id, related_entity_type, related_entity_id, media_type, local_uri, mime_type, file_size_bytes, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      makeId('media'),
      record.pet_id,
      record.user_id,
      'form_submission',
      record.id,
      String(file.mime_type || '').startsWith('image/') ? 'image' : 'document',
      file.local_uri || '',
      file.mime_type || '',
      Number(file.file_size_bytes || 0),
      JSON.stringify({ label: file.label || '', name: file.name || '', feature_code: record.feature_code })
    ]
  })));

  return files.length;
}

async function insertSitterInvite(db, record, payload) {
  const displayName = titleFromPayload(payload, fieldLabels('invited_person'), text(record, 'freeRecords.submissions.sitter_default_name'));
  const contact = titleFromPayload(payload, fieldLabels('phone_email'), `${slug(displayName)}@invite.local`);
  const email = contact.includes('@') ? contact : `${slug(contact)}@phone.local`;
  const duration = first(pick(payload, fieldLabels('access_duration'), [label('one_week')])) || label('one_week');
  const ends = new Date();
  if (duration.includes(label('day_suffix'))) ends.setDate(ends.getDate() + Number.parseInt(duration, 10));
  else if (duration.includes(label('month_suffix'))) ends.setMonth(ends.getMonth() + Number.parseInt(duration, 10));
  else ends.setDate(ends.getDate() + 7);

  await db.execute({
    sql: `INSERT INTO users (id, email, display_name, locale)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name`,
    args: [`user-invite-${slug(email)}`, email, displayName, record.locale || 'tr']
  });
  const userResult = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ? LIMIT 1',
    args: [email]
  });
  const invitedUserId = userResult.rows[0]?.id || `user-invite-${slug(email)}`;
  const memberId = `member-${record.pet_id}-${invitedUserId}`;

  await db.execute({
      sql: `INSERT INTO pet_members
        (id, pet_id, user_id, role_id, invited_by_user_id, status, access_starts_at, access_ends_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(pet_id, user_id) DO UPDATE SET
          role_id = excluded.role_id,
          invited_by_user_id = excluded.invited_by_user_id,
          status = excluded.status,
          access_ends_at = excluded.access_ends_at,
          updated_at = excluded.updated_at`,
      args: [
        memberId,
        record.pet_id,
        invitedUserId,
        'role-sitter',
        record.user_id,
        'invited',
        new Date().toISOString(),
        ends.toISOString(),
        new Date().toISOString()
      ]
  });

  const selected = checkedLabels(pick(payload, fieldLabels('permissions'), []));
  const permissionMap = {
    [label('add_daily_note')]: 'perm-add-health',
    [translateForLocale('en', 'formLabels.add_daily_note')]: 'perm-add-health',
    [label('view_reminder')]: 'perm-view-health',
    [translateForLocale('en', 'formLabels.view_reminder')]: 'perm-view-health',
    [label('view_emergency_card')]: 'perm-view-pet',
    [translateForLocale('en', 'formLabels.view_emergency_card')]: 'perm-view-pet',
    [label('view_reports')]: 'perm-view-reports',
    [translateForLocale('en', 'formLabels.view_reports')]: 'perm-view-reports'
  };

  await Promise.all(Object.entries(permissionMap).map(([label, permissionId]) => db.execute({
    sql: `INSERT INTO pet_member_permission_overrides (pet_member_id, permission_id, allowed)
          VALUES (?, ?, ?)
          ON CONFLICT(pet_member_id, permission_id) DO UPDATE SET allowed = excluded.allowed`,
    args: [memberId, permissionId, selected.includes(label) ? 1 : 0]
  })));

  return {
    table: 'pet_members',
    ...sitterInviteDraft({ record, payload, memberId })
  };
}

async function insertDomainRecord(db, record, payload) {
  if (!record.pet_id) return null;

  if (record.feature_code === 'expense') {
    return insertExpense(db, record, payload);
  }

  if (record.feature_code === 'reminders') {
    return insertReminder(db, record, payload);
  }

  if (record.feature_code === 'clinic-export') {
    return insertClinicExportDocument(db, record, payload);
  }

  if (record.feature_code === 'document-ai') {
    return insertUploadedDocument(db, record, payload);
  }

  if (record.feature_code === 'vet-prep') {
    return insertVetPrepDocument(db, record, payload);
  }

  if (record.feature_code === 'qr') {
    return updateQrHealthCard(db, record, payload);
  }

  if (record.feature_code === 'sitter') {
    return insertSitterInvite(db, record, payload);
  }

  const healthConfig = healthRecordConfig[record.feature_code];
  if (healthConfig) {
    const table = await insertHealthRecord(db, record, payload, healthConfig);
    await insertAutomaticReminder(db, record, payload);
    return table;
  }

  return null;
}

export async function submitFeatureForm({ userId, petId, featureCode, locale = 'tr', payload }) {
  const payloadObject = payload || {};
  const record = {
    id: makeId('form'),
    user_id: userId || 'user-1',
    pet_id: petId || null,
    feature_code: featureCode,
    locale,
    status: 'submitted',
    payload: JSON.stringify(payloadObject),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    synced_at: null
  };

  const db = getDbClient();
  if (!db) {
    try {
      const result = await postApiJson('/api/forms/submit', {
        userId: record.user_id,
        petId: record.pet_id,
        featureCode,
        locale,
        payload: payloadObject
      });
      const usageResult = await recordFeatureUsage({
        userId: record.user_id,
        petId: record.pet_id,
        featureCode,
        relatedId: result.id || result.data?.id || record.id
      });
      return {
        ok: true,
        storage: 'api',
        id: result.id || result.data?.id || record.id,
        domainTable: result.domainTable || result.data?.domainTable,
        mediaCount: result.mediaCount || result.data?.mediaCount || 0,
        usagePlan: usageResult.usage.plan_code,
        creditCost: usageResult.usage.credit_cost,
        publicToken: result.publicToken || result.data?.publicToken,
        publicPath: result.publicPath || result.data?.publicPath,
        invitePath: result.invitePath || result.data?.invitePath,
        inviteText: result.inviteText || result.data?.inviteText
      };
    } catch (error) {
      if (shouldRequireRemote(record.user_id)) {
        throw makeCodedError('form_sync_failed', {
          code: error?.code || CLIENT_ERROR_CODES.form_sync_failed,
          message: error?.message || 'form_sync_failed'
        });
      }
    }
    saveLocal({ ...record, storage: 'local-fallback' });
    const localDomain = featureCode === 'qr' && record.pet_id ? saveLocalQrCard(record, payloadObject) : null;
    const localDocument = ['clinic-export', 'document-ai', 'vet-prep'].includes(featureCode) ? 'documents' : null;
    const localHealth = healthRecordConfig[featureCode] ? 'health_records' : null;
    const localInvite = featureCode === 'sitter' ? sitterInviteDraft({ record, payload: payloadObject }) : null;
    const localReminder = record.pet_id ? saveLocalAutomaticReminder(record, payloadObject) : null;
    const usageResult = await recordFeatureUsage({
      userId: record.user_id,
      petId: record.pet_id,
      featureCode,
      relatedId: record.id
    });
    return {
      ok: true,
      storage: 'local-fallback',
      id: record.id,
      domainTable: localDomain?.table || localDocument || localInvite?.table || localHealth,
      usagePlan: usageResult.usage.plan_code,
      creditCost: usageResult.usage.credit_cost,
      automaticReminder: localReminder,
      publicToken: localDomain?.publicToken,
      publicPath: localDomain?.publicPath,
      invitePath: localInvite?.invitePath,
      inviteText: localInvite?.inviteText
    };
  }

  await db.execute({
    sql: `INSERT INTO form_submissions
      (id, user_id, pet_id, feature_code, locale, status, payload, created_at, updated_at, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      record.id,
      record.user_id,
      record.pet_id,
      record.feature_code,
      record.locale,
      record.status,
      record.payload,
      record.created_at,
      record.updated_at,
      new Date().toISOString()
    ]
  });

  const mediaCount = await insertMediaFiles(db, record, payloadObject);
  const domainResult = await insertDomainRecord(db, record, payloadObject);
  const domainTable = typeof domainResult === 'string' ? domainResult : domainResult?.table;
  const usageResult = await recordFeatureUsage({
    userId: record.user_id,
    petId: record.pet_id,
    featureCode,
    relatedId: record.id
  });

  return {
    ok: true,
    storage: 'turso',
    id: record.id,
    domainTable,
    mediaCount,
    usagePlan: usageResult.usage.plan_code,
    creditCost: usageResult.usage.credit_cost,
    publicToken: domainResult?.publicToken,
    publicPath: domainResult?.publicPath,
    invitePath: domainResult?.invitePath,
    inviteText: domainResult?.inviteText
  };
}
