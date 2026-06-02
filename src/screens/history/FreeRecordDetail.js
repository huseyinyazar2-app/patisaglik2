import { navigate, goBack } from '../../router.js';
import { getState } from '../../store.js';
import { getActivePet } from '../../mock/pets.js';
import { getFreeRecords, updateReminderStatus } from '../../services/freeRecords.js';
import { showToast } from '../../ui/toast.js';
import { getLocale, t, translateForLocale } from '../../i18n/tr.js';

const staticConfig = {
  expenses: { icon: 'briefcase', listRoute: '/history/expenses', addRoute: '/feature/expense' },
  reminders: { icon: 'calendar', listRoute: '/history/reminders', addRoute: '/feature/reminders' },
  health: { icon: 'heartPulse', listRoute: '/history/health-records', addRoute: '/feature/photo-followup' }
};

function localeTag() {
  const locale = getLocale();
  if (locale === 'tr') return 'tr-TR';
  if (locale === 'en') return 'en-US';
  return locale;
}

function configFor(type) {
  const localized = t(`freeRecords.detail.configs.${type}`);
  const fallback = t('freeRecords.detail.configs.health');
  return {
    ...(staticConfig[type] || staticConfig.health),
    ...(typeof localized === 'object' ? localized : fallback)
  };
}

