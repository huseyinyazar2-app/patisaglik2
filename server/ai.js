const GEMINI_STANDARD_MODEL = process.env.GEMINI_STANDARD_MODEL || 'gemini-3-flash-preview';
const GEMINI_CRITICAL_MODEL = process.env.GEMINI_CRITICAL_MODEL || 'gemini-3.5-flash';

function apiKey() {
  return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
}

function extractJson(text) {
  const cleaned = String(text || '').trim().replace(/^```json|```$/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export function isAiConfigured() {
  return Boolean(apiKey());
}

export async function generateGeminiJson({ system, prompt, parts = [], responseSchema = null, model = GEMINI_STANDARD_MODEL }) {
  const key = apiKey();
  if (!key) return { ok: false, reason: 'missing_key' };
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        ...(responseSchema ? { responseSchema } : {})
      },
      contents: [{
        role: 'user',
        parts: [
          { text: `${system}\n\n${prompt}` },
          ...parts
        ]
      }]
    })
  });
  if (!response.ok) return { ok: false, reason: `http_${response.status}` };
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n') || '';
  const json = extractJson(text);
  return json ? { ok: true, data: json } : { ok: false, reason: 'invalid_json' };
}

export function normalizeOcrResult(value, fallbackKind = '') {
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

export function documentOcrPrompt({ documentKind, readGoal, extractionOptions = [], note = '' }) {
  const system = [
    'If the uploaded media/document is unrelated to veterinary health, lab, prescription, invoice or clinical follow-up context, do not extract findings; return status needs_review, confidence 0-25 and add an irrelevant media warning.',
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
  return { system, prompt };
}
