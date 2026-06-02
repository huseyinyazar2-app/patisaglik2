import { navigate, goBack } from '../../router.js';
import { getState } from '../../store.js';
import { getActivePet } from '../../mock/pets.js';
import { submitFeatureForm } from '../../services/formSubmissions.js';
import { showToast } from '../../ui/toast.js';
import { buildPetRiskContext } from '../../services/petContext.js';
import { generateGeminiJson, isGeminiConfigured } from '../../services/geminiClient.js';
import { postApiJson } from '../../services/apiClient.js';
import { getLocale, t, translateForLocale } from '../../i18n/tr.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function list(key) {
  const value = t(key);
  return Array.isArray(value) ? value : [];
}

function trValue(key) {
  return translateForLocale('tr', key);
}

function payloadLabel(key) {
  return trValue(`freeRecords.detail.payload_labels.${key}`);
}

function riskRules() {
  return list('packageRisk.rules');
}

function levelMeta(level) {
  const value = t(`packageRisk.levels.${level}`);
  return typeof value === 'object' ? value : t('packageRisk.levels.unknown');
}

function optionLabel(group, id) {
  return t(`packageRisk.${group}.${id}`);
}

function localeTag() {
  const locale = getLocale();
  if (locale === 'tr') return 'tr-TR';
  if (locale === 'en') return 'en-US';
  return locale;
}

function normalize(value) {
  return String(value || '').toLocaleLowerCase(localeTag());
}

function selectedValues(selector) {
  return [...document.querySelectorAll(selector)]
    .filter(el => el.classList.contains('selected') || el.checked)
    .map(el => el.dataset?.value || el.value || el.textContent?.trim())
    .filter(Boolean);
}

