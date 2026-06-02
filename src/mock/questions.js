// Pati Sağlık — dynamic triage library adapter
import complaintTypes from '../health-library/complaint_types.json';
import questionSetsArray from '../health-library/question_sets.json';
import taskDefinitions from '../health-library/task_definitions.json';
import { getLocale, translateForLocale } from '../i18n/tr.js';
import { buildPetRiskContext } from '../services/petContext.js';

export { taskDefinitions };

export const questionSets = {};
questionSetsArray.forEach(qs => {
  questionSets[qs.id] = qs;
});

export const categoryLabels = {};
complaintTypes.forEach(ct => {
  categoryLabels[ct.category] = ct.name_tr;
});

function localText(locale, key, fallback) {
  const value = translateForLocale(locale || getLocale(), key);
  return value === key ? fallback : value;
}

function complaintLabel(id, locale = getLocale()) {
  const complaint = complaintTypes.find(ct => ct.id === id);
  return localText(locale, `triage.complaints.${id}`, complaint?.name_tr || id);
}

export function getSymptomChips(locale = getLocale()) {
  return complaintTypes.map(ct => complaintLabel(ct.id, locale));
}

export const symptomChips = getSymptomChips('tr');

const complaintMeta = {
  vomiting: { domain: 'digestive', compatible: ['loss_of_appetite', 'lethargy', 'diarrhea', 'toxin_foreign_body', 'mouth_dental', 'pain'], systemic: true },
  diarrhea: { domain: 'digestive', compatible: ['vomiting', 'loss_of_appetite', 'lethargy', 'toxin_foreign_body', 'weight_change'], systemic: true },
  loss_of_appetite: { domain: 'digestive', compatible: ['vomiting', 'diarrhea', 'lethargy', 'mouth_dental', 'weight_change', 'pain'], systemic: true },
  lethargy: { domain: 'general', compatible: ['vomiting', 'diarrhea', 'loss_of_appetite', 'breathing_issue', 'urination_problem', 'pain', 'toxin_foreign_body', 'neurologic', 'post_operation', 'post_vaccine_medication'], systemic: true },
  cough: { domain: 'respiratory', compatible: ['breathing_issue', 'lethargy', 'post_vaccine_medication'], systemic: false },
  breathing_issue: { domain: 'respiratory', compatible: ['cough', 'lethargy', 'toxin_foreign_body', 'pain'], systemic: false },
  eye_problem: { domain: 'eye', compatible: ['skin_itching', 'wound_swelling', 'pain', 'lethargy'], systemic: false },
  ear_problem: { domain: 'ear', compatible: ['pain', 'skin_itching', 'neurologic', 'lethargy'], systemic: false },
  skin_itching: { domain: 'skin', compatible: ['wound_swelling', 'ear_problem', 'eye_problem', 'post_vaccine_medication'], systemic: false },
  wound_swelling: { domain: 'skin_trauma', compatible: ['pain', 'limping', 'skin_itching', 'lethargy'], systemic: false },
  urination_problem: { domain: 'urinary', compatible: ['lethargy', 'pain', 'weight_change'], systemic: false },
  limping: { domain: 'movement', compatible: ['pain', 'wound_swelling', 'lethargy'], systemic: false },
  pain: { domain: 'pain', compatible: ['limping', 'wound_swelling', 'ear_problem', 'mouth_dental', 'lethargy'], systemic: true },
  neurologic: { domain: 'neurologic', compatible: ['lethargy', 'toxin_foreign_body', 'ear_problem'], systemic: false },
  toxin_foreign_body: { domain: 'toxin', compatible: ['vomiting', 'diarrhea', 'lethargy', 'neurologic', 'breathing_issue'], systemic: false },
  mouth_dental: { domain: 'mouth', compatible: ['loss_of_appetite', 'pain', 'lethargy'], systemic: false },
  weight_change: { domain: 'chronic', compatible: ['loss_of_appetite', 'diarrhea', 'urination_problem', 'lethargy'], systemic: false },
  post_vaccine_medication: { domain: 'post_care', compatible: ['lethargy', 'skin_itching', 'wound_swelling', 'loss_of_appetite'], systemic: false },
  post_operation: { domain: 'post_care', compatible: ['wound_swelling', 'pain', 'lethargy', 'loss_of_appetite'], systemic: false },
  routine_check: { domain: 'routine', compatible: ['weight_change', 'loss_of_appetite', 'lethargy'], systemic: false }
};

