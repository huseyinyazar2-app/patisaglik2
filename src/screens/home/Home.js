import { navigate } from '../../router.js';
import { getState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { getActivePet } from '../../mock/pets.js';
import { getFreeRecords, mergeRecentRecords } from '../../services/freeRecords.js';

const petPhotos = {
  dog: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?ixlib=rb-4.0.3&auto=format&fit=crop&w=240&q=80',
  cat: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?ixlib=rb-4.0.3&auto=format&fit=crop&w=240&q=80'
};

const freeTools = [
  { id: 'photo', icon: 'camera', title: 'Foto Takip', desc: 'Yara ve deri karşılaştırma', route: '/feature/photo-followup' },
  { id: 'poop', icon: 'activity', title: 'Dışkı Skoru', desc: 'Günlük kalite skalası', route: '/feature/poop-score' },
  { id: 'diet', icon: 'heartPulse', title: 'Beslenme', desc: 'Mama geçiş günlüğü', route: '/feature/diet-log' },
  { id: 'expense', icon: 'briefcase', title: 'Masraf', desc: 'Mama, aşı, klinik', route: '/feature/expense' },
  { id: 'vaccine', icon: 'calendar', title: 'Aşı / İlaç', desc: 'Hatırlatıcı takvim', route: '/feature/reminders' },
  { id: 'vet', icon: 'stethoscope', title: 'Randevu', desc: 'Veteriner ziyareti', route: '/feature/reminders' },
  { id: 'toxic', icon: 'alert', title: 'Acil Kayıt', desc: 'Toksik madde / yabancı cisim', route: '/feature/toxic' }
];

const carePrograms = [
  { id: 'chronic', title: 'Kronik Takip', desc: 'Böbrek, diyabet ve uzun dönem izlem', badge: 'Ücretsiz', route: '/feature/chronic' },
  { id: 'postop', title: 'Operasyon Sonrası', desc: 'Yara, iştah, ağrı ve ilaç kontrolü', badge: 'Ücretsiz', route: '/feature/postop' },
  { id: 'repro', title: 'Kızgınlık / Gebelik', desc: 'Doğum süreci ve takvim notları', badge: 'Ücretsiz', route: '/feature/reproduction' },
  { id: 'senior', title: 'Yaşlı Pet Modu', desc: 'Su, kilo, ağrı ve hareket hassasiyeti', badge: 'Profilde', route: '/feature/senior' }
];

function healthStatus(pet) {
  if (pet.overallStatus === 'urgent') return { label: 'Acil kayıt var', cls: 'danger' };
  if (pet.overallStatus === 'watch') return { label: 'Takip gerekli', cls: 'warning' };
  return { label: 'İyi durumda', cls: 'success' };
}

function formatShortDate(date) {
  if (!date) return 'Kayıt yok';
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
  if (record.kind === 'expense') return record.title || record.category || 'Masraf kaydı';
  if (record.kind === 'reminder') return record.title || record.reminder_type || 'Hatırlatıcı';
  return record.title || record.record_type || 'Sağlık kaydı';
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
      title: 'Son kayıt',
      value: lastRecord ? formatShortDate(lastRecord.date) : formatShortDate(pet.lastCheckDate),
      desc: lastRecord ? getRecordTitle(lastRecord) : 'Sağlık geçmişinden'
    },
    {
      icon: 'briefcase',
      title: 'Masraf',
      value: expenseTotal ? formatMoney(expenseTotal) : '0 TL',
      desc: records?.expenses?.length ? `${records.expenses.length} kayıt işlendi` : 'Henüz masraf yok'
    },
    {
      icon: 'bell',
      title: 'Sıradaki iş',
      value: nextReminder ? formatShortDate(nextReminder.due_at) : 'Plan yok',
      desc: nextReminder ? nextReminder.title : 'Hatırlatıcı eklenmedi'
    },
    {
      icon: 'shield',
      title: 'Takip notu',
      value: healthCount ? `${healthCount} kayıt` : (profileNotes.length ? `${profileNotes.length} kayıt` : 'Temiz'),
      desc: healthCount ? 'Sağlık arşivinden' : (profileNotes.length ? 'Öyküde işaretli bilgi var' : 'Ek risk notu yok')
    }
  ];
}

function renderInsightCards(cards) {
  return cards.map(card => `
    <button class="home-insight-card" data-insight="${card.title}">
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
        <div class="details"><strong>Plan yok</strong><span>Yeni hatırlatıcı ekle</span></div>
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
          <div class="text-xs text-secondary mt-1">Sonraki kontrol: ${formatShortDate(f.nextCheck)}</div>
          <div class="text-xs text-tertiary mt-1">${f.medSchedule || 'Tedavi sonrası günlük check-in açık.'}</div>
        </div>
        <div class="chip-status completed">${f.lastRiskLevel === 'critical' ? 'Acil' : f.lastRiskLevel === 'high' ? 'Bugün' : 'Aktif'}</div>
      </div>
    `).join('');
  }

  if (healthRecords.length > 0) {
    return healthRecords.slice(0, 4).map(record => `
      <div class="premium-followup">
        <div class="premium-icon-box">${window.__icons?.heartPulse}</div>
        <div style="flex: 1; min-width: 0;">
          <div class="font-bold text-sm">${record.title || 'Sağlık kaydı'}</div>
          <div class="text-xs text-secondary mt-1">${formatShortDate(record.occurred_at || record.created_at)}</div>
          <div class="text-xs text-tertiary mt-1">${record.summary || 'Form kaydı sağlık arşivine işlendi.'}</div>
        </div>
        <div class="chip-status completed">Kayıt</div>
      </div>
    `).join('');
  }

  return `
    <div class="premium-followup">
      <div class="premium-icon-box">${window.__icons?.shield}</div>
      <div>
        <div class="font-bold text-sm">Aktif takip yok</div>
        <div class="text-xs text-secondary mt-1">Yeni bir kontrol başlatarak takip dosyası oluşturabilirsiniz.</div>
      </div>
    </div>
  `;
}