function fieldValue(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function filePayload(input) {
  const file = input?.files?.[0];
  if (!file) return null;
  return {
    label: t('packageRisk.package_photo'),
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

  riskRules().forEach(rule => {
    const found = rule.terms.filter(term => haystack.includes(normalize(term)));
    if (found.length) matches.push({ ...rule, found });
  });

  const severeSymptomIds = list('packageRisk.severe_symptom_ids');
  const hasSevereSymptom = symptoms.some(symptom => severeSymptomIds.includes(symptom));
  if (hasSevereSymptom && !matches.some(match => match.level === 'critical')) {
    matches.unshift({
      level: 'critical',
      label: t('packageRisk.severe_symptom_reported'),
      terms: [],
      found: symptoms.filter(symptom => severeSymptomIds.includes(symptom)).map(id => optionLabel('symptoms', id)),
      action: t('packageRisk.severe_symptom_action')
    });
  }

  const rank = ['critical', 'high', 'foreign', 'watch'];
  const primary = matches.sort((a, b) => rank.indexOf(a.level) - rank.indexOf(b.level))[0];
  const level = primary?.level || 'unknown';
  return {
    level,
    meta: levelMeta(level),
    matches,
    contextWarnings: petContext?.warnings || [],
    safeSteps: [
      t('packageRisk.safe_steps.no_home_treatment'),
      t('packageRisk.safe_steps.keep_package'),
      t('packageRisk.safe_steps.note_details')
    ],
    nextAction: primary?.action || t('packageRisk.default_next_action')
  };
}

function buildAiPrompt(input, ruleResult) {
  return t('packageRisk.ai_prompt')
    .replace('{species}', input.petContext?.species || input.petContext?.type || t('packageRisk.unknown'))
    .replace('{lifeStage}', input.petContext?.lifeStage || t('packageRisk.unknown'))
    .replace('{riskTags}', (input.petContext?.riskTags || []).join(', ') || t('packageRisk.none'))
    .replace('{productName}', input.productName || t('packageRisk.not_specified'))
    .replace('{ingredientText}', input.ingredientText || t('packageRisk.not_specified'))
    .replace('{amount}', input.amount || t('packageRisk.not_specified'))
    .replace('{timing}', input.timing || t('packageRisk.not_specified'))
    .replace('{symptoms}', (input.symptoms || []).map(id => optionLabel('symptoms', id)).join(', ') || t('packageRisk.no_symptom_specified'))
    .replace('{level}', ruleResult.level)
    .replace('{matches}', ruleResult.matches.map(match => `${match.label}: ${match.found.join(', ')}`).join(' | ') || t('packageRisk.none'));
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
              <span>${escapeHtml(match.found.join(', ') || t('packageRisk.sign_or_risk'))}</span>
      </div>
    `).join('')
    : `<div class="package-match-row"><strong>${t('packageRisk.no_keyword')}</strong><span>${t('packageRisk.no_keyword_desc')}</span></div>`;

  return `
    <div class="package-risk-result ${result.meta.cls}">
      <div class="package-risk-score">
        <span>${result.meta.score}</span>
        <small>${t('packageRisk.risk_score')}</small>
      </div>
      <div>
        <div class="premium-screen-kicker">${t('packageRisk.result_kicker')}</div>
        <h2>${escapeHtml(result.meta.title)}</h2>
        <p>${escapeHtml(result.nextAction)}</p>
        ${result.contextWarnings.length ? `<p>${escapeHtml(result.contextWarnings[0])}</p>` : ''}
      </div>
    </div>

    <div class="package-match-list">
      ${matchHtml}
    </div>

    <div class="knowledge-panel danger">
      <h3>${t('packageRisk.do_not_do')}</h3>
      <ul>${result.safeSteps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ul>
    </div>

    ${result.ai ? `
      <div class="knowledge-panel urgent">
        <h3>${t('packageRisk.ai_safe_summary')}</h3>
        <p class="text-sm text-secondary mb-3">${escapeHtml(result.ai.headline || t('packageRisk.ai_assessment'))}</p>
        <p class="text-sm text-secondary mb-3">${escapeHtml(result.ai.reason || '')}</p>
        ${result.ai.prepare.length ? `<strong class="text-xs">${t('packageRisk.prepare_for_vet')}</strong><ul>${result.ai.prepare.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
        ${result.ai.askVet.length ? `<strong class="text-xs">${t('packageRisk.questions_to_ask')}</strong><ul>${result.ai.askVet.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
      </div>
    ` : `
      <div class="ai-free-note">
        <span>${window.__icons?.spark || ''}</span>
        <p>${isGeminiConfigured() ? t('packageRisk.ai_failed_note') : t('packageRisk.ai_inactive_note')}</p>
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
        <div class="header-title">${t('packageRisk.title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.alert}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero danger">
          <div class="premium-icon-box">${window.__icons?.upload}</div>
          <div>
            <div class="premium-screen-kicker">${isGeminiConfigured() ? t('packageRisk.ai_enabled') : t('packageRisk.ai_ready')}</div>
            <h1>${t('packageRisk.heading')}</h1>
            <p>${t('packageRisk.hero_desc').replace('{name}', escapeHtml(pet.name))}</p>
          </div>
        </div>

        <div class="info-box warning mb-4">
          <span class="info-box-icon">${window.__icons?.alert}</span>
          <span>${t('packageRisk.info')}</span>
        </div>

        <div class="feature-form-card">
          <div class="feature-field">
            <span>${t('packageRisk.package_photo')}</span>
            <input id="packagePhoto" type="file" class="feature-upload-input hidden" accept="image/*" />
            <button class="feature-upload" type="button" id="btnPackageUpload">
              ${window.__icons?.camera}
              <strong>${t('packageRisk.choose_photo')}</strong>
              <small>${t('packageRisk.photo_hint')}</small>
            </button>
          </div>

          <label class="feature-field">
            <span>${t('packageRisk.product_name')}</span>
            <input id="productName" placeholder="${t('packageRisk.product_placeholder')}" />
          </label>

          <label class="feature-field">
            <span>${t('packageRisk.ingredients')}</span>
            <textarea id="ingredientText" placeholder="${t('packageRisk.ingredients_placeholder')}"></textarea>
          </label>

          <label class="feature-field">
            <span>${t('packageRisk.amount')}</span>
            <input id="amountText" placeholder="${t('packageRisk.amount_placeholder')}" />
          </label>

          <div class="feature-field">
            <span>${t('packageRisk.when')}</span>
            <div class="feature-chip-row" id="timingChips">
              ${list('packageRisk.timing_ids').map((id, index) => `<button type="button" class="${index === 0 ? 'selected' : ''}" data-value="${id}">${optionLabel('timing', id)}</button>`).join('')}
            </div>
          </div>

          <div class="feature-field">
            <span>${t('packageRisk.symptom_question')}</span>
            <div class="feature-check-grid" id="symptomChecks">
              ${list('packageRisk.symptom_ids').map((id, index) => `
                <label>
                  <input type="checkbox" ${index === 0 ? 'checked' : ''} value="${id}" />
                  <b>${optionLabel('symptoms', id)}</b>
                </label>
              `).join('')}
            </div>
          </div>
        </div>

        <div id="packageRiskResult" class="package-risk-output hidden"></div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnAnalyzePackage">${t('packageRisk.run_scan')}</button>
          <button class="btn btn-secondary btn-full hidden" id="btnSaveToxicRecord">${t('packageRisk.save_record')}</button>
          <button class="btn btn-ghost btn-full" id="btnKnowledge">${t('packageRisk.knowledge')}</button>
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
    button.querySelector('small').textContent = `${file.type || t('packageRisk.visual')} ${t('packageRisk.separator')} ${Math.ceil(file.size / 1024)} KB`;
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
      showToast(t('packageRisk.input_required'));
      return;
    }

    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = t('packageRisk.scanning');

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
          system: t('packageRisk.system_prompt'),
          prompt,
          model: import.meta.env?.VITE_GEMINI_CRITICAL_MODEL || 'gemini-3.5-flash'
        });
        if (ai?.ok) {
          lastResult.ai = normalizeAiResult(ai.data);
          if (lastResult.ai?.level && lastResult.ai.level !== 'unknown') {
            const order = ['unknown', 'watch', 'foreign', 'high', 'critical'];
            if (order.indexOf(lastResult.ai.level) > order.indexOf(lastResult.level)) {
              lastResult.level = lastResult.ai.level;
              lastResult.meta = levelMeta(lastResult.level) || lastResult.meta;
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
    button.textContent = t('common.saving');

    try {
      const file = filePayload(document.getElementById('packagePhoto'));
      const symptoms = selectedValues('#symptomChecks input');
      const payload = {
        [payloadLabel('what_ingested')]: fieldValue('productName') || t('packageRisk.title'),
        [payloadLabel('when_happened')]: [optionLabel('timing', selectedValues('#timingChips button')[0] || 'not_sure')],
        [payloadLabel('sign_question')]: symptoms.map(id => ({ label: optionLabel('symptoms', id), checked: true })),
        [payloadLabel('detail')]: [
          fieldValue('ingredientText') ? `${t('packageRisk.ingredients')}: ${fieldValue('ingredientText')}` : '',
          fieldValue('amountText') ? `${t('packageRisk.amount')}: ${fieldValue('amountText')}` : '',
          lastResult ? `${t('packageRisk.scan_result')}: ${lastResult.meta.title}. ${lastResult.nextAction}` : ''
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

      showToast(t('packageRisk.record_created'));
      navigate('/history/health-records?filter=toxin_foreign_body&sort=newest');
    } catch (err) {
      showToast(`${t('packageRisk.record_failed')}: ${err.message}`);
      button.disabled = false;
      button.textContent = original;
    }
  });
}
