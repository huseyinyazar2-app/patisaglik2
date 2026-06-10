import { navigate, goBack } from '../../router.js';
import { getState, setActivePet } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { getLocalPets, savePet, updatePet } from '../../services/pets.js';
import { showToast } from '../../ui/toast.js';
import { formatErrorForDeveloper } from '../../services/errorCodes.js';

const petTypes = [
  ['cat', 'pets.cat'],
  ['dog', 'pets.dog'],
  ['bird', 'pets.bird'],
  ['fish', 'pets.fish'],
  ['reptile', 'pets.reptile'],
  ['small_mammal', 'pets.small_mammal'],
  ['exotic', 'pets.exotic']
];

function breedOptionsHtml(type = 'cat') {
  const options = t(`pets.breed_options.${type}`);
  return (Array.isArray(options) ? options : t('pets.breed_options.exotic'))
    .map(item => `<option value="${item}"></option>`)
    .join('');
}

function extractTags(text) {
  const lower = String(text || '').toLocaleLowerCase('tr-TR');
  const tags = [];
  if (lower.includes('yuttu') || lower.includes('\u00e7orap') || lower.includes('yabanc\u0131')) tags.push('pika_sendromu');
  if (lower.includes('ameliyat') || lower.includes('operasyon')) tags.push('gecirilmis_ameliyat');
  if (lower.includes('araba') || lower.includes('\u00e7arp') || lower.includes('k\u0131r\u0131k') || lower.includes('d\u00fc\u015ft\u00fc')) tags.push('gecirilmis_travma');
  if (lower.includes('ba\u011f\u0131\u015f\u0131kl\u0131k') || lower.includes('zay\u0131f')) tags.push('bagisiklik_sorunu');
  return tags;
}

