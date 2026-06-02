import { navigate, goBack } from '../../router.js';
import { getState, setState, resetSession } from '../../store.js';
import { getActivePet } from '../../services/pets.js';
import { showConfirmDialog, showToast } from '../../ui/toast.js';
import { getLocale, t } from '../../i18n/tr.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(date) {
  if (!date) return t('followupDetail.no_plan');
  return new Intl.DateTimeFormat(getLocale() === 'tr' ? 'tr-TR' : getLocale(), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

function statusLabel(status) {
  if (status === 'improved') return t('followupDetail.status_improved');
  if (status === 'worse') return t('followupDetail.status_worse');
  return t('followupDetail.status_same');
}

function renderHistory(history = []) {
  if (!history.length) {
    return `
      <div class="p-4 bg-gray-50 text-center">
        <p class="text-xs text-tertiary">${t('followupDetail.no_daily_check')}</p>
      </div>
    `;
  }

  return history.map((item) => `
    <div class="p-4" style="border-bottom: 1px solid var(--border-color);">
      <div class="flex items-start gap-3">
        <div class="risk-dot ${item.status === 'worse' ? 'critical' : item.status === 'same' ? 'medium' : ''}"></div>
        <div style="flex: 1; min-width: 0;">
          <div class="text-sm font-bold">${statusLabel(item.status)} ${t('featureForm.separator')} ${formatDate(item.timestamp)}</div>
          <div class="text-xs text-secondary mt-1">${escapeHtml(item.notes || t('followupDetail.no_note'))}</div>
          ${item.sideEffects?.length ? `<div class="text-xs text-danger mt-1">${t('followupResult.side_effect')}: ${escapeHtml(item.sideEffects.join(', '))}</div>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

export function render(params = {}) {
  const state = getState();
  const caseId = params.caseId;
  const followup = state.followups?.find(f => f.id === caseId) || {
    id: caseId,
    title: t('followupDetail.default_title'),
    status: 'active',
    nextCheck: new Date().toISOString(),
    history: [],
    checklist: []
  };
  const pet = getActivePet(followup.petId || state.activePetId) || { name: 'Pet' };

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back || ''}</button>
        </div>
        <div class="header-title">${t('followupDetail.file_title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.clipboard || ''}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero teal">
          <div class="premium-icon-box">${window.__icons?.stethoscope || ''}</div>
          <div>
            <div class="premium-screen-kicker">${t('followupResult.kicker')}</div>
            <h1>${escapeHtml(followup.title)}</h1>
            <p>${t('followupDetail.hero_desc').replace('{name}', escapeHtml(pet.name))}</p>
          </div>
        </div>

        <div class="premium-followup-plan">
          <div class="premium-icon-box">${window.__icons?.calendar || ''}</div>
          <div>
            <h3>${t('followupDetail.plan')}</h3>
            <div class="premium-plan-row"><span>${t('followupDetail.next_check')}</span><strong>${formatDate(followup.nextCheck)}</strong></div>
            <div class="premium-plan-row"><span>${t('followupDetail.control_appointment')}</span><strong>${followup.controlDate ? formatDate(followup.controlDate) : t('followupDetail.not_added')}</strong></div>
            <div class="premium-plan-row"><span>${t('followupDetail.status')}</span><strong>${followup.status === 'active' ? t('followupDetail.active') : t('followupDetail.closed')}</strong></div>
          </div>
        </div>

        <div class="premium-result-section">
          <div class="premium-icon-box">${window.__icons?.briefcase || ''}</div>
          <div>
            <h3>${t('followupDetail.vet_plan')}</h3>
            <p>${escapeHtml(followup.vetPlan || t('followupDetail.no_vet_plan'))}</p>
            ${followup.medSchedule ? `<p><strong>${t('followupDetail.med_schedule')}:</strong> ${escapeHtml(followup.medSchedule)}</p>` : ''}
            ${followup.prescriptionFile ? `<p><strong>${t('followupDetail.attachment')}:</strong> ${escapeHtml(followup.prescriptionFile.name)}</p>` : ''}
          </div>
        </div>

        <div class="premium-result-section">
          <div class="premium-icon-box">${window.__icons?.checkCircle || ''}</div>
          <div>
            <h3>${t('followupDetail.daily_checklist')}</h3>
            <ul>${(followup.checklist || t('followupDetail.default_checklist')).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          </div>
        </div>

        <h3 class="section-title mt-4 mb-3">${t('followupDetail.history')}</h3>
        <div class="card p-0 bg-white" style="border: 1px solid var(--border-color); overflow: hidden;">
          <div class="p-4" style="border-bottom: 1px solid var(--border-color);">
            <div class="flex items-center gap-3">
              <div class="risk-dot"></div>
              <div>
                <div class="text-sm font-bold">${t('followupDetail.started')}</div>
                <div class="text-xs text-secondary">${formatDate(followup.createdAt || new Date().toISOString())}</div>
              </div>
            </div>
          </div>
          ${renderHistory(followup.history)}
        </div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnStartCheck" data-case="${caseId}">${t('followupDetail.do_today_check')}</button>
          <button class="btn btn-secondary btn-full" id="btnShareSummary">${t('followupDetail.prepare_vet_summary')}</button>
          <button class="btn btn-ghost btn-full text-danger" id="btnEndFollowup">${t('followupDetail.end_followup')}</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnStartCheck')?.addEventListener('click', (event) => {
    resetSession();
    navigate(`/followups/${event.currentTarget.dataset.case}/check`);
  });
  document.getElementById('btnShareSummary')?.addEventListener('click', () => {
    showToast(t('followupDetail.summary_ready'));
  });
  document.getElementById('btnEndFollowup')?.addEventListener('click', async () => {
    const ok = await showConfirmDialog({
      title: t('followupDetail.end_title'),
      message: t('followupDetail.end_message'),
      confirmText: t('followupDetail.end_confirm'),
      danger: true
    });
    if (!ok) return;
    setState(state => {
      const target = state.followups?.find(item => item.id === params.caseId);
      if (target) target.status = 'closed';
    });
    showToast(t('followupDetail.ended'));
    navigate('/home');
  });
}