function formatDate(date) {
  if (!date) return t('freeRecords.common.no_date');
  return new Intl.DateTimeFormat(localeTag(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

function formatMoney(amountCents, currency = 'TRY') {
  return new Intl.NumberFormat(localeTag(), {
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
  if (status === 'scheduled') return t('freeRecords.common.scheduled');
  if (status === 'completed') return t('freeRecords.common.completed');
  return status || t('freeRecords.common.scheduled');
}

function icsDate(date) {
  const value = date && !Number.isNaN(Date.parse(date)) ? new Date(date) : new Date();
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function safeFileName(value) {
  return String(value || 'hatirlatici')
    .toLocaleLowerCase(localeTag())
    .replace(/[^a-z0-9_-]+/gi, '-')
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
  const title = record.title || record.reminder_type || t('freeRecords.detail.reminder_ics_title');
  const description = [record.note, record.repeat_rule ? `${t('freeRecords.detail.repeat')}: ${record.repeat_rule}` : ''].filter(Boolean).join('\\n');
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
    `DESCRIPTION:${escapeIcs(description || t('freeRecords.detail.reminder_ics_desc'))}`,
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
  if (!size) return t('freeRecords.detail.no_size');
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
  }).join(' ').toLocaleLowerCase(localeTag());
}

function trValue(key) {
  return translateForLocale('tr', key);
}

function payloadLabel(key) {
  return trValue(`freeRecords.detail.payload_labels.${key}`);
}

function keywords(key) {
  const value = trValue(`freeRecords.detail.keywords.${key}`);
  return Array.isArray(value) ? value : [];
}

function includesAny(text, words = []) {
  return words.some((word) => text.includes(word.toLocaleLowerCase(localeTag())));
}

const VET_MAP_URL = 'https://www.google.com/maps/search/?api=1&query=veterinary+clinic';

function renderRuleAlert(record) {
  const payload = record.payload || {};
  const alerts = [];

  if (record.record_type === 'poop_score') {
    const score = Number(payloadFirst(payload, [payloadLabel('score')], 0));
    const finding = payloadText(payload, [payloadLabel('extra_finding'), payloadLabel('note')]);
    if (score <= 1 || score >= 5 || includesAny(finding, keywords('blood'))) {
      alerts.push({ tone: 'danger', title: t('freeRecords.detail.alerts.poop_danger.title'), desc: t('freeRecords.detail.alerts.poop_danger.desc') });
    } else if (score === 2 || score === 4 || includesAny(finding, keywords('poop_watch'))) {
      alerts.push({ tone: 'watch', title: t('freeRecords.detail.alerts.poop_watch.title'), desc: t('freeRecords.detail.alerts.poop_watch.desc') });
    }
  }

  if (record.record_type === 'diet_log') {
    const reaction = payloadText(payload, [payloadLabel('reaction'), payloadLabel('diet_note')]);
    if (includesAny(reaction, keywords('vomiting_diarrhea'))) {
      alerts.push({ tone: 'danger', title: t('freeRecords.detail.alerts.diet_danger.title'), desc: t('freeRecords.detail.alerts.diet_danger.desc') });
    } else if (includesAny(reaction, keywords('diet_watch'))) {
      alerts.push({ tone: 'watch', title: t('freeRecords.detail.alerts.diet_watch.title'), desc: t('freeRecords.detail.alerts.diet_watch.desc') });
    }
  }

  if (record.record_type === 'chronic_followup') {
    const status = payloadText(payload, [payloadLabel('today_status'), payloadLabel('followup_note')]);
    if (includesAny(status, keywords('chronic_watch'))) {
      alerts.push({ tone: 'watch', title: t('freeRecords.detail.alerts.chronic_watch.title'), desc: t('freeRecords.detail.alerts.chronic_watch.desc') });
    }
  }

  if (record.record_type === 'postop_followup') {
    const wound = payloadText(payload, [payloadLabel('wound_status'), payloadLabel('general_status')]);
    const medication = payloadText(payload, [payloadLabel('medication_use')]);
    if (includesAny(wound, keywords('discharge'))) {
      alerts.push({ tone: 'danger', title: t('freeRecords.detail.alerts.postop_danger.title'), desc: t('freeRecords.detail.alerts.postop_danger.desc') });
    } else if (includesAny(wound, keywords('wound_watch'))) {
      alerts.push({ tone: 'watch', title: t('freeRecords.detail.alerts.postop_watch.title'), desc: t('freeRecords.detail.alerts.postop_watch.desc') });
    }
    if (includesAny(medication, keywords('medication_watch'))) {
      alerts.push({ tone: 'watch', title: t('freeRecords.detail.alerts.medication_watch.title'), desc: t('freeRecords.detail.alerts.medication_watch.desc') });
    }
  }

  if (record.record_type === 'reproduction_followup') {
    const finding = payloadText(payload, [payloadLabel('followup_type'), payloadLabel('sign'), payloadLabel('note')]);
    if (includesAny(finding, keywords('reproduction_watch'))) {
      alerts.push({ tone: 'watch', title: t('freeRecords.detail.alerts.reproduction_watch.title'), desc: t('freeRecords.detail.alerts.reproduction_watch.desc') });
    }
  }

  if (record.record_type === 'senior_followup') {
    const senior = payloadText(payload, [payloadLabel('daily_status'), payloadLabel('focus'), payloadLabel('observation'), payloadLabel('note')]);
    if (includesAny(senior, keywords('senior_watch'))) {
      alerts.push({ tone: 'watch', title: t('freeRecords.detail.alerts.senior_watch.title'), desc: t('freeRecords.detail.alerts.senior_watch.desc') });
    }
  }

  if (record.record_type === 'toxin_foreign_body') {
    const finding = payloadText(payload, [payloadLabel('what_ingested'), payloadLabel('when_happened'), payloadLabel('sign_question'), payloadLabel('detail')]);
    if (includesAny(finding, keywords('toxin_danger'))) {
      alerts.push({ tone: 'danger', title: t('freeRecords.detail.alerts.toxin_danger.title'), desc: t('freeRecords.detail.alerts.toxin_danger.desc'), actionLabel: t('freeRecords.detail.vet_search'), actionUrl: VET_MAP_URL });
    } else if (includesAny(finding, keywords('toxin_watch'))) {
      alerts.push({ tone: 'watch', title: t('freeRecords.detail.alerts.toxin_watch.title'), desc: t('freeRecords.detail.alerts.toxin_watch.desc'), actionLabel: t('freeRecords.detail.open_nearby_clinics'), actionUrl: VET_MAP_URL });
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
          ${alert.actionUrl ? `<a class="record-alert-action" href="${alert.actionUrl}" target="_blank" rel="noopener noreferrer">${alert.actionLabel || t('freeRecords.detail.open')}</a>` : ''}
        `).join('')}
        <em>${t('freeRecords.detail.alert_disclaimer')}</em>
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
    type: reminder.type || t('freeRecords.detail.appointment'),
    title: reminder.title || t('freeRecords.detail.followup_reminder'),
    date: reminder.date || addDaysIso(reminder.days || 1),
    repeat: reminder.repeat || t('freeRecords.common.once'),
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
        ${row.reminder ? `<a class="record-plan-action" href="${reminderPresetUrl(row.reminder)}">${window.__icons?.bell || ''} ${t('freeRecords.detail.set_reminder')}</a>` : ''}
      </div>
    </div>
  `).join('');
}

function renderFollowupPlan(record) {
  const payload = record.payload || {};
  const elapsed = daysSince(payload[payloadLabel('start_date')] || record.occurred_at || record.created_at);
  const elapsedText = elapsed === null ? t('freeRecords.detail.no_duration') : t('freeRecords.detail.day_count').replace('{count}', elapsed);
  const plans = {
    chronic_followup: {
      title: t('freeRecords.detail.plans.chronic.title'),
      desc: t('freeRecords.detail.plans.chronic.desc'),
      rows: [
        { icon: 'clipboard', title: payloadFirst(payload, [payloadLabel('template')], t('freeRecords.detail.plans.chronic.template')), desc: payloadFirst(payload, [payloadLabel('today_status')], t('freeRecords.detail.plans.chronic.no_status')) },
        { icon: 'measurement', title: t('freeRecords.detail.plans.common.measurement_observation'), desc: payloadFirst(payload, [payloadLabel('measurement_observation')], t('freeRecords.detail.plans.chronic.measurement_desc')) },
        { icon: 'calendar', title: t('freeRecords.detail.plans.common.routine_check'), desc: t('freeRecords.detail.plans.chronic.routine_desc'), reminder: { type: t('freeRecords.detail.appointment'), title: t('freeRecords.detail.plans.chronic.reminder_title'), days: 7, repeat: t('freeRecords.detail.weekly'), note: t('freeRecords.detail.plans.chronic.reminder_note') } }
      ]
    },
    postop_followup: {
      title: t('freeRecords.detail.plans.postop.title'),
      desc: t('freeRecords.detail.plans.postop.desc'),
      rows: [
        { icon: 'calendar', title: payloadFirst(payload, [payloadLabel('surgery_day')], elapsedText), desc: t('freeRecords.detail.plans.postop.day_desc') },
        { icon: 'shield', title: t('freeRecords.detail.plans.common.wound_status'), desc: payloadFirst(payload, [payloadLabel('wound_status')], t('freeRecords.detail.plans.postop.wound_desc')) },
        { icon: 'bell', title: payloadFirst(payload, [payloadLabel('medication_use')], t('freeRecords.detail.plans.postop.medication_title')), desc: payloadFirst(payload, [payloadLabel('next_dose_check')], t('freeRecords.detail.plans.postop.medication_desc')), reminder: { type: t('freeRecords.detail.medication'), title: t('freeRecords.detail.plans.postop.reminder_title'), date: payloadFirst(payload, [payloadLabel('next_dose_check')], ''), days: 1, repeat: t('freeRecords.detail.daily'), note: t('freeRecords.detail.plans.postop.reminder_note') } }
      ]
    },
    diet_log: {
      title: t('freeRecords.detail.plans.diet.title'),
      desc: t('freeRecords.detail.plans.diet.desc'),
      rows: [
        { icon: 'heartPulse', title: payloadFirst(payload, [payloadLabel('new_food_meal')], t('freeRecords.detail.plans.diet.new_food')), desc: payloadFirst(payload, [payloadLabel('transition_day')], t('freeRecords.detail.plans.diet.no_transition_day')) },
        { icon: 'activity', title: t('freeRecords.detail.plans.common.reaction'), desc: payloadFirst(payload, [payloadLabel('reaction')], t('freeRecords.detail.plans.diet.no_reaction')) },
        { icon: 'calendar', title: t('freeRecords.detail.plans.common.next_check'), desc: t('freeRecords.detail.plans.diet.next_desc'), reminder: { type: t('freeRecords.detail.appointment'), title: t('freeRecords.detail.plans.diet.reminder_title'), days: 3, repeat: t('freeRecords.common.once'), note: t('freeRecords.detail.plans.diet.reminder_note') } }
      ]
    },
    poop_score: {
      title: t('freeRecords.detail.plans.poop.title'),
      desc: t('freeRecords.detail.plans.poop.desc'),
      rows: [
        { icon: 'activity', title: t('freeRecords.detail.plans.poop.last_score'), desc: payloadFirst(payload, [payloadLabel('score')], t('freeRecords.detail.plans.poop.no_score')) },
        { icon: 'search', title: t('freeRecords.detail.plans.poop.extra_finding'), desc: payloadFirst(payload, [payloadLabel('extra_finding')], t('freeRecords.detail.plans.poop.no_finding')) },
        { icon: 'camera', title: t('freeRecords.detail.plans.common.visual_record'), desc: t('freeRecords.detail.plans.poop.visual_desc') }
      ]
    },
    reproduction_followup: {
      title: t('freeRecords.detail.plans.reproduction.title'),
      desc: t('freeRecords.detail.plans.reproduction.desc'),
      rows: [
        { icon: 'calendar', title: payloadFirst(payload, [payloadLabel('followup_type')], t('freeRecords.detail.plans.reproduction.followup_type')), desc: payloadFirst(payload, [payloadLabel('start_date')], elapsedText) },
        { icon: 'note', title: t('freeRecords.detail.plans.common.sign'), desc: payloadFirst(payload, [payloadLabel('sign')], t('freeRecords.detail.plans.reproduction.no_sign')) },
        { icon: 'bell', title: t('freeRecords.detail.plans.common.reminder'), desc: t('freeRecords.detail.plans.reproduction.reminder_desc'), reminder: { type: t('freeRecords.detail.appointment'), title: t('freeRecords.detail.plans.reproduction.reminder_title'), days: 7, repeat: t('freeRecords.common.once'), note: t('freeRecords.detail.plans.reproduction.reminder_note') } }
      ]
    },
    senior_followup: {
      title: t('freeRecords.detail.plans.senior.title'),
      desc: t('freeRecords.detail.plans.senior.desc'),
      rows: [
        { icon: 'heartPulse', title: payloadFirst(payload, [payloadLabel('daily_status')], t('freeRecords.detail.plans.senior.daily_status')), desc: payloadFirst(payload, [payloadLabel('focus')], t('freeRecords.detail.plans.senior.no_focus')) },
        { icon: 'measurement', title: t('freeRecords.detail.plans.common.observation'), desc: payloadFirst(payload, [payloadLabel('observation')], t('freeRecords.detail.plans.senior.no_observation')) },
        { icon: 'calendar', title: t('freeRecords.detail.plans.common.routine'), desc: t('freeRecords.detail.plans.senior.routine_desc'), reminder: { type: t('freeRecords.detail.appointment'), title: t('freeRecords.detail.plans.senior.reminder_title'), days: 7, repeat: t('freeRecords.detail.weekly'), note: t('freeRecords.detail.plans.senior.reminder_note') } }
      ]
    },
    toxin_foreign_body: {
      title: t('freeRecords.detail.plans.toxin.title'),
      desc: t('freeRecords.detail.plans.toxin.desc'),
      rows: [
        { icon: 'alert', title: payloadFirst(payload, [payloadLabel('what_ingested')], t('freeRecords.detail.plans.toxin.substance')), desc: payloadFirst(payload, [payloadLabel('when_happened')], t('freeRecords.detail.plans.toxin.no_time')) },
        { icon: 'activity', title: t('freeRecords.detail.plans.common.sign'), desc: payloadFirst(payload, [payloadLabel('sign_question')], t('freeRecords.detail.plans.toxin.no_sign')) },
        { icon: 'stethoscope', title: t('freeRecords.detail.plans.toxin.vet_prep'), desc: t('freeRecords.detail.plans.toxin.vet_prep_desc') }
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
  const beforeFile = files.find((file) => includesAny(String(file.metadata?.label || '').toLocaleLowerCase(localeTag()), keywords('media_before')));
  const afterFile = files.find((file) => {
    const label = String(file.metadata?.label || '').toLocaleLowerCase(localeTag());
    return includesAny(label, keywords('media_after'));
  });
  const change = payloadFirst(payload, [payloadLabel('visual_change')], '');
  const wound = payloadFirst(payload, [payloadLabel('wound_status')], '');
  const hasPair = Boolean(beforeFile && afterFile);
  const sizeDelta = hasPair ? Number(afterFile.file_size_bytes || 0) - Number(beforeFile.file_size_bytes || 0) : 0;
  const sizeText = hasPair && sizeDelta
    ? t('freeRecords.detail.compare.size_delta').replace('{delta}', `${sizeDelta > 0 ? '+' : ''}${Math.round(sizeDelta / 1024)}`)
    : hasPair ? t('freeRecords.detail.compare.size_close') : t('freeRecords.detail.compare.waiting_pair');

  if (recordType === 'photo_followup' && (hasPair || change)) {
    const tone = includesAny(String(change).toLocaleLowerCase(localeTag()), keywords('change_danger')) ? 'danger'
      : includesAny(String(change).toLocaleLowerCase(localeTag()), keywords('change_good')) ? 'good'
        : 'watch';
    const title = tone === 'danger' ? t('freeRecords.detail.compare.photo_danger_title') : tone === 'good' ? t('freeRecords.detail.compare.photo_good_title') : t('freeRecords.detail.compare.photo_watch_title');
    const desc = tone === 'danger'
      ? t('freeRecords.detail.compare.photo_danger_desc')
      : tone === 'good'
        ? t('freeRecords.detail.compare.photo_good_desc')
        : t('freeRecords.detail.compare.photo_watch_desc');
    return { tone, title, desc, meta: `${change || t('freeRecords.detail.compare.no_visual_change')} · ${sizeText}` };
  }

  if (recordType === 'postop_followup' && (files.length || wound)) {
    const woundText = String(wound).toLocaleLowerCase(localeTag());
    const tone = includesAny(woundText, keywords('discharge')) ? 'danger'
      : includesAny(woundText, keywords('wound_watch')) ? 'watch'
        : 'good';
    const title = tone === 'danger' ? t('freeRecords.detail.compare.wound_danger_title') : tone === 'watch' ? t('freeRecords.detail.compare.wound_watch_title') : t('freeRecords.detail.compare.wound_good_title');
    const desc = tone === 'danger'
      ? t('freeRecords.detail.compare.wound_danger_desc')
      : tone === 'watch'
        ? t('freeRecords.detail.compare.wound_watch_desc')
        : t('freeRecords.detail.compare.wound_good_desc');
    return { tone, title, desc, meta: `${wound || t('freeRecords.detail.compare.no_wound_status')} · ${t('freeRecords.detail.compare.media_count').replace('{count}', files.length)}` };
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

function renderMediaGallery(files = [], subject = t('freeRecords.detail.subject_health'), record = null) {
  if (!files.length) return '';
  const payload = record?.payload || {};
  const recordType = record?.record_type || '';
  const beforeFile = files.find((file) => includesAny(String(file.metadata?.label || '').toLocaleLowerCase(localeTag()), keywords('media_before')));
  const afterFile = files.find((file) => {
    const label = String(file.metadata?.label || '').toLocaleLowerCase(localeTag());
    return includesAny(label, keywords('media_after'));
  });
  const comparePanel = beforeFile || afterFile ? `
    <div class="record-compare-panel">
      ${[beforeFile, afterFile].map((file, index) => `
        <div class="record-compare-slot ${file ? '' : 'empty'}">
          <span>${window.__icons?.camera}</span>
          <small>${index === 0 ? t('freeRecords.detail.previous_record') : t('freeRecords.detail.today_record')}</small>
          <strong>${file?.metadata?.name || file?.local_uri?.replace('local://', '') || t('freeRecords.detail.file_pending')}</strong>
        </div>
      `).join('')}
    </div>
  ` : '';

  return `
    <div class="record-media-panel">
      <div class="record-media-head">
        <span>${window.__icons?.camera}</span>
        <div>
          <strong>${t('freeRecords.detail.media_records')}</strong>
          <small>${t('freeRecords.detail.media_count').replace('{count}', files.length).replace('{subject}', subject)}</small>
        </div>
      </div>
      ${comparePanel}
      ${renderCompareInsight(files, payload, recordType)}
      <div class="record-media-grid">
        ${files.map((file) => {
          const name = file.metadata?.name || file.local_uri?.replace('local://', '') || t('freeRecords.detail.file');
          const label = file.metadata?.label || (file.media_type === 'image' ? t('common.photos') : t('freeRecords.detail.document'));
          return `
            <div class="record-media-card">
              <span>${window.__icons?.[file.media_type === 'image' ? 'camera' : 'upload'] || window.__icons?.clipboard}</span>
              <strong>${name}</strong>
              <small>${label} · ${file.mime_type || file.media_type || t('freeRecords.detail.file_lower')} · ${formatFileSize(file.file_size_bytes)}</small>
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
  const config = configFor(type);
  if (!record) {
    return `
      <div class="free-record-panel">
        <p>${t('freeRecords.detail.loading')}</p>
      </div>
    `;
  }

  if (type === 'expenses') {
    return `
      <div class="record-detail-card">
        <div class="record-detail-main">
          <div class="premium-icon-box">${window.__icons?.briefcase}</div>
          <div>
            <span>${t('freeRecords.common.expense')}</span>
            <h2>${record.title || record.category || t('freeRecords.common.expense')}</h2>
            <p>${formatDate(record.spent_at || record.created_at)}</p>
          </div>
        </div>
        <div class="record-detail-amount">${formatMoney(record.amount_cents, record.currency)}</div>
        <div class="record-detail-grid">
          ${renderField(t('freeRecords.detail.fields.category'), record.category)}
          ${renderField(t('freeRecords.detail.fields.note'), record.note)}
          ${renderField(t('freeRecords.detail.fields.created_at'), formatDate(record.created_at))}
        </div>
        ${renderMediaGallery(record.mediaFiles, t('freeRecords.detail.subject_expense'), record)}
      </div>
    `;
  }

  if (type === 'reminders') {
    return `
      <div class="record-detail-card">
        <div class="record-detail-main">
          <div class="premium-icon-box">${window.__icons?.calendar}</div>
          <div>
            <span>${t('freeRecords.list.tabs.reminders')}</span>
            <h2>${record.title || record.reminder_type || t('freeRecords.common.reminder')}</h2>
            <p>${formatDate(record.due_at)}</p>
          </div>
        </div>
        <div class="record-detail-grid">
          ${renderField(t('freeRecords.detail.fields.type'), record.reminder_type)}
          ${renderField(t('freeRecords.detail.fields.repeat'), record.repeat_rule || t('freeRecords.common.once'))}
          ${renderField(t('freeRecords.detail.fields.status'), statusLabel(record.status))}
          ${renderField(t('freeRecords.detail.fields.note'), record.note)}
          ${renderField(t('freeRecords.detail.fields.created_at'), formatDate(record.created_at))}
        </div>
        <div class="reminder-action-panel">
          <div>
            <span>${t('freeRecords.detail.notification_prep')}</span>
            <strong>${t('freeRecords.detail.calendar_status_title')}</strong>
            <p>${t('freeRecords.detail.calendar_status_desc')}</p>
          </div>
          <div class="reminder-action-row">
            <button type="button" data-reminder-action="complete" ${record.status === 'completed' ? 'disabled' : ''}>${t('freeRecords.common.completed')}</button>
            <button type="button" data-reminder-action="snooze">${t('freeRecords.detail.remind_tomorrow')}</button>
            <button type="button" data-reminder-action="calendar">${t('freeRecords.detail.export_calendar')}</button>
          </div>
        </div>
        ${renderMediaGallery(record.mediaFiles, t('freeRecords.detail.subject_reminder'), record)}
      </div>
    `;
  }

  return `
    <div class="record-detail-card">
      <div class="record-detail-main">
        <div class="premium-icon-box">${window.__icons?.heartPulse}</div>
        <div>
          <span>${t('freeRecords.common.health_record')}</span>
          <h2>${record.title || t('freeRecords.common.health_record')}</h2>
          <p>${formatDate(record.occurred_at || record.created_at)}</p>
        </div>
      </div>
      <div class="record-detail-grid">
        ${renderField(t('freeRecords.detail.fields.record_type'), record.record_type)}
        ${renderField(t('freeRecords.detail.fields.summary'), record.summary)}
        ${payloadFields(record.payload)}
        ${renderField(t('freeRecords.detail.fields.source'), record.source)}
        ${renderField(t('freeRecords.detail.fields.created_at'), formatDate(record.created_at))}
      </div>
      ${renderRuleAlert(record)}
      ${renderFollowupPlan(record)}
      ${renderMediaGallery(record.mediaFiles, t('freeRecords.detail.subject_health'), record)}
    </div>
  `;
}

export function render(params = {}) {
  const type = params.type || 'health';
  const config = configFor(type);
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
            <div class="premium-screen-kicker">${t('freeRecords.detail.kicker')}</div>
            <h1>${config.title}</h1>
            <p>${t('freeRecords.detail.hero_desc').replace('{name}', pet.name)}</p>
          </div>
        </div>

        <div id="recordDetail" class="mt-4">
          ${renderDetail(type)}
        </div>

        <div class="record-detail-actions">
          <button class="btn btn-primary btn-full" id="btnNewRecord">${t('freeRecords.detail.new_record')}</button>
          <button class="btn btn-secondary btn-full" id="btnList">${t('freeRecords.detail.back_to_list')}</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  const type = params.type || 'health';
  const config = configFor(type);
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
        btn.textContent = t('freeRecords.detail.processing');
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
          showToast(`${t('freeRecords.detail.reminder_update_failed')}: ${err.message}`);
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
          <div class="empty-state-title">${t('freeRecords.detail.not_found_title')}</div>
          <div class="empty-state-desc">${t('freeRecords.detail.not_found_desc')}</div>
        </div>
      `;
      if (record && type === 'reminders') bindReminderActions();
    }
  }).catch(() => {});
}
