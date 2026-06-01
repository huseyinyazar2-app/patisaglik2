// Pati Sağlık — Video Capture Screen
import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';

let recordingTimer = null;
let elapsedSeconds = 0;

export function render(params = {}, query = {}) {
  const state = getState();
  const taskId = params.taskId || '';
  const session = state.session || {};
  const task = (session.tasks || []).find(tk => tk.id === taskId);
  const taskTitle = task ? task.title : t('tasks.record_video');

  return `
    <div class="capture-screen">
      <!-- Header overlay -->
      <div style="position: absolute; top: 0; left: 0; right: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%);">
        <button id="backBtn" style="width: 36px; height: 36px; border-radius: var(--radius-full); background: rgba(255,255,255,0.2); border: none; color: white; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          ←
        </button>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <div id="recordingDot" style="width: 10px; height: 10px; border-radius: var(--radius-full); background: var(--risk-critical); display: none; animation: breathe 1s infinite;"></div>
          <span id="timerDisplay" style="color: white; font-weight: 700; font-size: var(--font-size-md); font-variant-numeric: tabular-nums; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
            00:00
          </span>
        </div>
        <span style="font-size: var(--font-size-xs); color: rgba(255,255,255,0.6);">${state.version}</span>
      </div>

      <!-- Camera Preview Area -->
      <div class="capture-preview">
        <div style="position: absolute; inset: 0; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); display: flex; align-items: center; justify-content: center;">
          <div style="color: rgba(255,255,255,0.15); font-size: 80px;">🎥</div>
        </div>

        <!-- Recording status overlay -->
        <div id="recordingOverlay" style="position: absolute; top: var(--space-16); left: 50%; transform: translateX(-50%); display: none;">
          <div style="background: rgba(239, 68, 68, 0.9); color: white; padding: var(--space-2) var(--space-4); border-radius: var(--radius-full); font-size: var(--font-size-sm); font-weight: 600; display: flex; align-items: center; gap: var(--space-2);">
            <span style="width: 8px; height: 8px; border-radius: var(--radius-full); background: white; animation: breathe 1s infinite;"></span>
            REC
          </div>
        </div>

        <!-- Center instruction (shown before recording) -->
        <div id="instructionText" style="position: absolute; bottom: var(--space-8); left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.7); font-size: var(--font-size-sm); text-align: center; max-width: 250px;">
          ${taskTitle}
        </div>
      </div>

      <!-- Bottom Controls -->
      <div class="capture-controls">
        <!-- Flip Camera -->
        <button class="capture-btn-small" id="flipBtn">
          <span style="font-size: 22px;">🔄</span>
        </button>

        <!-- Record Button -->
        <div id="recordBtnContainer" style="position: relative;">
          <button class="capture-btn" id="recordBtn" style="background: var(--risk-critical); border-color: rgba(239,68,68,0.3);">
            <div id="recordInner" style="width: 58px; height: 58px; border-radius: var(--radius-full); background: var(--risk-critical); margin: auto; transition: all 0.3s ease;"></div>
          </button>
        </div>

        <!-- Stop placeholder (for layout balance) -->
        <button class="capture-btn-small" id="stopBtn" style="opacity: 0; pointer-events: none;">
          <span style="font-size: 22px;">⏹️</span>
        </button>
      </div>
    </div>
  `;
}

export function afterRender(params = {}, query = {}) {
  const taskId = params.taskId || '';
  let isRecording = false;
  elapsedSeconds = 0;

  document.getElementById('backBtn')?.addEventListener('click', () => {
    if (recordingTimer) clearInterval(recordingTimer);
    goBack();
  });

  document.getElementById('flipBtn')?.addEventListener('click', () => {
    const btn = document.getElementById('flipBtn');
    if (btn) {
      btn.style.transition = 'transform 0.4s ease';
      btn.style.transform = 'rotate(180deg)';
      setTimeout(() => { btn.style.transform = 'rotate(0deg)'; }, 500);
    }
  });

  document.getElementById('recordBtn')?.addEventListener('click', () => {
    isRecording = !isRecording;

    const recordDot = document.getElementById('recordingDot');
    const overlay = document.getElementById('recordingOverlay');
    const instruction = document.getElementById('instructionText');
    const recordInner = document.getElementById('recordInner');
    const recordBtnContainer = document.getElementById('recordBtnContainer');

    if (isRecording) {
      // Start recording
      if (recordDot) recordDot.style.display = 'block';
      if (overlay) overlay.style.display = 'block';
      if (instruction) instruction.style.display = 'none';
      if (recordInner) {
        recordInner.style.borderRadius = 'var(--radius-md)';
        recordInner.style.width = '30px';
        recordInner.style.height = '30px';
      }
      // Add recording-pulse class effect
      if (recordBtnContainer) {
        recordBtnContainer.innerHTML = `
          <div class="recording-pulse" id="recordBtn" style="width: 72px; height: 72px; cursor: pointer;">
            <div style="width: 24px; height: 24px; border-radius: var(--radius-md); background: white;"></div>
          </div>
        `;
        document.getElementById('recordBtn')?.addEventListener('click', stopRecording);
      }

      elapsedSeconds = 0;
      recordingTimer = setInterval(() => {
        elapsedSeconds++;
        const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
        const secs = String(elapsedSeconds % 60).padStart(2, '0');
        const timer = document.getElementById('timerDisplay');
        if (timer) timer.textContent = `${mins}:${secs}`;
      }, 1000);
    } else {
      stopRecording();
    }
  });

  function stopRecording() {
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }

    // Store media
    setState(s => {
      s.session.media.push({
        id: `media-${Date.now()}`,
        taskId,
        type: 'video',
        source: 'camera',
        duration: elapsedSeconds,
        timestamp: new Date().toISOString()
      });
    });

    navigate(`/check/new/video/${taskId}/preview`);
  }
}
