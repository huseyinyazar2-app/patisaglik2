import { navigate } from '../../router.js';
import { t } from '../../i18n/tr.js';

const featureIcons = ['shield', 'clipboard', 'activity', 'camera', 'bell', 'heartPulse'];
const journeyIcons = ['search', 'clipboard', 'stethoscope'];
const audienceIcons = ['paw', 'shield', 'briefcase'];
const proofIcons = ['checkCircle', 'lock', 'clock'];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function render() {
  const features = t('landing.features');
  const journey = t('landing.journey');
  const audiences = t('landing.audiences');
  const proof = t('landing.proof');
  const metrics = t('landing.metrics');

  return `
    <div class="web-page">
      <header class="web-nav">
        <button class="web-brand" id="brandHome" type="button">
          <span>${window.__icons?.paw || ''}</span>
          <strong>${t('app.name')}</strong>
        </button>
        <nav>
          <button type="button" data-scroll="#webFeatures">${t('landing.nav_features')}</button>
          <button type="button" data-scroll="#webJourney">${t('landing.nav_flow')}</button>
          <button type="button" data-scroll="#webSafety">${t('landing.nav_safety')}</button>
          <button type="button" id="btnOpenApp">${t('landing.open_app')}</button>
        </nav>
        <button type="button" class="web-mobile-open-app" id="btnOpenAppMobile">${t('landing.open_app')}</button>
      </header>

      <main class="web-hero">
        <section class="web-hero-copy">
          <div class="premium-screen-kicker">${t('landing.kicker')}</div>
          <h1>${t('landing.hero_title')}</h1>
          <p>${t('landing.hero_desc')}</p>
          <div class="web-proof-strip">
            ${proof.map((item, index) => `
              <div class="web-proof-pill">
                <span>${window.__icons?.[proofIcons[index]] || window.__icons?.checkCircle || ''}</span>
                <b>${item}</b>
              </div>
            `).join('')}
          </div>
          <div class="web-hero-actions">
            <button class="btn btn-primary" id="btnStart">${t('landing.hero_primary')}</button>
            <button class="btn btn-secondary" id="btnDemo">${t('landing.hero_secondary')}</button>
          </div>
          <div class="web-metric-row">
            ${metrics.map((item) => `
              <article class="web-metric-card">
                <strong>${item.value}</strong>
                <span>${item.label}</span>
              </article>
            `).join('')}
          </div>
        </section>

        <section class="web-product-visual" aria-label="${t('landing.visual_label')}">
          <div class="web-scene-shell">
            <div class="web-floating-card top">
              <span>${t('landing.visual_floating_top')}</span>
              <strong>${t('landing.visual_floating_top_title')}</strong>
              <small>${t('landing.visual_floating_top_desc')}</small>
            </div>

            <div class="web-scene-stage">
              <img class="web-hero-image" src="/assets/pet-help-hero.png" alt="${escapeHtml(t('landing.visual_label'))}" loading="eager" />
              <div class="web-hero-callouts">
                <article class="web-side-card">
                  <span>${t('landing.visual_side_one')}</span>
                  <strong>${t('landing.visual_side_one_title')}</strong>
                  <small>${t('landing.visual_side_one_desc')}</small>
                </article>
                <article class="web-side-card warm">
                  <span>${t('landing.visual_side_two')}</span>
                  <strong>${t('landing.visual_side_two_title')}</strong>
                  <small>${t('landing.visual_side_two_desc')}</small>
                </article>
                <article class="web-side-card calm">
                  <span>${t('landing.risk_signal')}</span>
                  <strong>${t('landing.vet_guidance_ready')}</strong>
                  <small>${t('landing.preview_meta')}</small>
                </article>
              </div>
            </div>

            <div class="web-floating-card bottom">
              <span>${t('landing.visual_floating_bottom')}</span>
              <strong>${t('landing.visual_floating_bottom_title')}</strong>
              <small>${t('landing.visual_floating_bottom_desc')}</small>
            </div>
          </div>
        </section>
      </main>

      <section class="web-story-band">
        <article class="web-story-card primary">
          <div class="premium-screen-kicker">${t('landing.story_kicker')}</div>
          <h2>${t('landing.story_title')}</h2>
          <p>${t('landing.story_desc')}</p>
        </article>
        <article class="web-story-card accent">
          <span>${window.__icons?.shield || ''}</span>
          <strong>${t('landing.story_badge_title')}</strong>
          <p>${t('landing.story_badge_desc')}</p>
        </article>
      </section>

      <section class="web-section-block" id="webFeatures">
        <div class="web-section-head">
          <div class="premium-screen-kicker">${t('landing.features_kicker')}</div>
          <h2>${t('landing.features_title')}</h2>
          <p>${t('landing.features_desc')}</p>
        </div>
        <div class="web-feature-band">
        ${features.map(({ title, desc }, index) => `
          <article class="web-feature-card">
            <span>${window.__icons?.[featureIcons[index]] || window.__icons?.checkCircle || ''}</span>
            <h3>${title}</h3>
            <p>${desc}</p>
          </article>
        `).join('')}
        </div>
      </section>

      <section class="web-section-split" id="webJourney">
        <div>
          <div class="premium-screen-kicker">${t('landing.journey_kicker')}</div>
          <h2>${t('landing.journey_title')}</h2>
        </div>
        <p>${t('landing.journey_desc')}</p>
      </section>

      <section class="web-journey-grid">
        ${journey.map(({ title, desc }, index) => `
          <article class="web-journey-card">
            <div class="web-journey-index">0${index + 1}</div>
            <span>${window.__icons?.[journeyIcons[index]] || window.__icons?.checkCircle || ''}</span>
            <h3>${title}</h3>
            <p>${desc}</p>
          </article>
        `).join('')}
      </section>

      <section class="web-section-block">
        <div class="web-section-head">
          <div class="premium-screen-kicker">${t('landing.audience_kicker')}</div>
          <h2>${t('landing.audience_title')}</h2>
          <p>${t('landing.audience_desc')}</p>
        </div>
        <div class="web-audience-grid">
          ${audiences.map(({ title, desc }, index) => `
            <article class="web-audience-card">
              <span>${window.__icons?.[audienceIcons[index]] || window.__icons?.paw || ''}</span>
              <h3>${title}</h3>
              <p>${desc}</p>
            </article>
          `).join('')}
        </div>
      </section>

      <section class="web-section-split" id="webSafety">
        <div>
          <div class="premium-screen-kicker">${t('landing.safety_kicker')}</div>
          <h2>${t('landing.safety_title')}</h2>
        </div>
        <p>${t('landing.safety_desc')}</p>
      </section>

      <section class="web-safety-grid">
        ${t('landing.safety_points').map((item) => `
          <article class="web-safety-card">
            <span>${window.__icons?.shield || window.__icons?.checkCircle || ''}</span>
            <p>${item}</p>
          </article>
        `).join('')}
      </section>

      <section class="web-cta-panel">
        <div>
          <div class="premium-screen-kicker">${t('landing.cta_kicker')}</div>
          <h2>${t('landing.cta_title')}</h2>
          <p>${t('landing.cta_desc')}</p>
        </div>
        <div class="web-cta-actions">
          <button class="btn btn-primary" id="btnStartBottom">${t('landing.hero_primary')}</button>
          <button class="btn btn-secondary" id="btnOpenAppBottom">${t('landing.open_app')}</button>
        </div>
      </section>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('brandHome')?.addEventListener('click', () => navigate('/web'));
  document.getElementById('btnStart')?.addEventListener('click', () => navigate('/auth/register'));
  document.getElementById('btnStartBottom')?.addEventListener('click', () => navigate('/auth/register'));
  document.getElementById('btnOpenApp')?.addEventListener('click', () => navigate('/auth/splash'));
  document.getElementById('btnOpenAppMobile')?.addEventListener('click', () => navigate('/auth/splash'));
  document.getElementById('btnOpenAppBottom')?.addEventListener('click', () => navigate('/auth/splash'));
  document.getElementById('btnDemo')?.addEventListener('click', () => document.querySelector('#webJourney')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  document.querySelectorAll('[data-scroll]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector(button.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
