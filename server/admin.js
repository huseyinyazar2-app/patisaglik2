import { getDb } from './db.js';

function row(row) {
  return Object.fromEntries(Object.entries(row || {}));
}

function limitOf(url, fallback = 30, max = 100) {
  const value = Number(url.searchParams.get('limit') || fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value)));
}

function isAuthorized(req) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const headerToken = req.headers['x-admin-token'] || '';
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return headerToken === expected || bearer === expected;
}

async function countTable(db, table) {
  const result = await db.execute({ sql: `SELECT COUNT(*) AS total FROM ${table}`, args: [] });
  return Number(result.rows[0]?.total || 0);
}

async function overview(db) {
  const [
    users,
    pets,
    healthRecords,
    measurements,
    expenses,
    reminders,
    documents,
    formSubmissions,
    featureUsage,
    mediaFiles,
    aiJobs
  ] = await Promise.all([
    countTable(db, 'users'),
    countTable(db, 'pets'),
    countTable(db, 'health_records'),
    countTable(db, 'measurements'),
    countTable(db, 'expenses'),
    countTable(db, 'reminders'),
    countTable(db, 'documents'),
    countTable(db, 'form_submissions'),
    countTable(db, 'feature_usage'),
    countTable(db, 'media_files'),
    countTable(db, 'ai_analysis_jobs')
  ]);

  const recent = await recentRecords(db, 12);
  return {
    metrics: {
      users,
      pets,
      healthRecords,
      measurements,
      expenses,
      reminders,
      documents,
      formSubmissions,
      featureUsage,
      mediaFiles,
      aiJobs
    },
    recent
  };
}

async function users(db, limit) {
  const result = await db.execute({
    sql: `
      SELECT
        u.id, u.email, u.phone, u.display_name, u.locale, u.timezone, u.status, u.created_at, u.updated_at,
        cw.balance AS credit_balance,
        pl.code AS plan_code,
        s.status AS subscription_status,
        COUNT(DISTINCT p.id) AS pet_count,
        COUNT(DISTINCT fs.id) AS submission_count,
        MAX(fs.created_at) AS last_activity
      FROM users u
      LEFT JOIN pets p ON p.primary_owner_user_id = u.id
      LEFT JOIN form_submissions fs ON fs.user_id = u.id
      LEFT JOIN credit_wallets cw ON cw.user_id = u.id
      LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
      LEFT JOIN plans pl ON pl.id = s.plan_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ?`,
    args: [limit]
  });
  return result.rows.map(row);
}

async function pets(db, limit) {
  const result = await db.execute({
    sql: `
      SELECT
        p.id, p.name, p.sex, p.weight_kg, p.ownership_type, p.status, p.created_at, p.updated_at,
        ps.code AS species_code,
        u.id AS owner_user_id,
        u.display_name AS owner_name,
        u.email AS owner_email,
        u.phone AS owner_phone,
        COUNT(DISTINCT pm.id) AS member_count,
        COUNT(DISTINCT hr.id) AS health_count,
        COUNT(DISTINCT d.id) AS document_count
      FROM pets p
      JOIN pet_species ps ON ps.id = p.species_id
      LEFT JOIN users u ON u.id = p.primary_owner_user_id
      LEFT JOIN pet_members pm ON pm.pet_id = p.id
      LEFT JOIN health_records hr ON hr.pet_id = p.id
      LEFT JOIN documents d ON d.pet_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ?`,
    args: [limit]
  });
  return result.rows.map(row);
}

async function recentRecords(db, limit) {
  const result = await db.execute({
    sql: `
      SELECT * FROM (
        SELECT 'health' AS kind, id, title, record_type AS type, pet_id, created_by_user_id AS user_id, occurred_at AS event_at, summary, created_at FROM health_records
        UNION ALL
        SELECT 'measurement' AS kind, id, measurement_type AS title, unit AS type, pet_id, created_by_user_id AS user_id, measured_at AS event_at, note AS summary, created_at FROM measurements
        UNION ALL
        SELECT 'expense' AS kind, id, COALESCE(title, category) AS title, category AS type, pet_id, created_by_user_id AS user_id, spent_at AS event_at, note AS summary, created_at FROM expenses
        UNION ALL
        SELECT 'reminder' AS kind, id, title, reminder_type AS type, pet_id, created_by_user_id AS user_id, due_at AS event_at, note AS summary, created_at FROM reminders
        UNION ALL
        SELECT 'document' AS kind, id, title, document_type AS type, pet_id, uploaded_by_user_id AS user_id, created_at AS event_at, status AS summary, created_at FROM documents
        UNION ALL
        SELECT 'form' AS kind, id, feature_code AS title, status AS type, pet_id, user_id, created_at AS event_at, locale AS summary, created_at FROM form_submissions
      )
      ORDER BY COALESCE(event_at, created_at) DESC
      LIMIT ?`,
    args: [limit]
  });
  return result.rows.map(row);
}

async function usage(db, limit) {
  const result = await db.execute({
    sql: `
      SELECT
        fu.id, fu.feature_code, fu.plan_code, fu.credit_cost, fu.usage_count, fu.created_at,
        u.display_name AS user_name,
        u.email AS user_email,
        p.name AS pet_name
      FROM feature_usage fu
      LEFT JOIN users u ON u.id = fu.user_id
      LEFT JOIN pets p ON p.id = fu.pet_id
      ORDER BY fu.created_at DESC
      LIMIT ?`,
    args: [limit]
  });
  return result.rows.map(row);
}

async function documents(db, limit) {
  const result = await db.execute({
    sql: `
      SELECT
        d.id, d.title, d.document_type, d.status, d.created_at, d.updated_at,
        p.name AS pet_name,
        u.display_name AS user_name,
        u.email AS user_email
      FROM documents d
      LEFT JOIN pets p ON p.id = d.pet_id
      LEFT JOIN users u ON u.id = d.uploaded_by_user_id
      ORDER BY d.created_at DESC
      LIMIT ?`,
    args: [limit]
  });
  return result.rows.map(row);
}

export async function handleAdminRequest(req, res, url, sendJson) {
  if (!isAuthorized(req)) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });

  const limit = limitOf(url);
  const path = url.pathname;

  if (req.method === 'GET' && path === '/api/admin/overview') return sendJson(res, 200, { ok: true, data: await overview(db) });
  if (req.method === 'GET' && path === '/api/admin/users') return sendJson(res, 200, { ok: true, data: await users(db, limit) });
  if (req.method === 'GET' && path === '/api/admin/pets') return sendJson(res, 200, { ok: true, data: await pets(db, limit) });
  if (req.method === 'GET' && path === '/api/admin/records') return sendJson(res, 200, { ok: true, data: await recentRecords(db, limit) });
  if (req.method === 'GET' && path === '/api/admin/usage') return sendJson(res, 200, { ok: true, data: await usage(db, limit) });
  if (req.method === 'GET' && path === '/api/admin/documents') return sendJson(res, 200, { ok: true, data: await documents(db, limit) });

  return sendJson(res, 404, { ok: false, error: 'not_found' });
}
