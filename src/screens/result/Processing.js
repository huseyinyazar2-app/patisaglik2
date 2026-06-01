import { navigate } from '../../router.js';
import { getState } from '../../store.js';
import { t } from '../../i18n/tr.js';

function getProcessingSteps(session) {
  const tasks = session.tasks || [];
  const hasEvidence = (session.media || []).length > 0
    || tasks.some(task => ['photo', 'video', 'audio', 'measurement', 'physical_exam', 'mixed', 'comparison'].includes(task.type) && task.status === 'completed');

  const steps = [
    'Şikayet ve belirtiler değerlendiriliyor',
    'Yanıtlar klinik risk açısından kontrol ediliyor',
  ];

  if (hasEvidence) {
    steps.push('Eklenen medya ve ölçümler inceleniyor');
  }

  steps.push('Ön değerlendirme raporu hazırlanıyor');
  return steps;
}

export function render(params = {}, query = {}) {
  const state = getState();
  const steps = getProcessingSteps(state.session || {});

  return `
    <div class="screen">
      <div class="processing-screen" style="padding: 40px 24px;">
        <div class="processing-animation" style="margin-bottom: 32px;">
          <div class="processing-animation-icon" style="font-size: 38px; color: var(--primary); display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 10px rgba(14, 165, 233, 0.25));">${window.__icons?.activity || window.__icons?.spark || ''}</div>
        </div>

        <h1 class="processing-title" style="letter-spacing: -0.01em; font-weight: 800; font-size: 24px; margin-bottom: 8px;">${t('processing.title')}</h1>
        <p class="processing-desc" style="color: var(--text-secondary); font-weight: 500; font-size: 14px; margin-bottom: 40px;">${t('processing.desc')}</p>

        <div class="card" style="background: rgba(255, 255, 255, 0.6); padding: 24px; border: 1.5px solid rgba(255, 255, 255, 0.5); width: 100%; max-width: 320px; margin: 0 auto; box-shadow: var(--shadow-sm);">
          <div class="processing-steps-container">
            ${steps.map((step, i) => `
              <div class="processing-step" id="p-step-${i}" style="opacity: 0.35; display: flex; align-items: center; gap: 14px; margin-bottom: 16px; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                <div class="step-icon" style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 700; color: var(--text-tertiary);">•</div>
                <div class="text-sm font-semibold text-secondary" style="font-size: 13px; line-height: 1.4;">${step}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="info-box info" style="margin-top: 48px; width: 100%; text-align: left; padding: 12px 16px; border-radius: var(--radius-lg); background: rgba(14, 165, 233, 0.05); border: 1px solid rgba(14, 165, 233, 0.15);">
          <span style="font-size: 16px; margin-right: 8px; display: inline-flex; align-items: center;">${window.__icons?.alert || ''}</span>
          <span style="font-size: 12px; font-weight: 500; line-height: 1.5; color: var(--primary-dark);">${t('processing.disclaimer')}</span>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  const steps = getProcessingSteps(state.session || {}).length;
  let currentStep = 0;

  const runStep = () => {
    if (currentStep > 0) {
      const prev = document.getElementById(`p-step-${currentStep - 1}`);
      if (prev) {
        prev.style.opacity = '1';
        prev.querySelector('.step-icon').innerHTML = `<div style="color: var(--risk-low); display: flex; align-items: center; justify-content: center; width: 18px; height: 18px;">${window.__icons?.check || '✓'}</div>`;
        const txt = prev.querySelector('.text-sm');
        txt.style.color = 'var(--risk-low)';
        txt.style.fontWeight = '700';
      }
    }

    if (currentStep < steps) {
      const curr = document.getElementById(`p-step-${currentStep}`);
      if (curr) {
        curr.style.opacity = '1';
        curr.querySelector('.step-icon').innerHTML = `<div class="spinner" style="width: 14px; height: 14px; border: 2.5px solid rgba(14, 165, 233, 0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>`;
        const txt = curr.querySelector('.text-sm');
        txt.style.color = 'var(--primary-dark)';
        txt.style.fontWeight = '700';
      }

      currentStep++;
      setTimeout(runStep, 850);
    } else {
      setTimeout(() => {
        navigate('/check/new/result');
      }, 600);
    }
  };

  setTimeout(runStep, 400);
}
