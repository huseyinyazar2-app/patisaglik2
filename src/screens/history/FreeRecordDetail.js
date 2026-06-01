import { navigate, goBack } from '../../router.js';
import { getState } from '../../store.js';
import { getActivePet } from '../../mock/pets.js';
import { getFreeRecords, updateReminderStatus } from '../../services/freeRecords.js';
import { showToast } from '../../ui/toast.js';

const configs = {
  expenses: {
    title: 'Masraf Detayı',
    icon: 'briefcase',
    listRoute: '/history/expenses',
    addRoute: '/feature/expense'
  },
  reminders: {
    title: 'Hatırlatıcı Detayı',
    icon: 'calendar',
    listRoute: '/history/reminders',
    addRoute: '/feature/reminders'
  },
  health: {
    title: 'Sağlık Kaydı Detayı',
    icon: 'heartPulse',
    listRoute: '/history/health-records',
    addRoute: '/feature/photo-followup'
  }
};

function formatDate(date) {
  if (!date) return 'Tarih yok';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

function formatMoney(amountCents, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format((amountCents || 0) / 100);
}

function renderField(label, value) {
  if (value === undefined || value === null || value === '') return '';
  const display = Array.isArray(value) ? value.join(', ') : String(value);
  return `
    <div class="record-detail-field">
      <span>${label}</span>
      <strong>${display}</strong>
    </div>
  `;
}

function statusLabel(status) {
  if (status === 'scheduled') return 'Planlı';
  if (status === 'completed') return 'Tamamlandı';
  return status || 'Planlı';
}

function icsDate(date) {
  const value = date && !Number.isNaN(Date.parse(date)) ? new Date(date) : new Date();
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function safeFileName(value) {
  return String(value || 'hatirlatici')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 44) || 'hatirlatici';
}

function escapeIcs(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function downloadReminderIcs(record) {
  const start = record.due_at && !Number.isNaN(Date.parse(record.due_at)) ? new Date(record.due_at) : new Date();
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const title = record.title || record.reminder_type || 'Pati Sağlık Hatırlatıcı';
  const description = [record.note, record.repeat_rule ? `Tekrar: ${record.repeat_rule}` : ''].filter(Boolean).join('\\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pati Saglik//Reminder//TR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${record.id || Date.now()}@patisaglik.local`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description || 'Pati Sağlık hatırlatıcısı')}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFileName(title)}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function payloadFields(payload = {}) {
  return Object.entries(payload)
    .filter(([key]) => !['form_submission_id', 'feature_code', '__media_files'].includes(key))
    .map(([key, value]) => renderField(key, Array.isArray(value) ? value.join(', ') : value))
    .join('');
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) return 'Boyut yok';
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function payloadFirst(payload = {}, labels = [], fallback = '') {
  for (const label of labels) {
    const value = payload[label];
    if (Array.isArray(value)) return value[0]?.label || value[0] || fallback;
    if (value) return value;
  }
  return fallback;
}

function payloadText(payload = {}, labels = []) {
  return labels.flatMap((label) => {
    const value = payload[label];
    if (Array.isArray(value)) return value.map((item) => item?.label || item).filter(Boolean);
    return value ? [value] : [];
  }).join(' ').toLocaleLowerCase('tr-TR');
}

function includesAny(text, words = []) {
  return words.some((word) => text.includes(word.toLocaleLowerCase('tr-TR')));
}

const VET_MAP_URL = 'https://www.google.com/maps/search/veteriner+kliniği';

function renderRuleAlert(record) {
  const payload = record.payload || {};
  const alerts = [];

  if (record.record_type === 'poop_score') {
    const score = Number(payloadFirst(payload, ['Skor'], 0));
    const finding = payloadText(payload, ['Ek bulgu', 'Not']);
    if (score <= 1 || score >= 5 || includesAny(finding, ['kan'])) {
      alerts.push({ tone: 'danger', title: 'Dışkı kaydında dikkat', desc: 'Skor uç değerde veya kan bulgusu var. Devam ederse veteriner görüşmesi için notları hazır tut.' });
    } else if (score === 2 || score === 4 || includesAny(finding, ['mukus', 'çok sulu', 'çok sert'])) {
      alerts.push({ tone: 'watch', title: 'Yakın takip önerilir', desc: 'Skor normalden sapmış görünüyor. Beslenme, su tüketimi ve tekrar eden kayıtları izlemek iyi olur.' });
    }
  }

  if (record.record_type === 'diet_log') {
    const reaction = payloadText(payload, ['Reaksiyon', 'Beslenme notu']);
    if (includesAny(reaction, ['kusma', 'ishal'])) {
      alerts.push({ tone: 'danger', title: 'Beslenme reaksiyonu', desc: 'Kusma veya ishal işaretlenmiş. Mama geçişini ve tekrar eden belirtileri dikkatle takip et.' });
    } else if (includesAny(reaction, ['kaşıntı', 'gaz'])) {
      alerts.push({ tone: 'watch', title: 'Hassasiyet olabilir', desc: 'Kaşıntı veya gaz gibi reaksiyonlar kaydedilmiş. Sonraki öğünlerde aynı belirtiyi kontrol et.' });
    }
  }

  if (record.record_type === 'chronic_followup') {
    const status = payloadText(payload, ['Bugünkü durum', 'Takip notu']);
    if (includesAny(status, ['daha kötü', 'ilaç atlandı'])) {
      alerts.push({ tone: 'watch', title: 'Kronik takip uyarısı', desc: 'Durum kötüleşme veya ilaç atlama içeriyor. Ölçüm ve notları aynı gün içinde tamamlamak faydalı olur.' });
    }
  }

  if (record.record_type === 'postop_followup') {
    const wound = payloadText(payload, ['Yara durumu', 'Genel durum']);
    const medication = payloadText(payload, ['İlaç kullanımı']);
    if (includesAny(wound, ['akıntı'])) {
      alerts.push({ tone: 'danger', title: 'Yara yeri dikkat', desc: 'Akıntı işaretlenmiş. Fotoğraf kaydı ve veteriner kontrol planı önerilir.' });
    } else if (includesAny(wound, ['kızarık', 'şiş'])) {
      alerts.push({ tone: 'watch', title: 'Yara yakın takip', desc: 'Kızarıklık veya şişlik kaydedilmiş. Aynı açıdan fotoğrafla değişimi takip et.' });
    }
    if (includesAny(medication, ['atlandı', 'yan etki'])) {
      alerts.push({ tone: 'watch', title: 'İlaç takibi', desc: 'İlaç atlama veya yan etki kaydedilmiş. Bir sonraki doz/kontrol için hatırlatıcı planla.' });
    }
  }

  if (record.record_type === 'reproduction_followup') {
    const finding = payloadText(payload, ['Takip türü', 'Belirti', 'Not']);
    if (includesAny(finding, ['akıntı', 'iştah değişimi'])) {
      alerts.push({ tone: 'watch', title: 'Üreme takibi dikkat', desc: 'Belirti değişimi kaydedilmiş. Takvim ve veteriner notlarını güncel tut.' });
    }
  }

  if (record.record_type === 'senior_followup') {
    const senior = payloadText(payload, ['Günlük durum', 'Odak', 'Gözlem', 'Not']);
    if (includesAny(senior, ['ağrılı', 'iştahsız', 'ağrı'])) {
      alerts.push({ tone: 'watch', title: 'Senior hassasiyet', desc: 'Ağrı veya iştah hassasiyeti kaydedilmiş. Su, kilo ve hareket notlarını düzenli karşılaştır.' });
    }
  }

  if (record.record_type === 'toxin_foreign_body') {
    const finding = payloadText(payload, ['Ne yuttu / temas etti?', 'Ne zaman oldu?', 'Belirti var mı?', 'Detay']);
    if (includesAny(finding, ['nefes sorunu', 'titreme', 'ilaç', 'çikolata', '0-1 saat'])) {
      alerts.push({ tone: 'danger', title: 'Acil veteriner yönlendirmesi', desc: 'Toksik madde/yabancı cisim şüphesi ve riskli belirti/zaman bilgisi var. Paket, miktar ve zamanı not edip beklemeden veterinerle görüş.', actionLabel: 'Veteriner Ara', actionUrl: VET_MAP_URL });
    } else if (includesAny(finding, ['kusma', 'halsizlik', 'salya', '1-3 saat', 'emin değilim'])) {
      alerts.push({ tone: 'watch', title: 'Yakın acil takip', desc: 'Belirti veya belirsiz zaman bilgisi kaydedilmiş. Miktarı, saatini ve mümkünse fotoğrafını hazır tut; kötüleşirse acil destek al.', actionLabel: 'Yakındaki Klinikleri Aç', actionUrl: VET_MAP_URL });
    }
  }

  if (!alerts.length) return '';
  return `
    <div class="record-alert-panel ${alerts[0].tone}">
      <span>${window.__icons?.alert}</span>
      <div>
        ${alerts.map((alert) => `
          <strong>${alert.title}</strong>
          <small>${alert.desc}</small>
          ${alert.actionUrl ? `<a class="record-alert-action" href="${alert.actionUrl}" target="_blank" rel="noopener noreferrer">${alert.actionLabel || 'Aç'}</a>` : ''}
        `).join('')}
        <em>Bu uyarı teşhis değildir; veteriner görüşmesine hazırlık için kayıtları düzenler.</em>
      </div>
    </div>
  `;
}

function daysSince(date) {
  if (!date || Number.isNaN(Date.parse(date))) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
}

function addDaysIso(days = 1) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function reminderPresetUrl(reminder = {}) {
  const params = new URLSearchParams({
    type: reminder.type || 'Randevu',
    title: reminder.title || 'Takip hatırlatıcısı',
    date: reminder.date || addDaysIso(reminder.days || 1),
    repeat: reminder.repeat || 'Tek sefer',
    note: reminder.note || ''
  });
  return `#/feature/reminders?${params.toString()}`;
}

function renderPlanRows(rows = []) {
  return rows.map((row) => `
    <div class="record-plan-row">
      <span>${window.__icons?.[row.icon] || window.__icons?.checkCircle}</span>
      <div>
        <strong>${row.title}</strong>
        <small>${row.desc}</small>
        ${row.reminder ? `<a class="record-plan-action" href="${reminderPresetUrl(row.reminder)}">${window.__icons?.bell || ''} Hatırlatıcı Kur</a>` : ''}
      </div>
    </div>
  `).join('');
}

function renderFollowupPlan(record) {
  const payload = record.payload || {};
  const elapsed = daysSince(payload['Başlangıç tarihi'] || record.occurred_at || record.created_at);
  const elapsedText = elapsed === null ? 'Süre kaydı yok' : `${elapsed}. gün`;
  const plans = {
    chronic_followup: {
      title: 'Kronik takip planı',
      desc: 'Düzenli durum, ölçüm ve ilaç notlarını aynı şablonda biriktir.',
      rows: [
        { icon: 'clipboard', title: payloadFirst(payload, ['Şablon'], 'Takip şablonu'), desc: payloadFirst(payload, ['Bugünkü durum'], 'Son durum kaydı bekleniyor') },
        { icon: 'measurement', title: 'Ölçüm/gözlem', desc: payloadFirst(payload, ['Ölçüm / gözlem'], 'Bir sonraki kayıtta ölçüm veya gözlem ekle') },
        { icon: 'calendar', title: 'Rutin kontrol', desc: 'Haftalık kayıt düzeni trendi daha okunabilir yapar.', reminder: { type: 'Randevu', title: 'Kronik takip kontrolü', days: 7, repeat: 'Haftalık', note: 'Kronik takip kaydını güncelle ve ölçüm/gözlem ekle.' } }
      ]
    },
    postop_followup: {
      title: 'Operasyon sonrası plan',
      desc: 'Yara, ilaç ve genel durum kayıtlarını gün gün takip et.',
      rows: [
        { icon: 'calendar', title: payloadFirst(payload, ['Operasyon günü'], elapsedText), desc: 'Operasyon günü bilgisini sonraki kontrollerle karşılaştır.' },
        { icon: 'shield', title: 'Yara durumu', desc: payloadFirst(payload, ['Yara durumu'], 'Fotoğraf ve kısa notla takip et') },
        { icon: 'bell', title: payloadFirst(payload, ['İlaç kullanımı'], 'İlaç/randevu'), desc: payloadFirst(payload, ['Sonraki doz / kontrol'], 'İlaç veya kontrol tarihi varsa takvim hatırlatıcısı ekle.'), reminder: { type: 'İlaç', title: 'Operasyon sonrası ilaç/kontrol', date: payloadFirst(payload, ['Sonraki doz / kontrol'], ''), days: 1, repeat: 'Günlük', note: 'Operasyon sonrası ilaç, yara ve genel durum kontrolünü kaydet.' } }
      ]
    },
    diet_log: {
      title: 'Beslenme geçiş planı',
      desc: 'Yeni mamaya geçişte reaksiyonları aynı kayıt hattında tut.',
      rows: [
        { icon: 'heartPulse', title: payloadFirst(payload, ['Yeni mama / öğün'], 'Yeni mama'), desc: payloadFirst(payload, ['Geçiş günü'], 'Geçiş günü belirtilmedi') },
        { icon: 'activity', title: 'Reaksiyon', desc: payloadFirst(payload, ['Reaksiyon'], 'Reaksiyon kaydı yok') },
        { icon: 'calendar', title: 'Sonraki kontrol', desc: 'Dışkı, iştah ve kaşıntı notunu bir sonraki kayda ekle.', reminder: { type: 'Randevu', title: 'Beslenme geçiş kontrolü', days: 3, repeat: 'Tek sefer', note: 'Yeni mama sonrası iştah, dışkı ve kaşıntı notlarını kontrol et.' } }
      ]
    },
    poop_score: {
      title: 'Dışkı takip planı',
      desc: 'Skor değişimini düzenli kaydederek beslenme ve stres etkisini izleyebilirsin.',
      rows: [
        { icon: 'activity', title: 'Son skor', desc: payloadFirst(payload, ['Skor'], 'Skor girilmedi') },
        { icon: 'search', title: 'Ek bulgu', desc: payloadFirst(payload, ['Ek bulgu'], 'Ek bulgu yok') },
        { icon: 'camera', title: 'Görsel kayıt', desc: 'Gerekirse aynı ışıkta fotoğraf ekleyerek karşılaştırmayı güçlendir.' }
      ]
    },
    reproduction_followup: {
      title: 'Üreme takip planı',
      desc: 'Kızgınlık, gebelik veya doğum sonrası belirtileri takvim halinde izle.',
      rows: [
        { icon: 'calendar', title: payloadFirst(payload, ['Takip türü'], 'Takip türü'), desc: payloadFirst(payload, ['Başlangıç tarihi'], elapsedText) },
        { icon: 'note', title: 'Belirti', desc: payloadFirst(payload, ['Belirti'], 'Belirti kaydı yok') },
        { icon: 'bell', title: 'Hatırlatma', desc: 'Kontrol günü veya veteriner ziyareti için ayrı hatırlatıcı ekle.', reminder: { type: 'Randevu', title: 'Üreme takip kontrolü', days: 7, repeat: 'Tek sefer', note: 'Belirti değişimi, iştah ve veteriner notunu kontrol et.' } }
      ]
    },
    senior_followup: {
      title: 'Senior hassasiyet planı',
      desc: 'Yaşlı petlerde küçük değişimleri düzenli ve sakin bir akışta kaydet.',
      rows: [
        { icon: 'heartPulse', title: payloadFirst(payload, ['Günlük durum'], 'Günlük durum'), desc: payloadFirst(payload, ['Odak'], 'Odak alanı yok') },
        { icon: 'measurement', title: 'Gözlem', desc: payloadFirst(payload, ['Gözlem'], 'Gözlem eklenmedi') },
        { icon: 'calendar', title: 'Rutin', desc: 'Su, kilo, ağrı ve hareket kayıtlarını haftalık karşılaştır.', reminder: { type: 'Randevu', title: 'Senior rutin kontrol', days: 7, repeat: 'Haftalık', note: 'Su, kilo, ağrı ve hareket gözlemlerini güncelle.' } }
      ]
    },
    toxin_foreign_body: {
      title: 'Acil kontrol planı',
      desc: 'Toksik madde veya yabancı cisim şüphesinde veteriner görüşmesi için bilgileri hazır tut.',
      rows: [
        { icon: 'alert', title: payloadFirst(payload, ['Ne yuttu / temas etti?'], 'Madde/cisim'), desc: payloadFirst(payload, ['Ne zaman oldu?'], 'Zaman bilgisi yok') },
        { icon: 'activity', title: 'Belirti', desc: payloadFirst(payload, ['Belirti var mı?'], 'Belirti işaretlenmedi') },
        { icon: 'stethoscope', title: 'Veteriner hazırlığı', desc: 'Paket/fotoğraf, yaklaşık miktar, saat ve belirtileri tek yerde hazır tut.' }
      ]
    }
  };

  const plan = plans[record.record_type];
  if (!plan) return '';
  return `
    <div class="record-plan-panel">
      <div class="record-plan-head">
        <span>${window.__icons?.clipboard}</span>
        <div>
          <strong>${plan.title}</strong>
          <small>${plan.desc}</small>
        </div>
      </div>
      <div class="record-plan-grid">${renderPlanRows(plan.rows)}</div>
    </div>
  `;
}

function compareInsight(files = [], payload = {}, recordType = '') {
  const beforeFile = files.find((file) => String(file.metadata?.label || '').toLocaleLowerCase('tr-TR').includes('önce'));
  const afterFile = files.find((file) => {
    const label = String(file.metadata?.label || '').toLocaleLowerCase('tr-TR');
    return label.includes('bugün') || label.includes('sonra') || label.includes('yeni');
  });
  const change = payloadFirst(payload, ['Görsel değişim'], '');
  const wound = payloadFirst(payload, ['Yara durumu'], '');
  const hasPair = Boolean(beforeFile && afterFile);
  const sizeDelta = hasPair ? Number(afterFile.file_size_bytes || 0) - Number(beforeFile.file_size_bytes || 0) : 0;
  const sizeText = hasPair && sizeDelta
    ? `${sizeDelta > 0 ? '+' : ''}${Math.round(sizeDelta / 1024)} KB dosya farkı`
    : hasPair ? 'Dosya boyutları yakın' : 'Karşılaştırma için iki fotoğraf bekleniyor';

  if (recordType === 'photo_followup' && (hasPair || change)) {
    const tone = includesAny(String(change).toLocaleLowerCase('tr-TR'), ['arttı', 'yeni']) ? 'danger'
      : includesAny(String(change).toLocaleLowerCase('tr-TR'), ['azaldı']) ? 'good'
        : 'watch';
    const title = tone === 'danger' ? 'Değişim yakından izlenmeli' : tone === 'good' ? 'İyileşme eğilimi' : 'Değişim stabil';
    const desc = tone === 'danger'
      ? 'Kayıtta artış veya yeni belirti seçilmiş. Aynı açıdan yeni fotoğraf ve veteriner notu eklemek iyi olur.'
      : tone === 'good'
        ? 'Azalma seçilmiş. Aynı ışık/açı ile bir sonraki kontrol fotoğrafı trendi daha net gösterir.'
        : 'Belirti aynı görünüyor. Düzenli aralıkla tekrar fotoğraf eklemek karşılaştırmayı güçlendirir.';
    return { tone, title, desc, meta: `${change || 'Görsel değişim seçilmedi'} · ${sizeText}` };
  }

  if (recordType === 'postop_followup' && (files.length || wound)) {
    const woundText = String(wound).toLocaleLowerCase('tr-TR');
    const tone = includesAny(woundText, ['akıntı']) ? 'danger'
      : includesAny(woundText, ['kızarık', 'şiş']) ? 'watch'
        : 'good';
    const title = tone === 'danger' ? 'Yara fotoğrafı acil takipte' : tone === 'watch' ? 'Yara değişimi izlenmeli' : 'Yara kaydı sakin';
    const desc = tone === 'danger'
      ? 'Akıntı işaretlenmiş. Fotoğrafı sakla, doz/kontrol hatırlatıcısını kullan ve veterinerle paylaş.'
      : tone === 'watch'
        ? 'Kızarıklık veya şişlik var. Sonraki kayıtta aynı açıdan fotoğraf ekleyerek farkı karşılaştır.'
        : 'Yara durumu temiz görünüyor. Aynı açıdan aralıklı fotoğraf eklemek iyileşme kaydını güçlendirir.';
    return { tone, title, desc, meta: `${wound || 'Yara durumu yok'} · ${files.length} medya` };
  }

  return null;
}

function renderCompareInsight(files = [], payload = {}, recordType = '') {
  const insight = compareInsight(files, payload, recordType);
  if (!insight) return '';
  return `
    <div class="record-compare-insight ${insight.tone}">
      <span>${window.__icons?.activity || window.__icons?.camera}</span>
      <div>
        <strong>${insight.title}</strong>
        <small>${insight.meta}</small>
        <p>${insight.desc}</p>
      </div>
    </div>
  `;
}

function renderMediaGallery(files = [], subject = 'sağlık kaydına', record = null) {
  if (!files.length) return '';
  const payload = record?.payload || {};
  const recordType = record?.record_type || '';
  const beforeFile = files.find((file) => String(file.metadata?.label || '').toLocaleLowerCase('tr-TR').includes('önce'));
  const afterFile = files.find((file) => {
    const label = String(file.metadata?.label || '').toLocaleLowerCase('tr-TR');
    return label.includes('bugün') || label.includes('sonra') || label.includes('yeni');
  });
  const comparePanel = beforeFile || afterFile ? `
    <div class="record-compare-panel">
      ${[beforeFile, afterFile].map((file, index) => `
        <div class="record-compare-slot ${file ? '' : 'empty'}">
          <span>${window.__icons?.camera}</span>
          <small>${index === 0 ? 'Önceki kayıt' : 'Bugünkü kayıt'}</small>
          <strong>${file?.metadata?.name || file?.local_uri?.replace('local://', '') || 'Dosya bekleniyor'}</strong>
        </div>
      `).join('')}
    </div>
  ` : '';

  return `
    <div class="record-media-panel">
      <div class="record-media-head">
        <span>${window.__icons?.camera}</span>
        <div>
          <strong>Medya kayıtları</strong>
          <small>${files.length} dosya bu ${subject} bağlı</small>
        </div>
      </div>
      ${comparePanel}
      ${renderCompareInsight(files, payload, recordType)}
      <div class="record-media-grid">
        ${files.map((file) => {
          const name = file.metadata?.name || file.local_uri?.replace('local://', '') || 'Dosya';
          const label = file.metadata?.label || (file.media_type === 'image' ? 'Fotoğraf' : 'Belge');
          return `
            <div class="record-media-card">
              <span>${window.__icons?.[file.media_type === 'image' ? 'camera' : 'upload'] || window.__icons?.clipboard}</span>
              <strong>${name}</strong>
              <small>${label} · ${file.mime_type || file.media_type || 'dosya'} · ${formatFileSize(file.file_size_bytes)}</small>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function findRecord(type, records, recordId) {
  const items = type === 'expenses' ? records.expenses : type === 'reminders' ? records.reminders : records.healthRecords;
  return items.find((item) => item.id === recordId);
}

function renderDetail(type, record = null) {
  const config = configs[type] || configs.health;
  if (!record) {
    return `
      <div class="free-record-panel">
        <p>Kayıt detayı getiriliyor...</p>
      </div>
    `;
  }

  if (type === 'expenses') {
    return `
      <div class="record-detail-card">
        <div class="record-detail-main">
          <div class="premium-icon-box">${window.__icons?.briefcase}</div>
          <div>
            <span>Masraf</span>
            <h2>${record.title || record.category || 'Masraf'}</h2>
            <p>${formatDate(record.spent_at || record.created_at)}</p>
          </div>
        </div>
        <div class="record-detail-amount">${formatMoney(record.amount_cents, record.currency)}</div>
        <div class="record-detail-grid">
          ${renderField('Kategori', record.category)}
          ${renderField('Not', record.note)}
          ${renderField('Kayıt tarihi', formatDate(record.created_at))}
        </div>
        ${renderMediaGallery(record.mediaFiles, 'masraf kaydına', record)}
      </div>
    `;
  }

  if (type === 'reminders') {
    return `
      <div class="record-detail-card">
        <div class="record-detail-main">
          <div class="premium-icon-box">${window.__icons?.calendar}</div>
          <div>
            <span>Takvim</span>
            <h2>${record.title || record.reminder_type || 'Hatırlatıcı'}</h2>
            <p>${formatDate(record.due_at)}</p>
          </div>
        </div>
        <div class="record-detail-grid">
          ${renderField('Tür', record.reminder_type)}
          ${renderField('Tekrar', record.repeat_rule || 'Tek sefer')}
          ${renderField('Durum', statusLabel(record.status))}
          ${renderField('Not', record.note)}
          ${renderField('Kayıt tarihi', formatDate(record.created_at))}
        </div>
        <div class="reminder-action-panel">
          <div>
            <span>Bildirim hazırlığı</span>
            <strong>Takvim durumu güncellenebilir</strong>
            <p>PWA/Capacitor bildirim izni geldiğinde bu kayıt durumları kullanılacak.</p>
          </div>
          <div class="reminder-action-row">
            <button type="button" data-reminder-action="complete" ${record.status === 'completed' ? 'disabled' : ''}>Tamamlandı</button>
            <button type="button" data-reminder-action="snooze">Yarın Hatırlat</button>
            <button type="button" data-reminder-action="calendar">Takvime Aktar</button>
          </div>
        </div>
        ${renderMediaGallery(record.mediaFiles, 'hatırlatıcıya', record)}
      </div>
    `;
  }

  return `
    <div class="record-detail-card">
      <div class="record-detail-main">
        <div class="premium-icon-box">${window.__icons?.heartPulse}</div>
        <div>
          <span>Sağlık kaydı</span>
          <h2>${record.title || 'Sağlık kaydı'}</h2>
          <p>${formatDate(record.occurred_at || record.created_at)}</p>
        </div>
      </div>
      <div class="record-detail-grid">
        ${renderField('Kayıt türü', record.record_type)}
        ${renderField('Özet', record.summary)}
        ${payloadFields(record.payload)}
        ${renderField('Kaynak', record.source)}
        ${renderField('Kayıt tarihi', formatDate(record.created_at))}
      </div>
      ${renderRuleAlert(record)}
      ${renderFollowupPlan(record)}
      ${renderMediaGallery(record.mediaFiles, 'sağlık kaydına', record)}
    </div>
  `;
}

export function render(params = {}) {
  const type = params.type || 'health';
  const config = configs[type] || configs.health;
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
            <div class="premium-screen-kicker">Ücretsiz kayıt detayı</div>
            <h1>${config.title}</h1>
            <p>${pet.name} için kaydedilen bilginin okunabilir özeti.</p>
          </div>
        </div>

        <div id="recordDetail" class="mt-4">
          ${renderDetail(type)}
        </div>

        <div class="record-detail-actions">
          <button class="btn btn-primary btn-full" id="btnNewRecord">Yeni Kayıt Ekle</button>
          <button class="btn btn-secondary btn-full" id="btnList">Listeye Dön</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  const type = params.type || 'health';
  const config = configs[type] || configs.health;
  const state = getState();

  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnNewRecord')?.addEventListener('click', () => navigate(config.addRoute));
  document.getElementById('btnList')?.addEventListener('click', () => navigate(config.listRoute));

  function bindReminderActions() {
    document.querySelectorAll('[data-reminder-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const originalText = btn.textContent;
        if (btn.dataset.reminderAction === 'calendar') {
          const record = findRecord(type, await getFreeRecords({ petId: state.activePetId, limit: 50 }), params.recordId);
          if (record) downloadReminderIcs(record);
          return;
        }
        btn.disabled = true;
        btn.textContent = 'İşleniyor...';
        try {
          if (btn.dataset.reminderAction === 'complete') {
            await updateReminderStatus({ reminderId: params.recordId, status: 'completed' });
          } else {
            await updateReminderStatus({ reminderId: params.recordId, status: 'scheduled', snoozeDays: 1 });
          }
          navigate(config.listRoute);
        } catch (err) {
          btn.disabled = false;
          btn.textContent = originalText;
          showToast(`Hatırlatıcı güncellenemedi: ${err.message}`);
        }
      });
    });
  }

  getFreeRecords({ petId: state.activePetId, limit: 50 }).then((records) => {
    const record = findRecord(type, records, params.recordId);
    const target = document.getElementById('recordDetail');
    if (target) {
      target.innerHTML = record ? renderDetail(type, record) : `
        <div class="empty-state">
          <div class="empty-state-icon">${window.__icons?.[config.icon] || ''}</div>
          <div class="empty-state-title">Kayıt bulunamadı</div>
          <div class="empty-state-desc">Kayıt silinmiş veya farklı bir pete ait olabilir.</div>
        </div>
      `;
      if (record && type === 'reminders') bindReminderActions();
    }
  }).catch(() => {});
}
