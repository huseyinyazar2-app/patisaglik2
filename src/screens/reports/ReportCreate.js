import { navigate, goBack } from '../../router.js';
import { t } from '../../i18n/tr.js';

const reportActions = [
  {
    id: 'clinic-export',
    icon: 'briefcase',
    titleKey: 'reportCreate.clinic_title',
    descKey: 'reportCreate.clinic_desc',
    route: '/feature/clinic-export',
    badgeKey: 'common.free'
  },
  {
    id: 'vet-prep',
    icon: 'stethoscope',
    titleKey: 'reportCreate.vet_prep_title',
    descKey: 'reportCreate.vet_prep_desc',
    route: '/feature/vet-prep',
    badgeKey: 'common.free'
  },
  {
    id: 'document-ai',
    icon: 'upload',
    titleKey: 'reportCreate.document_title',
    descKey: 'reportCreate.document_desc',
    route: '/feature/document-ai',
    badgeKey: 'reportCreate.ai_ready'
  }
];

export function render() {
  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('reports.new_report')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.clipboard}</span>
        </div>
      </div>

      <div class="section pt-4">
        <div class="profile-plan-card">
          <div>
            <strong>${t('reportCreate.choose_type')}</strong>
            <p>${t('reportCreate.choose_desc')}</p>
          </div>
          <span class="plan-pill">Raporlar</span>
        </div>
      </div>

      <div class="section pt-0 pb-24">
        <div class="feature-menu-list">
          ${reportActions.map((item) => `
            <button class="feature-menu-card" data-route="${item.route}">
              <div class="premium-icon-box">${window.__icons?.[item.icon]}</div>
              <div>
                <strong>${t(item.titleKey)}</strong>
                <p>${t(item.descKey)}</p>
              </div>
              <span>${t(item.badgeKey)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.querySelectorAll('[data-route]').forEach((button) => {
    button.addEventListener('click', () => navigate(button.dataset.route));
  });
}
