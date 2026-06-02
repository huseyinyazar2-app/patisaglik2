import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';

export function render(params = {}) {
  const state = getState();
  const taskId = params.taskId || '';
  const session = state.session || {};
  const task = (session.tasks || []).find(tk => tk.id === taskId);
  const taskTitle = task ? task.title : t('tasks.record_video');

  return `
    <div class="capture-screen">
      <div style="position: absolute; top: 0; left: 0; right: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%);">
        <button id="backBtn" style="width: 36px; height: 36px; border-radius: var(--radius-full); background: rgba(255,255,255,0.2); border: none; color: white; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;">${window.__icons?.back || '<'}</button>
        <span style="color: white; font-weight: 700; font-size: var(--font-size-md); text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${taskTitle}</span>
        <span style="font-size: var(--font-size-xs); color: rgba(255,255,255,0.6);">${state.version}</span>
      </div>

      <div class="capture-preview">
        <div style="position: absolute; inset: 0; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); display: flex; align-items: center; justify-content: center;">
          <div style="color: rgba(255,255,255,0.18); width: 86px;">${window.__icons?.video || ''}</div>
        </div>
        <div id="instructionText" style="position: absolute; bottom: var(--space-8); left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.78); font-size: var(--font-size-sm); text-align: center; max-width: 250px;">
          ${t('videoCapture.pick_video')}
        </div>
      </div>

      <div class="capture-controls">
        <button class="capture-btn-small" id="galleryBtn" title="${t('tasks.from_gallery')}">${window.__icons?.upload || ''}</button>
        <button class="capture-btn" id="recordBtn" style="background: var(--risk-critical); border-color: rgba(239,68,68,0.3);" title="${t('tasks.record_video')}">
          <div style="width: 58px; height: 58px; border-radius: var(--radius-full); background: var(--risk-critical); margin: auto;"></div>
        </button>
        <button class="capture-btn-small" id="flipBtn" title="${t('photoCapture.flip_camera')}">${window.__icons?.activity || ''}</button>
      </div>

      <input type="file" id="cameraInput" accept="video/*" capture="environment" hidden />
      <input type="file" id="galleryInput" accept="video/*" hidden />
    </div>
  `;
}

export function afterRender(params = {}) {
  const taskId = params.taskId || '';

  function saveSelectedVideo(file, source) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setState(s => {
        if (!s.session.media) s.session.media = [];
        s.session.media.push({
          id: `media-${Date.now()}`,
          taskId,
          type: 'video',
          source,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          dataUrl: reader.result,
          timestamp: new Date().toISOString()
        });
      });
      navigate(`/check/new/video/${taskId}/preview`);
    };
    reader.readAsDataURL(file);
  }

  document.getElementById('backBtn')?.addEventListener('click', () => goBack());
  document.getElementById('recordBtn')?.addEventListener('click', () => document.getElementById('cameraInput')?.click());
  document.getElementById('galleryBtn')?.addEventListener('click', () => document.getElementById('galleryInput')?.click());
  document.getElementById('flipBtn')?.addEventListener('click', () => document.getElementById('cameraInput')?.click());
  document.getElementById('cameraInput')?.addEventListener('change', event => saveSelectedVideo(event.target.files?.[0], 'camera'));
  document.getElementById('galleryInput')?.addEventListener('change', event => saveSelectedVideo(event.target.files?.[0], 'gallery'));
}
