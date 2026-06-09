import { goBack, navigate } from '../../router.js';
import { getState } from '../../store.js';
import { getActivePet } from '../../services/pets.js';
import { submitFeatureForm } from '../../services/formSubmissions.js';
import { isDocumentOcrConfigured, runDocumentOcr } from '../../services/documentOcr.js';
import { uploadMediaFile } from '../../services/apiClient.js';
import { PAYMENTS_DISABLED, getFeatureCreditAvailability, recordFeatureUsage } from '../../services/billing.js';
import { addRecordCategory, getRecordCategoryOptions, otherCategoryValue } from '../../services/recordCategories.js';
import { formatErrorForDeveloper } from '../../services/errorCodes.js';
import { syncUpcomingNativeReminders } from '../../services/reminderScheduler.js';
import QRCode from 'qrcode';
import { t } from '../../i18n/tr.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function featureForms() {
  return t('featureForms.configs');
}

function withDynamicFields(featureId, config) {
  if (!config) return config;
  if (!['expense', 'reminders'].includes(featureId)) return config;
  return {
    ...config,
    fields: config.fields.map((field) => {
      const isExpenseCategory = featureId === 'expense' && field.label === t('featureForm.labels.category');
      const isReminderType = featureId === 'reminders' && field.label === t('featureForm.labels.reminder_type');
      if (!isExpenseCategory && !isReminderType) return field;
      const kind = isExpenseCategory ? 'expense' : 'reminder';
      return {
        ...field,
        options: getRecordCategoryOptions(kind).map((item) => item.label),
        optionValues: getRecordCategoryOptions(kind).map((item) => item.value),
        allowCustomCategory: true,
        categoryKind: kind,
        defaultFirst: false
      };
    })
  };
}

function presetForField(field, preset = {}) {
  const label = field.label || '';
  if (label === t('featureForm.labels.reminder_type')) return preset.type || '';
  if (label === t('featureForm.labels.title')) return preset.title || '';
  if (label === t('featureForm.labels.date')) return preset.date || '';
  if (label === t('featureForm.labels.repeat')) return preset.repeat || '';
  if (label === t('featureForm.labels.note')) return preset.note || '';
  return '';
}

