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

function safeUser(row = {}) {
  return {
    id: row.id,
    name: row.display_name || '',
    email: row.email || '',
    phone: row.phone || '',
    locale: row.locale || 'tr',
    timezone: row.timezone || 'Europe/Istanbul'
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

async function handleRegister(req, res) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  await ensureAuthSchema(db);
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
  const wallet = await ensureInitialWallet(db, userId, createdAt);
  return sendJson(res, 200, { ok: true, user: { id: userId, name: displayName, email, phone, locale, timezone }, wallet });
}

async function handleLogin(req, res) {
  const db = getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: 'db_not_configured' });
  await ensureAuthSchema(db);
  const body = await readBody(req);
  const phone = normalizePhone(body.phone);
  const password = String(body.password || '');
  if (!phone || !password) return sendJson(res, 400, { ok: false, error: 'invalid_login_fields' });
  const result = await db.execute({ sql: `SELECT * FROM users WHERE phone = ? AND status <> 'deleted' LIMIT 1`, args: [phone] });
  const user = result.rows[0];
  if (!user?.id || !verifyPassword(password, user.password_hash)) return sendJson(res, 401, { ok: false, error: 'invalid_credentials' });
  const wallet = await ensureInitialWallet(db, user.id);
  return sendJson(res, 200, { ok: true, user: safeUser(user), wallet });
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
        record.feature_code,
        genericTitle(payload, 'Belge'),
        firstValue(pickPayload(payload, ['not', 'note', 'özet', 'ozet'])),
        JSON.stringify({ form_submission_id: record.id, feature_code: record.feature_code, payload })
      ]
    });
    return 'documents';
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
  const domainTable = await insertFormDomainRecord(db, record, record.payload);
  return sendJson(res, 200, { ok: true, id: record.id, domainTable, mediaCount });
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

async function handleDocumentOcr(req, res) {
  const body = await readBody(req);
  if (!body.fileBase64) return sendJson(res, 400, codedError('missing_file'));
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
    userId: body.userId,
    petId: body.petId || null,
    featureCode: 'document-ocr',
    status: 'running',
    creditCost: 1,
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
  return sendJson(res, 200, { ok: true, data: normalized, aiJobId: job.id || null });
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
  const model = process.env.GEMINI_CRITICAL_MODEL || 'gemini-3.5-flash';
  const system = 'Sen veteriner yerine gecmeyen, guvenli aciliyet yonlendirmesi yapan bir pet saglik asistanisin.';
  const startedAt = Date.now();
  const job = await createAiJob({
    userId: body.userId,
    petId: body.petId || null,
    featureCode: 'package-risk',
    status: 'running',
    creditCost: 1,
    inputPayload: {
      model,
      systemPrompt: system,
      userPrompt: body.prompt || '',
      mediaRefs: Array.isArray(body.mediaRefs) ? body.mediaRefs : [],
      request: body.context || {}
    }
  });
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
  return sendJson(res, 200, { ok: true, data: sanitized, aiJobId: job.id || null });
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
    if (req.method === 'POST' && url.pathname === '/api/reminders/status') return handleReminderStatus(req, res);
    if (req.method === 'POST' && url.pathname === '/api/measurements') return handleSaveMeasurement(req, res);
    if (req.method === 'GET' && url.pathname === '/api/measurements') return handleGetMeasurements(req, res, url);
    if (url.pathname.startsWith('/api/admin/')) return handleAdminRequest(req, res, url, sendJson);
    if (req.method === 'POST' && url.pathname === '/api/media/sign-upload') return handleSignUpload(req, res);
    if (req.method === 'POST' && url.pathname === '/api/media/complete') return handleCompleteUpload(req, res);
    if (req.method === 'GET' && url.pathname === '/api/media/sign-download') return handleSignDownload(req, res, url);
    if (req.method === 'POST' && url.pathname === '/api/ai/document-ocr') return handleDocumentOcr(req, res);
    if (req.method === 'POST' && url.pathname === '/api/ai/package-risk') return handlePackageRiskLogged(req, res);
    if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { ok: false, error: 'not_found' });
    return serveStatic(req, res, url);
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message || 'server_error' });
  }
}

http.createServer(route).listen(port, () => {
  console.log(`Pet Help API listening on :${port}`);
});
