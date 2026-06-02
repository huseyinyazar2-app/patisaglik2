import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';

export function render(params = {}, query = {}) {
  const state = getState();
  const taskId = params.taskId || '';
  const session = state.session || {};
  const task = (session.tasks || []).find(tk => tk.id === taskId);
  const taskTitle = task ? task.title : t('tasks.take_photo');

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
        <!-- Preview Image -->
        <div class="preview-image" style="background: linear-gradient(135deg, var(--gray-100), var(--gray-200));">
          <div style="text-align: center;">
            <div style="font-size: 64px; margin-bottom: var(--space-2);">📸</div>
            <div style="font-size: var(--font-size-sm); color: var(--text-tertiary);">${t('photoPreview.title')}</div>
          </div>
        </div>

        <!-- Quality Check -->
        <div class="card card-bordered" style="margin-bottom: var(--space-4);">
          <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3);">
            <span style="font-size: 20px;">🔍</span>
            <span style="font-weight: 700; font-size: var(--font-size-base);">${t('tasks.photo_quality')}</span>
          </div>
          <div style="display: flex; gap: var(--space-2);">
            <button class="chip quality-chip selected" data-quality="yes" id="qualityYes">
              ✅ ${t('common.yes')}
            </button>
            <button class="chip quality-chip" data-quality="no" id="qualityNo">
              ❌ ${t('common.no')}
            </button>
            <button class="chip quality-chip" data-quality="unsure" id="qualityUnsure">
              🤔 ${t('redflags.unsure')}
            </button>
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

  document.getElementById('backBtn')?.addEventListener('click', () => {
    goBack();
  });

  // Quality chip selection
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
      // Mark task as completed
      const task = (s.session.tasks || []).find(tk => tk.id === taskId);
      if (task) {
        task.status = 'completed';
        task.note = note;
        task.quality = quality;
      }
      if (!s.session.media) s.session.media = [];
      s.session.media.push({ taskId, type: 'photo', quality, note });
      // Update media count
      if (!s.session.mediaCount) s.session.mediaCount = { photo: 0, video: 0, audio: 0 };
      s.session.mediaCount.photo = (s.session.mediaCount.photo || 0) + 1;
    });
    navigate('/check/new/task-plan');
  });

  document.getElementById('retakeBtn')?.addEventListener('click', () => {
    // Remove last media entry and go back to capture
    setState(s => {
      if (s.session.media && s.session.media.length > 0) {
        s.session.media.pop();
      }
    });
    navigate(`/check/new/photo/${taskId}/capture`);
  });

  document.getElementById('cancelBtn')?.addEventListener('click', () => {
    // Remove media and go back to task plan
    setState(s => {
      s.session.media = (s.session.media || []).filter(m => m.taskId !== taskId);
    });
    navigate('/check/new/task-plan');
  });
}