const complaintById = Object.fromEntries(complaintTypes.map(ct => [ct.id, ct]));
const complaintIdByLabel = Object.fromEntries(complaintTypes.map(ct => [ct.name_tr, ct.id]));

function labelForComplaint(id, locale = getLocale()) {
  return complaintLabel(id, locale);
}

function complaintIdFromLabel(label) {
  if (complaintById[label]) return label;
  if (complaintIdByLabel[label]) return complaintIdByLabel[label];
  const normalized = String(label || '').trim();
  return complaintTypes.find(ct =>
    labelForComplaint(ct.id, 'tr') === normalized || labelForComplaint(ct.id, 'en') === normalized
  )?.id;
}

export function getComplaintTypeByLabel(label) {
  return complaintById[complaintIdFromLabel(label)];
}

export function getComplaintTypeById(id) {
  return complaintById[id];
}

export function getCompatibleComplaintLabels(primaryIdOrLabel) {
  const locale = getLocale();
  const primaryId = complaintIdFromLabel(primaryIdOrLabel);
  if (!primaryId) return getSymptomChips(locale);
  const compatibleIds = new Set([primaryId, ...(complaintMeta[primaryId]?.compatible || [])]);
  return complaintTypes
    .filter(ct => compatibleIds.has(ct.id))
    .sort((a, b) => (a.id === primaryId ? -1 : b.id === primaryId ? 1 : (a.priority_order || 999) - (b.priority_order || 999)))
    .map(ct => labelForComplaint(ct.id, locale));
}

export function getIncompatibleComplaintLabels(primaryIdOrLabel) {
  const compatible = new Set(getCompatibleComplaintLabels(primaryIdOrLabel));
  return getSymptomChips().filter(label => !compatible.has(label));
}

export function getDurationOptions(locale = getLocale()) {
  const values = translateForLocale(locale, 'triage.duration_options');
  return Array.isArray(values) ? values : ['Today', 'For 1-2 days', 'For 3-7 days', 'Longer than 1 week', 'Not sure'];
}

export function getSeverityOptions(locale = getLocale()) {
  const labels = translateForLocale(locale, 'triage.severity_options');
  const byValue = typeof labels === 'object' && labels ? labels : {};
  return [
    { value: 'mild', label: byValue.mild || 'Mild', color: '#10B981' },
    { value: 'moderate', label: byValue.moderate || 'Moderate', color: '#F59E0B' },
    { value: 'severe', label: byValue.severe || 'Serious', color: '#F97316' },
    { value: 'critical', label: byValue.critical || 'Very serious / seems urgent', color: '#EF4444' }
  ];
}

export const durationOptions = getDurationOptions('tr');
export const severityOptions = getSeverityOptions('tr');

export const redFlagQuestions = {};
Object.values(questionSets).forEach(set => {
  if (set.id === 'red_flags_general') {
    redFlagQuestions.general = set.questions.map(q => ({ id: q.id, text: q.text_tr, critical: true }));
  } else if (set.id.endsWith('_red_flags')) {
    redFlagQuestions[set.id.replace('_red_flags', '')] = set.questions.map(q => ({ id: q.id, text: q.text_tr, critical: true }));
  }
});

