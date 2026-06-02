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
          <button type="button" id="btnAdmin">Admin</button>
          <button type="button" id="btnOpenApp">${t('landing.open_app')}</button>
        </nav>
      </header>

      <main class="web-hero">
        <section class="web-hero-copy">
          <div class="premium-screen-kicker">${t('landing.kicker')}</div>
          <h1>${t('landing.hero_title')}</h1>
          <p>${t('landing.hero_desc')}</p>
          <div class="web-hero-actions">
            <button class="btn btn-primary" id="btnStart">Admin Paneli</button>
            <button class="btn btn-secondary" id="btnDemo">${t('landing.mobile_preview')}</button>
          </div>
        </section>

        <section class="web-product-visual" aria-label="${t('landing.visual_label')}">
          <div class="web-phone-frame">
            <div class="web-phone-top"></div>
            <div class="web-phone-card hero">
              <span>${t('landing.free_health_area')}</span>
              <strong>Boncuk</strong>
              <small>Kedi · British · 4.2 kg</small>
            </div>
            <div class="web-phone-grid">
              <div><b>AI</b><small>${t('landing.pre_check')}</small></div>
              <div><b>4.4</b><small>kg</small></div>
              <div><b>1</b><small>takip</small></div>
              <div><b>3.5</b><small>kritik model</small></div>
            </div>
            <div class="web-phone-card alert">
              <span>Risk sinyali</span>
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
