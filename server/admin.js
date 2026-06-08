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

const USER_STATUSES = ['active', 'suspended', 'deleted'];
const PET_STATUSES = ['active', 'archived', 'deleted'];
const REMINDER_STATUSES = ['scheduled', 'done', 'cancelled'];
const SUBSCRIPTION_STATUSES = ['active', 'cancelled', 'expired'];
const INITIAL_AI_CREDITS = 1;
const DEFAULT_APP_SETTINGS = {
  media_quality_check_enabled: false,
  ai_ignore_low_quality_media: true
};

async function executeOptional(db, sql, args = []) {
  try {
    await db.execute({ sql, args });
  } catch (error) {
    const message = String(error?.message || '');
    if (!/duplicate column|already exists/i.test(message)) throw error;
  }
}

function row(input) {
  return Object.fromEntries(Object.entries(input || {}));
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

function parseJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function parseSettingValue(value, fallback = false) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function jsonString(value, fallback = {}) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return JSON.stringify(fallback);
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      return JSON.stringify({ raw: trimmed });
    }
  }
  return JSON.stringify(value ?? fallback);
}

function requireText(value, field) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${field}_required`);
  return text;
}

function nullableText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function numberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function integerOrZero(value) {
  const num = Math.trunc(Number(value || 0));
  return Number.isFinite(num) ? num : 0;
}

function isoOrNull(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isoOrNow(value) {
  return isoOrNull(value) || now();
}

function likeValue(value) {
  return `%${String(value || '').trim().toLowerCase()}%`;
}

function speciesIdFromCode(code) {
  if (String(code || '').startsWith('species-')) return String(code);
  const map = {
    cat: 'species-cat',
    dog: 'species-dog',
    bird: 'species-bird',
    fish: 'species-fish',
    reptile: 'species-reptile',
    small_mammal: 'species-small-mammal',
    exotic: 'species-exotic'
  };
  return map[code] || 'species-cat';
}

async function ensureAdminSchema(db) {
  await executeOptional(db, `ALTER TABLE plans ADD COLUMN billing_period TEXT`);
  await executeOptional(db, `ALTER TABLE plans ADD COLUMN play_product_id TEXT`);
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS credit_packages (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name_tr TEXT NOT NULL,
      credit_amount INTEGER NOT NULL DEFAULT 0,
      price_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'TRY',
      play_product_id TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )`,
    args: []
  });
  await db.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_credit_packages_active ON credit_packages(is_active, sort_order)`, args: [] });
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS store_purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'google_play',
      product_type TEXT NOT NULL,
      product_id TEXT NOT NULL,
      plan_id TEXT,
      credit_package_id TEXT,
      purchase_token TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      amount_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'TRY',
      credits_granted INTEGER NOT NULL DEFAULT 0,
      purchased_at TEXT,
      expires_at TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES plans(id),
      FOREIGN KEY (credit_package_id) REFERENCES credit_packages(id)
    )`,
    args: []
  });
  await db.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_store_purchases_user ON store_purchases(user_id, status, created_at)`, args: [] });

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
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )`,
    args: []
  });
  await db.execute({
    sql: `INSERT OR IGNORE INTO app_settings (key, value, description) VALUES
      ('media_quality_check_enabled', 'false', 'Enable automatic client-side photo/video quality checks.'),
      ('ai_ignore_low_quality_media', 'true', 'Exclude user-marked poor or irrelevant media from vet-ready reports.')`,
    args: []
  });

  const billingSeeds = [
    {
      id: 'plan-free',
      code: 'free',
      billingType: 'free',
      period: null,
      name: 'Ücretsiz',
      price: 0,
      productId: null,
      pets: 1,
      credits: 0,
      features: { ai: false, documents: false, members: 1, aiCreditCost: 1 }
    },
    {
      id: 'plan-credit',
      code: 'credit',
      billingType: 'credit',
      period: null,
      name: 'Kredi ile Kullanım',
      price: 0,
      productId: null,
      pets: 3,
      credits: 0,
      features: { ai: true, documents: true, members: 2, aiCreditCost: 1 }
    },
    {
      id: 'plan-premium-monthly',
      code: 'premium_monthly',
      billingType: 'subscription',
      period: 'monthly',
      name: 'Aylık Premium',
      price: 24900,
      productId: 'pati_premium_monthly',
      pets: 10,
      credits: 8,
      features: { ai: true, documents: true, members: 10, aiCreditCost: 1 }
    },
    {
      id: 'plan-premium-yearly',
      code: 'premium_yearly',
      billingType: 'subscription',
      period: 'yearly',
      name: 'Yıllık Premium',
      price: 199000,
      productId: 'pati_premium_yearly',
      pets: 10,
      credits: 8,
      features: { ai: true, documents: true, members: 10, aiCreditCost: 1 }
    }
  ];
  for (const plan of billingSeeds) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO plans
        (id, code, billing_type, billing_period, name_tr, price_cents, currency, play_product_id, max_pets, monthly_credit_allowance, features)
        VALUES (?, ?, ?, ?, ?, ?, 'TRY', ?, ?, ?, ?)`,
      args: [plan.id, plan.code, plan.billingType, plan.period, plan.name, plan.price, plan.productId, plan.pets, plan.credits, JSON.stringify(plan.features)]
    });
  }

  const creditSeeds = [
    { id: 'credit-pack-1', code: 'credit_1', name: '1 Kredi', amount: 1, price: 4900, productId: 'pati_credit_1', order: 10 },
    { id: 'credit-pack-10', code: 'credit_10', name: '10 Kredi', amount: 10, price: 39000, productId: 'pati_credit_10', order: 20 }
  ];
  for (const pack of creditSeeds) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO credit_packages
        (id, code, name_tr, credit_amount, price_cents, currency, play_product_id, sort_order, metadata)
        VALUES (?, ?, ?, ?, ?, 'TRY', ?, ?, ?)`,
      args: [pack.id, pack.code, pack.name, pack.amount, pack.price, pack.productId, pack.order, JSON.stringify({ aiCreditCost: 1 })]
    });
  }

  const existing = await db.execute({ sql: `SELECT id FROM admin_accounts LIMIT 1`, args: [] });
  if (!existing.rows.length) {
    await db.execute({
      sql: `INSERT INTO admin_accounts (id, username, password_hash, role, permissions) VALUES (?, ?, ?, ?, ?)`,
      args: [id('admin'), 'admin', hashPassword('admin123'), 'super_admin', JSON.stringify(ALL_PERMISSIONS)]
    });
  }
}

async function appSettings(db) {
  await ensureAdminSchema(db);
  const result = await db.execute({ sql: `SELECT key, value, description, updated_at FROM app_settings ORDER BY key ASC`, args: [] });
  const rows = result.rows.map(row);
  const map = { ...DEFAULT_APP_SETTINGS };
  rows.forEach((item) => {
    map[item.key] = parseSettingValue(item.value, DEFAULT_APP_SETTINGS[item.key]);
  });
  return {
    mediaQualityCheckEnabled: Boolean(map.media_quality_check_enabled),
    aiIgnoreLowQualityMedia: Boolean(map.ai_ignore_low_quality_media),
    rows
  };
}

export async function publicAppSettings() {
  const db = getDb();
  if (!db) return {
    mediaQualityCheckEnabled: false,
    aiIgnoreLowQualityMedia: true
  };
  const settings = await appSettings(db);
  return {
    mediaQualityCheckEnabled: settings.mediaQualityCheckEnabled,
    aiIgnoreLowQualityMedia: settings.aiIgnoreLowQualityMedia
  };
}

