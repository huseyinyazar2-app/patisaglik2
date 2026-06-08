import { getDbClient } from './dbClient.js';
import { postApiJson } from './apiClient.js';
import { translateForLocale } from '../i18n/tr.js';

const LOCAL_PLAN_KEY = 'pati_local_plan_code';
export const PAYMENTS_DISABLED = true;
const INITIAL_AI_CREDITS = 1;

const fallbackPlans = [
  { id: 'plan-free', code: 'free', billing_type: 'free', name_tr: translateForLocale('tr', 'billingPlans.free'), price_cents: 0, currency: 'TRY', max_pets: 1, monthly_credit_allowance: 0, features: '{"ai":false,"documents":false,"members":1}' },
  { id: 'plan-credit', code: 'credit', billing_type: 'credit', name_tr: translateForLocale('tr', 'billingPlans.credit'), price_cents: 0, currency: 'TRY', max_pets: 3, monthly_credit_allowance: 0, features: '{"ai":true,"documents":true,"members":2}' },
  { id: 'plan-premium-monthly', code: 'premium_monthly', billing_type: 'subscription', billing_period: 'monthly', name_tr: translateForLocale('tr', 'billingPlans.monthly'), price_cents: 24900, currency: 'TRY', play_product_id: 'pati_premium_monthly', max_pets: 10, monthly_credit_allowance: 8, features: '{"ai":true,"documents":true,"members":10,"aiCreditCost":1}' },
  { id: 'plan-premium-yearly', code: 'premium_yearly', billing_type: 'subscription', billing_period: 'yearly', name_tr: translateForLocale('tr', 'billingPlans.yearly'), price_cents: 199000, currency: 'TRY', play_product_id: 'pati_premium_yearly', max_pets: 10, monthly_credit_allowance: 8, features: '{"ai":true,"documents":true,"members":10,"aiCreditCost":1}' }
];

const fallbackCreditPackages = [
  { id: 'credit-pack-1', code: 'credit_1', name_tr: '1 Kredi', credit_amount: 1, price_cents: 4900, currency: 'TRY', play_product_id: 'pati_credit_1', metadata: '{"aiCreditCost":1}', is_active: 1, sort_order: 10 },
  { id: 'credit-pack-10', code: 'credit_10', name_tr: '10 Kredi', credit_amount: 10, price_cents: 39000, currency: 'TRY', play_product_id: 'pati_credit_10', metadata: '{"aiCreditCost":1}', is_active: 1, sort_order: 20 }
];

const planOrder = ['free', 'credit', 'premium_monthly', 'premium_yearly', 'monthly', 'yearly'];
const LOCAL_USAGE_KEY = 'pati_feature_usage';
const LOCAL_WALLET_KEY = 'pati_credit_wallets';

const creditFeatures = new Set([
  'sitter'
]);

const aiCreditFeatures = new Set([
  'document-ai',
  'document-ocr',
  'package-risk',
  'toxic-ai',
  'ai-triage',
  'vet-prep-ai'
]);

function parseFeatures(value) {
  try {
    return typeof value === 'string' ? JSON.parse(value || '{}') : value || {};
  } catch {
    return {};
  }
}

function normalizePlan(row) {
  return {
    id: row.id,
    code: row.code,
    billingType: row.billing_type,
    billingPeriod: row.billing_period || '',
    name: row.name_tr,
    priceCents: Number(row.price_cents || 0),
    currency: row.currency || 'TRY',
    playProductId: row.play_product_id || '',
    maxPets: Number(row.max_pets || 1),
    monthlyCredits: Number(row.monthly_credit_allowance || 0),
    features: parseFeatures(row.features)
  };
}

function normalizeCreditPackage(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name_tr,
    creditAmount: Number(row.credit_amount || 0),
    priceCents: Number(row.price_cents || 0),
    currency: row.currency || 'TRY',
    playProductId: row.play_product_id || '',
    metadata: parseFeatures(row.metadata),
    isActive: Number(row.is_active ?? 1) === 1
  };
}

function subscriptionFromPlan(plan, wallet = null, source = 'local-fallback') {
  const isPro = ['monthly', 'yearly', 'premium_monthly', 'premium_yearly'].includes(plan.code);
  return {
    tier: isPro ? 'pro' : plan.code,
    planCode: plan.code,
    billingType: plan.billingType,
    planName: plan.name,
    maxPets: plan.maxPets,
    monthlyCredits: plan.monthlyCredits,
    creditBalance: Number(wallet?.balance || 0),
    features: plan.features,
    source
  };
}

function getLocalWalletBalance(userId = 'user-1') {
  const wallets = JSON.parse(localStorage.getItem(LOCAL_WALLET_KEY) || '{}');
  if (typeof wallets[userId] !== 'number') {
    wallets[userId] = INITIAL_AI_CREDITS;
    localStorage.setItem(LOCAL_WALLET_KEY, JSON.stringify(wallets));
  }
  return wallets[userId];
}

