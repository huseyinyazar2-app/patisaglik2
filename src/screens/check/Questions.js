import { navigate, goBack } from '../../router.js';
import { getState, setState, resetSession } from '../../store.js';
import { t, translateForLocale } from '../../i18n/tr.js';
import { questionSets, taskDefinitions } from '../../data/questions.js';
import { showConfirmDialog } from '../../ui/toast.js';

let currentQuestionIndex = 0;
let allQuestions = [];

const MAX_BASE_QUESTIONS = 8;
const GENERAL_QUESTION_IDS = new Set(['gen_activity', 'gen_appetite', 'gen_water', 'gen_temperature']);
const STOOL_WATERY_ANSWER_IDS = new Set(['dia_frequency']);
const STOOL_CONSTIPATION_IDS = new Set(['con_straining', 'con_pain', 'con_vomit', 'con_appetite', 'con_urine_confusion']);

function optionSet(key) {
  const value = t(`questionOptionFixes.${key}`);
  return Array.isArray(value) ? value : [];
}

function normalize(value = '') {
  return String(value)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function hasGenericYesNoOptions(question) {
  const options = question.options || [];
  const yesNoUnsure = translateForLocale('tr', 'questionOptionFixes.yes_no_unsure');
  return options.length === yesNoUnsure.length && yesNoUnsure.every(option => options.includes(option));
}

function optionsForQuestion(question) {
  if (question.id === 'dia_frequency') return optionSet('stool_pattern');
  if (!hasGenericYesNoOptions(question)) return question.options;
  const text = question.text_tr || question.text || '';

  if (question.id === 'pain_location') {
    return optionSet('pain_location');
  }
  if (question.type === 'body_location' || /hangi bölgede|nerede|nerede yoğun/i.test(text)) {
    return optionSet('body_location');
  }
  if (/azaldı mı arttı mı/i.test(text)) return optionSet('change_trend');
  if (/kaç kez kustu/i.test(text)) return optionSet('vomit_count');
  if (/iştahı nasıl|iştah nasıl/i.test(text)) return optionSet('appetite');
  if (/su içmesi nasıl/i.test(text)) return optionSet('water_intake');
  if (/diş eti rengi nasıl/i.test(text)) return optionSet('gum_color');
  if (/yara bölgesi.*nasıl/i.test(text)) return optionSet('wound_change');
  if (/hangi işlem|hangi operasyon/i.test(text)) return optionSet('operation_type');

  return question.options;
}

function textForQuestion(question) {
  if (question.id === 'dia_frequency') return t('questionOptionFixes.stool_pattern_text');
  if (question.id === 'tox_amount' && hasGenericYesNoOptions(question)) {
    return t('questionOptionFixes.tox_amount_text');
  }
  return question.text_tr || question.text;
}

function uniqueQuestions(items) {
  return [...new Map(items.map(item => [item.id, item])).values()];
}

function semanticGroup(question) {
  const id = question.id || '';
  const text = normalize(question.text_tr || question.text || '');
  if (['gen_appetite', 'app_level', 'con_appetite'].includes(id) || text.includes('istah')) return 'appetite';
  if (['gen_water', 'app_water'].includes(id) || text.includes('su icmesi') || text.includes('su tuketimi')) return 'water';
  if (id === 'dia_frequency' || text.includes('sulu diski')) return 'stool_watery';
  if (id.startsWith('con_') || text.includes('kabiz') || text.includes('sert diski') || text.includes('diski yapmak icin zorlan')) return 'stool_constipation';
  return '';
}

function hasAnsweredGroup(answers, questions, group) {
  return Object.keys(answers || {}).some(id => {
    const question = questions.find(item => item.id === id);
    return question && semanticGroup(question) === group && answers[id] !== 'skipped';
  });
}

function shouldSkipQuestion(question, answers, questions) {
  if (!answers || answers[question.id] !== undefined) return false;

  const group = semanticGroup(question);
  if (group && hasAnsweredGroup(answers, questions, group)) return true;

  const hasWateryStoolAnswer = [...STOOL_WATERY_ANSWER_IDS].some(id => {
    const answer = normalize(answers[id]);
    return answer && answer !== 'skipped' && !answer.includes('emin') && !answer.includes('sert') && !answer.includes('zorlan');
  });
  if (hasWateryStoolAnswer && (STOOL_CONSTIPATION_IDS.has(question.id) || group === 'stool_constipation')) return true;

  const hasConstipationAnswer = [...STOOL_CONSTIPATION_IDS].some(id => normalize(answers[id]).includes('evet'));
  if (hasConstipationAnswer && (STOOL_WATERY_ANSWER_IDS.has(question.id) || group === 'stool_watery')) return true;

  return false;
}

function questionPriority(question, index) {
  if (question.required && GENERAL_QUESTION_IDS.has(question.id)) return 20 + index;
  if (question.required) return 40 + index;
  return 80 + index;
}

function buildSmartQuestionList(session) {
  const setIds = (session.questionSetIds && session.questionSetIds.length > 0) ? session.questionSetIds : ['general_condition_basic'];
  const initialSetIds = new Set(session.initialQuestionSetIds || setIds.slice(0, 2));
  const baseQuestions = [];
  const dynamicQuestions = [];

  setIds.forEach(setId => {
    const questions = questionSets[setId]?.questions || [];
    if (initialSetIds.has(setId)) baseQuestions.push(...questions);
    else dynamicQuestions.push(...questions);
  });

  const sortedBase = uniqueQuestions(baseQuestions)
    .map((question, index) => ({ question, priority: questionPriority(question, index) }))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_BASE_QUESTIONS)
    .map(item => item.question);

  const questions = uniqueQuestions([...sortedBase, ...dynamicQuestions]);
  return questions.filter(question => !shouldSkipQuestion(question, session.questionAnswers || {}, questions));
}

