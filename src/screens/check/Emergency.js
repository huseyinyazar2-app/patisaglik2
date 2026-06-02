import { navigate } from '../../router.js';
import { getState, resetSession } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { redFlagQuestions } from '../../mock/questions.js';

export function render(params = {}, query = {}) {
  const state = getState();
  const session = state.session || {};
  
  // Find which ones were answered "yes"
  const emergencyFindings = [];
  if (session.redFlagAnswers) {
    Object.keys(session.redFlagAnswers).forEach(qId => {
      if (session.redFlagAnswers[qId] === 'yes') {
        // Find question text
        for (const cat in redFlagQuestions) {
          const q = redFlagQuestions[cat].find(x => x.id === qId);
          if (q) emergencyFindings.push(q.text);
        }
      }
    });
  }
  
  const findingsHtml = emergencyFindings.map(f => `
    <div class="emergency-finding-item">
      <span class="modern-button-icon">${window.__icons?.alert}</span>
      <span>${f}</span>
    </div>
  `).join('');

  return `
    <div class="screen">
      <div class="emergency-screen" style="padding: 30px 20px;">
        <!-- Emergency Triage Card -->
        <div class="card mb-6" style="background: rgba(254, 242, 242, 0.7); backdrop-filter: blur(20px); border: 2px solid var(--risk-critical); text-align: center; padding: 32px 20px; box-shadow: 0 12px 30px rgba(239, 68, 68, 0.15);">
          <div class="emergency-icon" style="background: rgba(239,68,68,0.1); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 4px 12px rgba(239,68,68,0.2);">
            ${window.__icons?.alert}
          </div>
          <h1 class="emergency-title" style="letter-spacing: -0.02em; font-weight: 800; font-size: 26px; margin-bottom: 12px;">${t('emergency.title')}</h1>
          <p class="emergency-desc" style="color: #991B1B; font-weight: 600; font-size: var(--font-size-base); line-height: 1.6;">${t('emergency.desc')}</p>
        </div>
        
        ${emergencyFindings.length > 0 ? `
          <div class="card mb-6" style="background: rgba(255, 255, 255, 0.6); padding: 20px; border: 1.5px solid rgba(239, 68, 68, 0.2);">
            <div class="emergency-findings-title" style="font-weight: 700; color: var(--risk-critical); margin-bottom: 12px; font-size: 14px;">Tespit Edilen Acil Belirtiler:</div>
            <div class="flex flex-col gap-3">
              ${findingsHtml}
            </div>
          </div>
        ` : ''}
        
        <div class="info-box danger mb-6" style="padding: 14px 18px; border-radius: var(--radius-lg);">
          <div style="font-weight: 800; margin-bottom: 4px; font-size: 14px;">${t('emergency.important_warning')}</div>
          <div style="font-size: 12px; font-weight: 500; line-height: 1.5;">${t('emergency.important_warning_desc')}</div>
        </div>
        
        <div class="flex flex-col gap-3 w-full" style="margin-bottom: 24px;">
          <button class="btn btn-danger btn-full btn-lg" id="btnFindClinic" style="padding: 15px; border-radius: var(--radius-xl); font-size: 15px; font-weight: 800; box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3);">
            <span class="modern-button-icon">${window.__icons?.stethoscope}</span>
            ${t('emergency.find_clinic')}
          </button>
          
          <button class="btn btn-outline btn-full" id="btnCreateSummary" style="padding: 14px; border-radius: var(--radius-xl); font-weight: 700; background: rgba(255,255,255,0.4); backdrop-filter: blur(10px);">
            <span class="modern-button-icon">${window.__icons?.reports || window.__icons?.clipboard}</span>
            ${t('emergency.create_summary')}
          </button>
          
          <button class="btn btn-ghost btn-full" id="btnSaveHistory" style="font-weight: 700;">
            ${t('emergency.save_record')}
          </button>
          
          <button class="btn btn-ghost btn-full text-secondary" id="btnHome" style="font-weight: 700;">
            ${t('emergency.go_home')}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnFindClinic')?.addEventListener('click', () => {
    // Open maps search for vet clinics
    window.open('https://www.google.com/maps/search/veterinary+clinic', '_blank');
  });
  
  document.getElementById('btnCreateSummary')?.addEventListener('click', () => {
    // Usually would generate a PDF, for mock navigate to report preview
    navigate('/check/new/summary');
  });
  
  document.getElementById('btnSaveHistory')?.addEventListener('click', () => {
    resetSession();
    navigate('/history');
  });
  
  document.getElementById('btnHome')?.addEventListener('click', () => {
    resetSession();
    navigate('/home');
  });
}
