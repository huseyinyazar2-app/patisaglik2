import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.');
  process.exit(1);
}

const client = createClient({ url, authToken });

const tables = await client.execute(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'table'
  ORDER BY name
`);

const checks = {};
for (const table of [
  'users',
  'pets',
  'plans',
  'roles',
  'user_roles',
  'permissions',
  'pet_members',
  'pet_member_permission_overrides',
  'form_submissions',
  'expenses',
  'reminders',
  'health_records',
  'measurements',
  'documents',
  'media_files',
  'vet_profiles',
  'vet_availability',
  'vet_consultation_bookings',
  'vet_credit_holds',
  'vet_consultation_notes',
  'vet_consultation_surveys',
  'vet_consultation_events'
]) {
  const result = await client.execute(`SELECT COUNT(*) AS count FROM ${table}`);
  checks[table] = Number(result.rows[0].count);
}

console.log(JSON.stringify({
  tableCount: tables.rows.length,
  tables: tables.rows.map((row) => row.name),
  checks
}, null, 2));
