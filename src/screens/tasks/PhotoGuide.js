import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { getActivePet } from '../../mock/pets.js';

export function render(params = {}, query = {}) {
  const state = getState();
  const pet = getActivePet(state.activePetId);
  const taskId = params.taskId || '';
  const session = state.session || {};
  const task = (session.tasks || []).find(tk => tk.id === taskId);
  const taskTitle = task ? task.title : t('tasks.take_photo');
  const priorityLabel = task ? t(`tasks.${task.priority}`) : '';

  const tips = t('taskGuides.photo_tips').map(tip => ({ ...tip, text: tip.text.replace('{name}', pet.name) }));

  return `
    <div class="screen">
      <!-- Header -->
      <div class="header">
        <div class="header-left">
          <button class="header-back" id="backBtn">←</button>
        </div>
        <div class="header-title">📷 ${taskTitle}</div>
        <div class="header-right">
          <span style="font-size: var(--font-size-xs); color: var(--text-tertiary);">${state.version}</span>
        </div>
      </div>

      <div style="padding: var(--space-4); padding-bottom: var(--space-32);">
        <!-- Illustration -->
        <div style="text-align: center; margin-bottom: var(--space-6);">
          <div style="width: 120px; height: 120px; border-radius: var(--radius-full); background: linear-gradient(135deg, var(--primary-100), var(--teal-50)); display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 56px; animation: bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);">
            📷
          </div>
          <h2 style="font-size: var(--font-size-lg); font-weight: 800; margin-top: var(--space-4); color: var(--text-primary);">
            ${taskTitle}
          </h2>
          ${priorityLabel ? `<span class="chip-status ${task ? task.priority : ''}" style="margin-top: var(--space-2); display: inline-block;">${priorityLabel}</span>` : ''}
        </div>

        <!-- Tips Card -->
        <div class="info-box info" style="flex-direction: column; gap: var(--space-3); margin-bottom: var(--space-6);">
          <div style="font-weight: 700; font-size: var(--font-size-base);">📋 ${t('taskGuides.photo_title')}</div>
          ${tips.map(tip => `
            <div style="display: flex; align-items: flex-start; gap: var(--space-2);">
              <span style="flex-shrink: 0;">${tip.icon}</span>
              <span style="font-size: var(--font-size-sm);">${tip.text}</span>
            </div>
          `).join('')}
        </div>

        <!-- Pet info context -->
        <div class="card card-bordered" style="margin-bottom: var(--space-6);">
          <div style="display: flex; align-items: center; gap: var(--space-3);">
            <div class="avatar">${pet.emoji}</div>
            <div>
              <div style="font-weight: 700;">${pet.name}</div>
              <div style="font-size: var(--font-size-sm); color: var(--text-tertiary);">${pet.breed} · ${pet.age}</div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          <button class="btn btn-primary btn-full btn-lg" id="takePhotoBtn">
            📷 ${t('tasks.take_photo')}
          </button>
          <button class="btn btn-outline btn-full" id="galleryBtn">
            🖼️ ${t('tasks.from_gallery')}
          </button>
          <button class="btn btn-ghost btn-full" id="skipBtn">
            ⏭️ ${t('tasks.skip_task')}
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

  document.getElementById('takePhotoBtn')?.addEventListener('click', () => {
    navigate(`/check/new/photo/${taskId}/capture`);
  });

  document.getElementById('galleryBtn')?.addEventListener('click', () => {
    // Simulate gallery selection → go directly to preview
    const state = getState();
    setState(s => {
      s.session.media.push({
        id: `media-${Date.now()}`,
        taskId,
        type: 'photo',
        source: 'gallery',
        timestamp: new Date().toISOString()
      });
    });
    navigate(`/check/new/photo/${taskId}/preview`);
  });

  document.getElementById('skipBtn')?.addEventListener('click', () => {
    setState(s => {
      const task = (s.session.tasks || []).find(tk => tk.id === taskId);
      if (task) task.status = 'skipped';
    });
    navigate('/check/new/task-plan');
  });
}
