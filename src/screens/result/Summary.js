import { navigate, goBack } from '../../router.js';
import { getState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { categoryLabels, redFlagQuestions } from '../../data/questions.js';
import { getFeatureCreditAvailability } from '../../services/billing.js';
import { showToast } from '../../ui/toast.js';

export function render(params = {}, query = {}) {
  const state = getState();
  const session = state.session || {};
  
  const cats = (session.categories || []).map(c => categoryLabels[c] || c).join(', ');
  
  // Find red flags answered yes
  const emergencyFindings = [];
  if (session.redFlagAnswers) {
    Object.keys(session.redFlagAnswers).forEach(qId => {
      if (session.redFlagAnswers[qId] === 'yes') {
        for (const cat in redFlagQuestions) {
          const q = redFlagQuestions[cat].find(x => x.id === qId);
          if (q) emergencyFindings.push(q.text);
        }
      }
    });
  }

  // Pending tasks?
  const pendingTasks = (session.tasks || []).filter(t => t.status === 'pending');

  return `
    <div class="screen">
      <div class="header" style="background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title" style="font-weight: 700;">${t('summary.step_title')}</div>
        <div class="header-right"></div>
      </div>
      
      <div class="progress-bar" style="height: 5px; background: rgba(0,0,0,0.03);">
        <div class="progress-bar-fill" style="width: 80%; background: linear-gradient(90deg, var(--teal) 0%, var(--primary) 100%); height: 100%;"></div>
      </div>
      
      <div class="section pt-6" style="padding-bottom: 140px;">
        <h2 class="text-2xl font-bold mb-6">${t('summary.title')}</h2>
        
        <!-- Complaint Summary Card -->
        <div class="card mb-4" style="padding: 20px;">
          <div class="summary-section-title" style="font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; font-size: 11px; margin-bottom: 12px; letter-spacing: 0.05em;">
            <span>${t('summary.complaint')}</span>
          </div>
          <p class="text-sm text-primary-dark font-semibold" style="font-size: 15px; line-height: 1.5;">"${session.complaintText || t('common.not_specified')}"</p>
          <div class="mt-2 text-xs text-secondary" style="font-weight: 600;">
            ${session.duration ? `${t('summary.duration')}: ${session.duration} • ` : ''} 
            ${session.severity ? `${t('summary.severity')}: ${session.severity}` : ''}
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            ${(session.selectedChips || []).map(c => `<span class="chip-status primary text-xs" style="font-weight: 700; font-size: 10px; border-radius: var(--radius-full); padding: 3px 10px;">${c}</span>`).join('')}
          </div>
        </div>
        
        <!-- Category Summary Card -->
        <div class="card mb-4" style="padding: 20px;">
          <div class="summary-section-title" style="font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; font-size: 11px; margin-bottom: 8px; letter-spacing: 0.05em;">${t('summary.categories')}</div>
          <p class="text-sm font-semibold" style="color: var(--text-primary); font-size: 15px;">${cats || t('summary.general')}</p>
        </div>
        
        <!-- Red Flags Summary Card -->
        <div class="card mb-4" style="padding: 20px;">
          <div class="summary-section-title" style="font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; font-size: 11px; margin-bottom: 12px; letter-spacing: 0.05em;">${t('summary.redflags')}</div>
          ${emergencyFindings.length > 0 
            ? emergencyFindings.map(f => `<div class="summary-item text-danger" style="display: flex; gap: 8px; align-items: start; font-size: 14px; font-weight: 600;"><span class="summary-item-icon">⚠️</span><span>${f}</span></div>`).join('')
            : `<p class="text-sm text-success font-semibold" style="display: flex; align-items: center; gap: 6px; font-size: 15px;">✅ ${t('summary.no_redflags')}</p>`
          }
        </div>
        
        <!-- Answers Summary Card -->
        <div class="card mb-4" style="padding: 20px;">
          <div class="summary-section-title" style="font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; font-size: 11px; margin-bottom: 8px; letter-spacing: 0.05em;">
            <span>${t('summary.answers')}</span>
          </div>
          <p class="text-sm text-secondary" style="font-weight: 600; font-size: 14px;">${t('summary.answers_count', { count: Object.keys(session.questionAnswers || {}).length })}</p>
        </div>
        
        <!-- Media / Tasks Records Card -->
        <div class="card mb-4" style="padding: 20px;">
          <div class="summary-section-title" style="font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; font-size: 11px; margin-bottom: 16px; letter-spacing: 0.05em;">
            <span>${t('summary.records')}</span>
          </div>
          <div class="flex gap-6" style="justify-content: flex-start;">
             <div class="text-center" style="min-width: 50px;">
               <div style="width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; color: var(--text-secondary); background: rgba(0,0,0,0.03); border-radius: 8px; padding: 6px; margin: 0 auto 6px;">
                 ${window.__icons?.camera}
               </div>
               <div class="text-xs font-extrabold mt-1" style="color: var(--text-primary);">${(session.tasks || []).filter(t => t.type === 'photo' && t.status === 'completed').length} ${t('summary.visual')}</div>
             </div>
             <div class="text-center" style="min-width: 50px;">
               <div style="width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; color: var(--text-secondary); background: rgba(0,0,0,0.03); border-radius: 8px; padding: 6px; margin: 0 auto 6px;">
                 ${window.__icons?.video}
               </div>
               <div class="text-xs font-extrabold mt-1" style="color: var(--text-primary);">${(session.tasks || []).filter(t => t.type === 'video' && t.status === 'completed').length} Video</div>
             </div>
             <div class="text-center" style="min-width: 50px;">
               <div style="width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; color: var(--text-secondary); background: rgba(0,0,0,0.03); border-radius: 8px; padding: 6px; margin: 0 auto 6px;">
                 ${window.__icons?.measurement}
               </div>
               <div class="text-xs font-extrabold mt-1" style="color: var(--text-primary);">${(session.measurements || []).length} ${t('summary.measurement')}</div>
             </div>
          </div>
          ${pendingTasks.length > 0 ? `
            <div class="info-box warning mt-3 py-2 px-3" style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.15); border-radius: 8px;">
              <span class="text-xs font-semibold" style="color: #92400E;">${t('summary.tasks_skipped', { count: pendingTasks.length, label: t('tasks.recommended') })}</span>
            </div>
          ` : ''}
        </div>
      </div>
      
      <div class="card" style="position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--max-width); border-radius: 28px 28px 0 0; padding: 20px 24px; box-shadow: var(--shadow-xl); z-index: 10; border-top: 1px solid rgba(255, 255, 255, 0.4); background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);">
        <button class="btn btn-primary btn-full btn-lg mb-3" id="btnEvaluate" style="padding: 14px; font-size: var(--font-size-md); border-radius: var(--radius-xl); box-shadow: var(--shadow-primary);">
          ✨ ${t('summary.evaluate')}
        </button>
        <button class="btn btn-ghost btn-full text-secondary" id="btnSaveDraft" style="font-weight: 700;">
          ${t('summary.save_draft')}
        </button>
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());

  
  document.getElementById('btnEvaluate')?.addEventListener('click', async () => {
    const button = document.getElementById('btnEvaluate');
    const originalText = button?.textContent || '';
    if (button) {
      button.disabled = true;
      button.textContent = t('summary.checking_credit');
    }
    try {
      const state = getState();
      const credit = await getFeatureCreditAvailability({ userId: state.user?.id || 'user-1', featureCode: 'ai-triage' });
      if (!credit.ok) {
        showToast(t('planScreen.insufficient_credits'));
        if (button) {
          button.disabled = false;
          button.textContent = originalText;
        }
        return;
      }
      navigate('/check/new/processing');
    } catch (error) {
      showToast(`${t('summary.credit_check_failed')}: ${error.message || error}`);
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  });
  
  document.getElementById('btnSaveDraft')?.addEventListener('click', () => {
    navigate('/home');
  });
}