async function updateAppSettings(db, admin, input) {
  const updates = {
    media_quality_check_enabled: Boolean(input.mediaQualityCheckEnabled),
    ai_ignore_low_quality_media: input.aiIgnoreLowQualityMedia === undefined ? true : Boolean(input.aiIgnoreLowQualityMedia)
  };
  for (const [key, value] of Object.entries(updates)) {
    await db.execute({
      sql: `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [key, JSON.stringify(value), now()]
    });
  }
  await audit(db, admin, 'update_app_settings', 'app_settings', null, updates);
  return appSettings(db);
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
    usersCount,
    petsCount,
    healthRecords,
    measurements,
    expenses,
    reminders,
    documentsCount,
    formSubmissions,
    featureUsage,
    mediaFiles,
    aiJobs,
    creditPackagesCount,
    paymentsCount
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
    countTable(db, 'ai_analysis_jobs'),
    countTable(db, 'credit_packages'),
    countTable(db, 'store_purchases')
  ]);

  return {
    metrics: { users: usersCount, pets: petsCount, healthRecords, measurements, expenses, reminders, documents: documentsCount, formSubmissions, featureUsage, mediaFiles, aiJobs, creditPackages: creditPackagesCount, payments: paymentsCount },
    recent: await recentRecords(db, { limit: 12 })
  };
}

async function users(db, { limit = 30, q = '', status = '' } = {}) {
  const where = [];
  const args = [];
  if (status) {
    where.push('u.status = ?');
    args.push(status);
  }
  if (q) {
    where.push(`(
      LOWER(COALESCE(u.display_name, '')) LIKE ?
      OR LOWER(COALESCE(u.email, '')) LIKE ?
      OR LOWER(COALESCE(u.phone, '')) LIKE ?
    )`);
    const like = likeValue(q);
    args.push(like, like, like);
  }
  const result = await db.execute({
    sql: `
      SELECT
        u.id, u.email, u.phone, u.display_name, u.locale, u.timezone, u.status, u.created_at, u.updated_at, u.metadata,
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
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY u.id
      ORDER BY COALESCE(fs.created_at, u.created_at) DESC
      LIMIT ?`,
    args: [...args, limit]
  });
  return result.rows.map((item) => ({ ...row(item), metadata: parseJson(item.metadata) }));
}

async function userDetail(db, userId) {
  const base = row((await db.execute({ sql: `SELECT * FROM users WHERE id = ? LIMIT 1`, args: [userId] })).rows[0]);
  if (!base.id) throw new Error('user_not_found');
  const [wallet, subscriptions, petsList, transactions, payments, records] = await Promise.all([
    db.execute({ sql: `SELECT id, balance, currency, updated_at FROM credit_wallets WHERE user_id = ? LIMIT 1`, args: [userId] }),
    db.execute({
      sql: `SELECT s.id, s.status, s.starts_at, s.ends_at, s.renews_at, s.provider, s.provider_subscription_id, s.metadata,
              p.code AS plan_code, p.name_tr, p.billing_type, p.billing_period, p.play_product_id, p.monthly_credit_allowance
            FROM subscriptions s
            JOIN plans p ON p.id = s.plan_id
            WHERE s.user_id = ?
            ORDER BY s.created_at DESC
            LIMIT 20`,
      args: [userId]
    }),
    db.execute({
      sql: `SELECT p.id, p.name, p.status, p.birth_date, p.weight_kg, ps.code AS species_code
            FROM pets p
            JOIN pet_species ps ON ps.id = p.species_id
            WHERE p.primary_owner_user_id = ?
            ORDER BY p.created_at DESC`,
      args: [userId]
    }),
    db.execute({
      sql: `SELECT id, amount, direction, reason, metadata, created_at
            FROM credit_transactions
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 30`,
      args: [userId]
    }),
    db.execute({
      sql: `SELECT id, provider, product_type, product_id, status, amount_cents, currency, credits_granted, purchased_at, expires_at, metadata, created_at
            FROM store_purchases
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 30`,
      args: [userId]
    }),
    recentRecords(db, { limit: 30, userId })
  ]);
  return {
    ...base,
    metadata: parseJson(base.metadata),
    wallet: row(wallet.rows[0]),
    subscriptions: subscriptions.rows.map((item) => ({ ...row(item), metadata: parseJson(item.metadata) })),
    pets: petsList.rows.map(row),
    transactions: transactions.rows.map((item) => ({ ...row(item), metadata: parseJson(item.metadata) })),
    payments: payments.rows.map((item) => ({ ...row(item), metadata: parseJson(item.metadata) })),
    records
  };
}

async function createUser(db, admin, input) {
  const userId = id('user');
  const createdAt = now();
  const displayName = requireText(input.display_name || input.displayName, 'display_name');
  const locale = String(input.locale || 'tr').trim() || 'tr';
  const timezone = String(input.timezone || 'Europe/Istanbul').trim() || 'Europe/Istanbul';
  const status = USER_STATUSES.includes(String(input.status)) ? String(input.status) : 'active';
  const metadata = jsonString(input.metadata, { location: input.location || {}, notificationPreference: input.notificationPreference || 'push' });

  await db.execute({
    sql: `INSERT INTO users (id, email, phone, display_name, locale, timezone, status, metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [userId, nullableText(input.email), nullableText(input.phone), displayName, locale, timezone, status, metadata, createdAt, createdAt]
  });
  await db.execute({
    sql: `INSERT OR IGNORE INTO credit_wallets (id, user_id, balance, currency, created_at, updated_at) VALUES (?, ?, ?, 'credit', ?, ?)`,
    args: [id('wallet'), userId, INITIAL_AI_CREDITS, createdAt, createdAt]
  });
  const wallet = row((await db.execute({ sql: `SELECT id FROM credit_wallets WHERE user_id = ? LIMIT 1`, args: [userId] })).rows[0]);
  if (wallet.id && INITIAL_AI_CREDITS > 0) {
    await db.execute({
      sql: `INSERT INTO credit_transactions (id, wallet_id, user_id, amount, direction, reason, metadata, created_at)
            VALUES (?, ?, ?, ?, 'in', 'welcome_credit', ?, ?)`,
      args: [id('credit'), wallet.id, userId, INITIAL_AI_CREDITS, JSON.stringify({ reason: 'initial_ai_credit' }), createdAt]
    });
  }
  await audit(db, admin, 'create_user', 'user', userId, {
    displayName,
    initialAiCredits: INITIAL_AI_CREDITS
  });
  return userDetail(db, userId);
}

async function updateUser(db, admin, userId, input) {
  const current = row((await db.execute({ sql: `SELECT * FROM users WHERE id = ? LIMIT 1`, args: [userId] })).rows[0]);
  if (!current.id) throw new Error('user_not_found');
  const next = {
    email: nullableText(input.email ?? current.email),
    phone: nullableText(input.phone ?? current.phone),
    display_name: requireText(input.display_name ?? input.displayName ?? current.display_name, 'display_name'),
    locale: String(input.locale ?? current.locale ?? 'tr').trim() || 'tr',
    timezone: String(input.timezone ?? current.timezone ?? 'Europe/Istanbul').trim() || 'Europe/Istanbul',
    status: USER_STATUSES.includes(String(input.status ?? current.status)) ? String(input.status ?? current.status) : current.status,
    metadata: jsonString(input.metadata ?? parseJson(current.metadata), parseJson(current.metadata))
  };
  await db.execute({
    sql: `UPDATE users
          SET email = ?, phone = ?, display_name = ?, locale = ?, timezone = ?, status = ?, metadata = ?, updated_at = ?
          WHERE id = ?`,
    args: [next.email, next.phone, next.display_name, next.locale, next.timezone, next.status, next.metadata, now(), userId]
  });
  await audit(db, admin, 'update_user', 'user', userId, { status: next.status });
  return userDetail(db, userId);
}

async function setUserStatus(db, admin, input) {
  const status = String(input.status || '');
  if (!USER_STATUSES.includes(status)) throw new Error('invalid_status');
  await db.execute({ sql: `UPDATE users SET status = ?, updated_at = ? WHERE id = ?`, args: [status, now(), input.userId] });
  await audit(db, admin, 'set_user_status', 'user', input.userId, { status });
  return { userId: input.userId, status };
}

async function removeUser(db, admin, userId) {
  await db.execute({ sql: `UPDATE users SET status = 'deleted', updated_at = ? WHERE id = ?`, args: [now(), userId] });
  await audit(db, admin, 'remove_user', 'user', userId);
  return { userId, deleted: true };
}

async function pets(db, { limit = 30, q = '', status = '', ownerId = '' } = {}) {
  const where = [];
  const args = [];
  if (status) {
    where.push('p.status = ?');
    args.push(status);
  }
  if (ownerId) {
    where.push('p.primary_owner_user_id = ?');
    args.push(ownerId);
  }
  if (q) {
    where.push(`(
      LOWER(COALESCE(p.name, '')) LIKE ?
      OR LOWER(COALESCE(ps.code, '')) LIKE ?
      OR LOWER(COALESCE(u.display_name, '')) LIKE ?
      OR LOWER(COALESCE(p.medical_summary, '')) LIKE ?
    )`);
    const like = likeValue(q);
    args.push(like, like, like, like);
  }
  const result = await db.execute({
    sql: `
      SELECT
        p.id, p.name, p.sex, p.weight_kg, p.ownership_type, p.status, p.created_at, p.updated_at, p.birth_date, p.metadata, p.medical_summary,
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
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ?`,
    args: [...args, limit]
  });
  return result.rows.map((item) => ({ ...row(item), metadata: parseJson(item.metadata) }));
}

async function petDetail(db, petId) {
  const base = row((await db.execute({
    sql: `SELECT p.*, ps.code AS species_code, u.display_name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
          FROM pets p
          JOIN pet_species ps ON ps.id = p.species_id
          LEFT JOIN users u ON u.id = p.primary_owner_user_id
          WHERE p.id = ?
          LIMIT 1`,
    args: [petId]
  })).rows[0]);
  if (!base.id) throw new Error('pet_not_found');
  const [members, attributes, docs, records] = await Promise.all([
    db.execute({
      sql: `SELECT pm.id, pm.status, pm.access_starts_at, pm.access_ends_at, u.id AS user_id, u.display_name, u.email, r.code AS role_code
            FROM pet_members pm
            JOIN users u ON u.id = pm.user_id
            JOIN roles r ON r.id = pm.role_id
            WHERE pm.pet_id = ?
            ORDER BY pm.created_at DESC`,
      args: [petId]
    }),
    db.execute({ sql: `SELECT id, key, value, value_type, source, created_at FROM pet_profile_attributes WHERE pet_id = ? ORDER BY key ASC`, args: [petId] }),
    db.execute({ sql: `SELECT id, title, document_type, status, created_at FROM documents WHERE pet_id = ? ORDER BY created_at DESC LIMIT 30`, args: [petId] }),
    recentRecords(db, { limit: 30, petId })
  ]);
  return {
    ...base,
    metadata: parseJson(base.metadata),
    members: members.rows.map(row),
    attributes: attributes.rows.map(row),
    documents: docs.rows.map(row),
    records
  };
}

async function createPet(db, admin, input) {
  const petId = id('pet');
  const createdAt = now();
  const ownerUserId = requireText(input.primary_owner_user_id || input.ownerUserId, 'primary_owner_user_id');
  const speciesCode = String(input.species_code || input.speciesCode || 'cat').trim() || 'cat';
  const metadata = jsonString(input.metadata, {
    breed: input.breed || '',
    chronic: input.chronic || '',
    allergies: input.allergies || '',
    medications: input.medications || '',
    location: input.location || '',
    volunteerNote: input.volunteerNote || ''
  });

  await db.batch([
    {
      sql: `INSERT INTO pets
            (id, primary_owner_user_id, species_id, breed_id, name, sex, birth_date, approximate_age_label, weight_kg, neutered_status, ownership_type, public_profile_token, avatar_url, status, medical_summary, metadata, created_at, updated_at)
            VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        petId,
        ownerUserId,
        speciesIdFromCode(speciesCode),
        requireText(input.name, 'name'),
        String(input.sex || 'unknown'),
        isoOrNull(input.birth_date || input.birthDate),
        nullableText(input.approximate_age_label || input.approximateAgeLabel),
        numberOrNull(input.weight_kg || input.weightKg),
        String(input.neutered_status || input.neuteredStatus || 'unknown'),
        String(input.ownership_type || input.ownershipType || 'owned'),
        nullableText(input.public_profile_token || input.publicProfileToken),
        nullableText(input.avatar_url || input.avatarUrl),
        PET_STATUSES.includes(String(input.status)) ? String(input.status) : 'active',
        nullableText(input.medical_summary || input.medicalSummary),
        metadata,
        createdAt,
        createdAt
      ]
    },
    {
      sql: `INSERT OR IGNORE INTO pet_members (id, pet_id, user_id, role_id, status, created_at, updated_at)
            VALUES (?, ?, ?, 'role-owner', 'active', ?, ?)`,
      args: [`member-${ownerUserId}-${petId}`, petId, ownerUserId, createdAt, createdAt]
    }
  ]);
  await audit(db, admin, 'create_pet', 'pet', petId, { ownerUserId, speciesCode });
  return petDetail(db, petId);
}

async function updatePet(db, admin, petId, input) {
  const current = row((await db.execute({ sql: `SELECT * FROM pets WHERE id = ? LIMIT 1`, args: [petId] })).rows[0]);
  if (!current.id) throw new Error('pet_not_found');
  const nextMetadata = input.metadata === undefined
    ? current.metadata
    : jsonString(input.metadata, parseJson(current.metadata));

  await db.execute({
    sql: `UPDATE pets
          SET primary_owner_user_id = ?, species_id = ?, name = ?, sex = ?, birth_date = ?, approximate_age_label = ?, weight_kg = ?,
              neutered_status = ?, ownership_type = ?, public_profile_token = ?, avatar_url = ?, status = ?, medical_summary = ?, metadata = ?, updated_at = ?
          WHERE id = ?`,
    args: [
      String(input.primary_owner_user_id || input.ownerUserId || current.primary_owner_user_id),
      speciesIdFromCode(String(input.species_code || input.speciesCode || current.species_id)),
      requireText(input.name ?? current.name, 'name'),
      String(input.sex ?? current.sex ?? 'unknown'),
      isoOrNull(input.birth_date ?? input.birthDate ?? current.birth_date),
      nullableText(input.approximate_age_label ?? input.approximateAgeLabel ?? current.approximate_age_label),
      numberOrNull(input.weight_kg ?? input.weightKg ?? current.weight_kg),
      String(input.neutered_status ?? input.neuteredStatus ?? current.neutered_status ?? 'unknown'),
      String(input.ownership_type ?? input.ownershipType ?? current.ownership_type ?? 'owned'),
      nullableText(input.public_profile_token ?? input.publicProfileToken ?? current.public_profile_token),
      nullableText(input.avatar_url ?? input.avatarUrl ?? current.avatar_url),
      PET_STATUSES.includes(String(input.status ?? current.status)) ? String(input.status ?? current.status) : current.status,
      nullableText(input.medical_summary ?? input.medicalSummary ?? current.medical_summary),
      nextMetadata,
      now(),
      petId
    ]
  });
  await audit(db, admin, 'update_pet', 'pet', petId);
  return petDetail(db, petId);
}

async function setPetStatus(db, admin, input) {
  const status = String(input.status || '');
  if (!PET_STATUSES.includes(status)) throw new Error('invalid_status');
  await db.execute({ sql: `UPDATE pets SET status = ?, updated_at = ? WHERE id = ?`, args: [status, now(), input.petId] });
  await audit(db, admin, 'set_pet_status', 'pet', input.petId, { status });
  return { petId: input.petId, status };
}

async function removePet(db, admin, petId) {
  await db.execute({ sql: `UPDATE pets SET status = 'deleted', updated_at = ? WHERE id = ?`, args: [now(), petId] });
  await audit(db, admin, 'remove_pet', 'pet', petId);
  return { petId, deleted: true };
}

async function recentRecords(db, { limit = 40, q = '', kind = '', petId = '', userId = '' } = {}) {
  const args = [];
  const outerWhere = [];
  if (kind) {
    outerWhere.push('kind = ?');
    args.push(kind);
  }
  if (petId) {
    outerWhere.push('pet_id = ?');
    args.push(petId);
  }
  if (userId) {
    outerWhere.push('user_id = ?');
    args.push(userId);
  }
  if (q) {
    outerWhere.push(`(
      LOWER(COALESCE(title, '')) LIKE ?
      OR LOWER(COALESCE(type, '')) LIKE ?
      OR LOWER(COALESCE(summary, '')) LIKE ?
    )`);
    const like = likeValue(q);
    args.push(like, like, like);
  }

  const result = await db.execute({
    sql: `
      SELECT * FROM (
        SELECT 'health' AS kind, id, title, record_type AS type, pet_id, created_by_user_id AS user_id, occurred_at AS event_at, summary, payload AS raw_json, created_at FROM health_records
        UNION ALL
        SELECT 'measurement' AS kind, id, measurement_type AS title, unit AS type, pet_id, created_by_user_id AS user_id, measured_at AS event_at, note AS summary, metadata AS raw_json, created_at FROM measurements
        UNION ALL
        SELECT 'expense' AS kind, id, COALESCE(title, category) AS title, category AS type, pet_id, created_by_user_id AS user_id, spent_at AS event_at, note AS summary, metadata AS raw_json, created_at FROM expenses
        UNION ALL
        SELECT 'reminder' AS kind, id, title, reminder_type AS type, pet_id, created_by_user_id AS user_id, due_at AS event_at, note AS summary, metadata AS raw_json, created_at FROM reminders
        UNION ALL
        SELECT 'document' AS kind, id, title, document_type AS type, pet_id, uploaded_by_user_id AS user_id, created_at AS event_at, status AS summary, extracted_data AS raw_json, created_at FROM documents
        UNION ALL
        SELECT 'form' AS kind, id, feature_code AS title, status AS type, pet_id, user_id, created_at AS event_at, locale AS summary, payload AS raw_json, created_at FROM form_submissions
      )
      ${outerWhere.length ? `WHERE ${outerWhere.join(' AND ')}` : ''}
      ORDER BY COALESCE(event_at, created_at) DESC
      LIMIT ?`,
    args: [...args, limit]
  });
  return result.rows.map((item) => ({ ...row(item), raw_json: parseJson(item.raw_json) }));
}

async function recordDetail(db, kind, recordId) {
  if (!WRITE_RECORD_TABLES[kind]) throw new Error('invalid_record_kind');
  const table = WRITE_RECORD_TABLES[kind];
  let sql = '';
  if (kind === 'health') {
    sql = `SELECT * FROM health_records WHERE id = ? LIMIT 1`;
  } else if (kind === 'measurement') {
    sql = `SELECT * FROM measurements WHERE id = ? LIMIT 1`;
  } else if (kind === 'expense') {
    sql = `SELECT * FROM expenses WHERE id = ? LIMIT 1`;
  } else if (kind === 'reminder') {
    sql = `SELECT * FROM reminders WHERE id = ? LIMIT 1`;
  } else if (kind === 'document') {
    sql = `SELECT * FROM documents WHERE id = ? LIMIT 1`;
  } else {
    sql = `SELECT * FROM form_submissions WHERE id = ? LIMIT 1`;
  }
  const data = row((await db.execute({ sql, args: [recordId] })).rows[0]);
  if (!data.id) throw new Error('record_not_found');
  if ('payload' in data) data.payload = parseJson(data.payload);
  if ('metadata' in data) data.metadata = parseJson(data.metadata);
  if ('extracted_data' in data) data.extracted_data = parseJson(data.extracted_data);
  return { kind, table, record: data };
}

async function createRecord(db, admin, kind, input) {
  const recordId = id(kind);
  const createdAt = now();
  if (kind === 'health') {
    await db.execute({
      sql: `INSERT INTO health_records
            (id, pet_id, created_by_user_id, record_type, title, occurred_at, summary, payload, source, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'admin', ?, ?)`,
      args: [
        recordId,
        requireText(input.pet_id || input.petId, 'pet_id'),
        requireText(input.user_id || input.userId, 'user_id'),
        requireText(input.record_type || input.recordType, 'record_type'),
        requireText(input.title, 'title'),
        isoOrNow(input.occurred_at || input.occurredAt),
        nullableText(input.summary),
        jsonString(input.payload),
        createdAt,
        createdAt
      ]
    });
  } else if (kind === 'measurement') {
    await db.execute({
      sql: `INSERT INTO measurements
            (id, pet_id, created_by_user_id, measurement_type, value, unit, measured_at, note, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        recordId,
        requireText(input.pet_id || input.petId, 'pet_id'),
        requireText(input.user_id || input.userId, 'user_id'),
        requireText(input.measurement_type || input.measurementType, 'measurement_type'),
        numberOrNull(input.value),
        nullableText(input.unit),
        isoOrNow(input.measured_at || input.measuredAt),
        nullableText(input.note),
        jsonString(input.metadata),
        createdAt
      ]
    });
  } else if (kind === 'expense') {
    await db.execute({
      sql: `INSERT INTO expenses
            (id, pet_id, created_by_user_id, category, amount_cents, currency, spent_at, title, note, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        recordId,
        requireText(input.pet_id || input.petId, 'pet_id'),
        requireText(input.user_id || input.userId, 'user_id'),
        requireText(input.category, 'category'),
        integerOrZero(input.amount_cents || input.amountCents),
        String(input.currency || 'TRY'),
        isoOrNow(input.spent_at || input.spentAt),
        nullableText(input.title),
        nullableText(input.note),
        jsonString(input.metadata),
        createdAt
      ]
    });
  } else if (kind === 'reminder') {
    const status = REMINDER_STATUSES.includes(String(input.status)) ? String(input.status) : 'scheduled';
    await db.execute({
      sql: `INSERT INTO reminders
            (id, pet_id, created_by_user_id, reminder_type, title, due_at, repeat_rule, status, note, metadata, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        recordId,
        requireText(input.pet_id || input.petId, 'pet_id'),
        requireText(input.user_id || input.userId, 'user_id'),
        requireText(input.reminder_type || input.reminderType, 'reminder_type'),
        requireText(input.title, 'title'),
        isoOrNow(input.due_at || input.dueAt),
        nullableText(input.repeat_rule || input.repeatRule),
        status,
        nullableText(input.note),
        jsonString(input.metadata),
        createdAt,
        createdAt
      ]
    });
  } else if (kind === 'document') {
    await db.execute({
      sql: `INSERT INTO documents
            (id, pet_id, uploaded_by_user_id, document_type, title, file_media_id, extracted_text, extracted_data, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        recordId,
        requireText(input.pet_id || input.petId, 'pet_id'),
        requireText(input.user_id || input.userId, 'user_id'),
        requireText(input.document_type || input.documentType, 'document_type'),
        requireText(input.title, 'title'),
        nullableText(input.file_media_id || input.fileMediaId),
        nullableText(input.extracted_text || input.extractedText),
        jsonString(input.extracted_data || input.extractedData),
        String(input.status || 'draft'),
        createdAt,
        createdAt
      ]
    });
  } else if (kind === 'form') {
    await db.execute({
      sql: `INSERT INTO form_submissions
            (id, user_id, pet_id, feature_code, locale, status, payload, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        recordId,
        requireText(input.user_id || input.userId, 'user_id'),
        nullableText(input.pet_id || input.petId),
        requireText(input.feature_code || input.featureCode, 'feature_code'),
        String(input.locale || 'tr'),
        String(input.status || 'draft'),
        jsonString(input.payload),
        createdAt,
        createdAt
      ]
    });
  } else {
    throw new Error('invalid_record_kind');
  }
  await audit(db, admin, 'create_record', kind, recordId);
  return recordDetail(db, kind, recordId);
}

async function updateRecord(db, admin, kind, recordId, input) {
  if (!WRITE_RECORD_TABLES[kind]) throw new Error('invalid_record_kind');
  if (kind === 'health') {
    await db.execute({
      sql: `UPDATE health_records
            SET pet_id = ?, created_by_user_id = ?, record_type = ?, title = ?, occurred_at = ?, summary = ?, payload = ?, updated_at = ?
            WHERE id = ?`,
      args: [
        requireText(input.pet_id || input.petId, 'pet_id'),
        requireText(input.user_id || input.userId, 'user_id'),
        requireText(input.record_type || input.recordType, 'record_type'),
        requireText(input.title, 'title'),
        isoOrNow(input.occurred_at || input.occurredAt),
        nullableText(input.summary),
        jsonString(input.payload),
        now(),
        recordId
      ]
    });
  } else if (kind === 'measurement') {
    await db.execute({
      sql: `UPDATE measurements
            SET pet_id = ?, created_by_user_id = ?, measurement_type = ?, value = ?, unit = ?, measured_at = ?, note = ?, metadata = ?
            WHERE id = ?`,
      args: [
        requireText(input.pet_id || input.petId, 'pet_id'),
        requireText(input.user_id || input.userId, 'user_id'),
        requireText(input.measurement_type || input.measurementType, 'measurement_type'),
        numberOrNull(input.value),
        nullableText(input.unit),
        isoOrNow(input.measured_at || input.measuredAt),
        nullableText(input.note),
        jsonString(input.metadata),
        recordId
      ]
    });
  } else if (kind === 'expense') {
    await db.execute({
      sql: `UPDATE expenses
            SET pet_id = ?, created_by_user_id = ?, category = ?, amount_cents = ?, currency = ?, spent_at = ?, title = ?, note = ?, metadata = ?
            WHERE id = ?`,
      args: [
        requireText(input.pet_id || input.petId, 'pet_id'),
        requireText(input.user_id || input.userId, 'user_id'),
        requireText(input.category, 'category'),
        integerOrZero(input.amount_cents || input.amountCents),
        String(input.currency || 'TRY'),
        isoOrNow(input.spent_at || input.spentAt),
        nullableText(input.title),
        nullableText(input.note),
        jsonString(input.metadata),
        recordId
      ]
    });
  } else if (kind === 'reminder') {
    const status = REMINDER_STATUSES.includes(String(input.status)) ? String(input.status) : 'scheduled';
    await db.execute({
      sql: `UPDATE reminders
            SET pet_id = ?, created_by_user_id = ?, reminder_type = ?, title = ?, due_at = ?, repeat_rule = ?, status = ?, note = ?, metadata = ?, updated_at = ?
            WHERE id = ?`,
      args: [
        requireText(input.pet_id || input.petId, 'pet_id'),
        requireText(input.user_id || input.userId, 'user_id'),
        requireText(input.reminder_type || input.reminderType, 'reminder_type'),
        requireText(input.title, 'title'),
        isoOrNow(input.due_at || input.dueAt),
        nullableText(input.repeat_rule || input.repeatRule),
        status,
        nullableText(input.note),
        jsonString(input.metadata),
        now(),
        recordId
      ]
    });
  } else if (kind === 'document') {
    await db.execute({
      sql: `UPDATE documents
            SET pet_id = ?, uploaded_by_user_id = ?, document_type = ?, title = ?, file_media_id = ?, extracted_text = ?, extracted_data = ?, status = ?, updated_at = ?
            WHERE id = ?`,
      args: [
        requireText(input.pet_id || input.petId, 'pet_id'),
        requireText(input.user_id || input.userId, 'user_id'),
        requireText(input.document_type || input.documentType, 'document_type'),
        requireText(input.title, 'title'),
        nullableText(input.file_media_id || input.fileMediaId),
        nullableText(input.extracted_text || input.extractedText),
        jsonString(input.extracted_data || input.extractedData),
        String(input.status || 'draft'),
        now(),
        recordId
      ]
    });
  } else if (kind === 'form') {
    await db.execute({
      sql: `UPDATE form_submissions
            SET user_id = ?, pet_id = ?, feature_code = ?, locale = ?, status = ?, payload = ?, updated_at = ?
            WHERE id = ?`,
      args: [
        requireText(input.user_id || input.userId, 'user_id'),
        nullableText(input.pet_id || input.petId),
        requireText(input.feature_code || input.featureCode, 'feature_code'),
        String(input.locale || 'tr'),
        String(input.status || 'draft'),
        jsonString(input.payload),
        now(),
        recordId
      ]
    });
  }
  await audit(db, admin, 'update_record', kind, recordId);
  return recordDetail(db, kind, recordId);
}

async function deleteRecord(db, admin, kind, recordId) {
  const table = WRITE_RECORD_TABLES[kind];
  if (!table || !recordId) throw new Error('invalid_record');
  await db.execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [recordId] });
  await audit(db, admin, 'delete_record', kind, recordId);
  return { kind, recordId, deleted: true };
}

