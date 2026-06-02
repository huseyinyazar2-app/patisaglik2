import { navigate } from '../../router.js';
import { getState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { getActivePet as getMockActivePet } from '../../mock/pets.js';
import { getLocalPets } from '../../services/pets.js';
import { getFreeRecords, mergeRecentRecords } from '../../services/freeRecords.js';

const petIllustrations = {
  cat: '🐈',
  dog: '🐕',
  bird: '🦜',
  fish: '🐠',
  reptile: '🦎',
  small_mammal: '🐇',
  exotic: '🐾'
};

function tx(key, vars = {}) {
  return String(t(key)).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

function getHomePet(activePetId) {
  return getLocalPets().find((pet) => pet.id === activePetId) || getMockActivePet(activePetId);
}

function renderPetVisual(pet, className = 'home-hero-photo') {
  if (pet.photo) {
    return `<img class="${className}" src="${pet.photo}" alt="${pet.name}" />`;
  }
  if (className === 'pet-switcher-avatar') {
    return `<span class="${className} pet-illustration-avatar"><span>${petIllustrations[pet.type] || petIllustrations.exotic}</span></span>`;
  }
  return `
    <button class="${className} pet-illustration-avatar" id="btnPetImage" type="button" aria-label="${t('pets.photo_add')}">
      <span>${petIllustrations[pet.type] || petIllustrations.exotic}</span>
      ${className === 'home-hero-photo' ? `<small>${t('pets.photo_add')}</small>` : ''}
    </button>
  `;
}

function healthStatus(pet) {
  if (pet.overallStatus === 'urgent') return { label: t('home.status_urgent'), cls: 'danger' };
  if (pet.overallStatus === 'watch') return { label: t('home.status_watch'), cls: 'warning' };
  return { label: t('home.status_ok'), cls: 'success' };
}

function formatShortDate(date) {
  if (!date) return t('home.no_record');
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date(date));
}

function formatMoney(amountCents, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format((amountCents || 0) / 100);
}

function getRecordTitle(record) {
  if (!record) return '';
  if (record.kind === 'expense') return record.title || record.category || t('home.expense_record');
  if (record.kind === 'reminder') return record.title || record.reminder_type || t('home.reminder_record');
  return record.title || record.record_type || t('home.health_record');
}

function getInsightCards(pet, activeFollowups, records = null) {
  const profileNotes = [
    ...(pet.chronicDiseases || []),
    ...(pet.allergies || []),
    ...(pet.extractedTags || [])
  ];
  const recent = records ? mergeRecentRecords(records) : [];
  const lastRecord = recent[0];
  const expenseTotal = records?.expenses?.reduce((sum, item) => sum + Number(item.amount_cents || 0), 0) || 0;
  const nextReminder = records?.reminders?.[0];
  const healthCount = records?.healthRecords?.length || activeFollowups.length;

  return [
    {
      icon: 'clipboard',
      route: lastRecord?.kind === 'expense' ? '/history/expenses' : lastRecord?.kind === 'reminder' ? '/history/reminders' : '/history/health-records',
      title: t('home.insights.last_record'),
      value: lastRecord ? formatShortDate(lastRecord.date) : formatShortDate(pet.lastCheckDate),
      desc: lastRecord ? getRecordTitle(lastRecord) : t('home.history_source')
    },
    {
      icon: 'briefcase',
      route: '/history/expenses',
      title: t('home.insights.expense'),
      value: expenseTotal ? formatMoney(expenseTotal) : '0 TL',
      desc: records?.expenses?.length ? tx('home.processed_record_count', { count: records.expenses.length }) : t('home.no_expense')
    },
    {
      icon: 'bell',
      route: '/history/reminders',
      title: t('home.insights.next_task'),
      value: nextReminder ? formatShortDate(nextReminder.due_at) : t('home.no_plan'),
      desc: nextReminder ? nextReminder.title : t('home.no_reminder')
    },
    {
      icon: 'shield',
      route: '/history/health-records',
      title: t('home.insights.followup_note'),
      value: healthCount ? tx('home.record_count', { count: healthCount }) : (profileNotes.length ? tx('home.record_count', { count: profileNotes.length }) : t('home.clean')),
      desc: healthCount ? t('home.health_archive_source') : (profileNotes.length ? t('home.profile_note_flagged') : t('home.no_risk_note'))
    }
  ];
}

function renderInsightCards(cards) {
  return cards.map(card => `
    <button class="home-insight-card" data-route="${card.route}" data-insight="${card.title}">
      <div class="premium-icon-box">${window.__icons?.[card.icon]}</div>
      <div>
        <span>${card.title}</span>
        <strong>${card.value}</strong>
        <small>${card.desc}</small>
      </div>
    </button>
  `).join('');
}

function renderUpcomingReminders(reminders = []) {
  if (!reminders.length) {
    return `
      <div class="upcoming-card">
        <div class="icon">${window.__icons?.calendar}</div>
        <div class="details"><strong>${t('home.no_plan')}</strong><span>${t('home.add_reminder')}</span></div>
      </div>
    `;
  }

  return reminders.slice(0, 4).map((item, index) => `
    <div class="upcoming-card ${index === 0 ? 'urgent' : ''}">
      <div class="icon">${window.__icons?.calendar}</div>
      <div class="details"><strong>${formatShortDate(item.due_at)}</strong><span>${item.title}</span></div>
    </div>
  `).join('');
}

function renderFollowups(activeFollowups, healthRecords = []) {
  if (activeFollowups.length > 0) {
    return activeFollowups.map(f => `
      <div class="premium-followup btn-followup" data-id="${f.id}">
        <div class="premium-icon-box">${window.__icons?.calendar}</div>
        <div style="flex: 1; min-width: 0;">
          <div class="font-bold text-sm">${f.title}</div>
          <div class="text-xs text-secondary mt-1">${tx('home.next_check', { date: formatShortDate(f.nextCheck) })}</div>
          <div class="text-xs text-tertiary mt-1">${f.medSchedule || t('home.postop_checkin_open')}</div>
        </div>
        <div class="chip-status completed">${f.lastRiskLevel === 'critical' ? t('home.status_critical') : f.lastRiskLevel === 'high' ? t('home.status_today') : t('home.status_active')}</div>
      </div>
    `).join('');
  }

  if (healthRecords.length > 0) {
    return healthRecords.slice(0, 4).map(record => `
      <div class="premium-followup">
        <div class="premium-icon-box">${window.__icons?.heartPulse}</div>
        <div style="flex: 1; min-width: 0;">
          <div class="font-bold text-sm">${record.title || t('home.health_record')}</div>
          <div class="text-xs text-secondary mt-1">${formatShortDate(record.occurred_at || record.created_at)}</div>
          <div class="text-xs text-tertiary mt-1">${record.summary || t('home.form_record_saved')}</div>
        </div>
        <div class="chip-status completed">${t('home.status_record')}</div>
      </div>
    `).join('');
  }

  return `
    <div class="premium-followup">
      <div class="premium-icon-box">${window.__icons?.shield}</div>
      <div>
        <div class="font-bold text-sm">${t('home.no_active_followup')}</div>
        <div class="text-xs text-secondary mt-1">${t('home.no_active_followup_desc')}</div>
      </div>
    </div>
  `;
}

export function render() {
  const state = getState();
  const pet = getHomePet(state.activePetId);
  const status = healthStatus(pet);
  const activeFollowups = (state.followups || []).filter(f => f.status === 'active' && f.petId === state.activePetId);
  const insightCards = getInsightCards(pet, activeFollowups);
  const freeTools = t('home.free_tools');
  const carePrograms = t('home.care_program_items');

  return `
    <div class="screen premium-home">
      <div class="premium-home-header">
        <button class="header-icon" id="btnMenu">${window.__icons?.check}</button>
        <button class="pet-switcher-btn" id="btnPetSelectHeader">
          ${renderPetVisual(pet, 'pet-switcher-avatar')}
          <span>${pet.name}</span>
          ${window.__icons?.chevronRight}
        </button>
        <button class="header-icon" id="btnProfile">${window.__icons?.profile}</button>
      </div>

      <div class="section pt-0">
        <div class="home-hero-panel">
          <div class="home-hero-top">
            ${renderPetVisual(pet)}
            <div>
              <div class="premium-screen-kicker">${t('home.free_area')}</div>
              <h1>${pet.name}</h1>
              <p>${t(`pets.${pet.type}`)} · ${pet.breed} · ${pet.age || tx('home.age_years', { age: 4 })} · ${pet.weight} kg</p>
              <span class="premium-status ${status.cls}">${status.label} ${window.__icons?.checkCircle}</span>
            </div>
          </div>
          <div class="home-hero-actions">
            <button class="btn btn-primary btn-full" id="btnStartCheck">${window.__icons?.spark} ${t('home.start_ai_check')}</button>
            <button class="btn btn-secondary btn-full" id="btnTimeline">${window.__icons?.clipboard} ${t('tabs.history')}</button>
          </div>
        </div>
      </div>

      <div class="section pt-0">
        <div class="section-header">
          <h3 class="section-title">${t('home.upcoming')}</h3>
          <span class="text-xs font-bold text-primary-color">${t('home.free')}</span>
        </div>
        <div class="upcoming-reminders-scroll" id="homeUpcoming">
          ${renderUpcomingReminders()}
        </div>
      </div>

      <div class="section pt-0">
        <div class="section-header">
          <h3 class="section-title">${t('home.record_summary')}</h3>
          <span class="text-xs text-tertiary">${t('home.recent_records')}</span>
        </div>
        <div class="home-insight-grid" id="homeInsightGrid">
          ${renderInsightCards(insightCards)}
        </div>
      </div>

      <div class="section pt-0">
        <div class="section-header">
          <h3 class="section-title">${t('home.free_tools_title')}</h3>
          <span class="text-xs text-tertiary">${t('home.no_credit')}</span>
        </div>
        <div class="premium-action-grid home-tool-grid">
          ${freeTools.map(tool => `
            <button data-route="${tool.route}" data-tool="${tool.id}">
              ${window.__icons?.[tool.icon]}
              <span>${tool.title}</span>
              <small>${tool.desc}</small>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="section pt-0">
        <div class="section-header">
          <h3 class="section-title">${t('home.care_programs')}</h3>
          <span class="text-xs text-tertiary">${t('home.templates')}</span>
        </div>
        <div class="care-program-grid">
          ${carePrograms.map(program => `
            <button class="care-program-card" data-program="${program.id}" data-route="${program.route}">
              <div>
                <strong>${program.title}</strong>
                <p>${program.desc}</p>
              </div>
              <span>${program.badge}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="section pt-0">
        <div class="flex items-center justify-between mb-3">
          <h3 class="section-title">${t('home.active_followups')}</h3>
          <span class="text-xs font-bold text-primary-color" id="homeRecentCount">${tx('home.file_count', { count: activeFollowups.length })}</span>
        </div>
        <div class="premium-followup-stack" id="homeRecentRecords">
          ${renderFollowups(activeFollowups)}
          <button class="premium-list-button" id="btnReports">
            ${t('home.view_all_followups')}
            <span>${window.__icons?.chevronRight}</span>
          </button>
        </div>
      </div>

      <div style="height: 86px;"></div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  document.getElementById('btnProfile')?.addEventListener('click', () => navigate('/profile'));
  document.getElementById('btnPetSelectHeader')?.addEventListener('click', () => navigate('/pets/select'));
  document.getElementById('btnPetImage')?.addEventListener('click', () => navigate('/profile/passport'));
  document.getElementById('btnStartCheck')?.addEventListener('click', () => navigate('/check'));
  document.getElementById('btnTimeline')?.addEventListener('click', () => navigate('/history'));
  document.getElementById('btnReports')?.addEventListener('click', () => navigate('/reports'));
  function bindRouteButtons(root = document) {
    root.querySelectorAll('[data-route]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.route));
    });
  }
  bindRouteButtons();
  document.querySelectorAll('.btn-followup').forEach(btn => {
    btn.addEventListener('click', e => navigate(`/followups/${e.currentTarget.dataset.id}`));
  });

  getFreeRecords({ petId: state.activePetId }).then((records) => {
    const pet = getHomePet(state.activePetId);
    const activeFollowups = (state.followups || []).filter(f => f.status === 'active' && f.petId === state.activePetId);
    const upcoming = document.getElementById('homeUpcoming');
    const insight = document.getElementById('homeInsightGrid');
    const recent = document.getElementById('homeRecentRecords');
    const count = document.getElementById('homeRecentCount');

    if (upcoming) upcoming.innerHTML = renderUpcomingReminders(records.reminders);
    if (insight) insight.innerHTML = renderInsightCards(getInsightCards(pet, activeFollowups, records));
    if (recent) {
      recent.innerHTML = `
        ${renderFollowups(activeFollowups, records.healthRecords)}
        <button class="premium-list-button" id="btnReportsLive">
          ${t('home.view_all_followups')}
          <span>${window.__icons?.chevronRight}</span>
        </button>
      `;
      document.getElementById('btnReportsLive')?.addEventListener('click', () => navigate('/reports'));
      recent.querySelectorAll('.btn-followup').forEach(btn => {
        btn.addEventListener('click', e => navigate(`/followups/${e.currentTarget.dataset.id}`));
      });
    }
    if (insight) bindRouteButtons(insight);
    if (count) count.textContent = activeFollowups.length ? tx('home.file_count', { count: activeFollowups.length }) : tx('home.record_count', { count: records.healthRecords.length });
  }).catch(() => {});
}
