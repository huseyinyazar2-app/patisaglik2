import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { mediaCategories, optionalEnv } from './config.js';
import { completeAiJob, createAiJob, getDb, insertMediaMetadata } from './db.js';
import { handleAdminRequest, publicAppSettings } from './admin.js';
import { presignGetObject, presignPutObject } from './s3Presign.js';
import { documentOcrPrompt, generateGeminiJson, normalizeOcrResult } from './ai.js';
import { codedError, errorCodeFor } from './errorCodes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const port = Number(process.env.PORT || 3000);
const INITIAL_AI_CREDITS = 1;
const VET_LIVE_TEST_CREDIT_PHONES = new Set(['5336565251', '+905336565251'].map(normalizePhone));
const AI_CREDIT_FEATURES = new Set(['document-ai', 'document-ocr', 'package-risk', 'toxic-ai', 'ai-triage', 'vet-prep-ai']);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, data) {
  if (data?.ok === false && !data.errorCode) {
    data.errorCode = errorCodeFor(data.error || data.reason);
  }
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': optionalEnv('CORS_ORIGIN', '*'),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token, X-Admin-Session',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 24 * 1024 * 1024) {
        reject(new Error('body_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('invalid_json'));
      }
    });
  });
}

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function executeOptional(db, sql, args = []) {
  try {
    await db.execute({ sql, args });
  } catch (error) {
    const message = String(error?.message || '');
    if (!/duplicate column|already exists/i.test(message)) throw error;
  }
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

function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '').trim();
}

function safeUser(row = {}, extras = {}) {
  return {
    id: row.id,
    name: row.display_name || '',
    email: row.email || '',
    phone: row.phone || '',
    locale: row.locale || 'tr',
    timezone: row.timezone || 'Europe/Istanbul',
    accountRole: extras.accountRole || 'owner',
    vetProfileId: extras.vetProfileId || null
  };
}

function rowToObject(row) {
  return Object.fromEntries(Object.entries(row || {}));
}

function parseJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function firstValue(value) {
  if (Array.isArray(value)) {
    const first = value.find((item) => item && (typeof item === 'string' || item.checked));
    return typeof first === 'string' ? first : first?.label || '';
  }
  return value || '';
}

function pickPayload(payload, names, fallback = '') {
  const entries = Object.entries(payload || {});
  const needles = names.map(normalizeKey);
  for (const [key, value] of entries) {
    const normalized = normalizeKey(key);
    if (needles.some((needle) => normalized.includes(needle))) return value;
  }
  return fallback;
}

function moneyToCents(value) {
  const raw = String(value || '').replace(/[^\d,.-]/g, '');
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function isoOrNow(value) {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : new Date().toISOString();
}

function isoOrNull(value) {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null;
}

function numberFromInput(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function speciesIdFor(code) {
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

async function ensureSpecies(db) {
  const species = [
    ['species-cat', 'cat', 'Kedi', 'Cat', 'mammal'],
    ['species-dog', 'dog', 'Köpek', 'Dog', 'mammal'],
    ['species-bird', 'bird', 'Kuş', 'Bird', 'avian'],
    ['species-fish', 'fish', 'Balık', 'Fish', 'aquatic'],
    ['species-reptile', 'reptile', 'Sürüngen', 'Reptile', 'reptile'],
    ['species-small-mammal', 'small_mammal', 'Küçük Memeli', 'Small mammal', 'mammal'],
    ['species-exotic', 'exotic', 'Egzotik', 'Exotic', 'exotic']
  ];
  for (const item of species) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO pet_species (id, code, default_name_tr, default_name_en, category)
            VALUES (?, ?, ?, ?, ?)`,
      args: item
    });
  }
}

async function ensureAuthSchema(db) {
  await executeOptional(db, `ALTER TABLE users ADD COLUMN password_hash TEXT`);
  await executeOptional(db, `CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`);
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      assigned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      PRIMARY KEY (user_id, role_id)
    )`,
    args: []
  });
  await db.execute({
    sql: `INSERT OR IGNORE INTO roles (id, code, name_tr, description_tr)
          VALUES ('role-vet-live', 'vet_live', 'Canli Gorusme Veterineri', 'Canli veteriner gorusme paneli erisimi')`,
    args: []
  }).catch(() => {});
  await db.batch([
    `INSERT OR IGNORE INTO permissions (id, code, name_tr) VALUES ('perm-vet-live-panel', 'vet_live_panel', 'Canli veteriner panelini kullan')`,
    `INSERT OR IGNORE INTO permissions (id, code, name_tr) VALUES ('perm-vet-live-notes', 'vet_live_notes', 'Canli gorusme notu ekle')`,
    `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('role-vet-live', 'perm-vet-live-panel')`,
    `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES ('role-vet-live', 'perm-vet-live-notes')`
  ].map(sql => ({ sql, args: [] }))).catch(() => {});
}

async function accountAccessForUser(db, userId) {
  const roleResult = await db.execute({
    sql: `SELECT r.code
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = ?
          ORDER BY CASE WHEN r.code = 'vet_live' THEN 0 ELSE 1 END
          LIMIT 1`,
    args: [userId]
  }).catch(() => ({ rows: [] }));
  const vetProfile = await db.execute({
    sql: `SELECT id FROM vet_profiles WHERE user_id = ? AND status = 'approved' LIMIT 1`,
    args: [userId]
  }).catch(() => ({ rows: [] }));
  const vetProfileId = vetProfile.rows[0]?.id || null;
  return {
    accountRole: roleResult.rows[0]?.code || (vetProfileId ? 'vet_live' : 'owner'),
    vetProfileId
  };
}

async function ensureInitialWallet(db, userId, createdAt = new Date().toISOString()) {
  const walletId = id('wallet');
  await db.execute({
    sql: `INSERT INTO credit_wallets (id, user_id, balance, currency, created_at, updated_at)
          VALUES (?, ?, ?, 'credit', ?, ?)
          ON CONFLICT(user_id) DO NOTHING`,
    args: [walletId, userId, INITIAL_AI_CREDITS, createdAt, createdAt]
  });
  const wallet = (await db.execute({ sql: `SELECT id, balance, currency FROM credit_wallets WHERE user_id = ? LIMIT 1`, args: [userId] })).rows[0];
  const welcome = wallet?.id ? await db.execute({
    sql: `SELECT id FROM credit_transactions WHERE user_id = ? AND reason = 'welcome_credit' LIMIT 1`,
    args: [userId]
  }) : { rows: [] };
  if (wallet?.id && !welcome.rows.length) {
    await db.execute({
      sql: `INSERT INTO credit_transactions (id, wallet_id, user_id, amount, direction, reason, metadata, created_at)
            VALUES (?, ?, ?, ?, 'in', 'welcome_credit', ?, ?)`,
      args: [id('credit'), wallet.id, userId, INITIAL_AI_CREDITS, JSON.stringify({ reason: 'initial_ai_credit' }), createdAt]
    }).catch(() => {});
  }
  return wallet || { balance: INITIAL_AI_CREDITS, currency: 'credit' };
}

async function grantTestCredits(db, phones = [], balance = 100, createdAt = new Date().toISOString()) {
  const normalizedPhones = phones.map(normalizePhone).filter((phone) => VET_LIVE_TEST_CREDIT_PHONES.has(phone));
  if (!normalizedPhones.length) return;
  const placeholders = normalizedPhones.map(() => '?').join(',');
  const users = await db.execute({
    sql: `SELECT id FROM users WHERE phone IN (${placeholders})`,
    args: normalizedPhones
  }).catch(() => ({ rows: [] }));
  for (const user of users.rows) {
    const wallet = await ensureInitialWallet(db, user.id, createdAt);
    if (Number(wallet.balance || 0) >= balance) continue;
    await db.batch([
      {
        sql: `UPDATE credit_wallets SET balance = ?, updated_at = ? WHERE user_id = ?`,
        args: [balance, createdAt, user.id]
      },
      {
        sql: `INSERT INTO credit_transactions
          (id, wallet_id, user_id, amount, direction, reason, metadata, created_at)
          VALUES (?, ?, ?, ?, 'in', 'manual_test_credit', ?, ?)`,
        args: [id('credit'), wallet.id, user.id, balance - Number(wallet.balance || 0), JSON.stringify({ source: 'vet_live_test_setup' }), createdAt]
      }
    ]);
  }
}

async function activeBillingContext(db, userId) {
  await ensureInitialWallet(db, userId);
  const subscription = await db.execute({
    sql: `SELECT p.code, p.monthly_credit_allowance, p.features
          FROM subscriptions s
          JOIN plans p ON p.id = s.plan_id
          WHERE s.user_id = ? AND s.status IN ('active', 'trialing')
          ORDER BY COALESCE(s.renews_at, s.starts_at) DESC
          LIMIT 1`,
    args: [userId]
  }).catch(() => ({ rows: [] }));
  const plan = subscription.rows[0] || await db.execute({
    sql: `SELECT code, monthly_credit_allowance, features FROM plans WHERE code = 'free' LIMIT 1`,
    args: []
  }).then(result => result.rows[0]).catch(() => null);
  const wallet = await db.execute({ sql: `SELECT id, balance, currency FROM credit_wallets WHERE user_id = ? LIMIT 1`, args: [userId] });
  return {
    plan: rowToObject(plan || { code: 'free', monthly_credit_allowance: 0, features: '{"aiCreditCost":1}' }),
    wallet: rowToObject(wallet.rows[0] || { balance: 0, currency: 'credit' })
  };
}

function aiCreditCost(featureCode, plan = {}) {
  if (!AI_CREDIT_FEATURES.has(featureCode)) return 0;
  try {
    const features = typeof plan.features === 'string' ? JSON.parse(plan.features || '{}') : plan.features || {};
    return Math.max(1, Number(features.aiCreditCost || 1));
  } catch {
    return 1;
  }
}

async function featureAvailability(db, { userId, featureCode }) {
  const context = await activeBillingContext(db, userId);
  const cost = aiCreditCost(featureCode, context.plan);
  if (cost <= 0) return { ok: true, cost, source: 'free', remaining: Number(context.wallet.balance || 0) };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const used = await db.execute({
    sql: `SELECT COALESCE(SUM(credit_cost), 0) AS used
          FROM feature_usage
          WHERE user_id = ? AND credit_cost > 0 AND created_at >= ?`,
    args: [userId, monthStart.toISOString()]
  }).catch(() => ({ rows: [{ used: 0 }] }));
  const monthlyUsed = Number(used.rows[0]?.used || 0);
  const allowance = Number(context.plan.monthly_credit_allowance || 0);
  if (allowance > 0 && monthlyUsed + cost <= allowance) {
    return { ok: true, cost, source: 'subscription_allowance', remaining: allowance - monthlyUsed };
  }
  const walletBalance = Number(context.wallet.balance || 0);
  if (walletBalance >= cost) return { ok: true, cost, source: 'wallet', remaining: walletBalance };
  return { ok: false, cost, source: 'insufficient', remaining: Math.max(0, allowance - monthlyUsed) + walletBalance };
}

async function recordServerFeatureUsage(db, { userId, petId = null, featureCode, relatedId = null }) {
  const availability = await featureAvailability(db, { userId, featureCode });
  if (!availability.ok) {
    const error = new Error('insufficient_credits');
    error.statusCode = 402;
    throw error;
  }
  const context = await activeBillingContext(db, userId);
  const createdAt = new Date().toISOString();
  const usageId = id('usage');
  let creditSource = availability.source;
  if (availability.cost > 0 && availability.source === 'wallet') {
    const nextBalance = Number(context.wallet.balance || 0) - availability.cost;
    const debit = await db.execute({
      sql: `UPDATE credit_wallets SET balance = ?, updated_at = ? WHERE id = ? AND balance >= ?`,
      args: [nextBalance, createdAt, context.wallet.id, availability.cost]
    });
    if (Number(debit.rowsAffected ?? 1) < 1) {
      const error = new Error('insufficient_credits');
      error.statusCode = 402;
      throw error;
    }
    await db.execute({
      sql: `INSERT INTO credit_transactions (id, wallet_id, user_id, amount, direction, reason, related_entity_type, related_entity_id, metadata, created_at)
            VALUES (?, ?, ?, ?, 'out', 'ai_usage', 'feature_usage', ?, ?, ?)`,
      args: [id('credit'), context.wallet.id, userId, availability.cost, usageId, JSON.stringify({ featureCode, relatedId }), createdAt]
    });
  }
  await db.execute({
    sql: `INSERT INTO feature_usage
      (id, user_id, pet_id, feature_code, plan_code, credit_cost, usage_count, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [
      usageId,
      userId,
      petId,
      featureCode,
      context.plan.code || 'free',
      availability.cost,
      JSON.stringify({ related_entity_id: relatedId, credit_source: creditSource, billing_source: 'api' }),
      createdAt
    ]
  });
  return { ok: true, usage: { id: usageId, credit_cost: availability.cost, plan_code: context.plan.code || 'free', credit_source: creditSource } };
}

async function handleFeatureAvailability(req, res) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  const body = await readBody(req);
  const userId = body.userId || 'user-1';
  const featureCode = body.featureCode || '';
  return sendJson(res, 200, await featureAvailability(db, { userId, featureCode }));
}

async function handleBillingAccount(req, res, url) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  const userId = url.searchParams.get('userId') || 'user-1';
  const context = await activeBillingContext(db, userId);
  const [plansResult, packagesResult] = await Promise.all([
    db.execute({ sql: `SELECT * FROM plans WHERE is_active = 1 ORDER BY price_cents ASC, code ASC`, args: [] }).catch(() => ({ rows: [] })),
    db.execute({ sql: `SELECT * FROM credit_packages WHERE is_active = 1 ORDER BY sort_order ASC, price_cents ASC`, args: [] }).catch(() => ({ rows: [] }))
  ]);
  return sendJson(res, 200, {
    ok: true,
    data: {
      plan: context.plan,
      wallet: context.wallet,
      plans: plansResult.rows.map(rowToObject),
      creditPackages: packagesResult.rows.map(rowToObject)
    }
  });
}

async function handleFeatureUsage(req, res) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  const body = await readBody(req);
  try {
    return sendJson(res, 200, await recordServerFeatureUsage(db, {
      userId: body.userId || 'user-1',
      petId: body.petId || null,
      featureCode: body.featureCode || '',
      relatedId: body.relatedId || null
    }));
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { ok: false, error: error.message || 'feature_usage_failed' });
  }
}

async function handleRegister(req, res) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  await ensureAuthSchema(db);
  await ensureVetLiveSchema(db);
  const body = await readBody(req);
  const displayName = String(body.name || body.displayName || '').trim();
  const phone = normalizePhone(body.phone);
  const email = String(body.email || '').trim() || null;
  const password = String(body.password || '');
  if (!displayName || !phone || password.length < 4) return sendJson(res, 400, { ok: false, error: 'invalid_register_fields' });

  const existing = await db.execute({ sql: `SELECT id FROM users WHERE phone = ? LIMIT 1`, args: [phone] });
  if (existing.rows.length) return sendJson(res, 409, { ok: false, error: 'phone_already_registered' });

  const userId = id('user');
  const createdAt = new Date().toISOString();
  const locale = body.locale || 'tr';
  const timezone = body.timezone || 'Europe/Istanbul';
  const metadata = JSON.stringify({
    location: body.location || {},
    notificationPreference: body.notificationPreference || 'push',
    authProvider: 'phone_password'
  });
  await db.execute({
    sql: `INSERT INTO users (id, email, phone, display_name, password_hash, locale, timezone, status, metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    args: [userId, email, phone, displayName, hashPassword(password), locale, timezone, metadata, createdAt, createdAt]
  });
  await db.execute({
    sql: `INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, 'role-owner')`,
    args: [userId]
  }).catch(() => {});
  await ensureInitialWallet(db, userId, createdAt);
  await grantTestCredits(db, [phone], 100, createdAt);
  const wallet = await ensureInitialWallet(db, userId, createdAt);
  return sendJson(res, 200, { ok: true, user: { id: userId, name: displayName, email, phone, locale, timezone, accountRole: 'owner', vetProfileId: null }, wallet });
}

async function handleLogin(req, res) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  await ensureAuthSchema(db);
  const body = await readBody(req);
  const login = String(body.phone || body.email || body.login || '').trim().toLowerCase();
  const phone = normalizePhone(login);
  const password = String(body.password || '');
  if (!login || !password) return sendJson(res, 400, { ok: false, error: 'invalid_login_fields' });
  const result = await db.execute({ sql: `SELECT * FROM users WHERE (phone = ? OR lower(email) = ?) AND status <> 'deleted' LIMIT 1`, args: [phone, login] });
  const user = result.rows[0];
  if (!user?.id || !verifyPassword(password, user.password_hash)) return sendJson(res, 401, { ok: false, error: 'invalid_credentials' });
  await ensureInitialWallet(db, user.id);
  await grantTestCredits(db, [user.phone], 100);
  const wallet = await ensureInitialWallet(db, user.id);
  const access = await accountAccessForUser(db, user.id);
  return sendJson(res, 200, { ok: true, user: safeUser(user, access), wallet });
}

async function handleGetPets(req, res, url) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  const userId = url.searchParams.get('userId') || 'user-1';
  const result = await db.execute({
    sql: `SELECT p.*, s.code AS species_code
          FROM pets p
          JOIN pet_species s ON s.id = p.species_id
          WHERE p.primary_owner_user_id = ? AND p.status <> 'deleted'
          ORDER BY p.created_at ASC`,
    args: [userId]
  });
  return sendJson(res, 200, { ok: true, data: { pets: result.rows.map(rowToObject) } });
}

