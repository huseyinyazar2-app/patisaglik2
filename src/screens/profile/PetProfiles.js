import { navigate, goBack } from '../../router.js';
import { getState, setActivePet } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { getPets } from '../../services/pets.js';
import { getAccountBilling } from '../../services/billing.js';
import { showConfirmDialog, showToast } from '../../ui/toast.js';

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

function typeLabel(type) {
  const key = `pets.${type}`;
  const label = t(key);
  return label === key ? 'Pet' : label;
}

function renderPetList(pets = null, activeId = null) {
  if (!pets) {
    return `
      <div class="free-record-panel">
        <p>${t('pets.loading_profiles')}</p>
      </div>
    `;
  }

  if (!pets.length) {
    return `
      <div class="empty-state">
        <div class="modern-empty-icon">${window.__icons?.paw}</div>
        <div class="empty-state-title">${t('pets.no_profiles')}</div>
        <div class="empty-state-desc">${t('pets.no_profiles_desc')}</div>
      </div>
    `;
  }

  return pets.map((pet) => {
    const ownershipLabel = pet.ownership === 'stray' ? t('pets.volunteer') : pet.ownership === 'foster' ? t('pets.foster') : t('pets.owned');
    const location = pet.location ? ` · ${escapeHtml(pet.location)}` : '';
    const canShareLocation = pet.location && ['stray', 'foster'].includes(pet.ownership);
    return `
    <div class="pet-card card card-interactive mb-3" role="button" tabindex="0" data-id="${escapeHtml(pet.id)}" style="${pet.id === activeId ? 'border-color: var(--primary); background: var(--primary-50);' : ''}">
      <div class="pet-info" style="display: flex; align-items: center; gap: 12px;">
        <div class="avatar" style="background: ${pet.id === activeId ? 'var(--white)' : 'var(--gray-100)'}; color: var(--primary-dark); padding: 12px;">${window.__icons?.paw}</div>
        <div>
          <div class="pet-name">${escapeHtml(pet.name)}</div>
          <div class="pet-meta">${escapeHtml(typeLabel(pet.type))} · ${escapeHtml(pet.breed || t('pets.breed_missing'))} · ${escapeHtml(ownershipLabel)}${location}</div>
          ${pet.volunteerNote ? `<div class="pet-meta">${escapeHtml(pet.volunteerNote)}</div>` : ''}
          ${canShareLocation ? `
            <div class="pet-card-map-actions">
              <button type="button" class="pet-map-action" data-map-location="${escapeHtml(pet.location)}">${window.__icons?.search} ${t('petProfiles.open_map')}</button>
              <button type="button" class="pet-map-action secondary" data-share-location="${escapeHtml(pet.location)}" data-pet-name="${escapeHtml(pet.name)}">${window.__icons?.upload} ${t('petProfiles.share_location')}</button>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="pet-status">
        ${pet.id === activeId ? `<div style="width: 24px; height: 24px; color: var(--primary);">${window.__icons?.checkCircle}</div>` : ''}
      </div>
    </div>
  `;
  }).join('');
}

export function render() {
  const state = getState();
  const maxPets = state.subscription?.maxPets || 1;
  const plan = state.subscription?.tier === 'pro' ? 'PRO' : 'FREE';

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('profile.pet_profiles')}</div>
        <div class="header-right"></div>
      </div>

      <div class="section pt-4">
        <div class="profile-plan-card">
          <div>
            <strong>${t('pets.multi_panel_title')}</strong>
            <p>${t('pets.multi_panel_desc')}</p>
          </div>
          <span class="plan-pill" id="petPlanPill">${plan} · .../${maxPets}</span>
        </div>
      </div>

      <div class="section pt-0 pb-24">
        <div class="pets-list mb-6" id="petsList">
          ${renderPetList(null, state.activePetId)}
        </div>

        <button class="btn btn-outline btn-full flex items-center justify-center gap-2" id="btnAddPet">
          <span style="width: 16px; height: 16px;">${window.__icons?.plus}</span> ${t('profile.add_pet')}
        </button>
      </div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  let loadedPets = [];
  let planLimit = state.subscription?.maxPets || 1;

  function bindPetCards() {
    document.querySelectorAll('.pet-card').forEach((card) => {
      card.addEventListener('click', () => {
        setActivePet(card.dataset.id);
        setTimeout(() => navigate('/home'), 150);
      });
      card.addEventListener('keydown', (event) => {
        if (event.target.closest('[data-map-location], [data-share-location]')) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        setActivePet(card.dataset.id);
        setTimeout(() => navigate('/home'), 150);
      });
    });

    document.querySelectorAll('[data-map-location]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        window.open(mapUrl(button.dataset.mapLocation), '_blank', 'noopener,noreferrer');
      });
    });

    document.querySelectorAll('[data-share-location]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.stopPropagation();
        const text = `${button.dataset.petName || 'Pet'} konumu: ${button.dataset.shareLocation}`;
        const url = mapUrl(button.dataset.shareLocation);
        if (navigator.share) {
          try {
          await navigator.share({ title: t('petProfiles.share_title'), text, url });
          } catch {
            return;
          }
          return;
        }
        try {
          await navigator.clipboard.writeText(`${text}\n${url}`);
          showToast(t('petProfiles.location_copied'));
        } catch {
          showToast(t('petProfiles.location_copy_failed'));
        }
      });
    });
  }

  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnAddPet')?.addEventListener('click', async () => {
    if (loadedPets.length >= planLimit) {
      const ok = await showConfirmDialog({
        title: 'Pet limiti',
        message: t('pets.free_limit_confirm'),
        confirmText: 'Devam Et'
      });
      if (!ok) return;
    }
    navigate('/pets/new');
  });

  Promise.all([
    getPets({ userId: state.user?.id || 'user-1' }),
    getAccountBilling({ userId: state.user?.id || 'user-1' })
  ]).then(([pets, billing]) => {
    loadedPets = pets;
    planLimit = billing.subscription.maxPets || 1;
    const list = document.getElementById('petsList');
    const pill = document.getElementById('petPlanPill');
    if (list) list.innerHTML = renderPetList(pets, getState().activePetId);
    if (pill) pill.textContent = `${billing.subscription.planName} · ${pets.length}/${planLimit}`;
    bindPetCards();
  }).catch(() => {
    const list = document.getElementById('petsList');
    if (list) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="modern-empty-icon">${window.__icons?.alert}</div>
          <div class="empty-state-title">${t('pets.profiles_error')}</div>
          <div class="empty-state-desc">${t('pets.profiles_error_desc')}</div>
        </div>
      `;
    }
  });
}
