import { navigate, goBack } from '../../router.js';
import { getState } from '../../store.js';
import { getActivePet } from '../../mock/pets.js';
import { submitFeatureForm } from '../../services/formSubmissions.js';
import { showToast } from '../../ui/toast.js';
import { buildPetRiskContext } from '../../services/petContext.js';
import { generateGeminiJson, isGeminiConfigured } from '../../services/geminiClient.js';
import { postApiJson } from '../../services/apiClient.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const riskRules = [
  {
    level: 'critical',
    label: 'Çok yüksek riskli içerik',
    terms: ['ksilitol', 'xylitol', 'fare zehiri', 'rodenticide', 'antifriz', 'ethylene glycol', 'etilen glikol', 'parasetamol', 'paracetamol', 'ibuprofen', 'naproksen', 'pil', 'battery', 'nikotin', 'nicotine', 'çamaşır suyu', 'bleach', 'kostik', 'drain cleaner'],
    action: 'Beklemeden veteriner veya acil klinikle görüş. Ambalajı ve yaklaşık miktarı yanında tut.'
  },
  {
    level: 'high',
    label: 'Yüksek riskli gıda/ürün',
    terms: ['çikolata', 'chocolate', 'kakao', 'cocoa', 'üzüm', 'grape', 'kuru üzüm', 'raisin', 'soğan', 'onion', 'sarımsak', 'garlic', 'alkol', 'alcohol', 'kafein', 'caffeine', 'kahve', 'coffee', 'maya', 'yeast dough', 'macadamia', 'zambak', 'lily'],
    action: 'Belirti olmasa bile veterinerle görüş. Tür, kilo, zaman ve miktar bilgisini hazırla.'
  },
  {
    level: 'foreign',
    label: 'Yabancı cisim / tıkanma riski',
    terms: ['ip', 'misina', 'oyuncak', 'kemik', 'mıknatıs', 'magnet', 'iğne', 'needle', 'plastik', 'poşet', 'paket', 'ambalaj', 'mısır koçanı', 'corn cob', 'kumaş', 'çorap'],
    action: 'Kusturmaya veya görünen ipi çekmeye çalışma. Nesnenin boyutunu ve materyalini not et.'
  },
  {
    level: 'watch',
    label: 'Takip gerektiren içerik',
    terms: ['yağlı', 'fatty', 'baharat', 'spicy', 'süt', 'milk', 'laktoz', 'licorice', 'meyve çekirdeği', 'apricot kernel', 'peach pit'],
    action: 'Risk daha bağlama bağlıdır. Miktar, tür, kilo ve belirtilere göre veteriner görüşü gerekebilir.'
  }
];

const levelMeta = {
  critical: { title: 'Acil risk', cls: 'danger', score: 95 },
  high: { title: 'Yüksek risk', cls: 'danger', score: 82 },
  foreign: { title: 'Yabancı cisim riski', cls: 'warning', score: 74 },
  watch: { title: 'Yakın takip', cls: 'warning', score: 46 },
  unknown: { title: 'Belirsiz', cls: 'info', score: 28 }
};

function normalize(value) {
  return String(value || '').toLocaleLowerCase('tr-TR');
}

function selectedValues(selector) {
  return [...document.querySelectorAll(selector)]
    .filter(el => el.classList.contains('selected') || el.checked)
    .map(el => el.textContent?.trim() || el.value)
    .filter(Boolean);
}

