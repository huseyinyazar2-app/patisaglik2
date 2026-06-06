import { goBack } from '../../router.js';
import { t } from '../../i18n/tr.js';

export function render() {
  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('planScreen.paused_title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.shield}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="profile-plan-card">
          <div>
            <strong>${t('planScreen.paused_heading')}</strong>
            <p>${t('planScreen.paused_desc')}</p>
          </div>
        </div>

        <div class="free-record-panel mt-4">
          <p>${t('planScreen.paused_note')}</p>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
}
