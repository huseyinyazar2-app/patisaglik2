import { navigate, goBack } from '../../router.js';
import { getState } from '../../store.js';
import { t } from '../../i18n/tr.js';
import { categoryLabels } from '../../mock/questions.js';
import { submitFeatureForm } from '../../services/formSubmissions.js';

export function render(params = {}, query = {}) {
  const catOptions = Object.values(categoryLabels).map(label => `<option value="${label}">${label}</option>`).join('');

  return `
    <div class="screen bg-white">
      <div class="header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('history.new_issue')}</div>
        <div class="header-right"></div>
      </div>
      
      <div class="section pt-6 pb-24">
        <div class="form-group">
          <label class="block text-sm font-bold mb-2">${t('history.issue_name')}</label>
          <input type="text" id="inputName" class="w-full p-3 rounded-lg border border-border-color bg-gray-50 focus:border-primary focus:outline-none" placeholder="Örn: Sol göz akıntısı">
        </div>
        
        <div class="form-group mt-4">
          <label class="block text-sm font-bold mb-2">${t('history.issue_category')}</label>
          <select id="inputCategory" class="w-full p-3 rounded-lg border border-border-color bg-gray-50 focus:border-primary focus:outline-none appearance-none">
            ${catOptions}
          </select>
        </div>
        
        <div class="form-group mt-4">
          <label class="block text-sm font-bold mb-2">${t('history.first_noticed')}</label>
          <input type="date" id="inputDate" class="w-full p-3 rounded-lg border border-border-color bg-gray-50 focus:border-primary focus:outline-none" value="${new Date().toISOString().split('T')[0]}">
        </div>
        
        <div class="form-group mt-4">
          <label class="block text-sm font-bold mb-2">${t('history.issue_desc')}</label>
          <textarea id="inputDesc" class="complaint-textarea w-full" placeholder="Detaylı bilgi..."></textarea>
        </div>
        
        <div class="form-group mt-4">
          <label class="block text-sm font-bold mb-2">${t('history.tracking_freq')}</label>
          <select id="inputFrequency" class="w-full p-3 rounded-lg border border-border-color bg-gray-50 focus:border-primary focus:outline-none appearance-none">
            <option>Günlük</option>
            <option selected>Haftalık</option>
            <option>Aylık</option>
            <option>Hatırlatma İstemiyorum</option>
          </select>
        </div>
        <div class="feature-form-notice hidden" id="issueFormNotice" role="status"></div>
      </div>
      
      <div class="card" style="position: fixed; bottom: 0; left: 0; right: 0; border-radius: 24px 24px 0 0; padding: 20px 24px; box-shadow: 0 -4px 20px rgba(0,0,0,0.05); z-index: 10;">
        <button class="btn btn-primary btn-full mb-3" id="btnSave">${t('common.save')}</button>
        <button class="btn btn-ghost btn-full text-secondary" id="btnCancel">${t('common.cancel')}</button>
      </div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  function showNotice(message, tone = 'error') {
    const notice = document.getElementById('issueFormNotice');
    if (!notice) return;
    notice.textContent = message;
    notice.className = `feature-form-notice ${tone}`;
  }

  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnCancel')?.addEventListener('click', () => goBack());
  
  document.getElementById('btnSave')?.addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    const name = document.getElementById('inputName').value;
    if (!name.trim()) {
      showNotice('Lütfen sorun adını girin');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Kaydediliyor...';

    try {
      await submitFeatureForm({
        userId: state.user?.id || 'user-1',
        petId: state.activePetId || 'pet-1',
        featureCode: 'issue',
        locale: state.user?.locale || 'tr',
        payload: {
          'Sorun adı': name,
          Kategori: document.getElementById('inputCategory')?.value || '',
          'İlk fark edilme': document.getElementById('inputDate')?.value || '',
          Açıklama: document.getElementById('inputDesc')?.value || '',
          'Takip sıklığı': document.getElementById('inputFrequency')?.value || ''
        }
      });
      navigate('/history/issues');
    } catch (err) {
      btn.disabled = false;
      btn.textContent = t('common.save');
      showNotice(`Sorun kaydedilemedi: ${err.message}`);
    }
  });
}