async function documents(db, { limit = 30, q = '', status = '', type = '' } = {}) {
  const where = [];
  const args = [];
  if (status) {
    where.push('d.status = ?');
    args.push(status);
  }
  if (type) {
    where.push('d.document_type = ?');
    args.push(type);
  }
  if (q) {
    where.push(`(
      LOWER(COALESCE(d.title, '')) LIKE ?
      OR LOWER(COALESCE(d.document_type, '')) LIKE ?
      OR LOWER(COALESCE(u.display_name, '')) LIKE ?
      OR LOWER(COALESCE(p.name, '')) LIKE ?
    )`);
    const like = likeValue(q);
    args.push(like, like, like, like);
  }
  const result = await db.execute({
    sql: `
      SELECT
        d.id, d.title, d.document_type, d.status, d.created_at, d.updated_at, d.extracted_text, d.extracted_data,
        p.id AS pet_id, p.name AS pet_name,
        u.id AS user_id, u.display_name AS user_name, u.email AS user_email
      FROM documents d
      LEFT JOIN pets p ON p.id = d.pet_id
      LEFT JOIN users u ON u.id = d.uploaded_by_user_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY d.created_at DESC
      LIMIT ?`,
    args: [...args, limit]
  });
  return result.rows.map((item) => ({ ...row(item), extracted_data: parseJson(item.extracted_data) }));
}

