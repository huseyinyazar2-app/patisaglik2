import { goBack, navigate } from '../../router.js';
import { getState } from '../../store.js';
import { getActivePet } from '../../mock/pets.js';
import { getFreeRecords, mergeRecentRecords } from '../../services/freeRecords.js';
import { getClinicExportDocuments } from '../../services/documents.js';
import { getMeasurements } from '../../services/measurements.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function shortDate(date) {
  if (!date || Number.isNaN(Date.parse(date))) return 'Yok';
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date(date));
}

function money(amountCents) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format((amountCents || 0) / 100);
}

function measurementLabel(type) {
  const labels = { weight: 'Kilo', temperature: 'Ateş', respiratory: 'Solunum', respiratory_rate: 'Solunum', heart_rate: 'Nabız' };
  return labels[type] || type || 'Ölçüm';
}

function renderTimeline(items = []) {
  if (!items.length) {
    return '<div class="empty-state compact"><div class="text-sm text-secondary">Henüz pasaport kaydı yok.</div></div>';
  }
  return items.slice(0, 6).map((item) => `
    <div class="passport-timeline-row">
      <div class="risk-dot"></div>
      <div>
        <strong>${escapeHtml(item.title || item.category || item.record_type || 'Kayıt')}</strong>
        <span>${shortDate(item.date)} · ${escapeHtml(item.kind === 'expense' ? money(item.amount_cents) : item.summary || item.note || item.status || 'Sağlık kaydı')}</span>
      </div>
    </div>
  `).join('');
}

export function render() {
  const pet = getActivePet(getState().activePetId);

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back || ''}</button>
        </div>
        <div class="header-title">Sağlık Pasaportu</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.shield || ''}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="passport-hero">
          <div class="premium-icon-box">${window.__icons?.paw || ''}</div>
          <div>
            <div class="premium-screen-kicker">Pet Sağlık Pasaportu</div>
            <h1>${escapeHtml(pet?.name || 'Aktif pet')}</h1>
            <p>${escapeHtml([pet?.breed, pet?.age, pet?.weight ? `${pet.weight} kg` : ''].filter(Boolean).join(' · ') || 'Profil bilgisi')}</p>
          </div>
          <button class="btn btn-sm btn-primary" id="btnQr">QR</button>
        </div>

        <div class="passport-grid" id="passportStats">
          <div><span>Sağlık kaydı</span><strong>...</strong><small>Arşiv</small></div>
          <div><span>Belge</span><strong>...</strong><small>Tahlil / rapor</small></div>
          <div><span>Hatırlatıcı</span><strong>...</strong><small>Aşı / ilaç</small></div>
          <div><span>Masraf</span><strong>...</strong><small>Toplam</small></div>
        </div>

        <div class="premium-result-section">
          <div class="premium-icon-box">${window.__icons?.heartPulse || ''}</div>
          <div>
            <h3>Profil ve Risk Bağlamı</h3>
            <p>${escapeHtml(pet?.medicalSummary || pet?.statusText || 'Kronik hastalık, alerji ve düzenli ilaç bilgileri profil içinde tutulur.')}</p>
            ${pet?.riskContext?.warnings?.length ? `<ul>${pet.riskContext.warnings.slice(0, 3).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
          </div>
        </div>

        <div class="passport-section">
          <div class="section-header">
            <h3 class="section-title">Son Zaman Akışı</h3>
            <button class="btn-ghost text-primary text-sm font-semibold" id="btnTimeline">Tümü</button>
          </div>
          <div class="passport-timeline" id="passportTimeline">
            <div class="passport-timeline-row"><div class="risk-dot"></div><div><strong>Yükleniyor</strong><span>Kayıtlar hazırlanıyor</span></div></div>
          </div>
        </div>

        <div class="passport-section">
          <div class="section-header">
            <h3 class="section-title">Son Ölçümler ve Belgeler</h3>
            <button class="btn-ghost text-primary text-sm font-semibold" id="btnReports">Raporlar</button>
          </div>
          <div class="passport-list" id="passportDetails">
            <div class="text-sm text-secondary">Yükleniyor...</div>
          </div>
        </div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnClinicExport">Veteriner Link/Dosya Hazırla</button>
          <button class="btn btn-secondary btn-full" id="btnAddRecord">Yeni Kayıt Ekle</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  const petId = state.activePetId;

  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnQr')?.addEventListener('click', () => navigate('/feature/qr'));
  document.getElementById('btnTimeline')?.addEventListener('click', () => navigate('/history/timeline'));
  document.getElementById('btnReports')?.addEventListener('click', () => navigate('/reports'));
  document.getElementById('btnClinicExport')?.addEventListener('click', () => navigate('/feature/clinic-export'));
  document.getElementById('btnAddRecord')?.addEventListener('click', () => navigate('/history/health-records'));

  Promise.all([
    getFreeRecords({ petId, limit: 12 }),
    getClinicExportDocuments({ petId, limit: 12 }),
    getMeasurements({ petId, limit: 6 })
  ]).then(([records, docs, measurements]) => {
    const stats = document.getElementById('passportStats');
    const timeline = document.getElementById('passportTimeline');
    const details = document.getElementById('passportDetails');
    const totalExpense = (records.expenses || []).reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);

    if (stats) {
      stats.innerHTML = `
        <div><span>Sağlık kaydı</span><strong>${records.healthRecords.length}</strong><small>Arşiv</small></div>
        <div><span>Belge</span><strong>${docs.length}</strong><small>Tahlil / rapor</small></div>
        <div><span>Hatırlatıcı</span><strong>${records.reminders.length}</strong><small>Aşı / ilaç</small></div>
        <div><span>Masraf</span><strong>${money(totalExpense)}</strong><small>Toplam</small></div>
      `;
    }

    if (timeline) timeline.innerHTML = renderTimeline(mergeRecentRecords(records));
    if (details) {
      const measurementRows = measurements.slice(0, 3).map(item => `
        <div class="passport-detail-row">
          <span>${window.__icons?.measurement || ''}</span>
          <div><strong>${measurementLabel(item.measurement_type)}</strong><small>${item.value} ${item.unit} · ${shortDate(item.measured_at)}</small></div>
        </div>
      `).join('');
      const docRows = docs.slice(0, 3).map(item => `
        <button class="passport-detail-row" data-report-id="${escapeHtml(item.id)}">
          <span>${window.__icons?.upload || ''}</span>
          <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.status || 'Hazır')} · ${shortDate(item.created_at)}</small></div>
        </button>
      `).join('');
      details.innerHTML = measurementRows || docRows ? `${measurementRows}${docRows}` : '<div class="text-sm text-secondary">Ölçüm veya belge yok.</div>';
      details.querySelectorAll('[data-report-id]').forEach(button => {
        button.addEventListener('click', () => navigate(`/reports/${button.dataset.reportId}`));
      });
    }
  }).catch(() => {
    const details = document.getElementById('passportDetails');
    if (details) details.innerHTML = '<div class="text-sm text-danger">Pasaport kayıtları alınamadı.</div>';
  });
}
