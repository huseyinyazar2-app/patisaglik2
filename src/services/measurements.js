import { getDbClient } from './dbClient.js';
import { getApiJson, postApiJson } from './apiClient.js';
import { translateForLocale } from '../i18n/tr.js';
import { CLIENT_ERROR_CODES, makeCodedError } from './errorCodes.js';

const LOCAL_KEY = 'pati_measurements';

function makeId(prefix = 'measurement') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readLocal() {
  return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
}

function writeLocal(records) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(records.slice(0, 100)));
}

function rowToObject(row) {
  return Object.fromEntries(Object.entries(row));
}

function shouldRequireRemote(userId) {
  return !import.meta.env?.DEV && userId && userId !== 'user-1';
}

export async function saveMeasurement({ userId, petId, type, value, unit, measuredAt, note, metadata = {} }) {
  if (!petId) {
    throw new Error(translateForLocale('tr', 'petsService.pet_required'));
  }

  const record = {
    id: makeId(),
    pet_id: petId,
    created_by_user_id: userId || 'user-1',
    measurement_type: type,
    value: Number(value),
    unit: unit || '',
    measured_at: measuredAt || new Date().toISOString(),
    note: note || '',
    metadata: JSON.stringify(metadata || {}),
    created_at: new Date().toISOString()
  };

  const db = getDbClient();
  if (!db) {
    try {
      const result = await postApiJson('/api/measurements', {
        userId,
        petId,
        type,
        value: record.value,
        unit,
        measuredAt: record.measured_at,
        note,
        metadata
      });
      return { ok: true, storage: 'api', id: result.id || result.data?.id || record.id };
    } catch (error) {
      if (shouldRequireRemote(userId)) {
        throw makeCodedError('measurement_sync_failed', {
          code: error?.code || CLIENT_ERROR_CODES.measurement_sync_failed,
          message: error?.message || 'measurement_sync_failed'
        });
      }
    }
    writeLocal([record, ...readLocal()]);
    return { ok: true, storage: 'local-fallback', id: record.id };
  }

  try {
    await db.execute({
      sql: `INSERT INTO measurements
        (id, pet_id, created_by_user_id, measurement_type, value, unit, measured_at, note, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        record.id,
        record.pet_id,
        record.created_by_user_id,
        record.measurement_type,
        record.value,
        record.unit,
        record.measured_at,
        record.note,
        record.metadata
      ]
    });
  } catch (err) {
    writeLocal([record, ...readLocal()]);
    return { ok: true, storage: 'local-fallback', id: record.id, error: err.message };
  }

  return { ok: true, storage: 'turso', id: record.id };
}

export async function getMeasurements({ petId, type, limit = 50 } = {}) {
  const db = getDbClient();
  if (!db) {
    try {
      const query = new URLSearchParams();
      if (petId) query.set('petId', petId);
      if (type) query.set('type', type);
      query.set('limit', String(limit));
      const result = await getApiJson(`/api/measurements?${query.toString()}`);
      return result.data?.measurements || result.measurements || [];
    } catch {}
    return readLocal()
      .filter((item) => (!petId || item.pet_id === petId) && (!type || item.measurement_type === type))
      .slice(0, limit);
  }

  const where = [];
  const args = [];
  if (petId) {
    where.push('pet_id = ?');
    args.push(petId);
  }
  if (type) {
    where.push('measurement_type = ?');
    args.push(type);
  }
  args.push(limit);

  const result = await db.execute({
    sql: `SELECT id, pet_id, created_by_user_id, measurement_type, value, unit, measured_at, note, metadata, created_at
          FROM measurements
          ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
          ORDER BY measured_at DESC, created_at DESC
          LIMIT ?`,
    args
  });

  return result.rows.map(rowToObject);
}