async function documentDetail(db, docId) {
  const record = row((await db.execute({ sql: `SELECT * FROM documents WHERE id = ? LIMIT 1`, args: [docId] })).rows[0]);
  if (!record.id) throw new Error('document_not_found');
  record.extracted_data = parseJson(record.extracted_data);
  return record;
}

async function plans(db) {
  const result = await db.execute({
    sql: `SELECT id, code, billing_type, billing_period, name_tr, price_cents, currency, play_product_id, max_pets, monthly_credit_allowance, features, is_active, created_at
          FROM plans
          ORDER BY price_cents ASC, code ASC`,
    args: []
  });
  return result.rows.map((item) => ({ ...row(item), features: parseJson(item.features) }));
}

async function createPlan(db, admin, input) {
  const planId = id('plan');
  await db.execute({
    sql: `INSERT INTO plans
          (id, code, billing_type, billing_period, name_tr, price_cents, currency, play_product_id, max_pets, monthly_credit_allowance, features, is_active, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      planId,
      requireText(input.code, 'code'),
      requireText(input.billing_type || input.billingType, 'billing_type'),
      nullableText(input.billing_period || input.billingPeriod),
      requireText(input.name_tr || input.nameTr, 'name_tr'),
      integerOrZero(input.price_cents || input.priceCents),
      String(input.currency || 'TRY'),
      nullableText(input.play_product_id || input.playProductId),
      numberOrNull(input.max_pets || input.maxPets),
      integerOrZero(input.monthly_credit_allowance || input.monthlyCreditAllowance),
      jsonString(input.features),
      Number(input.is_active ?? 1) ? 1 : 0,
      now()
    ]
  });
  await audit(db, admin, 'create_plan', 'plan', planId);
  return plans(db);
}

async function updatePlan(db, admin, planId, input) {
  await db.execute({
    sql: `UPDATE plans
          SET code = ?, billing_type = ?, billing_period = ?, name_tr = ?, price_cents = ?, currency = ?, play_product_id = ?, max_pets = ?, monthly_credit_allowance = ?, features = ?, is_active = ?
          WHERE id = ?`,
    args: [
      requireText(input.code, 'code'),
      requireText(input.billing_type || input.billingType, 'billing_type'),
      nullableText(input.billing_period || input.billingPeriod),
      requireText(input.name_tr || input.nameTr, 'name_tr'),
      integerOrZero(input.price_cents || input.priceCents),
      String(input.currency || 'TRY'),
      nullableText(input.play_product_id || input.playProductId),
      numberOrNull(input.max_pets || input.maxPets),
      integerOrZero(input.monthly_credit_allowance || input.monthlyCreditAllowance),
      jsonString(input.features),
      Number(input.is_active ?? 1) ? 1 : 0,
      planId
    ]
  });
  await audit(db, admin, 'update_plan', 'plan', planId);
  return plans(db);
}

async function deletePlan(db, admin, planId) {
  await db.execute({ sql: `DELETE FROM plans WHERE id = ?`, args: [planId] });
  await audit(db, admin, 'delete_plan', 'plan', planId);
  return { planId, deleted: true };
}

async function creditPackages(db) {
  const result = await db.execute({
    sql: `SELECT id, code, name_tr, credit_amount, price_cents, currency, play_product_id, metadata, is_active, sort_order, created_at, updated_at
          FROM credit_packages
          ORDER BY sort_order ASC, price_cents ASC, code ASC`,
    args: []
  });
  return result.rows.map((item) => ({ ...row(item), metadata: parseJson(item.metadata) }));
}

async function createCreditPackage(db, admin, input) {
  const packageId = id('credit-pack');
  await db.execute({
    sql: `INSERT INTO credit_packages
          (id, code, name_tr, credit_amount, price_cents, currency, play_product_id, metadata, is_active, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      packageId,
      requireText(input.code, 'code'),
      requireText(input.name_tr || input.nameTr, 'name_tr'),
      integerOrZero(input.credit_amount || input.creditAmount),
      integerOrZero(input.price_cents || input.priceCents),
      String(input.currency || 'TRY'),
      nullableText(input.play_product_id || input.playProductId),
      jsonString(input.metadata),
      Number(input.is_active ?? 1) ? 1 : 0,
      integerOrZero(input.sort_order || input.sortOrder),
      now(),
      now()
    ]
  });
  await audit(db, admin, 'create_credit_package', 'credit_package', packageId);
  return creditPackages(db);
}

