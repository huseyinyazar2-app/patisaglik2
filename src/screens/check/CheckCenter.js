import { navigate } from '../../router.js';
import { getState, resetSession } from '../../store.js';
import { getActivePet } from '../../services/pets.js';
import { getAccountBilling } from '../../services/billing.js';
import { t } from '../../i18n/tr.js';

const premiumAssistants = [
  {
    id: 'smart',
    icon: 'spark',
    titleKey: 'checkCenter.assistants.smart.title',
    descKey: 'checkCenter.assistants.smart.desc',
    actionKey: 'checkCenter.assistants.smart.action',
    featured: true
  },
  {
    id: 'knowledge',
    icon: 'shield',
    titleKey: 'checkCenter.assistants.knowledge.title',
    descKey: 'checkCenter.assistants.knowledge.desc',
    actionKey: 'checkCenter.assistants.knowledge.action',
    free: true
  },
  {
    id: 'toxic',
    icon: 'alert',
    titleKey: 'checkCenter.assistants.toxic.title',
    descKey: 'checkCenter.assistants.toxic.desc',
    actionKey: 'checkCenter.assistants.toxic.action',
    danger: true
  },
  {
    id: 'safety',
    icon: 'shield',
    titleKey: 'checkCenter.assistants.safety.title',
    descKey: 'checkCenter.assistants.safety.desc',
    actionKey: 'checkCenter.assistants.safety.action',
    free: true
  },
  {
    id: 'document',
    icon: 'upload',
    titleKey: 'checkCenter.assistants.document.title',
    descKey: 'checkCenter.assistants.document.desc',
    actionKey: 'checkCenter.assistants.document.action',
    disabled: true
  },
  {
    id: 'vetprep',
    icon: 'clipboard',
    titleKey: 'checkCenter.assistants.vetprep.title',
    descKey: 'checkCenter.assistants.vetprep.desc',
    actionKey: 'checkCenter.assistants.vetprep.action'
  }
];

function formatCredit(balance = null) {
  return balance === null ? t('common.loading') : t('checkCenter.credit_balance', { count: Number(balance || 0) });
}

export function render() {
  const state = getState();
  const pet = getActivePet(state.activePetId);

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left"></div>
        <div class="header-title">Pet AI</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.spark}</span>
        </div>
      </div>

      <div class="section pt-4">
        <div class="ai-premium-hero">
          <div>
            <div class="premium-screen-kicker">${t('checkCenter.kicker')}</div>
            <h1>${t('checkCenter.heading')}</h1>
            <p>${t('checkCenter.hero_desc').replace('{name}', pet.name)}</p>
            <button class="ai-credit-inline-pill" id="btnAiCredits" type="button">
              <span>${window.__icons?.spark || ''}</span>
              <b>${formatCredit()}</b>
            </button>
          </div>
        </div>
      </div>

      <div class="section pt-0">
        <div class="ai-free-note">
          <span>${window.__icons?.shield}</span>
          <p>${t('checkCenter.free_note')}</p>
        </div>
      </div>

      <div class="section pt-0">
        <h3 class="section-title mb-3">${t('checkCenter.modules_title')}</h3>
        <div class="ai-assistant-list">
          ${premiumAssistants.map(item => `
            <button class="ai-assistant-card ${item.featured ? 'featured' : ''} ${item.danger ? 'danger' : ''} ${item.free ? 'free' : ''}" data-assistant="${item.id}" ${item.disabled ? 'disabled aria-disabled="true"' : ''}>
              <div class="premium-icon-box">${window.__icons?.[item.icon]}</div>
              <div>
                <strong>${t(item.titleKey)}</strong>
                <p>${t(item.descKey)}</p>
                <span>${t(item.actionKey)}</span>
              </div>
            </button>
          `).join('')}
        </div>
      </div>

      <div style="height: 86px;"></div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  const handlers = {
    smart: () => {
      resetSession();
      navigate('/check/new/complaint');
    },
    knowledge: () => {
      navigate('/check/knowledge');
    },
    toxic: () => {
      navigate('/check/package-risk');
    },
    safety: () => {
      navigate('/check/safety-radar');
    },
    document: () => {},
    vetprep: () => {
      navigate('/feature/vet-prep');
    }
  };

  document.querySelectorAll('[data-assistant]').forEach(btn => {
    if (btn.disabled) return;
    btn.addEventListener('click', () => handlers[btn.dataset.assistant]?.());
  });

  document.getElementById('btnAiCredits')?.addEventListener('click', () => navigate('/profile/plan'));
  getAccountBilling({ userId: state.user?.id || 'user-1' }).then((billing) => {
    const target = document.querySelector('#btnAiCredits b');
    if (target) target.textContent = formatCredit(billing.wallet?.balance);
  }).catch(() => {});
}
