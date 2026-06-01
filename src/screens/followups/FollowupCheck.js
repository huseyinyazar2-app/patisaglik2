import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function selected(selector) {
  return [...document.querySelectorAll(selector)]
    .filter(item => item.checked || item.classList.contains('selected'))
    .map(item => item.value || item.textContent.trim())
    .filter(Boolean);
}

export function render(params = {}) {
  const caseId = params.caseId;
  const followup = getState().followups?.find(item => item.id === caseId) || { title: 'Tedavi sonrası takip' };

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back || ''}</button>
        </div>
        <div class="header-title">Günlük Kontrol</div>
        <div class="header-right"></div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero slate">
          <div class="premium-icon-box">${window.__icons?.checkCircle || ''}</div>
          <div>
            <div class="premium-screen-kicker">Tedavi check-in</div>
            <h1>${escapeHtml(followup.title)}</h1>
            <p>İlaç uyumu, yan etki, iştah, kusma/ishal ve yara durumunu kısa kontrol et.</p>
          </div>
        </div>

        <div class="feature-form-card">
          <div class="feature-field">
            <span>Genel durum</span>
            <div class="feature-chip-row" id="statusChips">
              <button type="button" data-status="improved">İyileşti</button>
              <button type="button" class="selected" data-status="same">Aynı</button>
              <button type="button" data-status="worse">Kötüleşti</button>
            </div>
          </div>

          <div class="feature-field">
            <span>İlaç / uygulama uyumu</span>
            <div class="feature-chip-row" id="medChips">
              <button type="button" class="selected">Verildi</button>
              <button type="button">Atlandı</button>
              <button type="button">Kustu / çıkarıldı</button>
              <button type="button">Bitti</button>
            </div>
          </div>

          <div class="feature-field">
            <span>Bugünkü bulgular</span>
            <div class="feature-check-grid" id="dailyFindings">
              ${['İştah iyi', 'İştah az', 'Kusma', 'İshal', 'Halsizlik', 'Ağrı belirtisi', 'Yara kızarık', 'Şişlik/akıntı'].map(item => `
                <label><input type="checkbox" value="${item}" /><b>${item}</b></label>
              `).join('')}
            </div>
          </div>

          <div class="feature-field">
            <span>Yan etki şüphesi</span>
            <div class="feature-check-grid" id="sideEffects">
              ${['Yok', 'Aşırı salya', 'Titreme', 'Nefes sorunu', 'Yüz/boğaz şişliği', 'Şiddetli halsizlik', 'Kanlı kusma/dışkı'].map((item, index) => `
                <label><input type="checkbox" value="${item}" ${index === 0 ? 'checked' : ''} /><b>${item}</b></label>
              `).join('')}
            </div>
          </div>

          <div class="feature-field">
            <span>Foto / yara kontrolü</span>
            <input id="followupPhoto" type="file" class="feature-upload-input hidden" accept="image/*" />
            <button class="feature-upload" type="button" id="btnPhoto">
              ${window.__icons?.camera || ''}
              <strong>Fotoğraf ekle</strong>
              <small>Yara, deri, dışkı veya genel durum</small>
            </button>
          </div>

          <label class="feature-field">
            <span>Not</span>
            <textarea id="checkNotes" placeholder="Örn. ilaçtan 1 saat sonra kustu, iştahı biraz daha iyi, yara aynı..."></textarea>
          </label>
        </div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnNext" data-case="${caseId}">Değerlendir</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());

  document.querySelectorAll('.feature-chip-row button').forEach(button => {
    button.addEventListener('click', () => {
      button.parentElement?.querySelectorAll('button').forEach(item => item.classList.remove('selected'));
      button.classList.add('selected');
    });
  });

  document.getElementById('btnPhoto')?.addEventListener('click', () => document.getElementById('followupPhoto')?.click());
  document.getElementById('followupPhoto')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    const button = document.getElementById('btnPhoto');
    if (!file || !button) return;
    button.querySelector('strong').textContent = file.name;
    button.querySelector('small').textContent = `${file.type || 'Görsel'} · ${Math.ceil(file.size / 1024)} KB`;
  });

  document.getElementById('btnNext')?.addEventListener('click', (event) => {
    const caseId = event.currentTarget.dataset.case;
    const statusButton = document.querySelector('#statusChips button.selected');
    const status = statusButton?.dataset.status || 'same';
    const file = document.getElementById('followupPhoto')?.files?.[0];

    setState(state => {
      state.session.followupCheck = {
        status,
        medStatus: selected('#medChips button')[0] || '',
        findings: selected('#dailyFindings input'),
        sideEffects: selected('#sideEffects input').filter(item => item !== 'Yok'),
        notes: document.getElementById('checkNotes')?.value || '',
        photo: file ? { name: file.name, mime_type: file.type, file_size_bytes: file.size } : null,
        timestamp: new Date().toISOString()
      };
    });

    navigate(`/followups/${caseId}/result`);
  });
}
