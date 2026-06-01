import { goBack } from '../../router.js';
import { getVetReadyReport } from '../../services/vetReadyReports.js';
import { showToast } from '../../ui/toast.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(date) {
  if (!date || Number.isNaN(Date.parse(date))) return 'Tarih yok';
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

function formatAnswer(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return Object.entries(value).map(([key, val]) => `${key}: ${formatAnswer(val)}`).join(' | ');
  return String(value || '-');
}

function renderList(items = [], emptyText = 'Kayıt yok') {
  if (!items.length) return `<p class="text-sm text-secondary">${escapeHtml(emptyText)}</p>`;
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderReport(report) {
  const answerRows = Object.entries(report.answers || {}).slice(0, 12);
  const taskRows = (report.tasks || []).slice(0, 8);

  return `
    <div class="report-public-card">
      <div class="report-public-hero ${escapeHtml(report.urgency.level)}">
        <div>
          <div class="premium-screen-kicker">Veterinere Hazır Link</div>
          <h1>${escapeHtml(report.pet.name)} vaka özeti</h1>
          <p>${formatDate(report.createdAt)} tarihinde oluşturuldu.</p>
        </div>
        <div class="report-public-urgency">
          <span>${escapeHtml(report.urgency.title)}</span>
          <strong>${escapeHtml(report.urgency.action)}</strong>
          <small>Skor ${Number(report.urgency.score || 0)} | Güven ${Number(report.urgency.confidence || 0)}%</small>
        </div>
      </div>

      <section>
        <h2>Pet ve Şikayet</h2>
        <div class="report-public-grid">
          <p><b>Pet</b><span>${escapeHtml([report.pet.breed, report.pet.age, report.pet.weight ? `${report.pet.weight} kg` : ''].filter(Boolean).join(' | ') || 'Profil bilgisi yok')}</span></p>
          <p><b>Şikayet</b><span>${escapeHtml(report.complaint.text || 'Belirtilmedi')}</span></p>
          <p><b>Süre</b><span>${escapeHtml(report.complaint.duration || 'Belirtilmedi')}</span></p>
          <p><b>Şiddet</b><span>${escapeHtml(report.complaint.severity || 'Belirtilmedi')}</span></p>
        </div>
      </section>

      <section>
        <h2>Kırmızı Bayraklar</h2>
        ${Object.keys(report.redFlags || {}).length
          ? `<div class="report-public-rows">${Object.entries(report.redFlags).map(([key, value]) => `<p><b>${escapeHtml(key)}</b><span>${escapeHtml(value)}</span></p>`).join('')}</div>`
          : '<p class="text-sm text-secondary">Acil belirti yanıtı yok.</p>'}
      </section>

      <section>
        <h2>Yanıtlar</h2>
        ${answerRows.length
          ? `<div class="report-public-rows">${answerRows.map(([key, value]) => `<p><b>${escapeHtml(key)}</b><span>${escapeHtml(formatAnswer(value))}</span></p>`).join('')}</div>`
          : '<p class="text-sm text-secondary">Soru yanıtı yok.</p>'}
      </section>

      <section>
        <h2>Kanıt ve Görevler</h2>
        ${taskRows.length
          ? `<div class="report-public-rows">${taskRows.map((task) => `<p><b>${escapeHtml(task.title || task.key)}</b><span>${escapeHtml(task.status || 'pending')}</span></p>`).join('')}</div>`
          : '<p class="text-sm text-secondary">Medya veya ölçüm görevi eklenmedi.</p>'}
      </section>

      <section>
        <h2>Güvenli Takip</h2>
        ${renderList(report.steps, 'Takip adımı yok.')}
      </section>

      <section>
        <h2>Dikkat Edilecekler</h2>
        ${renderList([...(report.warnings || []), ...(report.contextWarnings || [])], 'Ek uyarı yok.')}
      </section>

      <div class="premium-privacy-note">${window.__icons?.lock || ''} Bu link veteriner muayenesinin yerine geçmez; klinik görüşmeye hazırlık içindir.</div>
    </div>
  `;
}

export function render(params = {}) {
  const report = getVetReadyReport(params.reportId);

  return `
    <div class="screen premium-result">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back || ''}</button>
        </div>
        <div class="header-title">Vaka Raporu</div>
        <div class="header-right">
          <button class="header-icon" id="btnShare">${window.__icons?.upload || ''}</button>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        ${report ? renderReport(report) : `
          <div class="empty-state">
            <div class="premium-icon-box" style="margin: 0 auto 16px;">${window.__icons?.clipboard || ''}</div>
            <div class="font-bold mb-2">Rapor bulunamadı</div>
            <div class="text-sm text-secondary px-4">Bu link cihazda kayıtlı değil veya temizlenmiş olabilir.</div>
          </div>
        `}
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnShare')?.addEventListener('click', async () => {
    const url = `${window.location.origin}${window.location.pathname}#/public/report/${params.reportId}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Pati Sağlık vaka raporu', url });
      else await navigator.clipboard.writeText(url);
      showToast('Rapor linki hazir.');
    } catch {}
  });
}
