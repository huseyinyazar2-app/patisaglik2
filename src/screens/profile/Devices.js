import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';

const DEVICE_STATUS_KEY = 'pati_basic_kit_status';

function readDeviceStatus() {
  try {
    return JSON.parse(localStorage.getItem(DEVICE_STATUS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveDeviceMode(mode) {
  localStorage.setItem('pati_device_mode', mode);
  setState({ deviceMode: mode });
}

function formatStatusDate(value) {
  if (!value) return t('devicesScreen.not_tested');
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export function render(params = {}, query = {}) {
  const state = getState();
  const hasKit = state.deviceMode === 'basic_kit';
  const kitStatus = readDeviceStatus();

  return `
    <div class="screen bg-gray-50">
      <div class="header bg-white">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('profile.my_devices')}</div>
        <div class="header-right"></div>
      </div>
      
      <div class="section pt-6 pb-24">
        
        <div class="card p-5 mb-6 text-center ${hasKit ? 'bg-secondary-50 border-secondary' : 'bg-white border-border-color'} border-2 transition-all">
          <div class="modern-device-hero">${hasKit ? window.__icons?.kit : window.__icons?.profile}</div>
          <h2 class="font-bold text-lg mb-1">${hasKit ? t('profile.device_kit') : t('profile.device_phone')}</h2>
          <p class="text-sm text-secondary">${hasKit ? t('devicesScreen.kit_active_desc') : t('devicesScreen.phone_desc')}</p>
          <p class="text-xs text-tertiary mt-2" id="kitStatusText">${t('devicesScreen.last_test', { value: formatStatusDate(kitStatus.checkedAt) })}</p>
        </div>
        
        <div class="bg-white rounded-xl shadow-sm border border-border-color overflow-hidden mb-6">
          <div class="p-4 border-b border-border-color bg-gray-50 font-bold text-sm">
            ${t('profile.kit_info')}
          </div>
          <div class="p-4">
            <div class="flex items-start gap-3 mb-4">
              <div class="modern-timeline-icon">${window.__icons?.camera}</div>
              <div>
                <div class="font-semibold text-sm">${t('devicesScreen.ear_skin_camera')}</div>
                <div class="text-xs text-secondary mt-1">${t('devicesScreen.ear_skin_camera_desc')}</div>
              </div>
            </div>
            <div class="flex items-start gap-3 mb-4">
              <div class="modern-timeline-icon">${window.__icons?.thermometer}</div>
              <div>
                <div class="font-semibold text-sm">${t('devicesScreen.digital_thermometer')}</div>
                <div class="text-xs text-secondary mt-1">${t('devicesScreen.digital_thermometer_desc')}</div>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="modern-timeline-icon">${window.__icons?.activity}</div>
              <div>
                <div class="font-semibold text-sm">${t('devicesScreen.urine_strip_reader')}</div>
                <div class="text-xs text-secondary mt-1">${t('devicesScreen.urine_strip_reader_desc')}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="flex flex-col gap-3">
          ${hasKit ? `
            <button class="btn btn-outline btn-full" id="btnPhoneMode">${t('profile.phone_mode')}</button>
            <button class="btn btn-primary btn-full mt-2" id="btnTest">${t('profile.test_connection')}</button>
          ` : `
            <button class="btn btn-primary btn-full" id="btnActivateKit">
              ${window.__icons?.spark} ${t('profile.activate_kit')}
            </button>
            <button class="btn btn-ghost btn-full mt-2 text-primary text-sm font-semibold" id="btnBuyKit">${t('devicesScreen.buy_kit')}</button>
          `}
        </div>
        
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  
  document.getElementById('btnActivateKit')?.addEventListener('click', () => {
    saveDeviceMode('basic_kit');
    navigate('/profile/devices?ts=' + Date.now());
  });
  
  document.getElementById('btnPhoneMode')?.addEventListener('click', () => {
    saveDeviceMode('phone_only');
    navigate('/profile/devices?ts=' + Date.now());
  });
  
  document.getElementById('btnTest')?.addEventListener('click', () => {
    const status = {
      state: 'ready_for_native_pairing',
      checkedAt: new Date().toISOString(),
      mode: getState().deviceMode
    };
    localStorage.setItem(DEVICE_STATUS_KEY, JSON.stringify(status));
    const target = document.getElementById('kitStatusText');
    if (target) target.textContent = t('devicesScreen.last_test_ready', { value: formatStatusDate(status.checkedAt) });
  });

  document.getElementById('btnBuyKit')?.addEventListener('click', () => {
    navigate('/profile/plan');
  });
}
