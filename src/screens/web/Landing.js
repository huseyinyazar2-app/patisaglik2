import { navigate } from '../../router.js';
import { t } from '../../i18n/tr.js';

export function render() {
  const features = t('landing.features');
  return `
    <div class="web-page">
      <header class="web-nav">
        <button class="web-brand" id="brandHome" type="button">
          <span>${window.__icons?.paw || ''}</span>
          <strong>${t('app.name')}</strong>
        </button>
        <nav>
          <button type="button" id="btnAdmin">${t('landing.admin')}</button>
          <button type="button" id="btnOpenApp">${t('landing.open_app')}</button>
        </nav>
      </header>

      <main class="web-hero">
        <section class="web-hero-copy">
          <div class="premium-screen-kicker">${t('landing.kicker')}</div>
          <h1>${t('landing.hero_title')}</h1>
          <p>${t('landing.hero_desc')}</p>
          <div class="web-hero-actions">
            <button class="btn btn-primary" id="btnStart">${t('landing.admin_panel')}</button>
            <button class="btn btn-secondary" id="btnDemo">${t('landing.mobile_preview')}</button>
          </div>
        </section>

        <section class="web-product-visual" aria-label="${t('landing.visual_label')}">
          <div class="web-phone-frame">
            <div class="web-phone-top"></div>
            <div class="web-phone-card hero">
              <span>${t('landing.free_health_area')}</span>
              <strong>${t('landing.preview_subject')}</strong>
              <small>${t('landing.preview_meta')}</small>
            </div>
            <div class="web-phone-grid">
              <div><b>AI</b><small>${t('landing.pre_check')}</small></div>
              <div><b>PDF</b><small>${t('landing.preview_passport')}</small></div>
              <div><b>KG</b><small>${t('landing.preview_weight')}</small></div>
              <div><b>24</b><small>${t('landing.preview_followup')}</small></div>
            </div>
            <div class="web-phone-card alert">
              <span>${t('landing.risk_signal')}</span>
              <strong>${t('landing.vet_guidance_ready')}</strong>
            </div>
          </div>
        </section>
      </main>

      <section class="web-feature-band">
        ${features.map(({ title, desc }) => `
          <article class="web-feature-card">
            <span>${window.__icons?.checkCircle || ''}</span>
            <h3>${title}</h3>
            <p>${desc}</p>
          </article>
        `).join('')}
      </section>

      <section class="web-section-split">
        <div>
          <div class="premium-screen-kicker">${t('landing.hybrid_kicker')}</div>
          <h2>${t('landing.hybrid_title')}</h2>
        </div>
        <p>${t('landing.hybrid_desc')}</p>
      </section>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('brandHome')?.addEventListener('click', () => navigate('/web'));
  document.getElementById('btnAdmin')?.addEventListener('click', () => navigate('/admin'));
  document.getElementById('btnStart')?.addEventListener('click', () => navigate('/admin'));
  document.getElementById('btnOpenApp')?.addEventListener('click', () => navigate('/home'));
  document.getElementById('btnDemo')?.addEventListener('click', () => navigate('/home'));
}