function getQuestionInputHtml(question) {
  const isMultiChoice = question.type === 'multi' || question.type === 'multi_choice';
  const isText = question.type === 'text' || question.type === 'open_ended';
  const options = optionsForQuestion(question);

  if (isText) {
    return `
      <textarea id="q_${question.id}" class="complaint-textarea w-full" placeholder="${question.placeholder || ''}" style="background: rgba(255, 255, 255, 0.45); border: 1.5px solid rgba(226, 232, 240, 0.65); padding: 16px; border-radius: var(--radius-lg);"></textarea>
    `;
  }

  if (!options?.length) {
    return `
      <textarea id="q_${question.id}" class="complaint-textarea w-full" placeholder="${t('questions.short_placeholder')}" style="background: rgba(255, 255, 255, 0.45); border: 1.5px solid rgba(226, 232, 240, 0.65); padding: 16px; border-radius: var(--radius-lg);"></textarea>
    `;
  }

  if (isMultiChoice) {
    return options.map(opt => `
      <label class="checkbox-item mb-3" style="display: flex; justify-content: space-between; align-items: center; padding: 18px; border-radius: var(--radius-lg); cursor: pointer; transition: all var(--transition-spring); border: 1.5px solid var(--border-color); background: var(--white);">
        <span style="font-size: 15px; font-weight: 600; color: var(--text-primary);">${opt}</span>
        <div class="check-box" style="width: 24px; height: 24px; border: 2px solid var(--gray-300); border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"></div>
        <input type="checkbox" name="q_${question.id}" value="${opt}" class="hidden">
      </label>
    `).join('');
  }

  return options.map(opt => `
    <label class="radio-item mb-3" style="display: flex; justify-content: space-between; align-items: center; padding: 18px; border-radius: var(--radius-lg); cursor: pointer; transition: all var(--transition-spring);">
      <span style="font-size: 15px; font-weight: 600; color: var(--text-primary);">${opt}</span>
      <div class="radio-dot"></div>
      <input type="radio" name="q_${question.id}" value="${opt}" class="hidden">
    </label>
  `).join('');
}