function fieldValue(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function selectedClass(value, selected) {
  return value === selected ? 'selected' : '';
}

export function render(params = {}) {
  const state = getState();
  const editPet = params.petId ? getLocalPets().find((pet) => pet.id === params.petId) : null;
  const selectedType = editPet?.type || 'cat';
  const selectedOwnership = editPet?.ownership || 'owned';
  const selectedGender = editPet?.gender || 'unknown';
  const selectedNeutered = editPet?.neutered || 'unknown';

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="pet-add-back">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${editPet ? t('pets.edit_title') : t('pets.add_title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.paw}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero teal">
          <div class="premium-icon-box">${window.__icons?.paw}</div>
          <div>
            <div class="premium-screen-kicker">${t('pets.profile_kicker')}</div>
            <h1>${editPet ? t('pets.edit_profile_title') : t('pets.new_profile_title')}</h1>
            <p>${editPet ? t('pets.edit_profile_desc') : t('pets.new_profile_desc')}</p>
          </div>
        </div>

        <div class="feature-form-card">
          <div class="feature-field">
            <span>${t('pets.type')}</span>
            <div class="feature-chip-row" id="pet-type-group">
              ${petTypes.map(([type, key]) => `<button class="${selectedClass(type, selectedType)}" type="button" data-type="${type}" ${editPet ? 'disabled' : ''}>${t(key)}</button>`).join('')}
            </div>
          </div>

          <label class="feature-field">
            <span>${t('pets.name')}</span>
            <input type="text" id="pet-name" placeholder="${t('pets.name')}" value="${escapeHtml(editPet?.name || '')}" />
          </label>

          <label class="feature-field">
            <span>${t('pets.birth_date')}</span>
            <input type="date" id="pet-birthdate" value="${escapeHtml(editPet?.birthDate || '')}" />
          </label>

          <div class="feature-field">
            <span>${t('pets.ownership')}</span>
            <div class="feature-chip-row" id="pet-ownership-group">
              <button class="${selectedClass('owned', selectedOwnership)}" type="button" data-ownership="owned">${t('pets.owned')}</button>
              <button class="${selectedClass('stray', selectedOwnership)}" type="button" data-ownership="stray">${t('pets.stray')}</button>
              <button class="${selectedClass('foster', selectedOwnership)}" type="button" data-ownership="foster">${t('pets.foster')}</button>
            </div>
          </div>

          <label class="feature-field pet-care-extra" hidden>
            <span>${t('pets.location')}</span>
            <input type="text" id="pet-location" placeholder="${t('pets.location_placeholder')}" value="${escapeHtml(editPet?.location || '')}" />
          </label>

          <label class="feature-field pet-care-extra" hidden>
            <span>${t('pets.volunteer_note')}</span>
            <textarea id="pet-volunteer-note" placeholder="${t('pets.volunteer_note_placeholder')}">${escapeHtml(editPet?.volunteerNote || '')}</textarea>
          </label>

          <div class="feature-field">
            <span>${t('pets.gender')}</span>
            <div class="feature-chip-row" id="pet-gender-group">
              <button class="${selectedClass('male', selectedGender)}" type="button" data-gender="male">${t('pets.male')}</button>
              <button class="${selectedClass('female', selectedGender)}" type="button" data-gender="female">${t('pets.female')}</button>
              <button class="${selectedClass('unknown', selectedGender)}" type="button" data-gender="unknown">${t('pets.unknown')}</button>
            </div>
          </div>

          <label class="feature-field">
            <span id="pet-breed-label">${t('pets.breed')}</span>
            <input type="text" id="pet-breed" list="pet-breed-options" placeholder="${t('pets.breed_placeholder')}" value="${escapeHtml(editPet?.breed || '')}" />
            <datalist id="pet-breed-options">${breedOptionsHtml(selectedType)}</datalist>
            <small class="text-xs text-tertiary mt-1">${t('pets.breed_free_entry')}</small>
          </label>

          <label class="feature-field">
            <span>${t('pets.weight')}</span>
            <input type="number" id="pet-weight" placeholder="0.0" step="0.1" min="0" value="${escapeHtml(editPet?.weight || '')}" />
          </label>

          <div class="feature-field">
            <span>${t('pets.neutered')}</span>
            <div class="feature-chip-row" id="pet-neutered-group">
              <button class="${selectedClass('yes', selectedNeutered)}" type="button" data-neutered="yes">${t('pets.yes')}</button>
              <button class="${selectedClass('no', selectedNeutered)}" type="button" data-neutered="no">${t('pets.no')}</button>
              <button class="${selectedClass('unknown', selectedNeutered)}" type="button" data-neutered="unknown">${t('pets.unknown')}</button>
            </div>
          </div>

          <label class="feature-field">
            <span>${t('pets.chronic')}</span>
            <input type="text" id="pet-chronic" placeholder="${t('pets.chronic_placeholder')}" value="${escapeHtml((editPet?.chronicDiseases || []).join(', '))}" />
          </label>

          <label class="feature-field">
            <span>${t('pets.allergies')}</span>
            <input type="text" id="pet-allergies" placeholder="${t('pets.allergies_placeholder')}" value="${escapeHtml((editPet?.allergies || []).join(', '))}" />
          </label>

          <label class="feature-field">
            <span>${t('pets.medications')}</span>
            <input type="text" id="pet-medications" placeholder="${t('pets.medications_placeholder')}" value="${escapeHtml((editPet?.medications || []).join(', '))}" />
          </label>

          <label class="feature-field">
            <span>${t('pets.medical_history')}</span>
            <textarea id="pet-history" placeholder="${t('pets.medical_history_placeholder')}">${escapeHtml(editPet?.rawHistory || '')}</textarea>
          </label>
        </div>

        <div class="feature-bottom-actions">
          <button id="pet-save-btn" class="btn btn-primary btn-full">${editPet ? t('pets.update_profile') : t('pets.save_profile')}</button>
          <button id="pet-later-btn" class="btn btn-ghost btn-full">${editPet ? t('common.cancel') : t('pets.later')}</button>
        </div>
      </div>

      <div class="version-badge">${state.version}</div>
    </div>
  `;
}

export function afterRender(params = {}) {
  const state = getState();
  const editPetId = params.petId || '';
  const editPet = editPetId ? getLocalPets().find((pet) => pet.id === editPetId) : null;

  document.getElementById('pet-add-back')?.addEventListener('click', () => goBack());
  document.getElementById('pet-later-btn')?.addEventListener('click', () => editPet ? goBack() : navigate('/pets/select'));

  document.querySelectorAll('.feature-chip-row button').forEach((button) => {
    button.addEventListener('click', () => {
      button.parentElement?.querySelectorAll('button').forEach((item) => item.classList.remove('selected'));
      button.classList.add('selected');
      if (button.dataset.ownership) updateOwnershipFields();
      if (button.dataset.type) updateBreedField(button.dataset.type);
    });
  });

  function updateOwnershipFields() {
    const ownership = document.querySelector('#pet-ownership-group button.selected')?.dataset.ownership || 'owned';
    document.querySelectorAll('.pet-care-extra').forEach(field => {
      field.hidden = ownership === 'owned';
    });
  }

  function updateBreedField(type = 'cat') {
    const label = document.getElementById('pet-breed-label');
    const input = document.getElementById('pet-breed');
    const list = document.getElementById('pet-breed-options');
    const isClassicBreed = ['cat', 'dog'].includes(type);
    if (label) label.textContent = isClassicBreed ? t('pets.breed') : t('pets.species_detail');
    if (input) {
      input.value = '';
      input.placeholder = isClassicBreed ? t('pets.breed_placeholder') : t('pets.species_detail_placeholder');
    }
    if (list) list.innerHTML = breedOptionsHtml(type);
  }

  updateOwnershipFields();
  updateBreedField(editPet?.type || 'cat');
  if (editPet?.breed) document.getElementById('pet-breed').value = editPet.breed;

  document.getElementById('pet-save-btn')?.addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    const name = fieldValue('pet-name');
    if (!name) {
      const input = document.getElementById('pet-name');
      input?.focus();
      input?.style.setProperty('border-color', 'var(--risk-critical)');
      setTimeout(() => input?.style.removeProperty('border-color'), 1600);
      return;
    }
    const birthDate = fieldValue('pet-birthdate');
    if (birthDate && new Date(birthDate).getTime() > Date.now()) {
      const input = document.getElementById('pet-birthdate');
      input?.focus();
      input?.style.setProperty('border-color', 'var(--risk-critical)');
      showToast(t('pets.save_error'));
      setTimeout(() => input?.style.removeProperty('border-color'), 1600);
      return;
    }
    const weightText = fieldValue('pet-weight');
    const weightValue = Number(String(weightText || '0').replace(',', '.'));
    if (weightText && (!Number.isFinite(weightValue) || weightValue < 0 || weightValue > 300)) {
      const input = document.getElementById('pet-weight');
      input?.focus();
      input?.style.setProperty('border-color', 'var(--risk-critical)');
      showToast(t('pets.save_error'));
      setTimeout(() => input?.style.removeProperty('border-color'), 1600);
      return;
    }

    const originalText = btn.textContent;
    btn.textContent = t('pets.saving');
    btn.disabled = true;

    const rawHistory = fieldValue('pet-history');
    try {
      const payload = {
        name,
        type: document.querySelector('#pet-type-group button.selected')?.dataset.type || editPet?.type || 'cat',
        ownership: document.querySelector('#pet-ownership-group button.selected')?.dataset.ownership || 'owned',
        location: fieldValue('pet-location'),
        volunteerNote: fieldValue('pet-volunteer-note'),
        gender: document.querySelector('#pet-gender-group button.selected')?.dataset.gender || 'unknown',
        breed: fieldValue('pet-breed'),
        birthDate,
        weight: weightText,
        neutered: document.querySelector('#pet-neutered-group button.selected')?.dataset.neutered || 'unknown',
        chronic: fieldValue('pet-chronic'),
        allergies: fieldValue('pet-allergies'),
        medications: fieldValue('pet-medications'),
        rawHistory,
        extractedTags: extractTags(rawHistory)
      };

      const result = editPetId ? await updatePet({
        userId: state.user?.id || 'user-1',
        petId: editPetId,
        pet: payload
      }) : await savePet({
        userId: state.user?.id || 'user-1',
        pet: payload
      });
      setActivePet(result.id);
      navigate(editPetId ? '/pets/select' : '/pets/device-mode');
    } catch (err) {
      btn.textContent = originalText;
      btn.disabled = false;
      showToast(formatErrorForDeveloper(err, t('pets.save_error')));
    }
  });
}
