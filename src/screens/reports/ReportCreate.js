import { navigate, goBack } from '../../router.js';
import { t } from '../../i18n/tr.js';

const reportActions = [
  {
    id: 'clinic-export',
    icon: 'briefcase',
    title: 'Klinik / sigorta dosyası',
    desc: 'Pet profili, sağlık kayıtları, masraflar ve ölçümleri tek indirilebilir dosyada toparla.',
    route: '/feature/clinic-export',
    badge: 'Ücretsiz'
  },
  {
    id: 'vet-prep',
    icon: 'stethoscope',
    title: 'Veteriner ziyaret hazırlığı',
    desc: 'Ziyaret nedeni, sorular ve yanında götürülecekleri canlı belge arşivine kaydet.',
    route: '/feature/vet-prep',
    badge: 'Ücretsiz'
  },
  {
    id: 'document-ai',
    icon: 'upload',
    title: 'Belge / tahlil / fatura AI okuma',
    desc: 'Belgeyi kaydet, OCR/AI ayrıştırma için hedef alanları ve görünen kritik değerleri işaretle.',
    route: '/feature/document-ai',
    badge: 'AI hazır'
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
            <strong>Dosya türünü seç</strong>
            <p>Ücretsiz kayıtlar canlı arşive yazılır; rapor paylaşımı linktir, AI/OCR ise server katmanı hazır olunca belgeyi işleyecek.</p>
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
                <strong>${item.title}</strong>
                <p>${item.desc}</p>
              </div>
              <span>${item.badge}</span>
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