async function handleSavePet(req, res) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  await ensureSpecies(db);
  const body = await readBody(req);
  const pet = body.pet || {};
  const userId = body.userId || 'user-1';
  const petId = id('pet');
  const now = new Date().toISOString();
  const metadata = JSON.stringify({
    breed: pet.breed || '',
    gender: pet.gender || 'unknown',
    weight: numberFromInput(pet.weight),
    neutered: pet.neutered || 'unknown',
    chronic: pet.chronic || '',
    allergies: pet.allergies || '',
    medications: pet.medications || '',
    location: pet.location || '',
    volunteerNote: pet.volunteerNote || '',
    extractedTags: pet.extractedTags || []
  });
  if (!pet.name) return sendJson(res, 400, { ok: false, error: 'pet_name_required' });
  await db.batch([
    {
      sql: `INSERT INTO pets
        (id, primary_owner_user_id, species_id, name, sex, birth_date, approximate_age_label, weight_kg, neutered_status, ownership_type, medical_summary, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        petId,
        userId,
        speciesIdFor(pet.type),
        pet.name,
        pet.gender || 'unknown',
        pet.birthDate || null,
        '',
        numberFromInput(pet.weight),
        pet.neutered || 'unknown',
        pet.ownership || 'owned',
        pet.rawHistory || '',
        metadata,
        now,
        now
      ]
    },
    {
      sql: `INSERT OR IGNORE INTO pet_members (id, pet_id, user_id, role_id, status)
            VALUES (?, ?, ?, 'role-owner', 'active')`,
      args: [`member-${userId}-${petId}`, petId, userId]
    }
  ]);
  return sendJson(res, 200, { ok: true, id: petId });
}

async function handleUpdatePet(req, res) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  const body = await readBody(req);
  const pet = body.pet || {};
  const userId = body.userId || 'user-1';
  const petId = body.petId;
  if (!petId) return sendJson(res, 400, { ok: false, error: 'pet_required' });
  const current = (await db.execute({ sql: `SELECT * FROM pets WHERE id = ? AND primary_owner_user_id = ? LIMIT 1`, args: [petId, userId] })).rows[0];
  if (!current?.id) return sendJson(res, 404, { ok: false, error: 'pet_not_found' });
  const currentMeta = parseJson(current.metadata);
  const metadata = JSON.stringify({
    ...currentMeta,
    breed: pet.breed ?? currentMeta.breed ?? '',
    gender: pet.gender ?? current.sex ?? currentMeta.gender ?? 'unknown',
    weight: numberFromInput(pet.weight ?? current.weight_kg ?? currentMeta.weight),
    neutered: pet.neutered ?? current.neutered_status ?? currentMeta.neutered ?? 'unknown',
    chronic: pet.chronic ?? currentMeta.chronic ?? '',
    allergies: pet.allergies ?? currentMeta.allergies ?? '',
    medications: pet.medications ?? currentMeta.medications ?? '',
    location: pet.location ?? currentMeta.location ?? '',
    volunteerNote: pet.volunteerNote ?? currentMeta.volunteerNote ?? '',
    photo: pet.photo ?? current.avatar_url ?? currentMeta.photo ?? ''
  });
  await db.execute({
    sql: `UPDATE pets
          SET name = ?, sex = ?, birth_date = ?, weight_kg = ?, neutered_status = ?, ownership_type = ?,
              medical_summary = ?, avatar_url = ?, metadata = ?, updated_at = ?
          WHERE id = ? AND primary_owner_user_id = ?`,
    args: [
      pet.name ?? current.name,
      pet.gender ?? current.sex ?? 'unknown',
      pet.birthDate ?? current.birth_date,
      numberFromInput(pet.weight ?? current.weight_kg),
      pet.neutered ?? current.neutered_status ?? 'unknown',
      pet.ownership ?? current.ownership_type ?? 'owned',
      pet.rawHistory ?? current.medical_summary ?? '',
      pet.photo ?? current.avatar_url ?? null,
      metadata,
      new Date().toISOString(),
      petId,
      userId
    ]
  });
  return sendJson(res, 200, { ok: true, id: petId });
}

const healthFeatureTypes = {
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

function genericTitle(payload, fallback) {
  const value = firstValue(pickPayload(payload, ['başlık', 'baslik', 'title', 'konu', 'ad', 'name', 'tip', 'type', 'skor', 'score']));
  return value || fallback;
}

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || Math.random().toString(36).slice(2, 10);
}

function checkedLabels(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string' || item.checked)
    .map((item) => typeof item === 'string' ? item : item.label)
    .filter(Boolean);
}

function documentTypeForFeature(featureCode) {
  const map = {
    'clinic-export': 'clinic_export',
    'document-ai': 'health_document',
    'vet-prep': 'vet_prep'
  };
  return map[featureCode] || featureCode;
}

async function insertFormMedia(db, record, payload) {
  const files = Array.isArray(payload.__media_files) ? payload.__media_files : [];
  for (const [index, file] of files.entries()) {
    await db.execute({
      sql: `INSERT INTO media_files
        (id, pet_id, uploaded_by_user_id, related_entity_type, related_entity_id, media_type, url, local_uri, mime_type, file_size_bytes, metadata)
        VALUES (?, ?, ?, 'form_submission', ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id('media'),
        record.pet_id,
        record.user_id,
        record.id,
        String(file.mime_type || '').startsWith('image/') ? 'image' : 'document',
        file.object_key || file.url || null,
        file.local_uri || null,
        file.mime_type || '',
        Number(file.file_size_bytes || 0),
        JSON.stringify({ index, label: file.label || '', name: file.name || '' })
      ]
    });
  }
  return files.length;
}

