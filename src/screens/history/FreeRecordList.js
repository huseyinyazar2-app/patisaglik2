import { navigate, goBack } from '../../router.js';
import { getState } from '../../store.js';
import { getActivePet } from '../../mock/pets.js';
import { getFreeRecords } from '../../services/freeRecords.js';

const configs = {
  expenses: {
    title: 'Masraf Takibi',
    eyebrow: 'Ücretsiz kayıtlar',
    desc: 'Mama, veteriner, aşı, ilaç ve bakım harcamaları',
    icon: 'briefcase',
    addRoute: '/feature/expense',
    empty: 'Henüz masraf kaydı yok.',
    button: 'Masraf Ekle'
  },
  reminders: {
    title: 'Aşı / İlaç / Randevu',
    eyebrow: 'Takvim',
    desc: 'Planlanan sağlık işleri ve tekrar eden hatırlatıcılar',
    icon: 'calendar',
    addRoute: '/feature/reminders',
    empty: 'Henüz hatırlatıcı yok.',
    button: 'Hatırlatıcı Ekle'
  },
  health: {
    title: 'Sağlık Dosyaları',
    eyebrow: 'Takip arşivi',
    desc: 'Dışkı skoru, foto takip, beslenme ve takip şablonları',
    icon: 'heartPulse',
    addRoute: '/feature/photo-followup',
    empty: 'Henüz sağlık kaydı yok.',
    button: 'Takip Kaydı Ekle'
  }
};

function formatShortDate(date) {
  if (!date) return 'Tarih yok';
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
}

function formatMoney(amountCents, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format((amountCents || 0) / 100);
}

function renderTabs(activeType) {
  return `
    <div class="free-record-tabs">
      <button class="${activeType === 'expenses' ? 'active' : ''}" data-record-tab="/history/expenses">Masraf</button>
      <button class="${activeType === 'reminders' ? 'active' : ''}" data-record-tab="/history/reminders">Takvim</button>
      <button class="${activeType === 'health' ? 'active' : ''}" data-record-tab="/history/health-records">Sağlık</button>
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
  return String(value || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, '');
}

function filterOptions(type) {
  if (type === 'expenses') {
    return [
      ['all', 'Hepsi'],
      ['veteriner', 'Veteriner'],
      ['mama', 'Mama'],
      ['aşı', 'Aşı'],
      ['ilaç', 'İlaç'],
      ['bakım', 'Bakım']
    ];
  }

  if (type === 'reminders') {
    return [
      ['all', 'Hepsi'],
      ['scheduled', 'Planlı'],
      ['aşı', 'Aşı'],
      ['ilaç', 'İlaç'],
      ['randevu', 'Randevu']
    ];
  }

  return [
    ['all', 'Hepsi'],
    ['poop_score', 'Dışkı'],
    ['photo_followup', 'Foto'],
    ['diet_log', 'Beslenme'],
    ['issue', 'Sorun'],
    ['chronic_followup', 'Kronik'],
    ['postop_followup', 'Operasyon'],
    ['reproduction_followup', 'Üreme'],
    ['senior_followup', 'Yaşlı'],
    ['toxin_foreign_body', 'Acil']
  ];
}

function sortOptions(type) {
  if (type === 'expenses') {
    return [
      ['newest', 'Yeni'],
      ['amount_desc', 'Tutar ↓'],
      ['amount_asc', 'Tutar ↑']
    ];
  }

  if (type === 'reminders') {
    return [
      ['due_asc', 'Yakın'],
      ['due_desc', 'Uzak'],
      ['newest', 'Yeni']
    ];
  }

  return [
    ['newest', 'Yeni'],
    ['oldest', 'Eski'],
    ['type', 'Türe göre']
  ];
}

const healthAddActions = {
  poop_score: { route: '/feature/poop-score', label: 'Dışkı Kaydı Ekle' },
  photo_followup: { route: '/feature/photo-followup', label: 'Foto Takip Ekle' },
  diet_log: { route: '/feature/diet-log', label: 'Beslenme Kaydı Ekle' },
  issue: { route: '/history/issues/new', label: 'Sorun Kaydı Ekle' },
  chronic_followup: { route: '/feature/chronic', label: 'Kronik Takip Ekle' },
  postop_followup: { route: '/feature/postop', label: 'Operasyon Takibi Ekle' },
  reproduction_followup: { route: '/feature/reproduction', label: 'Üreme Takibi Ekle' },
  senior_followup: { route: '/feature/senior', label: 'Yaşlı Pet Kaydı Ekle' },
  toxin_foreign_body: { route: '/feature/toxic', label: 'Acil Kayıt Ekle' }
};

function addActionFor(type, filter = 'all') {
  if (type !== 'health') return { route: configs[type]?.addRoute || configs.health.addRoute, label: configs[type]?.button || configs.health.button };
  return healthAddActions[filter] || { route: configs.health.addRoute, label: configs.health.button };
}

function renderListControls(type, query = {}) {
  const activeFilter = query.filter || 'all';
  const activeSort = query.sort || defaultSort(type);

  return `
    <div class="record-filter-panel">
      <div>
        <span>Filtre</span>
        <div class="record-filter-row">
          ${filterOptions(type).map(([value, label]) => `
            <button class="${activeFilter === value ? 'active' : ''}" data-filter="${value}">${label}</button>
          `).join('')}
        </div>
      </div>
      <div>
        <span>Sıralama</span>
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
    if (activeSort === 'type') return String(a.record_type || '').localeCompare(String(b.record_type || ''), 'tr');
    return new Date(itemDate(type, b) || 0) - new Date(itemDate(type, a) || 0);
  });

  return result;
}

