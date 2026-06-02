import { navigate } from '../../router.js';
import { getState, setState, resetSession } from '../../store.js';
import { showToast } from '../../ui/toast.js';
import { t, translateForLocale } from '../../i18n/tr.js';

function trValue(key) {
  return translateForLocale('tr', key);
}

function trList(key) {
  const value = trValue(key);
  return Array.isArray(value) ? value : [];
}

function riskForCheck(check = {}) {
  const sideEffects = check.sideEffects || [];
  const findings = check.findings || [];
  if (check.status === 'worse') return 'critical';
  if (sideEffects.some(item => trList('followupResult.critical_side_effects').includes(item))) return 'critical';
  if (findings.some(item => trList('followupResult.high_findings').includes(item))) return 'high';
  if (trList('followupResult.medium_med_statuses').includes(check.medStatus)) return 'medium';
  if (check.status === 'improved') return 'low';
  return 'medium';
}

function resultMeta(level) {
  const value = t(`followupResult.levels.${level}`);
  return typeof value === 'object' ? value : t('followupResult.levels.medium');
}

export function render(params = {}) {
  const check = getState().session?.followupCheck || { status: 'same' };
  const level = riskForCheck(check);
  const meta = resultMeta(level);

  return `
    <div class="screen premium-result">
      <div class="header premium-soft-header">
        <div class="header-left"></div>
        <div class="header-title">${t('followupResult.title')}</div>
        <div class="header-right"></div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="premium-risk-card ${meta.cls}">
          <div>
            <div class="premium-screen-kicker">${t('followupResult.kicker')}</div>
            <h1>${meta.title}</h1>
            <p>${meta.desc}</p>
            <small>${t('followupResult.disclaimer')}</small>
          </div>
          <div class="premium-risk-icon">${window.__icons?.[meta.icon] || ''}</div>
        </div>

        <div class="premium-result-section">
          <div class="premium-icon-box">${window.__icons?.clipboard || ''}</div>
          <div>
            <h3>${t('followupResult.today_record')}</h3>
            <p><strong>${t('followupResult.medication_application')}:</strong> ${check.medStatus || t('followupResult.not_specified')}</p>
            <p><strong>${t('followupResult.findings')}:</strong> ${(check.findings || []).join(', ') || t('followupResult.no_extra_finding')}</p>
            <p><strong>${t('followupResult.side_effect')}:</strong> ${(check.sideEffects || []).join(', ') || t('followupResult.not_reported')}</p>
            ${check.notes ? `<p><strong>${t('followupResult.note')}:</strong> ${check.notes}</p>` : ''}
            ${check.photo ? `<p><strong>${t('followupResult.photo')}:</strong> ${check.photo.name}</p>` : ''}
          </div>
        </div>

        <div class="premium-result-section danger">
          <div class="premium-icon-box">${window.__icons?.xCircle || ''}</div>
          <div>
            <h3>${t('followupResult.safe_limits')}</h3>
            <ul>
              ${t('followupResult.safe_steps').map(step => `<li>${step}</li>`).join('')}
            </ul>
          </div>
        </div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnBackToDetail" data-case="${params.caseId}">${t('followupResult.back_to_detail')}</button>
          ${level === 'high' || level === 'critical' ? `<button class="btn btn-secondary btn-full" id="btnFindVet">${t('followupResult.find_clinic')}</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  document.getElementById('btnBackToDetail')?.addEventListener('click', () => {
    const caseId = params.caseId;
    const check = getState().session?.followupCheck || { status: 'same', timestamp: new Date().toISOString() };
    const level = riskForCheck(check);
    const meta = resultMeta(level);

    setState(state => {
      const followup = state.followups?.find(item => item.id === caseId);
      if (followup) {
        followup.history = followup.history || [];
        followup.history.unshift(check);
        followup.lastRiskLevel = level;
        followup.nextCheck = new Date(Date.now() + meta.nextHours * 60 * 60 * 1000).toISOString();
      }
    });

    resetSession();
    navigate(`/followups/${caseId}`);
  });

  document.getElementById('btnFindVet')?.addEventListener('click', () => {
    showToast(t('followupResult.map_opening'));
    window.open('https://www.google.com/maps/search/?api=1&query=veterinary+clinic', '_blank', 'noopener,noreferrer');
  });
}
