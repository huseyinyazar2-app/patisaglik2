import { goBack, navigate } from '../../router.js';
import { runProductSafetyCheck } from '../../services/productSafety.js';
import { showToast } from '../../ui/toast.js';

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
  return document.querySelector(selector)?.textContent?.trim() || '';
}

function levelMeta(level) {
  const map = {
    high: { title: 'Yüksek güvenlik sinyali', cls: 'danger', score: 82 },
    watch: { title: 'Kontrol gerektiren sinyal', cls: 'warning', score: 48 },
    clear: { title: 'Açık eşleşme bulunmadı', cls: 'info', score: 12 }
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
        <small>sinyal</small>
      </div>
      <div>
        <div class="premium-screen-kicker">Güvenlik radarı</div>
        <h2>${meta.title}</h2>
        <p>Kaynak durumu: ${escapeHtml(result.apiStatus)}. Bu ekran kesin hüküm değil, ürün/lot kontrol asistanıdır.</p>
      </div>
    </div>

    <div class="package-match-list">
      ${recalls.length ? recalls.map(item => `
        <div class="package-match-row">
          <strong>${escapeHtml(item.product)}</strong>
          <span>${escapeHtml([item.firm, item.classification, item.status, item.recallNumber].filter(Boolean).join(' · '))}</span>
          <span>${escapeHtml(item.reason)}</span>
        </div>
      `).join('') : '<div class="package-match-row"><strong>openFDA recall eşleşmesi bulunmadı</strong><span>Lot/seri kontrolü yine de üretici duyurusuyla doğrulanmalıdır.</span></div>'}
    </div>

    ${(result.warnings || []).length ? `
      <div class="knowledge-panel urgent">
        <h3>Yerel kontrol notları</h3>
        <ul>${result.warnings.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
    ` : ''}

    <div class="knowledge-panel">
      <h3>Sonraki güvenli adımlar</h3>
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
        <div class="header-title">Güvenlik Radarı</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.shield || ''}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero gold">
          <div class="premium-icon-box">${window.__icons?.shield || ''}</div>
          <div>
            <div class="premium-screen-kicker">Mama / ilaç / ürün</div>
            <h1>Ürün güvenlik radarı</h1>
            <p>Geri çağırma ve güvenlik sinyali kontrolü yapar. Toksik ambalaj yutma şüphesiyle karıştırılmaz.</p>
          </div>
        </div>

        <div class="info-box warning mb-4">
          <span class="info-box-icon">${window.__icons?.alert || ''}</span>
          <span>İlk fazda ücretsiz openFDA Food Enforcement recall araması kullanılır. Sonuçlar kesin sebep-sonuç veya tıbbi karar değildir.</span>
        </div>

        <div class="feature-form-card">
          <div class="feature-field">
            <span>Ürün türü</span>
            <div class="feature-chip-row" id="productType">
              ${['Mama', 'Takviye', 'İlaç', 'Oyuncak / bakım ürünü'].map((item, index) => `<button type="button" class="${index === 0 ? 'selected' : ''}">${item}</button>`).join('')}
            </div>
          </div>

          <label class="feature-field">
            <span>Ürün adı</span>
            <input id="productName" placeholder="Örn. somonlu kuru mama, probiyotik, kulak solüsyonu" />
          </label>

          <label class="feature-field">
            <span>Marka</span>
            <input id="brandName" placeholder="Marka / üretici adı" />
          </label>

          <label class="feature-field">
            <span>Barkod</span>
            <input id="barcode" placeholder="Varsa barkod" inputmode="numeric" />
          </label>

          <label class="feature-field">
            <span>Lot / seri / SKT</span>
            <input id="lotNumber" placeholder="Örn. LOT A123, SKT 12/2026" />
          </label>
        </div>

        <div id="safetyRadarResult" class="package-risk-output hidden"></div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnRunSafety">Güvenlik Kontrolü Yap</button>
          <button class="btn btn-ghost btn-full" id="btnPackageRisk">Toksik Ambalaj Şüphesine Git</button>
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
      showToast('Ürün adı veya marka girin.');
      return;
    }

    const button = event.currentTarget;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Kontrol ediliyor...';

    const result = await runProductSafetyCheck({
      productType: selected('#productType button.selected') || 'Mama',
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
