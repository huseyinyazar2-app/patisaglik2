import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { isMediaQualityCheckEnabled } from '../../services/appSettings.js';

export function render(params = {}) {
  const state = getState();
  const taskId = params.taskId || '';
  const session = state.session || {};
  const task = (session.tasks || []).find(tk => tk.id === taskId);
  const taskTitle = task ? task.title : t('tasks.take_photo');
  const qualityEnabled = isMediaQualityCheckEnabled();

  return `
    <div class="capture-screen">
      <div style="position: absolute; top: 0; left: 0; right: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%);">
        <button id="backBtn" style="width: 36px; height: 36px; border-radius: var(--radius-full); background: rgba(255,255,255,0.2); border: none; color: white; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;">${window.__icons?.back || '<'}</button>
        <span style="color: white; font-weight: 600; font-size: var(--font-size-sm); text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${taskTitle}</span>
        <span style="font-size: var(--font-size-xs); color: rgba(255,255,255,0.6);">${state.version}</span>
      </div>

      <div class="capture-preview">
        <div style="position: absolute; inset: 0; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); display: flex; align-items: center; justify-content: center;">
          <div style="color: rgba(255,255,255,0.15); width: 86px;">${window.__icons?.camera || ''}</div>
        </div>
        <div class="capture-frame" id="captureFrame">
          <span style="font-size: var(--font-size-xs); text-align: center; padding: var(--space-2);">${t('photoCapture.frame_hint')}</span>
        </div>
        <div style="position: absolute; inset: 0; pointer-events: none; opacity: 0.1;">
          <div style="position: absolute; left: 33.33%; top: 0; bottom: 0; width: 1px; background: white;"></div>
          <div style="position: absolute; left: 66.66%; top: 0; bottom: 0; width: 1px; background: white;"></div>
          <div style="position: absolute; top: 33.33%; left: 0; right: 0; height: 1px; background: white;"></div>
          <div style="position: absolute; top: 66.66%; left: 0; right: 0; height: 1px; background: white;"></div>
        </div>
        ${qualityEnabled ? `<div class="capture-quality-guide">
          <strong>${t('qualityCheck.before_photo_title')}</strong>
          <span>${t('qualityCheck.before_photo_desc')}</span>
        </div>` : ''}
      </div>

      <div class="capture-controls">
        <button class="capture-btn-small" id="galleryBtn" title="${t('tasks.from_gallery')}">${window.__icons?.upload || ''}</button>
        <button class="capture-btn" id="shutterBtn" title="${t('photoCapture.shoot')}">
          <div style="width: 58px; height: 58px; border-radius: var(--radius-full); background: white; margin: auto;"></div>
        </button>
        <button class="capture-btn-small" id="flipBtn" title="${t('photoCapture.flip_camera')}">${window.__icons?.activity || ''}</button>
      </div>

      <input type="file" id="cameraInput" accept="image/*" capture="environment" hidden />
      <input type="file" id="galleryInput" accept="image/*" hidden />
    </div>
  `;
}

export function afterRender(params = {}) {
  const taskId = params.taskId || '';

  function saveSelectedPhoto(file, source) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setState(s => {
        if (!s.session.media) s.session.media = [];
        s.session.media.push({
          id: `media-${Date.now()}`,
          taskId,
          type: 'photo',
          source,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          dataUrl: reader.result,
          timestamp: new Date().toISOString()
        });
      });
      navigate(`/check/new/photo/${taskId}/preview`);
    };
    reader.readAsDataURL(file);
  }

  document.getElementById('backBtn')?.addEventListener('click', () => goBack());
  document.getElementById('shutterBtn')?.addEventListener('click', () => {
    const frame = document.getElementById('captureFrame');
    if (frame) {
      frame.style.borderColor = 'rgba(14, 165, 233, 0.8)';
      frame.style.transition = 'all 0.2s ease';
    }
    document.getElementById('cameraInput')?.click();
  });
  document.getElementById('galleryBtn')?.addEventListener('click', () => document.getElementById('galleryInput')?.click());
  document.getElementById('flipBtn')?.addEventListener('click', () => document.getElementById('cameraInput')?.click());
  document.getElementById('cameraInput')?.addEventListener('change', event => saveSelectedPhoto(event.target.files?.[0], 'camera'));
  document.getElementById('galleryInput')?.addEventListener('change', event => saveSelectedPhoto(event.target.files?.[0], 'gallery'));
}
