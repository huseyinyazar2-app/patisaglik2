const GEMINI_MODEL = import.meta.env?.VITE_GEMINI_MODEL || 'gemini-3.1-flash-lite';

function getApiKey() {
  return import.meta.env?.VITE_GEMINI_API_KEY || '';
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

export function isGeminiConfigured() {
  return Boolean(getApiKey());
}

export async function generateGeminiJson({ system, prompt }) {
  return generateGeminiJsonWithParts({
    system,
    prompt,
    parts: []
  });
}

export async function generateGeminiJsonWithParts({ system, prompt, parts = [] }) {
  const apiKey = getApiKey();
  if (!apiKey) return { ok: false, reason: 'missing_key' };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
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

  if (!response.ok) {
    return { ok: false, reason: `http_${response.status}` };
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n') || '';
  const json = extractJson(text);
  return json ? { ok: true, data: json } : { ok: false, reason: 'invalid_json' };
}
