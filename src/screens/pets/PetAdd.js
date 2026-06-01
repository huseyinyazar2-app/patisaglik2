import { navigate, goBack } from '../../router.js';
import { getState, setActivePet } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { savePet } from '../../services/pets.js';
import { showToast } from '../../ui/toast.js';

const petTypes = [
  ['cat', 'pets.cat'],
  ['dog', 'pets.dog'],
  ['bird', 'pets.bird'],
  ['fish', 'pets.fish'],
  ['reptile', 'pets.reptile'],
  ['small_mammal', 'pets.small_mammal'],
  ['exotic', 'pets.exotic']
];

function extractTags(text) {
  const lower = String(text || '').toLocaleLowerCase('tr-TR');
  const tags = [];
  if (lower.includes('yuttu') || lower.includes('çorap') || lower.includes('yabancı')) tags.push('pika_sendromu');
  if (lower.includes('ameliyat') || lower.includes('operasyon')) tags.push('gecirilmis_ameliyat');
  if (lower.includes('araba') || lower.includes('çarp') || lower.includes('kırık') || lower.includes('düştü')) tags.push('gecirilmis_travma');
  if (lower.includes('bağışıklık') || lower.includes('zayıf')) tags.push('bagisiklik_sorunu');
  return tags;
}

function fieldValue(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

export function render() {
  const state = getState();

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="pet-add-back">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('pets.add_title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.paw}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero teal">
          <div class="premium-icon-box">${window.__icons?.paw}</div>
          <div>
            <div class="premium-screen-kicker">${t('pets.profile_kicker')}</div>
            <h1>${t('pets.new_profile_title')}</h1>
            <p>${t('pets.new_profile_desc')}</p>
          </div>
        </div>

        <div class="feature-form-card">
          <div class="feature-field">
            <span>${t('pets.type')}</span>
            <div class="feature-chip-row" id="pet-type-group">
              ${petTypes.map(([type, key], index) => `<button class="${index === 0 ? 'selected' : ''}" type="button" data-type="${type}">${t(key)}</button>`).join('')}
            </div>
          </div>

          <div class="feature-field">
            <span>${t('pets.ownership')}</span>
            <div class="feature-chip-row" id="pet-ownership-group">
              <button class="selected" type="button" data-ownership="owned">${t('pets.owned')}</button>
              <button type="button" data-ownership="stray">${t('pets.stray')}</button>
              <button type="button" data-ownership="foster">${t('pets.foster')}</button>
            </div>
          </div>

          <label class="feature-field">
            <span>${t('pets.location')}</span>
            <input type="text" id="pet-location" placeholder="${t('pets.location_placeholder')}" />
          </label>

          <label class="feature-field">
            <span>${t('pets.volunteer_note')}</span>
            <textarea id="pet-volunteer-note" placeholder="${t('pets.volunteer_note_placeholder')}"></textarea>
          </label>

          <label class="feature-field">
            <span>${t('pets.name')}</span>
            <input type="text" id="pet-name" placeholder="${t('pets.name')}" />
          </label>

          <div class="feature-field">
            <span>${t('pets.gender')}</span>
            <div class="feature-chip-row" id="pet-gender-group">
              <button type="button" data-gender="male">${t('pets.male')}</button>
              <button type="button" data-gender="female">${t('pets.female')}</button>
              <button class="selected" type="button" data-gender="unknown">${t('pets.unknown')}</button>
            </div>
          </div>

          <label class="feature-field">
            <span>${t('pets.breed')}</span>
            <input type="text" id="pet-breed" placeholder="${t('pets.breed_placeholder')}" />
          </label>

          <label class="feature-field">
            <span>${t('pets.birth_date')}</span>
            <input type="date" id="pet-birthdate" />
          </label>

          <label class="feature-field">
            <span>${t('pets.weight')}</span>
            <input type="number" id="pet-weight" placeholder="0.0" step="0.1" min="0" />
          </label>

          <div class="feature-field">
            <span>${t('pets.neutered')}</span>
            <div class="feature-chip-row" id="pet-neutered-group">
              <button type="button" data-neutered="yes">${t('pets.yes')}</button>
              <button type="button" data-neutered="no">${t('pets.no')}</button>
              <button class="selected" type="button" data-neutered="unknown">${t('pets.unknown')}</button>
            </div>
          </div>

          <label class="feature-field">
            <span>${t('pets.chronic')}</span>
            <input type="text" id="pet-chronic" placeholder="${t('pets.chronic_placeholder')}" />
          </label>

          <label class="feature-field">
            <span>${t('pets.allergies')}</span>
            <input type="text" id="pet-allergies" placeholder="${t('pets.allergies_placeholder')}" />
          </label>

          <label class="feature-field">
            <span>${t('pets.medications')}</span>
            <input type="text" id="pet-medications" placeholder="${t('pets.medications_placeholder')}" />
          </label>

          <label class="feature-field">
            <span>${t('pets.medical_history')}</span>
            <textarea id="pet-history" placeholder="${t('pets.medical_history_placeholder')}"></textarea>
          </label>
        </div>

        <div class="feature-bottom-actions">
          <button id="pet-save-btn" class="btn btn-primary btn-full">${t('pets.save_profile')}</button>
          <button id="pet-later-btn" class="btn btn-ghost btn-full">${t('pets.later')}</button>
        </div>
      </div>

      <div class="version-badge">${state.version}</div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();

  document.getElementById('pet-add-back')?.addEventListener('click', () => goBack());
  document.getElementById('pet-later-btn')?.addEventListener('click', () => navigate('/pets/select'));

  document.querySelectorAll('.feature-chip-row button').forEach((button) => {
    button.addEventListener('click', () => {
      button.parentElement?.querySelectorAll('button').forEach((item) => item.classList.remove('selected'));
      button.classList.add('selected');
    });
  });

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

    const originalText = btn.textContent;
    btn.textContent = t('pets.saving');
    btn.disabled = true;

    const rawHistory = fieldValue('pet-history');
    try {
      const result = await savePet({
        userId: state.user?.id || 'user-1',
        pet: {
          name,
          type: document.querySelector('#pet-type-group button.selected')?.dataset.type || 'cat',
          ownership: document.querySelector('#pet-ownership-group button.selected')?.dataset.ownership || 'owned',
          location: fieldValue('pet-location'),
          volunteerNote: fieldValue('pet-volunteer-note'),
          gender: document.querySelector('#pet-gender-group button.selected')?.dataset.gender || 'unknown',
          breed: fieldValue('pet-breed'),
          birthDate: fieldValue('pet-birthdate'),
          weight: fieldValue('pet-weight'),
          neutered: document.querySelector('#pet-neutered-group button.selected')?.dataset.neutered || 'unknown',
          chronic: fieldValue('pet-chronic'),
          allergies: fieldValue('pet-allergies'),
          medications: fieldValue('pet-medications'),
          rawHistory,
          extractedTags: extractTags(rawHistory)
        }
      });
      setActivePet(result.id);
      navigate('/pets/device-mode');
    } catch (err) {
      btn.textContent = originalText;
      btn.disabled = false;
      showToast(`${t('pets.save_error')}: ${err.message}`);
    }
  });
}