async function updateCreditPackage(db, admin, packageId, input) {
  await db.execute({
    sql: `UPDATE credit_packages
          SET code = ?, name_tr = ?, credit_amount = ?, price_cents = ?, currency = ?, play_product_id = ?, metadata = ?, is_active = ?, sort_order = ?, updated_at = ?
          WHERE id = ?`,
    args: [
      requireText(input.code, 'code'),
      requireText(input.name_tr || input.nameTr, 'name_tr'),
      integerOrZero(input.credit_amount || input.creditAmount),
      integerOrZero(input.price_cents || input.priceCents),
      String(input.currency || 'TRY'),
      nullableText(input.play_product_id || input.playProductId),
      jsonString(input.metadata),
      Number(input.is_active ?? 1) ? 1 : 0,
      integerOrZero(input.sort_order || input.sortOrder),
      now(),
      packageId
    ]
  });
  await audit(db, admin, 'update_credit_package', 'credit_package', packageId);
  return creditPackages(db);
}

async function deleteCreditPackage(db, admin, packageId) {
  await db.execute({ sql: `DELETE FROM credit_packages WHERE id = ?`, args: [packageId] });
  await audit(db, admin, 'delete_credit_package', 'credit_package', packageId);
  return { packageId, deleted: true };
}

async function payments(db, { limit = 40, q = '', status = '' } = {}) {
  const where = [];
  const args = [];
  if (status) {
    where.push('sp.status = ?');
    args.push(status);
  }
  if (q) {
    where.push(`(
      LOWER(COALESCE(sp.product_id, '')) LIKE ?
      OR LOWER(COALESCE(sp.provider, '')) LIKE ?
      OR LOWER(COALESCE(u.display_name, '')) LIKE ?
      OR LOWER(COALESCE(u.email, '')) LIKE ?
      OR LOWER(COALESCE(u.phone, '')) LIKE ?
    )`);
    const like = likeValue(q);
    args.push(like, like, like, like, like);
  }
  const result = await db.execute({
    sql: `
      SELECT
        sp.*, u.display_name AS user_name, u.email AS user_email,
        p.code AS plan_code, cp.code AS credit_package_code
      FROM store_purchases sp
      JOIN users u ON u.id = sp.user_id
      LEFT JOIN plans p ON p.id = sp.plan_id
      LEFT JOIN credit_packages cp ON cp.id = sp.credit_package_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY COALESCE(sp.purchased_at, sp.created_at) DESC
      LIMIT ?`,
    args: [...args, limit]
  });
  return result.rows.map((item) => ({ ...row(item), metadata: parseJson(item.metadata) }));
}

