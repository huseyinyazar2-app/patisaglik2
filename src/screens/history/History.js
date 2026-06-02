// History main screen
import { navigate, goBack } from '../../router.js';
import { getState } from '../../store.js';
import { getLocale, t } from '../../i18n/tr.js';
import { getLocalPets } from '../../services/pets.js';
import { getFreeRecords, mergeRecentRecords } from '../../services/freeRecords.js';

const menuItems = [
  { id: 'timeline', icon: 'clock', path: '/history/timeline' },
  { id: 'measurements', icon: 'measurement', path: '/history/measurements' },
  { id: 'issues', icon: 'search', path: '/history/health-records' },
  { id: 'expense', icon: 'briefcase', path: '/history/expenses' },
  { id: 'reminders', icon: 'calendar', path: '/history/reminders' },
  { id: 'templates', icon: 'clipboard', path: '/history/health-records?filter=chronic_followup&sort=newest' },
  { id: 'senior', icon: 'shield', path: '/history/health-records?filter=senior_followup&sort=newest' }
];

function formatShortDate(date) {
  if (!date) return t('history.no_date');
  return new Intl.DateTimeFormat(getLocale() === 'tr' ? 'tr-TR' : getLocale(), { day: 'numeric', month: 'long' }).format(new Date(date));
}

function formatMoney(amountCents, currency = 'TRY') {
  return new Intl.NumberFormat(getLocale() === 'tr' ? 'tr-TR' : getLocale(), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format((amountCents || 0) / 100);
}

function renderHistoryPreview(records = null) {
  if (!records) {
    return `
      <div class="free-record-panel">
        <div class="free-record-metrics">
          <span>${t('history.loading')}</span><span>${t('history.expense')}</span><span>${t('history.calendar')}</span>
        </div>
        <p>${t('history.loading_free_records')}</p>
      </div>
    `;
  }

  const recent = mergeRecentRecords(records).slice(0, 4);
  const expenseTotal = records.expenses.reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);

  return `
    <div class="free-record-panel">
      <div class="free-record-metrics">
        <span><b>${records.healthRecords.length}</b> ${t('history.health_lower')}</span>
        <span><b>${formatMoney(expenseTotal)}</b> ${t('history.expense_lower')}</span>
        <span><b>${records.reminders.length}</b> ${t('history.calendar_lower')}</span>
      </div>
      <div class="free-record-list">
        ${recent.length ? recent.map(item => `
          <div class="free-record-row">
            <div class="premium-icon-box">${window.__icons?.[item.kind === 'expense' ? 'briefcase' : item.kind === 'reminder' ? 'calendar' : 'heartPulse']}</div>
            <div>
              <strong>${item.title || item.category || item.record_type || t('history.record')}</strong>
              <p>${formatShortDate(item.date)} ${t('history.separator')} ${item.kind === 'expense' ? formatMoney(item.amount_cents, item.currency) : item.summary || item.note || t('history.form_record')}</p>
            </div>
          </div>
        `).join('') : `<p>${t('history.no_free_records')}</p>`}
      </div>
    </div>
  `;
}

export function render() {
  const state = getState();
  const pet = getLocalPets().find((item) => item.id === state.activePetId) || {};

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="backBtn">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('history.title')}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.clock}</span>
        </div>
      </div>

      <div class="section pt-4">
        <div class="history-summary-panel">
          <div class="avatar">${window.__icons?.paw}</div>
          <div>
            <div class="premium-screen-kicker">${t('history.free_archive')}</div>
            <h2>${pet.name || t('reports.detail.active_pet')}</h2>
            <p>${[pet.breed, pet.age, pet.statusText].filter(Boolean).join(t('history.separator')) || t('healthPassport.profile_info')}</p>
          </div>
        </div>
      </div>

      <div class="section pt-0" id="historyFreeRecords">
        ${renderHistoryPreview()}
      </div>

      <div class="section pt-0">
        <div class="feature-menu-list">
          ${menuItems.map(item => `
            <button class="feature-menu-card" data-path="${item.path || ''}" data-feature="${item.id}">
              <div class="premium-icon-box">${window.__icons?.[item.icon]}</div>
              <div>
                <strong>${t(`history.menu.${item.id}.title`)}</strong>
                <p>${t(`history.menu.${item.id}.desc`)}</p>
              </div>
              <span>${t('history.free_tier')}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div style="height: 86px;"></div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  document.getElementById('backBtn')?.addEventListener('click', () => goBack());

  document.querySelectorAll('[data-feature]').forEach(card => {
    card.addEventListener('click', () => {
      if (card.dataset.path) {
        navigate(card.dataset.path);
        return;
      }
    });
  });

  getFreeRecords({ petId: state.activePetId }).then((records) => {
    const target = document.getElementById('historyFreeRecords');
    if (target) target.innerHTML = renderHistoryPreview(records);
  }).catch(() => {});
}