function typeLabel(value) {
  const labels = {
    poop_score: 'Dışkı',
    photo_followup: 'Foto',
    diet_log: 'Beslenme',
    issue: 'Sorun',
    chronic_followup: 'Kronik',
    postop_followup: 'Operasyon',
    reproduction_followup: 'Üreme',
    senior_followup: 'Yaşlı',
    toxin_foreign_body: 'Acil'
  };
  return labels[value] || value || 'Kayıt';
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item) || 'Diğer';
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
  { type: 'chronic_followup', title: 'Kronik takip', icon: 'clipboard', cadence: 'Haftalık durum', filter: 'chronic_followup' },
  { type: 'postop_followup', title: 'Operasyon sonrası', icon: 'shield', cadence: 'Yara ve ilaç kontrolü', filter: 'postop_followup' },
  { type: 'diet_log', title: 'Beslenme geçişi', icon: 'heartPulse', cadence: 'Reaksiyon takibi', filter: 'diet_log' },
  { type: 'poop_score', title: 'Dışkı skoru', icon: 'activity', cadence: 'Günlük kalite', filter: 'poop_score' },
  { type: 'reproduction_followup', title: 'Üreme takibi', icon: 'calendar', cadence: 'Takvim ve belirti', filter: 'reproduction_followup' },
  { type: 'senior_followup', title: 'Senior izlem', icon: 'heartPulse', cadence: 'Hassasiyet takibi', filter: 'senior_followup' }
];