async function createPayment(db, admin, input) {
  const paymentId = id('payment');
  await db.execute({
    sql: `INSERT INTO store_purchases
      (id, user_id, provider, product_type, product_id, plan_id, credit_package_id, purchase_token, status, amount_cents, currency, credits_granted, purchased_at, expires_at, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      paymentId,
      requireText(input.user_id || input.userId, 'user_id'),
      String(input.provider || 'google_play'),
      requireText(input.product_type || input.productType, 'product_type'),
      requireText(input.product_id || input.productId, 'product_id'),
      nullableText(input.plan_id || input.planId),
      nullableText(input.credit_package_id || input.creditPackageId),
      nullableText(input.purchase_token || input.purchaseToken),
      String(input.status || 'pending'),
      integerOrZero(input.amount_cents || input.amountCents),
      String(input.currency || 'TRY'),
      integerOrZero(input.credits_granted || input.creditsGranted),
      isoOrNull(input.purchased_at || input.purchasedAt),
      isoOrNull(input.expires_at || input.expiresAt),
      jsonString(input.metadata),
      now(),
      now()
    ]
  });
  await audit(db, admin, 'create_payment', 'store_purchase', paymentId);
  return payments(db, { limit: 40 });
}

async function updatePayment(db, admin, paymentId, input) {
  await db.execute({
    sql: `UPDATE store_purchases
      SET user_id = ?, provider = ?, product_type = ?, product_id = ?, plan_id = ?, credit_package_id = ?, purchase_token = ?, status = ?, amount_cents = ?, currency = ?, credits_granted = ?, purchased_at = ?, expires_at = ?, metadata = ?, updated_at = ?
      WHERE id = ?`,
    args: [
      requireText(input.user_id || input.userId, 'user_id'),
      String(input.provider || 'google_play'),
      requireText(input.product_type || input.productType, 'product_type'),
      requireText(input.product_id || input.productId, 'product_id'),
      nullableText(input.plan_id || input.planId),
      nullableText(input.credit_package_id || input.creditPackageId),
      nullableText(input.purchase_token || input.purchaseToken),
      String(input.status || 'pending'),
      integerOrZero(input.amount_cents || input.amountCents),
      String(input.currency || 'TRY'),
      integerOrZero(input.credits_granted || input.creditsGranted),
      isoOrNull(input.purchased_at || input.purchasedAt),
      isoOrNull(input.expires_at || input.expiresAt),
      jsonString(input.metadata),
      now(),
      paymentId
    ]
  });
  await audit(db, admin, 'update_payment', 'store_purchase', paymentId);
  return payments(db, { limit: 40 });
}

async function deletePayment(db, admin, paymentId) {
  await db.execute({ sql: `DELETE FROM store_purchases WHERE id = ?`, args: [paymentId] });
  await audit(db, admin, 'delete_payment', 'store_purchase', paymentId);
  return { paymentId, deleted: true };
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
  const status = SUBSCRIPTION_STATUSES.includes(String(input.status)) ? String(input.status) : 'active';
  await db.execute({ sql: `UPDATE subscriptions SET status = 'cancelled', updated_at = ? WHERE user_id = ? AND status = 'active'`, args: [now(), input.userId] });
  await db.execute({
    sql: `INSERT INTO subscriptions (id, user_id, plan_id, status, starts_at, renews_at, provider, metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'admin', ?, ?, ?)`,
    args: [id('sub'), input.userId, input.planId, status, now(), isoOrNull(input.renewsAt), JSON.stringify({ note: input.note || '', adminId: admin.id }), now(), now()]
  });
  await audit(db, admin, 'set_plan', 'user', input.userId, { planId: input.planId, status });
  return { userId: input.userId, planId: input.planId };
}

async function lookups(db) {
  const [species, planList, userList, petList] = await Promise.all([
    db.execute({ sql: `SELECT id, code, default_name_tr, default_name_en FROM pet_species WHERE is_active = 1 ORDER BY default_name_tr ASC`, args: [] }),
    db.execute({ sql: `SELECT id, code, name_tr, billing_type FROM plans WHERE is_active = 1 ORDER BY price_cents ASC, code ASC`, args: [] }),
    db.execute({ sql: `SELECT id, display_name, email, phone, status FROM users WHERE status <> 'deleted' ORDER BY display_name ASC LIMIT 300`, args: [] }),
    db.execute({ sql: `SELECT id, name, status FROM pets WHERE status <> 'deleted' ORDER BY name ASC LIMIT 300`, args: [] })
  ]);
  return {
    species: species.rows.map(row),
    plans: planList.rows.map(row),
    users: userList.rows.map(row),
    pets: petList.rows.map(row)
  };
}

function adminPermissionFor(path) {
  if (path.includes('/users')) return 'admin.manage_users';
  if (path.includes('/pets')) return 'admin.manage_pets';
  if (path.includes('/plans') || path.includes('/billing') || path.includes('/credits') || path.includes('/credit-packages') || path.includes('/payments')) return 'admin.manage_billing';
  if (path.includes('/records') || path.includes('/documents') || path.includes('/ai-jobs')) return 'admin.manage_records';
  if (path.includes('/settings')) return 'admin.manage_settings';
  return 'admin.read';
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

  const admin = await authorize(req, db, adminPermissionFor(path));
  if (!admin) return sendJson(res, 401, { ok: false, error: 'unauthorized' });

  try {
    const limit = limitOf(url);
    const q = url.searchParams.get('q') || '';
    const status = url.searchParams.get('status') || '';
    const kind = url.searchParams.get('kind') || '';
    const type = url.searchParams.get('type') || '';
    const ownerId = url.searchParams.get('ownerId') || '';
    const petId = url.searchParams.get('petId') || '';
    const userId = url.searchParams.get('userId') || '';

    if (req.method === 'GET' && path === '/api/admin/me') return sendJson(res, 200, { ok: true, data: { admin } });
    if (req.method === 'GET' && path === '/api/admin/lookups') return sendJson(res, 200, { ok: true, data: await lookups(db) });
    if (req.method === 'GET' && path === '/api/admin/settings') return sendJson(res, 200, { ok: true, data: await appSettings(db) });
    if (req.method === 'POST' && path === '/api/admin/settings') return sendJson(res, 200, { ok: true, data: await updateAppSettings(db, admin, await readJson(req)) });
    if (req.method === 'POST' && path === '/api/admin/settings/password') return sendJson(res, 200, { ok: true, data: await changePassword(db, admin, await readJson(req)) });
    if (req.method === 'GET' && path === '/api/admin/overview') return sendJson(res, 200, { ok: true, data: await overview(db) });

    if (req.method === 'GET' && path === '/api/admin/users') return sendJson(res, 200, { ok: true, data: await users(db, { limit, q, status }) });
    if (req.method === 'POST' && path === '/api/admin/users') return sendJson(res, 200, { ok: true, data: await createUser(db, admin, await readJson(req)) });
    if (req.method === 'GET' && /^\/api\/admin\/users\/[^/]+$/.test(path)) return sendJson(res, 200, { ok: true, data: await userDetail(db, path.split('/').pop()) });
    if (req.method === 'POST' && /^\/api\/admin\/users\/[^/]+$/.test(path)) return sendJson(res, 200, { ok: true, data: await updateUser(db, admin, path.split('/').pop(), await readJson(req)) });
    if (req.method === 'DELETE' && /^\/api\/admin\/users\/[^/]+$/.test(path)) return sendJson(res, 200, { ok: true, data: await removeUser(db, admin, path.split('/').pop()) });
    if (req.method === 'POST' && path === '/api/admin/users/status') return sendJson(res, 200, { ok: true, data: await setUserStatus(db, admin, await readJson(req)) });

    if (req.method === 'GET' && path === '/api/admin/pets') return sendJson(res, 200, { ok: true, data: await pets(db, { limit, q, status, ownerId }) });
    if (req.method === 'POST' && path === '/api/admin/pets') return sendJson(res, 200, { ok: true, data: await createPet(db, admin, await readJson(req)) });
    if (req.method === 'GET' && /^\/api\/admin\/pets\/[^/]+$/.test(path)) return sendJson(res, 200, { ok: true, data: await petDetail(db, path.split('/').pop()) });
    if (req.method === 'POST' && /^\/api\/admin\/pets\/[^/]+$/.test(path)) return sendJson(res, 200, { ok: true, data: await updatePet(db, admin, path.split('/').pop(), await readJson(req)) });
    if (req.method === 'DELETE' && /^\/api\/admin\/pets\/[^/]+$/.test(path)) return sendJson(res, 200, { ok: true, data: await removePet(db, admin, path.split('/').pop()) });
    if (req.method === 'POST' && path === '/api/admin/pets/status') return sendJson(res, 200, { ok: true, data: await setPetStatus(db, admin, await readJson(req)) });

    if (req.method === 'GET' && path === '/api/admin/records') return sendJson(res, 200, { ok: true, data: await recentRecords(db, { limit, q, kind, petId, userId }) });
    if (req.method === 'GET' && /^\/api\/admin\/records\/[^/]+\/[^/]+$/.test(path)) {
      const [, , , , recordKind, recordId] = path.split('/');
      return sendJson(res, 200, { ok: true, data: await recordDetail(db, recordKind, recordId) });
    }
    if (req.method === 'POST' && /^\/api\/admin\/records\/[^/]+$/.test(path)) {
      const [, , , , recordKind] = path.split('/');
      return sendJson(res, 200, { ok: true, data: await createRecord(db, admin, recordKind, await readJson(req)) });
    }
    if (req.method === 'POST' && /^\/api\/admin\/records\/[^/]+\/[^/]+$/.test(path)) {
      const [, , , , recordKind, recordId] = path.split('/');
      return sendJson(res, 200, { ok: true, data: await updateRecord(db, admin, recordKind, recordId, await readJson(req)) });
    }
    if (req.method === 'DELETE' && /^\/api\/admin\/records\/[^/]+\/[^/]+$/.test(path)) {
      const [, , , , recordKind, recordId] = path.split('/');
      return sendJson(res, 200, { ok: true, data: await deleteRecord(db, admin, recordKind, recordId) });
    }

    if (req.method === 'GET' && path === '/api/admin/documents') return sendJson(res, 200, { ok: true, data: await documents(db, { limit, q, status, type }) });
    if (req.method === 'GET' && /^\/api\/admin\/documents\/[^/]+$/.test(path)) return sendJson(res, 200, { ok: true, data: await documentDetail(db, path.split('/').pop()) });
    if (req.method === 'POST' && path === '/api/admin/documents') return sendJson(res, 200, { ok: true, data: await createRecord(db, admin, 'document', await readJson(req)) });
    if (req.method === 'POST' && /^\/api\/admin\/documents\/[^/]+$/.test(path)) return sendJson(res, 200, { ok: true, data: await updateRecord(db, admin, 'document', path.split('/').pop(), await readJson(req)) });
    if (req.method === 'DELETE' && /^\/api\/admin\/documents\/[^/]+$/.test(path)) return sendJson(res, 200, { ok: true, data: await deleteRecord(db, admin, 'document', path.split('/').pop()) });

    if (req.method === 'GET' && path === '/api/admin/usage') return sendJson(res, 200, { ok: true, data: await usage(db, limit) });
    if (req.method === 'GET' && path === '/api/admin/ai-jobs') return sendJson(res, 200, { ok: true, data: await aiJobs(db, { limit, q, status }) });
    if (req.method === 'GET' && path === '/api/admin/plans') return sendJson(res, 200, { ok: true, data: await plans(db) });
    if (req.method === 'POST' && path === '/api/admin/plans') return sendJson(res, 200, { ok: true, data: await createPlan(db, admin, await readJson(req)) });
    if (req.method === 'POST' && /^\/api\/admin\/plans\/[^/]+$/.test(path)) return sendJson(res, 200, { ok: true, data: await updatePlan(db, admin, path.split('/').pop(), await readJson(req)) });
    if (req.method === 'DELETE' && /^\/api\/admin\/plans\/[^/]+$/.test(path)) return sendJson(res, 200, { ok: true, data: await deletePlan(db, admin, path.split('/').pop()) });
    if (req.method === 'GET' && path === '/api/admin/credit-packages') return sendJson(res, 200, { ok: true, data: await creditPackages(db) });
    if (req.method === 'POST' && path === '/api/admin/credit-packages') return sendJson(res, 200, { ok: true, data: await createCreditPackage(db, admin, await readJson(req)) });
    if (req.method === 'POST' && /^\/api\/admin\/credit-packages\/[^/]+$/.test(path)) return sendJson(res, 200, { ok: true, data: await updateCreditPackage(db, admin, path.split('/').pop(), await readJson(req)) });
    if (req.method === 'DELETE' && /^\/api\/admin\/credit-packages\/[^/]+$/.test(path)) return sendJson(res, 200, { ok: true, data: await deleteCreditPackage(db, admin, path.split('/').pop()) });
    if (req.method === 'GET' && path === '/api/admin/payments') return sendJson(res, 200, { ok: true, data: await payments(db, { limit, q, status }) });
    if (req.method === 'POST' && path === '/api/admin/payments') return sendJson(res, 200, { ok: true, data: await createPayment(db, admin, await readJson(req)) });
    if (req.method === 'POST' && /^\/api\/admin\/payments\/[^/]+$/.test(path)) return sendJson(res, 200, { ok: true, data: await updatePayment(db, admin, path.split('/').pop(), await readJson(req)) });
    if (req.method === 'DELETE' && /^\/api\/admin\/payments\/[^/]+$/.test(path)) return sendJson(res, 200, { ok: true, data: await deletePayment(db, admin, path.split('/').pop()) });
    if (req.method === 'POST' && path === '/api/admin/credits/adjust') return sendJson(res, 200, { ok: true, data: await adjustCredits(db, admin, await readJson(req)) });
    if (req.method === 'POST' && path === '/api/admin/billing/plan') return sendJson(res, 200, { ok: true, data: await setPlan(db, admin, await readJson(req)) });

    return sendJson(res, 404, { ok: false, error: 'not_found' });
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: error.message || 'admin_request_failed' });
  }
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

async function aiJobs(db, { limit = 40, q = '', status = '' } = {}) {
  const filters = [];
  const args = [];
  if (status) {
    filters.push(`j.status = ?`);
    args.push(status);
  }
  if (q) {
    filters.push(`(
      LOWER(COALESCE(j.feature_code, '')) LIKE ?
      OR LOWER(COALESCE(j.error_message, '')) LIKE ?
      OR LOWER(COALESCE(u.display_name, '')) LIKE ?
      OR LOWER(COALESCE(p.name, '')) LIKE ?
    )`);
    args.push(likeValue(q), likeValue(q), likeValue(q), likeValue(q));
  }
  args.push(limit);
  const result = await db.execute({
    sql: `
      SELECT
        j.id, j.user_id, j.pet_id, j.feature_code, j.status, j.input_payload, j.output_payload,
        j.credit_cost, j.error_message, j.created_at, j.completed_at,
        u.display_name AS user_name,
        u.email AS user_email,
        p.name AS pet_name
      FROM ai_analysis_jobs j
      LEFT JOIN users u ON u.id = j.user_id
      LEFT JOIN pets p ON p.id = j.pet_id
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY j.created_at DESC
      LIMIT ?`,
    args
  });
  return result.rows.map((item) => ({
    ...row(item),
    input_payload: parseJson(item.input_payload),
    output_payload: parseJson(item.output_payload)
  }));
}
