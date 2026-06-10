// Pet Help — Splash Screen
import { navigate } from '../../router.js';
import { getState, setActivePet } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { getPets } from '../../services/pets.js';

export function render(params = {}, query = {}) {
  const state = getState();

  return `
    <div class="screen splash-screen">
      <div class="version-badge">${state.version}</div>

      <div class="splash-logo auth-visual auth-visual-splash" style="animation: bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);" aria-hidden="true"></div>

      <h1 class="splash-title" style="animation: fadeIn 0.6s ease 0.25s both;">
        ${t('app.name')}
      </h1>

      <p class="splash-subtitle" style="animation: fadeIn 0.6s ease 0.45s both;">
        ${t('app.tagline')}
      </p>

      <div class="splash-actions" style="animation: slideUp 0.5s ease 0.6s both;">
        <button id="splash-start-btn" class="btn btn-primary btn-lg btn-full btn-pill">
          ${t('splash.start')}
        </button>
        <button id="splash-login-btn" class="btn btn-outline btn-lg btn-full btn-pill">
          ${t('splash.login')}
        </button>
      </div>
    </div>
  `;
}

export function afterRender(params = {}, query = {}) {
  const state = getState();
  if (state.user?.isLoggedIn) {
    if (state.user.accountRole === 'vet_live') {
      setTimeout(() => navigate('/vet-live/vet'), 250);
      return;
    }
    setTimeout(async () => {
      if (getState().activePetId) {
        navigate('/home');
        return;
      }
      try {
        const pets = await getPets({ userId: state.user.id || 'user-1' });
        if (pets.length) {
          setActivePet(pets[0].id);
          navigate('/home');
        } else {
          navigate('/pets/select');
        }
      } catch {
        navigate('/pets/select');
      }
    }, 250);
  }

  document.getElementById('splash-start-btn')?.addEventListener('click', () => {
    navigate('/auth/onboarding');
  });

  document.getElementById('splash-login-btn')?.addEventListener('click', () => {
    navigate('/auth/login');
  });
}