export function render() {
  const state = getState();
  const pet = getActivePet(state.activePetId);
  const petPhoto = petPhotos[pet.type] || petPhotos.dog;
  const status = healthStatus(pet);
  const activeFollowups = (state.followups || []).filter(f => f.status === 'active' && f.petId === state.activePetId);
  const insightCards = getInsightCards(pet, activeFollowups);

  return `
    <div class="screen premium-home">
      <div class="premium-home-header">
        <button class="header-icon" id="btnMenu">${window.__icons?.check}</button>
        <button class="pet-switcher-btn" id="btnPetSelectHeader">
          <img src="${petPhoto}" class="pet-switcher-avatar" alt="${pet.name}" />
          <span>${pet.name}</span>
          ${window.__icons?.chevronRight}
        </button>
        <button class="header-icon" id="btnProfile">${window.__icons?.profile}</button>
      </div>

      <div class="section pt-0">
        <div class="home-hero-panel">
          <div class="home-hero-top">
            <img class="home-hero-photo" src="${petPhoto}" alt="${pet.name}" />
            <div>
              <div class="premium-screen-kicker">Ücretsiz Sağlık Alanı</div>
              <h1>${pet.name}</h1>
              <p>${t(`pets.${pet.type}`)} · ${pet.breed} · ${pet.age || '4 yaş'} · ${pet.weight} kg</p>
              <span class="premium-status ${status.cls}">${status.label} ${window.__icons?.checkCircle}</span>
            </div>
          </div>
          <div class="home-hero-actions">
            <button class="btn btn-primary btn-full" id="btnStartCheck">${window.__icons?.spark} AI Kontrol Başlat</button>
            <button class="btn btn-secondary btn-full" id="btnTimeline">${window.__icons?.clipboard} Geçmiş</button>
          </div>
        </div>
      </div>

      <div class="section pt-0">
        <div class="section-header">
          <h3 class="section-title">Yaklaşanlar</h3>
          <span class="text-xs font-bold text-primary-color">Ücretsiz</span>
        </div>
        <div class="upcoming-reminders-scroll" id="homeUpcoming">
          ${renderUpcomingReminders()}
        </div>
      </div>

      <div class="section pt-0">
        <div class="section-header">
          <h3 class="section-title">Kayıt Özeti</h3>
          <span class="text-xs text-tertiary">Son kayıtlar</span>
        </div>
        <div class="home-insight-grid" id="homeInsightGrid">
          ${renderInsightCards(insightCards)}
        </div>
      </div>

      <div class="section pt-0">
        <div class="section-header">
          <h3 class="section-title">Ücretsiz Takip Araçları</h3>
          <span class="text-xs text-tertiary">Kredi harcamaz</span>
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
          <h3 class="section-title">Takip Programları</h3>
          <span class="text-xs text-tertiary">Şablonlar</span>
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
          <h3 class="section-title">Aktif Takipler</h3>
          <span class="text-xs font-bold text-primary-color" id="homeRecentCount">${activeFollowups.length} dosya</span>
        </div>
        <div class="premium-followup-stack" id="homeRecentRecords">
          ${renderFollowups(activeFollowups)}
          <button class="premium-list-button" id="btnReports">
            Tüm takiplerimi gör
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
  document.getElementById('btnStartCheck')?.addEventListener('click', () => navigate('/check'));
  document.getElementById('btnTimeline')?.addEventListener('click', () => navigate('/history'));
  document.getElementById('btnReports')?.addEventListener('click', () => navigate('/reports'));
  document.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.route));
  });
  document.querySelectorAll('.btn-followup').forEach(btn => {
    btn.addEventListener('click', e => navigate(`/followups/${e.currentTarget.dataset.id}`));
  });

  getFreeRecords({ petId: state.activePetId }).then((records) => {
    const pet = getActivePet(state.activePetId);
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
          Tüm takiplerimi gör
          <span>${window.__icons?.chevronRight}</span>
        </button>
      `;
      document.getElementById('btnReportsLive')?.addEventListener('click', () => navigate('/reports'));
      recent.querySelectorAll('.btn-followup').forEach(btn => {
        btn.addEventListener('click', e => navigate(`/followups/${e.currentTarget.dataset.id}`));
      });
    }
    if (count) count.textContent = activeFollowups.length ? `${activeFollowups.length} dosya` : `${records.healthRecords.length} kayıt`;
  }).catch(() => {});
}
