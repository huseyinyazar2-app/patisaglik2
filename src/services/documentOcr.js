import { generateGeminiJsonWithParts, isGeminiConfigured } from './geminiClient.js';

const MAX_INLINE_FILE_BYTES = 8 * 1024 * 1024;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
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
  return isGeminiConfigured();
}

export async function runDocumentOcr({ file, documentKind, readGoal, extractionOptions = [], note = '' }) {
  if (!file) return { ok: false, reason: 'missing_file' };
  if (!isDocumentOcrConfigured()) return { ok: false, reason: 'missing_key' };
  if (file.size > MAX_INLINE_FILE_BYTES) return { ok: false, reason: 'file_too_large' };

  const base64 = await fileToBase64(file);
  const system = [
    'Sen veteriner belgeleri için güvenli OCR ve veri ayrıştırma yardımcısısın.',
    'Yalnızca belgede görünen metni ve net çıkarımları yaz. Tahmin uydurma.',
    'Teşhis, ilaç dozu önerisi veya tedavi talimatı verme.',
    'Belirsiz alanları boş bırak, warnings içine kısa not düş.',
    'Yanıtı yalnızca geçerli JSON olarak döndür.'
  ].join(' ');
  const prompt = `
Belge türü: ${documentKind || 'Bilinmiyor'}
Okuma hedefi: ${readGoal || 'Klinik özeti'}
İstenen alanlar: ${(extractionOptions || []).join(', ') || 'genel özet'}
Kullanıcı notu: ${note || 'Yok'}

JSON şeması:
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
