import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { getActivePet } from '../../services/pets.js';
import { t } from '../../i18n/tr.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fieldValue(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function selectedChips(id) {
  return [...document.querySelectorAll(`#${id} button.selected`)].map(button => button.dataset.value || button.textContent.trim());
}

function profileText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return value || '';
}

export function render() {
  const state = getState();
  const pet = getActivePet(state.activePetId) || { name: 'pet' };
  const savedHistory = state.session?.historySnapshot || {};
  const history = {
    chronic: savedHistory.chronic ?? profileText(pet.chronicDiseases),
    medications: savedHistory.medications ?? profileText(pet.medications),
    allergies: savedHistory.allergies ?? profileText(pet.allergies),
    recentChanges: savedHistory.recentChanges ?? profileText(pet.rawHistory),
    previousComplaint: savedHistory.previousComplaint || '',
    homeCare: savedHistory.homeCare || []
  };

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('historyIntake.title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.clipboard}</span>
        </div>
      </div>

      <div class="section pt-4" style="padding-bottom: 124px;">
        <div class="feature-form-hero teal">
          <div class="premium-icon-box">${window.__icons?.paw}</div>
          <div>
            <div class="premium-screen-kicker">${t('historyIntake.kicker')}</div>
            <h1>${t('historyIntake.hero_title', { name: escapeHtml(pet.name) })}</h1>
            <p>${t('historyIntake.hero_desc')}</p>
          </div>
        </div>

        <div class="feature-form-card">
          <label class="feature-field">
            <span>${t('historyIntake.chronic')}</span>
            <input id="historyChronic" placeholder="${t('historyIntake.chronic_placeholder')}" value="${escapeHtml(history.chronic || '')}" />
          </label>
          <label class="feature-field">
            <span>${t('historyIntake.medications')}</span>
            <input id="historyMeds" placeholder="${t('historyIntake.medications_placeholder')}" value="${escapeHtml(history.medications || '')}" />
          </label>
          <label class="feature-field">
            <span>${t('historyIntake.allergies')}</span>
            <input id="historyAllergy" placeholder="${t('historyIntake.allergies_placeholder')}" value="${escapeHtml(history.allergies || '')}" />
          </label>
          <label class="feature-field">
            <span>${t('historyIntake.recent_changes')}</span>
            <textarea id="historyRecent" placeholder="${t('historyIntake.recent_placeholder')}">${escapeHtml(history.recentChanges || '')}</textarea>
          </label>
          <div class="feature-field">
            <span>${t('historyIntake.previous_question')}</span>
            <div class="feature-chip-row" id="historyPrevious">
              ${t('historyIntake.previous_options').map(option => `
                <button type="button" data-value="${escapeHtml(option.value)}" class="${history.previousComplaint === option.value ? 'selected' : ''}">${escapeHtml(option.label)}</button>
              `).join('')}
            </div>
          </div>
          <div class="feature-field">
            <span>${t('historyIntake.homecare_question')}</span>
            <div class="feature-chip-row" id="historyHomeCare">
              ${t('historyIntake.homecare_options').map(option => `
                <button type="button" data-value="${escapeHtml(option.value)}" class="${(history.homeCare || []).includes(option.value) ? 'selected' : ''}">${escapeHtml(option.label)}</button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--max-width); border-radius: 24px 24px 0 0; padding: 20px 24px; box-shadow: var(--shadow-xl); z-index: 10; border-top: 1px solid rgba(229, 222, 209, 0.8); background: rgba(255, 254, 251, 0.9); backdrop-filter: blur(20px);">
        <button class="btn btn-primary btn-full mb-3" id="btnContinue">${t('historyIntake.continue')}</button>
        <button class="btn btn-ghost btn-full text-secondary" id="btnSkip">${t('historyIntake.skip')}</button>
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());

  document.querySelectorAll('.feature-chip-row button').forEach(button => {
    button.addEventListener('click', () => {
      const group = button.parentElement;
      if (group?.id === 'historyPrevious') {
        group.querySelectorAll('button').forEach(item => item.classList.remove('selected'));
      }
      button.classList.toggle('selected');
    });
  });

  function saveAndContinue() {
    setState(current => {
      current.session.historySnapshot = {
        chronic: fieldValue('historyChronic'),
        medications: fieldValue('historyMeds'),
        allergies: fieldValue('historyAllergy'),
        recentChanges: fieldValue('historyRecent'),
        previousComplaint: selectedChips('historyPrevious')[0] || '',
        homeCare: selectedChips('historyHomeCare'),
        capturedAt: new Date().toISOString()
      };
    });
    navigate('/check/new/red-flags');
  }

  document.getElementById('btnContinue')?.addEventListener('click', saveAndContinue);
  document.getElementById('btnSkip')?.addEventListener('click', () => navigate('/check/new/red-flags'));
}
