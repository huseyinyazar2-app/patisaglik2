// Pati Sağlık — History Main Screen
import { navigate, goBack } from '../../router.js';
import { getState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { getActivePet } from '../../mock/pets.js';
import { getFreeRecords, mergeRecentRecords } from '../../services/freeRecords.js';

const menuItems = [
  { id: 'timeline', icon: 'clock', title: 'Tüm Zaman Akışı', desc: 'Kontroller, notlar ve medya kayıtları', path: '/history/timeline', tier: 'Ücretsiz' },
  { id: 'measurements', icon: 'measurement', title: 'Ölçümler', desc: 'Kilo, ateş, solunum ve temel değerler', path: '/history/measurements', tier: 'Ücretsiz' },
  { id: 'issues', icon: 'search', title: 'Sağlık Dosyaları', desc: 'Şikayetler, deri-yara takipleri ve foto karşılaştırma', path: '/history/health-records', tier: 'Ücretsiz' },
  { id: 'expense', icon: 'briefcase', title: 'Masraf Takibi', desc: 'Mama, veteriner, aşı ve ilaç harcamaları', path: '/history/expenses', tier: 'Ücretsiz' },
  { id: 'reminders', icon: 'calendar', title: 'Aşı / İlaç / Randevu Takvimi', desc: 'Düzenli ilaç, aşı ve klinik ziyaret hatırlatmaları', path: '/history/reminders', tier: 'Ücretsiz' },
  { id: 'templates', icon: 'clipboard', title: 'Takip Şablonları', desc: 'Kronik hastalık, operasyon sonrası, gebelik ve doğum', path: '/history/health-records?filter=chronic_followup&sort=newest', tier: 'Ücretsiz' },
  { id: 'senior', icon: 'shield', title: 'Yaşlı Pet İzlemi', desc: 'Su, kilo, ağrı ve hareket hassasiyetleri', path: '/history/health-records?filter=senior_followup&sort=newest', tier: 'Ücretsiz' }
];

function formatShortDate(date) {
  if (!date) return 'Tarih yok';
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date(date));
}

function formatMoney(amountCents, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
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
          <span>Yükleniyor</span><span>Masraf</span><span>Takvim</span>
        </div>
        <p>Ücretsiz kayıtlar getiriliyor...</p>
      </div>
    `;
  }

  const recent = mergeRecentRecords(records).slice(0, 4);
  const expenseTotal = records.expenses.reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);

  return `
    <div class="free-record-panel">
      <div class="free-record-metrics">
        <span><b>${records.healthRecords.length}</b> sağlık</span>
        <span><b>${formatMoney(expenseTotal)}</b> masraf</span>
        <span><b>${records.reminders.length}</b> takvim</span>
      </div>
      <div class="free-record-list">
        ${recent.length ? recent.map(item => `
          <div class="free-record-row">
            <div class="premium-icon-box">${window.__icons?.[item.kind === 'expense' ? 'briefcase' : item.kind === 'reminder' ? 'calendar' : 'heartPulse']}</div>
            <div>
              <strong>${item.title || item.category || item.record_type || 'Kayıt'}</strong>
              <p>${formatShortDate(item.date)} · ${item.kind === 'expense' ? formatMoney(item.amount_cents, item.currency) : item.summary || item.note || 'Form kaydı'}</p>
            </div>
          </div>
        `).join('') : '<p>Henüz ücretsiz kayıt yok.</p>'}
      </div>
    </div>
  `;
}

export function render() {
  const state = getState();
  const pet = getActivePet(state.activePetId);

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
            <div class="premium-screen-kicker">Ücretsiz Sağlık Arşivi</div>
            <h2>${pet.name}</h2>
            <p>${pet.breed} · ${pet.age} · ${pet.statusText}</p>
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
                <strong>${item.title}</strong>
                <p>${item.desc}</p>
              </div>
              <span>${item.tier}</span>
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
