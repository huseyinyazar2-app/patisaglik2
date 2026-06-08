import { goBack } from '../../router.js';
import { t } from '../../i18n/tr.js';
import { addRecordCategory, getCustomRecordCategories, getRecordCategories, removeRecordCategory } from '../../services/recordCategories.js';

const CATEGORY_KINDS = ['expense', 'reminder'];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderCategoryList(kind) {
  const custom = new Set(getCustomRecordCategories(kind).map((item) => item.label));
  return getRecordCategories(kind).map((label) => `
    <div class="category-manager-row">
      <span>${escapeHtml(label)}</span>
      ${custom.has(label) ? `<button type="button" data-remove-category="${escapeHtml(label)}" data-kind="${kind}">${t('recordCategories.remove')}</button>` : `<small>${t('recordCategories.default_badge')}</small>`}
    </div>
  `).join('');
}

function renderKind(kind) {
  return `
    <div class="feature-form-card category-manager-card" data-category-kind="${kind}">
      <div class="category-manager-head">
        <div>
          <strong>${t(`recordCategories.kinds.${kind}.title`)}</strong>
          <p>${t(`recordCategories.kinds.${kind}.desc`)}</p>
        </div>
        <span>${getRecordCategories(kind).length}</span>
      </div>
      <div class="category-manager-add">
        <input id="categoryInput-${kind}" placeholder="${t('recordCategories.add_placeholder')}" />
        <button class="btn btn-primary" type="button" data-add-category="${kind}">${t('recordCategories.add')}</button>
      </div>
      <div class="category-manager-list">${renderCategoryList(kind)}</div>
    </div>
  `;
}

export function render() {
  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('recordCategories.title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.briefcase}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero teal">
          <div class="premium-icon-box">${window.__icons?.briefcase}</div>
          <div>
            <div class="premium-screen-kicker">${t('recordCategories.eyebrow')}</div>
            <h1>${t('recordCategories.title')}</h1>
            <p>${t('recordCategories.desc')}</p>
          </div>
        </div>

        <div id="categoryManager">
          ${CATEGORY_KINDS.map(renderKind).join('')}
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  const refresh = () => {
    const target = document.getElementById('categoryManager');
    if (target) target.innerHTML = CATEGORY_KINDS.map(renderKind).join('');
    bindActions();
  };

  function bindActions() {
    document.querySelectorAll('[data-add-category]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const kind = btn.dataset.addCategory;
        const input = document.getElementById(`categoryInput-${kind}`);
        addRecordCategory(kind, input?.value || '');
        if (input) input.value = '';
        refresh();
      });
    });

    document.querySelectorAll('[data-remove-category]').forEach((btn) => {
      btn.addEventListener('click', () => {
        removeRecordCategory(btn.dataset.kind, btn.dataset.removeCategory);
        refresh();
      });
    });
  }

  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  bindActions();
}