async function insertFormDomainRecord(db, record, payload) {
  if (!record.pet_id) return null;
  if (record.feature_code === 'expense') {
    const category = firstValue(pickPayload(payload, ['kategori', 'category'], 'Masraf')) || 'Masraf';
    await db.execute({
      sql: `INSERT INTO expenses
        (id, pet_id, created_by_user_id, category, amount_cents, currency, spent_at, title, note, metadata)
        VALUES (?, ?, ?, ?, ?, 'TRY', ?, ?, ?, ?)`,
      args: [
        id('expense'),
        record.pet_id,
        record.user_id,
        category,
        moneyToCents(pickPayload(payload, ['tutar', 'amount', 'price'])),
        isoOrNow(pickPayload(payload, ['tarih', 'date'])),
        category,
        firstValue(pickPayload(payload, ['not', 'note', 'açıklama', 'aciklama'])),
        JSON.stringify({ form_submission_id: record.id, payload })
      ]
    });
    return 'expenses';
  }
  if (record.feature_code === 'reminders') {
    const reminderType = firstValue(pickPayload(payload, ['hatırlatma tipi', 'hatirlatma tipi', 'reminder type', 'tip'], 'Genel')) || 'Genel';
    const title = firstValue(pickPayload(payload, ['başlık', 'baslik', 'title'], reminderType)) || reminderType;
    await db.execute({
      sql: `INSERT INTO reminders
        (id, pet_id, created_by_user_id, reminder_type, title, due_at, repeat_rule, status, note, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)`,
      args: [
        id('reminder'),
        record.pet_id,
        record.user_id,
        reminderType,
        title,
        isoOrNow(pickPayload(payload, ['tarih', 'date'])),
        firstValue(pickPayload(payload, ['tekrar', 'repeat'], 'Bir kez')),
        firstValue(pickPayload(payload, ['not', 'note', 'açıklama', 'aciklama'])),
        JSON.stringify({ form_submission_id: record.id, payload })
      ]
    });
    return 'reminders';
  }
  if (healthFeatureTypes[record.feature_code]) {
    await db.execute({
      sql: `INSERT INTO health_records
        (id, pet_id, created_by_user_id, record_type, title, occurred_at, summary, payload, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'feature_form')`,
      args: [
        id('health'),
        record.pet_id,
        record.user_id,
        healthFeatureTypes[record.feature_code],
        genericTitle(payload, record.feature_code),
        new Date().toISOString(),
        firstValue(pickPayload(payload, ['not', 'note', 'özet', 'ozet', 'açıklama', 'aciklama', 'detay', 'detail'])),
        JSON.stringify({ form_submission_id: record.id, feature_code: record.feature_code, ...payload })
      ]
    });
    return 'health_records';
  }
  if (['clinic-export', 'document-ai', 'vet-prep'].includes(record.feature_code)) {
    await db.execute({
      sql: `INSERT INTO documents
        (id, pet_id, uploaded_by_user_id, document_type, title, extracted_text, extracted_data, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
      args: [
        id('document'),
        record.pet_id,
        record.user_id,
        documentTypeForFeature(record.feature_code),
        genericTitle(payload, 'Belge'),
        firstValue(pickPayload(payload, ['not', 'note', 'özet', 'ozet'])),
        JSON.stringify({ form_submission_id: record.id, feature_code: record.feature_code, payload })
      ]
    });
    return 'documents';
  }
  if (record.feature_code === 'qr') {
    const current = await db.execute({
      sql: 'SELECT metadata, public_profile_token FROM pets WHERE id = ? LIMIT 1',
      args: [record.pet_id]
    });
    const publicToken = current.rows[0]?.public_profile_token || `qr-${record.pet_id}-${Math.random().toString(36).slice(2, 10)}`;
    const metadata = parseJson(current.rows[0]?.metadata);
    await db.execute({
      sql: `UPDATE pets
            SET public_profile_token = COALESCE(public_profile_token, ?),
                metadata = ?,
                updated_at = ?
            WHERE id = ?`,
      args: [
        publicToken,
        JSON.stringify({
          ...metadata,
          qr_health_card: {
            form_submission_id: record.id,
            public_token: publicToken,
            public_path: `/public/pet/${publicToken}`,
            shared_fields: checkedLabels(pickPayload(payload, ['shared fields', 'paylasilan alanlar'], [])),
            updated_at: new Date().toISOString()
          }
        }),
        new Date().toISOString(),
        record.pet_id
      ]
    });
    return { table: 'pets', publicToken, publicPath: `/public/pet/${publicToken}` };
  }
  if (record.feature_code === 'sitter') {
    const displayName = genericTitle(payload, 'Bakici');
    const contact = firstValue(pickPayload(payload, ['phone email', 'email', 'phone', 'telefon', 'e-posta'], ''));
    const email = contact.includes('@') ? contact : `${slug(contact || displayName)}@invite.local`;
    const invitedUserId = `user-invite-${slug(email)}`;
    const memberId = `member-${record.pet_id}-${invitedUserId}`;
    const now = new Date().toISOString();
    const ends = new Date();
    ends.setDate(ends.getDate() + 7);
    await db.execute({
      sql: `INSERT INTO users (id, email, display_name, locale)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name`,
      args: [invitedUserId, email, displayName, record.locale || 'tr']
    });
    const userResult = await db.execute({ sql: 'SELECT id FROM users WHERE email = ? LIMIT 1', args: [email] });
    const finalUserId = userResult.rows[0]?.id || invitedUserId;
    await db.execute({
      sql: `INSERT INTO pet_members
        (id, pet_id, user_id, role_id, invited_by_user_id, status, access_starts_at, access_ends_at, updated_at)
        VALUES (?, ?, ?, 'role-sitter', ?, 'invited', ?, ?, ?)
        ON CONFLICT(pet_id, user_id) DO UPDATE SET
          role_id = excluded.role_id,
          invited_by_user_id = excluded.invited_by_user_id,
          status = excluded.status,
          access_ends_at = excluded.access_ends_at,
          updated_at = excluded.updated_at`,
      args: [memberId, record.pet_id, finalUserId, record.user_id, now, ends.toISOString(), now]
    });
    return {
      table: 'pet_members',
      invitePath: `/invite/sitter/${memberId}`,
      inviteText: `${displayName} icin bakici daveti hazir.`
    };
  }
  return null;
}

async function handleSubmitForm(req, res) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  const body = await readBody(req);
  const now = new Date().toISOString();
  const record = {
    id: id('form'),
    user_id: body.userId || 'user-1',
    pet_id: body.petId || null,
    feature_code: body.featureCode || 'form',
    locale: body.locale || 'tr',
    status: 'submitted',
    payload: body.payload || {},
    created_at: now,
    updated_at: now
  };
  await db.execute({
    sql: `INSERT INTO form_submissions
      (id, user_id, pet_id, feature_code, locale, status, payload, created_at, updated_at, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [record.id, record.user_id, record.pet_id, record.feature_code, record.locale, record.status, JSON.stringify(record.payload), now, now, now]
  });
  const mediaCount = await insertFormMedia(db, record, record.payload);
  const domainResult = await insertFormDomainRecord(db, record, record.payload);
  const domainTable = typeof domainResult === 'string' ? domainResult : domainResult?.table;
  return sendJson(res, 200, {
    ok: true,
    id: record.id,
    domainTable,
    mediaCount,
    publicToken: domainResult?.publicToken,
    publicPath: domainResult?.publicPath,
    invitePath: domainResult?.invitePath,
    inviteText: domainResult?.inviteText
  });
}

async function mediaBySubmission(db, petId, ids) {
  const submissionIds = [...new Set((ids || []).filter(Boolean))];
  if (!submissionIds.length) return {};
  const placeholders = submissionIds.map(() => '?').join(', ');
  const args = petId ? [petId, ...submissionIds] : submissionIds;
  const petClause = petId ? 'pet_id = ? AND ' : '';
  const result = await db.execute({
    sql: `SELECT id, related_entity_id, media_type, local_uri, mime_type, file_size_bytes, metadata, created_at
          FROM media_files
          WHERE ${petClause}related_entity_type = 'form_submission'
            AND related_entity_id IN (${placeholders})
          ORDER BY created_at DESC`,
    args
  });
  return result.rows.map(rowToObject).reduce((acc, item) => {
    acc[item.related_entity_id] = acc[item.related_entity_id] || [];
    acc[item.related_entity_id].push({ ...item, metadata: parseJson(item.metadata) });
    return acc;
  }, {});
}

async function handleGetRecords(req, res, url) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  const petId = url.searchParams.get('petId') || '';
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 20)));
  const args = petId ? [petId, limit] : [limit];
  const where = petId ? 'WHERE pet_id = ?' : '';
  const [expensesResult, remindersResult, healthResult] = await Promise.all([
    db.execute({ sql: `SELECT id, category, amount_cents, currency, spent_at, title, note, metadata, created_at FROM expenses ${where} ORDER BY spent_at DESC, created_at DESC LIMIT ?`, args }),
    db.execute({ sql: `SELECT id, reminder_type, title, due_at, repeat_rule, status, note, metadata, created_at FROM reminders ${where} ORDER BY due_at ASC, created_at DESC LIMIT ?`, args }),
    db.execute({ sql: `SELECT id, record_type, title, occurred_at, summary, payload, source, created_at FROM health_records ${where} ORDER BY occurred_at DESC, created_at DESC LIMIT ?`, args })
  ]);
  const expenses = expensesResult.rows.map((row) => ({ ...rowToObject(row), metadata: parseJson(row.metadata) }));
  const reminders = remindersResult.rows.map((row) => ({ ...rowToObject(row), metadata: parseJson(row.metadata) }));
  const healthRecords = healthResult.rows.map((row) => ({ ...rowToObject(row), payload: parseJson(row.payload) }));
  const media = await mediaBySubmission(db, petId, [
    ...expenses.map((item) => item.metadata?.form_submission_id),
    ...reminders.map((item) => item.metadata?.form_submission_id),
    ...healthRecords.map((item) => item.payload?.form_submission_id)
  ]);
  return sendJson(res, 200, {
    ok: true,
    data: {
      storage: 'api',
      expenses: expenses.map((item) => ({ ...item, mediaFiles: media[item.metadata?.form_submission_id] || [] })),
      reminders: reminders.map((item) => ({ ...item, mediaFiles: media[item.metadata?.form_submission_id] || [] })),
      healthRecords: healthRecords.map((item) => ({ ...item, mediaFiles: media[item.payload?.form_submission_id] || [] }))
    }
  });
}

async function handleGetDocuments(req, res, url) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  const petId = url.searchParams.get('petId') || '';
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 20)));
  const args = petId ? [petId, limit] : [limit];
  const petFilter = petId ? 'AND pet_id = ?' : '';
  const result = await db.execute({
    sql: `SELECT id, pet_id, document_type, title, extracted_text, extracted_data, status, created_at, updated_at
          FROM documents
          WHERE document_type IN ('clinic_export', 'health_document', 'vet_prep') ${petFilter}
          ORDER BY created_at DESC
          LIMIT ?`,
    args
  });
  return sendJson(res, 200, { ok: true, data: { documents: result.rows.map(rowToObject) } });
}

async function handleGetDocument(req, res, documentId) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  const result = await db.execute({
    sql: `SELECT id, pet_id, document_type, title, extracted_text, extracted_data, status, created_at, updated_at
          FROM documents
          WHERE id = ? AND document_type IN ('clinic_export', 'health_document', 'vet_prep')
          LIMIT 1`,
    args: [documentId]
  });
  const document = result.rows[0] ? rowToObject(result.rows[0]) : null;
  if (!document) return sendJson(res, 404, { ok: false, error: 'document_not_found' });
  return sendJson(res, 200, { ok: true, data: { document } });
}

