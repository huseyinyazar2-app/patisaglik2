// Pati Sağlık — Device Mode Screen
import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';

const deviceOptions = [
  {
    id: 'phone_only',
    iconKey: 'home',
    titleKey: 'pets.phone_only',
    descKey: 'pets.phone_only_desc',
    bgColor: 'var(--primary-100)'
  },
  {
    id: 'basic_kit',
    iconKey: 'stethoscope',
    titleKey: 'pets.basic_kit',
    descKey: 'pets.basic_kit_desc',
    bgColor: 'var(--teal-50)'
  },
  {
    id: 'later',
    iconKey: 'clock',
    titleKey: 'pets.device_later',
    descKey: 'pets.device_later_desc',
    bgColor: 'var(--secondary-50)'
  }
];

export function render(params = {}, query = {}) {
  const state = getState();

  return `
    <div class="screen">
      <div class="version-badge">${state.version}</div>

      <div class="header">
        <div class="header-left">
          <button class="header-back" id="device-back">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('pets.add_title')}</div>
        <div class="header-right"></div>
      </div>

      <div class="screen-padded">
        <div style="text-align: center; margin-bottom: var(--space-6); animation: fadeIn 0.4s ease both;">
          <h2 style="font-size: var(--font-size-xl); font-weight: 800; margin-bottom: var(--space-2);">
            ${t('pets.device_title')}
          </h2>
          <p style="font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6; max-width: 320px; margin: 0 auto;">
            ${t('pets.device_desc')}
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-3); animation: slideUp 0.5s ease 0.15s both;">
          ${deviceOptions.map((option, i) => `
            <button type="button" class="device-option-card" id="device-option-${option.id}" data-device="${option.id}" style="animation: slideInRight 0.4s ease ${0.1 + i * 0.1}s both;">
              <div class="device-option-icon" style="background: ${option.bgColor};">
                ${window.__icons?.[option.iconKey]}
              </div>
              <div>
                <div class="device-option-title">${t(option.titleKey)}</div>
                <div class="device-option-desc">${t(option.descKey)}</div>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}, query = {}) {
  // Back button
  document.getElementById('device-back')?.addEventListener('click', () => {
    goBack();
  });

  // Device option cards
  const cards = document.querySelectorAll('.device-option-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const deviceMode = card.dataset.device;

      // Visual feedback — select clicked card
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      // Save device mode to state
      const storeMode = deviceMode === 'later' ? 'phone_only' : deviceMode;
      setState(s => {
        s.deviceMode = storeMode;
      });
      localStorage.setItem('pati_device_mode', storeMode);

      // Small delay for visual feedback before navigating
      setTimeout(() => {
        navigate('/home');
      }, 250);
    });
  });
}
