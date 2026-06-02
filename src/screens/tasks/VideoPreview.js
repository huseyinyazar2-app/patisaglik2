import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';

export function render(params = {}) {
  const state = getState();
  const taskId = params.taskId || '';
  const session = state.session || {};
  const task = (session.tasks || []).find(tk => tk.id === taskId);
  const taskTitle = task ? task.title : t('tasks.record_video');
  const media = (session.media || []).filter(item => item.taskId === taskId && item.type === 'video');
  const lastMedia = media[media.length - 1] || null;
  const previewHtml = lastMedia?.dataUrl
    ? `<video src="${lastMedia.dataUrl}" controls playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>`
    : `<div style="text-align: center;"><div style="width: 64px; margin: 0 auto var(--space-2);">${window.__icons?.video || ''}</div><div style="color: rgba(255,255,255,0.7); font-size: var(--font-size-sm);">${t('tasks.record_video')}</div></div>`;

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
        <div class="preview-image" style="background: linear-gradient(135deg, #1a1a2e, #16213e); overflow: hidden;">
          ${previewHtml}
        </div>

        <div class="card card-bordered" style="margin-bottom: var(--space-4);">
          <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3);">
            <span style="width: 20px;">${window.__icons?.search || ''}</span>
            <span style="font-weight: 700; font-size: var(--font-size-base);">${t('tasks.video_quality')}</span>
          </div>
          <div style="display: flex; gap: var(--space-2);">
            <button class="chip quality-chip selected" data-quality="yes">${t('common.yes')}</button>
            <button class="chip quality-chip" data-quality="no">${t('common.no')}</button>
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
      const media = (s.session.media || []).slice().reverse().find(item => item.taskId === taskId && item.type === 'video');
      if (media) {
        media.quality = quality;
        media.note = note;
      }
      if (!s.session.mediaCount) s.session.mediaCount = { photo: 0, video: 0, audio: 0 };
      s.session.mediaCount.video = (s.session.media || []).filter(item => item.type === 'video').length;
    });
    navigate('/check/new/task-plan');
  });

  document.getElementById('retakeBtn')?.addEventListener('click', () => {
    setState(s => {
      if (s.session.media && s.session.media.length > 0) s.session.media.pop();
    });
    navigate(`/check/new/video/${taskId}/capture`);
  });

  document.getElementById('cancelBtn')?.addEventListener('click', () => {
    setState(s => {
      s.session.media = (s.session.media || []).filter(item => item.taskId !== taskId);
    });
    navigate('/check/new/task-plan');
  });
}