async function handleSaveMeasurement(req, res) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  const body = await readBody(req);
  if (!body.petId) return sendJson(res, 400, { ok: false, error: 'pet_required' });
  const measurementId = id('measurement');
  await db.execute({
    sql: `INSERT INTO measurements
      (id, pet_id, created_by_user_id, measurement_type, value, unit, measured_at, note, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      measurementId,
      body.petId,
      body.userId || 'user-1',
      body.type || 'other',
      numberFromInput(body.value),
      body.unit || '',
      body.measuredAt || new Date().toISOString(),
      body.note || '',
      JSON.stringify(body.metadata || {})
    ]
  });
  return sendJson(res, 200, { ok: true, id: measurementId });
}

async function handleGetMeasurements(req, res, url) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  const where = [];
  const args = [];
  const petId = url.searchParams.get('petId');
  const type = url.searchParams.get('type');
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 50)));
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
  return sendJson(res, 200, { ok: true, data: { measurements: result.rows.map(rowToObject) } });
}

async function handleReminderStatus(req, res) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  const body = await readBody(req);
  const reminderId = body.reminderId;
  if (!reminderId) return sendJson(res, 400, { ok: false, error: 'reminder_required' });
  let dueAt = null;
  if (Number(body.snoozeDays || 0)) {
    const date = new Date();
    date.setDate(date.getDate() + Number(body.snoozeDays || 0));
    dueAt = date.toISOString();
  }
  if (dueAt) {
    await db.execute({
      sql: `UPDATE reminders SET status = ?, due_at = ?, updated_at = ? WHERE id = ?`,
      args: [body.status || 'scheduled', dueAt, new Date().toISOString(), reminderId]
    });
  } else {
    await db.execute({
      sql: `UPDATE reminders SET status = ?, updated_at = ? WHERE id = ?`,
      args: [body.status || 'scheduled', new Date().toISOString(), reminderId]
    });
  }
  return sendJson(res, 200, { ok: true });
}

async function ensureVetLiveSchema(db) {
  await ensureAuthSchema(db);
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS vet_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      display_name TEXT NOT NULL,
      license_no TEXT,
      specialties TEXT NOT NULL DEFAULT '[]',
      bio TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      is_active INTEGER NOT NULL DEFAULT 1,
      rating_avg REAL NOT NULL DEFAULT 0,
      rating_count INTEGER NOT NULL DEFAULT 0,
      commission_rate INTEGER NOT NULL DEFAULT 0,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )`,
    args: []
  });
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS vet_availability (
      id TEXT PRIMARY KEY,
      vet_id TEXT NOT NULL,
      weekday INTEGER NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )`,
    args: []
  });
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS vet_consultation_bookings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pet_id TEXT NOT NULL,
      vet_id TEXT,
      ai_session_id TEXT,
      report_id TEXT,
      status TEXT NOT NULL DEFAULT 'requested',
      scheduled_at TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 15,
      price_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'TRY',
      payment_id TEXT,
      credit_hold_id TEXT,
      daily_room_name TEXT,
      daily_room_url TEXT,
      joined_owner_at TEXT,
      joined_vet_at TEXT,
      case_summary TEXT,
      red_flags TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )`,
    args: []
  });
  await executeOptional(db, `ALTER TABLE vet_profiles ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`);
  await executeOptional(db, `ALTER TABLE vet_profiles ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0`);
  await executeOptional(db, `ALTER TABLE vet_consultation_bookings ADD COLUMN credit_hold_id TEXT`);
  await executeOptional(db, `ALTER TABLE vet_consultation_bookings ADD COLUMN joined_owner_at TEXT`);
  await executeOptional(db, `ALTER TABLE vet_consultation_bookings ADD COLUMN joined_vet_at TEXT`);
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS vet_credit_holds (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL UNIQUE,
      wallet_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'held',
      hold_transaction_id TEXT,
      capture_transaction_id TEXT,
      release_transaction_id TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )`,
    args: []
  });
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS vet_consultation_notes (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      vet_id TEXT,
      summary TEXT NOT NULL,
      urgency_level TEXT NOT NULL DEFAULT 'routine',
      next_step TEXT,
      followup_at TEXT,
      clinic_visit_recommended INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )`,
    args: []
  });
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS vet_consultation_surveys (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      reviewer_role TEXT NOT NULL,
      reviewer_user_id TEXT,
      reviewed_user_id TEXT,
      vet_id TEXT,
      rating INTEGER NOT NULL,
      feedback TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      UNIQUE(booking_id, reviewer_role)
    )`,
    args: []
  });
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS vet_consultation_events (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    )`,
    args: []
  });
  await db.batch([
    `CREATE INDEX IF NOT EXISTS idx_vet_profiles_status ON vet_profiles(status)`,
    `CREATE INDEX IF NOT EXISTS idx_vet_availability_vet ON vet_availability(vet_id, is_active)`,
    `DELETE FROM vet_availability WHERE id LIKE 'vet-slot-vet-demo-%'`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_vet_availability_unique_slot ON vet_availability(vet_id, weekday, starts_at, ends_at)`,
    `CREATE INDEX IF NOT EXISTS idx_vet_bookings_user ON vet_consultation_bookings(user_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_vet_bookings_pet ON vet_consultation_bookings(pet_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_vet_bookings_vet ON vet_consultation_bookings(vet_id, scheduled_at)`,
    `CREATE INDEX IF NOT EXISTS idx_vet_credit_holds_status ON vet_credit_holds(status, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_vet_notes_booking ON vet_consultation_notes(booking_id)`,
    `CREATE INDEX IF NOT EXISTS idx_vet_surveys_booking ON vet_consultation_surveys(booking_id, reviewer_role)`,
    `CREATE INDEX IF NOT EXISTS idx_vet_surveys_vet ON vet_consultation_surveys(vet_id, reviewer_role)`,
    `CREATE INDEX IF NOT EXISTS idx_vet_events_booking ON vet_consultation_events(booking_id, created_at)`
  ].map(sql => ({ sql, args: [] })));
  await seedVetLive(db);
}

async function seedVetLive(db) {
  const now = new Date().toISOString();
  await db.batch([
    {
      sql: `INSERT INTO users (id, email, display_name, password_hash, locale, status, metadata, created_at, updated_at)
            VALUES ('user-vet-1', 'vet1@vet.com', 'Dr. Deniz Kara', ?, 'tr', 'active', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET email = COALESCE(users.email, excluded.email), display_name = COALESCE(users.display_name, excluded.display_name), password_hash = COALESCE(users.password_hash, excluded.password_hash), status = 'active', updated_at = excluded.updated_at`,
      args: [hashPassword('vet123'), JSON.stringify({ authProvider: 'email_password', scope: 'vet_live_seed' }), now, now]
    },
    {
      sql: `INSERT INTO users (id, email, display_name, password_hash, locale, status, metadata, created_at, updated_at)
            VALUES ('user-vet-2', 'vet2@vet.com', 'Dr. Ece Arslan', ?, 'tr', 'active', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET email = COALESCE(users.email, excluded.email), display_name = COALESCE(users.display_name, excluded.display_name), password_hash = COALESCE(users.password_hash, excluded.password_hash), status = 'active', updated_at = excluded.updated_at`,
      args: [hashPassword('vet456'), JSON.stringify({ authProvider: 'email_password', scope: 'vet_live_seed' }), now, now]
    },
    { sql: `INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES ('user-vet-1', 'role-vet-live')`, args: [] },
    { sql: `INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES ('user-vet-2', 'role-vet-live')`, args: [] },
    {
      sql: `INSERT INTO vet_profiles
        (id, user_id, display_name, license_no, specialties, bio, status, is_active, rating_avg, rating_count, commission_rate, metadata, created_at, updated_at)
        VALUES ('vet-demo-1', 'user-vet-1', 'Dr. Deniz Kara', 'VET-TEST-001', ?, 'Canli gorusme pilot akislari icin test veterineri.', 'approved', 1, 4.8, 0, 0, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, status = 'approved', updated_at = excluded.updated_at`,
      args: [JSON.stringify(['genel danisma', 'kedi/kopek', 'acil on degerlendirme']), JSON.stringify({ source: 'seed', scope: 'vet_live_mvp' }), now, now]
    },
    {
      sql: `INSERT INTO vet_profiles
        (id, user_id, display_name, license_no, specialties, bio, status, is_active, rating_avg, rating_count, commission_rate, metadata, created_at, updated_at)
        VALUES ('vet-demo-2', 'user-vet-2', 'Dr. Ece Arslan', 'VET-TEST-002', ?, 'Canli gorusme pilot akislari icin ikinci test veterineri.', 'approved', 1, 4.7, 0, 0, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, status = 'approved', updated_at = excluded.updated_at`,
      args: [JSON.stringify(['beslenme', 'davranis', 'genel danisma']), JSON.stringify({ source: 'seed', scope: 'vet_live_mvp' }), now, now]
    }
  ]);
  for (const vet of [
    ['vet-demo-1', '1', '10:00', '18:00'],
    ['vet-demo-2', '2', '12:00', '20:00']
  ]) {
    for (const day of [1, 2, 3, 4, 5]) {
      await db.execute({
        sql: `INSERT INTO vet_availability (id, vet_id, weekday, starts_at, ends_at, timezone, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, 'Europe/Istanbul', 1, ?, ?)
              ON CONFLICT(id) DO UPDATE SET starts_at = excluded.starts_at, ends_at = excluded.ends_at, is_active = 1, updated_at = excluded.updated_at`,
        args: [`vet-slot-${vet[1]}-${['sun', 'mon', 'tue', 'wed', 'thu', 'fri'][day]}`, vet[0], day, vet[2], vet[3], now, now]
      });
    }
  }
  await grantTestCredits(db, ['5336565251', '+905336565251'], 100, now);
}

function normalizeVet(row = {}) {
  return {
    ...rowToObject(row),
    specialties: parseJson(row.specialties, []),
    metadata: parseJson(row.metadata, {})
  };
}

function normalizeVetBooking(row = {}, noteRows = [], surveyRows = []) {
  return {
    ...rowToObject(row),
    red_flags: parseJson(row.red_flags, []),
    metadata: parseJson(row.metadata, {}),
    notes: noteRows.map((note) => ({
      ...rowToObject(note),
      clinic_visit_recommended: Boolean(note.clinic_visit_recommended)
    })),
    surveys: surveyRows.map((survey) => ({
      ...rowToObject(survey),
      tags: parseJson(survey.tags, []),
      metadata: parseJson(survey.metadata, {})
    }))
  };
}

async function holdVetLiveCredits(db, { bookingId, userId, amount, createdAt }) {
  const creditAmount = Math.max(1, Number(amount || process.env.VET_LIVE_PRICE_CREDITS || 8));
  const wallet = await ensureInitialWallet(db, userId, createdAt);
  const balance = Number(wallet.balance || 0);
  if (balance < creditAmount) {
    const error = new Error('insufficient_credits');
    error.required = creditAmount;
    error.remaining = balance;
    throw error;
  }
  const holdId = id('vet-hold');
  const transactionId = id('credit');
  await db.batch([
    {
      sql: `UPDATE credit_wallets SET balance = ?, updated_at = ? WHERE user_id = ?`,
      args: [balance - creditAmount, createdAt, userId]
    },
    {
      sql: `INSERT INTO credit_transactions
        (id, wallet_id, user_id, amount, direction, reason, related_entity_type, related_entity_id, metadata, created_at)
        VALUES (?, ?, ?, ?, 'out', 'vet_live_hold', 'vet_consultation_booking', ?, ?, ?)`,
      args: [transactionId, wallet.id, userId, creditAmount, bookingId, JSON.stringify({ holdId }), createdAt]
    },
    {
      sql: `INSERT INTO vet_credit_holds
        (id, booking_id, wallet_id, user_id, amount, status, hold_transaction_id, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'held', ?, ?, ?, ?)`,
      args: [holdId, bookingId, wallet.id, userId, creditAmount, transactionId, JSON.stringify({ mode: 'pre_consultation_hold' }), createdAt, createdAt]
    }
  ]);
  return { holdId, amount: creditAmount };
}

async function captureVetLiveHold(db, bookingId, createdAt = new Date().toISOString()) {
  const hold = (await db.execute({
    sql: `SELECT * FROM vet_credit_holds WHERE booking_id = ? LIMIT 1`,
    args: [bookingId]
  })).rows[0];
  if (!hold || hold.status === 'captured') return hold;
  if (hold.status !== 'held') throw new Error('vet_hold_not_held');
  const transactionId = id('credit');
  await db.batch([
    {
      sql: `INSERT INTO credit_transactions
        (id, wallet_id, user_id, amount, direction, reason, related_entity_type, related_entity_id, metadata, created_at)
        VALUES (?, ?, ?, ?, 'out', 'vet_live_consultation', 'vet_consultation_booking', ?, ?, ?)`,
      args: [transactionId, hold.wallet_id, hold.user_id, 0, bookingId, JSON.stringify({ holdId: hold.id, capturedAmount: hold.amount }), createdAt]
    },
    {
      sql: `UPDATE vet_credit_holds SET status = 'captured', capture_transaction_id = ?, updated_at = ? WHERE id = ?`,
      args: [transactionId, createdAt, hold.id]
    }
  ]);
  return { ...hold, status: 'captured', capture_transaction_id: transactionId };
}

async function releaseVetLiveHold(db, bookingId, createdAt = new Date().toISOString()) {
  const hold = (await db.execute({
    sql: `SELECT * FROM vet_credit_holds WHERE booking_id = ? LIMIT 1`,
    args: [bookingId]
  })).rows[0];
  if (!hold || hold.status === 'released') return hold;
  if (hold.status !== 'held') throw new Error('vet_hold_not_held');
  const transactionId = id('credit');
  const wallet = await ensureInitialWallet(db, hold.user_id, createdAt);
  const nextBalance = Number(wallet.balance || 0) + Number(hold.amount || 0);
  await db.batch([
    {
      sql: `UPDATE credit_wallets SET balance = ?, updated_at = ? WHERE user_id = ?`,
      args: [nextBalance, createdAt, hold.user_id]
    },
    {
      sql: `INSERT INTO credit_transactions
        (id, wallet_id, user_id, amount, direction, reason, related_entity_type, related_entity_id, metadata, created_at)
        VALUES (?, ?, ?, ?, 'in', 'vet_live_hold_release', 'vet_consultation_booking', ?, ?, ?)`,
      args: [transactionId, hold.wallet_id, hold.user_id, hold.amount, bookingId, JSON.stringify({ holdId: hold.id }), createdAt]
    },
    {
      sql: `UPDATE vet_credit_holds SET status = 'released', release_transaction_id = ?, updated_at = ? WHERE id = ?`,
      args: [transactionId, createdAt, hold.id]
    }
  ]);
  return { ...hold, status: 'released', release_transaction_id: transactionId };
}

async function refreshVetRating(db, vetId) {
  if (!vetId) return;
  const stats = (await db.execute({
    sql: `SELECT AVG(rating) AS avg_rating, COUNT(*) AS rating_count
          FROM vet_consultation_surveys
          WHERE vet_id = ? AND reviewer_role = 'owner'`,
    args: [vetId]
  })).rows[0] || {};
  await db.execute({
    sql: `UPDATE vet_profiles SET rating_avg = ?, rating_count = ?, updated_at = ? WHERE id = ?`,
    args: [Number(stats.avg_rating || 0), Number(stats.rating_count || 0), new Date().toISOString(), vetId]
  });
}

async function dailyRoomForBooking(booking) {
  const roomName = booking.daily_room_name || `pethelp-${booking.id}`;
  const dailyDomain = String(process.env.DAILY_DOMAIN || 'pethelp.daily.co').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const fallbackUrl = booking.daily_room_url || `https://${dailyDomain}/${roomName}`;
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) return { roomName, roomUrl: fallbackUrl, provider: 'local_mock' };
  try {
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: {
          enable_prejoin_ui: true,
          enable_network_ui: true,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2
        }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `daily_${response.status}`);
    return { roomName: data.name || roomName, roomUrl: data.url || fallbackUrl, provider: 'daily' };
  } catch {
    return { roomName, roomUrl: fallbackUrl, provider: 'local_mock' };
  }
}

async function dailyJoinToken(booking, role = 'owner') {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey || !booking.daily_room_name) {
    return { token: `local-${booking.id}-${role}`, provider: 'local_mock' };
  }
  try {
    const response = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        properties: {
          room_name: booking.daily_room_name,
          is_owner: role === 'vet',
          user_name: role === 'vet' ? 'Veteriner' : 'Pet sahibi',
          exp: Math.floor(Date.now() / 1000) + 60 * 60
        }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `daily_token_${response.status}`);
    return { token: data.token, provider: 'daily' };
  } catch {
    return { token: `local-${booking.id}-${role}`, provider: 'local_mock' };
  }
}

async function getVetBooking(db, bookingId) {
  const booking = (await db.execute({
    sql: `SELECT b.*, v.display_name AS vet_name, h.status AS credit_hold_status, h.amount AS credit_hold_amount
          FROM vet_consultation_bookings b
          LEFT JOIN vet_profiles v ON v.id = b.vet_id
          LEFT JOIN vet_credit_holds h ON h.booking_id = b.id
          WHERE b.id = ?
          LIMIT 1`,
    args: [bookingId]
  })).rows[0];
  if (!booking) return null;
  const notes = await db.execute({
    sql: `SELECT * FROM vet_consultation_notes WHERE booking_id = ? ORDER BY created_at DESC`,
    args: [bookingId]
  });
  const surveys = await db.execute({
    sql: `SELECT * FROM vet_consultation_surveys WHERE booking_id = ? ORDER BY created_at DESC`,
    args: [bookingId]
  }).catch(() => ({ rows: [] }));
  return normalizeVetBooking(booking, notes.rows, surveys.rows);
}

async function listVetBookings(db, url) {
  const userId = url.searchParams.get('userId') || '';
  const petId = url.searchParams.get('petId') || '';
  const vetId = url.searchParams.get('vetId') || '';
  const includePool = url.searchParams.get('includePool') === '1';
  const where = [];
  const args = [];
  if (userId) {
    where.push('b.user_id = ?');
    args.push(userId);
  }
  if (petId) {
    where.push('b.pet_id = ?');
    args.push(petId);
  }
  if (vetId) {
    where.push(includePool ? '(b.vet_id = ? OR b.vet_id IS NULL)' : 'b.vet_id = ?');
    args.push(vetId);
  }
  args.push(Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 30))));
  const result = await db.execute({
    sql: `SELECT b.*, v.display_name AS vet_name, h.status AS credit_hold_status, h.amount AS credit_hold_amount
          FROM vet_consultation_bookings b
          LEFT JOIN vet_profiles v ON v.id = b.vet_id
          LEFT JOIN vet_credit_holds h ON h.booking_id = b.id
          ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
          ORDER BY COALESCE(b.scheduled_at, b.created_at) DESC
          LIMIT ?`,
    args
  });
  return result.rows.map((row) => normalizeVetBooking(row));
}

async function getVetProfileForPanel(db, { vetId = '', userId = '' } = {}) {
  const where = [];
  const args = [];
  if (vetId) {
    where.push('v.id = ?');
    args.push(vetId);
  }
  if (userId) {
    where.push('v.user_id = ?');
    args.push(userId);
  }
  if (!where.length) return null;
  const result = await db.execute({
    sql: `SELECT v.*, u.email, u.phone, u.display_name AS user_display_name, u.timezone, u.locale
          FROM vet_profiles v
          LEFT JOIN users u ON u.id = v.user_id
          WHERE ${where.join(' OR ')}
          LIMIT 1`,
    args
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...normalizeVet(row),
    email: row.email || '',
    phone: row.phone || '',
    timezone: row.timezone || 'Europe/Istanbul',
    locale: row.locale || 'tr'
  };
}

function specialtyListFromInput(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8);
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean).slice(0, 8);
}

