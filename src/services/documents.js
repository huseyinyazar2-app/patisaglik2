import { getDbClient } from './dbClient.js';
import { translateForLocale } from '../i18n/tr.js';

function label(key) {
  return translateForLocale('tr', `formLabels.${key}`);
}

function docText(key) {
  return translateForLocale('tr', `documents.${key}`);
}

function parseJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function first(value) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function checkedLabels(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string' || item.checked)
    .map((item) => typeof item === 'string' ? item : item.label)
    .filter(Boolean);
}

function rowToDocument(row) {
  const data = parseJson(row.extracted_data);
  const included = checkedLabels(data.included || data.payload?.[label('included_sections')] || []);
  const extractionOptions = data.extraction_options || checkedLabels(data.payload?.[label('extraction_options')] || data.payload?.[label('ai_extraction')] || []);
  const documentKind = data.document_kind || first(data.payload?.[label('document_type')]) || '';
  return {
    id: row.id,
    pet_id: row.pet_id,
    document_type: row.document_type,
    title: row.title,
    note: row.extracted_text || data.note || '',
    purpose: data.purpose || documentKind || first(data.payload?.[label('file_purpose')]) || docText('clinic_visit'),
    included: included.length ? included : extractionOptions,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    read_goal: data.read_goal || first(data.payload?.[label('read_goal')]) || '',
    visible_values: data.visible_values || data.payload?.[label('visible_important_values')] || '',
    ai_ocr: data.ai_ocr || null,
    data
  };
}

function fromLocalStorage(petId) {
  const records = JSON.parse(localStorage.getItem('pati_form_submissions') || '[]')
    .filter((item) => ['clinic-export', 'document-ai', 'vet-prep'].includes(item.feature_code))
    .filter((item) => !petId || item.pet_id === petId);

  return records.map((item) => {
    const payload = parseJson(item.payload);
    if (item.feature_code === 'document-ai') {
      const documentKind = first(payload[label('document_type')]) || docText('document');
      const extractionOptions = checkedLabels(payload[label('extraction_options')] || payload[label('ai_extraction')] || []);
      const readGoal = first(payload[label('read_goal')]) || docText('clinic_summary');
      const aiOcr = payload.__ai_ocr_result || null;
      return {
        id: item.id,
        pet_id: item.pet_id,
        document_type: 'health_document',
        title: docText('document_title').replace('{kind}', documentKind),
        note: [aiOcr?.summary, aiOcr?.rawText, payload[label('visible_important_values')], payload[docText('extra_note')]].filter(Boolean).join('\n\n'),
        purpose: documentKind,
        included: extractionOptions,
        status: aiOcr ? 'processed' : 'ai_pending',
        created_at: item.created_at,
        updated_at: item.updated_at,
        read_goal: readGoal,
        visible_values: payload[label('visible_important_values')] || '',
        ai_ocr: aiOcr || { status: 'queued_for_server' },
        data: { payload, document_kind: documentKind, extraction_options: extractionOptions, read_goal: readGoal }
      };
    }

    if (item.feature_code === 'vet-prep') {
      const urgency = first(payload[docText('urgency')]) || docText('routine');
      const included = checkedLabels(payload[label('bring_checklist')] || []);
      const reason = payload[label('visit_reason')] || '';
      const questions = payload[label('my_questions')] || '';
      return {
        id: item.id,
        pet_id: item.pet_id,
        document_type: 'vet_prep',
        title: docText('vet_prep_title').replace('{urgency}', urgency),
        note: [reason, questions].filter(Boolean).join('\n\n'),
        purpose: docText('vet_visit'),
        included,
        status: item.status || 'draft',
        created_at: item.created_at,
        updated_at: item.updated_at,
        data: { payload, urgency, reason, questions, included }
      };
    }

    const purpose = first(payload[label('file_purpose')]) || docText('clinic_visit');
    const included = checkedLabels(payload[label('included_sections')] || []);
    return {
      id: item.id,
      pet_id: item.pet_id,
      document_type: 'clinic_export',
      title: docText('prep_file_title').replace('{purpose}', purpose),
      note: payload[docText('vet_note')] || '',
      purpose,
      included,
      status: item.status || 'draft',
      created_at: item.created_at,
      updated_at: item.updated_at,
      data: { payload }
    };
  });
}

export async function getClinicExportDocuments({ petId, limit = 20 } = {}) {
  const db = getDbClient();
  if (!db) return fromLocalStorage(petId);

  const args = petId ? [petId, limit] : [limit];
  const petFilter = petId ? 'AND pet_id = ?' : '';

  const result = await db.execute({
    sql: `SELECT id, pet_id, document_type, title, extracted_text, extracted_data, status, created_at, updated_at
          FROM documents
          WHERE document_type IN ('clinic_export', 'health_document', 'vet_prep') ${petFilter}
          ORDER BY created_at DESC
          LIMIT ?`,
    args
  });

  return result.rows.map(rowToDocument);
}

export async function getClinicExportDocumentById(id) {
  const db = getDbClient();
  if (!db) return fromLocalStorage().find((item) => item.id === id) || null;

  const result = await db.execute({
    sql: `SELECT id, pet_id, document_type, title, extracted_text, extracted_data, status, created_at, updated_at
          FROM documents
          WHERE id = ? AND document_type IN ('clinic_export', 'health_document', 'vet_prep')
          LIMIT 1`,
    args: [id]
  });

  return result.rows[0] ? rowToDocument(result.rows[0]) : null;
}
