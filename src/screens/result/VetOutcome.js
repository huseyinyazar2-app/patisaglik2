import { navigate } from '../../router.js';
import { getState, resetSession } from '../../store.js';
import { submitFeatureForm } from '../../services/formSubmissions.js';
import { showToast } from '../../ui/toast.js';

function selected(id) {
  return document.querySelector(`#${id} button.selected`)?.textContent?.trim() || '';
}

function value(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

export function render() {
  const state = getState();
  const session = state.session || {};

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">Veteriner Sonucu</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.stethoscope}</span>
        </div>
      </div>

      <div class="section pt-4" style="padding-bottom: 124px;">
        <div class="feature-form-hero gold">
          <div class="premium-icon-box">${window.__icons?.stethoscope}</div>
          <div>
            <div class="premium-screen-kicker">Geri bildirim</div>
            <h1>Yönlendirme ne kadar doğruydu?</h1>
            <p>Bu bilgi tanı koymaz; ürün doğruluğunu ve takip kalitesini ölçmek için saklanır.</p>
          </div>
        </div>

        <div class="feature-form-card">
          <div class="feature-field">
            <span>Veterinere gidildi mi?</span>
            <div class="feature-chip-row" id="vetVisited">
              ${['Evet', 'Hayır', 'Randevu alındı'].map((item, index) => `<button type="button" class="${index === 0 ? 'selected' : ''}">${item}</button>`).join('')}
            </div>
          </div>
          <label class="feature-field">
            <span>Veteriner tanısı / değerlendirmesi</span>
            <input id="vetDiagnosis" placeholder="Örn. gastrit, konjonktivit, yumuşak doku travması..." />
          </label>
          <label class="feature-field">
            <span>Tedavi / öneri</span>
            <textarea id="vetTreatment" placeholder="İlaç, diyet, kontrol, tahlil veya izlem notu..."></textarea>
          </label>
          <div class="feature-field">
            <span>Uygulama yönlendirmesi</span>
            <div class="feature-chip-row" id="triageAccuracy">
              ${['Doğruydu', 'Fazla temkinliydi', 'Yetersiz kaldı', 'Emin değilim'].map(item => `<button type="button">${item}</button>`).join('')}
            </div>
          </div>
          <div class="feature-field">
            <span>Şu anki durum</span>
            <div class="feature-chip-row" id="currentStatus">
              ${['Düzeldi', 'Daha iyi', 'Aynı', 'Kötüleşti'].map(item => `<button type="button">${item}</button>`).join('')}
            </div>
          </div>
          <label class="feature-field">
            <span>Ek not</span>
            <textarea id="vetNote" placeholder="Tahlil sonucu, klinik adı veya hatırlamak istediğiniz detay..."></textarea>
          </label>
        </div>

        ${session.primaryComplaintLabel ? `<div class="info-box info mt-3"><span class="info-box-icon">${window.__icons?.clipboard}</span><span>Bu geri bildirim “${session.primaryComplaintLabel}” kontrolüyle eşleştirilecek.</span></div>` : ''}
      </div>

      <div class="card" style="position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--max-width); border-radius: 24px 24px 0 0; padding: 20px 24px; box-shadow: var(--shadow-xl); z-index: 10; border-top: 1px solid rgba(229, 222, 209, 0.8); background: rgba(255, 254, 251, 0.9); backdrop-filter: blur(20px);">
        <button class="btn btn-primary btn-full mb-3" id="btnSaveOutcome">Sonucu Kaydet</button>
        <button class="btn btn-ghost btn-full text-secondary" id="btnSkipOutcome">Şimdilik Atla</button>
      </div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();

  document.querySelectorAll('.feature-chip-row button').forEach(button => {
    button.addEventListener('click', () => {
      button.parentElement?.querySelectorAll('button').forEach(item => item.classList.remove('selected'));
      button.classList.add('selected');
    });
  });

  document.getElementById('btnBack')?.addEventListener('click', () => navigate('/check/new/result'));
  document.getElementById('btnSkipOutcome')?.addEventListener('click', () => {
    resetSession();
    navigate('/home');
  });

  document.getElementById('btnSaveOutcome')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Kaydediliyor...';
    try {
      await submitFeatureForm({
        userId: state.user?.id || 'user-1',
        petId: state.activePetId || 'pet-1',
        featureCode: 'ai-vet-outcome',
        locale: state.user?.locale || 'tr',
        payload: {
          'Veterinere gidildi mi?': selected('vetVisited'),
          'Veteriner tanısı': value('vetDiagnosis'),
          'Tedavi / öneri': value('vetTreatment'),
          'Uygulama yönlendirmesi': selected('triageAccuracy'),
          'Şu anki durum': selected('currentStatus'),
          'Ek not': value('vetNote'),
          triage_session_id: state.session?.id || '',
          primary_complaint: state.session?.primaryComplaintLabel || '',
          matched_complaints: state.session?.matchedComplaintIds || [],
          risk_categories: state.session?.categories || [],
          history_snapshot: state.session?.historySnapshot || {}
        }
      });
      showToast('Veteriner sonucu kaydedildi.');
      resetSession();
      navigate('/home');
    } catch (err) {
      showToast(`Sonuç kaydedilemedi: ${err.message}`);
      button.disabled = false;
      button.textContent = 'Sonucu Kaydet';
    }
  });
}
