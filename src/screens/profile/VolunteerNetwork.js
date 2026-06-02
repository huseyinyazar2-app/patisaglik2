import { goBack } from '../../router.js';
import { getState } from '../../store.js';
import { getPets } from '../../services/pets.js';
import { submitFeatureForm } from '../../services/formSubmissions.js';
import { showToast } from '../../ui/toast.js';
import { t, translateForLocale } from '../../i18n/tr.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function mapUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function renderList(pets = null) {
  if (!pets) {
    return `<div class="free-record-panel"><p>${t('volunteerNetwork.loading')}</p></div>`;
  }

  const volunteers = pets.filter((pet) => ['stray', 'foster'].includes(pet.ownership));
  if (!volunteers.length) {
    return `
      <div class="empty-state">
        <div class="modern-empty-icon">${window.__icons?.paw}</div>
        <div class="empty-state-title">${t('volunteerNetwork.empty_title')}</div>
        <div class="empty-state-desc">${t('volunteerNetwork.empty_desc')}</div>
      </div>
    `;
  }

  return volunteers.map((pet) => `
    <div class="volunteer-card">
      <div class="volunteer-card-head">
        <div class="premium-icon-box">${window.__icons?.paw}</div>
        <div>
          <strong>${escapeHtml(pet.name)}</strong>
          <small>${pet.ownership === 'foster' ? t('volunteerNetwork.foster') : t('volunteerNetwork.stray_volunteer')} · ${escapeHtml(pet.breed || pet.type || 'Pet')}</small>
        </div>
      </div>
      <p>${escapeHtml(pet.volunteerNote || t('volunteerNetwork.no_note'))}</p>
      <div class="volunteer-location">
        <span>${window.__icons?.search}</span>
        <strong>${escapeHtml(pet.location || t('volunteerNetwork.no_location'))}</strong>
      </div>
      <div class="pet-card-map-actions">
        ${pet.location ? `<button type="button" class="pet-map-action" data-map-location="${escapeHtml(pet.location)}">${window.__icons?.search} ${t('volunteerNetwork.open_map')}</button>` : ''}
        ${pet.location ? `<button type="button" class="pet-map-action secondary" data-share-location="${escapeHtml(pet.location)}" data-pet-name="${escapeHtml(pet.name)}">${window.__icons?.upload} ${t('volunteerNetwork.share_location')}</button>` : ''}
        <button type="button" class="pet-map-action accent" data-volunteer-request="${escapeHtml(pet.id)}" data-pet-name="${escapeHtml(pet.name)}">${window.__icons?.heartPulse} ${t('volunteerNetwork.support_request')}</button>
      </div>
    </div>
  `).join('');
}

