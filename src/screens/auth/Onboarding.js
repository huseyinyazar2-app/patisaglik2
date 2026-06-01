// Pati Sağlık — Onboarding Screen
import { navigate } from '../../router.js';
import { getState } from '../../store.js';
import { t } from '../../i18n/tr.js';

const slides = [
  { visual: 'care', titleKey: 'onboarding.s1_title', descKey: 'onboarding.s1_desc' },
  { visual: 'triage', titleKey: 'onboarding.s2_title', descKey: 'onboarding.s2_desc' },
  { visual: 'media', titleKey: 'onboarding.s3_title', descKey: 'onboarding.s3_desc' },
  { visual: 'report', titleKey: 'onboarding.s4_title', descKey: 'onboarding.s4_desc' }
];

export function render(params = {}, query = {}) {
  const state = getState();

  return `
    <div class="screen onboarding-screen">
      <div class="version-badge">${state.version}</div>

      <div class="onboarding-slides" id="onboarding-slides">
        ${slides.map((slide, i) => `
          <div class="onboarding-slide" data-slide="${i}">
            <div class="onboarding-illustration onboarding-visual-${slide.visual}" aria-hidden="true"></div>
            <h2 class="onboarding-title">${t(slide.titleKey)}</h2>
            <p class="onboarding-desc">${t(slide.descKey)}</p>
          </div>
        `).join('')}
      </div>

      <div class="onboarding-footer">
        <div class="dots" id="onboarding-dots">
          ${slides.map((_, i) => `
            <div class="dot ${i === 0 ? 'active' : ''}" data-dot="${i}"></div>
          `).join('')}
        </div>

        <button id="onboarding-next-btn" class="btn btn-primary btn-lg btn-full btn-pill">
          ${t('onboarding.next')}
        </button>

        <button id="onboarding-skip-btn" class="btn btn-ghost btn-sm">
          ${t('onboarding.skip')}
        </button>
      </div>
    </div>
  `;
}

export function afterRender(params = {}, query = {}) {
  const slidesContainer = document.getElementById('onboarding-slides');
  const dotsContainer = document.getElementById('onboarding-dots');
  const nextBtn = document.getElementById('onboarding-next-btn');
  const skipBtn = document.getElementById('onboarding-skip-btn');
  let currentSlide = 0;
  const totalSlides = slides.length;

  function updateDots(index) {
    const dots = dotsContainer?.querySelectorAll('.dot');
    dots?.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  function updateButton(index) {
    if (nextBtn) {
      nextBtn.textContent = index === totalSlides - 1
        ? t('splash.start')
        : t('onboarding.next');
    }
  }

  // Track scroll position to update dots
  let scrollTimeout;
  slidesContainer?.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      if (!slidesContainer) return;
      const slideWidth = slidesContainer.offsetWidth;
      const newIndex = Math.round(slidesContainer.scrollLeft / slideWidth);
      if (newIndex !== currentSlide && newIndex >= 0 && newIndex < totalSlides) {
        currentSlide = newIndex;
        updateDots(currentSlide);
        updateButton(currentSlide);
      }
    }, 50);
  });

  nextBtn?.addEventListener('click', () => {
    if (currentSlide >= totalSlides - 1) {
      navigate('/auth/register');
      return;
    }

    currentSlide++;
    const slideWidth = slidesContainer.offsetWidth;
    slidesContainer.scrollTo({
      left: slideWidth * currentSlide,
      behavior: 'smooth'
    });
    updateDots(currentSlide);
    updateButton(currentSlide);
  });

  skipBtn?.addEventListener('click', () => {
    navigate('/auth/register');
  });
}
