// Pet Help — Register Screen
import { navigate } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { saveLocalUserProfile } from '../../services/users.js';
import { registerAccount } from '../../services/apiClient.js';
import { showToast } from '../../ui/toast.js';

function canUseLocalAuthFallback(error) {
  return /db_not_configured|not_found|http_404|Failed to fetch|Unexpected token/i.test(String(error?.message || error || ''));
}

export function render(params = {}, query = {}) {
  const state = getState();

  return `
    <div class="screen auth-screen">
      <div class="version-badge">${state.version}</div>

      <div class="auth-header" style="animation: fadeIn 0.5s ease both;">
        <div class="auth-visual auth-visual-register" aria-hidden="true"></div>
        <h1 class="auth-title">${t('auth.register_title')}</h1>
        <p class="auth-subtitle">${t('auth.register_subtitle')}</p>
      </div>

      <div class="auth-form" style="animation: slideUp 0.5s ease 0.15s both;">
        <div class="form-group">
          <label for="register-name">${t('auth.fullname')}</label>
          <input type="text" id="register-name" placeholder="${t('auth.fullname')}" autocomplete="name" />
        </div>

        <div class="form-group">
          <label for="register-phone">Telefon</label>
          <input type="tel" id="register-phone" placeholder="+90 5xx xxx xx xx" autocomplete="tel" />
        </div>

        <div class="form-group">
          <label for="register-email">${t('auth.email')} <span class="text-tertiary">(opsiyonel)</span></label>
          <input type="email" id="register-email" placeholder="${t('auth.email')}" autocomplete="email" />
        </div>

        <div class="form-group">
          <label for="register-password">${t('auth.password')}</label>
          <input type="password" id="register-password" placeholder="${t('auth.password')}" autocomplete="new-password" />
        </div>

        <div class="form-group">
          <label for="register-password-confirm">${t('auth.password_confirm')}</label>
          <input type="password" id="register-password-confirm" placeholder="${t('auth.password_confirm')}" autocomplete="new-password" />
        </div>

        <label class="auth-checkbox" id="register-terms-label">
          <input type="checkbox" id="register-terms" />
          <span>${t('auth.terms')}</span>
        </label>

        <label class="auth-checkbox" id="register-privacy-label">
          <input type="checkbox" id="register-privacy" />
          <span>${t('auth.privacy')}</span>
        </label>

        <div style="margin-top: var(--space-4);">
          <button id="register-submit-btn" class="btn btn-primary btn-lg btn-full btn-pill">
            ${t('auth.register_btn')}
          </button>
        </div>

      </div>

      <div class="auth-footer" style="animation: fadeIn 0.5s ease 0.35s both;">
        ${t('auth.has_account')} <a href="javascript:void(0)" id="register-login-link">${t('auth.login_link')}</a>
      </div>
    </div>
  `;
}

export function afterRender(params = {}, query = {}) {
  document.getElementById('register-submit-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('register-name')?.value?.trim();
    const phone = document.getElementById('register-phone')?.value?.trim();
    const email = document.getElementById('register-email')?.value?.trim();
    const password = document.getElementById('register-password')?.value;
    const passwordConfirm = document.getElementById('register-password-confirm')?.value;
    const terms = document.getElementById('register-terms')?.checked;
    const privacy = document.getElementById('register-privacy')?.checked;

    // Validate all fields
    if (!name || !phone || !password || !passwordConfirm) {
      const btn = document.getElementById('register-submit-btn');
      btn?.style.setProperty('animation', 'none');
      void btn?.offsetHeight; // reflow
      btn?.style.setProperty('animation', 'breathe 0.3s ease 2');
      return;
    }

    if (password !== passwordConfirm) {
      const confirmInput = document.getElementById('register-password-confirm');
      confirmInput?.focus();
      confirmInput?.style.setProperty('border-color', 'var(--risk-critical)');
      setTimeout(() => confirmInput?.style.removeProperty('border-color'), 2000);
      return;
    }

    if (!terms || !privacy) {
      const termsLabel = document.getElementById('register-terms-label');
      const privacyLabel = document.getElementById('register-privacy-label');
      if (!terms) termsLabel?.style.setProperty('color', 'var(--risk-critical)');
      if (!privacy) privacyLabel?.style.setProperty('color', 'var(--risk-critical)');
      setTimeout(() => {
        termsLabel?.style.removeProperty('color');
        privacyLabel?.style.removeProperty('color');
      }, 2000);
      return;
    }

    const btn = document.getElementById('register-submit-btn');
    const originalText = btn?.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = t('pets.saving');
    }

    let profile;
    try {
      const result = await registerAccount({
        name,
        phone,
        email,
        password,
        locale: state.user?.locale || 'tr',
        timezone: state.user?.timezone || 'Europe/Istanbul',
        location: state.user?.location || {}
      });
      profile = saveLocalUserProfile(result.user || { name, phone, email });
    } catch (error) {
      if (!canUseLocalAuthFallback(error)) {
        showToast(error.message || t('auth.register_failed'));
        if (btn) {
          btn.disabled = false;
          btn.textContent = originalText;
        }
        return;
      }
      profile = saveLocalUserProfile({ name, phone, email });
    }
    setState(s => {
      s.user.isLoggedIn = true;
      s.user = { ...s.user, ...profile, isLoggedIn: true };
    });
    navigate('/pets/new');
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  document.getElementById('register-login-link')?.addEventListener('click', () => {
    navigate('/auth/login');
  });
}
