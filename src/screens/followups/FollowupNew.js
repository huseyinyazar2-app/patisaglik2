import { navigate, goBack } from '../../router.js';
import { getState, setState, resetSession } from '../../store.js';
import { getActivePet } from '../../mock/pets.js';
import { showToast } from '../../ui/toast.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function value(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function selected(selector) {
  return [...document.querySelectorAll(selector)]
    .filter(item => item.checked || item.classList.contains('selected'))
    .map(item => item.value || item.textContent.trim())
    .filter(Boolean);
}

function fileInfo(id) {
  const file = document.getElementById(id)?.files?.[0];
  if (!file) return null;
  return { name: file.name, mime_type: file.type, file_size_bytes: file.size, local_uri: `local://${file.name}` };
}

export function render() {
  const state = getState();
  const session = state.session || {};
  const pet = getActivePet(state.activePetId) || { name: 'Pet' };
  const complaint = session.complaintText || 'Veteriner sonrası takip';

  return `
    <div class="screen premium-check treatment-followup-screen">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back || ''}</button>
        </div>
        <div class="header-title">Tedavi Takibi</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.calendar || ''}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero teal">
          <div class="premium-icon-box">${window.__icons?.stethoscope || ''}</div>
          <div>
            <div class="premium-screen-kicker">Tedavi sonrası asistan</div>
            <h1>${escapeHtml(pet.name)} için takip dosyası</h1>
            <p>Reçete, ilaç saati, yan etki, yara/foto ve kontrol randevusunu tek takip planına bağla. Uygulama ilaç veya doz önermez.</p>
          </div>
        </div>

        <div class="feature-form-card">
          <label class="feature-field">
            <span>Takip başlığı</span>
            <input id="followupTitle" value="${escapeHtml(complaint)}" placeholder="Örn. kusma sonrası tedavi, operasyon sonrası yara" />
          </label>

          <div class="feature-field">
            <span>Reçete / epikriz fotoğrafı</span>
            <input id="prescriptionFile" type="file" class="feature-upload-input hidden" accept="image/*,.pdf" />
            <button class="feature-upload" type="button" id="btnPrescriptionUpload">
              ${window.__icons?.upload || ''}
              <strong>Belge seç</strong>
              <small>Reçete, epikriz veya kontrol kağıdı</small>
            </button>
          </div>

          <label class="feature-field">
            <span>Veterinerin verdiği plan</span>
            <textarea id="vetPlan" placeholder="İlaç adları, doz saatleri, yara bakımı, beslenme veya kontrol notu. Doz önerisini uygulama değil veteriner belirler."></textarea>
          </label>

          <label class="feature-field">
            <span>İlaç / uygulama saatleri</span>
            <input id="medSchedule" placeholder="Örn. 09:00 antibiyotik, 21:00 ağrı kesici, 3 gün sonra kontrol" />
          </label>

          <div class="feature-field">
            <span>Günlük sorulacaklar</span>
            <div class="feature-check-grid">
              ${['İlaç verildi mi?', 'Kusma/ishal oldu mu?', 'İştah nasıl?', 'Yan etki var mı?', 'Yara fotoğrafı çekilecek', 'Kontrol randevusu hatırlatılacak'].map((item, index) => `
                <label>
                  <input type="checkbox" value="${item}" ${index < 4 ? 'checked' : ''} />
                  <b>${item}</b>
                </label>
              `).join('')}
            </div>
          </div>

          <label class="feature-field">
            <span>Kontrol randevusu</span>
            <input id="controlDate" type="date" />
          </label>

          <div class="feature-field">
            <span>İlk kontrol zamanı</span>
            <div class="feature-chip-row" id="intervalChips">
              ${['6 saat', '12 saat', '24 saat', '48 saat'].map((item, index) => `<button type="button" class="${index === 2 ? 'selected' : ''}" data-hours="${parseInt(item, 10)}">${item}</button>`).join('')}
            </div>
          </div>
        </div>

        <div class="info-box warning mt-4">
          <span class="info-box-icon">${window.__icons?.shield || ''}</span>
          <span>Bu asistan tedaviyi takip eder; yeni ilaç, doz veya tıbbi müdahale önermez. Kötüleşme veya ciddi belirti varsa veterinerle görüşülmelidir.</span>
        </div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnStartFollowup">Takibi Başlat</button>
          <button class="btn btn-ghost btn-full" id="btnCancel">İptal</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnCancel')?.addEventListener('click', () => {
    resetSession();
    navigate('/home');
  });

  document.getElementById('btnPrescriptionUpload')?.addEventListener('click', () => document.getElementById('prescriptionFile')?.click());
  document.getElementById('prescriptionFile')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    const button = document.getElementById('btnPrescriptionUpload');
    if (!file || !button) return;
    button.querySelector('strong').textContent = file.name;
    button.querySelector('small').textContent = `${file.type || 'Belge'} · ${Math.ceil(file.size / 1024)} KB`;
  });

  document.querySelectorAll('#intervalChips button').forEach(button => {
    button.addEventListener('click', () => {
      button.parentElement?.querySelectorAll('button').forEach(item => item.classList.remove('selected'));
      button.classList.add('selected');
    });
  });

  document.getElementById('btnStartFollowup')?.addEventListener('click', (event) => {
    const state = getState();
    const button = event.currentTarget;
    const title = value('followupTitle') || 'Tedavi sonrası takip';
    const selectedInterval = document.querySelector('#intervalChips button.selected');
    const hours = Number(selectedInterval?.dataset.hours || 24);

    button.disabled = true;
    button.textContent = 'Takip oluşturuluyor...';

    const caseId = `case-${Date.now()}`;
    const caseRecord = {
      id: caseId,
      petId: state.activePetId,
      title,
      status: 'active',
      type: 'treatment_followup',
      createdAt: new Date().toISOString(),
      nextCheck: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
      controlDate: value('controlDate'),
      vetPlan: value('vetPlan'),
      medSchedule: value('medSchedule'),
      checklist: selected('.feature-check-grid input'),
      prescriptionFile: fileInfo('prescriptionFile'),
      history: []
    };

    setState(current => {
      current.followups = current.followups || [];
      current.followups.unshift(caseRecord);
    });

    showToast('Tedavi takip dosyası oluşturuldu.');
    resetSession();
    navigate(`/followups/${caseId}`);
  });
}
