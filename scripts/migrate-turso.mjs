import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.');
  process.exit(1);
}

const client = createClient({ url, authToken });
const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');

const statements = sql
  .split(/;\s*(?:\r?\n|$)/)
  .map((statement) => statement.trim())
  .filter(Boolean)
  .filter((statement) => !statement.startsWith('--'));

for (const statement of statements) {
  await client.execute(statement);
}

console.log(`Applied ${statements.length} statements.`);
