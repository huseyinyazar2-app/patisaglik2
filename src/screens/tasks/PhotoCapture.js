// Pati Sağlık — Photo Capture Screen
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
    <div class="capture-screen">
      <!-- Header overlay -->
      <div style="position: absolute; top: 0; left: 0; right: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%);">
        <button id="backBtn" style="width: 36px; height: 36px; border-radius: var(--radius-full); background: rgba(255,255,255,0.2); border: none; color: white; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          ←
        </button>
        <span style="color: white; font-weight: 600; font-size: var(--font-size-sm); text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${taskTitle}</span>
        <span style="font-size: var(--font-size-xs); color: rgba(255,255,255,0.6);">${state.version}</span>
      </div>

      <!-- Camera Preview Area -->
      <div class="capture-preview">
        <!-- Mock camera feed -->
        <div style="position: absolute; inset: 0; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); display: flex; align-items: center; justify-content: center;">
          <div style="color: rgba(255,255,255,0.15); font-size: 80px;">📷</div>
        </div>

        <!-- Capture frame overlay -->
        <div class="capture-frame" id="captureFrame">
          <span style="font-size: var(--font-size-xs); text-align: center; padding: var(--space-2);">
            Alanı çerçeve içine alın
          </span>
        </div>

        <!-- Grid overlay -->
        <div style="position: absolute; inset: 0; pointer-events: none; opacity: 0.1;">
          <div style="position: absolute; left: 33.33%; top: 0; bottom: 0; width: 1px; background: white;"></div>
          <div style="position: absolute; left: 66.66%; top: 0; bottom: 0; width: 1px; background: white;"></div>
          <div style="position: absolute; top: 33.33%; left: 0; right: 0; height: 1px; background: white;"></div>
          <div style="position: absolute; top: 66.66%; left: 0; right: 0; height: 1px; background: white;"></div>
        </div>
      </div>

      <!-- Bottom Controls -->
      <div class="capture-controls">
        <!-- Gallery -->
        <button class="capture-btn-small" id="galleryBtn" title="Galeri">
          <span style="font-size: 22px;">🖼️</span>
        </button>

        <!-- Shutter -->
        <button class="capture-btn" id="shutterBtn" title="Çek">
          <div style="width: 58px; height: 58px; border-radius: var(--radius-full); background: white; margin: auto;"></div>
        </button>

        <!-- Flip Camera -->
        <button class="capture-btn-small" id="flipBtn" title="Kamerayı Çevir">
          <span style="font-size: 22px;">🔄</span>
        </button>
      </div>
    </div>
  `;
}

export function afterRender(params = {}, query = {}) {
  const taskId = params.taskId || '';

  document.getElementById('backBtn')?.addEventListener('click', () => {
    goBack();
  });

  document.getElementById('shutterBtn')?.addEventListener('click', () => {
    // Simulate capture animation
    const frame = document.getElementById('captureFrame');
    if (frame) {
      frame.style.borderColor = 'rgba(14, 165, 233, 0.8)';
      frame.style.transition = 'all 0.2s ease';
    }

    // Flash effect
    const flash = document.createElement('div');
    flash.style.cssText = 'position: fixed; inset: 0; background: white; z-index: 100; opacity: 0.8; transition: opacity 0.3s ease;';
    document.body.appendChild(flash);
    setTimeout(() => { flash.style.opacity = '0'; }, 50);
    setTimeout(() => { flash.remove(); }, 350);

    // Store mock media
    setState(s => {
      s.session.media.push({
        id: `media-${Date.now()}`,
        taskId,
        type: 'photo',
        source: 'camera',
        timestamp: new Date().toISOString()
      });
    });

    // Navigate to preview after short delay
    setTimeout(() => {
      navigate(`/check/new/photo/${taskId}/preview`);
    }, 400);
  });

  document.getElementById('galleryBtn')?.addEventListener('click', () => {
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

  document.getElementById('flipBtn')?.addEventListener('click', () => {
    const btn = document.getElementById('flipBtn');
    if (btn) {
      btn.style.transition = 'transform 0.4s ease';
      btn.style.transform = 'rotate(180deg)';
      setTimeout(() => { btn.style.transform = 'rotate(0deg)'; }, 500);
    }
  });
}
