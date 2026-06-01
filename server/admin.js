import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { getDb } from './db.js';

const ALL_PERMISSIONS = [
  'admin.read',
  'admin.manage_users',
  'admin.manage_pets',
  'admin.manage_billing',
  'admin.manage_records',
  'admin.manage_settings'
];

const WRITE_RECORD_TABLES = {
  health: 'health_records',
  measurement: 'measurements',
  expense: 'expenses',
  reminder: 'reminders',
  document: 'documents',
  form: 'form_submissions'
};

function row(row) {
  return Object.fromEntries(Object.entries(row || {}));
}

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}-${randomBytes(12).toString('hex')}`;
}

function limitOf(url, fallback = 30, max = 100) {
  const value = Number(url.searchParams.get('limit') || fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value)));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = pbkdf2Sync(String(password), salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const candidate = hashPassword(password, salt).split(':')[1];
  const left = Buffer.from(candidate, 'hex');
  const right = Buffer.from(hash, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

async function ensureAdminSchema(db) {
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS admin_accounts (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'super_admin',
      permissions TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      last_login_at TEXT
    )`,
    args: []
  });
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      FOREIGN KEY (admin_id) REFERENCES admin_accounts(id) ON DELETE CASCADE
    )`,
    args: []
  });

  const existing = await db.execute({ sql: `SELECT id FROM admin_accounts WHERE username = ? LIMIT 1`, args: ['admin'] });
  if (!existing.rows.length) {
    await db.execute({
      sql: `INSERT INTO admin_accounts (id, username, password_hash, role, permissions) VALUES (?, ?, ?, ?, ?)`,
      args: [id('admin'), 'admin', hashPassword('admin123'), 'super_admin', JSON.stringify(ALL_PERMISSIONS)]
    });
  }
}

function hasPermission(admin, permission) {
  return admin?.permissions?.includes(permission) || admin?.role === 'super_admin';
}

async function authorize(req, db, permission = 'admin.read') {
  await ensureAdminSchema(db);

  const legacy = process.env.ADMIN_TOKEN;
  const legacyHeader = req.headers['x-admin-token'] || '';
  const legacyBearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (legacy && (legacyHeader === legacy || legacyBearer === legacy)) {
    return { id: 'legacy-token', username: 'token-admin', role: 'super_admin', permissions: ALL_PERMISSIONS };
  }

  const token = String(req.headers['x-admin-session'] || req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const result = await db.execute({
    sql: `
      SELECT a.id, a.username, a.role, a.permissions, a.status, s.expires_at
      FROM admin_sessions s
      JOIN admin_accounts a ON a.id = s.admin_id
      WHERE s.token = ?
      LIMIT 1`,
    args: [token]
  });
  const admin = row(result.rows[0]);
  if (!admin.id || admin.status !== 'active' || Date.parse(admin.expires_at) < Date.now()) return null;
  admin.permissions = JSON.parse(admin.permissions || '[]');
  return hasPermission(admin, permission) ? admin : null;
}

async function audit(db, admin, action, entityType, entityId, metadata = {}) {
  await db.execute({
    sql: `INSERT INTO audit_logs (id, actor_user_id, entity_type, entity_id, action, metadata) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id('audit'), null, entityType, entityId || null, `admin.${action}`, JSON.stringify({ adminId: admin.id, adminUser: admin.username, ...metadata })]
  });
}

async function countTable(db, table) {
  const result = await db.execute({ sql: `SELECT COUNT(*) AS total FROM ${table}`, args: [] });
  return Number(result.rows[0]?.total || 0);
}

async function login(db, input) {
  await ensureAdminSchema(db);
  const result = await db.execute({ sql: `SELECT * FROM admin_accounts WHERE username = ? LIMIT 1`, args: [String(input.username || '').trim()] });
  const admin = row(result.rows[0]);
  if (!admin.id || admin.status !== 'active' || !verifyPassword(input.password, admin.password_hash)) return null;

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString();
  await db.execute({ sql: `INSERT INTO admin_sessions (token, admin_id, expires_at) VALUES (?, ?, ?)`, args: [token, admin.id, expiresAt] });
  await db.execute({ sql: `UPDATE admin_accounts SET last_login_at = ?, updated_at = ? WHERE id = ?`, args: [now(), now(), admin.id] });
  await audit(db, admin, 'login', 'admin_account', admin.id);

  return {
    token,
    expiresAt,
    admin: {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      permissions: JSON.parse(admin.permissions || '[]')
    }
  };
}

