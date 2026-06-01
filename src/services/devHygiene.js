import { getDbClient } from './dbClient.js';

const SMOKE_PATTERNS = [
  'smoke-',
  'diskismoke',
  'masraf-smoke',
  'hatirlatma-smoke',
  'belge-smoke',
  'ui smoke test',
  'db dogrulamasi'
];

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function containsSmokeMarker(value) {
  const text = (typeof value === 'string' ? value : JSON.stringify(value || '')).toLocaleLowerCase('tr-TR');
  return SMOKE_PATTERNS.some((marker) => text.includes(marker));
}

function filterJsonArray(key, predicate) {
  const storage = globalThis.localStorage;
  if (!storage) return { removed: [], kept: [] };

  const current = parseJson(storage.getItem(key), []);
  if (!Array.isArray(current) || !current.length) return { removed: [], kept: current };

  const removed = [];
  const kept = [];
  current.forEach((item) => {
    if (predicate(item)) removed.push(item);
    else kept.push(item);
  });

  if (removed.length) storage.setItem(key, JSON.stringify(kept));
  return { removed, kept };
}

function smokeWhereClause(column = 'payload') {
  return SMOKE_PATTERNS.map(() => `LOWER(${column}) LIKE ?`).join(' OR ');
}

function smokeArgs() {
  return SMOKE_PATTERNS.map((marker) => `%${marker.toLocaleLowerCase('tr-TR')}%`);
}

async function cleanupRemoteSmokeArtifacts(db) {
  await db.execute({
    sql: `DELETE FROM measurements WHERE ${smokeWhereClause('note')}`,
    args: smokeArgs()
  });

  const result = await db.execute({
    sql: `SELECT id FROM form_submissions WHERE ${smokeWhereClause('payload')}`,
    args: smokeArgs()
  });
  const ids = result.rows.map((row) => row.id).filter(Boolean);
  if (!ids.length) return { removedSubmissions: 0, removedUsage: 0, removedMeasurements: 0 };

  const idClauses = ids.map(() => 'metadata LIKE ?').join(' OR ');
  const payloadClauses = ids.map(() => 'payload LIKE ?').join(' OR ');
  const dataClauses = ids.map(() => 'extracted_data LIKE ?').join(' OR ');
  const idLikeArgs = ids.map((id) => `%${id}%`);
  const placeholders = ids.map(() => '?').join(', ');

  await db.batch([
    { sql: `DELETE FROM media_files WHERE related_entity_id IN (${placeholders})`, args: ids },
    { sql: `DELETE FROM expenses WHERE ${idClauses}`, args: idLikeArgs },
    { sql: `DELETE FROM reminders WHERE ${idClauses}`, args: idLikeArgs },
    { sql: `DELETE FROM health_records WHERE ${payloadClauses}`, args: idLikeArgs },
    { sql: `DELETE FROM documents WHERE ${dataClauses}`, args: idLikeArgs },
    { sql: `DELETE FROM feature_usage WHERE ${idClauses}`, args: idLikeArgs },
    { sql: `DELETE FROM form_submissions WHERE id IN (${placeholders})`, args: ids }
  ]);

  return { removedSubmissions: ids.length, removedUsage: 0, removedMeasurements: 0 };
}

function cleanupLocalSmokeArtifacts() {
  const submissionResult = filterJsonArray('pati_form_submissions', (item) => containsSmokeMarker(item?.payload));
  const removedSubmissionIds = new Set(submissionResult.removed.map((item) => item.id).filter(Boolean));
  const measurementResult = filterJsonArray('pati_measurements', (item) => containsSmokeMarker(item));

  const usageResult = filterJsonArray('pati_feature_usage', (item) => {
    const metadata = parseJson(item?.metadata, {});
    return removedSubmissionIds.has(metadata.related_entity_id) || containsSmokeMarker(item);
  });

  return {
    removedSubmissions: submissionResult.removed.length,
    removedUsage: usageResult.removed.length,
    removedMeasurements: measurementResult.removed.length
  };
}

export async function cleanupSmokeTestArtifacts() {
  const hostname = globalThis.location?.hostname || '';
  if (!['localhost', '127.0.0.1', '::1'].includes(hostname)) {
    return { removedSubmissions: 0, removedUsage: 0, removedMeasurements: 0 };
  }

  const localResult = cleanupLocalSmokeArtifacts();
  const db = getDbClient();
  if (!db) return localResult;

  try {
    const remoteResult = await cleanupRemoteSmokeArtifacts(db);
    return {
      removedSubmissions: localResult.removedSubmissions + remoteResult.removedSubmissions,
      removedUsage: localResult.removedUsage + remoteResult.removedUsage,
      removedMeasurements: localResult.removedMeasurements + remoteResult.removedMeasurements
    };
  } catch {
    return localResult;
  }
}
