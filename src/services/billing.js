import { getDbClient } from './dbClient.js';
import { translateForLocale } from '../i18n/tr.js';

const LOCAL_PLAN_KEY = 'pati_local_plan_code';

const fallbackPlans = [
  { id: 'plan-free', code: 'free', billing_type: 'free', name_tr: translateForLocale('tr', 'billingPlans.free'), price_cents: 0, currency: 'TRY', max_pets: 1, monthly_credit_allowance: 0, features: '{"ai":false,"documents":false,"members":1}' },
  { id: 'plan-credit', code: 'credit', billing_type: 'credit', name_tr: translateForLocale('tr', 'billingPlans.credit'), price_cents: 0, currency: 'TRY', max_pets: 3, monthly_credit_allowance: 0, features: '{"ai":true,"documents":true,"members":2}' },
  { id: 'plan-monthly', code: 'monthly', billing_type: 'subscription', name_tr: translateForLocale('tr', 'billingPlans.monthly'), price_cents: 0, currency: 'TRY', max_pets: 10, monthly_credit_allowance: 100, features: '{"ai":true,"documents":true,"members":10}' },
  { id: 'plan-yearly', code: 'yearly', billing_type: 'subscription', name_tr: translateForLocale('tr', 'billingPlans.yearly'), price_cents: 0, currency: 'TRY', max_pets: 10, monthly_credit_allowance: 1400, features: '{"ai":true,"documents":true,"members":10}' }
];

const planOrder = ['free', 'credit', 'monthly', 'yearly'];
const LOCAL_USAGE_KEY = 'pati_feature_usage';

const creditFeatures = new Set([
  'sitter'
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
    name: row.name_tr,
    priceCents: Number(row.price_cents || 0),
    currency: row.currency || 'TRY',
    maxPets: Number(row.max_pets || 1),
    monthlyCredits: Number(row.monthly_credit_allowance || 0),
    features: parseFeatures(row.features)
  };
}

function subscriptionFromPlan(plan, wallet = null, source = 'local-fallback') {
  const isPro = ['monthly', 'yearly'].includes(plan.code);
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
    const selected = plans.find((item) => item.code === localPlanCode) || plans[0];
    return {
      plans,
      subscription: subscriptionFromPlan(selected),
      wallet: { balance: selected.code === 'credit' ? 25 : 0, currency: 'credit' }
    };
  }

  const [plansResult, subscriptionResult, walletResult] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM plans WHERE is_active = 1 ORDER BY price_cents ASC, code ASC', args: [] }),
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
    subscription: subscriptionFromPlan(activePlan, wallet, 'turso'),
    wallet: { balance: Number(wallet.balance || 0), currency: wallet.currency || 'credit' }
  };
}

function localUsageRecord(record) {
  const current = JSON.parse(localStorage.getItem(LOCAL_USAGE_KEY) || '[]');
  current.unshift(record);
  localStorage.setItem(LOCAL_USAGE_KEY, JSON.stringify(current.slice(0, 100)));
}

export async function recordFeatureUsage({ userId = 'user-1', petId = null, featureCode, relatedId = null }) {
  const billing = await getAccountBilling({ userId });
  const creditCost = billing.subscription.billingType === 'credit' && creditFeatures.has(featureCode) ? 1 : 0;
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

  const db = getDbClient();
  if (!db) {
    localUsageRecord(usage);
    return { ok: true, storage: 'local-fallback', usage };
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
