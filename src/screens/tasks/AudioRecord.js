import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';

export function render(params = {}, query = {}) {
  const taskId = params.taskId;
  
  return `
    <div class="screen bg-gray-900">
      <div class="header text-white" style="border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div class="header-left">
          <button class="header-icon text-white" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">Ses Kaydı</div>
        <div class="header-right"></div>
      </div>
      
      <div class="audio-record-screen flex flex-col justify-center" style="flex: 1; padding-bottom: 120px;">
        <div style="font-size: 64px; margin-bottom: 24px;">🎤</div>
        
        <div class="audio-timer text-white" id="timer">00:00</div>
        
        <div class="audio-visualizer">
          <div class="audio-bar" style="background: var(--white);"></div>
          <div class="audio-bar" style="background: var(--white);"></div>
          <div class="audio-bar" style="background: var(--white);"></div>
          <div class="audio-bar" style="background: var(--white);"></div>
          <div class="audio-bar" style="background: var(--white);"></div>
          <div class="audio-bar" style="background: var(--white);"></div>
          <div class="audio-bar" style="background: var(--white);"></div>
          <div class="audio-bar" style="background: var(--white);"></div>
        </div>
        
        <div class="text-white opacity-70 mt-4" id="statusText">Kayıt için dokunun</div>
      </div>
      
      <div class="capture-controls" style="position: absolute; bottom: 0; left: 0; right: 0;">
        <div style="width: 44px;"></div>
        
        <button class="capture-btn" id="btnRecord" style="background: var(--risk-critical); border-color: rgba(239, 68, 68, 0.3);">
          <!-- Inner circle -->
        </button>
        
        <div style="width: 44px;"></div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  const taskId = params.taskId;
  let isRecording = false;
  let timerInterval;
  let seconds = 0;
  
  const timerEl = document.getElementById('timer');
  const btnRecord = document.getElementById('btnRecord');
  const statusText = document.getElementById('statusText');
  
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  
  btnRecord?.addEventListener('click', () => {
    if (!isRecording) {
      // Start recording
      isRecording = true;
      statusText.innerText = 'Kaydediliyor...';
      btnRecord.style.borderRadius = '8px'; // Square for stop
      btnRecord.style.transform = 'scale(0.8)';
      
      timerInterval = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        timerEl.innerText = `${mins}:${secs}`;
      }, 1000);
      
    } else {
      // Stop recording
      clearInterval(timerInterval);
      navigate(`/check/new/audio/${taskId}/preview`);
    }
  });
}