const keywordRules = [
  { id: 'breathing_issue', weight: 9, words: ['nefes darligi', 'nefes alam', 'zor nefes', 'hirilti', 'hırıltı', 'morardi', 'morardı', 'agzi acik nefes', 'ağzı açık nefes'] },
  { id: 'urination_problem', weight: 9, words: ['idrar yapam', 'cis yapam', 'çiş yapam', 'kum kabina gidiyor', 'kum kabına gidiyor', 'idrar yok', 'kanli idrar', 'kanlı idrar'] },
  { id: 'toxin_foreign_body', weight: 8, words: ['zehir', 'yabanci cisim', 'yabancı cisim', 'ip yuttu', 'kemik yuttu', 'oyuncak yuttu', 'cop yedi', 'çöp yedi', 'ilac yedi', 'ilaç yedi'] },
  { id: 'neurologic', weight: 8, words: ['nobet', 'nöbet', 'titreme', 'denge kaybi', 'denge kaybı', 'sendeledi', 'felc', 'felç'] },
  { id: 'vomiting', weight: 7, words: ['kus', 'ogur', 'öğür', 'mide', 'safra'] },
  { id: 'diarrhea', weight: 7, words: ['ishal', 'sulu diski', 'sulu dışkı', 'kanli diski', 'kanlı dışkı', 'mukus'] },
  { id: 'cough', weight: 7, words: ['oksur', 'öksür', 'kuru kuru', 'gag gag'] },
  { id: 'limping', weight: 7, words: ['topall', 'basam', 'sekerek'] },
  { id: 'pain', weight: 6, words: ['agri', 'ağrı', 'inliyor', 'dokununca', 'aci', 'acı', 'hassas'] },
  { id: 'eye_problem', weight: 6, words: ['goz', 'göz', 'akinti', 'akıntı', 'kizarik', 'kızarık', 'gözünü kapat'] },
  { id: 'ear_problem', weight: 6, words: ['kulak', 'bas sall', 'baş sall', 'kulagini', 'kulağını', 'koku'] },
  { id: 'skin_itching', weight: 6, words: ['kasinti', 'kaşıntı', 'yaliyor', 'yalıyor', 'tuy', 'tüy', 'deri', 'kizariklik', 'kızarıklık'] },
  { id: 'wound_swelling', weight: 6, words: ['yara', 'sislik', 'şişlik', 'kanama', 'irin', 'kesik'] },
  { id: 'loss_of_appetite', weight: 5, words: ['istah', 'iştah', 'yemiyor', 'mama yem', 'su icmiyor', 'su içmiyor'] },
  { id: 'lethargy', weight: 4, words: ['halsiz', 'uyuyor', 'keyifsiz', 'tepki vermiyor', 'cok durgun', 'çok durgun', 'çöktü'] },
  { id: 'mouth_dental', weight: 4, words: ['agiz', 'ağız', 'dis', 'diş', 'salya', 'cigne', 'çiğne'] },
  { id: 'weight_change', weight: 3, words: ['kilo', 'zayif', 'zayıf', 'kilo kaybi', 'kilo kaybı'] }
];

