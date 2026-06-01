import { goBack } from '../../router.js';
import { t } from '../../i18n/tr.js';
import { getActivePet } from '../../mock/pets.js';
import { getClinicExportDocumentById } from '../../services/documents.js';
import { getFreeRecords } from '../../services/freeRecords.js';
import { getMeasurements } from '../../services/measurements.js';
import { showToast } from '../../ui/toast.js';

function formatDate(date) {
  if (!date) return 'Tarih yok';
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
}

function safeFileName(value) {
  return String(value || 'pati-saglik-raporu')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ğüşöçıİ_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'pati-saglik-raporu';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(amountCents, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format((amountCents || 0) / 100);
}

function healthTypeLabel(type) {
  const labels = {
    photo_followup: 'Foto takip',
    poop_score: 'Dışkı skoru',
    diet_log: 'Beslenme',
    chronic_followup: 'Kronik takip',
    postop_followup: 'Postop takip',
    reproduction_followup: 'Üreme takibi',
    senior_followup: 'Yaşlı pet',
    toxin_foreign_body: 'Acil toksik/yabancı cisim',
    issue: 'Sorun'
  };
  return labels[type] || 'Sağlık kaydı';
}

function measurementLabel(type) {
  const labels = {
    weight: 'Kilo',
    temperature: 'Vücut ısısı',
    respiratory: 'Solunum',
    respiratory_rate: 'Solunum',
    heart_rate: 'Kalp atışı'
  };
  return labels[type] || type || 'Ölçüm';
}

function renderDataRows(items, emptyText) {
  if (!items.length) {
    return `<p class="text-sm text-gray-500 bg-gray-50 p-3 rounded">${emptyText}</p>`;
  }

  return `
    <div class="grid grid-cols-1 gap-2 mb-6">
      ${items.map((item) => `
        <div class="bg-gray-50 p-3 rounded text-sm">
          <div class="flex justify-between gap-3">
            <span class="font-semibold text-gray-800">${item.title}</span>
            <span class="text-gray-500">${item.meta}</span>
          </div>
          ${item.summary ? `<div class="text-gray-600 mt-1">${item.summary}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderOcrDetails(doc) {
  const ocr = doc.ai_ocr;
  if (!ocr || ocr.status === 'queued_for_server') return '';
  const labValues = Array.isArray(ocr.labValues) ? ocr.labValues : [];
  const medications = Array.isArray(ocr.medications) ? ocr.medications : [];
  const tasks = Array.isArray(ocr.followupTasks) ? ocr.followupTasks : [];
  const warnings = Array.isArray(ocr.warnings) ? ocr.warnings : [];

  return `
    <div class="mt-4 border-t border-gray-200 pt-3">
      ${ocr.summary ? `<p class="text-sm text-gray-800 leading-relaxed"><span class="font-semibold">AI özet:</span> ${escapeHtml(ocr.summary)}</p>` : ''}
      <div class="grid grid-cols-2 gap-2 mt-3">
        ${ocr.documentDate ? `<div class="bg-white p-2 rounded border border-gray-200"><span class="text-xs text-gray-500">Tarih</span><div class="font-semibold">${escapeHtml(ocr.documentDate)}</div></div>` : ''}
        ${ocr.clinic ? `<div class="bg-white p-2 rounded border border-gray-200"><span class="text-xs text-gray-500">Klinik</span><div class="font-semibold">${escapeHtml(ocr.clinic)}</div></div>` : ''}
        ${ocr.invoice?.total ? `<div class="bg-white p-2 rounded border border-gray-200"><span class="text-xs text-gray-500">Tutar</span><div class="font-semibold">${escapeHtml(`${ocr.invoice.total} ${ocr.invoice.currency || ''}`)}</div></div>` : ''}
        ${ocr.confidence ? `<div class="bg-white p-2 rounded border border-gray-200"><span class="text-xs text-gray-500">Güven</span><div class="font-semibold">${Math.round(ocr.confidence)} / 100</div></div>` : ''}
      </div>
      ${labValues.length ? `
        <h4 class="font-semibold text-gray-800 mt-4 mb-2">Tahlil Değerleri</h4>
        <div class="grid grid-cols-1 gap-2">
          ${labValues.slice(0, 8).map((item) => `
            <div class="bg-white p-2 rounded border border-gray-200 text-sm flex justify-between gap-2">
              <span>${escapeHtml(item.name || 'Değer')}</span>
              <b>${escapeHtml([item.value, item.unit].filter(Boolean).join(' '))}</b>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${medications.length ? `
        <h4 class="font-semibold text-gray-800 mt-4 mb-2">İlaç / Reçete</h4>
        <div class="grid grid-cols-1 gap-2">
          ${medications.slice(0, 6).map((item) => `
            <div class="bg-white p-2 rounded border border-gray-200 text-sm">
              <b>${escapeHtml(item.name || 'İlaç')}</b>
              <div class="text-gray-600">${escapeHtml([item.doseText, item.frequency, item.duration, item.note].filter(Boolean).join(' · '))}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${tasks.length ? `
        <h4 class="font-semibold text-gray-800 mt-4 mb-2">Takip Görevleri</h4>
        <ul class="text-sm text-gray-700">
          ${tasks.slice(0, 5).map((item) => `<li>${escapeHtml([item.title, item.dueDate, item.note].filter(Boolean).join(' · '))}</li>`).join('')}
        </ul>
      ` : ''}
      ${warnings.length ? `<p class="text-xs text-gray-500 mt-3">Uyarı: ${escapeHtml(warnings.slice(0, 2).join(' · '))}</p>` : ''}
    </div>
  `;
}

function currentReportTitle() {
  return document.querySelector('#reportDetailBody h1')?.textContent?.trim() || 'Pati Sağlık Raporu';
}

function currentReportText() {
  return document.querySelector('#reportDetailBody')?.textContent?.replace(/\s+/g, ' ').trim() || currentReportTitle();
}

function createReportHtmlExport() {
  const title = currentReportTitle();
  const content = document.querySelector('#reportDetailBody')?.innerHTML || '';
  const html = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 24px; background: #f6faf8; color: #111c18; font-family: Arial, sans-serif; }
    .report-export-shell { max-width: 820px; margin: 0 auto; }
    .bg-white { background: #fff; } .bg-gray-50 { background: #f8fafc; } .bg-primary-50 { background: #effaf6; }
    .text-gray-900, .text-gray-800 { color: #111827; } .text-gray-700, .text-gray-600 { color: #374151; } .text-gray-500 { color: #6b7280; }
    .text-primary, .text-primary-dark { color: #005b4c; }
    .font-bold { font-weight: 700; } .font-semibold { font-weight: 600; }
    .text-xl { font-size: 22px; } .text-sm { font-size: 14px; } .text-xs { font-size: 12px; }
    .p-6 { padding: 24px; } .p-4 { padding: 16px; } .p-3 { padding: 12px; } .p-2 { padding: 8px; }
    .mb-8 { margin-bottom: 32px; } .mb-6 { margin-bottom: 24px; } .mb-4 { margin-bottom: 16px; } .mb-3 { margin-bottom: 12px; } .mb-2 { margin-bottom: 8px; }
    .mt-8 { margin-top: 32px; } .mt-4 { margin-top: 16px; } .mt-1 { margin-top: 4px; }
    .rounded, .rounded-md, .rounded-lg { border-radius: 10px; }
    .border, .border-gray-200 { border: 1px solid #e5e7eb; } .border-b { border-bottom: 1px solid #e5e7eb; } .border-t { border-top: 1px solid #e5e7eb; }
    .border-l-4 { border-left: 4px solid #005b4c; }
    .flex { display: flex; } .grid { display: grid; } .items-start { align-items: flex-start; } .items-center { align-items: center; }
    .justify-between { justify-content: space-between; } .gap-2 { gap: 8px; } .gap-3 { gap: 12px; }
    .grid-cols-1 { grid-template-columns: 1fr; } .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .leading-relaxed { line-height: 1.65; } .text-center { text-align: center; } .text-right { text-align: right; }
    ul { padding-left: 22px; } li { margin-bottom: 6px; } svg { width: 18px; height: 18px; vertical-align: middle; }
    .premium-icon-box, .modern-inline-icon { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: #eef8f5; color: #005b4c; }
  </style>
</head>
<body>
  <main class="report-export-shell">${content}</main>
</body>
</html>`;
  return {
    blob: new Blob([html], { type: 'text/html;charset=utf-8' }),
    name: `${safeFileName(title)}.html`
  };
}

function downloadReportFile() {
  const file = createReportHtmlExport();
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderDocument(doc, records = null, measurements = []) {
  const pet = getActivePet(doc.pet_id);
  const isHealthDocument = doc.document_type === 'health_document';
  const included = doc.included.length ? doc.included : ['Pet profili', 'Aşı ve ilaçlar', 'Şikayet geçmişi', 'Masraflar'];
  const healthRecords = records?.healthRecords || [];
  const reminders = records?.reminders || [];
  const expenses = records?.expenses || [];
  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount_cents || 0), 0);
  const latestMeasurements = measurements.slice(0, 4);

  return `
    <div class="bg-white p-6 rounded-md shadow-sm border border-gray-200" style="min-height: 760px;">
      <div class="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
        <div>
          <h1 class="text-xl font-bold text-gray-900">${doc.title}</h1>
          <p class="text-sm text-gray-500 mt-1">Oluşturma: ${formatDate(doc.created_at)} · ${doc.status === 'draft' ? 'Taslak' : 'Hazır'}</p>
        </div>
        <div class="premium-icon-box">${window.__icons?.briefcase}</div>
      </div>

      <div class="bg-gray-50 p-4 rounded-lg mb-6 text-sm">
        <h3 class="font-bold text-gray-700 mb-2 border-b border-gray-200 pb-1">Pet Bilgileri</h3>
        <p><span class="font-semibold w-24 inline-block">İsim:</span> ${pet?.name || 'Aktif pet'}</p>
        <p><span class="font-semibold w-24 inline-block">${isHealthDocument ? 'Belge:' : 'Amaç:'}</span> ${doc.purpose}</p>
      </div>

      <div class="border-l-4 border-primary bg-primary-50 p-4 mb-6">
        <h3 class="font-bold text-primary-dark mb-2">${isHealthDocument ? 'Belge Notu' : 'Klinik Notu'}</h3>
        <p class="text-sm text-gray-800 leading-relaxed">${doc.note || (isHealthDocument ? 'Belge için ek not girilmedi.' : 'Veteriner için özel not eklenmedi.')}</p>
      </div>

      ${isHealthDocument ? `
        <div class="bg-gray-50 p-4 rounded-lg mb-6 text-sm">
          <h3 class="font-bold text-gray-700 mb-2 border-b border-gray-200 pb-1">AI / OCR Okuma Hazırlığı</h3>
          <p><span class="font-semibold w-24 inline-block">Hedef:</span> ${doc.read_goal || 'Klinik özeti'}</p>
          <p><span class="font-semibold w-24 inline-block">Durum:</span> ${doc.status === 'ai_pending' ? 'AI okuma bekliyor' : doc.status || 'Yüklendi'}</p>
          ${doc.visible_values ? `<p class="mt-1"><span class="font-semibold w-24 inline-block">Elle not:</span> ${doc.visible_values}</p>` : ''}
          ${renderOcrDetails(doc)}
        </div>
      ` : ''}

      <h3 class="font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">${isHealthDocument ? 'Planlanan Çıkarımlar' : 'Dahil Edilecek Bölümler'}</h3>
      <div class="grid grid-cols-1 gap-2 mb-6">
        ${included.map((item) => `
          <div class="bg-gray-50 p-3 rounded text-sm flex items-center gap-2">
            <span class="modern-inline-icon">${window.__icons?.checkCircle}</span>
            <span class="font-semibold">${item}</span>
          </div>
        `).join('')}
      </div>

      <h3 class="font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">Sağlık Kayıt Özeti</h3>
      ${renderDataRows(healthRecords.slice(0, 4).map((item) => ({
        title: item.title,
        meta: `${healthTypeLabel(item.record_type)} · ${formatDate(item.occurred_at || item.created_at)}`,
        summary: item.summary
      })), 'Henüz sağlık kaydı yok.')}

      <h3 class="font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">Takvim ve Hatırlatıcılar</h3>
      ${renderDataRows(reminders.slice(0, 4).map((item) => ({
        title: item.title,
        meta: formatDate(item.due_at),
        summary: `${item.reminder_type || 'Hatırlatıcı'} · ${item.status || 'scheduled'}`
      })), 'Yaklaşan hatırlatıcı yok.')}

      <h3 class="font-bold text-gray-800 border-b border-gray-200 pb-1 mb-3">Masraf ve Ölçüm Özeti</h3>
      <div class="grid grid-cols-2 gap-2 mb-6">
        <div class="bg-gray-50 p-3 rounded text-sm">
          <div class="text-gray-500">Toplam masraf</div>
          <div class="font-bold text-gray-900 mt-1">${formatMoney(totalExpense)}</div>
          <div class="text-xs text-gray-500 mt-1">${expenses.length} kayıt</div>
        </div>
        <div class="bg-gray-50 p-3 rounded text-sm">
          <div class="text-gray-500">Son ölçüm</div>
          <div class="font-bold text-gray-900 mt-1">${latestMeasurements[0] ? `${latestMeasurements[0].value} ${latestMeasurements[0].unit}` : 'Yok'}</div>
          <div class="text-xs text-gray-500 mt-1">${latestMeasurements[0] ? measurementLabel(latestMeasurements[0].measurement_type) : 'Kayıt bekliyor'}</div>
        </div>
      </div>

      ${latestMeasurements.length > 1 ? `
        <div class="grid grid-cols-1 gap-2 mb-6">
          ${latestMeasurements.slice(1).map((item) => `
            <div class="bg-gray-50 p-3 rounded text-sm flex justify-between gap-3">
              <span class="font-semibold">${measurementLabel(item.measurement_type)}</span>
              <span class="text-gray-600">${item.value} ${item.unit} · ${formatDate(item.measured_at)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <h3 class="font-bold text-gray-800 border-b border-gray-200 pb-1 mb-2">Üretim Durumu</h3>
      <p class="text-sm text-gray-700 leading-relaxed">
        ${isHealthDocument
          ? (doc.ai_ocr && doc.ai_ocr.status !== 'queued_for_server'
              ? 'Bu belge AI/OCR ile ayrıştırıldı ve okunabilen alanlar sağlık dosyasına işlendi. Canlı sistemde aynı işlem server/API katmanında çalıştırılacak.'
              : 'Bu belge AI/OCR okuma kuyruğuna hazırlanmış ham kayıt olarak saklanır. Gerçek ayrıştırma için Gemini anahtarı veya server/API katmanı gerekir.')
          : 'Bu kayıt veritabanına kaydedilir ve bu ekrandan indirilebilir HTML dosyası olarak dışa aktarılır. Sunucu taraflı gerçek PDF üretimi sonraki aşamada server/API katmanına bağlanacak.'}
      </p>
    </div>
  `;
}

export function render(params = {}) {
  return `
    <div class="screen bg-gray-100">
      <div class="header bg-white shadow-sm" style="position: sticky; top: 0; z-index: 10;">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">Rapor Önizleme</div>
        <div class="header-right">
          <button class="btn-ghost text-primary text-sm font-semibold p-2" id="btnShareTop">${t('common.share')}</button>
        </div>
      </div>

      <div class="section pt-6 pb-24">
        <div id="reportDetailBody">
          <div class="report-card">
            <div class="report-card-header">
              <div>
                <div class="report-card-title">Rapor yükleniyor</div>
                <div class="report-card-date">Klinik dosyası kontrol ediliyor</div>
              </div>
              <div class="premium-icon-box">${window.__icons?.clock}</div>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button class="btn btn-primary flex-1 shadow-sm" id="btnDownload">
            <span class="modern-button-icon">${window.__icons?.upload}</span> HTML Dosya İndir
          </button>
          <button class="btn btn-outline flex-1 shadow-sm bg-white" id="btnSend">
            <span class="modern-button-icon">${window.__icons?.message}</span> ${t('reports.send_vet')}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnDownload')?.addEventListener('click', () => downloadReportFile());
  const shareReport = async () => {
    const title = currentReportTitle();
    const text = currentReportText().slice(0, 900);
    const exportFile = createReportHtmlExport();
    const file = typeof File === 'undefined' ? null : new File([exportFile.blob], exportFile.name, { type: 'text/html' });
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title, text, files: [file] });
      return;
    }
    if (navigator.share) {
      await navigator.share({ title, text, url: location.href });
      return;
    }
    downloadReportFile();
    showToast('Paylaşım menüsü desteklenmiyor. Rapor dosyası indirildi.');
  };
  document.getElementById('btnSend')?.addEventListener('click', () => shareReport().catch(() => {}));
  document.getElementById('btnShareTop')?.addEventListener('click', () => shareReport().catch(() => {}));

  getClinicExportDocumentById(params.reportId).then(async (doc) => {
    const target = document.getElementById('reportDetailBody');
    if (!target) return;
    if (!doc) {
      target.innerHTML = `
      <div class="empty-state">
        <div class="premium-icon-box" style="margin: 0 auto 16px;">${window.__icons?.clipboard}</div>
        <div class="font-bold mb-2">Rapor bulunamadı</div>
        <div class="text-sm text-secondary px-4">Bu dosya silinmiş veya henüz senkronize edilmemiş olabilir.</div>
      </div>
    `;
      return;
    }

    try {
      const [records, measurements] = await Promise.all([
        getFreeRecords({ petId: doc.pet_id, limit: 8 }),
        getMeasurements({ petId: doc.pet_id, limit: 8 })
      ]);
      target.innerHTML = renderDocument(doc, records, measurements);
    } catch {
      target.innerHTML = renderDocument(doc);
    }
  }).catch(() => {});
}
