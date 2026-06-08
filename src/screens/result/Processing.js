import { navigate } from '../../router.js';
import { getState, setState } from '../../store.js';
import { getActivePet } from '../../services/pets.js';
import { postApiJson } from '../../services/apiClient.js';
import { recordFeatureUsage } from '../../services/billing.js';
import { questionSets, redFlagQuestions, categoryLabels } from '../../data/questions.js';
import { t } from '../../i18n/tr.js';
import { showToast } from '../../ui/toast.js';

function getProcessingSteps(session) {
  const tasks = session.tasks || [];
  const hasEvidence = (session.media || []).length > 0
    || tasks.some(task => ['photo', 'video', 'audio', 'measurement', 'physical_exam', 'mixed', 'comparison'].includes(task.type) && task.status === 'completed');

  const steps = [
    t('processing.step_complaint'),
    t('processing.step_risk'),
  ];

  if (hasEvidence) {
    steps.push(t('processing.step_evidence'));
  }

  steps.push(t('processing.step_report'));
  return steps;
}

function findQuestion(id) {
  return Object.values(questionSets).flatMap(set => set.questions || []).find(question => question.id === id);
}

function redFlagText(id) {
  for (const group of Object.values(redFlagQuestions)) {
    const question = group.find(item => item.id === id);
    if (question) return question.text;
  }
  return id;
}

function mediaInlinePart(media, totalBytes) {
  const dataUrl = String(media.dataUrl || '');
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { ref: { omitted: true, omitReason: 'missing_data_url' }, inline: null, nextTotal: totalBytes };
  const mimeType = media.mimeType || match[1];
  const base64 = match[2];
  const byteSize = Math.ceil(base64.length * 0.75);
  const nextTotal = totalBytes + byteSize;
  if (byteSize > 6 * 1024 * 1024 || nextTotal > 12 * 1024 * 1024) {
    return { ref: { omitted: true, omitReason: 'media_too_large_for_inline_ai' }, inline: null, nextTotal: totalBytes };
  }
  return {
    ref: { omitted: false, inlineBytes: byteSize },
    inline: { mediaId: media.id, mimeType, base64 },
    nextTotal
  };
}

function buildAiRequest(state) {
  const session = state.session || {};
  const pet = getActivePet(state.activePetId);
  const media = session.media || [];
  let totalInlineBytes = 0;
  const inlineMedia = [];
  const mediaRefs = media.map(item => {
    const inline = mediaInlinePart(item, totalInlineBytes);
    totalInlineBytes = inline.nextTotal;
    if (inline.inline) inlineMedia.push(inline.inline);
    return {
      mediaId: item.id,
      taskId: item.taskId,
      type: item.type,
      source: item.source,
      name: item.name,
      mimeType: item.mimeType,
      size: item.size,
      quality: item.quality,
      note: item.note,
      qualityCheck: item.qualityCheck || null,
      ...inline.ref
    };
  });
  const answers = Object.entries(session.questionAnswers || {}).map(([questionId, answer]) => {
    const question = findQuestion(questionId);
    return { questionId, question: question?.text_tr || question?.text || questionId, answer };
  });
  const redFlags = Object.entries(session.redFlagAnswers || {}).map(([questionId, answer]) => ({
    questionId,
    question: redFlagText(questionId),
    answer
  }));
  const payload = {
    pet: pet ? {
      id: pet.id,
      name: pet.name,
      type: pet.type,
      breed: pet.breed,
      age: pet.age,
      weight: pet.weight,
      neutered: pet.neutered,
      chronicDiseases: pet.chronicDiseases || [],
      allergies: pet.allergies || [],
      medications: pet.medications || [],
      rawHistory: pet.rawHistory || '',
      riskTags: pet.riskTags || [],
      riskContext: pet.riskContext || null
    } : null,
    complaint: {
      text: session.complaintText || '',
      selectedChips: session.selectedChips || [],
      primaryComplaintLabel: session.primaryComplaintLabel || '',
      categories: (session.categories || []).map(id => ({ id, label: categoryLabels[id] || id })),
      classifierConfidence: session.classifierConfidence || null,
      classifierReasons: session.classifierReasons || {}
    },
    history: session.historySnapshot || {},
    redFlags,
    answers,
    tasks: (session.tasks || []).map(task => ({
      id: task.id,
      key: task.key,
      title: task.title,
      type: task.type,
      priority: task.priority,
      status: task.status,
      quality: task.quality,
      note: task.note,
      qualityCheck: task.qualityCheck || null
    })),
    measurements: session.measurements || []
  };
  return { payload, mediaRefs, inlineMedia };
}

function writeAiDebugLog(entry) {
  try {
    const current = JSON.parse(localStorage.getItem('pati_ai_debug_logs') || '[]');
    current.unshift({ ...entry, createdAt: new Date().toISOString() });
    localStorage.setItem('pati_ai_debug_logs', JSON.stringify(current.slice(0, 25)));
  } catch {}
}

async function runAiTriage() {
  const state = getState();
  const request = buildAiRequest(state);
  writeAiDebugLog({ featureCode: 'ai-triage', direction: 'request', request: { ...request, inlineMedia: request.inlineMedia.map(item => ({ mediaId: item.mediaId, mimeType: item.mimeType, base64Length: item.base64.length })) } });
  const response = await postApiJson('/api/ai/triage', {
    userId: state.user?.id || 'user-1',
    petId: state.activePetId || null,
    ...request
  });
  writeAiDebugLog({ featureCode: 'ai-triage', direction: 'response', aiJobId: response.aiJobId || null, response });
  if (!response.usage) {
    await recordFeatureUsage({
      userId: state.user?.id || 'user-1',
      petId: state.activePetId || null,
      featureCode: 'ai-triage',
      relatedId: response.aiJobId || null
    });
  }
  setState(current => {
    current.session.aiAssessment = { ...(response.data || {}), aiJobId: response.aiJobId || null };
    current.session.aiJobId = response.aiJobId || null;
    current.session.aiError = null;
  });
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
  let aiStarted = false;

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
      if (aiStarted) return;
      aiStarted = true;
      runAiTriage().then(() => {
        setTimeout(() => navigate('/check/new/result'), 350);
      }).catch((error) => {
        writeAiDebugLog({ featureCode: 'ai-triage', direction: 'error', error: error?.message || String(error) });
        setState(current => {
          current.session.aiAssessment = null;
          current.session.aiError = error?.message || 'ai_request_failed';
        });
        showToast(`${t('processing.ai_failed')}: ${error?.message || 'ai_request_failed'}`, { duration: 5000 });
        setTimeout(() => navigate('/check/new/summary'), 800);
      });
    }
  };

  setTimeout(runStep, 400);
}
