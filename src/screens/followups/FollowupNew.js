import { navigate, goBack } from '../../router.js';
import { getState, setState, resetSession } from '../../store.js';
import { getActivePet } from '../../mock/pets.js';
import { showToast } from '../../ui/toast.js';
import { t } from '../../i18n/tr.js';

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

function selected(selector) {
  return [...document.querySelectorAll(selector)]
    .filter(item => item.checked || item.classList.contains('selected'))
    .map(item => item.value || item.textContent.trim())
    .filter(Boolean);
}

function fileInfo(id) {
  const file = document.getElementById(id)?.files?.[0];
  if (!file) return null;
  return { name: file.name, mime_type: file.type, file_size_bytes: file.size, local_uri: `local://${file.name}` };
}

export function render() {
  const state = getState();
  const session = state.session || {};
  const pet = getActivePet(state.activePetId) || { name: 'Pet' };
  const complaint = session.complaintText || t('followupNew.default_complaint');

  return `
    <div class="screen premium-check treatment-followup-screen">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back || ''}</button>
        </div>
        <div class="header-title">${t('followupNew.title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.calendar || ''}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero teal">
          <div class="premium-icon-box">${window.__icons?.stethoscope || ''}</div>
          <div>
            <div class="premium-screen-kicker">${t('followupNew.kicker')}</div>
            <h1>${t('followupNew.heading').replace('{name}', escapeHtml(pet.name))}</h1>
            <p>${t('followupNew.hero_desc')}</p>
          </div>
        </div>

        <div class="feature-form-card">
          <label class="feature-field">
            <span>${t('followupNew.followup_title')}</span>
            <input id="followupTitle" value="${escapeHtml(complaint)}" placeholder="${t('followupNew.title_placeholder')}" />
          </label>

          <div class="feature-field">
            <span>${t('followupNew.prescription_photo')}</span>
            <input id="prescriptionFile" type="file" class="feature-upload-input hidden" accept="image/*,.pdf" />
            <button class="feature-upload" type="button" id="btnPrescriptionUpload">
              ${window.__icons?.upload || ''}
              <strong>${t('followupNew.choose_document')}</strong>
              <small>${t('followupNew.document_hint')}</small>
            </button>
          </div>

          <label class="feature-field">
            <span>${t('followupNew.vet_plan')}</span>
            <textarea id="vetPlan" placeholder="${t('followupNew.vet_plan_placeholder')}"></textarea>
          </label>

          <label class="feature-field">
            <span>${t('followupNew.med_schedule')}</span>
            <input id="medSchedule" placeholder="${t('followupNew.med_schedule_placeholder')}" />
          </label>

          <div class="feature-field">
            <span>${t('followupNew.daily_questions')}</span>
            <div class="feature-check-grid">
              ${t('followupNew.daily_question_options').map((item, index) => `
                <label>
                  <input type="checkbox" value="${item}" ${index < 4 ? 'checked' : ''} />
                  <b>${item}</b>
                </label>
              `).join('')}
            </div>
          </div>

          <label class="feature-field">
            <span>${t('followupNew.control_appointment')}</span>
            <input id="controlDate" type="date" />
          </label>

          <div class="feature-field">
            <span>${t('followupNew.first_check_time')}</span>
            <div class="feature-chip-row" id="intervalChips">
              ${t('followupNew.interval_options').map((item, index) => `<button type="button" class="${index === 2 ? 'selected' : ''}" data-hours="${parseInt(item, 10)}">${item}</button>`).join('')}
            </div>
          </div>
        </div>

        <div class="info-box warning mt-4">
          <span class="info-box-icon">${window.__icons?.shield || ''}</span>
          <span>${t('followupNew.safety_note')}</span>
        </div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnStartFollowup">${t('followupNew.start')}</button>
          <button class="btn btn-ghost btn-full" id="btnCancel">${t('common.cancel')}</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnCancel')?.addEventListener('click', () => {
    resetSession();
    navigate('/home');
  });

  document.getElementById('btnPrescriptionUpload')?.addEventListener('click', () => document.getElementById('prescriptionFile')?.click());
  document.getElementById('prescriptionFile')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    const button = document.getElementById('btnPrescriptionUpload');
    if (!file || !button) return;
    button.querySelector('strong').textContent = file.name;
    button.querySelector('small').textContent = `${file.type || t('documents.document')} ${t('featureForm.separator')} ${Math.ceil(file.size / 1024)} KB`;
  });

  document.querySelectorAll('#intervalChips button').forEach(button => {
    button.addEventListener('click', () => {
      button.parentElement?.querySelectorAll('button').forEach(item => item.classList.remove('selected'));
      button.classList.add('selected');
    });
  });

  document.getElementById('btnStartFollowup')?.addEventListener('click', (event) => {
    const state = getState();
    const button = event.currentTarget;
    const title = value('followupTitle') || t('followupDetail.default_title');
    const selectedInterval = document.querySelector('#intervalChips button.selected');
    const hours = Number(selectedInterval?.dataset.hours || 24);

    button.disabled = true;
    button.textContent = t('followupNew.creating');

    const caseId = `case-${Date.now()}`;
    const caseRecord = {
      id: caseId,
      petId: state.activePetId,
      title,
      status: 'active',
      type: 'treatment_followup',
      createdAt: new Date().toISOString(),
      nextCheck: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
      controlDate: value('controlDate'),
      vetPlan: value('vetPlan'),
      medSchedule: value('medSchedule'),
      checklist: selected('.feature-check-grid input'),
      prescriptionFile: fileInfo('prescriptionFile'),
      history: []
    };

    setState(current => {
      current.followups = current.followups || [];
      current.followups.unshift(caseRecord);
    });

    showToast(t('followupNew.created'));
    resetSession();
    navigate(`/followups/${caseId}`);
  });
}
