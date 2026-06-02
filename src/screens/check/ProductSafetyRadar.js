import { goBack, navigate } from '../../router.js';
import { runProductSafetyCheck } from '../../services/productSafety.js';
import { showToast } from '../../ui/toast.js';
import { t } from '../../i18n/tr.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function value(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function selected(selector) {
  return document.querySelector(selector)?.dataset?.value || '';
}

function levelMeta(level) {
  const map = {
    high: { title: t('productSafetyRadar.level_high'), cls: 'danger', score: 82 },
    watch: { title: t('productSafetyRadar.level_watch'), cls: 'warning', score: 48 },
    clear: { title: t('productSafetyRadar.level_clear'), cls: 'info', score: 12 }
  };
  return map[level] || map.clear;
}

function renderResult(result) {
  const meta = levelMeta(result.riskLevel);
  const recalls = result.recalls || [];
  return `
    <div class="package-risk-result ${meta.cls}">
      <div class="package-risk-score">
        <span>${meta.score}</span>
        <small>${t('productSafetyRadar.signal')}</small>
      </div>
      <div>
        <div class="premium-screen-kicker">${t('productSafetyRadar.kicker')}</div>
        <h2>${meta.title}</h2>
        <p>${t('productSafetyRadar.source_status', { status: escapeHtml(result.apiStatus) })}</p>
      </div>
    </div>

    <div class="package-match-list">
      ${recalls.length ? recalls.map(item => `
        <div class="package-match-row">
          <strong>${escapeHtml(item.product)}</strong>
          <span>${escapeHtml([item.firm, item.classification, item.status, item.recallNumber].filter(Boolean).join(' · '))}</span>
          <span>${escapeHtml(item.reason)}</span>
        </div>
      `).join('') : `<div class="package-match-row"><strong>${t('productSafetyRadar.no_recall')}</strong><span>${t('productSafetyRadar.no_recall_desc')}</span></div>`}
    </div>

    ${(result.warnings || []).length ? `
      <div class="knowledge-panel urgent">
        <h3>${t('productSafetyRadar.local_notes')}</h3>
        <ul>${result.warnings.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
    ` : ''}

    <div class="knowledge-panel">
      <h3>${t('productSafetyRadar.next_steps')}</h3>
      <ul>${result.nextSteps.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
  `;
}

export function render() {
  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back || ''}</button>
        </div>
        <div class="header-title">${t('productSafetyRadar.title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.shield || ''}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero gold">
          <div class="premium-icon-box">${window.__icons?.shield || ''}</div>
          <div>
            <div class="premium-screen-kicker">${t('productSafetyRadar.hero_kicker')}</div>
            <h1>${t('productSafetyRadar.hero_title')}</h1>
            <p>${t('productSafetyRadar.hero_desc')}</p>
          </div>
        </div>

        <div class="info-box warning mb-4">
          <span class="info-box-icon">${window.__icons?.alert || ''}</span>
          <span>${t('productSafetyRadar.warning')}</span>
        </div>

        <div class="feature-form-card">
          <div class="feature-field">
            <span>${t('productSafetyRadar.product_type')}</span>
            <div class="feature-chip-row" id="productType">
              ${t('productSafetyRadar.product_types').map((item, index) => `<button type="button" data-value="${escapeHtml(item.value)}" class="${index === 0 ? 'selected' : ''}">${escapeHtml(item.label)}</button>`).join('')}
            </div>
          </div>

          <label class="feature-field">
            <span>${t('productSafetyRadar.product_name')}</span>
            <input id="productName" placeholder="${t('productSafetyRadar.product_placeholder')}" />
          </label>

          <label class="feature-field">
            <span>Marka</span>
            <input id="brandName" placeholder="${t('productSafetyRadar.brand_placeholder')}" />
          </label>

          <label class="feature-field">
            <span>Barkod</span>
            <input id="barcode" placeholder="${t('productSafetyRadar.barcode_placeholder')}" inputmode="numeric" />
          </label>

          <label class="feature-field">
            <span>Lot / seri / SKT</span>
            <input id="lotNumber" placeholder="${t('productSafetyRadar.lot_placeholder')}" />
          </label>
        </div>

        <div id="safetyRadarResult" class="package-risk-output hidden"></div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnRunSafety">${t('productSafetyRadar.run')}</button>
          <button class="btn btn-ghost btn-full" id="btnPackageRisk">${t('productSafetyRadar.package_risk')}</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnPackageRisk')?.addEventListener('click', () => navigate('/check/package-risk'));

  document.querySelectorAll('#productType button').forEach(button => {
    button.addEventListener('click', () => {
      button.parentElement?.querySelectorAll('button').forEach(item => item.classList.remove('selected'));
      button.classList.add('selected');
    });
  });

  document.getElementById('btnRunSafety')?.addEventListener('click', async (event) => {
    const productName = value('productName');
    const brand = value('brandName');
    if (!productName && !brand) {
      showToast(t('productSafetyRadar.name_required'));
      return;
    }

    const button = event.currentTarget;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = t('productSafetyRadar.checking');

    const result = await runProductSafetyCheck({
      productType: selected('#productType button.selected') || 'food',
      productName,
      brand,
      barcode: value('barcode'),
      lot: value('lotNumber')
    });

    const target = document.getElementById('safetyRadarResult');
    target.innerHTML = renderResult(result);
    target.classList.remove('hidden');
    button.disabled = false;
    button.textContent = original;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
