import { navigate, goBack } from '../../router.js';
import { getState } from '../../store.js';
import { getActivePet } from '../../mock/pets.js';
import { getFreeRecords } from '../../services/freeRecords.js';
import { getLocale, t, translateForLocale } from '../../i18n/tr.js';

const staticConfig = {
  expenses: { icon: 'briefcase', addRoute: '/feature/expense' },
  reminders: { icon: 'calendar', addRoute: '/feature/reminders' },
  health: { icon: 'heartPulse', addRoute: '/feature/photo-followup' }
};

function localeTag() {
  const locale = getLocale();
  if (locale === 'tr') return 'tr-TR';
  if (locale === 'en') return 'en-US';
  return locale;
}

function configFor(type) {
  const localized = t(`freeRecords.list.configs.${type}`);
  const fallback = t('freeRecords.list.configs.health');
  return {
    ...(staticConfig[type] || staticConfig.health),
    ...(typeof localized === 'object' ? localized : fallback)
  };
}

function formatShortDate(date) {
  if (!date) return t('freeRecords.common.no_date');
  return new Intl.DateTimeFormat(localeTag(), { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
}

function formatMoney(amountCents, currency = 'TRY') {
  return new Intl.NumberFormat(localeTag(), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format((amountCents || 0) / 100);
}

function renderTabs(activeType) {
  return `
    <div class="free-record-tabs">
      <button class="${activeType === 'expenses' ? 'active' : ''}" data-record-tab="/history/expenses">${t('freeRecords.list.tabs.expenses')}</button>
      <button class="${activeType === 'reminders' ? 'active' : ''}" data-record-tab="/history/reminders">${t('freeRecords.list.tabs.reminders')}</button>
      <button class="${activeType === 'health' ? 'active' : ''}" data-record-tab="/history/health-records">${t('freeRecords.list.tabs.health')}</button>
    </div>
  `;
}

function routeForType(type) {
  if (type === 'expenses') return '/history/expenses';
  if (type === 'reminders') return '/history/reminders';
  return '/history/health-records';
}

function defaultSort(type) {
  if (type === 'reminders') return 'due_asc';
  return 'newest';
}

function normalizeText(value) {
  return String(value || '').toLocaleLowerCase(localeTag()).replace(/\s+/g, '');
}

function filterOptions(type) {
  const options = t(`freeRecords.list.filters.${type}`);
  return Array.isArray(options) ? options : t('freeRecords.list.filters.health');
}

function sortOptions(type) {
  const options = t(`freeRecords.list.sorts.${type}`);
  return Array.isArray(options) ? options : t('freeRecords.list.sorts.health');
}

const healthAddActions = {
  poop_score: { route: '/feature/poop-score', labelKey: 'poop_score' },
  photo_followup: { route: '/feature/photo-followup', labelKey: 'photo_followup' },
  diet_log: { route: '/feature/diet-log', labelKey: 'diet_log' },
  issue: { route: '/history/issues/new', labelKey: 'issue' },
  chronic_followup: { route: '/feature/chronic', labelKey: 'chronic_followup' },
  postop_followup: { route: '/feature/postop', labelKey: 'postop_followup' },
  reproduction_followup: { route: '/feature/reproduction', labelKey: 'reproduction_followup' },
  senior_followup: { route: '/feature/senior', labelKey: 'senior_followup' },
  toxin_foreign_body: { route: '/feature/toxic', labelKey: 'toxin_foreign_body' }
};

function addActionFor(type, filter = 'all') {
  const config = configFor(type);
  if (type !== 'health') return { route: config.addRoute, label: config.button };
  const action = healthAddActions[filter];
  return action ? { route: action.route, label: t(`freeRecords.list.healthActions.${action.labelKey}`) } : { route: config.addRoute, label: config.button };
}

function renderListControls(type, query = {}) {
  const activeFilter = query.filter || 'all';
  const activeSort = query.sort || defaultSort(type);

  return `
    <div class="record-filter-panel">
      <div>
        <span>${t('freeRecords.list.filter')}</span>
        <div class="record-filter-row">
          ${filterOptions(type).map(([value, label]) => `
            <button class="${activeFilter === value ? 'active' : ''}" data-filter="${value}">${label}</button>
          `).join('')}
        </div>
      </div>
      <div>
        <span>${t('freeRecords.list.sort')}</span>
        <div class="record-filter-row compact">
          ${sortOptions(type).map(([value, label]) => `
            <button class="${activeSort === value ? 'active' : ''}" data-sort="${value}">${label}</button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function getItems(type, records) {
  if (type === 'expenses') return records.expenses;
  if (type === 'reminders') return records.reminders;
  return records.healthRecords;
}

function itemDate(type, item) {
  if (type === 'expenses') return item.spent_at || item.created_at;
  if (type === 'reminders') return item.due_at || item.created_at;
  return item.occurred_at || item.created_at;
}

function filterAndSortItems(type, items, query = {}) {
  const activeFilter = query.filter || 'all';
  const activeSort = query.sort || defaultSort(type);
  let result = [...items];

  if (activeFilter !== 'all') {
    result = result.filter((item) => {
      if (type === 'expenses') return normalizeText(item.category) === normalizeText(activeFilter);
      if (type === 'reminders') {
        if (activeFilter === 'scheduled') return item.status === 'scheduled';
        return normalizeText(item.reminder_type).includes(normalizeText(activeFilter));
      }
      return item.record_type === activeFilter;
    });
  }

  result.sort((a, b) => {
    if (activeSort === 'amount_desc') return Number(b.amount_cents || 0) - Number(a.amount_cents || 0);
    if (activeSort === 'amount_asc') return Number(a.amount_cents || 0) - Number(b.amount_cents || 0);
    if (activeSort === 'due_asc') return new Date(itemDate(type, a) || 0) - new Date(itemDate(type, b) || 0);
    if (activeSort === 'due_desc') return new Date(itemDate(type, b) || 0) - new Date(itemDate(type, a) || 0);
    if (activeSort === 'oldest') return new Date(itemDate(type, a) || 0) - new Date(itemDate(type, b) || 0);
    if (activeSort === 'type') return String(a.record_type || '').localeCompare(String(b.record_type || ''), localeTag());
    return new Date(itemDate(type, b) || 0) - new Date(itemDate(type, a) || 0);
  });

  return result;
}

function typeLabel(value) {
  if (!value) return t('freeRecords.common.record');
  const key = `freeRecords.types.${value}`;
  const label = t(key);
  return label === key ? value : label;
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item) || t('freeRecords.common.other');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function topEntry(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || null;
}

function payloadFirst(payload, labels, fallback = '') {
  for (const label of labels) {
    const value = payload?.[label];
    if (Array.isArray(value)) return value[0]?.label || value[0] || fallback;
    if (value) return value;
  }
  return fallback;
}

const healthPrograms = [
  { type: 'chronic_followup', icon: 'clipboard', filter: 'chronic_followup' },
  { type: 'postop_followup', icon: 'shield', filter: 'postop_followup' },
  { type: 'diet_log', icon: 'heartPulse', filter: 'diet_log' },
  { type: 'poop_score', icon: 'activity', filter: 'poop_score' },
  { type: 'reproduction_followup', icon: 'calendar', filter: 'reproduction_followup' },
  { type: 'senior_followup', icon: 'heartPulse', filter: 'senior_followup' }
];

function recordStatus(item) {
  const payload = item.payload || {};
  if (item.record_type === 'poop_score') return payloadFirst(payload, [translateForLocale('tr', 'formLabels.score')], t('freeRecordList.no_score'));
  if (item.record_type === 'diet_log') return payloadFirst(payload, [translateForLocale('tr', 'formLabels.reaction')], t('freeRecordList.no_reaction'));
  if (item.record_type === 'chronic_followup') return payloadFirst(payload, [translateForLocale('tr', 'formLabels.today_status'), translateForLocale('tr', 'formLabels.template')], t('freeRecordList.no_status'));
  if (item.record_type === 'postop_followup') return payloadFirst(payload, [translateForLocale('tr', 'formLabels.wound_status'), translateForLocale('tr', 'formLabels.operation_day')], t('freeRecordList.no_status'));
  if (item.record_type === 'reproduction_followup') return payloadFirst(payload, [translateForLocale('tr', 'formLabels.followup_type'), translateForLocale('tr', 'formLabels.symptom')], t('freeRecordList.no_calendar'));
  if (item.record_type === 'senior_followup') return payloadFirst(payload, [translateForLocale('tr', 'formLabels.daily_status'), translateForLocale('tr', 'formLabels.focus')], t('freeRecordList.no_status'));
  if (item.record_type === 'toxin_foreign_body') return payloadFirst(payload, [translateForLocale('tr', 'formLabels.has_symptom'), translateForLocale('tr', 'formLabels.when_happened')], t('freeRecordList.emergency_record'));
  return item.summary || typeLabel(item.record_type);
}

function renderHealthProgramPanel(items = []) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const programCards = healthPrograms.map((program) => {
    const programItems = items
      .filter((item) => item.record_type === program.type)
      .sort((a, b) => new Date(itemDate('health', b) || 0) - new Date(itemDate('health', a) || 0));
    const last = programItems[0];
    const recentCount = programItems.filter((item) => new Date(itemDate('health', item) || 0).getTime() >= weekAgo).length;
    const href = `/history/health-records?filter=${program.filter}&sort=newest`;
    return `
      <button class="program-insight-card" data-program-route="${href}">
        <span class="program-insight-icon">${window.__icons?.[program.icon] || window.__icons?.clipboard}</span>
        <span>
          <small>${t(`freeRecords.list.programs.${program.type}.cadence`)}</small>
          <strong>${t(`freeRecords.list.programs.${program.type}.title`)}</strong>
          <em>${last ? `${recordStatus(last)} · ${formatShortDate(itemDate('health', last))}` : t('freeRecords.common.no_records_yet')}</em>
        </span>
        <b>${programItems.length}</b>
        <i style="--program-fill:${Math.min(100, Math.max(12, recentCount * 28))}%"></i>
      </button>
    `;
  }).join('');

  return `
    <div class="program-insight-panel">
      <div class="program-insight-head">
        <div>
          <span>${t('freeRecords.list.programs_title')}</span>
          <strong>${t('freeRecords.list.programs_summary')}</strong>
        </div>
        <small>${t('freeRecords.list.last_7_days')}</small>
      </div>
      <div class="program-insight-grid">${programCards}</div>
    </div>
  `;
}

function renderMiniBars(counts, labelFn = (value) => value) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const max = Math.max(...entries.map(([, count]) => count), 1);
  if (!entries.length) return `<p>${t('freeRecords.list.no_distribution')}</p>`;

  return entries.map(([label, count]) => `
    <div class="record-mini-bar">
      <span>${labelFn(label)}</span>
      <i><b style="width: ${Math.max(14, (count / max) * 100)}%;"></b></i>
      <strong>${count}</strong>
    </div>
  `).join('');
}

function renderSummary(type, records = null) {
  if (!records) {
    return `
      <div class="record-summary-panel">
        <div class="record-summary-grid">
          <div><span>${t('freeRecords.list.summary')}</span><strong>${t('common.loading')}</strong><small>${t('freeRecords.list.records_preparing')}</small></div>
          <div><span>${t('freeRecords.list.distribution')}</span><strong>-</strong><small>${t('freeRecords.list.waiting_data')}</small></div>
        </div>
      </div>
    `;
  }

  if (type === 'expenses') {
    const total = records.expenses.reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);
    const counts = countBy(records.expenses, (item) => item.category || t('freeRecords.common.other'));
    const top = topEntry(counts);
    return `
      <div class="record-summary-panel">
        <div class="record-summary-grid">
          <div><span>${t('freeRecords.list.total')}</span><strong>${formatMoney(total)}</strong><small>${t('freeRecords.list.expense_count').replace('{count}', records.expenses.length)}</small></div>
          <div><span>${t('freeRecords.list.top')}</span><strong>${top ? top[0] : '-'}</strong><small>${top ? t('freeRecords.list.record_count').replace('{count}', top[1]) : t('freeRecords.common.none_yet')}</small></div>
        </div>
        <div class="record-mini-bars">${renderMiniBars(counts)}</div>
      </div>
    `;
  }

  if (type === 'reminders') {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcoming = records.reminders.filter((item) => {
      const due = new Date(item.due_at || 0);
      return item.status === 'scheduled' && due >= now && due <= nextWeek;
    });
    const next = [...records.reminders].sort((a, b) => new Date(a.due_at || 0) - new Date(b.due_at || 0))[0];
    const counts = countBy(records.reminders, (item) => item.reminder_type || t('freeRecords.common.reminder'));
    return `
      <div class="record-summary-panel">
        <div class="record-summary-grid">
          <div><span>${t('freeRecords.list.seven_days')}</span><strong>${upcoming.length}</strong><small>${t('freeRecords.list.upcoming_task')}</small></div>
          <div><span>${t('freeRecords.list.next')}</span><strong>${next ? formatShortDate(next.due_at) : '-'}</strong><small>${next ? next.title : t('freeRecords.list.no_plan')}</small></div>
        </div>
        <div class="record-mini-bars">${renderMiniBars(counts)}</div>
      </div>
    `;
  }

  const counts = countBy(records.healthRecords, (item) => item.record_type || 'health');
  const top = topEntry(counts);
  const last = [...records.healthRecords].sort((a, b) => new Date(itemDate(type, b) || 0) - new Date(itemDate(type, a) || 0))[0];
  return `
    <div class="record-summary-panel">
      <div class="record-summary-grid">
        <div><span>${t('freeRecords.list.total')}</span><strong>${records.healthRecords.length}</strong><small>${t('freeRecords.list.health_count')}</small></div>
        <div><span>${t('freeRecords.list.last_record')}</span><strong>${last ? formatShortDate(itemDate(type, last)) : '-'}</strong><small>${last ? last.title : t('freeRecords.common.none_yet')}</small></div>
      </div>
      <div class="record-mini-bars">${renderMiniBars(counts, typeLabel)}</div>
    </div>
    ${renderHealthProgramPanel(records.healthRecords)}
  `;
}

function renderExpenseList(items) {
  return items.map((item) => `
    <button class="record-list-card" data-record-id="${item.id}">
      <div class="premium-icon-box">${window.__icons?.briefcase}</div>
      <div>
        <strong>${item.title || item.category || t('freeRecords.common.expense')}</strong>
        <p>${formatShortDate(item.spent_at)} · ${item.note || item.category || t('freeRecords.common.general_expense')}</p>
      </div>
      <span>${formatMoney(item.amount_cents, item.currency)}</span>
    </button>
  `).join('');
}

function renderReminderList(items) {
  return items.map((item) => `
    <button class="record-list-card" data-record-id="${item.id}">
      <div class="premium-icon-box">${window.__icons?.calendar}</div>
      <div>
        <strong>${item.title || item.reminder_type || t('freeRecords.common.reminder')}</strong>
        <p>${formatShortDate(item.due_at)} · ${item.repeat_rule || t('freeRecords.common.once')}${item.note ? ` · ${item.note}` : ''}</p>
      </div>
      <span>${item.status === 'scheduled' ? t('freeRecords.common.scheduled') : item.status === 'completed' ? t('freeRecords.common.completed') : item.status}</span>
    </button>
  `).join('');
}

function renderHealthList(items) {
  return items.map((item) => `
    <button class="record-list-card" data-record-id="${item.id}">
      <div class="premium-icon-box">${window.__icons?.heartPulse}</div>
      <div>
        <strong>${item.title || t('freeRecords.common.health_record')}</strong>
        <p>${formatShortDate(item.occurred_at || item.created_at)} · ${item.summary || item.record_type || t('freeRecords.common.form_record')}</p>
      </div>
      <span>${t('freeRecords.common.record')}</span>
    </button>
  `).join('');
}

function renderRecords(type, records = null, query = {}) {
  const config = configFor(type);
  if (!records) {
    return `<div class="free-record-panel"><p>${t('freeRecords.list.records_loading')}</p></div>`;
  }

  const allItems = getItems(type, records);
  const items = filterAndSortItems(type, allItems, query);
  if (!items.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${window.__icons?.[config.icon] || ''}</div>
        <div class="empty-state-title">${allItems.length ? t('freeRecords.list.empty_filter') : config.empty}</div>
        <div class="empty-state-desc">${allItems.length ? t('freeRecords.list.empty_filter_desc') : t('freeRecords.list.empty_desc')}</div>
      </div>
    `;
  }

  if (type === 'expenses') return renderExpenseList(items);
  if (type === 'reminders') return renderReminderList(items);
  return renderHealthList(items);
}

export function render(params = {}, query = {}) {
  const type = params.type || 'health';
  const config = configFor(type);
  const addAction = addActionFor(type, query.filter || 'all');
  const state = getState();
  const pet = getActivePet(state.activePetId);

  return `
    <div class="screen premium-check record-list-screen">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${config.title}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.[config.icon]}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero teal">
          <div class="premium-icon-box">${window.__icons?.[config.icon]}</div>
          <div>
            <div class="premium-screen-kicker">${config.eyebrow}</div>
            <h1>${config.title}</h1>
            <p>${t('freeRecords.list.pet_desc').replace('{name}', pet.name).replace('{desc}', config.desc)}</p>
          </div>
        </div>

        ${renderTabs(type)}
        ${renderListControls(type, query)}

        <div id="recordSummary">
          ${renderSummary(type)}
        </div>

        <div class="record-list-stack" id="recordList">
          ${renderRecords(type, null, query)}
        </div>

        <button class="btn btn-primary btn-full btn-lg mt-4" id="btnAddRecord" data-add-route="${addAction.route}">${addAction.label}</button>
      </div>
    </div>
  `;
}

export function afterRender(params = {}, query = {}) {
  const type = params.type || 'health';
  const config = configFor(type);
  const state = getState();
  const activeFilter = query.filter || 'all';
  const activeSort = query.sort || defaultSort(type);

  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnAddRecord')?.addEventListener('click', (event) => navigate(event.currentTarget.dataset.addRoute || config.addRoute));
  document.querySelectorAll('[data-record-tab]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.recordTab));
  });
  document.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(`${routeForType(type)}?filter=${btn.dataset.filter}&sort=${activeSort}`));
  });
  document.querySelectorAll('[data-sort]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(`${routeForType(type)}?filter=${activeFilter}&sort=${btn.dataset.sort}`));
  });

  const bindProgramRoutes = () => {
    document.querySelectorAll('[data-program-route]').forEach((btn) => {
      btn.addEventListener('click', () => navigate(btn.dataset.programRoute));
    });
  };

  getFreeRecords({ petId: state.activePetId, limit: 30 }).then((records) => {
    const summary = document.getElementById('recordSummary');
    const target = document.getElementById('recordList');
    if (summary) {
      summary.innerHTML = renderSummary(type, records);
      bindProgramRoutes();
    }
    if (target) {
      target.innerHTML = renderRecords(type, records, query);
      target.querySelectorAll('[data-record-id]').forEach((card) => {
        card.addEventListener('click', () => navigate(`/history/records/${type}/${card.dataset.recordId}`));
      });
    }
  }).catch(() => {});
}
