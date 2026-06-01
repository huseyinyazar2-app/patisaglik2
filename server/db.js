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

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 10);
}