function recordStatus(item) {
  const payload = item.payload || {};
  if (item.record_type === 'poop_score') return payloadFirst(payload, ['Skor'], 'Skor yok');
  if (item.record_type === 'diet_log') return payloadFirst(payload, ['Reaksiyon'], 'Reaksiyon yok');
  if (item.record_type === 'chronic_followup') return payloadFirst(payload, ['Bugünkü durum', 'Şablon'], 'Durum yok');
  if (item.record_type === 'postop_followup') return payloadFirst(payload, ['Yara durumu', 'Operasyon günü'], 'Durum yok');
  if (item.record_type === 'reproduction_followup') return payloadFirst(payload, ['Takip türü', 'Belirti'], 'Takvim yok');
  if (item.record_type === 'senior_followup') return payloadFirst(payload, ['Günlük durum', 'Odak'], 'Durum yok');
  if (item.record_type === 'toxin_foreign_body') return payloadFirst(payload, ['Belirti var mı?', 'Ne zaman oldu?'], 'Acil kayıt');
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
          <small>${program.cadence}</small>
          <strong>${program.title}</strong>
          <em>${last ? `${recordStatus(last)} · ${formatShortDate(itemDate('health', last))}` : 'Henüz kayıt yok'}</em>
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
          <span>Takip programları</span>
          <strong>Şablon durum özeti</strong>
        </div>
        <small>Son 7 gün yoğunluğu</small>
      </div>
      <div class="program-insight-grid">${programCards}</div>
    </div>
  `;
}

function renderMiniBars(counts, labelFn = (value) => value) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const max = Math.max(...entries.map(([, count]) => count), 1);
  if (!entries.length) return '<p>Henüz dağılım yok.</p>';

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
          <div><span>Özet</span><strong>Yükleniyor</strong><small>Kayıtlar hazırlanıyor</small></div>
          <div><span>Dağılım</span><strong>-</strong><small>Veri bekleniyor</small></div>
        </div>
      </div>
    `;
  }

  if (type === 'expenses') {
    const total = records.expenses.reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);
    const counts = countBy(records.expenses, (item) => item.category || 'Diğer');
    const top = topEntry(counts);
    return `
      <div class="record-summary-panel">
        <div class="record-summary-grid">
          <div><span>Toplam</span><strong>${formatMoney(total)}</strong><small>${records.expenses.length} masraf kaydı</small></div>
          <div><span>En yoğun</span><strong>${top ? top[0] : '-'}</strong><small>${top ? `${top[1]} kayıt` : 'Henüz yok'}</small></div>
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
    const counts = countBy(records.reminders, (item) => item.reminder_type || 'Hatırlatıcı');
    return `
      <div class="record-summary-panel">
        <div class="record-summary-grid">
          <div><span>7 gün</span><strong>${upcoming.length}</strong><small>yaklaşan iş</small></div>
          <div><span>Sıradaki</span><strong>${next ? formatShortDate(next.due_at) : '-'}</strong><small>${next ? next.title : 'Plan yok'}</small></div>
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
        <div><span>Toplam</span><strong>${records.healthRecords.length}</strong><small>sağlık kaydı</small></div>
        <div><span>Son kayıt</span><strong>${last ? formatShortDate(itemDate(type, last)) : '-'}</strong><small>${last ? last.title : 'Henüz yok'}</small></div>
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
        <strong>${item.title || item.category || 'Masraf'}</strong>
        <p>${formatShortDate(item.spent_at)} · ${item.note || item.category || 'Genel masraf'}</p>
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
        <strong>${item.title || item.reminder_type || 'Hatırlatıcı'}</strong>
        <p>${formatShortDate(item.due_at)} · ${item.repeat_rule || 'Tek sefer'}${item.note ? ` · ${item.note}` : ''}</p>
      </div>
      <span>${item.status === 'scheduled' ? 'Planlı' : item.status === 'completed' ? 'Tamamlandı' : item.status}</span>
    </button>
  `).join('');
}

function renderHealthList(items) {
  return items.map((item) => `
    <button class="record-list-card" data-record-id="${item.id}">
      <div class="premium-icon-box">${window.__icons?.heartPulse}</div>
      <div>
        <strong>${item.title || 'Sağlık kaydı'}</strong>
        <p>${formatShortDate(item.occurred_at || item.created_at)} · ${item.summary || item.record_type || 'Form kaydı'}</p>
      </div>
      <span>Kayıt</span>
    </button>
  `).join('');
}

function renderRecords(type, records = null, query = {}) {
  const config = configs[type] || configs.health;
  if (!records) {
    return '<div class="free-record-panel"><p>Kayıtlar getiriliyor...</p></div>';
  }

  const allItems = getItems(type, records);
  const items = filterAndSortItems(type, allItems, query);
  if (!items.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${window.__icons?.[config.icon] || ''}</div>
        <div class="empty-state-title">${allItems.length ? 'Bu filtrede kayıt yok.' : config.empty}</div>
        <div class="empty-state-desc">${allItems.length ? 'Farklı bir filtre seçerek tekrar deneyebilirsin.' : 'Yeni kayıt eklediğinde burada listelenecek.'}</div>
      </div>
    `;
  }

  if (type === 'expenses') return renderExpenseList(items);
  if (type === 'reminders') return renderReminderList(items);
  return renderHealthList(items);
}

export function render(params = {}, query = {}) {
  const type = params.type || 'health';
  const config = configs[type] || configs.health;
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
            <p>${pet.name} için ${config.desc}</p>
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
  const config = configs[type] || configs.health;
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
