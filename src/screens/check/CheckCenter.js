import { navigate } from '../../router.js';
import { getState, resetSession } from '../../store.js';
import { getActivePet } from '../../mock/pets.js';

const premiumAssistants = [
  {
    id: 'smart',
    icon: 'spark',
    title: 'Akıllı Şikayet Kontrolü',
    desc: 'Semptomları analiz eder, aciliyet riskini ve kanıt görevlerini çıkarır.',
    action: 'Başlat',
    featured: true
  },
  {
    id: 'knowledge',
    icon: 'shield',
    title: 'Acil Bilgi Bankası',
    desc: 'Tedavi önerisi vermeden; neyi yapmamak, neyi hazırlamak ve ne zaman acile gitmek gerektiğini gösterir.',
    action: 'Aç',
    free: true
  },
  {
    id: 'toxic',
    icon: 'alert',
    title: 'Ambalaj Risk Kontrolü',
    desc: 'Ambalaj fotoğrafı, ürün adı ve içerik metniyle kontrollü toksik/yabancı cisim risk taraması yapar.',
    action: 'Kontrol et',
    danger: true
  },
  {
    id: 'safety',
    icon: 'shield',
    title: 'Ürün Güvenlik Radarı',
    desc: 'Mama, takviye, ilaç veya bakım ürününde recall/lot güvenlik sinyali arar; toksik yutma akışından ayrıdır.',
    action: 'Tara',
    free: true
  },
  {
    id: 'document',
    icon: 'upload',
    title: 'Belge OCR / AI Okuma',
    desc: 'Ham belge arşivi Raporlar sekmesinde hazır; otomatik okuma sonraki AI fazında bağlanacak.',
    action: 'Sonraki faz',
    disabled: true
  },
  {
    id: 'vetprep',
    icon: 'clipboard',
    title: 'Kliniğe Hazırlık Ön Dosyası',
    desc: 'Ziyaret öncesi soruları toparlar, veteriner için net özet üretir.',
    action: 'Hazırla'
  }
];

export function render() {
  const state = getState();
  const pet = getActivePet(state.activePetId);

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left"></div>
        <div class="header-title">Pati AI</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.spark}</span>
        </div>
      </div>

      <div class="section pt-4">
        <div class="ai-premium-hero">
          <div>
            <div class="premium-screen-kicker">Kredi / Premium Alanı</div>
            <h1>Veteriner öncesi AI triyaj</h1>
            <p>${pet.name} için semptom analizi, belge okuma ve klinik hazırlık modülleri burada çalışır.</p>
          </div>
          <div class="ai-credit-pill">
            <strong>${state.subscription?.tier === 'pro' ? 'PRO' : 'FREE'}</strong>
            <span>Plan</span>
          </div>
        </div>
      </div>

      <div class="section pt-0">
        <div class="ai-free-note">
          <span>${window.__icons?.lock}</span>
          <p>Ücretsiz takip, takvim, masraf, dışkı skoru ve günlük kayıtlar Ana Sayfa ile Geçmiş sekmelerinde kalır.</p>
        </div>
      </div>

      <div class="section pt-0">
        <h3 class="section-title mb-3">Premium AI Modülleri</h3>
        <div class="ai-assistant-list">
          ${premiumAssistants.map(item => `
            <button class="ai-assistant-card ${item.featured ? 'featured' : ''} ${item.danger ? 'danger' : ''} ${item.free ? 'free' : ''}" data-assistant="${item.id}" ${item.disabled ? 'disabled aria-disabled="true"' : ''}>
              <div class="premium-icon-box">${window.__icons?.[item.icon]}</div>
              <div>
                <strong>${item.title}</strong>
                <p>${item.desc}</p>
                <span>${item.action}</span>
              </div>
            </button>
          `).join('')}
        </div>
      </div>

      <div style="height: 86px;"></div>
    </div>
  `;
}

export function afterRender() {
  const handlers = {
    smart: () => {
      resetSession();
      navigate('/check/new/complaint');
    },
    knowledge: () => {
      navigate('/check/knowledge');
    },
    toxic: () => {
      navigate('/check/package-risk');
    },
    safety: () => {
      navigate('/check/safety-radar');
    },
    document: () => {},
    vetprep: () => {
      navigate('/feature/vet-prep');
    }
  };

  document.querySelectorAll('[data-assistant]').forEach(btn => {
    if (btn.disabled) return;
    btn.addEventListener('click', () => handlers[btn.dataset.assistant]?.());
  });
}
