import { getDbClient } from './dbClient.js';
import { getApiJson, postApiJson } from './apiClient.js';
import { translateForLocale } from '../i18n/tr.js';

function parseJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function first(value) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function centsFromMoney(value) {
  const raw = String(value || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const amount = Number.parseFloat(raw);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

function dateOrNow(value) {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : new Date().toISOString();
}

const localHealthTypeMap = {
  'photo-followup': 'photo_followup',
  'poop-score': 'poop_score',
  'diet-log': 'diet_log',
  chronic: 'chronic_followup',
  postop: 'postop_followup',
  reproduction: 'reproduction_followup',
  senior: 'senior_followup',
  toxic: 'toxin_foreign_body',
  issue: 'issue'
};

function localHealthType(featureCode) {
  return localHealthTypeMap[featureCode] || featureCode;
}

function fromLocalStorage(petId) {
  const records = JSON.parse(localStorage.getItem('pati_form_submissions') || '[]')
    .filter((item) => !petId || item.pet_id === petId);
  const payloadOf = (item) => parseJson(item.payload);
  const expenses = records.filter((item) => item.feature_code === 'expense').map((item) => {
    const payload = payloadOf(item);
    const category = first(payload[translateForLocale('tr', 'formLabels.category')]) || translateForLocale('tr', 'freeRecords.expense');
    return {
      id: item.id,
      category,
      title: category,
      amount_cents: centsFromMoney(payload[translateForLocale('tr', 'freeRecords.amount')]),
      currency: 'TRY',
      spent_at: dateOrNow(payload[translateForLocale('tr', 'freeRecords.date')] || item.created_at),
      note: payload[translateForLocale('tr', 'freeRecords.note')] || '',
      metadata: { form_submission_id: item.id },
      mediaFiles: Array.isArray(payload.__media_files) ? payload.__media_files.map((file, index) => ({
        id: `${item.id}-media-${index}`,
        media_type: String(file.mime_type || '').startsWith('image/') ? 'image' : 'document',
        local_uri: file.local_uri || '',
        mime_type: file.mime_type || '',
        file_size_bytes: Number(file.file_size_bytes || 0),
        metadata: { label: file.label || '', name: file.name || '' }
      })) : [],
      created_at: item.created_at
    };
  });
  const reminders = records.filter((item) => item.feature_code === 'reminders').map((item) => {
    const payload = payloadOf(item);
    return {
      id: item.id,
      reminder_type: first(payload[translateForLocale('tr', 'formLabels.reminder_type')]) || translateForLocale('tr', 'freeRecords.reminder'),
      title: payload[translateForLocale('tr', 'formLabels.title')] || first(payload[translateForLocale('tr', 'formLabels.reminder_type')]) || translateForLocale('tr', 'freeRecords.reminder'),
      due_at: dateOrNow(payload.__due_at || payload[translateForLocale('tr', 'freeRecords.date')] || item.created_at),
      repeat_rule: first(payload[translateForLocale('tr', 'freeRecords.repeat')]),
      status: payload.__status || item.status || 'scheduled',
      note: payload[translateForLocale('tr', 'freeRecords.note')] || '',
      metadata: { form_submission_id: item.id },
      created_at: item.created_at
    };
  });
  const healthRecords = records
    .filter((item) => Boolean(localHealthTypeMap[item.feature_code]))
    .map((item) => {
      const payload = payloadOf(item);
      return {
        id: item.id,
        record_type: localHealthType(item.feature_code),
        title: payload[translateForLocale('tr', 'formLabels.followup_subject')] || first(payload[translateForLocale('tr', 'formLabels.score')]) || payload[translateForLocale('tr', 'formLabels.new_food_meal')] || first(payload[translateForLocale('tr', 'formLabels.template')]) || translateForLocale('tr', 'freeRecords.health_record'),
        occurred_at: item.created_at,
        summary: payload[translateForLocale('tr', 'freeRecords.note')] || payload[translateForLocale('tr', 'formLabels.short_note')] || payload[translateForLocale('tr', 'freeRecords.diet_note')] || payload[translateForLocale('tr', 'formLabels.followup_note')] || '',
        payload,
        mediaFiles: Array.isArray(payload.__media_files) ? payload.__media_files.map((file, index) => ({
          id: `${item.id}-media-${index}`,
          media_type: String(file.mime_type || '').startsWith('image/') ? 'image' : 'document',
          local_uri: file.local_uri || '',
          mime_type: file.mime_type || '',
          file_size_bytes: Number(file.file_size_bytes || 0),
          metadata: { label: file.label || '', name: file.name || '' }
        })) : [],
        source: 'local_fallback',
        created_at: item.created_at
      };
    });

  return {
    storage: 'local-fallback',
    expenses,
    reminders,
    healthRecords
  };
}

function rowToObject(row) {
  return Object.fromEntries(Object.entries(row));
}

async function getMediaFilesForSubmissions({ db, petId, submissionIds }) {
  const ids = [...new Set((submissionIds || []).filter(Boolean))];
  if (!ids.length) return {};

  const placeholders = ids.map(() => '?').join(', ');
  const petClause = petId ? 'pet_id = ? AND ' : '';
  const args = petId ? [petId, ...ids] : ids;
  const result = await db.execute({
    sql: `SELECT id, related_entity_id, media_type, local_uri, mime_type, file_size_bytes, metadata, created_at
          FROM media_files
          WHERE ${petClause}related_entity_type = 'form_submission'
            AND related_entity_id IN (${placeholders})
          ORDER BY created_at DESC`,
    args
  });

  return result.rows.map(rowToObject).reduce((acc, item) => {
    const key = item.related_entity_id;
    acc[key] = acc[key] || [];
    acc[key].push({
      ...item,
      metadata: parseJson(item.metadata)
    });
    return acc;
  }, {});
}

export async function getFreeRecords({ petId, limit = 8 } = {}) {
  const db = getDbClient();
  if (!db) {
    try {
      const query = new URLSearchParams();
      if (petId) query.set('petId', petId);
      query.set('limit', String(limit));
      const result = await getApiJson(`/api/records?${query.toString()}`);
      return result.data || result.records || fromLocalStorage(petId);
    } catch {}
    return fromLocalStorage(petId);
  }

  const args = petId ? [petId, limit] : [limit];
  const petFilter = petId ? 'WHERE pet_id = ?' : '';

  const [expensesResult, remindersResult, healthResult] = await Promise.all([
    db.execute({
      sql: `SELECT id, category, amount_cents, currency, spent_at, title, note, metadata, created_at
            FROM expenses ${petFilter}
            ORDER BY spent_at DESC, created_at DESC
            LIMIT ?`,
      args
    }),
    db.execute({
      sql: `SELECT id, reminder_type, title, due_at, repeat_rule, status, note, metadata, created_at
            FROM reminders ${petFilter}
            ORDER BY due_at ASC, created_at DESC
            LIMIT ?`,
      args
    }),
    db.execute({
      sql: `SELECT id, record_type, title, occurred_at, summary, payload, source, created_at
            FROM health_records ${petFilter}
            ORDER BY occurred_at DESC, created_at DESC
            LIMIT ?`,
      args
    })
  ]);

  const expenses = expensesResult.rows.map((row) => ({
    ...rowToObject(row),
    metadata: parseJson(row.metadata)
  }));
  const reminders = remindersResult.rows.map((row) => ({
    ...rowToObject(row),
    metadata: parseJson(row.metadata)
  }));
  const healthRecords = healthResult.rows.map((row) => ({
    ...rowToObject(row),
    payload: parseJson(row.payload)
  }));
  const mediaBySubmission = await getMediaFilesForSubmissions({
    db,
    petId,
    submissionIds: [
      ...expenses.map((item) => item.metadata?.form_submission_id),
      ...reminders.map((item) => item.metadata?.form_submission_id),
      ...healthRecords.map((item) => item.payload?.form_submission_id)
    ]
  });

  return {
    storage: 'turso',
    expenses: expenses.map((item) => ({
      ...item,
      mediaFiles: mediaBySubmission[item.metadata?.form_submission_id] || []
    })),
    reminders: reminders.map((item) => ({
      ...item,
      mediaFiles: mediaBySubmission[item.metadata?.form_submission_id] || []
    })),
    healthRecords: healthRecords.map((item) => ({
      ...item,
      mediaFiles: mediaBySubmission[item.payload?.form_submission_id] || []
    }))
  };
}

export function mergeRecentRecords(records) {
  return [
    ...(records.expenses || []).map((item) => ({ ...item, kind: 'expense', date: item.spent_at || item.created_at })),
    ...(records.reminders || []).map((item) => ({ ...item, kind: 'reminder', date: item.due_at || item.created_at })),
    ...(records.healthRecords || []).map((item) => ({ ...item, kind: 'health', date: item.occurred_at || item.created_at }))
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

function updateLocalReminder(reminderId, patch) {
  const current = JSON.parse(localStorage.getItem('pati_form_submissions') || '[]');
  const next = current.map((item) => {
    if (item.id !== reminderId) return item;
    const payload = parseJson(item.payload);
    return {
      ...item,
      status: patch.status || item.status,
      payload: JSON.stringify({
        ...payload,
        __status: patch.status || payload.__status,
        __due_at: patch.due_at || payload.__due_at
      }),
      updated_at: new Date().toISOString()
    };
  });
  localStorage.setItem('pati_form_submissions', JSON.stringify(next));
}

export async function updateReminderStatus({ reminderId, status, snoozeDays = 0 }) {
  const db = getDbClient();
  let dueAt = null;

  if (snoozeDays) {
    const base = new Date();
    base.setDate(base.getDate() + snoozeDays);
    dueAt = base.toISOString();
  }

  if (!db) {
    try {
      await postApiJson('/api/reminders/status', { reminderId, status, snoozeDays });
      return { ok: true, storage: 'api' };
    } catch {}
    updateLocalReminder(reminderId, {
      status: status || 'scheduled',
      due_at: dueAt
    });
    return { ok: true, storage: 'local-fallback' };
  }

  if (dueAt) {
    await db.execute({
      sql: `UPDATE reminders
            SET status = ?, due_at = ?, updated_at = ?
            WHERE id = ?`,
      args: [status || 'scheduled', dueAt, new Date().toISOString(), reminderId]
    });
  } else {
    await db.execute({
      sql: `UPDATE reminders
            SET status = ?, updated_at = ?
            WHERE id = ?`,
      args: [status, new Date().toISOString(), reminderId]
    });
  }

  return { ok: true, storage: 'turso' };
}
