import { translateForLocale } from '../i18n/tr.js';

const LOCAL_KEY = 'pati_vet_ready_reports';

function makeId(prefix = 'vet-report') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readReports() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeReports(reports) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(reports.slice(0, 50)));
}

function publicPath(id) {
  return `/public/report/${id}`;
}

export function getVetReadyReport(id) {
  return readReports().find((report) => report.id === id) || null;
}

export function saveVetReadyReport({ session = {}, pet = {}, assessment = {}, guidance = {}, urgency = {} }) {
  const id = makeId();
  const report = {
    id,
    petId: pet?.id || session.petId || null,
    createdAt: new Date().toISOString(),
    publicPath: publicPath(id),
    pet: {
      name: pet?.name || 'Pet',
      species: pet?.species || pet?.species_code || '',
      breed: pet?.breed || '',
      age: pet?.age || pet?.ageLabel || '',
      weight: pet?.weight || pet?.weight_kg || ''
    },
    complaint: {
      text: session.complaintText || '',
      duration: session.duration || '',
      severity: session.severity || '',
      categories: session.categories || [],
      healthHistory: session.healthHistory || session.historyIntake || {}
    },
    urgency: {
      level: assessment.level || 'low',
      score: assessment.score || 0,
      confidence: assessment.confidence || 0,
      title: urgency.title || translateForLocale('tr', 'vetReadyDefaults.urgency_green'),
      action: urgency.action || translateForLocale('tr', 'vetReadyDefaults.home_monitoring')
    },
    redFlags: session.redFlagAnswers || {},
    answers: session.questionAnswers || {},
    tasks: session.tasks || [],
    measurements: session.measurements || [],
    media: session.media || [],
    warnings: guidance.warnings || [],
    steps: guidance.steps || [],
    contextWarnings: session.petRiskContext?.warnings || []
  };

  writeReports([report, ...readReports().filter((item) => item.id !== id)]);
  return report;
}
