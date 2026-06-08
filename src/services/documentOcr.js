import { generateGeminiJsonWithParts, isGeminiConfigured } from './geminiClient.js';
import { postApiJson, uploadMediaFile } from './apiClient.js';
import { CLIENT_ERROR_CODES, makeCodedError } from './errorCodes.js';
import { translateForLocale } from '../i18n/tr.js';

const MAX_INLINE_FILE_BYTES = 8 * 1024 * 1024;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(makeCodedError('local_file_read_failed', {
      code: CLIENT_ERROR_CODES.local_file_read_failed,
      message: translateForLocale('tr', 'documentOcr.file_read_error')
    }));
    reader.readAsDataURL(file);
  });
}

function normalizeOcrResult(value, fallbackKind) {
  const result = value && typeof value === 'object' ? value : {};
  return {
    status: result.status || 'needs_review',
    documentDate: result.documentDate || '',
    clinic: result.clinic || '',
    doctor: result.doctor || '',
    petName: result.petName || '',
    documentKind: result.documentKind || fallbackKind || '',
    summary: result.summary || '',
    medications: Array.isArray(result.medications) ? result.medications : [],
    labValues: Array.isArray(result.labValues) ? result.labValues : [],
    invoice: result.invoice && typeof result.invoice === 'object' ? result.invoice : { total: '', currency: '', items: [] },
    followupTasks: Array.isArray(result.followupTasks) ? result.followupTasks : [],
    rawText: result.rawText || '',
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
    confidence: Number.isFinite(Number(result.confidence)) ? Number(result.confidence) : 0,
    processedAt: new Date().toISOString()
  };
}

export function isDocumentOcrConfigured() {
  return true;
}

export async function runDocumentOcr({ file, documentKind, readGoal, extractionOptions = [], note = '', userId = '', petId = '' }) {
  if (!file) return { ok: false, reason: 'missing_file' };
  if (file.size > MAX_INLINE_FILE_BYTES) return { ok: false, reason: 'file_too_large' };

  const base64 = await fileToBase64(file);
  let mediaRefs = [];
  if (userId && petId) {
    try {
      const uploaded = await uploadMediaFile({
        userId,
        petId,
        category: 'ai-inputs',
        file,
        relatedEntityType: 'ai_input'
      });
      mediaRefs = [{
        mediaId: uploaded.id || '',
        objectKey: uploaded.objectKey || '',
        fileName: file.name || '',
        mimeType: file.type || '',
        sizeBytes: file.size || 0,
        category: 'ai-inputs'
      }];
    } catch {}
  }
  try {
    const server = await postApiJson('/api/ai/document-ocr', {
      userId,
      petId,
      fileBase64: base64,
      fileName: file.name || '',
      sizeBytes: file.size || 0,
      mimeType: file.type || 'application/octet-stream',
      mediaRefs,
      documentKind,
      readGoal,
      extractionOptions,
      note
    });
    if (server.ok) return server;
  } catch (error) {
    if (!import.meta.env?.DEV || error?.message === 'insufficient_credits') throw error;
    // Local Vite dev server has no API; fall back to browser Gemini when configured.
  }

  if (!isGeminiConfigured()) return { ok: false, reason: 'missing_key' };
  const system = `${translateForLocale('tr', 'documentOcr.system_prompt')} If the uploaded media/document is unrelated to veterinary health, lab, prescription, invoice or clinical follow-up context, do not extract findings; return status needs_review, confidence 0-25 and add an irrelevant media warning.`;
  const prompt = translateForLocale('tr', 'documentOcr.user_prompt', {
    documentKind: documentKind || translateForLocale('tr', 'common.unknown'),
    readGoal: readGoal || translateForLocale('tr', 'documentOcr.default_goal'),
    extractionOptions: (extractionOptions || []).join(', ') || translateForLocale('tr', 'documentOcr.general_summary'),
    note: note || translateForLocale('tr', 'common.none')
  }) + `
{
  "status": "processed|needs_review",
  "documentDate": "",
  "clinic": "",
  "doctor": "",
  "petName": "",
  "documentKind": "",
  "summary": "",
  "medications": [{"name":"","doseText":"","frequency":"","duration":"","note":""}],
  "labValues": [{"name":"","value":"","unit":"","referenceRange":"","flag":"normal|high|low|unknown"}],
  "invoice": {"total":"","currency":"","items":[""]},
  "followupTasks": [{"title":"","dueDate":"","note":""}],
  "rawText": "",
  "warnings": [""],
  "confidence": 0
}`;

  const response = await generateGeminiJsonWithParts({
    system,
    prompt,
    parts: [{
      inlineData: {
        mimeType: file.type || 'application/octet-stream',
        data: base64
      }
    }]
  });

  if (!response.ok) return response;
  return {
    ok: true,
    data: normalizeOcrResult(response.data, documentKind)
  };
}
