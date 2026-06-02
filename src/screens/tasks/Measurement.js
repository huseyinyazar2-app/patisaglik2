import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { showToast } from '../../ui/toast.js';
import { saveMeasurement } from '../../services/measurements.js';

const measurementMeta = {
  temperature_measurement: { type: 'temperature', unit: '°C', defaultValue: '38.5', placeholder: '38.5' },
  temperature_followup: { type: 'temperature', unit: '°C', defaultValue: '38.5', placeholder: '38.5' },
  weight_measurement: { type: 'weight', unit: 'kg', defaultValue: '', placeholder: '0.0' },
  weight_followup: { type: 'weight', unit: 'kg', defaultValue: '', placeholder: '0.0' },
  resting_respiratory_rate: { type: 'respiratory', unit: '/dk', defaultValue: '', placeholder: '24' },
  respiratory_rate_followup: { type: 'respiratory', unit: '/dk', defaultValue: '', placeholder: '24' },
  mobility_score: { type: 'mobility_score', unit: '/5', defaultValue: '', placeholder: '3' },
  appetite_score: { type: 'appetite_score', unit: '/5', defaultValue: '', placeholder: '3' },
  pain_score: { type: 'pain_score', unit: '/5', defaultValue: '', placeholder: '3' },
  newborn_weight: { type: 'weight', unit: 'kg', defaultValue: '', placeholder: '0.0' }
};

export function render(params = {}, query = {}) {
  const taskId = params.taskId;
  const state = getState();
  const task = state.session?.tasks?.find(t => t.id === taskId) || { title: t('measurementTask.fallback_title'), key: 'temperature' };
  const meta = measurementMeta[task.key] || measurementMeta.temperature_measurement;
  const isTemp = meta.type === 'temperature';
  const unit = meta.unit;
  const defaultValue = meta.defaultValue;
  const placeholder = meta.placeholder;

  return `
    <div class="screen bg-gray-50">
      <div class="header bg-white">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${task.title}</div>
        <div class="header-right"></div>
      </div>
      
      <div class="section pt-6 pb-24">
        <div class="card bg-white items-center flex flex-col p-8 mb-6">
          <div style="font-size: 48px; margin-bottom: 16px;">📏</div>
          
          <div class="measurement-value-input mb-2">
            <input type="number" id="valInput" step="0.1" placeholder="${placeholder}" value="${defaultValue}" style="background: var(--gray-50); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 12px; outline: none;">
            <span class="measurement-unit">${unit}</span>
          </div>
        </div>
        
        ${isTemp ? `
          <div class="mb-4">
            <label class="font-bold text-sm mb-2 block">${t('measurementTask.method_label')}</label>
            <div class="flex gap-2">
              <label class="radio-item flex-1 text-center" style="padding: 10px 4px; border: 1px solid var(--primary); background: var(--primary-50);">
                <input type="radio" name="method" value="rectal" checked class="hidden">
                <span style="font-size: 13px; font-weight: 600; color: var(--primary-dark);">${t('measurementTask.rectal_recommended')}</span>
              </label>
              <label class="radio-item flex-1 text-center" style="padding: 10px 4px; border: 1px solid var(--border-color); background: var(--white);">
                <input type="radio" name="method" value="ear" class="hidden">
                <span style="font-size: 13px; font-weight: 500;">Kulak</span>
              </label>
            </div>
          </div>
        ` : ''}
        
        <div class="mb-4">
          <label class="font-bold text-sm mb-2 block">${t('measurementTask.note_label')}</label>
          <textarea id="noteInput" class="complaint-textarea w-full" style="min-height: 80px;" placeholder="${t('measurementTask.note_placeholder')}"></textarea>
        </div>
      </div>
      
      <div class="card bg-white" style="position: fixed; bottom: 0; left: 0; right: 0; border-radius: 24px 24px 0 0; padding: 20px 24px; box-shadow: 0 -4px 20px rgba(0,0,0,0.05); z-index: 10;">
        <button class="btn btn-primary btn-full mb-3" id="btnSave">${t('common.save')}</button>
        <button class="btn btn-ghost btn-full text-secondary" id="btnSkip">${t('tasks.skip')}</button>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  const taskId = params.taskId;
  
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnSkip')?.addEventListener('click', () => {
    setState(state => {
      if (state.session && state.session.tasks) {
        const task = state.session.tasks.find(t => t.id === taskId);
        if (task) task.status = 'skipped';
      }
    });
    navigate('/check/new/task-plan');
  });
  
  // Toggle styling for radio
  document.querySelectorAll('input[name="method"]').forEach(input => {
    input.addEventListener('change', (e) => {
      document.querySelectorAll('input[name="method"]').forEach(inp => {
        const lbl = inp.parentElement;
        lbl.style.borderColor = 'var(--border-color)';
        lbl.style.background = 'var(--white)';
        lbl.querySelector('span').style.color = 'var(--text-primary)';
        lbl.querySelector('span').style.fontWeight = '500';
      });
      const lbl = e.target.parentElement;
      lbl.style.borderColor = 'var(--primary)';
      lbl.style.background = 'var(--primary-50)';
      lbl.querySelector('span').style.color = 'var(--primary-dark)';
      lbl.querySelector('span').style.fontWeight = '600';
    });
  });
  
  document.getElementById('btnSave')?.addEventListener('click', async () => {
    const val = document.getElementById('valInput').value;
    if (!val) {
      showToast(t('measurementTask.invalid_value'));
      return;
    }
    
    setState(state => {
      if (state.session && state.session.tasks) {
        const task = state.session.tasks.find(t => t.id === taskId);
        if (task) task.status = 'completed';
        
        // Push to session measurements
        state.session.measurements = state.session.measurements || [];
        state.session.measurements.push({
          type: task.key,
          value: parseFloat(val),
          unit: measurementMeta[task.key]?.unit || unit
        });
      }
    });
    const state = getState();
    try {
      await saveMeasurement({
        userId: state.user?.id || 'user-1',
        petId: state.activePetId,
        type: measurementMeta[task.key]?.type || 'temperature',
        value: val,
        unit: measurementMeta[task.key]?.unit || unit,
        measuredAt: new Date().toISOString(),
        note: t('measurementTask.ai_note', { title: task.title }),
        metadata: {
          source: 'ai_triage',
          triageSessionId: state.session?.id || '',
          taskId,
          taskKey: task.key
        }
      });
    } catch (err) {
      showToast(t('measurementTask.archive_failed', { error: err.message }));
    }
    navigate('/check/new/task-plan');
  });
}
