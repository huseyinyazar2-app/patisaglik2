// Pati Sağlık — Legacy Session Compatibility Screen
import { navigate, goBack } from '../../router.js';
import { getState } from '../../store.js';

function icon(name, size = 22) {
  const svg = window.__icons?.[name] || '';
  return svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
}

export function render() {
  const state = getState();

  return `
    <div class="screen">
      <div class="header">
        <div class="header-left">
          <button class="header-back" id="backBtn">${icon('back', 22)}</button>
        </div>
        <div class="header-title">Eski Kontrol Kaydı</div>
        <div class="header-right"></div>
      </div>

      <div class="screen-padded">
        <div class="summary-section">
          <div class="premium-icon-box mb-3">${icon('shield', 30)}</div>
          <div>
            <div class="summary-section-title">Canlı Arşiv Uyumluluğu</div>
            <h2 class="mb-2">Bu bağlantı eski kontrol ekranına ait</h2>
            <p class="text-tertiary">
              Eski AI kontrol oturumları artık ücretsiz sağlık arşivinde sahte veriyle gösterilmiyor.
              Kayıtlarınızı zaman çizelgesi veya sağlık kayıtları ekranından takip edebilirsiniz.
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-3 mt-4">
          <button class="btn btn-primary btn-full" id="timelineBtn">
            ${icon('clock', 20)}
            Zaman Çizelgesi
          </button>
          <button class="btn btn-secondary btn-full" id="healthRecordsBtn">
            ${icon('heartPulse', 20)}
            Sağlık Kayıtları
          </button>
        </div>
      </div>

      <div class="version-badge">${state.version}</div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('backBtn')?.addEventListener('click', () => goBack());
  document.getElementById('timelineBtn')?.addEventListener('click', () => navigate('/history/timeline'));
  document.getElementById('healthRecordsBtn')?.addEventListener('click', () => navigate('/history/health-records'));
}
