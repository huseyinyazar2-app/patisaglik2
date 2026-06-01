import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { showToast } from '../../ui/toast.js';

export function render(params = {}, query = {}) {
  const taskId = params.taskId;
  const state = getState();
  const task = state.session?.tasks?.find(t => t.id === taskId) || { key: 'crt', title: 'Fiziksel Muayene' };
  
  let contentHtml = '';
  let iconHtml = '';
  
  if (task.key === 'crt') {
    iconHtml = '<div style="font-size: 48px; margin-bottom: 16px;">🩸</div>';
    contentHtml = `
      <div class="info-box info mb-4">
        <h4 style="font-weight: 700; margin-bottom: 4px;">Kılcal Damar Dolum Süresi (CRT)</h4>
        <p class="text-sm">Parmağınızla petinizin diş etine beyazlayana kadar bastırın. Parmağınızı çektiğinizde pembe rengin geri gelmesi kaç saniye sürdü?</p>
      </div>
      
      <div class="mb-4">
        <label class="font-bold text-sm mb-2 block">Renk Geri Dönüş Süresi</label>
        <div class="flex flex-col gap-2">
          <label class="radio-item text-left" style="padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <input type="radio" name="crt_time" value="1_sec" class="hidden">
            <span style="font-weight: 500;">Anında (1 saniyeden az)</span>
          </label>
          <label class="radio-item text-left" style="padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <input type="radio" name="crt_time" value="1_2_sec" class="hidden">
            <span style="font-weight: 500;">1-2 Saniye (Normal)</span>
          </label>
          <label class="radio-item text-left" style="padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <input type="radio" name="crt_time" value="over_2_sec" class="hidden">
            <span style="font-weight: 500; color: var(--risk-high);">2 Saniyeden uzun (Acil Olabilir!)</span>
          </label>
        </div>
      </div>
    `;
  } else if (task.key === 'skin_tent') {
    iconHtml = '<div style="font-size: 48px; margin-bottom: 16px;">💧</div>';
    contentHtml = `
      <div class="info-box info mb-4">
        <h4 style="font-weight: 700; margin-bottom: 4px;">Deri Elastikiyeti (Dehidrasyon Testi)</h4>
        <p class="text-sm">Petinizin boyun/ense kısmındaki deriyi hafifçe yukarı doğru çekip bırakın. Deri ne kadar sürede eski haline döndü?</p>
      </div>
      
      <div class="mb-4">
        <label class="font-bold text-sm mb-2 block">Derinin Eski Haline Dönme Hızı</label>
        <div class="flex flex-col gap-2">
          <label class="radio-item text-left" style="padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <input type="radio" name="skin_time" value="instant" class="hidden">
            <span style="font-weight: 500;">Anında yaylandı (Normal)</span>
          </label>
          <label class="radio-item text-left" style="padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <input type="radio" name="skin_time" value="slow" class="hidden">
            <span style="font-weight: 500;">Biraz yavaş düzeldi</span>
          </label>
          <label class="radio-item text-left" style="padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <input type="radio" name="skin_time" value="stays_up" class="hidden">
            <span style="font-weight: 500; color: var(--risk-high);">Çadır gibi havada kaldı (Ağır Dehidrasyon)</span>
          </label>
        </div>
      </div>
    `;
  } else if (task.key === 'pain_score') {
    iconHtml = '<div style="font-size: 48px; margin-bottom: 16px;">😿</div>';
    contentHtml = `
      <div class="info-box info mb-4">
        <h4 style="font-weight: 700; margin-bottom: 4px;">Ağrı Skalası (Pain Score)</h4>
        <p class="text-sm">Lütfen petinizin yüz ifadesine ve genel duruşuna bakarak bir değerlendirme yapın.</p>
      </div>
      
      <div class="mb-4">
        <label class="font-bold text-sm mb-2 block">Duruş ve İfade</label>
        <div class="flex flex-col gap-2">
          <label class="radio-item text-left" style="padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <input type="radio" name="pain" value="none" class="hidden">
            <span style="font-weight: 500;">Rahat, kulaklar dik, gözler açık (Ağrı yok)</span>
          </label>
          <label class="radio-item text-left" style="padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <input type="radio" name="pain" value="mild" class="hidden">
            <span style="font-weight: 500;">Hafif gergin, gözleri hafif kısık</span>
          </label>
          <label class="radio-item text-left" style="padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <input type="radio" name="pain" value="severe" class="hidden">
            <span style="font-weight: 500; color: var(--risk-high);">Kambur duruyor, kulaklar düşük, gözler kısık/kapalı (Şiddetli Ağrı)</span>
          </label>
        </div>
      </div>
    `;
  }

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
          ${iconHtml}
          ${contentHtml}
        </div>
        
        <div class="mb-4">
          <label class="font-bold text-sm mb-2 block">Not (Opsiyonel)</label>
          <textarea id="noteInput" class="complaint-textarea w-full" style="min-height: 80px;" placeholder="Eklemek istediğiniz bir detay var mı?"></textarea>
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
  document.querySelectorAll('input[type="radio"]').forEach(input => {
    input.addEventListener('change', (e) => {
      const groupName = e.target.name;
      document.querySelectorAll(`input[name="${groupName}"]`).forEach(inp => {
        const lbl = inp.parentElement;
        lbl.style.borderColor = 'var(--border-color)';
        lbl.style.background = 'var(--white)';
        lbl.querySelector('span').style.fontWeight = '500';
      });
      const lbl = e.target.parentElement;
      lbl.style.borderColor = 'var(--primary)';
      lbl.style.background = 'var(--primary-50)';
      lbl.querySelector('span').style.fontWeight = '700';
    });
  });
  
  document.getElementById('btnSave')?.addEventListener('click', () => {
    // Check if a radio is selected
    const checked = document.querySelector('input[type="radio"]:checked');
    if (!checked) {
      showToast('Lütfen bir seçenek işaretleyin.');
      return;
    }
    
    setState(state => {
      if (state.session && state.session.tasks) {
        const task = state.session.tasks.find(t => t.id === taskId);
        if (task) task.status = 'completed';
        
        // Push to session measurements or answers
        state.session.measurements = state.session.measurements || [];
        state.session.measurements.push({
          type: task.key,
          value: checked.value,
          unit: 'categorical'
        });
      }
    });
    navigate('/check/new/task-plan');
  });
}
