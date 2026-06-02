import { navigate } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';

const accountItems = [
  { id: 'passport', icon: 'shield', route: '/profile/passport' },
  { id: 'pets', icon: 'paw', route: '/pets/select' },
  { id: 'volunteer', icon: 'search', route: '/profile/volunteer-network' },
  { id: 'qr', icon: 'shield', route: '/feature/qr' },
  { id: 'sitter', icon: 'profile', route: '/feature/sitter' },
  { id: 'senior', icon: 'heartPulse', route: '/feature/senior' }
];

const settingsItems = [
  { id: 'account', icon: 'profile', route: '/profile/account' },
  { id: 'devices', icon: 'kit', route: '/profile/devices' },
  { id: 'privacy', icon: 'lock', route: '/profile/privacy' },
  { id: 'notifications', icon: 'bell', route: '/profile/notifications' },
  { id: 'language', icon: 'message', route: '/profile/language', valueKey: 'profilePage.language_value' }
];

export function render() {
  const state = getState();
  const user = state.user;
  const plan = state.subscription?.tier === 'pro' ? 'PRO' : 'FREE';
  const location = user.location || {};
  const profileMissing = !user.phone || !location.province || !location.district;

  return `
    <div class="screen premium-check">
      <div class="profile-premium-header">
        <div class="profile-avatar">${user.name.charAt(0)}</div>
        <div>
          <div class="premium-screen-kicker">${t('profilePage.account_kicker')}</div>
          <h1>${user.name}</h1>
          <p>${user.phone || user.email || t('profilePage.phone_waiting')}</p>
        </div>
        <span>${plan}</span>
      </div>

      <div class="section pt-0">
        ${profileMissing ? `
          <div class="info-box warning mb-3">
            <span class="info-box-icon">${window.__icons?.alert}</span>
            <span>${t('profilePage.missing_profile_warning')}</span>
          </div>
        ` : ''}
        <div class="profile-plan-card">
          <div>
            <strong>${t('profilePage.plan_card_title')}</strong>
            <p>${t('profilePage.plan_card_desc')}</p>
          </div>
          <button class="btn btn-sm btn-primary" id="btnPlan">Plan</button>
        </div>
      </div>

      <div class="section pt-0">
        <h3 class="section-title mb-3">${t('profilePage.health_sharing')}</h3>
        <div class="feature-menu-list">
          ${accountItems.map(item => `
            <button class="feature-menu-card" data-profile-action="${item.id}" data-route="${item.route || ''}">
              <div class="premium-icon-box">${window.__icons?.[item.icon]}</div>
              <div>
                <strong>${t(`profilePage.account_items.${item.id}.title`)}</strong>
                <p>${t(`profilePage.account_items.${item.id}.desc`)}</p>
              </div>
              <span>${t(`profilePage.account_items.${item.id}.tier`)}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="section pt-0">
        <h3 class="section-title mb-3">${t('profilePage.settings')}</h3>
        <div class="profile-settings-list">
          ${settingsItems.map(item => `
            <button class="profile-settings-row" data-route="${item.route}">
              <div class="premium-icon-box">${window.__icons?.[item.icon]}</div>
              <strong>${t(`profilePage.settings_items.${item.id}`)}</strong>
              ${item.valueKey ? `<span>${t(item.valueKey)}</span>` : window.__icons?.chevronRight}
            </button>
          `).join('')}
        </div>

        <button class="btn btn-ghost btn-full text-danger mt-4 font-semibold" id="btnLogout">${t('profile.logout')}</button>
      </div>

      <div style="height: 86px;"></div>
    </div>
  `;
}

export function afterRender() {
  document.querySelectorAll('[data-profile-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.route) {
        navigate(btn.dataset.route);
        return;
      }
    });
  });

  document.querySelectorAll('.profile-settings-row').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.route));
  });

  document.getElementById('btnPlan')?.addEventListener('click', () => navigate('/profile/plan'));
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    setState({ user: { isLoggedIn: false } });
    navigate('/auth/splash');
  });
}
