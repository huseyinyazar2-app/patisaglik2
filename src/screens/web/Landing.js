import { navigate } from '../../router.js';
import { getLocale, setLocale, supportedLocales, t } from '../../i18n/tr.js';

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

function localeOptions(currentLocale) {
  return supportedLocales
    .map((locale) => `<option value="${locale.code}" ${currentLocale === locale.code ? 'selected' : ''}>${escapeHtml(locale.nativeName)}</option>`)
    .join('');
}

export function render() {
  const features = t('landing.features');
  const journey = t('landing.journey');
  const audiences = t('landing.audiences');
  const proof = t('landing.proof');
  const metrics = t('landing.metrics');
  const locale = getLocale();

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
          <label class="web-locale-switch">
            <span>${t('landing.language')}</span>
            <select id="landingLocale">${localeOptions(locale)}</select>
          </label>
          <button type="button" id="btnAdmin">${t('landing.admin')}</button>
          <button type="button" id="btnOpenApp">${t('landing.open_app')}</button>
        </nav>
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
              <div class="web-scene-glow glow-a"></div>
              <div class="web-scene-glow glow-b"></div>

              <div class="web-device-shell">
                <div class="web-device-notch"></div>
                <div class="web-device-screen">
                  <div class="web-device-badge">${t('landing.free_health_area')}</div>
                  <div class="web-device-avatar">
                    <div class="web-device-avatar-core">
                      <span>${window.__icons?.paw || ''}</span>
                    </div>
                  </div>
                  <strong>${t('landing.preview_subject')}</strong>
                  <small>${t('landing.preview_meta')}</small>

                  <div class="web-signal-grid">
                    <div>
                      <b>AI</b>
                      <small>${t('landing.pre_check')}</small>
                    </div>
                    <div>
                      <b>Link</b>
                      <small>${t('landing.preview_passport')}</small>
                    </div>
                    <div>
                      <b>24h</b>
                      <small>${t('landing.preview_followup')}</small>
                    </div>
                    <div>
                      <b>1</b>
                      <small>${t('landing.preview_single_flow')}</small>
                    </div>
                  </div>

                  <div class="web-device-alert">
                    <span>${t('landing.risk_signal')}</span>
                    <strong>${t('landing.vet_guidance_ready')}</strong>
                  </div>
                </div>
              </div>

              <div class="web-side-stack">
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
  document.getElementById('btnAdmin')?.addEventListener('click', () => navigate('/admin'));
  document.getElementById('btnStart')?.addEventListener('click', () => navigate('/admin'));
  document.getElementById('btnStartBottom')?.addEventListener('click', () => navigate('/admin'));
  document.getElementById('btnOpenApp')?.addEventListener('click', () => navigate('/home'));
  document.getElementById('btnOpenAppBottom')?.addEventListener('click', () => navigate('/home'));
  document.getElementById('btnDemo')?.addEventListener('click', () => navigate('/home'));
  document.getElementById('landingLocale')?.addEventListener('change', (event) => {
    setLocale(event.target.value || 'tr');
    window.location.reload();
  });
  document.querySelectorAll('[data-scroll]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector(button.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
