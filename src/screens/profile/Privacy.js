import { navigate, goBack } from '../../router.js';
import { t } from '../../i18n/tr.js';
import { getState, setState } from '../../store.js';
import { getPets } from '../../services/pets.js';
import { getFreeRecords } from '../../services/freeRecords.js';
import { getMeasurements } from '../../services/measurements.js';
import { getClinicExportDocuments } from '../../services/documents.js';
import { getAccountBilling } from '../../services/billing.js';
import { showConfirmDialog, showToast } from '../../ui/toast.js';

const HEALTH_DATA_KEYS = [
  'pati_form_submissions',
  'pati_pets',
  'pati_public_cards',
  'pati_feature_usage',
  'pati_notification_settings',
  'pati_reminder_scheduler_status',
  'pati_notified_reminders',
  'pati_native_notification_ids',
  'pati_sitter_invite_acceptance'
];

const ACCOUNT_DATA_KEYS = [
  ...HEALTH_DATA_KEYS,
  'pati_active_pet',
  'pati_local_plan_code'
];

function downloadJsonFile(data) {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pati-saglik-veri-export-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function localSnapshot() {
  return Object.fromEntries(HEALTH_DATA_KEYS.map((key) => [key, localStorage.getItem(key)]));
}

async function buildDataExport() {
  const state = getState();
  const userId = state.user?.id || 'user-1';
  const petId = state.activePetId;
  const [pets, records, measurements, documents, billing] = await Promise.all([
    getPets({ userId }),
    petId ? getFreeRecords({ petId, limit: 100 }) : Promise.resolve({ healthRecords: [], expenses: [], reminders: [] }),
    petId ? getMeasurements({ petId, limit: 100 }) : Promise.resolve([]),
    petId ? getClinicExportDocuments({ petId, limit: 100 }) : Promise.resolve([]),
    getAccountBilling({ userId })
  ]);

  return {
    exportedAt: new Date().toISOString(),
    appVersion: state.version,
    user: state.user,
    activePetId: petId,
    subscription: billing.subscription,
    pets,
    records,
    measurements,
    documents,
    localSnapshot: localSnapshot()
  };
}

export function render(params = {}, query = {}) {
  return `
    <div class="screen bg-gray-50">
      <div class="header bg-white">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${t('profile.privacy')}</div>
        <div class="header-right"></div>
      </div>
      
      <div class="section pt-6 pb-24">
        
        <h3 class="section-title text-xs uppercase tracking-wider pl-2 mb-3">Veri İzinleri</h3>
        <div class="bg-white rounded-xl shadow-sm border border-border-color mb-8">
          
          <div class="flex items-center justify-between p-4 border-b border-border-color">
            <div class="flex-1 pr-4">
              <div class="font-semibold text-sm mb-1">${t('profile.privacy_health')}</div>
              <div class="text-xs text-secondary">Geçmiş kontroller ve ölçümler sunucularda şifreli saklansın.</div>
            </div>
            <label class="toggle flex-shrink-0">
              <input type="checkbox" checked class="hidden">
              <div class="toggle-track bg-gray-300 w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300">
                <div class="toggle-thumb bg-white w-5 h-5 rounded-full absolute top-0.5 left-0.5 shadow-sm transition-transform duration-300 transform translate-x-6 bg-primary border-primary"></div>
              </div>
            </label>
          </div>
          
          <div class="flex items-center justify-between p-4 border-b border-border-color">
            <div class="flex-1 pr-4">
              <div class="font-semibold text-sm mb-1">${t('profile.privacy_media')}</div>
              <div class="text-xs text-secondary">Fotoğraf, video ve ses kayıtları buluta yedeklensin. Kapatılırsa sadece bu cihazda saklanır.</div>
            </div>
            <label class="toggle flex-shrink-0">
              <input type="checkbox" checked class="hidden">
              <div class="toggle-track bg-gray-300 w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300">
                <div class="toggle-thumb bg-white w-5 h-5 rounded-full absolute top-0.5 left-0.5 shadow-sm transition-transform duration-300 transform translate-x-6 bg-primary border-primary"></div>
              </div>
            </label>
          </div>
          
          <div class="flex items-center justify-between p-4 border-b border-border-color">
            <div class="flex-1 pr-4">
              <div class="font-semibold text-sm mb-1">${t('profile.privacy_ai')}</div>
              <div class="text-xs text-secondary">Belirtiler ve kayıtlar yapay zeka analizine gönderilsin.</div>
            </div>
            <label class="toggle flex-shrink-0">
              <input type="checkbox" checked class="hidden">
              <div class="toggle-track bg-gray-300 w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300">
                <div class="toggle-thumb bg-white w-5 h-5 rounded-full absolute top-0.5 left-0.5 shadow-sm transition-transform duration-300 transform translate-x-6 bg-primary border-primary"></div>
              </div>
            </label>
          </div>
          
          <div class="flex items-center justify-between p-4">
            <div class="flex-1 pr-4">
              <div class="font-semibold text-sm mb-1">${t('profile.privacy_anon')}</div>
              <div class="text-xs text-secondary">Veriler anonimleştirilerek ürün geliştirmede kullanılsın.</div>
            </div>
            <label class="toggle flex-shrink-0">
              <input type="checkbox" class="hidden">
              <div class="toggle-track bg-gray-300 w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300">
                <div class="toggle-thumb bg-white w-5 h-5 rounded-full absolute top-0.5 left-0.5 shadow-sm transition-transform duration-300 transform"></div>
              </div>
            </label>
          </div>
        </div>
        
        <h3 class="section-title text-xs uppercase tracking-wider pl-2 mb-3">Veri Yönetimi</h3>
        <div class="bg-white rounded-xl shadow-sm border border-border-color overflow-hidden">
          <button class="w-full flex items-center justify-between p-4 text-left border-b border-border-color hover:bg-gray-50 active:bg-gray-100" id="btnExport">
            <span class="font-medium text-sm text-gray-800" id="exportLabel">${t('profile.export_data')}</span>
            <span class="text-gray-400" style="width: 18px; height: 18px;">${window.__icons?.upload}</span>
          </button>
          
          <button class="w-full flex items-center justify-between p-4 text-left border-b border-border-color hover:bg-red-50 active:bg-red-100" id="btnDeleteData">
            <span class="font-medium text-sm text-danger">${t('profile.delete_data')}</span>
            <span class="text-danger" style="width: 18px; height: 18px;">${window.__icons?.xCircle}</span>
          </button>
          
          <button class="w-full flex items-center justify-between p-4 text-left hover:bg-red-50 active:bg-red-100" id="btnDeleteAccount">
            <span class="font-medium text-sm text-danger">${t('profile.delete_account')}</span>
            <span class="text-danger" style="width: 18px; height: 18px;">${window.__icons?.alert}</span>
          </button>
        </div>
        
        <div class="mt-8 text-center">
          <button class="btn btn-primary" id="btnSave" style="min-width: 200px;">${t('profile.save_settings')}</button>
        </div>
        
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  
  // Custom toggle styling logic
  document.querySelectorAll('.toggle input[type="checkbox"]').forEach(checkbox => {
    // Initial state is set in HTML structure above, just handle clicks
    checkbox.addEventListener('change', (e) => {
      const track = e.target.nextElementSibling;
      const thumb = track.querySelector('.toggle-thumb');
      
      if (e.target.checked) {
        track.classList.remove('bg-gray-300');
        track.style.backgroundColor = 'var(--primary)';
        thumb.classList.add('translate-x-6');
      } else {
        track.style.backgroundColor = '';
        track.classList.add('bg-gray-300');
        thumb.classList.remove('translate-x-6');
      }
    });
    
    // Setup initial style based on checked attribute
    if (checkbox.checked) {
      const track = checkbox.nextElementSibling;
      track.classList.remove('bg-gray-300');
      track.style.backgroundColor = 'var(--primary)';
    }
  });
  
  document.getElementById('btnSave')?.addEventListener('click', () => {
    showToast('Ayarlar kaydedildi.');
    goBack();
  });
  
  document.getElementById('btnExport')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const label = document.getElementById('exportLabel');
    button.disabled = true;
    if (label) label.textContent = 'Veriler hazırlanıyor...';
    try {
      downloadJsonFile(await buildDataExport());
    } catch (err) {
      showToast(`Veri dışa aktarımı başarısız: ${err.message}`);
    } finally {
      button.disabled = false;
      if (label) label.textContent = t('profile.export_data');
    }
  });
  
  document.getElementById('btnDeleteData')?.addEventListener('click', async () => {
    const ok = await showConfirmDialog({
      title: 'Sağlık verilerini sil',
      message: 'Tüm sağlık verileriniz ve geçmişiniz bu cihazdan kalıcı olarak silinecek.',
      confirmText: 'Verileri Sil',
      danger: true
    });
    if (!ok) return;
    HEALTH_DATA_KEYS.forEach((key) => localStorage.removeItem(key));
    showToast('Bu cihazdaki sağlık verileri silindi.');
    navigate('/pets/select');
  });

  document.getElementById('btnDeleteAccount')?.addEventListener('click', async () => {
    const ok = await showConfirmDialog({
      title: 'Hesabı bu cihazdan kaldır',
      message: 'Hesap oturumu ve bu cihazdaki tüm Pati Sağlık verileri silinecek.',
      confirmText: 'Hesabı Kaldır',
      danger: true
    });
    if (!ok) return;
    ACCOUNT_DATA_KEYS.forEach((key) => localStorage.removeItem(key));
    setState({
      user: { isLoggedIn: false },
      activePetId: null,
      subscription: { tier: 'free', maxPets: 1 }
    });
    showToast('Bu cihazdaki hesap oturumu ve yerel veriler silindi.');
    navigate('/auth/splash');
  });
}
