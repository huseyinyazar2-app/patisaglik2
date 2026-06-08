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
