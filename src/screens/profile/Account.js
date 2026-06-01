import { goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { getLocalUserProfile, saveUserProfile } from '../../services/users.js';
import { showToast } from '../../ui/toast.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function value(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

export function render() {
  const state = getState();
  const profile = getLocalUserProfile(state.user);

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">Hesap Bilgileri</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.profile}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero teal">
          <div class="premium-icon-box">${window.__icons?.profile}</div>
          <div>
            <div class="premium-screen-kicker">Telefon öncelikli profil</div>
            <h1>İletişim ve konum</h1>
            <p>Acil yönlendirme, bildirim ve yerel ayarlar için temel hesap bilgileri.</p>
          </div>
        </div>

        <div class="feature-form-card">
          <label class="feature-field">
            <span>Telefon</span>
            <input id="accountPhone" type="tel" autocomplete="tel" placeholder="+90 5xx xxx xx xx" value="${escapeHtml(profile.phone)}" />
          </label>

          <label class="feature-field">
            <span>Ad soyad</span>
            <input id="accountName" autocomplete="name" placeholder="Ad Soyad" value="${escapeHtml(profile.name)}" />
          </label>

          <label class="feature-field">
            <span>E-posta</span>
            <input id="accountEmail" type="email" autocomplete="email" placeholder="Opsiyonel" value="${escapeHtml(profile.email)}" />
          </label>

          <div class="feature-photo-pair">
            <label class="feature-field">
              <span>Ülke</span>
              <input id="accountCountry" autocomplete="country-name" value="${escapeHtml(profile.location.country)}" />
            </label>
            <label class="feature-field">
              <span>İl</span>
              <input id="accountProvince" autocomplete="address-level1" placeholder="İstanbul" value="${escapeHtml(profile.location.province)}" />
            </label>
          </div>

          <div class="feature-photo-pair">
            <label class="feature-field">
              <span>İlçe</span>
              <input id="accountDistrict" autocomplete="address-level2" placeholder="Kadıköy" value="${escapeHtml(profile.location.district)}" />
            </label>
            <label class="feature-field">
              <span>Mahalle</span>
              <input id="accountNeighborhood" placeholder="Moda" value="${escapeHtml(profile.location.neighborhood)}" />
            </label>
          </div>

          <div class="feature-photo-pair">
            <label class="feature-field">
              <span>Dil</span>
              <input id="accountLocale" value="${escapeHtml(profile.locale)}" />
            </label>
            <label class="feature-field">
              <span>Saat dilimi</span>
              <input id="accountTimezone" value="${escapeHtml(profile.timezone)}" />
            </label>
          </div>
        </div>

        <div class="info-box info mt-3">
          <span class="info-box-icon">${window.__icons?.shield}</span>
          <span>Konum mahalle düzeyinde tutulur; klinik/yakın destek yönlendirmesi için kullanılır. Hassas canlı konum paylaşımı bu formda alınmaz.</span>
        </div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnSaveAccount">Kaydet</button>
          <button class="btn btn-ghost btn-full" id="btnCancel">Vazgeç</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnCancel')?.addEventListener('click', () => goBack());

  document.getElementById('btnSaveAccount')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const phone = value('accountPhone');
    if (!phone) {
      document.getElementById('accountPhone')?.focus();
      showToast('Telefon ana giriş bilgisi olarak gereklidir.');
      return;
    }

    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Kaydediliyor...';

    try {
      const state = getState();
      const result = await saveUserProfile({
        userId: state.user?.id || 'user-1',
        profile: {
          phone,
          name: value('accountName') || state.user?.name || 'Kullanıcı',
          email: value('accountEmail'),
          locale: value('accountLocale') || 'tr',
          timezone: value('accountTimezone') || 'Europe/Istanbul',
          location: {
            country: value('accountCountry') || 'Türkiye',
            province: value('accountProvince'),
            district: value('accountDistrict'),
            neighborhood: value('accountNeighborhood')
          }
        }
      });

      setState(current => {
        current.user = { ...current.user, ...result.profile, isLoggedIn: true };
      });
      showToast('Hesap bilgileri kaydedildi.');
      goBack();
    } catch (err) {
      showToast(`Hesap kaydedilemedi: ${err.message}`);
      button.disabled = false;
      button.textContent = original;
    }
  });
}