async function handleVetLiveRequest(req, res, url) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  await ensureVetLiveSchema(db);
  const pathName = url.pathname;

  if (req.method === 'GET' && pathName === '/api/vet-live/vets') {
    const vets = await db.execute({
      sql: `SELECT * FROM vet_profiles WHERE status = 'approved' AND is_active = 1 ORDER BY rating_avg DESC, display_name ASC`,
      args: []
    });
    const availability = await db.execute({
      sql: `SELECT * FROM vet_availability WHERE is_active = 1 ORDER BY weekday ASC, starts_at ASC`,
      args: []
    });
    return sendJson(res, 200, {
      ok: true,
      data: {
        vets: vets.rows.map(normalizeVet),
        availability: availability.rows.map(rowToObject)
      }
    });
  }

  if (req.method === 'POST' && pathName === '/api/vet-live/quote') {
    const body = await readBody(req);
    return sendJson(res, 200, {
      ok: true,
      data: {
        durationMinutes: Number(body.durationMinutes || 15),
        priceCents: Number(process.env.VET_LIVE_PRICE_CREDITS || 8),
        currency: 'credit',
        provider: process.env.DAILY_API_KEY ? 'daily' : 'local_mock'
      }
    });
  }

  if (req.method === 'GET' && pathName === '/api/vet-live/profile') {
    const profile = await getVetProfileForPanel(db, {
      vetId: url.searchParams.get('vetId') || '',
      userId: url.searchParams.get('userId') || ''
    });
    if (!profile) return sendJson(res, 404, { ok: false, error: 'vet_profile_not_found' });
    return sendJson(res, 200, { ok: true, data: { profile } });
  }

  if (req.method === 'POST' && pathName === '/api/vet-live/profile') {
    const body = await readBody(req);
    const current = await getVetProfileForPanel(db, {
      vetId: String(body.vetId || '').trim(),
      userId: String(body.userId || '').trim()
    });
    if (!current) return sendJson(res, 404, { ok: false, error: 'vet_profile_not_found' });
    const now = new Date().toISOString();
    const displayName = String(body.displayName || body.display_name || current.display_name || '').trim();
    if (!displayName) return sendJson(res, 400, { ok: false, error: 'display_name_required' });
    const specialties = specialtyListFromInput(body.specialties);
    await db.execute({
      sql: `UPDATE vet_profiles
            SET display_name = ?,
                license_no = ?,
                specialties = ?,
                bio = ?,
                is_active = ?,
                updated_at = ?
            WHERE id = ?`,
      args: [
        displayName,
        String(body.licenseNo || body.license_no || '').trim(),
        JSON.stringify(specialties),
        String(body.bio || '').trim(),
        body.isActive === false || body.isActive === 0 || body.isActive === '0' ? 0 : 1,
        now,
        current.id
      ]
    });
    if (current.user_id) {
      await db.execute({
        sql: `UPDATE users
              SET display_name = ?,
                  email = ?,
                  phone = ?,
                  timezone = ?,
                  updated_at = ?
              WHERE id = ?`,
        args: [
          displayName,
          String(body.email || current.email || '').trim() || null,
          normalizePhone(body.phone || current.phone || '') || null,
          String(body.timezone || current.timezone || 'Europe/Istanbul').trim(),
          now,
          current.user_id
        ]
      });
    }
    return sendJson(res, 200, { ok: true, data: { profile: await getVetProfileForPanel(db, { vetId: current.id }) } });
  }

  if (req.method === 'POST' && pathName === '/api/vet-live/profile/password') {
    const body = await readBody(req);
    const current = await getVetProfileForPanel(db, {
      vetId: String(body.vetId || '').trim(),
      userId: String(body.userId || '').trim()
    });
    if (!current?.user_id) return sendJson(res, 404, { ok: false, error: 'vet_profile_not_found' });
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    if (newPassword.length < 4) return sendJson(res, 400, { ok: false, error: 'password_too_short' });
    const user = (await db.execute({
      sql: `SELECT password_hash FROM users WHERE id = ? LIMIT 1`,
      args: [current.user_id]
    })).rows[0];
    if (!user?.password_hash || !verifyPassword(currentPassword, user.password_hash)) {
      return sendJson(res, 401, { ok: false, error: 'current_password_invalid' });
    }
    await db.execute({
      sql: `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
      args: [hashPassword(newPassword), new Date().toISOString(), current.user_id]
    });
    return sendJson(res, 200, { ok: true, data: { changed: true } });
  }

  if (req.method === 'GET' && pathName === '/api/vet-live/bookings') {
    return sendJson(res, 200, { ok: true, data: { bookings: await listVetBookings(db, url) } });
  }

  if (req.method === 'POST' && pathName === '/api/vet-live/bookings') {
    const body = await readBody(req);
    if (!body.userId) return sendJson(res, 400, { ok: false, error: 'user_required' });
    if (!body.petId) return sendJson(res, 400, { ok: false, error: 'pet_required' });
    const legalConsentAccepted = body.legalConsentAccepted === true || body.legalConsentAccepted === 'true';
    if (!legalConsentAccepted) return sendJson(res, 400, { ok: false, error: 'legal_consent_required' });
    const requestedVetId = String(body.vetId || '').trim();
    const selectedVet = requestedVetId ? (await db.execute({
      sql: `SELECT id FROM vet_profiles WHERE id = ? AND status = 'approved' AND is_active = 1 LIMIT 1`,
      args: [requestedVetId]
    })).rows[0] : null;
    const vetId = selectedVet?.id || null;
    const quote = {
      durationMinutes: Math.max(10, Math.min(60, Number(body.durationMinutes || 15))),
      priceCents: Number(body.priceCents || process.env.VET_LIVE_PRICE_CREDITS || 8),
      currency: body.currency || 'credit'
    };
    const bookingId = id('vet-booking');
    const now = new Date().toISOString();
    const wallet = await ensureInitialWallet(db, body.userId, now);
    if (Number(wallet.balance || 0) < quote.priceCents) {
      return sendJson(res, 402, { ok: false, error: 'insufficient_credits', required: quote.priceCents, remaining: Number(wallet.balance || 0) });
    }
    await db.execute({
      sql: `INSERT INTO vet_consultation_bookings
        (id, user_id, pet_id, vet_id, ai_session_id, report_id, status, scheduled_at, duration_minutes, price_cents, currency, case_summary, red_flags, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        bookingId,
        body.userId,
        body.petId,
        vetId,
        body.aiSessionId || null,
        body.reportId || null,
        vetId ? 'credit_held' : 'requested',
        isoOrNow(body.scheduledAt || now),
        quote.durationMinutes,
        quote.priceCents,
        quote.currency,
        String(body.caseSummary || '').trim(),
        JSON.stringify(Array.isArray(body.redFlags) ? body.redFlags : []),
        JSON.stringify({
          source: 'vet_live',
          paymentMode: 'credit_hold',
          vetAssignment: vetId ? 'selected' : 'pool',
          legalConsentAccepted: true,
          legalConsentAcceptedAt: now,
          legalTextVersion: 'vet_live_v1'
        }),
        now,
        now
      ]
    });
    const hold = await holdVetLiveCredits(db, { bookingId, userId: body.userId, amount: quote.priceCents, createdAt: now });
    await db.execute({
      sql: `UPDATE vet_consultation_bookings SET credit_hold_id = ?, updated_at = ? WHERE id = ?`,
      args: [hold.holdId, now, bookingId]
    });
    await db.execute({
      sql: `INSERT INTO vet_consultation_events (id, booking_id, type, payload_json, created_at)
            VALUES (?, ?, 'booking_created', ?, ?)`,
      args: [id('vet-event'), bookingId, JSON.stringify({ status: vetId ? 'credit_held' : 'requested', holdId: hold.holdId }), now]
    });
    return sendJson(res, 200, { ok: true, data: { booking: await getVetBooking(db, bookingId) } });
  }

  const bookingMatch = pathName.match(/^\/api\/vet-live\/bookings\/([^/]+)(?:\/([^/]+))?$/);
  if (bookingMatch) {
    const bookingId = decodeURIComponent(bookingMatch[1]);
    const action = bookingMatch[2] || '';
    const booking = await getVetBooking(db, bookingId);
    if (!booking) return sendJson(res, 404, { ok: false, error: 'vet_booking_not_found' });

    if (req.method === 'GET' && !action) {
      return sendJson(res, 200, { ok: true, data: { booking } });
    }

    if (req.method === 'POST' && action === 'pay') {
      return sendJson(res, 409, { ok: false, error: 'payment_replaced_by_credit_hold' });
    }

    if (req.method === 'POST' && action === 'claim') {
      const body = await readBody(req);
      const vetProfileId = String(body.vetId || '').trim();
      if (!vetProfileId) return sendJson(res, 400, { ok: false, error: 'vet_required' });
      if (['completed', 'cancelled', 'refunded'].includes(booking.status)) {
        return sendJson(res, 409, { ok: false, error: 'booking_not_claimable' });
      }
      if (booking.vet_id && booking.vet_id !== vetProfileId) {
        return sendJson(res, 409, { ok: false, error: 'booking_already_assigned' });
      }
      const vet = (await db.execute({
        sql: `SELECT id FROM vet_profiles WHERE id = ? AND status = 'approved' AND is_active = 1 LIMIT 1`,
        args: [vetProfileId]
      })).rows[0];
      if (!vet) return sendJson(res, 404, { ok: false, error: 'vet_not_available' });
      const now = new Date().toISOString();
      await db.execute({
        sql: `UPDATE vet_consultation_bookings
              SET vet_id = COALESCE(vet_id, ?),
                  status = CASE WHEN status = 'requested' THEN 'credit_held' ELSE status END,
                  updated_at = ?
              WHERE id = ?`,
        args: [vetProfileId, now, bookingId]
      });
      await db.execute({
        sql: `INSERT INTO vet_consultation_events (id, booking_id, type, payload_json, created_at)
              VALUES (?, ?, 'booking_claimed', ?, ?)`,
        args: [id('vet-event'), bookingId, JSON.stringify({ vetId: vetProfileId }), now]
      });
      return sendJson(res, 200, { ok: true, data: { booking: await getVetBooking(db, bookingId) } });
    }

    if (req.method === 'POST' && action === 'join-token') {
      const body = await readBody(req);
      const now = new Date().toISOString();
      const room = await dailyRoomForBooking(booking);
      const role = body.role || 'owner';
      const vetProfileId = role === 'vet' ? String(body.vetId || '').trim() : '';
      if (role === 'vet') {
        if (!vetProfileId) return sendJson(res, 400, { ok: false, error: 'vet_required' });
        if (booking.vet_id && booking.vet_id !== vetProfileId) {
          return sendJson(res, 403, { ok: false, error: 'booking_assigned_to_another_vet' });
        }
        const vet = (await db.execute({
          sql: `SELECT id FROM vet_profiles WHERE id = ? AND status = 'approved' AND is_active = 1 LIMIT 1`,
          args: [vetProfileId]
        })).rows[0];
        if (!vet) return sendJson(res, 404, { ok: false, error: 'vet_not_available' });
      }
      await db.execute({
        sql: `UPDATE vet_consultation_bookings
              SET status = CASE WHEN status IN ('completed', 'cancelled', 'refunded') THEN status ELSE 'live' END,
                  daily_room_name = ?,
                  daily_room_url = ?,
                  joined_owner_at = CASE WHEN ? = 'owner' AND joined_owner_at IS NULL THEN ? ELSE joined_owner_at END,
                  joined_vet_at = CASE WHEN ? = 'vet' AND joined_vet_at IS NULL THEN ? ELSE joined_vet_at END,
                  vet_id = CASE WHEN ? = 'vet' AND vet_id IS NULL AND ? <> '' THEN ? ELSE vet_id END,
                  updated_at = ?
              WHERE id = ?`,
        args: [room.roomName, room.roomUrl, role, now, role, now, role, vetProfileId, vetProfileId, now, bookingId]
      });
      const updated = await getVetBooking(db, bookingId);
      const holdCaptured = Boolean(updated?.joined_owner_at && updated?.joined_vet_at);
      if (holdCaptured) await captureVetLiveHold(db, bookingId, now);
      await db.execute({
        sql: `INSERT INTO vet_consultation_events (id, booking_id, type, payload_json, created_at)
              VALUES (?, ?, 'join_token_requested', ?, ?)`,
        args: [id('vet-event'), bookingId, JSON.stringify({ role, provider: room.provider, holdCaptured }), now]
      });
      const token = await dailyJoinToken({ ...booking, daily_room_name: room.roomName }, role);
      return sendJson(res, 200, { ok: true, data: { roomUrl: room.roomUrl, roomName: room.roomName, token: token.token, provider: token.provider } });
    }

    if (req.method === 'POST' && action === 'cancel') {
      if (booking.status === 'completed' || (booking.joined_owner_at && booking.joined_vet_at)) {
        return sendJson(res, 409, { ok: false, error: 'booking_already_started' });
      }
      const now = new Date().toISOString();
      await releaseVetLiveHold(db, bookingId, now);
      await db.execute({
        sql: `UPDATE vet_consultation_bookings SET status = 'refunded', updated_at = ? WHERE id = ?`,
        args: [now, bookingId]
      });
      await db.execute({
        sql: `INSERT INTO vet_consultation_events (id, booking_id, type, payload_json, created_at)
              VALUES (?, ?, 'booking_cancelled_refunded', ?, ?)`,
        args: [id('vet-event'), bookingId, JSON.stringify({ reason: 'cancelled_before_completion' }), now]
      });
      return sendJson(res, 200, { ok: true, data: { booking: await getVetBooking(db, bookingId) } });
    }

    if (req.method === 'POST' && action === 'notes') {
      const body = await readBody(req);
      if (!String(body.summary || '').trim()) return sendJson(res, 400, { ok: false, error: 'summary_required' });
      const now = new Date().toISOString();
      const noteId = id('vet-note');
      const noteVetId = String(body.vetId || booking.vet_id || '').trim();
      if (!noteVetId) return sendJson(res, 400, { ok: false, error: 'vet_required' });
      if (booking.vet_id && booking.vet_id !== noteVetId) {
        return sendJson(res, 403, { ok: false, error: 'booking_assigned_to_another_vet' });
      }
      const vet = (await db.execute({
        sql: `SELECT id FROM vet_profiles WHERE id = ? AND status = 'approved' AND is_active = 1 LIMIT 1`,
        args: [noteVetId]
      })).rows[0];
      if (!vet) return sendJson(res, 404, { ok: false, error: 'vet_not_available' });
      await db.execute({
        sql: `INSERT INTO vet_consultation_notes
          (id, booking_id, vet_id, summary, urgency_level, next_step, followup_at, clinic_visit_recommended, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          noteId,
          bookingId,
          noteVetId,
          String(body.summary || '').trim(),
          body.urgencyLevel || 'routine',
          String(body.nextStep || '').trim(),
          isoOrNull(body.followupAt),
          body.clinicVisitRecommended ? 1 : 0,
          now,
          now
        ]
      });
      await captureVetLiveHold(db, bookingId, now);
      await db.execute({
        sql: `UPDATE vet_consultation_bookings
              SET status = 'completed',
                  vet_id = COALESCE(vet_id, ?),
                  updated_at = ?
              WHERE id = ?`,
        args: [noteVetId, now, bookingId]
      });
      await db.execute({
        sql: `INSERT INTO health_records
          (id, pet_id, created_by_user_id, record_type, title, occurred_at, summary, payload, source, created_at, updated_at)
          VALUES (?, ?, ?, 'vet_consultation', ?, ?, ?, ?, 'vet_live', ?, ?)`,
        args: [
          id('health'),
          booking.pet_id,
          booking.user_id,
          'Veteriner canli gorusme notu',
          now,
          String(body.summary || '').trim(),
          JSON.stringify({ vet_booking_id: bookingId, urgency_level: body.urgencyLevel || 'routine', next_step: body.nextStep || '' }),
          now,
          now
        ]
      }).catch(() => {});
      await db.execute({
        sql: `INSERT INTO vet_consultation_events (id, booking_id, type, payload_json, created_at)
              VALUES (?, ?, 'note_created', ?, ?)`,
        args: [id('vet-event'), bookingId, JSON.stringify({ noteId, holdCaptured: true }), now]
      });
      return sendJson(res, 200, { ok: true, data: { booking: await getVetBooking(db, bookingId) } });
    }

    if (req.method === 'POST' && action === 'survey') {
      if (booking.status !== 'completed') return sendJson(res, 409, { ok: false, error: 'booking_not_completed' });
      const body = await readBody(req);
      const role = body.role === 'vet' ? 'vet' : 'owner';
      const rating = Math.max(1, Math.min(5, Math.trunc(Number(body.rating || 0))));
      if (!rating) return sendJson(res, 400, { ok: false, error: 'rating_required' });
      const now = new Date().toISOString();
      const reviewerUserId = role === 'owner' ? booking.user_id : String(body.userId || '').trim() || null;
      const reviewedUserId = role === 'vet' ? booking.user_id : null;
      const vetId = booking.vet_id || String(body.vetId || '').trim() || null;
      await db.execute({
        sql: `INSERT INTO vet_consultation_surveys
          (id, booking_id, reviewer_role, reviewer_user_id, reviewed_user_id, vet_id, rating, feedback, tags, metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(booking_id, reviewer_role) DO UPDATE SET
            reviewer_user_id = excluded.reviewer_user_id,
            reviewed_user_id = excluded.reviewed_user_id,
            vet_id = excluded.vet_id,
            rating = excluded.rating,
            feedback = excluded.feedback,
            tags = excluded.tags,
            metadata = excluded.metadata,
            updated_at = excluded.updated_at`,
        args: [
          id('vet-survey'),
          bookingId,
          role,
          reviewerUserId,
          reviewedUserId,
          vetId,
          rating,
          String(body.feedback || '').trim(),
          JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
          JSON.stringify({ source: 'vet_live_after_call' }),
          now,
          now
        ]
      });
      if (role === 'owner' && vetId) await refreshVetRating(db, vetId);
      await db.execute({
        sql: `INSERT INTO vet_consultation_events (id, booking_id, type, payload_json, created_at)
              VALUES (?, ?, 'survey_saved', ?, ?)`,
        args: [id('vet-event'), bookingId, JSON.stringify({ role, rating }), now]
      });
      return sendJson(res, 200, { ok: true, data: { booking: await getVetBooking(db, bookingId) } });
    }
  }

  if (req.method === 'POST' && (pathName === '/api/vet-live/webhooks/daily' || pathName === '/api/vet-live/webhooks/payment')) {
    const body = await readBody(req);
    const now = new Date().toISOString();
    await db.execute({
      sql: `INSERT INTO vet_consultation_events (id, booking_id, type, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        id('vet-event'),
        body.bookingId || body.booking_id || null,
        pathName.endsWith('/daily') ? 'daily_webhook' : 'payment_webhook',
        JSON.stringify(body),
        now
      ]
    });
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { ok: false, error: 'not_found' });
}

async function handleDocumentOcr(req, res) {
  const body = await readBody(req);
  if (!body.fileBase64) return sendJson(res, 400, codedError('missing_file'));
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  const userId = body.userId || 'user-1';
  const petId = body.petId || null;
  const availability = await featureAvailability(db, { userId, featureCode: 'document-ocr' });
  if (!availability.ok) return sendJson(res, 402, { ok: false, error: 'insufficient_credits', ...availability });
  const { system, prompt } = documentOcrPrompt(body);
  const model = process.env.GEMINI_STANDARD_MODEL || 'gemini-3-flash-preview';
  const startedAt = Date.now();
  const mediaRefs = [
    ...(Array.isArray(body.mediaRefs) ? body.mediaRefs : []),
    {
    fileName: body.fileName || '',
    mimeType: body.mimeType || 'application/octet-stream',
    sizeBytes: Number(body.sizeBytes || 0),
    inlineSha256: createHash('sha256').update(String(body.fileBase64)).digest('hex')
    }
  ];
  const job = await createAiJob({
    userId,
    petId,
    featureCode: 'document-ocr',
    status: 'running',
    creditCost: availability.cost,
    inputPayload: {
      model,
      systemPrompt: system,
      userPrompt: prompt,
      mediaRefs,
      request: {
        documentKind: body.documentKind || '',
        readGoal: body.readGoal || '',
        extractionOptions: body.extractionOptions || [],
        note: body.note || ''
      }
    }
  });
  let usage;
  try {
    usage = await recordServerFeatureUsage(db, { userId, petId, featureCode: 'document-ocr', relatedId: job.id || null });
  } catch (error) {
    await completeAiJob(job.id, {
      status: 'failed',
      errorMessage: error.message || 'feature_usage_failed',
      outputPayload: { billingFailed: true, durationMs: Date.now() - startedAt }
    });
    return sendJson(res, error.statusCode || 500, { ok: false, error: error.message || 'feature_usage_failed' });
  }
  const result = await generateGeminiJson({
    system,
    prompt,
    model,
    parts: [{
      inlineData: {
        mimeType: body.mimeType || 'application/octet-stream',
        data: body.fileBase64
      }
    }]
  });
  if (!result.ok) {
    await completeAiJob(job.id, {
      status: 'failed',
      errorMessage: result.reason || 'ai_request_failed',
      outputPayload: { ...result, durationMs: Date.now() - startedAt }
    });
    return sendJson(res, 502, { ...result, error: result.reason || 'ai_request_failed' });
  }
  const normalized = normalizeOcrResult(result.data, body.documentKind);
  await completeAiJob(job.id, {
    status: 'completed',
    outputPayload: { data: normalized, raw: result.data, durationMs: Date.now() - startedAt }
  });
  return sendJson(res, 200, { ok: true, data: normalized, aiJobId: job.id || null, usage: usage.usage });
}

async function handlePackageRisk(req, res) {
  const body = await readBody(req);
  const result = await generateGeminiJson({
    system: 'Sen veteriner yerine geçmeyen, güvenli aciliyet yönlendirmesi yapan bir pet sağlık asistanısın.',
    prompt: body.prompt || '',
    model: process.env.GEMINI_CRITICAL_MODEL || 'gemini-3.5-flash',
    responseSchema: {
      type: 'object',
      properties: {
        level: { type: 'string', enum: ['critical', 'high', 'foreign', 'watch', 'unknown'] },
        headline: { type: 'string' },
        reason: { type: 'string' },
        doNotDo: { type: 'array', items: { type: 'string' } },
        prepare: { type: 'array', items: { type: 'string' } },
        askVet: { type: 'array', items: { type: 'string' } }
      },
      required: ['level', 'headline', 'reason', 'doNotDo', 'prepare', 'askVet']
    }
  });
  if (!result.ok) return sendJson(res, 502, result);
  if (!result.data?.level || !Array.isArray(result.data?.prepare)) {
    return sendJson(res, 502, { ok: false, reason: 'invalid_schema' });
  }
  return sendJson(res, 200, { ok: true, data: sanitizePackageRiskResult(result.data) });
}

function sanitizePackageRiskResult(data) {
  const unsafeHomeAdvice = /bal|şeker|seker|sür|sur|kustur|aktif kömür|aktif komur|ilaç ver|ilac ver|tuzlu su|süt ver|sut ver/i;
  const cleanList = (items, fallback = []) => {
    const list = Array.isArray(items) ? items : [];
    const cleaned = list
      .map(item => String(item || '').trim())
      .filter(Boolean)
      .filter(item => !unsafeHomeAdvice.test(item));
    return cleaned.length ? cleaned.slice(0, 4) : fallback;
  };
  return {
    ...data,
    doNotDo: Array.isArray(data.doNotDo) ? data.doNotDo.slice(0, 3).map(String) : [],
    prepare: cleanList(data.prepare, ['Ambalajı, zaman bilgisini ve yaklaşık miktarı veteriner için hazırla.']),
    askVet: cleanList(data.askVet, [
      'Acil kliniğe doğrudan gelmem gerekiyor mu?',
      'Yolda yalnızca gözlemlemem gereken belirtiler neler?'
    ]).slice(0, 3)
  };
}

async function handlePackageRiskLogged(req, res) {
  const body = await readBody(req);
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  const userId = body.userId || 'user-1';
  const petId = body.petId || null;
  const availability = await featureAvailability(db, { userId, featureCode: 'package-risk' });
  if (!availability.ok) return sendJson(res, 402, { ok: false, error: 'insufficient_credits', ...availability });
  const model = process.env.GEMINI_CRITICAL_MODEL || 'gemini-3.5-flash';
  const system = 'Sen veteriner yerine gecmeyen, guvenli aciliyet yonlendirmesi yapan bir pet saglik asistanisin.';
  const startedAt = Date.now();
  const job = await createAiJob({
    userId,
    petId,
    featureCode: 'package-risk',
    status: 'running',
    creditCost: availability.cost,
    inputPayload: {
      model,
      systemPrompt: system,
      userPrompt: body.prompt || '',
      mediaRefs: Array.isArray(body.mediaRefs) ? body.mediaRefs : [],
      request: body.context || {}
    }
  });
  let usage;
  try {
    usage = await recordServerFeatureUsage(db, { userId, petId, featureCode: 'package-risk', relatedId: job.id || null });
  } catch (error) {
    await completeAiJob(job.id, {
      status: 'failed',
      errorMessage: error.message || 'feature_usage_failed',
      outputPayload: { billingFailed: true, durationMs: Date.now() - startedAt }
    });
    return sendJson(res, error.statusCode || 500, { ok: false, error: error.message || 'feature_usage_failed' });
  }
  const result = await generateGeminiJson({
    system,
    prompt: body.prompt || '',
    model,
    responseSchema: {
      type: 'object',
      properties: {
        level: { type: 'string', enum: ['critical', 'high', 'foreign', 'watch', 'unknown'] },
        headline: { type: 'string' },
        reason: { type: 'string' },
        doNotDo: { type: 'array', items: { type: 'string' } },
        prepare: { type: 'array', items: { type: 'string' } },
        askVet: { type: 'array', items: { type: 'string' } }
      },
      required: ['level', 'headline', 'reason', 'doNotDo', 'prepare', 'askVet']
    }
  });
  if (!result.ok) {
    await completeAiJob(job.id, {
      status: 'failed',
      errorMessage: result.reason || 'ai_request_failed',
      outputPayload: { ...result, durationMs: Date.now() - startedAt }
    });
    return sendJson(res, 502, { ...result, error: result.reason || 'ai_request_failed' });
  }
  if (!result.data?.level || !Array.isArray(result.data?.prepare)) {
    await completeAiJob(job.id, {
      status: 'failed',
      errorMessage: 'invalid_schema',
      outputPayload: { data: result.data || {}, durationMs: Date.now() - startedAt }
    });
    return sendJson(res, 502, codedError('invalid_schema'));
  }
  const sanitized = sanitizePackageRiskResult(result.data);
  await completeAiJob(job.id, {
    status: 'completed',
    outputPayload: { data: sanitized, raw: result.data, durationMs: Date.now() - startedAt }
  });
  return sendJson(res, 200, { ok: true, data: sanitized, aiJobId: job.id || null, usage: usage.usage });
}

function triagePrompt(body = {}) {
  const payload = body.payload || {};
  const mediaRefs = Array.isArray(body.mediaRefs) ? body.mediaRefs : [];
  const system = [
    'Sen veteriner yerine gecmeyen, guvenli pet sagligi on degerlendirme asistanisin.',
    'Tanı koyma, ilac/doz/tıbbi tedavi talimatı verme.',
    'Kullanıcının sikayetini, profil oykusunu, acil belirti yanitlarini, soru cevaplarini ve medya kanitlarini birlikte degerlendir.',
    'Medya petle veya bildirilen sikayetle ilgisizse bunu acikca mediaFindings icinde unrelated olarak belirt.',
    'Fotografta/video karesinde ne gordugunu, goruntu yetersizse neyin yetersiz oldugunu yaz.',
    'Yanit yalnizca gecerli JSON olsun.'
  ].join(' ');
  const prompt = `
Pet:
${JSON.stringify(payload.pet || {}, null, 2)}

Sikayet ve siniflandirma:
${JSON.stringify(payload.complaint || {}, null, 2)}

Profil / saglik oykusu:
${JSON.stringify(payload.history || {}, null, 2)}

Acil belirti yanitlari:
${JSON.stringify(payload.redFlags || [], null, 2)}

Soru cevaplari:
${JSON.stringify(payload.answers || [], null, 2)}

Gorevler / kanit ozeti:
${JSON.stringify(payload.tasks || [], null, 2)}

Medya referanslari:
${JSON.stringify(mediaRefs, null, 2)}

Olcumler:
${JSON.stringify(payload.measurements || [], null, 2)}

JSON semasi:
{
  "level": "low|medium|high|critical",
  "score": 0,
  "confidence": 0,
  "clinicalSummary": "",
  "evidenceIntegration": "",
  "profileContext": [""],
  "mediaFindings": [{"mediaId":"","type":"photo|video|audio|measurement|unknown","relevance":"relevant|unrelated|unclear","observations":"","warnings":[""]}],
  "watchItems": [""],
  "safeSteps": [""],
  "dontItems": [""],
  "nextStep": "",
  "requiresVetToday": false,
  "limitations": [""]
}`;
  return { system, prompt };
}

function sanitizeTriageResult(data = {}) {
  const levels = new Set(['low', 'medium', 'high', 'critical']);
  const cleanList = (value, limit = 5) => (Array.isArray(value) ? value : [])
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .slice(0, limit);
  return {
    level: levels.has(data.level) ? data.level : 'medium',
    score: Math.max(0, Math.min(100, Number(data.score || 0))),
    confidence: Math.max(0, Math.min(100, Number(data.confidence || 0))),
    clinicalSummary: String(data.clinicalSummary || '').slice(0, 900),
    evidenceIntegration: String(data.evidenceIntegration || '').slice(0, 900),
    profileContext: cleanList(data.profileContext, 5),
    mediaFindings: (Array.isArray(data.mediaFindings) ? data.mediaFindings : []).slice(0, 8).map(item => ({
      mediaId: String(item.mediaId || ''),
      type: String(item.type || 'unknown'),
      relevance: ['relevant', 'unrelated', 'unclear'].includes(item.relevance) ? item.relevance : 'unclear',
      observations: String(item.observations || '').slice(0, 700),
      warnings: cleanList(item.warnings, 4)
    })),
    watchItems: cleanList(data.watchItems, 5),
    safeSteps: cleanList(data.safeSteps, 5),
    dontItems: cleanList(data.dontItems, 5),
    nextStep: String(data.nextStep || '').slice(0, 300),
    requiresVetToday: Boolean(data.requiresVetToday),
    limitations: cleanList(data.limitations, 5)
  };
}

async function handleAiTriage(req, res) {
  const body = await readBody(req);
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  const userId = body.userId || 'user-1';
  const petId = body.petId || null;
  const availability = await featureAvailability(db, { userId, featureCode: 'ai-triage' });
  if (!availability.ok) {
    return sendJson(res, 402, { ok: false, error: 'insufficient_credits', ...availability });
  }
  const model = process.env.GEMINI_CRITICAL_MODEL || 'gemini-3.5-flash';
  const startedAt = Date.now();
  const { system, prompt } = triagePrompt(body);
  const inlineMedia = Array.isArray(body.inlineMedia) ? body.inlineMedia : [];
  const mediaRefs = Array.isArray(body.mediaRefs) ? body.mediaRefs : [];
  const job = await createAiJob({
    userId,
    petId,
    featureCode: 'ai-triage',
    status: 'running',
    creditCost: availability.cost,
    inputPayload: {
      model,
      systemPrompt: system,
      userPrompt: prompt,
      mediaRefs,
      request: body.payload || {}
    }
  });
  const parts = inlineMedia
    .filter(item => item?.base64 && item?.mimeType)
    .map(item => ({ inlineData: { mimeType: item.mimeType, data: item.base64 } }));
  let usage;
  try {
    usage = await recordServerFeatureUsage(db, {
      userId,
      petId,
      featureCode: 'ai-triage',
      relatedId: job.id || null
    });
  } catch (error) {
    await completeAiJob(job.id, {
      status: 'failed',
      errorMessage: error.message || 'feature_usage_failed',
      outputPayload: { billingFailed: true, durationMs: Date.now() - startedAt }
    });
    return sendJson(res, error.statusCode || 500, { ok: false, error: error.message || 'feature_usage_failed' });
  }
  const result = await generateGeminiJson({
    system,
    prompt,
    model,
    parts,
    responseSchema: {
      type: 'object',
      properties: {
        level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        score: { type: 'number' },
        confidence: { type: 'number' },
        clinicalSummary: { type: 'string' },
        evidenceIntegration: { type: 'string' },
        profileContext: { type: 'array', items: { type: 'string' } },
        mediaFindings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              mediaId: { type: 'string' },
              type: { type: 'string' },
              relevance: { type: 'string', enum: ['relevant', 'unrelated', 'unclear'] },
              observations: { type: 'string' },
              warnings: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        watchItems: { type: 'array', items: { type: 'string' } },
        safeSteps: { type: 'array', items: { type: 'string' } },
        dontItems: { type: 'array', items: { type: 'string' } },
        nextStep: { type: 'string' },
        requiresVetToday: { type: 'boolean' },
        limitations: { type: 'array', items: { type: 'string' } }
      },
      required: ['level', 'score', 'confidence', 'clinicalSummary', 'mediaFindings', 'watchItems', 'safeSteps', 'dontItems', 'nextStep', 'limitations']
    }
  });
  if (!result.ok) {
    await completeAiJob(job.id, {
      status: 'failed',
      errorMessage: result.reason || 'ai_request_failed',
      outputPayload: { ...result, durationMs: Date.now() - startedAt }
    });
    return sendJson(res, 502, { ...result, error: result.reason || 'ai_request_failed' });
  }
  const sanitized = sanitizeTriageResult(result.data);
  await completeAiJob(job.id, {
    status: 'completed',
    outputPayload: { data: sanitized, raw: result.data, durationMs: Date.now() - startedAt }
  });
  return sendJson(res, 200, { ok: true, data: sanitized, aiJobId: job.id || null, usage: usage.usage });
}

function safeSegment(value, fallback) {
  return String(value || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || fallback;
}

function buildObjectKey({ userId, petId, category, fileName }) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return [
    'users',
    safeSegment(userId, 'unknown-user'),
    'pets',
    safeSegment(petId, 'unknown-pet'),
    safeSegment(category, 'documents'),
    yyyy,
    mm,
    `${id}-${safeSegment(fileName, 'file')}`
  ].join('/');
}

function mediaTypeFromMime(mimeType, fallback) {
  if (String(mimeType || '').startsWith('image/')) return 'image';
  if (String(mimeType || '').startsWith('video/')) return 'video';
  return fallback || 'document';
}

async function handleSignUpload(req, res) {
  const body = await readBody(req);
  const category = body.category || 'documents';
  const cfg = mediaCategories[category];
  if (!cfg) return sendJson(res, 400, { ok: false, error: 'unsupported_category' });
  if (!body.userId || !body.petId || !body.fileName) return sendJson(res, 400, { ok: false, error: 'missing_required_fields' });
  if (Number(body.sizeBytes || 0) > cfg.maxBytes) {
    return sendJson(res, 413, { ok: false, error: 'file_too_large', maxBytes: cfg.maxBytes });
  }

  const objectKey = buildObjectKey({
    userId: body.userId,
    petId: body.petId,
    category,
    fileName: body.fileName
  });
  const uploadUrl = presignPutObject({ objectKey, expiresSeconds: 900 });
  return sendJson(res, 200, {
    ok: true,
    method: 'PUT',
    uploadUrl,
    objectKey,
    expiresInSeconds: 900,
    retention: cfg.retention,
    maxBytes: cfg.maxBytes,
    headers: body.mimeType ? { 'Content-Type': body.mimeType } : {}
  });
}

async function handleCompleteUpload(req, res) {
  const body = await readBody(req);
  if (!body.userId || !body.petId || !body.objectKey) return sendJson(res, 400, { ok: false, error: 'missing_required_fields' });
  const category = body.category || 'documents';
  const cfg = mediaCategories[category] || mediaCategories.documents;
  const stored = await insertMediaMetadata({
    userId: body.userId,
    petId: body.petId,
    objectKey: body.objectKey,
    localUri: body.localUri || '',
    mimeType: body.mimeType || '',
    sizeBytes: body.sizeBytes || 0,
    relatedEntityType: body.relatedEntityType || null,
    relatedEntityId: body.relatedEntityId || null,
    mediaType: mediaTypeFromMime(body.mimeType, cfg.mediaType),
    metadata: {
      category,
      retention: cfg.retention,
      fileName: body.fileName || '',
      uploadedAt: new Date().toISOString()
    }
  });
  return sendJson(res, 200, { ok: true, ...stored });
}

async function handleSignDownload(req, res, url) {
  const objectKey = url.searchParams.get('objectKey');
  if (!objectKey || !objectKey.startsWith('users/')) return sendJson(res, 400, { ok: false, error: 'invalid_object_key' });
  return sendJson(res, 200, {
    ok: true,
    downloadUrl: presignGetObject({ objectKey, expiresSeconds: 300 }),
    expiresInSeconds: 300
  });
}

async function serveStatic(req, res, url) {
  let target = path.normalize(decodeURIComponent(url.pathname));
  if (target === path.sep) target = 'index.html';
  const filePath = path.join(distDir, target);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const stat = await fs.stat(resolved);
    const finalPath = stat.isDirectory() ? path.join(resolved, 'index.html') : resolved;
    const ext = path.extname(finalPath);
    const content = await fs.readFile(finalPath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    const fallback = await fs.readFile(path.join(distDir, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fallback);
  }
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, service: 'pet-help-api', time: new Date().toISOString() });
    }
    if (req.method === 'GET' && url.pathname === '/api/app/settings') {
      return sendJson(res, 200, { ok: true, data: await publicAppSettings() });
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/register') return handleRegister(req, res);
    if (req.method === 'POST' && url.pathname === '/api/auth/login') return handleLogin(req, res);
    if (req.method === 'GET' && url.pathname === '/api/pets') return handleGetPets(req, res, url);
    if (req.method === 'POST' && url.pathname === '/api/pets') return handleSavePet(req, res);
    if (req.method === 'POST' && url.pathname === '/api/pets/update') return handleUpdatePet(req, res);
    if (req.method === 'POST' && url.pathname === '/api/forms/submit') return handleSubmitForm(req, res);
    if (req.method === 'GET' && url.pathname === '/api/records') return handleGetRecords(req, res, url);
    if (req.method === 'GET' && url.pathname === '/api/documents') return handleGetDocuments(req, res, url);
    if (req.method === 'GET' && /^\/api\/documents\/[^/]+$/.test(url.pathname)) return handleGetDocument(req, res, url.pathname.split('/').pop());
    if (req.method === 'POST' && url.pathname === '/api/reminders/status') return handleReminderStatus(req, res);
    if (req.method === 'POST' && url.pathname === '/api/measurements') return handleSaveMeasurement(req, res);
    if (req.method === 'GET' && url.pathname === '/api/measurements') return handleGetMeasurements(req, res, url);
    if (url.pathname.startsWith('/api/vet-live/')) return handleVetLiveRequest(req, res, url);
    if (url.pathname.startsWith('/api/admin/')) return handleAdminRequest(req, res, url, sendJson);
    if (req.method === 'POST' && url.pathname === '/api/media/sign-upload') return handleSignUpload(req, res);
    if (req.method === 'POST' && url.pathname === '/api/media/complete') return handleCompleteUpload(req, res);
    if (req.method === 'GET' && url.pathname === '/api/media/sign-download') return handleSignDownload(req, res, url);
    if (req.method === 'POST' && url.pathname === '/api/billing/feature-availability') return handleFeatureAvailability(req, res);
    if (req.method === 'GET' && url.pathname === '/api/billing/account') return handleBillingAccount(req, res, url);
    if (req.method === 'POST' && url.pathname === '/api/billing/record-usage') return handleFeatureUsage(req, res);
    if (req.method === 'POST' && url.pathname === '/api/ai/document-ocr') return handleDocumentOcr(req, res);
    if (req.method === 'POST' && url.pathname === '/api/ai/package-risk') return handlePackageRiskLogged(req, res);
    if (req.method === 'POST' && url.pathname === '/api/ai/triage') return handleAiTriage(req, res);
    if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { ok: false, error: 'not_found' });
    return serveStatic(req, res, url);
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message || 'server_error' });
  }
}

http.createServer(route).listen(port, () => {
  console.log(`Pet Help API listening on :${port}`);
});
