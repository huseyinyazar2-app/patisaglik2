import { getDbClient } from './dbClient.js';

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
  const included = checkedLabels(data.included || data.payload?.['Dahil edilecekler'] || []);
  const extractionOptions = data.extraction_options || checkedLabels(data.payload?.['İşaretlenecek bilgiler'] || data.payload?.['AI çıkarımı'] || []);
  const documentKind = data.document_kind || first(data.payload?.['Belge türü']) || '';
  return {
    id: row.id,
    pet_id: row.pet_id,
    document_type: row.document_type,
    title: row.title,
    note: row.extracted_text || data.note || '',
    purpose: data.purpose || documentKind || first(data.payload?.['Dosya amacı']) || 'Klinik ziyareti',
    included: included.length ? included : extractionOptions,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    read_goal: data.read_goal || first(data.payload?.['Okuma hedefi']) || '',
    visible_values: data.visible_values || data.payload?.['Görünen önemli değerler'] || '',
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
      const documentKind = first(payload['Belge türü']) || 'Belge';
      const extractionOptions = checkedLabels(payload['İşaretlenecek bilgiler'] || payload['AI çıkarımı'] || []);
      const readGoal = first(payload['Okuma hedefi']) || 'Klinik özeti';
      const aiOcr = payload.__ai_ocr_result || null;
      return {
        id: item.id,
        pet_id: item.pet_id,
        document_type: 'health_document',
        title: `${documentKind} belgesi`,
        note: [aiOcr?.summary, aiOcr?.rawText, payload['Görünen önemli değerler'], payload['Ek not']].filter(Boolean).join('\n\n'),
        purpose: documentKind,
        included: extractionOptions,
        status: aiOcr ? 'processed' : 'ai_pending',
        created_at: item.created_at,
        updated_at: item.updated_at,
        read_goal: readGoal,
        visible_values: payload['Görünen önemli değerler'] || '',
        ai_ocr: aiOcr || { status: 'queued_for_server' },
        data: { payload, document_kind: documentKind, extraction_options: extractionOptions, read_goal: readGoal }
      };
    }

    if (item.feature_code === 'vet-prep') {
      const urgency = first(payload['Aciliyet']) || 'Rutin';
      const included = checkedLabels(payload['Yanıma alacağım'] || []);
      const reason = payload['Ziyaret nedeni'] || '';
      const questions = payload['Sorularım'] || '';
      return {
        id: item.id,
        pet_id: item.pet_id,
        document_type: 'vet_prep',
        title: `${urgency} veteriner hazırlık dosyası`,
        note: [reason, questions].filter(Boolean).join('\n\n'),
        purpose: 'Veteriner ziyareti',
        included,
        status: item.status || 'draft',
        created_at: item.created_at,
        updated_at: item.updated_at,
        data: { payload, urgency, reason, questions, included }
      };
    }

    const purpose = first(payload['Dosya amacı']) || 'Klinik ziyareti';
    const included = checkedLabels(payload['Dahil edilecekler'] || []);
    return {
      id: item.id,
      pet_id: item.pet_id,
      document_type: 'clinic_export',
      title: `${purpose} hazırlık dosyası`,
      note: payload['Veterinere not'] || '',
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