export function render() {
  const state = getState();
  const session = state.session || {};

  allQuestions = buildSmartQuestionList(session);

  if (!session.questionAnswers || Object.keys(session.questionAnswers).length === 0) {
    currentQuestionIndex = 0;
  }

  if (allQuestions.length === 0) {
    setTimeout(() => navigate('/check/new/complaint'), 0);
    return `<div class="screen screen-padded" style="display:flex;justify-content:center;align-items:center;">${t('common.loading')}</div>`;
  }

  if (currentQuestionIndex >= allQuestions.length) currentQuestionIndex = allQuestions.length - 1;

  const question = allQuestions[currentQuestionIndex];
  const progressPercent = ((currentQuestionIndex + 1) / allQuestions.length) * 100;

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title" style="font-weight: 700;">${t('questions.step_title', { current: currentQuestionIndex + 1, total: allQuestions.length })}</div>
        <div class="header-right">
          <button class="btn btn-ghost btn-sm text-primary" id="btnSkip" style="font-weight: 700;">${t('questions.skip')}</button>
        </div>
      </div>

      <div class="progress-bar" style="height: 5px; background: rgba(0,0,0,0.04);">
        <div class="progress-bar-fill" style="width: ${progressPercent}%; transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); height: 100%;"></div>
      </div>

      <div class="section pt-6" style="padding-bottom: 140px;">
        <div class="card mb-6" style="padding: 24px;">
          <h2 class="text-xl font-bold text-text-primary" style="line-height: 1.4; margin-bottom: 0;">${textForQuestion(question)}</h2>
        </div>

        <div class="question-options">
          ${getQuestionInputHtml(question)}
        </div>
      </div>

      <div class="card" style="position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--max-width); border-radius: 24px 24px 0 0; padding: 20px 24px; box-shadow: var(--shadow-xl); z-index: 10; border-top: 1px solid rgba(229, 222, 209, 0.8); background: rgba(255, 254, 251, 0.86); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); display: flex; flex-direction: column; gap: 8px;">
        <button class="btn btn-primary btn-full btn-lg" id="btnNext" disabled style="padding: 14px; font-size: var(--font-size-md); border-radius: var(--radius-lg);">${t('questions.next')}</button>
        <button class="btn btn-ghost btn-full text-secondary" id="btnPause" style="padding: 10px; font-size: 14px; font-weight: 600;">Teste Sonra Devam Et</button>
        <button class="btn btn-ghost btn-full text-danger" id="btnCancel" style="padding: 8px; font-size: 13px;">${t('questions.cancel_test')}</button>
      </div>
    </div>
  `;
}

export function afterRender() {
  const question = allQuestions[currentQuestionIndex];
  const btnNext = document.getElementById('btnNext');
  const isMultiChoice = question.type === 'multi' || question.type === 'multi_choice';
  const isText = question.type === 'text' || question.type === 'open_ended' || !question.options?.length;
  const isSingleLike = !isMultiChoice && !isText;

  if (isSingleLike) {
    document.querySelectorAll('.question-options .radio-item').forEach(label => {
      label.addEventListener('click', e => {
        if (e.target.tagName === 'INPUT') return;

        const input = label.querySelector('input');
        document.querySelectorAll('.question-options .radio-item').forEach(lbl => {
          lbl.style.borderColor = 'var(--border-color)';
          lbl.style.background = 'var(--white)';
          lbl.classList.remove('selected');
          lbl.querySelector('.radio-dot').classList.remove('selected');
        });

        input.checked = true;
        label.classList.add('selected');
        label.style.borderColor = 'var(--primary)';
        label.style.background = 'var(--primary-50)';
        label.querySelector('.radio-dot').classList.add('selected');
        btnNext.disabled = false;
      });
    });
  } else if (isMultiChoice) {
    btnNext.disabled = !!question.required;

    document.querySelectorAll('.question-options .checkbox-item').forEach(label => {
      label.addEventListener('click', e => {
        if (e.target.tagName === 'INPUT') return;

        const input = label.querySelector('input');
        const checkBox = label.querySelector('.check-box');
        input.checked = !input.checked;

        if (input.checked) {
          label.classList.add('selected');
          label.style.borderColor = 'var(--primary)';
          label.style.background = 'var(--primary-50)';
          checkBox.style.borderColor = 'var(--primary)';
          checkBox.style.background = 'var(--primary)';
          checkBox.innerHTML = `<span style="width: 14px; height: 14px; color: white;">${window.__icons?.checkCircle || ''}</span>`;
        } else {
          label.classList.remove('selected');
          label.style.borderColor = 'var(--border-color)';
          label.style.background = 'var(--white)';
          checkBox.style.borderColor = 'var(--gray-300)';
          checkBox.style.background = 'transparent';
          checkBox.innerHTML = '';
        }

        const anySelected = document.querySelectorAll('.question-options input[type="checkbox"]:checked').length > 0;
        btnNext.disabled = question.required ? !anySelected : false;
      });
    });
  } else {
    const textarea = document.getElementById(`q_${question.id}`);
    if (textarea) {
      textarea.addEventListener('input', () => {
        btnNext.disabled = question.required ? textarea.value.trim().length === 0 : false;
      });
      btnNext.disabled = !!question.required;
    }
  }

  document.getElementById('btnBack')?.addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      navigate('/check/new/questions?ts=' + Date.now());
    } else {
      goBack();
    }
  });

  const saveAnswerAndNext = (value) => {
    setState(state => {
      if (!state.session.questionAnswers) state.session.questionAnswers = {};
      state.session.questionAnswers[question.id] = value;

      if (value === 'skipped') {
        if (!state.session.skippedQuestionIds) state.session.skippedQuestionIds = [];
        if (!state.session.skippedQuestionIds.includes(question.id)) state.session.skippedQuestionIds.push(question.id);
      }

      const processValue = val => {
        if (question.followupQuestionSetIds?.[val]) {
          question.followupQuestionSetIds[val].forEach(setId => {
            if (!state.session.questionSetIds.includes(setId)) state.session.questionSetIds.push(setId);
          });
        }

        if (question.id === 'dia_frequency' && /sert|zorlan/i.test(String(val || ''))) {
          if (!state.session.questionSetIds.includes('constipation_basic')) state.session.questionSetIds.push('constipation_basic');
        }

        if (question.task_triggers) {
          if (!state.session.tasks) state.session.tasks = [];
          question.task_triggers.forEach(trigger => {
            if (trigger.if_value !== val) return;
            const exists = state.session.tasks.find(existing => existing.key === trigger.task_key);
            if (exists) return;

            const def = taskDefinitions.find(d => d.key === trigger.task_key || d.id === trigger.task_key) || {};
            state.session.tasks.push({
              key: trigger.task_key,
              id: `task-dyn-${Date.now()}-${Math.random()}`,
              status: 'pending',
              title: def.title_tr || trigger.task_key,
              type: def.type || 'photo',
              priority: def.priority || def.default_priority || 'recommended'
            });
          });
        }
      };

      if (Array.isArray(value)) value.forEach(processValue);
      else processValue(value);
    });

    if (currentQuestionIndex < allQuestions.length - 1) {
      currentQuestionIndex++;
      navigate('/check/new/questions?ts=' + Date.now());
    } else {
      navigate('/check/new/task-plan');
    }
  };

  btnNext?.addEventListener('click', () => {
    let answer = null;
    if (isSingleLike) {
      answer = document.querySelector(`input[name="q_${question.id}"]:checked`)?.value;
    } else if (isMultiChoice) {
      answer = Array.from(document.querySelectorAll(`input[name="q_${question.id}"]:checked`)).map(el => el.value);
    } else {
      answer = document.getElementById(`q_${question.id}`)?.value || '';
    }
    saveAnswerAndNext(answer);
  });

  document.getElementById('btnSkip')?.addEventListener('click', () => saveAnswerAndNext('skipped'));
  document.getElementById('btnPause')?.addEventListener('click', () => navigate('/home'));
  document.getElementById('btnCancel')?.addEventListener('click', async () => {
    const ok = await showConfirmDialog({
      title: t('questions.cancel_title'),
      message: t('questions.cancel_message'),
      confirmText: t('questions.cancel_confirm'),
      danger: true
    });
    if (!ok) return;
    resetSession();
    navigate('/home');
  });
}
