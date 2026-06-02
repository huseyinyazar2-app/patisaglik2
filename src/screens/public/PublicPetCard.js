import { navigate } from '../../router.js';
import { t, translateForLocale } from '../../i18n/tr.js';
import { getPetByPublicToken } from '../../services/pets.js';
import { showToast } from '../../ui/toast.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function listValue(items, empty = t('publicPetCard.not_shared')) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  return values.length ? values.map(escapeHtml).join(', ') : empty;
}

function speciesLabel(type) {
  return t(`pets.${type}`) === `pets.${type}` ? type : t(`pets.${type}`);
}

function canShow(sharedFields, label) {
  return !sharedFields.length || sharedFields.includes(label);
}

function mapUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function infoRow(icon, title, value) {
  return `
    <div class="public-card-row">
      <span class="public-card-icon">${window.__icons?.[icon] || window.__icons?.shield}</span>
      <div>
        <small>${escapeHtml(title)}</small>
        <strong>${value}</strong>
      </div>
    </div>
  `;
}

function renderPetCard(pet, token) {
  const card = pet.qrHealthCard || {};
  const sharedFields = Array.isArray(card.shared_fields) ? card.shared_fields : [];
  const publicUrl = `${window.location.origin}${window.location.pathname}#/public/pet/${token}`;
  const canShareLocation = pet.location && ['stray', 'foster'].includes(pet.ownership);

  const rows = [
    canShow(sharedFields, translateForLocale('tr', 'publicPetCard.field_name_type')) ? infoRow('paw', 'Pet', `${escapeHtml(pet.name)} · ${escapeHtml(speciesLabel(pet.type))}${pet.breed ? ` · ${escapeHtml(pet.breed)}` : ''}`) : '',
    infoRow('weight', t('publicPetCard.weight'), `${Number(pet.weight || 0).toLocaleString('tr-TR')} kg`),
    canShareLocation ? infoRow('search', t('publicPetCard.care_location'), escapeHtml(pet.location)) : '',
    canShow(sharedFields, translateForLocale('tr', 'publicPetCard.field_chronic')) ? infoRow('clipboard', t('publicPetCard.chronic'), listValue(pet.chronicDiseases)) : '',
    canShow(sharedFields, translateForLocale('tr', 'publicPetCard.field_allergies')) ? infoRow('alert', t('publicPetCard.allergies'), listValue(pet.allergies)) : '',
    canShow(sharedFields, translateForLocale('tr', 'publicPetCard.field_medications')) ? infoRow('stethoscope', t('publicPetCard.medications'), listValue(pet.medications)) : '',
    pet.rawHistory ? infoRow('note', t('publicPetCard.short_note'), escapeHtml(pet.rawHistory)) : '',
    canShow(sharedFields, translateForLocale('tr', 'publicPetCard.field_owner_contact')) && pet.ownerEmail ? infoRow('profile', t('publicPetCard.owner_contact'), `${escapeHtml(pet.ownerName || t('publicPetCard.owner'))} · ${escapeHtml(pet.ownerEmail)}`) : ''
  ].filter(Boolean).join('');

  return `
    <div class="screen public-card-screen">
      <div class="public-card-shell">
        <div class="public-card-hero">
          <div>
            <div class="premium-screen-kicker">${t('publicPetCard.kicker')}</div>
            <h1>${escapeHtml(pet.name)}</h1>
            <p>${escapeHtml(speciesLabel(pet.type))}${pet.breed ? ` · ${escapeHtml(pet.breed)}` : ''}${pet.age ? ` · ${escapeHtml(pet.age)}` : ''}</p>
          </div>
          <span class="public-card-badge">${window.__icons?.shield}</span>
        </div>

        <div class="public-card-notice">
          <strong>${t('publicPetCard.not_vet')}</strong>
          <span>${t('publicPetCard.notice')}</span>
        </div>

        <div class="public-card-panel">
          ${rows || `<div class="empty-state-desc">${t('publicPetCard.no_rows')}</div>`}
        </div>

        <div class="public-card-meta">
          <span>${t('publicPetCard.access', { value: escapeHtml(card.access_duration || t('common.not_specified')) })}</span>
          <span>${t('publicPetCard.updated', { value: card.updated_at ? new Date(card.updated_at).toLocaleDateString('tr-TR') : '-' })}</span>
        </div>

        <div class="public-card-actions">
          ${canShareLocation ? `<button class="btn btn-secondary btn-full" id="btnOpenPublicMap" data-map-location="${escapeHtml(pet.location)}">${t('publicPetCard.open_map')}</button>` : ''}
          <button class="btn btn-primary btn-full" id="btnSharePublicCard">${t('common.share')}</button>
          <button class="btn btn-outline btn-full" id="btnCopyPublicCard">${t('publicPetCard.copy_link')}</button>
          <button class="btn btn-ghost btn-full" id="btnOpenApp">${t('publicPetCard.open_app')}</button>
        </div>
        <input id="publicCardUrl" value="${escapeHtml(publicUrl)}" readonly />
      </div>
    </div>
  `;
}

export function render() {
  return `
    <div class="screen public-card-screen">
      <div class="public-card-shell">
        <div class="public-card-loading">${t('common.loading')}</div>
      </div>
    </div>
  `;
}

export async function afterRender(params = {}) {
  const root = document.querySelector('.public-card-screen');
  const token = params.token || '';

  try {
    const pet = await getPetByPublicToken(token);
    if (!pet) {
      root.innerHTML = `
        <div class="public-card-shell">
          <div class="public-card-panel">
            <div class="empty-state-title">${t('publicPetCard.not_found_title')}</div>
            <div class="empty-state-desc">${t('publicPetCard.not_found_desc')}</div>
            <button class="btn btn-primary btn-full mt-4" id="btnOpenApp">${t('publicPetCard.open_app')}</button>
          </div>
        </div>
      `;
    } else {
      root.outerHTML = renderPetCard(pet, token);
    }

    document.getElementById('btnOpenApp')?.addEventListener('click', () => navigate('/profile'));
    document.getElementById('btnCopyPublicCard')?.addEventListener('click', async () => {
      const input = document.getElementById('publicCardUrl');
      try {
        await navigator.clipboard.writeText(input.value);
        showToast(t('publicPetCard.link_copied'));
      } catch {
        input.select();
        showToast(t('publicPetCard.link_selected'));
      }
    });
    document.getElementById('btnSharePublicCard')?.addEventListener('click', async () => {
      const url = document.getElementById('publicCardUrl')?.value;
      if (navigator.share) await navigator.share({ title: t('publicPetCard.share_title'), url });
      else showToast(t('publicPetCard.share_unsupported'));
    });
    document.getElementById('btnOpenPublicMap')?.addEventListener('click', (event) => {
      const location = event.currentTarget.dataset.mapLocation;
      if (location) window.open(mapUrl(location), '_blank', 'noopener,noreferrer');
    });
  } catch (err) {
    root.innerHTML = `
      <div class="public-card-shell">
        <div class="public-card-panel">
          <div class="empty-state-title">${t('publicPetCard.open_failed')}</div>
          <div class="empty-state-desc">${escapeHtml(err.message)}</div>
        </div>
      </div>
    `;
  }
}