function fieldValue(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function filePayload(input) {
  const file = input?.files?.[0];
  if (!file) return null;
  return {
    label: 'Ambalaj fotoğrafı',
    name: file.name,
    mime_type: file.type,
    file_size_bytes: file.size,
    local_uri: `local://${file.name}`
  };
}

function analyzeExposure({ productName, ingredientText, amount, timing, symptoms, petContext }) {
  const species = petContext?.type || '';
  const haystack = normalize([productName, ingredientText, amount, timing, symptoms.join(' '), species].join(' '));
  const matches = [];

  riskRules.forEach(rule => {
    const found = rule.terms.filter(term => haystack.includes(normalize(term)));
    if (found.length) matches.push({ ...rule, found });
  });

  const hasSevereSymptom = symptoms.some(symptom => ['Nöbet / titreme', 'Nefes sorunu', 'Bayılma', 'Sürekli kusma'].includes(symptom));
  if (hasSevereSymptom && !matches.some(match => match.level === 'critical')) {
    matches.unshift({
      level: 'critical',
      label: 'Ciddi belirti bildirildi',
      terms: [],
      found: symptoms.filter(symptom => ['Nöbet / titreme', 'Nefes sorunu', 'Bayılma', 'Sürekli kusma'].includes(symptom)),
      action: 'Ciddi belirti varsa madde bilinmese bile acil veteriner değerlendirmesi gerekir.'
    });
  }

  const rank = ['critical', 'high', 'foreign', 'watch'];
  const primary = matches.sort((a, b) => rank.indexOf(a.level) - rank.indexOf(b.level))[0];
  const level = primary?.level || 'unknown';
  return {
    level,
    meta: levelMeta[level],
    matches,
    contextWarnings: petContext?.warnings || [],
    safeSteps: [
      'Veteriner söylemeden kusturma, ilaç, aktif kömür, süt, yağ veya tuzlu su verme.',
      'Ambalajı, etiketi, kalan maddeyi ve fotoğrafı sakla.',
      'Ne zaman, yaklaşık ne kadar ve hangi belirtiler olduğunu not et.'
    ],
    nextAction: primary?.action || 'Madde net değilse “güvenli” varsayma. Ürün adı, içerik listesi ve miktarla veteriner görüşüne hazırlan.'
  };
}

function buildAiPrompt(input, ruleResult) {
  return `
Evcil hayvan için ambalaj/toksik risk ön değerlendirmesi yap.
Kesin teşhis, doz, ilaç, evde kusturma, aktif kömür veya tedavi talimatı verme.
Güvenli dil kullan: "risk", "veterinerle görüş", "acil değerlendirme gerekebilir".

Pet bağlamı:
- Tür/ırk/yaşam evresi: ${input.petContext?.species || input.petContext?.type || 'bilinmiyor'} / ${input.petContext?.lifeStage || 'bilinmiyor'}
- Risk etiketleri: ${(input.petContext?.riskTags || []).join(', ') || 'yok'}

Kullanıcı girdisi:
- Ürün/madde: ${input.productName || 'belirtilmedi'}
- İçerik/etiket: ${input.ingredientText || 'belirtilmedi'}
- Yaklaşık miktar: ${input.amount || 'belirtilmedi'}
- Zaman: ${input.timing || 'belirtilmedi'}
- Belirtiler: ${(input.symptoms || []).join(', ') || 'belirti yok/belirtilmedi'}

Kural motoru sonucu:
- Seviye: ${ruleResult.level}
- Eşleşmeler: ${ruleResult.matches.map(match => `${match.label}: ${match.found.join(', ')}`).join(' | ') || 'yok'}

JSON döndür:
{
  "level": "critical|high|foreign|watch|unknown",
  "headline": "kısa başlık",
  "reason": "2 cümleyi geçmeyen gerekçe",
  "doNotDo": ["en fazla 3 güvenli yapma maddesi"],
  "prepare": ["en fazla 4 veteriner için hazırlanacak bilgi"],
  "askVet": ["en fazla 3 veteriner sorusu"]
}
`;
}

function normalizeAiResult(ai) {
  if (!ai || typeof ai !== 'object') return null;
  const allowed = new Set(['critical', 'high', 'foreign', 'watch', 'unknown']);
  return {
    level: allowed.has(ai.level) ? ai.level : 'unknown',
    headline: String(ai.headline || '').slice(0, 90),
    reason: String(ai.reason || '').slice(0, 280),
    doNotDo: Array.isArray(ai.doNotDo) ? ai.doNotDo.slice(0, 3).map(String) : [],
    prepare: Array.isArray(ai.prepare) ? ai.prepare.slice(0, 4).map(String) : [],
    askVet: Array.isArray(ai.askVet) ? ai.askVet.slice(0, 3).map(String) : []
  };
}

function renderResult(result) {
  const matchHtml = result.matches.length
    ? result.matches.map(match => `
      <div class="package-match-row">
        <strong>${escapeHtml(match.label)}</strong>
        <span>${escapeHtml(match.found.join(', ') || 'Belirti/risk')}</span>
      </div>
    `).join('')
    : '<div class="package-match-row"><strong>Net toksik anahtar kelime bulunmadı</strong><span>Bu sonuç güvenli anlamına gelmez; miktar ve bağlam önemlidir.</span></div>';

  return `
    <div class="package-risk-result ${result.meta.cls}">
      <div class="package-risk-score">
        <span>${result.meta.score}</span>
        <small>risk puanı</small>
      </div>
      <div>
        <div class="premium-screen-kicker">Kontrollü tarama sonucu</div>
        <h2>${escapeHtml(result.meta.title)}</h2>
        <p>${escapeHtml(result.nextAction)}</p>
        ${result.contextWarnings.length ? `<p>${escapeHtml(result.contextWarnings[0])}</p>` : ''}
      </div>
    </div>

    <div class="package-match-list">
      ${matchHtml}
    </div>

    <div class="knowledge-panel danger">
      <h3>Şimdi yapma</h3>
      <ul>${result.safeSteps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ul>
    </div>

    ${result.ai ? `
      <div class="knowledge-panel urgent">
        <h3>AI güvenli özet</h3>
        <p class="text-sm text-secondary mb-3">${escapeHtml(result.ai.headline || 'AI değerlendirmesi')}</p>
        <p class="text-sm text-secondary mb-3">${escapeHtml(result.ai.reason || '')}</p>
        ${result.ai.prepare.length ? `<strong class="text-xs">Veteriner için hazırla</strong><ul>${result.ai.prepare.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
        ${result.ai.askVet.length ? `<strong class="text-xs">Sorulacaklar</strong><ul>${result.ai.askVet.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
      </div>
    ` : `
      <div class="ai-free-note">
        <span>${window.__icons?.spark || ''}</span>
        <p>${isGeminiConfigured() ? 'AI özeti alınamadı; güvenli kural sonucu gösteriliyor.' : 'Gemini anahtarı local env içinde yoksa AI özeti pasif kalır; güvenli kural sonucu gösterilir.'}</p>
      </div>
    `}
  `;
}

export function render() {
  const state = getState();
  const pet = getActivePet(state.activePetId) || { name: 'pet', type: 'pet', weight: '' };

  return `
    <div class="screen premium-check package-risk-screen">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">Ambalaj Risk Kontrolü</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.alert}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero danger">
          <div class="premium-icon-box">${window.__icons?.upload}</div>
          <div>
            <div class="premium-screen-kicker">${isGeminiConfigured() ? 'AI destekli tarama' : 'AI hazırlıklı tarama'}</div>
            <h1>Ambalajdan risk şüphesi</h1>
            <p>${escapeHtml(pet.name)} için fotoğrafı ve etikette gördüğün içerikleri ekle. Bu ekran kesin güvenli/tehlikeli hükmü vermez.</p>
          </div>
        </div>

        <div class="info-box warning mb-4">
          <span class="info-box-icon">${window.__icons?.alert}</span>
          <span>Fotoğraf kaydedilir; tarama ürün adı ve yazdığın içerik metni üzerinden yapılır. Gemini anahtarı tanımlıysa güvenli AI özeti de eklenir.</span>
        </div>

        <div class="feature-form-card">
          <div class="feature-field">
            <span>Ambalaj fotoğrafı</span>
            <input id="packagePhoto" type="file" class="feature-upload-input hidden" accept="image/*" />
            <button class="feature-upload" type="button" id="btnPackageUpload">
              ${window.__icons?.camera}
              <strong>Fotoğraf seç</strong>
              <small>Ürün etiketi, içerik listesi veya paket önü</small>
            </button>
          </div>

          <label class="feature-field">
            <span>Ürün / madde adı</span>
            <input id="productName" placeholder="Örn. şekersiz sakız, bitter çikolata, temizlik ürünü" />
          </label>

          <label class="feature-field">
            <span>İçerik / etikette yazanlar</span>
            <textarea id="ingredientText" placeholder="Etikette gördüğün içerikleri yaz: xylitol, kakao, üzüm, ilaç adı, kimyasal adı..."></textarea>
          </label>

          <label class="feature-field">
            <span>Yaklaşık miktar</span>
            <input id="amountText" placeholder="Örn. 2 parça, yarım paket, emin değilim" />
          </label>

          <div class="feature-field">
            <span>Ne zaman oldu?</span>
            <div class="feature-chip-row" id="timingChips">
              ${['0-1 saat', '1-3 saat', 'Bugün', 'Dün', 'Emin değilim'].map((item, index) => `<button type="button" class="${index === 0 ? 'selected' : ''}">${item}</button>`).join('')}
            </div>
          </div>

          <div class="feature-field">
            <span>Belirti var mı?</span>
            <div class="feature-check-grid" id="symptomChecks">
              ${['Belirti yok', 'Kusma', 'Sürekli kusma', 'Halsizlik', 'Salya', 'Nöbet / titreme', 'Nefes sorunu', 'Bayılma'].map((item, index) => `
                <label>
                  <input type="checkbox" ${index === 0 ? 'checked' : ''} value="${item}" />
                  <b>${item}</b>
                </label>
              `).join('')}
            </div>
          </div>
        </div>

        <div id="packageRiskResult" class="package-risk-output hidden"></div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnAnalyzePackage">Risk Taramasını Çalıştır</button>
          <button class="btn btn-secondary btn-full hidden" id="btnSaveToxicRecord">Toksik Acil Kayıt Oluştur</button>
          <button class="btn btn-ghost btn-full" id="btnKnowledge">Toksik Bilgi Bankası</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  let lastResult = null;

  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnKnowledge')?.addEventListener('click', () => navigate('/check/knowledge/toxic'));

  document.getElementById('btnPackageUpload')?.addEventListener('click', () => {
    document.getElementById('packagePhoto')?.click();
  });

  document.getElementById('packagePhoto')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    const button = document.getElementById('btnPackageUpload');
    if (!file || !button) return;
    button.querySelector('strong').textContent = file.name;
    button.querySelector('small').textContent = `${file.type || 'Görsel'} · ${Math.ceil(file.size / 1024)} KB`;
  });

  document.querySelectorAll('#timingChips button').forEach(button => {
    button.addEventListener('click', () => {
      button.parentElement?.querySelectorAll('button').forEach(item => item.classList.remove('selected'));
      button.classList.add('selected');
    });
  });

  document.getElementById('btnAnalyzePackage')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const productName = fieldValue('productName');
    const ingredientText = fieldValue('ingredientText');
    const amount = fieldValue('amountText');
    const timing = selectedValues('#timingChips button')[0] || '';
    const symptoms = selectedValues('#symptomChecks input');
    const pet = getActivePet(state.activePetId) || {};
    const petContext = { ...buildPetRiskContext(pet), type: pet.type || pet.species_code || '' };

    if (!productName && !ingredientText && !document.getElementById('packagePhoto')?.files?.[0]) {
      showToast('Ürün adı, içerik metni veya ambalaj fotoğrafından en az birini ekleyin.');
      return;
    }

    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'AI ile taranıyor...';

    lastResult = analyzeExposure({
      productName,
      ingredientText,
      amount,
      timing,
      symptoms,
      petContext
    });

    try {
      
        const prompt = buildAiPrompt({ productName, ingredientText, amount, timing, symptoms, petContext }, lastResult);
        let ai = await postApiJson('/api/ai/package-risk', { prompt }).catch(() => null);
        if (!ai?.ok && isGeminiConfigured()) ai = await generateGeminiJson({
          system: 'Sen veteriner yerine geçmeyen, güvenli aciliyet yönlendirmesi yapan bir pet sağlık asistanısın.',
          prompt
        });
        if (ai?.ok) {
          lastResult.ai = normalizeAiResult(ai.data);
          if (lastResult.ai?.level && lastResult.ai.level !== 'unknown') {
            const order = ['unknown', 'watch', 'foreign', 'high', 'critical'];
            if (order.indexOf(lastResult.ai.level) > order.indexOf(lastResult.level)) {
              lastResult.level = lastResult.ai.level;
              lastResult.meta = levelMeta[lastResult.level] || lastResult.meta;
            }
          }
        }
      } catch {
        lastResult.ai = null;
      }

    const output = document.getElementById('packageRiskResult');
    output.innerHTML = renderResult(lastResult);
    output.classList.remove('hidden');
    document.getElementById('btnSaveToxicRecord')?.classList.remove('hidden');
    output.scrollIntoView({ behavior: 'smooth', block: 'start' });
    button.disabled = false;
    button.textContent = originalText;
  });

  document.getElementById('btnSaveToxicRecord')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Kaydediliyor...';

    try {
      const file = filePayload(document.getElementById('packagePhoto'));
      const symptoms = selectedValues('#symptomChecks input');
      const payload = {
        'Ne yuttu / temas etti?': fieldValue('productName') || 'Ambalaj risk kontrolü',
        'Ne zaman oldu?': [selectedValues('#timingChips button')[0] || 'Emin değilim'],
        'Belirti var mı?': symptoms.map(label => ({ label, checked: true })),
        Detay: [
          fieldValue('ingredientText') ? `İçerik: ${fieldValue('ingredientText')}` : '',
          fieldValue('amountText') ? `Miktar: ${fieldValue('amountText')}` : '',
          lastResult ? `Tarama sonucu: ${lastResult.meta.title}. ${lastResult.nextAction}` : ''
        ].filter(Boolean).join('\n'),
        package_risk_result: lastResult,
        __media_files: file ? [file] : []
      };

      await submitFeatureForm({
        userId: state.user?.id || 'user-1',
        petId: state.activePetId || 'pet-1',
        featureCode: 'toxic',
        locale: state.user?.locale || 'tr',
        payload
      });

      showToast('Toksik acil kayıt oluşturuldu.');
      navigate('/history/health-records?filter=toxin_foreign_body&sort=newest');
    } catch (err) {
      showToast(`Kayıt oluşturulamadı: ${err.message}`);
      button.disabled = false;
      button.textContent = original;
    }
  });
}
