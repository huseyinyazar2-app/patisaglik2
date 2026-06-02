import { goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { getAccountBilling, saveLocalPlanCode } from '../../services/billing.js';
import { t } from '../../i18n/tr.js';

function money(plan) {
  if (!plan.priceCents) return plan.billingType === 'free' ? t('common.free') : t('planScreen.no_test_price');
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: plan.currency || 'TRY'
  }).format(plan.priceCents / 100);
}

function planBadge(plan) {
  if (plan.billingType === 'subscription') return t('planScreen.subscription');
  if (plan.billingType === 'credit') return t('planScreen.credit');
  return t('common.free');
}

function renderPlans(plans = [], activeCode = 'free') {
  if (!plans.length) {
    return `<div class="free-record-panel"><p>${t('planScreen.loading')}</p></div>`;
  }

  return plans.map((plan) => `
    <div class="feature-menu-card plan-choice-card ${plan.code === activeCode ? 'selected' : ''}">
      <div class="premium-icon-box">${plan.billingType === 'free' ? window.__icons?.shield : window.__icons?.spark}</div>
      <div>
        <strong>${plan.name}</strong>
        <p>${money(plan)} · ${plan.maxPets} pet · ${plan.monthlyCredits} kredi/ay</p>
      </div>
      <button class="btn btn-sm ${plan.code === activeCode ? 'btn-primary' : 'btn-outline'}" data-plan-code="${plan.code}">
        ${plan.code === activeCode ? t('planScreen.active') : t('planScreen.apply_test')}
      </button>
      <span>${planBadge(plan)}</span>
    </div>
  `).join('');
}

export function render() {
  const state = getState();
  const sub = state.subscription || {};
  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('planScreen.title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.spark}</span>
        </div>
      </div>

      <div class="section pt-4">
        <div class="profile-plan-card">
          <div>
            <strong>${sub.planName || t('common.free')}</strong>
            <p>${t('planScreen.desc')}</p>
          </div>
          <span class="plan-pill" id="currentPlanPill">${sub.planCode || 'free'}</span>
        </div>
      </div>

      <div class="section pt-0">
        <div class="record-summary-grid">
          <div class="record-summary-card">
            <span>Pet limiti</span>
            <strong id="planPetLimit">${sub.maxPets || 1}</strong>
          </div>
          <div class="record-summary-card">
            <span>Kredi</span>
            <strong id="planCredits">${sub.creditBalance || 0}</strong>
          </div>
        </div>
      </div>

      <div class="section pt-0 pb-24">
        <h3 class="section-title mb-3">${t('planScreen.packages')}</h3>
        <div class="feature-menu-list" id="planList">${renderPlans()}</div>
        <p class="text-xs text-tertiary mt-3">${t('planScreen.test_note')}</p>
      </div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());

  function applyBilling(billing) {
    setState({ subscription: billing.subscription });
    const list = document.getElementById('planList');
    const pill = document.getElementById('currentPlanPill');
    const petLimit = document.getElementById('planPetLimit');
    const credits = document.getElementById('planCredits');
    if (list) list.innerHTML = renderPlans(billing.plans, billing.subscription.planCode);
    if (pill) pill.textContent = billing.subscription.planName;
    if (petLimit) petLimit.textContent = billing.subscription.maxPets;
    if (credits) credits.textContent = billing.subscription.creditBalance;
    bindPlanButtons();
  }

  function bindPlanButtons() {
    document.querySelectorAll('[data-plan-code]').forEach((button) => {
      button.addEventListener('click', async () => {
        const subscription = saveLocalPlanCode(button.dataset.planCode);
        setState({ subscription });
        const billing = await getAccountBilling({ userId: state.user?.id || 'user-1' });
        applyBilling(billing);
      });
    });
  }

  getAccountBilling({ userId: state.user?.id || 'user-1' }).then(applyBilling).catch((err) => {
    const list = document.getElementById('planList');
    if (list) list.innerHTML = `<div class="free-record-panel"><p>${t('planScreen.load_failed', { error: err.message })}</p></div>`;
  });
}