function normalizeText(value = '') {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function addMatch(scores, id, weight, reason) {
  const current = scores.get(id) || { id, score: 0, reasons: [] };
  current.score += weight;
  current.reasons.push(reason);
  scores.set(id, current);
}

function complaintIdFromChip(chip) {
  return complaintIdFromLabel(chip);
}

function isCompatibleComplaint(primaryId, candidateId) {
  if (!primaryId || !candidateId || primaryId === candidateId) return true;
  const primaryMeta = complaintMeta[primaryId] || {};
  const candidateMeta = complaintMeta[candidateId] || {};
  return primaryMeta.compatible?.includes(candidateId)
    || candidateMeta.compatible?.includes(primaryId)
    || (primaryMeta.systemic && candidateMeta.domain === 'general')
    || (candidateMeta.systemic && primaryMeta.domain === 'general');
}

function getTaskDefinition(key) {
  return taskDefinitions.find(t => t.key === key || t.id === key);
}

export function classifyComplaint(chips = [], text = '', deviceMode = 'phone_only', pet = null) {
  const scores = new Map();
  const petContext = pet ? (pet.riskContext || buildPetRiskContext(pet)) : null;

  chips.forEach(chip => {
    const complaintId = complaintIdFromChip(chip);
    if (complaintId) addMatch(scores, complaintId, 10, `chip:${chip}`);
  });

  const cleanText = normalizeText(text);
  keywordRules.forEach(rule => {
    rule.words.forEach(word => {
      if (cleanText.includes(normalizeText(word))) {
        addMatch(scores, rule.id, rule.weight, `keyword:${word}`);
      }
    });
  });

  complaintTypes.forEach(ct => {
    ct.subcategories?.forEach(sub => {
      const normalizedSub = normalizeText(sub.replaceAll('_', ' '));
      if (normalizedSub && cleanText.includes(normalizedSub)) {
        addMatch(scores, ct.id, 3, `subcategory:${sub}`);
      }
    });
  });

  if (scores.size === 0) {
    addMatch(scores, 'lethargy', 1, 'fallback:general_condition');
  }

  const allRankedMatches = [...scores.values()].sort((a, b) => b.score - a.score);
  const primaryComplaintId = allRankedMatches[0]?.id || 'lethargy';
  const compatibleMatches = allRankedMatches
    .filter(match => isCompatibleComplaint(primaryComplaintId, match.id))
    .slice(0, 3);
  const incompatibleMatches = allRankedMatches
    .filter(match => !isCompatibleComplaint(primaryComplaintId, match.id));
  const rankedMatches = compatibleMatches.length ? compatibleMatches : allRankedMatches.slice(0, 1);
  const matchedComplaints = rankedMatches
    .map(match => complaintTypes.find(c => c.id === match.id))
    .filter(Boolean);

  const primaryCategories = [...new Set(matchedComplaints.map(c => c.category))].slice(0, 2);
  const secondaryCategories = [];
  const questionSetIds = new Set();
  const taskKeys = new Set();
  const redFlagGroups = new Set(['general']);

  matchedComplaints.forEach(comp => {
    comp.default_question_set_ids.slice(0, comp.id === primaryComplaintId ? 2 : 1).forEach(qId => {
      if (!qId.includes('red_flag')) questionSetIds.add(qId);
    });
    comp.default_task_keys.forEach(tKey => taskKeys.add(tKey));
    comp.red_flag_groups.forEach(group => redFlagGroups.add(group));

    if (comp.id === 'neurologic') redFlagGroups.add('neurologic');
    if (['limping', 'pain', 'wound_swelling'].includes(comp.id)) redFlagGroups.add('trauma');
  });

  if (questionSetIds.size === 0) questionSetIds.add('general_condition_basic');

  if (petContext?.riskTags?.includes('brachycephalic_risk') && matchedComplaints.some(comp => ['breathing_issue', 'cough'].includes(comp.id))) {
    taskKeys.add('resting_respiratory_rate');
    redFlagGroups.add('general');
  }

  if (petContext?.riskTags?.includes('newborn_risk') && matchedComplaints.some(comp => ['vomiting', 'diarrhea', 'loss_of_appetite', 'lethargy'].includes(comp.id))) {
    taskKeys.add('newborn_weight');
    taskKeys.add('temperature_followup');
  }

  if (petContext?.riskTags?.includes('senior_risk') && matchedComplaints.some(comp => ['weight_change', 'loss_of_appetite', 'lethargy', 'urination_problem'].includes(comp.id))) {
    taskKeys.add('weight_followup');
  }

  if (petContext?.riskTags?.some(tag => ['diabetes_risk', 'kidney_risk'].includes(tag)) && matchedComplaints.some(comp => ['vomiting', 'loss_of_appetite', 'urination_problem', 'lethargy'].includes(comp.id))) {
    taskKeys.add('weight_followup');
  }

  const suggestedTasks = [];
  let photoCount = 0;
  let videoCount = 0;

  [...taskKeys].forEach((taskKey, idx) => {
    const task = getTaskDefinition(taskKey);
    if (!task) return;
    if (task.type === 'photo' && photoCount >= 3) return;
    if (task.type === 'video' && videoCount >= 2) return;

    suggestedTasks.push({
      id: `task-${Date.now()}-${idx}`,
      type: task.type,
      key: task.key || task.id,
      title: task.title_tr,
      priority: task.priority || task.default_priority || 'optional',
      status: 'pending'
    });

    if (task.type === 'photo') photoCount++;
    if (task.type === 'video') videoCount++;
  });

  const bestScore = rankedMatches[0]?.score || 0;

  return {
    primaryComplaintId,
    primaryComplaintLabel: labelForComplaint(primaryComplaintId),
    primaryCategories,
    secondaryCategories,
    redFlagGroups: [...redFlagGroups],
    questionSetIds: [...questionSetIds],
    suggestedTasks,
    triageWarnings: [
      ...incompatibleMatches.map(match => localText(getLocale(), 'triage.separate_check_warning', '{complaint} should be handled as a separate check.')
        .replace('{complaint}', labelForComplaint(match.id))),
      ...(petContext?.warnings || [])
    ],
    petRiskContext: petContext,
    incompatibleComplaintIds: incompatibleMatches.map(match => match.id),
    matchedComplaintIds: rankedMatches.map(match => match.id),
    classifierReasons: Object.fromEntries(rankedMatches.map(match => [match.id, match.reasons])),
    confidence: Math.min(0.92, 0.45 + bestScore / 30)
  };
}