async function changePassword(db, admin, input) {
  if (!input.newPassword || String(input.newPassword).length < 6) throw new Error('password_too_short');
  const account = await db.execute({ sql: `SELECT password_hash FROM admin_accounts WHERE id = ? LIMIT 1`, args: [admin.id] });
  if (!verifyPassword(input.currentPassword, account.rows[0]?.password_hash)) throw new Error('current_password_invalid');
  await db.execute({
    sql: `UPDATE admin_accounts SET password_hash = ?, updated_at = ? WHERE id = ?`,
    args: [hashPassword(input.newPassword), now(), admin.id]
  });
  await db.execute({ sql: `DELETE FROM admin_sessions WHERE admin_id = ? AND token <> ?`, args: [admin.id, String(input.keepToken || '')] });
  await audit(db, admin, 'change_password', 'admin_account', admin.id);
  return { changed: true };
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
  return { metrics: { users, pets, healthRecords, measurements, expenses, reminders, documents, formSubmissions, featureUsage, mediaFiles, aiJobs }, recent };
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

async function plans(db) {
  const result = await db.execute({ sql: `SELECT id, code, name_tr, billing_type, price_cents, currency, is_active FROM plans ORDER BY price_cents ASC, code ASC`, args: [] });
  return result.rows.map(row);
}

async function setUserStatus(db, admin, input) {
  const status = String(input.status || '');
  if (!['active', 'suspended', 'deleted'].includes(status)) throw new Error('invalid_status');
  await db.execute({ sql: `UPDATE users SET status = ?, updated_at = ? WHERE id = ?`, args: [status, now(), input.userId] });
  await audit(db, admin, 'set_user_status', 'user', input.userId, { status });
  return { userId: input.userId, status };
}

async function setPetStatus(db, admin, input) {
  const status = String(input.status || '');
  if (!['active', 'archived', 'deleted'].includes(status)) throw new Error('invalid_status');
  await db.execute({ sql: `UPDATE pets SET status = ?, updated_at = ? WHERE id = ?`, args: [status, now(), input.petId] });
  await audit(db, admin, 'set_pet_status', 'pet', input.petId, { status });
  return { petId: input.petId, status };
}

async function adjustCredits(db, admin, input) {
  const amount = Math.trunc(Number(input.amount || 0));
  if (!input.userId || !amount) throw new Error('invalid_credit_amount');
  const walletId = id('wallet');
  await db.execute({
    sql: `INSERT INTO credit_wallets (id, user_id, balance) VALUES (?, ?, 0)
      ON CONFLICT(user_id) DO NOTHING`,
    args: [walletId, input.userId]
  });
  const wallet = row((await db.execute({ sql: `SELECT id, balance FROM credit_wallets WHERE user_id = ? LIMIT 1`, args: [input.userId] })).rows[0]);
  const nextBalance = Math.max(0, Number(wallet.balance || 0) + amount);
  await db.execute({ sql: `UPDATE credit_wallets SET balance = ?, updated_at = ? WHERE id = ?`, args: [nextBalance, now(), wallet.id] });
  await db.execute({
    sql: `INSERT INTO credit_transactions (id, wallet_id, user_id, amount, direction, reason, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id('credit'), wallet.id, input.userId, Math.abs(amount), amount >= 0 ? 'in' : 'out', 'admin_adjustment', JSON.stringify({ note: input.note || '', adminId: admin.id })]
  });
  await audit(db, admin, 'adjust_credits', 'user', input.userId, { amount, nextBalance });
  return { userId: input.userId, balance: nextBalance };
}

async function setPlan(db, admin, input) {
  if (!input.userId || !input.planId) throw new Error('invalid_plan');
  await db.execute({ sql: `UPDATE subscriptions SET status = 'cancelled', updated_at = ? WHERE user_id = ? AND status = 'active'`, args: [now(), input.userId] });
  await db.execute({
    sql: `INSERT INTO subscriptions (id, user_id, plan_id, status, starts_at, renews_at, provider, metadata) VALUES (?, ?, ?, 'active', ?, ?, 'admin', ?)`,
    args: [id('sub'), input.userId, input.planId, now(), input.renewsAt || null, JSON.stringify({ note: input.note || '', adminId: admin.id })]
  });
  await audit(db, admin, 'set_plan', 'user', input.userId, { planId: input.planId });
  return { userId: input.userId, planId: input.planId };
}

async function deleteRecord(db, admin, kind, recordId) {
  const table = WRITE_RECORD_TABLES[kind];
  if (!table || !recordId) throw new Error('invalid_record');
  await db.execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [recordId] });
  await audit(db, admin, 'delete_record', kind, recordId);
  return { kind, recordId, deleted: true };
}

export async function handleAdminRequest(req, res, url, sendJson) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  await ensureAdminSchema(db);

  const path = url.pathname;
  if (req.method === 'POST' && path === '/api/admin/login') {
    const session = await login(db, await readJson(req));
    return session ? sendJson(res, 200, { ok: true, data: session }) : sendJson(res, 401, { ok: false, error: 'invalid_login' });
  }

  const permission = path.includes('/users/') ? 'admin.manage_users'
    : path.includes('/pets/') ? 'admin.manage_pets'
      : path.includes('/billing/') || path.includes('/credits/') ? 'admin.manage_billing'
        : path.includes('/records/') ? 'admin.manage_records'
          : path.includes('/settings/') ? 'admin.manage_settings'
            : 'admin.read';
  const admin = await authorize(req, db, permission);
  if (!admin) return sendJson(res, 401, { ok: false, error: 'unauthorized' });

  const limit = limitOf(url);

  if (req.method === 'GET' && path === '/api/admin/me') return sendJson(res, 200, { ok: true, data: { admin } });
  if (req.method === 'POST' && path === '/api/admin/settings/password') return sendJson(res, 200, { ok: true, data: await changePassword(db, admin, await readJson(req)) });
  if (req.method === 'GET' && path === '/api/admin/overview') return sendJson(res, 200, { ok: true, data: await overview(db) });
  if (req.method === 'GET' && path === '/api/admin/users') return sendJson(res, 200, { ok: true, data: await users(db, limit) });
  if (req.method === 'GET' && path === '/api/admin/pets') return sendJson(res, 200, { ok: true, data: await pets(db, limit) });
  if (req.method === 'GET' && path === '/api/admin/records') return sendJson(res, 200, { ok: true, data: await recentRecords(db, limit) });
  if (req.method === 'GET' && path === '/api/admin/usage') return sendJson(res, 200, { ok: true, data: await usage(db, limit) });
  if (req.method === 'GET' && path === '/api/admin/documents') return sendJson(res, 200, { ok: true, data: await documents(db, limit) });
  if (req.method === 'GET' && path === '/api/admin/plans') return sendJson(res, 200, { ok: true, data: await plans(db) });
  if (req.method === 'POST' && path === '/api/admin/users/status') return sendJson(res, 200, { ok: true, data: await setUserStatus(db, admin, await readJson(req)) });
  if (req.method === 'POST' && path === '/api/admin/pets/status') return sendJson(res, 200, { ok: true, data: await setPetStatus(db, admin, await readJson(req)) });
  if (req.method === 'POST' && path === '/api/admin/credits/adjust') return sendJson(res, 200, { ok: true, data: await adjustCredits(db, admin, await readJson(req)) });
  if (req.method === 'POST' && path === '/api/admin/billing/plan') return sendJson(res, 200, { ok: true, data: await setPlan(db, admin, await readJson(req)) });
  if (req.method === 'DELETE' && path.startsWith('/api/admin/records/')) {
    const [, , , , kind, recordId] = path.split('/');
    return sendJson(res, 200, { ok: true, data: await deleteRecord(db, admin, kind, recordId) });
  }

  return sendJson(res, 404, { ok: false, error: 'not_found' });
}
