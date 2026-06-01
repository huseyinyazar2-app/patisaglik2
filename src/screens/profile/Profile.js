import { navigate } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';

const accountItems = [
  { id: 'passport', icon: 'shield', title: 'Pet Sağlık Pasaportu', desc: 'Profil, kayıtlar, ölçümler, belgeler, QR ve masraflar tek yerde', route: '/profile/passport', tier: 'Ücretsiz' },
  { id: 'pets', icon: 'paw', title: 'Pet Profilleri', desc: 'Çoklu pet paneli ve gönüllü/sokak profilleri', route: '/pets/select', tier: 'Free / Pro' },
  { id: 'volunteer', icon: 'search', title: 'Gönüllü Ağı', desc: 'Sokak ve geçici yuva profilleri için konum paneli', route: '/profile/volunteer-network', tier: 'Ücretsiz' },
  { id: 'qr', icon: 'shield', title: 'QR Sağlık Kartı', desc: 'Acil durumda paylaşılabilir kısa sağlık kartı', route: '/feature/qr', tier: 'Ücretsiz' },
  { id: 'sitter', icon: 'profile', title: 'Bakıcı Modu / Paylaşım', desc: 'Aile veya pet sitter için sınırlı erişim', route: '/feature/sitter', tier: 'Pro' },
  { id: 'senior', icon: 'heartPulse', title: 'Yaşlı Pet Modu', desc: 'Su, kilo, ağrı ve hareket hassasiyetleri', route: '/feature/senior', tier: 'Ücretsiz' }
];

const settingsItems = [
  { id: 'account', icon: 'profile', title: 'Hesap Bilgileri', route: '/profile/account' },
  { id: 'devices', icon: 'kit', title: 'Cihazlarım', route: '/profile/devices' },
  { id: 'privacy', icon: 'lock', title: 'Gizlilik ve Veri', route: '/profile/privacy' },
  { id: 'notifications', icon: 'bell', title: 'Bildirimler', route: '/profile/notifications' },
  { id: 'language', icon: 'message', title: 'Dil', route: '/profile/language', value: 'Türkçe' }
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
          <div class="premium-screen-kicker">Hesap</div>
          <h1>${user.name}</h1>
          <p>${user.phone || user.email || 'Telefon bilgisi bekleniyor'}</p>
        </div>
        <span>${plan}</span>
      </div>

      <div class="section pt-0">
        ${profileMissing ? `
          <div class="info-box warning mb-3">
            <span class="info-box-icon">${window.__icons?.alert}</span>
            <span>Telefon ve il/ilçe bilgilerini tamamlayın; acil yönlendirme ve bildirimler daha doğru çalışır.</span>
          </div>
        ` : ''}
        <div class="profile-plan-card">
          <div>
            <strong>Ücretsiz ve premium alanlar ayrıldı</strong>
            <p>Günlük kayıtlar ve ham belge arşivi ücretsiz; AI analiz, OCR okuma ve paylaşım yetkileri kredi/Pro alanında.</p>
          </div>
          <button class="btn btn-sm btn-primary" id="btnPlan">Plan</button>
        </div>
      </div>

      <div class="section pt-0">
        <h3 class="section-title mb-3">Sağlık Paylaşımı</h3>
        <div class="feature-menu-list">
          ${accountItems.map(item => `
            <button class="feature-menu-card" data-profile-action="${item.id}" data-route="${item.route || ''}">
              <div class="premium-icon-box">${window.__icons?.[item.icon]}</div>
              <div>
                <strong>${item.title}</strong>
                <p>${item.desc}</p>
              </div>
              <span>${item.tier}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="section pt-0">
        <h3 class="section-title mb-3">Ayarlar</h3>
        <div class="profile-settings-list">
          ${settingsItems.map(item => `
            <button class="profile-settings-row" data-route="${item.route}">
              <div class="premium-icon-box">${window.__icons?.[item.icon]}</div>
              <strong>${item.title}</strong>
              ${item.value ? `<span>${item.value}</span>` : window.__icons?.chevronRight}
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