function renderField(field, preset = {}) {
  const presetValue = presetForField(field, preset);

  if (field.type === 'text' || field.type === 'money' || field.type === 'date' || field.type === 'datetime') {
    const inputType = field.type === 'date' ? 'date' : field.type === 'datetime' ? 'datetime-local' : 'text';
    const inputMode = field.type === 'money' ? 'decimal' : '';
    return `
      <label class="feature-field">
        <span>${field.label}${field.required ? `<em>${t('featureForm.required_marker')}</em>` : ''}</span>
        <input
          type="${inputType}"
          placeholder="${field.placeholder || ''}"
          value="${escapeHtml(presetValue)}"
          ${inputMode ? `inputmode="${inputMode}"` : ''}
          ${field.type === 'money' ? 'autocomplete="off"' : ''}
          ${field.required ? 'data-required="true"' : ''}
        />
      </label>
    `;
  }

  if (field.type === 'textarea') {
    return `
      <label class="feature-field">
        <span>${field.label}</span>
        <textarea placeholder="${field.placeholder || ''}">${escapeHtml(presetValue)}</textarea>
      </label>
    `;
  }

  if (field.type === 'chips' || field.type === 'score') {
    const mode = field.type === 'score' || field.selection === 'single' ? 'single' : 'multi';
    return `
      <div class="feature-field">
        <span>${field.label}${field.required ? `<em>${t('featureForm.required_marker')}</em>` : ''}</span>
        <div class="${field.type === 'score' ? 'feature-score-row' : 'feature-chip-row'}" data-choice-mode="${mode}" ${field.required ? 'data-required-choice="true"' : ''}>
          ${field.options.map((option, index) => `
            <button class="${(presetValue ? option === presetValue : field.defaultFirst !== false && index === 0) ? 'selected' : ''}" type="button" data-choice-value="${escapeHtml(field.optionValues?.[index] || option)}">${option}</button>
          `).join('')}
        </div>
        ${field.allowCustomCategory ? `
          <input class="feature-custom-choice hidden" data-custom-choice-for="${escapeHtml(field.label)}" data-category-kind="${field.categoryKind || 'expense'}" placeholder="${t('recordCategories.custom_placeholder')}" />
          <small class="feature-field-hint">${t('recordCategories.custom_hint')}</small>
        ` : ''}
      </div>
    `;
  }

  if (field.type === 'checks') {
    return `
      <div class="feature-field">
        <span>${field.label}</span>
        <div class="feature-check-grid">
          ${field.options.map((option, index) => `
            <label>
              <input type="checkbox" ${index < 3 ? 'checked' : ''} />
              <b>${option}</b>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (field.type === 'upload') {
    return `
      <div class="feature-field">
        <span>${field.label}</span>
        <input type="file" class="feature-upload-input hidden" data-upload-label="${field.label}" />
        <button class="feature-upload" type="button" data-upload-trigger>
          ${window.__icons?.upload}
          <strong>${t('featureForm.choose_file')}</strong>
          <small>${t('featureForm.file_hint')}</small>
        </button>
      </div>
    `;
  }

  if (field.type === 'upload-pair') {
    return `
      <div class="feature-photo-pair">
        <div class="feature-field">
          <span>${field.before}</span>
          <input type="file" class="feature-upload-input hidden" data-upload-label="${field.before}" accept="image/*" />
          <button class="feature-upload" type="button" data-upload-trigger>
            ${window.__icons?.camera}
            <strong>${field.before}</strong>
            <small>${t('featureForm.old_record')}</small>
          </button>
        </div>
        <div class="feature-field">
          <span>${field.after}</span>
          <input type="file" class="feature-upload-input hidden" data-upload-label="${field.after}" accept="image/*" />
          <button class="feature-upload" type="button" data-upload-trigger>
            ${window.__icons?.camera}
            <strong>${field.after}</strong>
            <small>${t('featureForm.new_record')}</small>
          </button>
        </div>
      </div>
    `;
  }

  if (field.type === 'preview-card') {
    const state = getState();
    const pet = getActivePet(state.activePetId);
    const previewToken = pet.publicProfileToken || `preview-${pet.id || state.activePetId || 'pet'}`;
    const previewUrl = `${window.location.origin}${window.location.pathname}#/public/pet/${previewToken}`;
    return `
      <div class="feature-qr-preview" data-qr-url="${previewUrl}">
        <div>
          <small>${t('featureForm.emergency_card')}</small>
          <strong>${pet.name}</strong>
          <span>${pet.breed || t('featureForm.profile')} ${t('featureForm.separator')} ${pet.weight || '0'} kg ${t('featureForm.separator')} ${pet.statusText || t('featureForm.health_profile')}</span>
        </div>
        <div class="feature-qr-box">
          <span>QR</span>
        </div>
      </div>
    `;
  }

  return '';
}

function renderDocumentOcrPanel() {
  return `
    <div class="feature-form-card document-ocr-panel" id="documentOcrPanel">
      <div class="info-box info">
        <span class="info-box-icon">${window.__icons?.spark || window.__icons?.upload || ''}</span>
        <span>${t('featureForm.ocr_info')}</span>
      </div>
      <div class="feature-bottom-actions" style="padding: 0; margin-top: 14px;">
        <button class="btn btn-outline btn-full" id="btnRunDocumentOcr" type="button">
          <span class="modern-button-icon">${window.__icons?.search || window.__icons?.spark || ''}</span> ${t('featureForm.read_with_ai')}
        </button>
      </div>
      <div class="feature-form-notice hidden" id="documentOcrResult" role="status"></div>
    </div>
  `;
}

export function render(params = {}, query = {}) {
  const state = getState();
  const pet = getActivePet(state.activePetId);
  const config = withDynamicFields(params.featureId, featureForms()[params.featureId]);

  if (!config) {
    return `
      <div class="screen premium-check feature-form-screen">
        <div class="header premium-soft-header">
          <div class="header-left">
            <button class="header-back" id="btnBack">${window.__icons?.back}</button>
          </div>
          <div class="header-title">${t('featureForm.not_found_title')}</div>
          <div class="header-right">
            <span class="premium-header-shield">${window.__icons?.search || window.__icons?.clipboard}</span>
          </div>
        </div>

        <div class="section pt-4 pb-24">
          <div class="empty-state">
            <div class="empty-state-icon">${window.__icons?.search || ''}</div>
            <div class="empty-state-title">${t('featureForm.form_removed')}</div>
            <div class="empty-state-desc">${t('featureForm.form_removed_desc')}</div>
            <button class="btn btn-primary btn-full mt-4" id="btnGoHome">${t('featureForm.go_home')}</button>
          </div>
        </div>
      </div>
    `;
  }

  const planCode = state.subscription?.planCode || state.subscription?.tier || 'free';
  if (!PAYMENTS_DISABLED && config.requiresPaid && planCode === 'free') {
    return `
      <div class="screen premium-check feature-form-screen">
        <div class="header premium-soft-header">
          <div class="header-left">
            <button class="header-back" id="btnBack">${window.__icons?.back}</button>
          </div>
          <div class="header-title">${config.title}</div>
          <div class="header-right">
            <span class="premium-header-shield">${window.__icons?.lock || window.__icons?.spark}</span>
          </div>
        </div>

        <div class="section pt-4 pb-24">
          <div class="feature-form-hero ${config.tone}">
            <div class="premium-icon-box">${window.__icons?.lock || window.__icons?.spark}</div>
            <div>
              <div class="premium-screen-kicker">${t('featureForm.paid_kicker')}</div>
              <h1>${config.title}</h1>
              <p>${config.desc} ${t('featureForm.paid_desc_suffix')}</p>
            </div>
          </div>

          <div class="feature-form-card">
            <div class="info-box">
              <span class="info-box-icon">${window.__icons?.shield || ''}</span>
              <span>${t('featureForm.paid_info')}</span>
            </div>
          </div>

          <div class="feature-bottom-actions">
            <button class="btn btn-primary btn-full" disabled>${t('featureForm.store_update_later')}</button>
            <button class="btn btn-ghost btn-full" id="btnCancel">${t('common.cancel')}</button>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="screen premium-check feature-form-screen">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${config.title}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.[config.icon] || window.__icons?.clipboard}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero ${config.tone}">
          <div class="premium-icon-box">${window.__icons?.[config.icon] || window.__icons?.clipboard}</div>
          <div>
            <div class="premium-screen-kicker">${config.eyebrow}</div>
            <h1>${config.title}</h1>
            <p>${t('featureForm.hero_desc').replace('{name}', pet.name).replace('{desc}', config.desc)}</p>
          </div>
        </div>

        <div class="feature-form-card">
          ${config.fields.map((field) => renderField(field, query)).join('')}
        </div>

        ${params.featureId === 'document-ai' ? renderDocumentOcrPanel() : ''}

        <div class="feature-form-notice hidden" id="featureFormNotice" role="status"></div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnSaveFeature">${t('common.save')}</button>
          <button class="btn btn-ghost btn-full" id="btnCancel">${t('common.cancel')}</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  let currentDocumentOcrResult = null;

  function showNotice(message, tone = 'info') {
    const notice = document.getElementById('featureFormNotice');
    if (!notice) return;
    notice.textContent = message;
    notice.className = `feature-form-notice ${tone}`;
  }

  function normalizeFieldLabel(value) {
    return String(value || '')
      .replace(t('featureForm.required_marker'), '')
      .replace(/\s+\*$/, '')
      .trim();
  }

  function firstSelected(label) {
    const field = [...document.querySelectorAll('.feature-field')]
      .find((item) => normalizeFieldLabel(item.querySelector(':scope > span')?.textContent) === label);
    return field?.querySelector('button.selected')?.textContent?.trim() || '';
  }

  function checkedValues(label) {
    const field = [...document.querySelectorAll('.feature-field')]
      .find((item) => normalizeFieldLabel(item.querySelector(':scope > span')?.textContent) === label);
    return [...(field?.querySelectorAll('input[type="checkbox"]') || [])]
      .filter((input) => input.checked)
      .map((input) => input.parentElement?.textContent?.trim() || '')
      .filter(Boolean);
  }

  function textareaValue(label) {
    const field = [...document.querySelectorAll('.feature-field')]
      .find((item) => normalizeFieldLabel(item.querySelector(':scope > span')?.textContent) === label);
    return field?.querySelector('textarea')?.value || '';
  }

  function ocrSummaryText(result) {
    const labs = (result.labValues || []).slice(0, 5).map((item) => `${item.name}: ${item.value} ${item.unit || ''}`.trim());
    const meds = (result.medications || []).slice(0, 4).map((item) => [item.name, item.doseText, item.frequency].filter(Boolean).join(' · '));
    const tasks = (result.followupTasks || []).slice(0, 3).map((item) => [item.title, item.dueDate].filter(Boolean).join(' · '));
    return [
      result.summary,
      result.documentDate ? `${t('featureForm.labels.date')}: ${result.documentDate}` : '',
      result.clinic ? `${t('featureForm.labels.clinic')}: ${result.clinic}` : '',
      result.invoice?.total ? `${t('featureForm.labels.amount')}: ${result.invoice.total} ${result.invoice.currency || ''}` : '',
      labs.length ? `${t('featureForm.labels.lab')}: ${labs.join(', ')}` : '',
      meds.length ? `${t('featureForm.labels.medications')}: ${meds.join(', ')}` : '',
      tasks.length ? `${t('featureForm.labels.followup')}: ${tasks.join(', ')}` : ''
    ].filter(Boolean).join('\n');
  }

  function renderOcrResult(result) {
    const box = document.getElementById('documentOcrResult');
    if (!box) return;
    box.className = 'feature-form-notice success';
    box.innerHTML = `
      <strong>${t('featureForm.ocr_completed')}</strong>
      <div class="mt-1">${escapeHtml(result.summary || t('featureForm.ocr_default_summary'))}</div>
      <div class="text-xs mt-1">${t('featureForm.confidence')}: ${Math.round(result.confidence || 0)} / 100${result.warnings?.length ? `${t('featureForm.separator')} ${t('featureForm.warning')}: ${escapeHtml(result.warnings[0])}` : ''}</div>
    `;
  }

  async function renderQrImage(url) {
    const box = document.querySelector('.feature-qr-box');
    if (!box || !url) return;
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: 1,
        scale: 5,
        color: {
          dark: '#003D34',
          light: '#FFFFFF'
        }
      });
      box.innerHTML = `<img src="${dataUrl}" alt="${t('featureForm.qr_alt')}" />`;
      box.dataset.qrGenerated = 'true';
    } catch {
      box.innerHTML = '<span>QR</span>';
    }
  }

  function collectPayload() {
    const fields = {};
    document.querySelectorAll('.feature-field').forEach((field) => {
      const label = normalizeFieldLabel(field.querySelector(':scope > span')?.textContent);
      if (!label) return;

      const textInput = field.querySelector('input[type="text"], input[type="number"], input[type="date"], input[type="datetime-local"], textarea');
      if (textInput) {
        fields[label] = textInput.value || '';
        return;
      }

      const selectedButtons = [...field.querySelectorAll('button.selected')].map((btn) => {
        if (btn.dataset.choiceValue === otherCategoryValue()) {
          return field.querySelector('.feature-custom-choice')?.value?.trim() || btn.textContent.trim();
        }
        return btn.textContent.trim();
      });
      if (selectedButtons.length) {
        fields[label] = selectedButtons;
        return;
      }

      const checks = [...field.querySelectorAll('input[type="checkbox"]')].map((input) => ({
        label: input.parentElement?.textContent?.trim() || '',
        checked: input.checked
      }));
      if (checks.length) {
        fields[label] = checks;
      }
    });

    const mediaFiles = [...document.querySelectorAll('.feature-upload-input')]
      .filter((input) => input.files?.[0])
      .map((input) => {
        const file = input.files[0];
        return {
          label: input.dataset.uploadLabel || '',
          name: file.name,
          mime_type: file.type,
          file_size_bytes: file.size,
          local_uri: `local://${file.name}`
        };
      });
    if (mediaFiles.length) fields.__media_files = mediaFiles;

    const qrPreview = document.querySelector('.feature-qr-preview')?.textContent?.trim();
    if (qrPreview) fields.qr_preview = qrPreview;
    if (currentDocumentOcrResult) fields.__ai_ocr_result = currentDocumentOcrResult;

    return fields;
  }

  function validateRequiredFields() {
    const missingText = [...document.querySelectorAll('[data-required="true"]')]
      .filter((input) => !input.value?.trim());
    const missingChoice = [...document.querySelectorAll('[data-required-choice="true"]')]
      .filter((group) => !group.querySelector('button.selected'));
    const missingCustom = [...document.querySelectorAll('.feature-custom-choice:not(.hidden)')]
      .filter((input) => !input.value?.trim());
    if (!missingText.length && !missingChoice.length && !missingCustom.length) return true;
    const target = missingText[0] || missingCustom[0] || missingChoice[0]?.closest('.feature-field');
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    missingText[0]?.focus?.();
    showNotice(t('featureForm.required_error'), 'error');
    return false;
  }

  document.getElementById('btnRunDocumentOcr')?.addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    const originalText = btn.textContent;
    const file = document.querySelector('.feature-upload-input')?.files?.[0];
    if (!file) {
      showNotice(t('featureForm.file_required'), 'error');
      return;
    }
    if (!isDocumentOcrConfigured()) {
      showNotice(t('featureForm.ocr_not_ready'), 'error');
      return;
    }
    const credit = await getFeatureCreditAvailability({ userId: state.user?.id || 'user-1', featureCode: 'document-ocr' });
    if (!credit.ok) {
      showNotice(t('planScreen.insufficient_credits'), 'error');
      return;
    }

    btn.textContent = t('featureForm.reading_document');
    btn.disabled = true;
    try {
      const response = await runDocumentOcr({
        file,
        userId: state.user?.id || 'user-1',
        petId: state.activePetId || '',
        documentKind: firstSelected(t('featureForm.labels.document_type')),
        readGoal: firstSelected(t('featureForm.labels.read_goal')),
        extractionOptions: checkedValues(t('featureForm.labels.extraction_options')),
        note: textareaValue(t('featureForm.labels.extra_note'))
      });
      if (!response.ok) throw new Error(response.reason || 'ocr_failed');
      if (!response.usage) {
        await recordFeatureUsage({ userId: state.user?.id || 'user-1', petId: state.activePetId || null, featureCode: 'document-ocr' });
      }
      currentDocumentOcrResult = response.data;
      renderOcrResult(response.data);
      const visibleValues = [...document.querySelectorAll('.feature-field')]
        .find((item) => item.querySelector(':scope > span')?.textContent?.trim() === t('featureForm.labels.visible_values'))
        ?.querySelector('textarea');
      if (visibleValues && !visibleValues.value.trim()) visibleValues.value = ocrSummaryText(response.data);
    } catch (err) {
      showNotice(formatErrorForDeveloper(err, t('featureForm.ocr_failed')), 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });

  const qrPreview = document.querySelector('.feature-qr-preview');
  if (qrPreview?.dataset.qrUrl) renderQrImage(qrPreview.dataset.qrUrl);

  document.querySelectorAll('.feature-chip-row button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = btn.parentElement;
      if (group?.dataset.choiceMode === 'single') {
        group.querySelectorAll('button').forEach((item) => item.classList.remove('selected'));
        btn.classList.add('selected');
        const customInput = group.parentElement?.querySelector('.feature-custom-choice');
        if (customInput) {
          customInput.classList.toggle('hidden', btn.dataset.choiceValue !== otherCategoryValue());
          if (btn.dataset.choiceValue === otherCategoryValue()) customInput.focus();
        }
        return;
      }
      btn.classList.toggle('selected');
    });
  });

  document.querySelectorAll('.feature-score-row button').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.parentElement?.querySelectorAll('button').forEach((item) => item.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  document.querySelectorAll('[data-upload-trigger]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.parentElement?.querySelector('.feature-upload-input')?.click();
    });
  });

  document.querySelectorAll('.feature-upload-input').forEach((input) => {
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      const button = input.parentElement?.querySelector('.feature-upload');
      if (!file || !button) return;
      const title = button.querySelector('strong');
      const desc = button.querySelector('small');
      if (title) title.textContent = file.name;
      if (desc) desc.textContent = `${file.type || t('featureForm.file')} ${t('featureForm.separator')} ${Math.ceil(file.size / 1024)} KB`;
    });
  });

  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnGoHome')?.addEventListener('click', () => navigate('/home'));
  document.getElementById('btnCancel')?.addEventListener('click', () => goBack());
  document.getElementById('btnSaveFeature')?.addEventListener('click', async (event) => {
    if (!validateRequiredFields()) return;
    if (!state.activePetId) {
      showNotice(t('petsService.pet_required'), 'error');
      return;
    }
    const btn = event.currentTarget;
    const originalText = btn.textContent;
    btn.textContent = t('common.saving');
    btn.disabled = true;

    try {
      const featureCode = window.location.hash.split('/feature/')[1]?.split('?')[0] || 'unknown';
      const featurePayload = collectPayload();
      if (featureCode === 'expense') {
        const category = featurePayload[t('featureForm.labels.category')];
        if (category && category !== t('recordCategories.other')) addRecordCategory('expense', category);
      }
      if (featureCode === 'reminders') {
        const category = featurePayload[t('featureForm.labels.reminder_type')];
        if (category && category !== t('recordCategories.other')) addRecordCategory('reminder', category);
      }
      if (featureCode === 'document-ai') {
        const file = document.querySelector('.feature-upload-input')?.files?.[0];
        if (file) {
          try {
            const uploaded = await uploadMediaFile({
              userId: state.user?.id || 'user-1',
              petId: state.activePetId || '',
              category: 'documents',
              file,
              relatedEntityType: 'document'
            });
            featurePayload.__media_files = (featurePayload.__media_files || []).map((item) => item.name === file.name ? {
              ...item,
              object_key: uploaded.objectKey,
              media_id: uploaded.id || '',
              storage: 'b2'
            } : item);
          } catch {
            showNotice(t('featureForm.local_document_notice'), 'info');
          }
        }
      }
      const result = await submitFeatureForm({
        userId: state.user?.id || 'user-1',
        petId: state.activePetId || '',
        featureCode,
        locale: state.user?.locale || 'tr',
        payload: featurePayload
      });
      if (result.storage === 'turso') {
        const target = result.domainTable ? t('featureForm.domain_table_saved').replace('{table}', result.domainTable) : '';
        showNotice(t('featureForm.turso_saved').replace('{target}', target), 'success');
      } else {
        showNotice(t('featureForm.local_saved'), 'success');
      }
      if (featureCode === 'qr' && result.publicPath) {
        await renderQrImage(`${window.location.origin}${window.location.pathname}#${result.publicPath}`);
      }
      if (featureCode === 'sitter' && result.invitePath) {
        const inviteUrl = `${window.location.origin}${window.location.pathname}#${result.invitePath}`;
        const shareText = result.inviteText || t('featureForm.sitter_invite_ready');
        try {
          if (navigator.share) await navigator.share({ title: t('featureForm.sitter_invite_title'), text: shareText, url: inviteUrl });
          else await navigator.clipboard.writeText(`${shareText}\n${inviteUrl}`);
        } catch {}
      }
      if (featureCode === 'reminders') {
        syncUpcomingNativeReminders({ requestPermission: true }).catch(() => {});
      }
      const nextRoute = featureCode === 'expense' ? '/history/expenses'
        : featureCode === 'reminders' ? '/history/reminders'
        : ['clinic-export', 'document-ai', 'vet-prep'].includes(featureCode) ? '/reports'
        : featureCode === 'sitter' && result.invitePath ? result.invitePath
        : featureCode === 'qr' && result.publicPath ? result.publicPath
        : '/home';
      navigate(nextRoute);
    } catch (err) {
      showNotice(formatErrorForDeveloper(err, t('featureForm.save_failed')), 'error');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}
