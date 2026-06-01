import { getDbClient } from './dbClient.js';
import { recordFeatureUsage } from './billing.js';

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
  const raw = String(value || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const amount = Number.parseFloat(raw);
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
  const displayName = titleFromPayload(payload, ['Davet edilecek kişi'], 'Bakıcı');
  const duration = first(pick(payload, ['Erişim süresi'], ['1 hafta'])) || '1 hafta';
  const selected = checkedLabels(pick(payload, ['İzinler'], []));
  const inviteId = memberId || `invite-${record.pet_id || 'pet'}-${slug(displayName)}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    table: 'pet_members',
    inviteId,
    invitePath: `/invite/sitter/${inviteId}`,
    inviteText: `${displayName} için Pati Sağlık bakıcı daveti hazır. Süre: ${duration}. İzinler: ${selected.join(', ') || 'Seçilmedi'}.`
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
        shared_fields: checkedLabels(pick(payload, ['PaylaÅŸÄ±lacak bilgiler'], [])),
        access_duration: first(pick(payload, ['EriÅŸim sÃ¼resi'], ['24 saat'])) || '24 saat',
        updated_at: new Date().toISOString()
      }
    })
  });
  localStorage.setItem('pati_public_cards', JSON.stringify(current.slice(0, 20)));
  return { table: 'pets', publicToken: token, publicPath: `/public/pet/${token}` };
}

async function insertExpense(db, record, payload) {
  const amountCents = centsFromMoney(pick(payload, ['Tutar']));
  const category = first(pick(payload, ['Kategori'], ['Diğer'])) || 'Diğer';
  const spentAt = isoDateOrToday(pick(payload, ['Tarih']));
  const note = pick(payload, ['Not'], '');

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
  const reminderType = first(pick(payload, ['Hatırlatıcı türü'], ['Genel'])) || 'Genel';
  const title = titleFromPayload(payload, ['Başlık'], reminderType);
  const dueAt = isoDateOrToday(pick(payload, ['Tarih']));
  const repeatRule = first(pick(payload, ['Tekrar'], ['Tek sefer'])) || 'Tek sefer';
  const note = pick(payload, ['Not'], '');

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
    const nextDate = first(pick(payload, ['Sonraki doz / kontrol'], ''));
    if (!nextDate || Number.isNaN(Date.parse(nextDate))) return null;
    const medStatus = first(pick(payload, ['İlaç kullanımı'], ['Verildi'])) || 'Verildi';
    return {
      'Hatırlatıcı türü': ['İlaç'],
      'Başlık': 'Operasyon sonrası ilaç/kontrol',
      'Tarih': nextDate,
      'Tekrar': [medStatus === 'Bitti' ? 'Tek sefer' : 'Günlük'],
      'Not': `Otomatik oluşturuldu. İlaç durumu: ${medStatus}. Yara ve genel durumu tekrar kontrol et.`
    };
  }

  if (record.feature_code === 'reproduction') {
    const startDate = first(pick(payload, ['Başlangıç tarihi'], ''));
    const controlDate = isoDatePlusDays(startDate, 7);
    if (!controlDate) return null;
    const followType = first(pick(payload, ['Takip türü'], ['Üreme takibi'])) || 'Üreme takibi';
    return {
      'Hatırlatıcı türü': ['Randevu'],
      'Başlık': `${followType} kontrolü`,
      'Tarih': controlDate,
      'Tekrar': ['Tek sefer'],
      'Not': 'Otomatik oluşturuldu. Belirti değişimi, iştah ve veteriner notlarını kontrol et.'
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
    titleLabels: ['Takip konusu'],
    fallbackTitle: 'Fotoğraf karşılaştırmalı takip',
    summaryLabels: ['Kısa not']
  },
  'poop-score': {
    type: 'poop_score',
    titleLabels: ['Skor'],
    fallbackTitle: 'Dışkı skoru',
    summaryLabels: ['Not']
  },
  'diet-log': {
    type: 'diet_log',
    titleLabels: ['Yeni mama / öğün'],
    fallbackTitle: 'Beslenme değişimi',
    summaryLabels: ['Beslenme notu']
  },
  chronic: {
    type: 'chronic_followup',
    titleLabels: ['Şablon'],
    fallbackTitle: 'Kronik hastalık takibi',
    summaryLabels: ['Takip notu']
  },
  postop: {
    type: 'postop_followup',
    titleLabels: ['Operasyon günü'],
    fallbackTitle: 'Operasyon sonrası takip',
    summaryLabels: ['Genel durum']
  },
  reproduction: {
    type: 'reproduction_followup',
    titleLabels: ['Takip türü'],
    fallbackTitle: 'Kızgınlık / gebelik / doğum takibi',
    summaryLabels: ['Not']
  },
  senior: {
    type: 'senior_followup',
    titleLabels: ['Günlük durum'],
    fallbackTitle: 'Yaşlı pet izlemi',
    summaryLabels: ['Not']
  },
  toxic: {
    type: 'toxin_foreign_body',
    titleLabels: ['Ne yuttu / temas etti?'],
    fallbackTitle: 'Toksik madde / yabancı cisim kontrolü',
    summaryLabels: ['Detay']
  },
  issue: {
    type: 'issue',
    titleLabels: ['Sorun adı'],
    fallbackTitle: 'Sağlık sorunu',
    summaryLabels: ['Açıklama']
  }
};

async function insertHealthRecord(db, record, payload, config) {
  const title = titleFromPayload(payload, config.titleLabels, config.fallbackTitle);
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
  const purpose = first(pick(payload, ['Dosya amacı'], ['Klinik ziyareti'])) || 'Klinik ziyareti';
  const note = pick(payload, ['Veterinere not'], '');
  const included = checkedLabels(pick(payload, ['Dahil edilecekler'], []));

  await db.execute({
    sql: `INSERT INTO documents
      (id, pet_id, uploaded_by_user_id, document_type, title, extracted_text, extracted_data, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      makeId('document'),
      record.pet_id,
      record.user_id,
      'clinic_export',
      `${purpose} hazırlık dosyası`,
      note,
      JSON.stringify({ form_submission_id: record.id, feature_code: record.feature_code, purpose, included, note, payload }),
      'draft'
    ]
  });

  return 'documents';
}

