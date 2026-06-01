import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';

export function render(params = {}, query = {}) {
  const taskId = params.taskId;
  const state = getState();
  const hasKit = state.deviceMode === 'basic_kit';

  return `
    <div class="screen bg-gray-50">
      <div class="header bg-white">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">Basic Kit Cihazı</div>
        <div class="header-right"></div>
      </div>
      
      <div class="section pt-12 pb-24 text-center flex flex-col items-center">
        
        <div style="width: 120px; height: 120px; background: var(--secondary-50); border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 60px; margin-bottom: 24px;">
          🔬
        </div>
        
        <h2 class="text-xl font-bold mb-3">
          ${hasKit ? 'Cihaza Bağlanılıyor...' : 'Basic Kit Gerekli'}
        </h2>
        
        <p class="text-secondary text-sm px-4 mb-8">
          ${hasKit 
            ? 'Lütfen Basic Kit cihazınızı açın ve Bluetooth bağlantısını onaylayın. Kamerayı kulak içine veya deriye yaklaştırın.' 
            : 'Bu görev için Pati Sağlık Basic Kit donanımı gerekmektedir. Cihazınız varsa ayarlardan aktifleştirebilirsiniz.'}
        </p>
        
        ${!hasKit ? `
          <button class="btn btn-outline btn-full mb-6" id="btnSettings">Cihaz Ayarlarına Git</button>
        ` : `
          <div class="card bg-white w-full border border-primary p-4 mb-6">
            <div class="flex items-center gap-3">
              <div class="recording-pulse"></div>
              <div class="font-bold text-primary">Cihaz Aranıyor...</div>
            </div>
          </div>
        `}
        
      </div>
      
      <div class="card bg-white" style="position: fixed; bottom: 0; left: 0; right: 0; border-radius: 24px 24px 0 0; padding: 20px 24px; box-shadow: 0 -4px 20px rgba(0,0,0,0.05); z-index: 10;">
        <button class="btn btn-ghost btn-full text-secondary" id="btnSkip">${hasKit ? 'İptal Et' : t('tasks.skip')}</button>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  const taskId = params.taskId;
  
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnSettings')?.addEventListener('click', () => navigate('/profile/devices'));
  
  document.getElementById('btnSkip')?.addEventListener('click', () => {
    setState(state => {
      if (state.session && state.session.tasks) {
        const task = state.session.tasks.find(t => t.id === taskId);
        if (task) task.status = 'skipped';
      }
    });
    navigate('/check/new/task-plan');
  });
}