export function render() {
  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('volunteerNetwork.title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.paw}</span>
        </div>
      </div>

      <div class="section pt-4">
        <div class="profile-plan-card">
          <div>
            <strong>${t('volunteerNetwork.hero_title')}</strong>
            <p>${t('volunteerNetwork.hero_desc')}</p>
          </div>
          <span class="plan-pill">${t('common.free')}</span>
        </div>
      </div>

      <div class="section pt-0 pb-24">
        <div class="volunteer-list" id="volunteerList">${renderList(null)}</div>
      </div>

      <div class="modal-backdrop volunteer-request-modal" id="volunteerRequestModal" hidden>
        <div class="modal">
          <div class="modal-handle"></div>
          <div class="modal-title">${t('volunteerNetwork.modal_title')}</div>
          <p class="modal-text" id="volunteerRequestPet">${t('volunteerNetwork.modal_desc')}</p>
          <div class="feature-field">
            <span>${t('volunteerNetwork.contact')}</span>
            <input id="volunteerContact" placeholder="${t('volunteerNetwork.contact_placeholder')}" />
          </div>
          <div class="feature-field mt-3">
            <span>${t('volunteerNetwork.need_type')}</span>
            <input id="volunteerNeed" placeholder="${t('volunteerNetwork.need_placeholder')}" />
          </div>
          <div class="feature-field mt-3">
            <span>Not</span>
            <textarea id="volunteerNote" placeholder="${t('volunteerNetwork.note_placeholder')}"></textarea>
          </div>
          <p class="volunteer-request-status" id="volunteerRequestStatus"></p>
          <div class="modal-actions">
            <button class="btn btn-primary btn-full" id="btnVolunteerSubmit">${t('volunteerNetwork.save_request')}</button>
            <button class="btn btn-secondary btn-full" id="btnVolunteerCancel">${t('common.cancel')}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  const modal = document.getElementById('volunteerRequestModal');
  const status = document.getElementById('volunteerRequestStatus');

  function openRequestModal(button) {
    if (!modal) return;
    modal.dataset.petId = button.dataset.volunteerRequest || '';
    document.getElementById('volunteerRequestPet').textContent = t('volunteerNetwork.modal_pet_desc', { pet: button.dataset.petName || t('volunteerNetwork.this_profile') });
    document.getElementById('volunteerContact').value = '';
    document.getElementById('volunteerNeed').value = '';
    document.getElementById('volunteerNote').value = '';
    if (status) status.textContent = '';
    modal.hidden = false;
  }

  function closeRequestModal() {
    if (modal) modal.hidden = true;
  }

  function bindActions() {
    document.querySelectorAll('[data-map-location]').forEach((button) => {
      button.addEventListener('click', () => window.open(mapUrl(button.dataset.mapLocation), '_blank', 'noopener,noreferrer'));
    });
    document.querySelectorAll('[data-share-location]').forEach((button) => {
      button.addEventListener('click', async () => {
        const text = t('volunteerNetwork.share_text', { pet: button.dataset.petName || 'Pet', location: button.dataset.shareLocation });
        const url = mapUrl(button.dataset.shareLocation);
        if (navigator.share) {
          try {
            await navigator.share({ title: t('volunteerNetwork.share_title'), text, url });
            return;
          } catch {}
        }
        try {
          await navigator.clipboard.writeText(`${text}\n${url}`);
          showToast(t('volunteerNetwork.location_copied'));
        } catch {
          showToast(t('volunteerNetwork.location_copy_failed'));
        }
      });
    });
    document.querySelectorAll('[data-volunteer-request]').forEach((button) => {
      button.addEventListener('click', () => openRequestModal(button));
    });
  }

  document.getElementById('btnVolunteerCancel')?.addEventListener('click', closeRequestModal);
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeRequestModal();
  });

  document.getElementById('btnVolunteerSubmit')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const petId = modal?.dataset.petId || '';
    const contact = document.getElementById('volunteerContact')?.value.trim();
    const need = document.getElementById('volunteerNeed')?.value.trim();
    const note = document.getElementById('volunteerNote')?.value.trim();
    if (!contact || !need) {
      if (status) status.textContent = t('volunteerNetwork.required_error');
      return;
    }
    button.disabled = true;
    button.textContent = t('common.saving');
    try {
      await submitFeatureForm({
        userId: state.user?.id || 'user-1',
        petId,
        featureCode: 'volunteer-help',
        locale: state.locale || 'tr',
        payload: {
          [translateForLocale('tr', 'volunteerNetwork.contact')]: contact,
          [translateForLocale('tr', 'volunteerNetwork.need_type')]: need,
          Not: note
        }
      });
      if (status) status.textContent = t('volunteerNetwork.saved');
      setTimeout(closeRequestModal, 700);
    } catch (err) {
      if (status) status.textContent = t('volunteerNetwork.save_failed', { error: err.message });
    } finally {
      button.disabled = false;
      button.textContent = t('volunteerNetwork.save_request');
    }
  });

  getPets({ userId: state.user?.id || 'user-1' }).then((pets) => {
    const target = document.getElementById('volunteerList');
    if (target) target.innerHTML = renderList(pets);
    bindActions();
  }).catch((err) => {
    const target = document.getElementById('volunteerList');
    if (target) target.innerHTML = `<div class="free-record-panel"><p>${t('volunteerNetwork.open_failed', { error: escapeHtml(err.message) })}</p></div>`;
  });
}
