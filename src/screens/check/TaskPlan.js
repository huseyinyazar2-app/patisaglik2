import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { showToast } from '../../ui/toast.js';

export function render() {
  const state = getState();
  const session = state.session || {};
  const tasks = session.tasks || [];

  const getTaskIcon = (type) => {
    switch (type) {
      case 'photo': return window.__icons?.camera;
      case 'video': return window.__icons?.video;
      case 'audio': return window.__icons?.mic;
      case 'measurement': return window.__icons?.measurement;
      case 'physical_exam': return window.__icons?.stethoscope;
      default: return window.__icons?.clipboard;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'required': return `<span class="chip-status required text-xs" style="padding: 2px 10px; border-radius: var(--radius-full); font-weight: 700; font-size: 10px;">${t('tasks.required')}</span>`;
      case 'recommended': return `<span class="chip-status recommended text-xs" style="padding: 2px 10px; border-radius: var(--radius-full); font-weight: 700; font-size: 10px;">${t('tasks.recommended')}</span>`;
      default: return `<span class="chip-status optional text-xs" style="padding: 2px 10px; border-radius: var(--radius-full); font-weight: 700; font-size: 10px;">${t('tasks.optional')}</span>`;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return `<div style="width: 18px; height: 18px; color: var(--risk-low); display: flex; align-items: center;">${window.__icons?.checkCircle}</div>`;
      case 'skipped': return `<div style="width: 18px; height: 18px; color: var(--gray-400); display: flex; align-items: center;">${window.__icons?.xCircle}</div>`;
      default: return `<div style="width: 18px; height: 18px; display: flex; align-items: center; color: var(--text-tertiary);">${window.__icons?.chevronRight}</div>`;
    }
  };

  const taskCardsHtml = tasks.map(task => `
    <div class="task-card card card-interactive ${task.status !== 'pending' ? 'completed' : ''}" data-task-id="${task.id}" data-task-type="${task.type}" style="display: flex; align-items: center; gap: 16px; padding: 16px; margin-bottom: 12px;">
      <div class="task-card-icon" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: var(--primary-50); color: var(--primary); border-radius: var(--radius-md); padding: 8px;">
        ${getTaskIcon(task.type)}
      </div>
      <div class="task-card-content" style="flex: 1;">
        <div class="flex items-center gap-2 mb-1" style="flex-wrap: wrap;">
          <div class="task-card-title" style="font-weight: 700; color: var(--text-primary); font-size: 14px;">${task.title}</div>
          ${task.status === 'pending' ? getPriorityBadge(task.priority) : ''}
        </div>
        <div class="task-card-desc" style="font-size: 11px; font-weight: 500; color: var(--text-tertiary);">
          ${task.status === 'completed' ? t('taskPlan.record_added') : task.status === 'skipped' ? t('tasks.skipped') : t('taskPlan.tap_to_start')}
        </div>
      </div>
      <div class="flex items-center ml-2">
        ${getStatusIcon(task.status)}
      </div>
    </div>
  `).join('');

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title" style="font-weight: 700;">${t('taskPlan.step_title')}</div>
        <div class="header-right"></div>
      </div>

      <div class="progress-bar" style="height: 5px; background: rgba(0,0,0,0.03);">
        <div class="progress-bar-fill" style="width: 60%; background: linear-gradient(90deg, var(--primary-dark) 0%, var(--primary) 100%); height: 100%;"></div>
      </div>

      <div class="section pt-6" style="padding-bottom: 140px;">
        <div class="premium-screen-kicker mb-2">${t('taskPlan.kicker')}</div>
        <h2 class="text-xl font-bold mb-2">${t('tasks.title')}</h2>
        <p class="text-sm text-secondary mb-6">${t('tasks.desc')}</p>

        <div class="task-list flex flex-col mb-6">
          ${taskCardsHtml || `<div class="empty-state">${t('taskPlan.no_tasks')}</div>`}
        </div>

        <button class="btn btn-outline btn-full flex items-center justify-center gap-2" id="btnAddCustomTask" style="padding: 12px; border-radius: var(--radius-lg); font-weight: 700; background: rgba(255,255,255,0.62);">
          <span style="width: 16px; height: 16px; display: inline-flex; align-items: center; color: var(--primary);">${window.__icons?.plus}</span> ${t('tasks.add_task')}
        </button>
      </div>

      <div class="card" style="position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--max-width); border-radius: 24px 24px 0 0; padding: 20px 24px; box-shadow: var(--shadow-xl); z-index: 10; border-top: 1px solid rgba(229, 222, 209, 0.8); background: rgba(255, 254, 251, 0.86); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);">
        <button class="btn btn-primary btn-full mb-3" id="btnCompleteTasks" style="padding: 14px; font-size: var(--font-size-md); border-radius: var(--radius-lg);">${t('tasks.complete_selected')}</button>
        <button class="btn btn-ghost btn-full text-secondary" id="btnSkipAll" style="font-weight: 700;">${t('tasks.skip_all')}</button>
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());

  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('click', () => {
      const taskId = card.dataset.taskId;
      const taskType = card.dataset.taskType;

      if (taskType === 'note') {
        const note = prompt(t('taskPlan.note_prompt'));
        if (note === null) return;
        setState(state => {
          const task = (state.session.tasks || []).find(t => t.id === taskId);
          if (task) {
            task.status = 'completed';
            task.note = note;
          }
        });
        navigate('/check/new/task-plan?ts=' + Date.now());
      }
      else if (taskType === 'photo' || taskType === 'comparison' || taskType === 'mixed') navigate(`/check/new/photo/${taskId}/guide`);
      else if (taskType === 'video') navigate(`/check/new/video/${taskId}/guide`);
      else if (taskType === 'audio') navigate(`/check/new/audio/${taskId}/guide`);
      else if (taskType === 'measurement') navigate(`/check/new/measurement/${taskId}`);
      else if (taskType === 'physical_exam') navigate(`/check/new/physical-exam/${taskId}`);
      else navigate(`/check/new/basic-kit/${taskId}`);
    });
  });

  document.getElementById('btnCompleteTasks')?.addEventListener('click', () => {
    const state = getState();
    const pendingRequired = (state.session.tasks || []).filter(t => t.status === 'pending' && t.priority === 'required');
    if (pendingRequired.length > 0) {
      showToast(t('taskPlan.required_missing', { count: pendingRequired.length }));
      return;
    }
    navigate('/check/new/summary');
  });
  document.getElementById('btnSkipAll')?.addEventListener('click', () => {
    const state = getState();
    const pendingRequired = (state.session.tasks || []).filter(t => t.status === 'pending' && t.priority === 'required');
    if (pendingRequired.length > 0) {
      showToast(t('taskPlan.required_skip_blocked', { count: pendingRequired.length }));
      return;
    }
    setState(current => {
      (current.session.tasks || []).forEach(task => {
        if (task.status === 'pending') task.status = 'skipped';
      });
    });
    navigate('/check/new/summary');
  });
}