function setLocalWalletBalance(userId = 'user-1', balance = 0) {
  const wallets = JSON.parse(localStorage.getItem(LOCAL_WALLET_KEY) || '{}');
  wallets[userId] = Math.max(0, Number(balance || 0));
  localStorage.setItem(LOCAL_WALLET_KEY, JSON.stringify(wallets));
  return wallets[userId];
}

export function saveLocalPlanCode(code) {
  const plan = fallbackPlans.find((item) => item.code === code) || fallbackPlans[0];
  localStorage.setItem(LOCAL_PLAN_KEY, plan.code);
  return subscriptionFromPlan(normalizePlan(plan));
}

export async function getAccountBilling({ userId = 'user-1' } = {}) {
  const localPlanCode = localStorage.getItem(LOCAL_PLAN_KEY);
  const db = getDbClient();
  if (!db) {
    const plans = fallbackPlans.map(normalizePlan);
    const creditPackages = fallbackCreditPackages.map(normalizeCreditPackage);
    const selected = plans.find((item) => item.code === localPlanCode) || plans[0];
    return {
      plans,
      creditPackages,
      subscription: subscriptionFromPlan(selected, { balance: getLocalWalletBalance(userId) }),
      wallet: { balance: getLocalWalletBalance(userId), currency: 'credit' }
    };
  }

  const [plansResult, creditPackagesResult, subscriptionResult, walletResult] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM plans WHERE is_active = 1 ORDER BY price_cents ASC, code ASC', args: [] }),
    db.execute({ sql: 'SELECT * FROM credit_packages WHERE is_active = 1 ORDER BY sort_order ASC, price_cents ASC', args: [] }).catch(() => ({ rows: [] })),
    db.execute({
      sql: `SELECT p.*, s.status, s.starts_at, s.ends_at, s.renews_at
            FROM subscriptions s
            JOIN plans p ON p.id = s.plan_id
            WHERE s.user_id = ? AND s.status IN ('active', 'trialing')
            ORDER BY COALESCE(s.renews_at, s.starts_at) DESC
            LIMIT 1`,
      args: [userId]
    }),
    db.execute({ sql: 'SELECT balance, currency FROM credit_wallets WHERE user_id = ? LIMIT 1', args: [userId] })
  ]);

  const plans = plansResult.rows
    .map((row) => normalizePlan(Object.fromEntries(Object.entries(row))))
    .sort((a, b) => planOrder.indexOf(a.code) - planOrder.indexOf(b.code));
  const creditPackages = (creditPackagesResult.rows.length ? creditPackagesResult.rows : fallbackCreditPackages)
    .map((row) => normalizeCreditPackage(Object.fromEntries(Object.entries(row))));
  const freePlan = plans.find((item) => item.code === 'free') || normalizePlan(fallbackPlans[0]);
  const localPlan = plans.find((item) => item.code === localPlanCode);
  const activePlan = subscriptionResult.rows[0]
    ? normalizePlan(Object.fromEntries(Object.entries(subscriptionResult.rows[0])))
    : localPlan
      ? localPlan
    : freePlan;
  const wallet = walletResult.rows[0] || { balance: 0, currency: 'credit' };

  return {
    plans,
    creditPackages,
    subscription: subscriptionFromPlan(activePlan, wallet, 'turso'),
    wallet: { balance: Number(wallet.balance || 0), currency: wallet.currency || 'credit' }
  };
}

