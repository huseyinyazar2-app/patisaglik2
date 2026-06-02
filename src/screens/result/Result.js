import { navigate } from '../../router.js';
import { getState, resetSession } from '../../store.js';
import { questionSets, categoryLabels } from '../../data/questions.js';
import { getActivePet } from '../../services/pets.js';
import { t } from '../../i18n/tr.js';
import { showToast } from '../../ui/toast.js';
import { saveVetReadyReport } from '../../services/vetReadyReports.js';

function tr(key, vars = {}) {
  const value = t(key);
  if (Array.isArray(value)) return value;
  return String(value).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

function answerValues(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function answerRisk(value) {
  const text = String(value).toLocaleLowerCase('tr-TR');
  if (text === 'hay\u0131r' || text === 'hi\u00e7' || text === 'normal' || text === 'skipped') return 0;
  if (text.includes('emin de\u011filim')) return 5;
  if (text.includes('s\u00fcrekli') || text.includes('hi\u00e7') || text.includes('mor') || text.includes('mavi') || text.includes('soluk')) return 24;
  if (text.includes('kan') || text.includes('\u015fiddetli') || text.includes('\u00e7ok') || text.includes('4 veya')) return 18;
  if (text.includes('evet') || text.includes('art') || text.includes('zor') || text.includes('azald\u0131')) return 10;
  if (text.includes('2-3') || text.includes('1 haftadan uzun')) return 8;
  return 2;
}

function calculateAssessment(session) {
  let score = 0;
  let redFlagAnswerCount = 0;
  let uncertainCount = session.uncertainRedFlags?.length || 0;
  let skippedCount = session.skippedQuestionIds?.length || 0;

  const hasEmergency = Object.values(session.redFlagAnswers || {}).includes('yes');
  if (hasEmergency) score += 100;
  if (uncertainCount > 0) score += uncertainCount * 14;

  Object.entries(session.questionAnswers || {}).forEach(([qId, value]) => {
    const question = Object.values(questionSets).flatMap(set => set.questions).find(q => q.id === qId);
    answerValues(value).forEach(val => {
      if (val === 'skipped') {
        skippedCount++;
        return;
      }
      if (question?.red_flag_values?.includes(val)) {
        score += 34;
        redFlagAnswerCount++;
      } else {
        score += answerRisk(val);
      }
    });
  });

  const context = session.petRiskContext || {};
  const tags = context.riskTags || [];
  const categories = session.categories || [];
  if (tags.includes('newborn_risk') || tags.includes('senior_risk')) score += 8;
  if (tags.includes('brachycephalic_risk') && categories.includes('respiratory_cough')) score += 10;
  if (tags.includes('diabetes_risk') && categories.includes('appetite_digestive')) score += 8;
  if (tags.includes('kidney_risk') && (categories.includes('urine_stool') || categories.includes('appetite_digestive'))) score += 8;
  if (tags.includes('cardiac_risk') && categories.includes('respiratory_cough')) score += 10;

  const tasks = session.tasks || [];
  const requiredTasks = tasks.filter(t => t.priority === 'required');
  const missingRequired = requiredTasks.filter(t => t.status !== 'completed').length;
  const completedEvidence = tasks.filter(t => t.status === 'completed');
  const skippedEvidence = tasks.filter(t => t.status === 'skipped' || t.status === 'pending');
  const poorQualityEvidence = completedEvidence.filter(t => t.quality && t.quality !== 'yes').length;

  if (missingRequired > 0) score += missingRequired * 12;
  if (poorQualityEvidence > 0) score += poorQualityEvidence * 7;

  let level = 'low';
  if (hasEmergency || score >= 80) level = 'critical';
  else if (score >= 55) level = 'high';
  else if (score >= 28) level = 'medium';

  const classifierConfidence = Math.round((session.classifierConfidence || 0.55) * 100);
  let confidence = classifierConfidence;
  confidence -= uncertainCount * 10;
  confidence -= skippedCount * 4;
  confidence -= missingRequired * 18;
  confidence -= poorQualityEvidence * 14;
  if (tasks.length > 0 && completedEvidence.length === 0) confidence -= 18;
  confidence = Math.max(22, Math.min(92, confidence));

  return {
    level,
    score,
    confidence,
    hasEmergency,
    uncertainCount,
    skippedCount,
    missingRequired,
    completedEvidence,
    skippedEvidence,
    poorQualityEvidence,
    redFlagAnswerCount
  };
}

function categoryGuidance(categories = []) {
  const steps = [];
  const warnings = [];

  if (categories.includes('appetite_digestive')) {
    steps.push(...tr('result.guidance.appetite_digestive.steps'));
    warnings.push(...tr('result.guidance.appetite_digestive.warnings'));
  }
  if (categories.includes('respiratory_cough')) {
    steps.push(...tr('result.guidance.respiratory_cough.steps'));
    warnings.push(...tr('result.guidance.respiratory_cough.warnings'));
  }
  if (categories.includes('movement_gait')) {
    steps.push(...tr('result.guidance.movement_gait.steps'));
    warnings.push(...tr('result.guidance.movement_gait.warnings'));
  }
  if (categories.includes('skin_fur')) {
    steps.push(...tr('result.guidance.skin_fur.steps'));
    warnings.push(...tr('result.guidance.skin_fur.warnings'));
  }
  if (categories.includes('eye')) {
    steps.push(...tr('result.guidance.eye.steps'));
    warnings.push(...tr('result.guidance.eye.warnings'));
  }
  if (categories.includes('ear')) {
    steps.push(...tr('result.guidance.ear.steps'));
    warnings.push(...tr('result.guidance.ear.warnings'));
  }
  if (categories.includes('urine_stool')) {
    steps.push(...tr('result.guidance.urine_stool.steps'));
    warnings.push(...tr('result.guidance.urine_stool.warnings'));
  }

  if (steps.length === 0) steps.push(...tr('result.guidance.default_steps'));
  if (warnings.length === 0) warnings.push(...tr('result.guidance.default_warnings'));

  return { steps: [...new Set(steps)].slice(0, 4), warnings: [...new Set(warnings)].slice(0, 4) };
}

function urgencyMeta(level) {
  const map = t('result.urgency');
  return map[level] || map.low;
}

export function render() {
  const state = getState();
  const session = state.session || {};
  const pet = getActivePet(state.activePetId);
  const assessment = calculateAssessment(session);
  const guidance = categoryGuidance(session.categories || []);
  const urgency = urgencyMeta(assessment.level);
  const urgent = assessment.level === 'critical' || assessment.level === 'high';
  const categoryText = (session.categories || []).map(c => categoryLabels[c] || c).join(', ') || t('result.category_general');
  const completedEvidenceText = assessment.completedEvidence.length > 0
    ? tr('result.evidence_done', { count: assessment.completedEvidence.length })
    : t('result.evidence_missing');
  const contextWarnings = session.petRiskContext?.warnings || [];

  return `
    <div class="screen premium-result">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnHomeIcon">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('result.screen_title')}</div>
        <div class="header-right">
          <button class="header-icon" id="btnPreviewReport">${window.__icons?.upload}</button>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="premium-risk-card ${assessment.level}">
          <div>
            <div class="premium-screen-kicker">${t('result.traffic_kicker')}</div>
            <h1>${urgency.title}</h1>
            <p>${urgency.desc}</p>
            <small>${tr('result.score_line', { score: assessment.score, confidence: assessment.confidence, evidence: completedEvidenceText })}</small>
          </div>
          <div class="premium-risk-icon">${urgent ? window.__icons?.alert : window.__icons?.checkCircle}</div>
        </div>

        <div class="traffic-light-card ${assessment.level}">
          ${['low', 'medium', 'high', 'critical'].map((level) => `
            <div class="traffic-light-step ${assessment.level === level ? 'active' : ''}">
              <span></span>
              <strong>${urgencyMeta(level).label}</strong>
              <small>${urgencyMeta(level).action}</small>
            </div>
          `).join('')}
        </div>

        ${assessment.confidence < 60 ? `
          <div class="premium-result-section danger">
            <div class="premium-icon-box">${window.__icons?.alert}</div>
            <div>
              <h3>${t('result.low_confidence_title')}</h3>
              <p>${t('result.low_confidence_desc')}</p>
            </div>
          </div>
        ` : ''}

        <div class="premium-result-section">
          <div class="premium-icon-box">${window.__icons?.clipboard}</div>
          <div>
            <h3>${t('result.clinical_summary')}</h3>
            <p>${tr('result.complaint_summary', { pet: pet?.name || t('result.pet_fallback'), complaint: session.complaintText || t('result.complaint_missing'), category: categoryText })}</p>
            <p>${completedEvidenceText} ${assessment.uncertainCount > 0 ? tr('result.uncertain_sentence', { count: assessment.uncertainCount }) : ''}</p>
          </div>
        </div>

        ${contextWarnings.length ? `
          <div class="premium-result-section warning">
            <div class="premium-icon-box">${window.__icons?.shield}</div>
            <div>
              <h3>${t('result.profile_context')}</h3>
              <ul>${contextWarnings.slice(0, 4).map(item => `<li>${item}</li>`).join('')}</ul>
            </div>
          </div>
        ` : ''}

        <div class="premium-result-section danger">
          <div class="premium-icon-box">${window.__icons?.alert}</div>
          <div>
            <h3>${t('result.watch_title')}</h3>
            <ul>${guidance.warnings.map(item => `<li>${item}</li>`).join('')}</ul>
            <p class="danger-text">${urgent ? t('result.urgent_home_warning') : t('result.watch_home_warning')}</p>
          </div>
        </div>

        <div class="premium-result-section">
          <div class="premium-icon-box">${window.__icons?.checkCircle}</div>
          <div>
            <h3>${t('result.safe_steps_title')}</h3>
            <ul>${guidance.steps.map(step => `<li>${step}</li>`).join('')}</ul>
          </div>
        </div>

        <div class="premium-result-section">
          <div class="premium-icon-box">${window.__icons?.xCircle}</div>
          <div>
            <h3>${t('result.dont_title')}</h3>
            <ul>${t('result.dont_items').map(item => `<li>${item}</li>`).join('')}</ul>
          </div>
        </div>

        <div class="premium-followup-plan">
          <div class="premium-icon-box">${window.__icons?.calendar}</div>
          <div>
            <h3>${urgent ? t('result.next_step_title') : t('result.followup_plan_title')}</h3>
            <div class="premium-plan-row"><span>${t('result.recommendation')}</span><strong>${urgency.action}</strong></div>
            <div class="premium-plan-row"><span>${t('result.reminder')}</span><strong>${urgent ? t('result.after_clinic') : t('result.open')}</strong></div>
            <div class="premium-plan-row"><span>${t('result.watch_duration')}</span><strong>${urgent ? t('result.immediately') : assessment.level === 'medium' ? '24 saat' : '48 saat'}</strong></div>
          </div>
        </div>

        <button class="btn btn-primary btn-full btn-lg mt-4" id="btnCreateFollowup">
          ${window.__icons?.clipboard} ${urgent ? t('result.create_vet_summary') : t('result.create_followup_plan')}
        </button>
        <button class="btn premium-gold-button btn-full btn-lg mt-3" id="btnPreviewReportBottom">
          ${window.__icons?.upload} ${t('result.create_vet_link')}
        </button>
        <button class="btn btn-secondary btn-full mt-3" id="btnVetOutcome">
          ${window.__icons?.stethoscope} ${t('result.add_vet_outcome')}
        </button>
        <button class="btn btn-ghost btn-full text-secondary mt-2" id="btnSaveHistoryOnly">${t('result.save_history_only')}</button>

        <div class="premium-privacy-note">${window.__icons?.lock} ${t('result.disclaimer')}</div>
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnHomeIcon')?.addEventListener('click', () => {
    resetSession();
    navigate('/home');
  });
  document.getElementById('btnSaveHistoryOnly')?.addEventListener('click', () => {
    resetSession();
    navigate('/home');
  });
  document.getElementById('btnCreateFollowup')?.addEventListener('click', () => navigate('/followups/new'));
  document.getElementById('btnVetOutcome')?.addEventListener('click', () => navigate('/check/new/vet-outcome'));
  const createReportLink = async () => {
    const state = getState();
    const session = state.session || {};
    const pet = getActivePet(state.activePetId);
    const assessment = calculateAssessment(session);
    const guidance = categoryGuidance(session.categories || []);
    const urgency = urgencyMeta(assessment.level);
    const report = saveVetReadyReport({ session, pet, assessment, guidance, urgency });
    const url = `${window.location.origin}${window.location.pathname}#${report.publicPath}`;
    try {
      await navigator.clipboard?.writeText(url);
      showToast(t('result.report_link_copied'));
    } catch {
      showToast(t('result.report_link_ready'));
    }
    navigate(report.publicPath);
  };
  document.getElementById('btnPreviewReport')?.addEventListener('click', createReportLink);
  document.getElementById('btnPreviewReportBottom')?.addEventListener('click', createReportLink);
}