async function insertUploadedDocument(db, record, payload) {
  const documentKind = first(pick(payload, ['Belge türü'], ['Belge'])) || 'Belge';
  const note = pick(payload, ['Ek not'], '');
  const readGoal = first(pick(payload, ['Okuma hedefi'], ['Klinik özeti'])) || 'Klinik özeti';
  const visibleValues = pick(payload, ['Görünen önemli değerler'], '');
  const extractionOptions = checkedLabels(pick(payload, ['İşaretlenecek bilgiler', 'AI çıkarımı'], []));
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
      `${documentKind} belgesi`,
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
          message: 'AI/OCR okuma server/API katmanına bağlandığında bu belge ayrıştırılacak.'
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
  const reason = pick(payload, ['Ziyaret nedeni'], '');
  const urgency = first(pick(payload, ['Aciliyet'], ['Rutin'])) || 'Rutin';
  const checklist = checkedLabels(pick(payload, ['Yanıma alacağım'], []));
  const questions = pick(payload, ['Sorularım'], '');

  await db.execute({
    sql: `INSERT INTO documents
      (id, pet_id, uploaded_by_user_id, document_type, title, extracted_text, extracted_data, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      makeId('document'),
      record.pet_id,
      record.user_id,
      'vet_prep',
      `${urgency} veteriner hazırlık dosyası`,
      [reason, questions].filter(Boolean).join('\n\n'),
      JSON.stringify({
        form_submission_id: record.id,
        feature_code: record.feature_code,
        purpose: 'Veteriner ziyareti',
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
          shared_fields: checkedLabels(pick(payload, ['Paylaşılacak bilgiler'], [])),
          access_duration: first(pick(payload, ['Erişim süresi'], ['24 saat'])) || '24 saat',
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
  const displayName = titleFromPayload(payload, ['Davet edilecek kişi'], 'Bakıcı');
  const contact = titleFromPayload(payload, ['Telefon / e-posta'], `${slug(displayName)}@invite.local`);
  const email = contact.includes('@') ? contact : `${slug(contact)}@phone.local`;
  const duration = first(pick(payload, ['Erişim süresi'], ['1 hafta'])) || '1 hafta';
  const ends = new Date();
  if (duration.includes('gün')) ends.setDate(ends.getDate() + Number.parseInt(duration, 10));
  else if (duration.includes('ay')) ends.setMonth(ends.getMonth() + Number.parseInt(duration, 10));
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

  const selected = checkedLabels(pick(payload, ['İzinler'], []));
  const permissionMap = {
    'Günlük not ekle': 'perm-add-health',
    'Hatırlatıcı gör': 'perm-view-health',
    'Acil kartı gör': 'perm-view-pet',
    'Raporları gör': 'perm-view-reports'
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