export async function getFeatureCreditAvailability({ userId = 'user-1', featureCode }) {
  const requiresCredit = aiCreditFeatures.has(featureCode) || creditFeatures.has(featureCode);
  const db = getDbClient();
  if (!db && !import.meta.env?.DEV && requiresCredit) {
    try {
      return await postApiJson('/api/billing/feature-availability', { userId, featureCode });
    } catch {
      return { ok: false, cost: 1, source: 'billing_unavailable', remaining: 0 };
    }
  }

  const billing = await getAccountBilling({ userId });
  const cost = aiCreditFeatures.has(featureCode)
    ? Number(billing.subscription.features?.aiCreditCost || 1)
    : billing.subscription.billingType === 'credit' && creditFeatures.has(featureCode) ? 1 : 0;
  if (cost <= 0) return { ok: true, cost, source: 'free' };

  if (!db) {
    const walletBalance = Number(billing.wallet?.balance || 0);
    if (walletBalance >= cost) return { ok: true, cost, source: 'local-wallet', remaining: walletBalance };
    return { ok: false, cost, source: 'insufficient', remaining: walletBalance };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyUsedResult = await db.execute({
    sql: `SELECT COALESCE(SUM(credit_cost), 0) AS used
          FROM feature_usage
          WHERE user_id = ? AND credit_cost > 0 AND created_at >= ?`,
    args: [userId, monthStart.toISOString()]
  });
  const monthlyUsed = Number(monthlyUsedResult.rows[0]?.used || 0);
  const allowance = Number(billing.subscription.monthlyCredits || 0);
  if (allowance > 0 && monthlyUsed + cost <= allowance) {
    return { ok: true, cost, source: 'subscription_allowance', remaining: allowance - monthlyUsed };
  }
  const walletBalance = Number(billing.wallet?.balance || 0);
  if (walletBalance >= cost) return { ok: true, cost, source: 'wallet', remaining: walletBalance };
  return { ok: false, cost, source: 'insufficient', remaining: Math.max(0, allowance - monthlyUsed) + walletBalance };
}

function localUsageRecord(record) {
  const current = JSON.parse(localStorage.getItem(LOCAL_USAGE_KEY) || '[]');
  current.unshift(record);
  localStorage.setItem(LOCAL_USAGE_KEY, JSON.stringify(current.slice(0, 100)));
}

export async function recordFeatureUsage({ userId = 'user-1', petId = null, featureCode, relatedId = null }) {
  const requiresCredit = aiCreditFeatures.has(featureCode) || creditFeatures.has(featureCode);
  const db = getDbClient();
  if (!db && !import.meta.env?.DEV && requiresCredit) {
    const result = await postApiJson('/api/billing/record-usage', { userId, petId, featureCode, relatedId });
    return {
      ok: true,
      storage: 'api',
      usage: {
        plan_code: result.usage?.plan_code || 'unknown',
        credit_cost: Number(result.usage?.credit_cost || 0),
        id: result.usage?.id,
        credit_source: result.usage?.credit_source || 'api'
      }
    };
  }

  const billing = await getAccountBilling({ userId });
  const aiCost = Number(billing.subscription.features?.aiCreditCost || 1);
  const creditCost = aiCreditFeatures.has(featureCode)
    ? aiCost
    : billing.subscription.billingType === 'credit' && creditFeatures.has(featureCode) ? 1 : 0;
  const usage = {
    id: `usage-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    user_id: userId,
    pet_id: petId,
    feature_code: featureCode,
    plan_code: billing.subscription.planCode,
    credit_cost: creditCost,
    usage_count: 1,
    metadata: JSON.stringify({ related_entity_id: relatedId, billing_source: billing.subscription.source }),
    created_at: new Date().toISOString()
  };

  if (!db) {
    if (creditCost > 0) {
      const balance = getLocalWalletBalance(userId);
      if (balance < creditCost) throw new Error('insufficient_credits');
      setLocalWalletBalance(userId, balance - creditCost);
      usage.metadata = JSON.stringify({ related_entity_id: relatedId, billing_source: billing.subscription.source, credit_source: 'local-wallet' });
    }
    localUsageRecord(usage);
    return { ok: true, storage: 'local-fallback', usage };
  }

  let creditSource = 'none';
  if (creditCost > 0) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthlyUsedResult = await db.execute({
      sql: `SELECT COALESCE(SUM(credit_cost), 0) AS used
            FROM feature_usage
            WHERE user_id = ? AND credit_cost > 0 AND created_at >= ?`,
      args: [userId, monthStart.toISOString()]
    });
    const monthlyUsed = Number(monthlyUsedResult.rows[0]?.used || 0);
    const monthlyAllowance = Number(billing.subscription.monthlyCredits || 0);
    if (monthlyAllowance > 0 && monthlyUsed + creditCost <= monthlyAllowance) {
      creditSource = 'subscription_allowance';
    } else {
      const wallet = await db.execute({ sql: 'SELECT id, balance FROM credit_wallets WHERE user_id = ? LIMIT 1', args: [userId] });
      const currentWallet = Object.fromEntries(Object.entries(wallet.rows[0] || {}));
      if (Number(currentWallet.balance || 0) < creditCost) throw new Error('insufficient_credits');
      const nextBalance = Number(currentWallet.balance || 0) - creditCost;
      await db.execute({ sql: 'UPDATE credit_wallets SET balance = ?, updated_at = ? WHERE id = ?', args: [nextBalance, usage.created_at, currentWallet.id] });
      await db.execute({
        sql: `INSERT INTO credit_transactions (id, wallet_id, user_id, amount, direction, reason, related_entity_type, related_entity_id, metadata, created_at)
              VALUES (?, ?, ?, ?, 'out', 'ai_usage', 'feature_usage', ?, ?, ?)`,
        args: [`credit-${Date.now()}-${Math.random().toString(16).slice(2)}`, currentWallet.id, userId, creditCost, usage.id, JSON.stringify({ featureCode, relatedId }), usage.created_at]
      });
      creditSource = 'wallet';
    }
    usage.metadata = JSON.stringify({ related_entity_id: relatedId, billing_source: billing.subscription.source, credit_source: creditSource });
  }

  await db.execute({
    sql: `INSERT INTO feature_usage
      (id, user_id, pet_id, feature_code, plan_code, credit_cost, usage_count, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      usage.id,
      usage.user_id,
      usage.pet_id,
      usage.feature_code,
      usage.plan_code,
      usage.credit_cost,
      usage.usage_count,
      usage.metadata,
      usage.created_at
    ]
  });

  return { ok: true, storage: 'turso', usage };
}
