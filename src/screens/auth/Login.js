// Pati Sağlık — Login Screen
import { navigate } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { showToast } from '../../ui/toast.js';
import { saveLocalUserProfile } from '../../services/users.js';

export function render(params = {}, query = {}) {
  const state = getState();

  return `
    <div class="screen auth-screen">
      <div class="version-badge">${state.version}</div>

      <div class="auth-header" style="animation: fadeIn 0.5s ease both;">
        <div class="auth-visual auth-visual-care" aria-hidden="true"></div>
        <h1 class="auth-title">${t('auth.login_title')}</h1>
        <p class="auth-subtitle">${t('auth.login_subtitle')}</p>
      </div>

      <div class="auth-form" style="animation: slideUp 0.5s ease 0.15s both;">
        <div class="form-group">
          <label for="login-phone">Telefon</label>
          <input type="tel" id="login-phone" placeholder="+90 5xx xxx xx xx" autocomplete="tel" />
        </div>

        <div class="form-group">
          <label for="login-password">${t('auth.password')}</label>
          <input type="password" id="login-password" placeholder="${t('auth.password')}" autocomplete="current-password" />
        </div>

        <div style="text-align: right; margin-bottom: var(--space-4);">
          <a href="javascript:void(0)" id="login-forgot" class="text-sm text-primary-color font-semibold">
            ${t('auth.forgot')}
          </a>
        </div>

        <button id="login-submit-btn" class="btn btn-primary btn-lg btn-full btn-pill">
          ${t('auth.login_btn')}
        </button>

      </div>

      <div class="auth-footer" style="animation: fadeIn 0.5s ease 0.35s both;">
        ${t('auth.no_account')} <a href="javascript:void(0)" id="login-register-link">${t('auth.register_link')}</a>
      </div>
    </div>
  `;
}

export function afterRender(params = {}, query = {}) {
  document.getElementById('login-submit-btn')?.addEventListener('click', () => {
    const phone = document.getElementById('login-phone')?.value?.trim();
    const password = document.getElementById('login-password')?.value;

    if (!phone || !password) {
      // Shake the button for feedback
      const btn = document.getElementById('login-submit-btn');
      btn?.classList.add('shake');
      setTimeout(() => btn?.classList.remove('shake'), 400);
      return;
    }

    // Simulate login success
    const profile = saveLocalUserProfile({ phone });
    setState(s => {
      s.user = { ...s.user, ...profile, isLoggedIn: true };
    });
    navigate('/home');
  });

  document.getElementById('login-forgot')?.addEventListener('click', () => {
    // Could navigate to a forgot password screen in the future
    showToast(t('auth.forgot'));
  });

  document.getElementById('login-register-link')?.addEventListener('click', () => {
    navigate('/auth/register');
  });
}
