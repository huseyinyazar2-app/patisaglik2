// Pati Sağlık — Video Preview Screen
import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';

export function render(params = {}, query = {}) {
  const state = getState();
  const taskId = params.taskId || '';
  const session = state.session || {};
  const task = (session.tasks || []).find(tk => tk.id === taskId);
  const taskTitle = task ? task.title : t('tasks.record_video');

  // Find related media for duration info
  const media = (session.media || []).filter(m => m.taskId === taskId && m.type === 'video');
  const lastMedia = media.length > 0 ? media[media.length - 1] : null;
  const duration = lastMedia ? lastMedia.duration || 0 : 0;
  const durationStr = `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`;

  return `
    <div class="screen">
      <!-- Header -->
      <div class="header">
        <div class="header-left">
          <button class="header-back" id="backBtn">←</button>
        </div>
        <div class="header-title">${taskTitle}</div>
        <div class="header-right">
          <span style="font-size: var(--font-size-xs); color: var(--text-tertiary);">${state.version}</span>
        </div>
      </div>

      <div style="padding: var(--space-4); padding-bottom: var(--space-32);">
        <!-- Video Preview -->
        <div class="preview-image" style="background: linear-gradient(135deg, #1a1a2e, #16213e); position: relative; cursor: pointer;" id="videoPlayer">
          <div style="text-align: center;">
            <div id="playIcon" style="width: 64px; height: 64px; border-radius: var(--radius-full); background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-2); backdrop-filter: blur(4px);">
              <span style="font-size: 32px; margin-left: 4px;">▶️</span>
            </div>
            <div style="color: rgba(255,255,255,0.7); font-size: var(--font-size-sm);">
              ${durationStr}
            </div>
          </div>

          <!-- Progress bar mock -->
          <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.2);">
            <div id="progressBar" style="width: 0%; height: 100%; background: var(--primary); transition: width 0.3s linear;"></div>
          </div>
        </div>

        <!-- Quality Check -->
        <div class="card card-bordered" style="margin-bottom: var(--space-4);">
          <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3);">
            <span style="font-size: 20px;">🔍</span>
            <span style="font-weight: 700; font-size: var(--font-size-base);">${t('tasks.video_quality')}</span>
          </div>
          <div style="display: flex; gap: var(--space-2);">
            <button class="chip quality-chip selected" data-quality="yes">✅ ${t('common.yes')}</button>
            <button class="chip quality-chip" data-quality="no">❌ ${t('common.no')}</button>
          </div>
        </div>

        <!-- Note Textarea -->
        <div class="form-group" style="margin-bottom: var(--space-6);">
          <label style="font-size: var(--font-size-sm); font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: var(--space-2);">
            📝 ${t('tasks.add_note')}
          </label>
          <textarea
            id="noteTextarea"
            class="complaint-textarea"
            placeholder="Opsiyonel not..."
            style="width: 100%; box-sizing: border-box; min-height: 80px;"
          ></textarea>
        </div>

        <!-- Actions -->
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          <button class="btn btn-primary btn-full btn-lg" id="useBtn">
            ✅ ${t('tasks.use')}
          </button>
          <button class="btn btn-outline btn-full" id="retakeBtn">
            🔄 ${t('tasks.retake')}
          </button>
          <button class="btn btn-ghost btn-full" id="cancelBtn">
            ❌ ${t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}, query = {}) {
  const taskId = params.taskId || '';
  let isPlaying = false;
  let playTimer = null;

  document.getElementById('backBtn')?.addEventListener('click', () => {
    if (playTimer) clearInterval(playTimer);
    goBack();
  });

  // Quality chips
  document.querySelectorAll('.quality-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.quality-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });

  // Mock video playback
  document.getElementById('videoPlayer')?.addEventListener('click', () => {
    const playIcon = document.getElementById('playIcon');
    const progressBar = document.getElementById('progressBar');

    if (!isPlaying) {
      isPlaying = true;
      if (playIcon) playIcon.innerHTML = '<span style="font-size: 32px;">⏸️</span>';
      let progress = 0;
      playTimer = setInterval(() => {
        progress += 2;
        if (progressBar) progressBar.style.width = `${Math.min(progress, 100)}%`;
        if (progress >= 100) {
          clearInterval(playTimer);
          isPlaying = false;
          if (playIcon) playIcon.innerHTML = '<span style="font-size: 32px; margin-left: 4px;">▶️</span>';
          if (progressBar) progressBar.style.width = '0%';
        }
      }, 100);
    } else {
      isPlaying = false;
      if (playTimer) clearInterval(playTimer);
      if (playIcon) playIcon.innerHTML = '<span style="font-size: 32px; margin-left: 4px;">▶️</span>';
    }
  });

  document.getElementById('useBtn')?.addEventListener('click', () => {
    if (playTimer) clearInterval(playTimer);
    const note = document.getElementById('noteTextarea')?.value || '';
    const quality = document.querySelector('.quality-chip.selected')?.dataset.quality || 'yes';
    setState(s => {
      const task = (s.session.tasks || []).find(tk => tk.id === taskId);
      if (task) {
        task.status = 'completed';
        task.note = note;
        task.quality = quality;
      }
      if (!s.session.media) s.session.media = [];
      s.session.media.push({ taskId, type: 'video', quality, note });
      if (!s.session.mediaCount) s.session.mediaCount = { photo: 0, video: 0, audio: 0 };
      s.session.mediaCount.video = (s.session.mediaCount.video || 0) + 1;
    });
    navigate('/check/new/task-plan');
  });

  document.getElementById('retakeBtn')?.addEventListener('click', () => {
    if (playTimer) clearInterval(playTimer);
    setState(s => {
      s.session.media = (s.session.media || []).filter(m => !(m.taskId === taskId && m.type === 'video'));
    });
    navigate(`/check/new/video/${taskId}/capture`);
  });

  document.getElementById('cancelBtn')?.addEventListener('click', () => {
    if (playTimer) clearInterval(playTimer);
    setState(s => {
      s.session.media = (s.session.media || []).filter(m => m.taskId !== taskId);
    });
    navigate('/check/new/task-plan');
  });
}
