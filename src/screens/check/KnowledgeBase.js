import { navigate, goBack } from '../../router.js';
import { t } from '../../i18n/tr.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function topics() {
  const value = t('knowledge.topics');
  return Array.isArray(value) ? value : [];
}

function getTopic(topicId) {
  return topics().find(topic => topic.id === topicId);
}

function renderList(items = []) {
  return `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderTopicCard(topic) {
  return `
    <button class="knowledge-topic-card ${topic.tone}" data-topic-id="${topic.id}">
      <div class="premium-icon-box">${window.__icons?.[topic.icon] || window.__icons?.clipboard}</div>
      <div>
        <strong>${escapeHtml(topic.title)}</strong>
        <p>${escapeHtml(topic.desc)}</p>
      </div>
      <span>${window.__icons?.chevronRight}</span>
    </button>
  `;
}

function renderTopicDetail(topic) {
  return `
    <div class="screen premium-check knowledge-screen">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${escapeHtml(topic.title)}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.[topic.icon] || window.__icons?.clipboard}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero ${topic.tone}">
          <div class="premium-icon-box">${window.__icons?.[topic.icon] || window.__icons?.clipboard}</div>
          <div>
            <div class="premium-screen-kicker">${t('knowledge.safe_info')}</div>
            <h1>${escapeHtml(topic.title)}</h1>
            <p>${escapeHtml(topic.desc)}</p>
          </div>
        </div>

        <div class="info-box warning mb-4">
          <span class="info-box-icon">${window.__icons?.alert}</span>
          <span>${t('knowledge.disclaimer')}</span>
        </div>

        <div class="knowledge-detail-grid">
          <section class="knowledge-panel">
            <h3>${t('knowledge.signals')}</h3>
            ${renderList(topic.signals)}
          </section>
          <section class="knowledge-panel danger">
            <h3>${t('knowledge.dont')}</h3>
            ${renderList(topic.dont)}
          </section>
          <section class="knowledge-panel">
            <h3>${t('knowledge.prepare')}</h3>
            ${renderList(topic.prepare)}
          </section>
          <section class="knowledge-panel urgent">
            <h3>${t('knowledge.urgent')}</h3>
            ${renderList(topic.urgent)}
          </section>
        </div>

        <div class="feature-bottom-actions">
          ${topic.id === 'toxic' ? `<button class="btn btn-primary btn-full" id="btnToxicRecord">${t('knowledge.toxic_record')}</button>` : ''}
          <button class="btn btn-secondary btn-full" id="btnVetPrep">${t('knowledge.vet_prep')}</button>
        </div>
      </div>
    </div>
  `;
}

export function render(params = {}) {
  const topic = params.topicId ? getTopic(params.topicId) : null;
  if (params.topicId && !topic) {
    return `
      <div class="screen premium-check knowledge-screen">
        <div class="header premium-soft-header">
          <div class="header-left"><button class="header-icon" id="btnBack">${window.__icons?.back}</button></div>
          <div class="header-title">${t('knowledge.not_found_title')}</div>
          <div class="header-right"></div>
        </div>
        <div class="section pt-4">
          <div class="empty-state">
            <div class="empty-state-icon">${window.__icons?.search || ''}</div>
            <div class="empty-state-title">${t('knowledge.not_found_empty')}</div>
            <div class="empty-state-desc">${t('knowledge.not_found_desc')}</div>
            <button class="btn btn-primary btn-full mt-4" id="btnKnowledgeHome">${t('knowledge.back_to_bank')}</button>
          </div>
        </div>
      </div>
    `;
  }

  if (topic) return renderTopicDetail(topic);

  return `
    <div class="screen premium-check knowledge-screen">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('knowledge.title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.shield}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="knowledge-hero">
          <div>
            <div class="premium-screen-kicker">${t('knowledge.kicker')}</div>
            <h1>${t('knowledge.heading')}</h1>
            <p>${t('knowledge.desc')}</p>
          </div>
        </div>

        <div class="knowledge-rule-strip">
          <span>${window.__icons?.xCircle}</span>
          <b>${t('knowledge.rule')}</b>
        </div>

        <div class="knowledge-topic-list">
          ${topics().map(renderTopicCard).join('')}
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  document.getElementById('btnBack')?.addEventListener('click', () => {
    if (params.topicId) navigate('/check/knowledge');
    else goBack();
  });
  document.getElementById('btnKnowledgeHome')?.addEventListener('click', () => navigate('/check/knowledge'));
  document.getElementById('btnToxicRecord')?.addEventListener('click', () => navigate('/feature/toxic'));
  document.getElementById('btnVetPrep')?.addEventListener('click', () => navigate('/feature/vet-prep'));

  document.querySelectorAll('[data-topic-id]').forEach(card => {
    card.addEventListener('click', () => navigate(`/check/knowledge/${card.dataset.topicId}`));
  });
}
