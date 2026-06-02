import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { redFlagQuestions } from '../../mock/questions.js';
import { showToast } from '../../ui/toast.js';

export function render() {
  const state = getState();
  const session = state.session || {};
  const groups = session.redFlagGroups || ['general'];
  const matchedIds = session.matchedComplaintIds || [];
  const generalCoreIds = new Set([
    'rf_breathing_difficulty',
    'rf_collapse',
    'rf_seizure',
    'rf_major_trauma',
    'rf_abnormal_gums'
  ]);

  if (matchedIds.some(id => ['vomiting', 'diarrhea', 'loss_of_appetite', 'toxin_foreign_body'].includes(id))) {
    generalCoreIds.add('rf_toxic_ingestion');
  }
  if (matchedIds.includes('urination_problem')) {
    generalCoreIds.add('rf_unable_to_urinate');
  }
  if (matchedIds.some(id => ['wound_swelling', 'trauma', 'pain'].includes(id))) {
    generalCoreIds.add('rf_severe_bleeding');
  }

  let questions = [];
  groups.forEach(group => {
    const groupQuestions = redFlagQuestions[group] || [];
    if (group === 'general') {
      questions = [...questions, ...groupQuestions.filter(q => generalCoreIds.has(q.id))];
    } else {
      questions = [...questions, ...groupQuestions];
    }
  });

  questions = [...new Map(questions.map(item => [item.text, item])).values()];

  const questionsHtml = questions.map(q => `
    <div class="card mb-4" data-question-id="${q.id}" style="padding: 20px;">
      <p class="font-bold text-base mb-3" style="color: var(--text-primary); line-height: 1.4;">${q.text}</p>
      <div class="form-group flex gap-2" style="margin-bottom: 0;">
        <label class="radio-item flex-1 text-center" style="padding: 12px 4px; border-radius: var(--radius-md); justify-content: center;">
          <input type="radio" name="rf_${q.id}" value="yes" class="hidden">
          <span style="font-size: 13px; font-weight: 700;">${t('redflags.yes')}</span>
        </label>
        <label class="radio-item flex-1 text-center" style="padding: 12px 4px; border-radius: var(--radius-md); justify-content: center;">
          <input type="radio" name="rf_${q.id}" value="no" class="hidden">
          <span style="font-size: 13px; font-weight: 700;">${t('redflags.no')}</span>
        </label>
        <label class="radio-item flex-1 text-center" style="padding: 12px 4px; border-radius: var(--radius-md); justify-content: center;">
          <input type="radio" name="rf_${q.id}" value="unsure" class="hidden">
          <span style="font-size: 13px; font-weight: 700;">${t('redflags.unsure')}</span>
        </label>
      </div>
    </div>
  `).join('');

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title" style="font-weight: 700;">${t('redflags.step_title')}</div>
        <div class="header-right"></div>
      </div>

      <div class="progress-bar" style="height: 5px; background: rgba(0,0,0,0.03);">
        <div class="progress-bar-fill" style="width: 20%; background: linear-gradient(90deg, var(--primary-dark) 0%, var(--primary) 100%); height: 100%;"></div>
      </div>

      <div class="section pt-4" style="padding-bottom: 120px;">
        <div class="card mb-6" style="background: #FFF7F4; border: 1.5px solid #F1C3BA; padding: 18px 20px; box-shadow: 0 8px 24px rgba(180, 35, 24, 0.05);">
          <div class="flex items-center gap-3 mb-2">
            <span style="width: 24px; height: 24px; color: var(--risk-critical); display: inline-flex;">${window.__icons?.alert}</span>
            <h2 class="text-xl font-bold text-risk-critical" style="letter-spacing: -0.01em;">${t('redflags.title')}</h2>
          </div>
          <p class="text-sm text-secondary" style="font-weight: 500; line-height: 1.5; color: #991B1B;">${t('redflags.desc')}</p>
        </div>

        <div class="red-flag-list">
          ${questionsHtml}
        </div>
      </div>

      <div class="card" style="position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--max-width); border-radius: 24px 24px 0 0; padding: 20px 24px; box-shadow: var(--shadow-xl); z-index: 10; border-top: 1px solid rgba(229, 222, 209, 0.8); background: rgba(255, 254, 251, 0.86); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);">
        <button class="btn btn-primary btn-full" id="btnContinue" style="padding: 14px; font-size: var(--font-size-md); border-radius: var(--radius-lg);">${t('check.continue')}</button>
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());

  document.querySelectorAll('.red-flag-list .radio-item').forEach(label => {
    label.addEventListener('click', () => {
      const input = label.querySelector('input');
      const name = input.name;

      document.querySelectorAll(`input[name="${name}"]`).forEach(inp => {
        const lbl = inp.parentElement;
        lbl.style.background = '';
        lbl.style.borderColor = 'var(--border-color)';
        lbl.style.color = 'var(--text-primary)';
      });

      input.checked = true;
      if (input.value === 'yes') {
        label.style.background = 'var(--risk-critical-bg)';
        label.style.borderColor = 'var(--risk-critical)';
        label.style.color = 'var(--risk-critical)';
      } else if (input.value === 'no') {
        label.style.background = 'var(--risk-low-bg)';
        label.style.borderColor = 'var(--risk-low)';
        label.style.color = 'var(--risk-low)';
      } else {
        label.style.background = 'var(--gray-100)';
        label.style.borderColor = 'var(--gray-400)';
      }
    });
  });



  document.getElementById('btnContinue')?.addEventListener('click', () => {
    const allQuestions = document.querySelectorAll('.red-flag-list .card');
    const answeredCount = document.querySelectorAll('.red-flag-list input:checked').length;
    
    if (answeredCount < allQuestions.length) {
      showToast(t('redflags.required_all'));
      return;
    }
    
    const answers = {};
    let hasEmergency = false;
    const uncertainRedFlags = [];

    document.querySelectorAll('.red-flag-list input:checked').forEach(input => {
      const qId = input.name.replace('rf_', '');
      answers[qId] = input.value;
      if (input.value === 'yes') hasEmergency = true;
      if (input.value === 'unsure') uncertainRedFlags.push(qId);
    });

    setState(state => {
      state.session.redFlagAnswers = answers;
      state.session.uncertainRedFlags = uncertainRedFlags;
      state.session.redFlagUncertain = uncertainRedFlags.length > 0;
    });

    navigate(hasEmergency ? '/check/new/emergency' : '/check/new/questions');
  });
}
