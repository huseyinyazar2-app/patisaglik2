import { navigate } from '../../router.js';
import { getState, resetSession } from '../../store.js';
import { submitFeatureForm } from '../../services/formSubmissions.js';
import { showToast } from '../../ui/toast.js';
import { t, translateForLocale } from '../../i18n/tr.js';

function selected(id) {
  return document.querySelector(`#${id} button.selected`)?.dataset.value || '';
}

function value(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

export function render() {
  const state = getState();
  const session = state.session || {};

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('vetOutcome.title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.stethoscope}</span>
        </div>
      </div>

      <div class="section pt-4" style="padding-bottom: 124px;">
        <div class="feature-form-hero gold">
          <div class="premium-icon-box">${window.__icons?.stethoscope}</div>
          <div>
            <div class="premium-screen-kicker">${t('vetOutcome.kicker')}</div>
            <h1>${t('vetOutcome.hero_title')}</h1>
            <p>${t('vetOutcome.hero_desc')}</p>
          </div>
        </div>

        <div class="feature-form-card">
          <div class="feature-field">
            <span>${t('vetOutcome.visited')}</span>
            <div class="feature-chip-row" id="vetVisited">
              ${t('vetOutcome.visited_options').map((item, index) => `<button type="button" data-value="${item.value}" class="${index === 0 ? 'selected' : ''}">${item.label}</button>`).join('')}
            </div>
          </div>
          <label class="feature-field">
            <span>${t('vetOutcome.diagnosis')}</span>
            <input id="vetDiagnosis" placeholder="${t('vetOutcome.diagnosis_placeholder')}" />
          </label>
          <label class="feature-field">
            <span>${t('vetOutcome.treatment')}</span>
            <textarea id="vetTreatment" placeholder="${t('vetOutcome.treatment_placeholder')}"></textarea>
          </label>
          <div class="feature-field">
            <span>${t('vetOutcome.triage_accuracy')}</span>
            <div class="feature-chip-row" id="triageAccuracy">
              ${t('vetOutcome.accuracy_options').map(item => `<button type="button" data-value="${item.value}">${item.label}</button>`).join('')}
            </div>
          </div>
          <div class="feature-field">
            <span>${t('vetOutcome.current_status')}</span>
            <div class="feature-chip-row" id="currentStatus">
              ${t('vetOutcome.status_options').map(item => `<button type="button" data-value="${item.value}">${item.label}</button>`).join('')}
            </div>
          </div>
          <label class="feature-field">
            <span>Ek not</span>
            <textarea id="vetNote" placeholder="${t('vetOutcome.note_placeholder')}"></textarea>
          </label>
        </div>

        ${session.primaryComplaintLabel ? `<div class="info-box info mt-3"><span class="info-box-icon">${window.__icons?.clipboard}</span><span>${t('vetOutcome.feedback_match', { label: session.primaryComplaintLabel })}</span></div>` : ''}
      </div>

      <div class="card" style="position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--max-width); border-radius: 24px 24px 0 0; padding: 20px 24px; box-shadow: var(--shadow-xl); z-index: 10; border-top: 1px solid rgba(229, 222, 209, 0.8); background: rgba(255, 254, 251, 0.9); backdrop-filter: blur(20px);">
        <button class="btn btn-primary btn-full mb-3" id="btnSaveOutcome">${t('vetOutcome.save')}</button>
        <button class="btn btn-ghost btn-full text-secondary" id="btnSkipOutcome">${t('vetOutcome.skip')}</button>
      </div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();

  document.querySelectorAll('.feature-chip-row button').forEach(button => {
    button.addEventListener('click', () => {
      button.parentElement?.querySelectorAll('button').forEach(item => item.classList.remove('selected'));
      button.classList.add('selected');
    });
  });

  document.getElementById('btnBack')?.addEventListener('click', () => navigate('/check/new/result'));
  document.getElementById('btnSkipOutcome')?.addEventListener('click', () => {
    resetSession();
    navigate('/home');
  });

  document.getElementById('btnSaveOutcome')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = t('common.saving');
    try {
      await submitFeatureForm({
        userId: state.user?.id || 'user-1',
        petId: state.activePetId || 'pet-1',
        featureCode: 'ai-vet-outcome',
        locale: state.user?.locale || 'tr',
        payload: {
          [translateForLocale('tr', 'vetOutcome.visited')]: selected('vetVisited'),
          [translateForLocale('tr', 'vetOutcome.diagnosis_payload')]: value('vetDiagnosis'),
          [translateForLocale('tr', 'vetOutcome.treatment')]: value('vetTreatment'),
          [translateForLocale('tr', 'vetOutcome.triage_accuracy')]: selected('triageAccuracy'),
          [translateForLocale('tr', 'vetOutcome.current_status')]: selected('currentStatus'),
          [translateForLocale('tr', 'vetOutcome.extra_note')]: value('vetNote'),
          triage_session_id: state.session?.id || '',
          primary_complaint: state.session?.primaryComplaintLabel || '',
          matched_complaints: state.session?.matchedComplaintIds || [],
          risk_categories: state.session?.categories || [],
          history_snapshot: state.session?.historySnapshot || {}
        }
      });
      showToast(t('vetOutcome.saved'));
      resetSession();
      navigate('/home');
    } catch (err) {
      showToast(t('vetOutcome.save_failed', { error: err.message }));
      button.disabled = false;
      button.textContent = t('vetOutcome.save');
    }
  });
}
