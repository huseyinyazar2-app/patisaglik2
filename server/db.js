import { createClient } from '@libsql/client';

let client = null;

export function getDb() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) return null;
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    });
  }
  return client;
}

export async function insertMediaMetadata(input) {
  const db = getDb();
  if (!db) return { stored: false, reason: 'db_not_configured' };
  const id = input.id || `media-${cryptoRandom()}`;
  await db.execute({
    sql: `INSERT INTO media_files
      (id, pet_id, uploaded_by_user_id, related_entity_type, related_entity_id, media_type, url, local_uri, mime_type, file_size_bytes, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.petId,
      input.userId,
      input.relatedEntityType || null,
      input.relatedEntityId || null,
      input.mediaType || 'document',
      input.objectKey,
      input.localUri || null,
      input.mimeType || '',
      Number(input.sizeBytes || 0),
      JSON.stringify(input.metadata || {})
    ]
  });
  return { stored: true, id };
}

export async function createAiJob(input) {
  const db = getDb();
  if (!db || !input.userId) return { stored: false, reason: 'ai_log_skipped' };
  const id = input.id || `ai-${cryptoRandom()}`;
  try {
    await db.execute({
      sql: `INSERT INTO ai_analysis_jobs
        (id, user_id, pet_id, feature_code, status, input_payload, output_payload, credit_cost, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, '{}', ?, NULL, ?)`,
      args: [
        id,
        input.userId,
        input.petId || null,
        input.featureCode || 'ai',
        input.status || 'queued',
        JSON.stringify(input.inputPayload || {}),
        Number(input.creditCost || 0),
        input.createdAt || new Date().toISOString()
      ]
    });
    return { stored: true, id };
  } catch (error) {
    return { stored: false, reason: error.message || 'ai_log_failed' };
  }
}

export async function completeAiJob(jobId, input) {
  const db = getDb();
  if (!db || !jobId) return { stored: false, reason: 'ai_log_skipped' };
  try {
    await db.execute({
      sql: `UPDATE ai_analysis_jobs
            SET status = ?, output_payload = ?, error_message = ?, completed_at = ?
            WHERE id = ?`,
      args: [
        input.status || 'completed',
        JSON.stringify(input.outputPayload || {}),
        input.errorMessage || null,
        input.completedAt || new Date().toISOString(),
        jobId
      ]
    });
    return { stored: true, id: jobId };
  } catch (error) {
    return { stored: false, reason: error.message || 'ai_log_failed' };
  }
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 10);
}
