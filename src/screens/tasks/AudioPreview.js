import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';

export function render(params = {}, query = {}) {
  const taskId = params.taskId;
  
  return `
    <div class="screen bg-black">
      <div class="header text-white" style="border-bottom: 1px solid rgba(255,255,255,0.1); background: transparent;">
        <div class="header-left">
          <button class="header-icon text-white" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('audioPreview.title')}</div>
        <div class="header-right"></div>
      </div>
      
      <div class="flex flex-col justify-center items-center" style="flex: 1; padding: 24px;">
        <div class="preview-image" style="background: var(--gray-800); height: 160px; aspect-ratio: auto; width: 100%; border-radius: var(--radius-2xl);">
          <div class="flex flex-col items-center">
            <button class="btn btn-ghost" style="font-size: 48px; height: auto;">▶️</button>
            <div class="text-white mt-2 font-mono">00:04 / 00:04</div>
          </div>
        </div>
        
        <div class="w-full mt-6">
          <label class="text-white opacity-80 text-sm mb-2 block">${t('audioPreview.note_label')}</label>
          <textarea id="noteInput" class="complaint-textarea w-full text-white" style="background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2);" placeholder="${t('audioPreview.note_placeholder')}"></textarea>
        </div>
      </div>
      
      <div class="p-6 bg-gray-900 w-full" style="padding-bottom: env(safe-area-inset-bottom, 24px);">
        <button class="btn btn-primary btn-full mb-3" id="btnUse">${t('tasks.use')}</button>
        <div class="flex gap-3">
          <button class="btn btn-outline btn-full flex-1 border-gray-600 text-white" id="btnRetake">${t('tasks.rerecord')}</button>
          <button class="btn btn-ghost btn-full flex-1 text-gray-400" id="btnCancel">${t('common.cancel')}</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  const taskId = params.taskId;
  
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnCancel')?.addEventListener('click', () => navigate('/check/new/task-plan'));
  document.getElementById('btnRetake')?.addEventListener('click', () => goBack());
  
  document.getElementById('btnUse')?.addEventListener('click', () => {
    const note = document.getElementById('noteInput')?.value || '';
    setState(state => {
      if (state.session && state.session.tasks) {
        const task = state.session.tasks.find(t => t.id === taskId);
        if (task) {
          task.status = 'completed';
          task.note = note;
          task.quality = 'yes';
        }
      }
      if (!state.session.media) state.session.media = [];
      state.session.media.push({ taskId, type: 'audio', quality: 'yes', note });
      if (!state.session.mediaCount) state.session.mediaCount = { photo: 0, video: 0, audio: 0 };
      state.session.mediaCount.audio = (state.session.mediaCount.audio || 0) + 1;
    });
    navigate('/check/new/task-plan');
  });
}
