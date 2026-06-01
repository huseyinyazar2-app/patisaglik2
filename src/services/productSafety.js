const LOCAL_KEY = 'pati_product_safety_checks';

function makeId() {
  if (globalThis.crypto?.randomUUID) return `safety-${globalThis.crypto.randomUUID()}`;
  return `safety-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLocal(items) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items.slice(0, 50)));
}

function normalize(value) {
  return String(value || '').trim();
}

function compact(value) {
  return String(value || '').toLocaleLowerCase('tr-TR');
}

function localWarnings({ productName, brand, lot }) {
  const text = compact([productName, brand, lot].join(' '));
  const warnings = [];
  if (text.includes('çiğ') || text.includes('raw')) {
    warnings.push('Çiğ/yarı pişmiş ürünlerde mikrobiyal kontaminasyon geri çağırmaları daha sık kontrol edilmelidir.');
  }
  if (text.includes('grain free') || text.includes('tahılsız')) {
    warnings.push('Tahılsız ürünlerde kardiyak hassasiyeti olan petlerde veterinerle beslenme planı konuşulmalıdır.');
  }
  if (text.includes('son kullanma') || text.includes('SKT')) {
    warnings.push('Son kullanma tarihi ve lot/seri numarası üretici duyurusuyla birebir karşılaştırılmalıdır.');
  }
  return warnings;
}

async function searchFoodRecalls({ productName, brand }) {
  const term = normalize(productName || brand);
  if (!term) return [];

  const query = `product_description:"${term}"`;
  const url = `https://api.fda.gov/food/enforcement.json?search=${encodeURIComponent(query)}&limit=5`;
  const response = await fetch(url);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`openFDA ${response.status}`);
  const data = await response.json();

  return (data.results || []).map((item) => ({
    source: 'openFDA Food Enforcement',
    product: item.product_description || 'Ürün açıklaması yok',
    firm: item.recalling_firm || '',
    reason: item.reason_for_recall || '',
    status: item.status || '',
    classification: item.classification || '',
    recallNumber: item.recall_number || '',
    reportDate: item.report_date || ''
  }));
}

export async function runProductSafetyCheck(input) {
  const checkedAt = new Date().toISOString();
  let recalls = [];
  let apiStatus = 'not_checked';

  try {
    recalls = await searchFoodRecalls(input);
    apiStatus = recalls.length ? 'matches_found' : 'no_match';
  } catch (err) {
    apiStatus = `api_error:${err.message}`;
  }

  const warnings = localWarnings(input);
  const riskLevel = recalls.some(item => item.classification === 'Class I') ? 'high' : recalls.length ? 'watch' : warnings.length ? 'watch' : 'clear';
  const result = {
    id: makeId(),
    checkedAt,
    input,
    riskLevel,
    apiStatus,
    recalls,
    warnings,
    nextSteps: [
      'Lot/seri numarasını üretici duyurusu ve ambalaj üzerindeki bilgiyle birebir karşılaştır.',
      'Kesin eşleşme varsa ürünü kullanmayı durdurup veteriner/üretici ile görüş.',
      'Belirti varsa bu ekran yerine acil kayıt veya veteriner görüşmesi önceliklidir.'
    ]
  };

  writeLocal([result, ...readLocal()]);
  return result;
}

export function getProductSafetyChecks() {
  return readLocal();
}
