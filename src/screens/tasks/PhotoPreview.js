import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { analyzePhotoQuality } from '../../services/mediaQuality.js';
import { isMediaQualityCheckEnabled } from '../../services/appSettings.js';

function renderQualityPanel(result = null) {
  if (!result) {
    return `<div class="media-quality-panel" id="qualityPanel"><strong>${t('qualityCheck.analyzing')}</strong><p>${t('qualityCheck.analyzing_desc')}</p></div>`;
  }
  const issues = result.issues || [];
  return `
    <div class="media-quality-panel ${result.level}" id="qualityPanel">
      <div class="media-quality-head">
        <div><strong>${t(`qualityCheck.levels.${result.level}`)}</strong><p>${t('qualityCheck.score', { score: result.score })}</p></div>
        <span>${result.score}</span>
      </div>
      ${issues.length ? `<ul>${issues.slice(0, 3).map(item => `<li>${t(item.messageKey)}</li>`).join('')}</ul>` : `<p>${t('qualityCheck.good_photo')}</p>`}
      <small>${t('qualityCheck.photo_meta', { width: result.metrics.width, height: result.metrics.height, brightness: result.metrics.brightness })}</small>
    </div>
  `;
}

export function render(params = {}) {
  const state = getState();
  const taskId = params.taskId || '';
  const session = state.session || {};
  const task = (session.tasks || []).find(tk => tk.id === taskId);
  const taskTitle = task ? task.title : t('tasks.take_photo');
  const media = (session.media || []).filter(item => item.taskId === taskId && item.type === 'photo');
  const lastMedia = media[media.length - 1] || null;
  const qualityEnabled = isMediaQualityCheckEnabled();
  const previewHtml = lastMedia?.dataUrl
    ? `<img src="${lastMedia.dataUrl}" alt="${taskTitle}" style="width: 100%; height: 100%; object-fit: cover;" />`
    : `<div style="text-align: center;"><div style="width: 64px; margin: 0 auto var(--space-2);">${window.__icons?.camera || ''}</div><div style="font-size: var(--font-size-sm); color: var(--text-tertiary);">${t('photoPreview.title')}</div></div>`;

  return `
    <div class="screen">
      <div class="header">
        <div class="header-left">
          <button class="header-back" id="backBtn">${window.__icons?.back || '<'}</button>
        </div>
        <div class="header-title">${taskTitle}</div>
        <div class="header-right">
          <span style="font-size: var(--font-size-xs); color: var(--text-tertiary);">${state.version}</span>
        </div>
      </div>

      <div style="padding: var(--space-4); padding-bottom: var(--space-32);">
        <div class="preview-image" style="background: linear-gradient(135deg, var(--gray-100), var(--gray-200)); overflow: hidden;">
          ${previewHtml}
        </div>

        ${qualityEnabled && lastMedia?.dataUrl ? renderQualityPanel(lastMedia?.qualityCheck || null) : ''}

        <div class="card card-bordered" style="margin-bottom: var(--space-4);">
          <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3);">
            <span style="width: 20px;">${window.__icons?.search || ''}</span>
            <span style="font-weight: 700; font-size: var(--font-size-base);">${t('tasks.photo_quality')}</span>
          </div>
          <div style="display: flex; gap: var(--space-2);">
            <button class="chip quality-chip selected" data-quality="yes" id="qualityYes">${t('common.yes')}</button>
            <button class="chip quality-chip" data-quality="no" id="qualityNo">${t('common.no')}</button>
            <button class="chip quality-chip" data-quality="unsure" id="qualityUnsure">${t('redflags.unsure')}</button>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: var(--space-6);">
          <label style="font-size: var(--font-size-sm); font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: var(--space-2);">
            ${t('tasks.add_note')}
          </label>
          <textarea id="noteTextarea" class="complaint-textarea" placeholder="${t('tasks.optional_note')}" style="width: 100%; box-sizing: border-box; min-height: 80px;"></textarea>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          <button class="btn btn-primary btn-full btn-lg" id="useBtn">${t('tasks.use')}</button>
          <button class="btn btn-outline btn-full" id="retakeBtn">${t('tasks.retake')}</button>
          <button class="btn btn-ghost btn-full" id="cancelBtn">${t('common.cancel')}</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  const taskId = params.taskId || '';
  const state = getState();
  const lastMedia = (state.session?.media || []).filter(item => item.taskId === taskId && item.type === 'photo').slice(-1)[0];
  const qualityEnabled = isMediaQualityCheckEnabled();

  if (qualityEnabled && lastMedia?.dataUrl && !lastMedia.qualityCheck) {
    analyzePhotoQuality(lastMedia.dataUrl).then((result) => {
      setState(s => {
        const media = (s.session.media || []).find(item => item.id === lastMedia.id);
        if (media) media.qualityCheck = result;
      });
      const panel = document.getElementById('qualityPanel');
      if (panel) panel.outerHTML = renderQualityPanel(result);
      const noButton = document.getElementById('qualityNo');
      const unsureButton = document.getElementById('qualityUnsure');
      const yesButton = document.getElementById('qualityYes');
      if (result.level === 'poor' && noButton) noButton.click();
      else if (result.level === 'watch' && unsureButton) unsureButton.click();
      else if (yesButton) yesButton.click();
    }).catch(() => {
      const panel = document.getElementById('qualityPanel');
      if (panel) panel.outerHTML = `<div class="media-quality-panel watch" id="qualityPanel"><strong>${t('qualityCheck.manual_check')}</strong><p>${t('qualityCheck.manual_check_desc')}</p></div>`;
    });
  }

  document.getElementById('backBtn')?.addEventListener('click', () => goBack());

  document.querySelectorAll('.quality-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.quality-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });

  document.getElementById('useBtn')?.addEventListener('click', () => {
    const note = document.getElementById('noteTextarea')?.value || '';
    const quality = document.querySelector('.quality-chip.selected')?.dataset.quality || 'yes';
    setState(s => {
      const task = (s.session.tasks || []).find(tk => tk.id === taskId);
      if (task) {
        task.status = 'completed';
        task.note = note;
        task.quality = quality;
      }
      const media = (s.session.media || []).slice().reverse().find(item => item.taskId === taskId && item.type === 'photo');
      if (media) {
        media.quality = quality;
        media.note = note;
      }
      if (qualityEnabled && task && media?.qualityCheck) task.qualityCheck = media.qualityCheck;
      if (!s.session.mediaCount) s.session.mediaCount = { photo: 0, video: 0, audio: 0 };
      s.session.mediaCount.photo = (s.session.media || []).filter(item => item.type === 'photo').length;
    });
    navigate('/check/new/task-plan');
  });

  document.getElementById('retakeBtn')?.addEventListener('click', () => {
    setState(s => {
      if (s.session.media && s.session.media.length > 0) s.session.media.pop();
    });
    navigate(`/check/new/photo/${taskId}/capture`);
  });

  document.getElementById('cancelBtn')?.addEventListener('click', () => {
    setState(s => {
      s.session.media = (s.session.media || []).filter(item => item.taskId !== taskId);
    });
    navigate('/check/new/task-plan');
  });
}
