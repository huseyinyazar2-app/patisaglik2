// Pet Help — Login Screen
import { navigate } from '../../router.js';
import { getState, setActivePet, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { showToast } from '../../ui/toast.js';
import { saveLocalUserProfile } from '../../services/users.js';
import { loginAccount } from '../../services/apiClient.js';
import { getPets } from '../../services/pets.js';

function canUseLocalAuthFallback(error) {
  return /db_not_configured|not_found|http_404|Failed to fetch|Unexpected token/i.test(String(error?.message || error || ''));
}

export function render(params = {}, query = {}) {
  const state = getState();

  return `
    <div class="screen auth-screen">
      <div class="version-badge">${state.version}</div>

      <div class="auth-header" style="animation: fadeIn 0.5s ease both;">
        <div class="auth-visual auth-visual-login" aria-hidden="true"></div>
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
  document.getElementById('login-submit-btn')?.addEventListener('click', async () => {
    const phone = document.getElementById('login-phone')?.value?.trim();
    const password = document.getElementById('login-password')?.value;

    if (!phone || !password) {
      // Shake the button for feedback
      const btn = document.getElementById('login-submit-btn');
      btn?.classList.add('shake');
      setTimeout(() => btn?.classList.remove('shake'), 400);
      return;
    }

    const btn = document.getElementById('login-submit-btn');
    const originalText = btn?.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = t('pets.saving');
    }

    let profile;
    let localDataReset = false;
    try {
      const result = await loginAccount({ phone, password });
      profile = saveLocalUserProfile(result.user || { phone });
    } catch (error) {
      if (!canUseLocalAuthFallback(error)) {
        showToast(error.message || t('auth.login_failed'));
        if (btn) {
          btn.disabled = false;
          btn.textContent = originalText;
        }
        return;
      }
      profile = saveLocalUserProfile({ phone });
    }
    localDataReset = Boolean(profile.localDataReset);
    delete profile.localDataReset;
    setState(s => {
      if (localDataReset) {
        s.activePetId = null;
        s.followups = [];
        s.session = {
          id: null,
          petId: null,
          complaintText: '',
          selectedChips: [],
          duration: null,
          severity: null,
          categories: [],
          secondaryCategories: [],
          redFlagAnswers: {},
          questionAnswers: {},
          tasks: [],
          measurements: [],
          media: [],
          riskLevel: null,
          riskScore: null,
          status: 'draft'
        };
      }
      s.user = { ...s.user, ...profile, isLoggedIn: true };
    });
    try {
      const pets = await getPets({ userId: profile.id || 'user-1' });
      if (pets.length) {
        setActivePet(pets[0].id);
        navigate('/home');
      } else {
        navigate('/pets/select');
      }
    } catch {
      navigate('/pets/select');
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  document.getElementById('login-forgot')?.addEventListener('click', () => {
    // Could navigate to a forgot password screen in the future
    showToast(t('auth.forgot'));
  });

  document.getElementById('login-register-link')?.addEventListener('click', () => {
    navigate('/auth/register');
  });
}
