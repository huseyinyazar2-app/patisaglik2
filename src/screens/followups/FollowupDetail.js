import { navigate, goBack } from '../../router.js';
import { getState, setState, resetSession } from '../../store.js';
import { getActivePet } from '../../mock/pets.js';
import { showConfirmDialog, showToast } from '../../ui/toast.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(date) {
  if (!date) return 'Plan yok';
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

function statusLabel(status) {
  if (status === 'improved') return 'İyileşti';
  if (status === 'worse') return 'Kötüleşti';
  return 'Aynı';
}

function renderHistory(history = []) {
  if (!history.length) {
    return `
      <div class="p-4 bg-gray-50 text-center">
        <p class="text-xs text-tertiary">Henüz günlük kontrol yapılmadı.</p>
      </div>
    `;
  }

  return history.map((item) => `
    <div class="p-4" style="border-bottom: 1px solid var(--border-color);">
      <div class="flex items-start gap-3">
        <div class="risk-dot ${item.status === 'worse' ? 'critical' : item.status === 'same' ? 'medium' : ''}"></div>
        <div style="flex: 1; min-width: 0;">
          <div class="text-sm font-bold">${statusLabel(item.status)} · ${formatDate(item.timestamp)}</div>
          <div class="text-xs text-secondary mt-1">${escapeHtml(item.notes || 'Not eklenmedi.')}</div>
          ${item.sideEffects?.length ? `<div class="text-xs text-danger mt-1">Yan etki: ${escapeHtml(item.sideEffects.join(', '))}</div>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

export function render(params = {}) {
  const state = getState();
  const caseId = params.caseId;
  const followup = state.followups?.find(f => f.id === caseId) || {
    id: caseId,
    title: 'Tedavi sonrası takip',
    status: 'active',
    nextCheck: new Date().toISOString(),
    history: [],
    checklist: []
  };
  const pet = getActivePet(followup.petId || state.activePetId) || { name: 'Pet' };

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back || ''}</button>
        </div>
        <div class="header-title">Takip Dosyası</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.clipboard || ''}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero teal">
          <div class="premium-icon-box">${window.__icons?.stethoscope || ''}</div>
          <div>
            <div class="premium-screen-kicker">Tedavi sonrası takip</div>
            <h1>${escapeHtml(followup.title)}</h1>
            <p>${escapeHtml(pet.name)} için ilaç, yan etki, foto/yara ve kontrol randevusu takibi.</p>
          </div>
        </div>

        <div class="premium-followup-plan">
          <div class="premium-icon-box">${window.__icons?.calendar || ''}</div>
          <div>
            <h3>Plan</h3>
            <div class="premium-plan-row"><span>Sonraki kontrol</span><strong>${formatDate(followup.nextCheck)}</strong></div>
            <div class="premium-plan-row"><span>Kontrol randevusu</span><strong>${followup.controlDate ? formatDate(followup.controlDate) : 'Eklenmedi'}</strong></div>
            <div class="premium-plan-row"><span>Durum</span><strong>${followup.status === 'active' ? 'Aktif' : 'Kapalı'}</strong></div>
          </div>
        </div>

        <div class="premium-result-section">
          <div class="premium-icon-box">${window.__icons?.briefcase || ''}</div>
          <div>
            <h3>Veteriner Planı</h3>
            <p>${escapeHtml(followup.vetPlan || 'Veteriner planı eklenmedi.')}</p>
            ${followup.medSchedule ? `<p><strong>İlaç / uygulama saatleri:</strong> ${escapeHtml(followup.medSchedule)}</p>` : ''}
            ${followup.prescriptionFile ? `<p><strong>Ek:</strong> ${escapeHtml(followup.prescriptionFile.name)}</p>` : ''}
          </div>
        </div>

        <div class="premium-result-section">
          <div class="premium-icon-box">${window.__icons?.checkCircle || ''}</div>
          <div>
            <h3>Günlük Kontrol Listesi</h3>
            <ul>${(followup.checklist || ['İştah', 'İlaç verildi mi?', 'Yan etki var mı?']).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          </div>
        </div>

        <h3 class="section-title mt-4 mb-3">Takip Geçmişi</h3>
        <div class="card p-0 bg-white" style="border: 1px solid var(--border-color); overflow: hidden;">
          <div class="p-4" style="border-bottom: 1px solid var(--border-color);">
            <div class="flex items-center gap-3">
              <div class="risk-dot"></div>
              <div>
                <div class="text-sm font-bold">Takip başlatıldı</div>
                <div class="text-xs text-secondary">${formatDate(followup.createdAt || new Date().toISOString())}</div>
              </div>
            </div>
          </div>
          ${renderHistory(followup.history)}
        </div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnStartCheck" data-case="${caseId}">Bugünkü Kontrolü Yap</button>
          <button class="btn btn-secondary btn-full" id="btnShareSummary">Veteriner Özeti Hazırla</button>
          <button class="btn btn-ghost btn-full text-danger" id="btnEndFollowup">Takibi Sonlandır</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnStartCheck')?.addEventListener('click', (event) => {
    resetSession();
    navigate(`/followups/${event.currentTarget.dataset.case}/check`);
  });
  document.getElementById('btnShareSummary')?.addEventListener('click', () => {
    showToast('Takip özeti veteriner link raporuna eklenecek şekilde hazırlandı.');
  });
  document.getElementById('btnEndFollowup')?.addEventListener('click', async () => {
    const ok = await showConfirmDialog({
      title: 'Takibi sonlandır',
      message: 'Bu takip dosyasını kapatmak istiyor musunuz?',
      confirmText: 'Sonlandır',
      danger: true
    });
    if (!ok) return;
    setState(state => {
      const target = state.followups?.find(item => item.id === params.caseId);
      if (target) target.status = 'closed';
    });
    showToast('Takip sonlandırıldı.');
    navigate('/home');
  });
}
