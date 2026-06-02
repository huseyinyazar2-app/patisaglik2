import { goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { getLocalUserProfile, saveUserProfile } from '../../services/users.js';
import { showToast } from '../../ui/toast.js';
import { setLocale, supportedLocales, t } from '../../i18n/tr.js';

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

function localeOptions(currentLocale) {
  return supportedLocales
    .map(locale => `<option value="${locale.code}" ${currentLocale === locale.code ? 'selected' : ''}>${escapeHtml(locale.nativeName)} (${escapeHtml(locale.englishName)})</option>`)
    .join('');
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
        <div class="header-title">${t('account.title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.profile}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero teal">
          <div class="premium-icon-box">${window.__icons?.profile}</div>
          <div>
            <div class="premium-screen-kicker">${t('account.kicker')}</div>
            <h1>${t('account.heading')}</h1>
            <p>${t('account.desc')}</p>
          </div>
        </div>

        <div class="feature-form-card">
          <label class="feature-field">
            <span>${t('account.phone')}</span>
            <input id="accountPhone" type="tel" autocomplete="tel" placeholder="+90 5xx xxx xx xx" value="${escapeHtml(profile.phone)}" />
          </label>

          <label class="feature-field">
            <span>${t('account.full_name')}</span>
            <input id="accountName" autocomplete="name" placeholder="${t('account.full_name')}" value="${escapeHtml(profile.name)}" />
          </label>

          <label class="feature-field">
            <span>${t('account.email')}</span>
            <input id="accountEmail" type="email" autocomplete="email" placeholder="${t('account.optional')}" value="${escapeHtml(profile.email)}" />
          </label>

          <div class="feature-photo-pair">
            <label class="feature-field">
              <span>${t('account.country')}</span>
              <input id="accountCountry" autocomplete="country-name" value="${escapeHtml(profile.location.country)}" />
            </label>
            <label class="feature-field">
              <span>${t('account.province')}</span>
              <input id="accountProvince" autocomplete="address-level1" placeholder="${t('account.province_placeholder')}" value="${escapeHtml(profile.location.province)}" />
            </label>
          </div>

          <div class="feature-photo-pair">
            <label class="feature-field">
              <span>${t('account.district')}</span>
              <input id="accountDistrict" autocomplete="address-level2" placeholder="${t('account.district_placeholder')}" value="${escapeHtml(profile.location.district)}" />
            </label>
            <label class="feature-field">
              <span>${t('account.neighborhood')}</span>
              <input id="accountNeighborhood" placeholder="Moda" value="${escapeHtml(profile.location.neighborhood)}" />
            </label>
          </div>

          <div class="feature-photo-pair">
            <label class="feature-field">
              <span>${t('account.language')}</span>
              <select id="accountLocale">
                ${localeOptions(profile.locale || 'tr')}
              </select>
            </label>
            <label class="feature-field">
              <span>${t('account.timezone')}</span>
              <input id="accountTimezone" value="${escapeHtml(profile.timezone)}" />
            </label>
          </div>
        </div>

        <div class="info-box info mt-3">
          <span class="info-box-icon">${window.__icons?.shield}</span>
          <span>${t('account.privacy_note')}</span>
        </div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnSaveAccount">${t('common.save')}</button>
          <button class="btn btn-ghost btn-full" id="btnCancel">${t('common.cancel')}</button>
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
      showToast(t('account.phone_required'));
      return;
    }

    const original = button.textContent;
    button.disabled = true;
    button.textContent = t('account.saving');

    try {
      const state = getState();
      const result = await saveUserProfile({
        userId: state.user?.id || 'user-1',
        profile: {
          phone,
          name: value('accountName') || state.user?.name || t('userDefaults.name'),
          email: value('accountEmail'),
          locale: value('accountLocale') || 'tr',
          timezone: value('accountTimezone') || 'Europe/Istanbul',
          location: {
            country: value('accountCountry') || t('userDefaults.country'),
            province: value('accountProvince'),
            district: value('accountDistrict'),
            neighborhood: value('accountNeighborhood')
          }
        }
      });

      setState(current => {
        current.user = { ...current.user, ...result.profile, isLoggedIn: true };
      });
      setLocale(value('accountLocale') || 'tr');
      showToast(t('account.saved'));
      goBack();
    } catch (err) {
      showToast(`${t('account.save_failed')}: ${err.message}`);
      button.disabled = false;
      button.textContent = original;
    }
  });
}
