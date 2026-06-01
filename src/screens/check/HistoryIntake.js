import { navigate, goBack } from '../../router.js';
import { getState, setState } from '../../store.js';
import { getActivePet } from '../../mock/pets.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fieldValue(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function selectedChips(id) {
  return [...document.querySelectorAll(`#${id} button.selected`)].map(button => button.textContent.trim());
}

export function render() {
  const state = getState();
  const pet = getActivePet(state.activePetId) || { name: 'pet' };
  const history = state.session?.historySnapshot || {};

  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">Sağlık Öyküsü</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.clipboard}</span>
        </div>
      </div>

      <div class="section pt-4" style="padding-bottom: 124px;">
        <div class="feature-form-hero teal">
          <div class="premium-icon-box">${window.__icons?.paw}</div>
          <div>
            <div class="premium-screen-kicker">AI bağlamı</div>
            <h1>${escapeHtml(pet.name)} için kısa öykü</h1>
            <p>Bu bilgiler soruları daraltır. Boş bırakırsanız test devam eder.</p>
          </div>
        </div>

        <div class="feature-form-card">
          <label class="feature-field">
            <span>Kronik hastalık / bilinen tanı</span>
            <input id="historyChronic" placeholder="Örn. böbrek, kalp, alerji yok" value="${escapeHtml(history.chronic || '')}" />
          </label>
          <label class="feature-field">
            <span>Düzenli ilaç / takviye</span>
            <input id="historyMeds" placeholder="İlaç adı, doz veya yok" value="${escapeHtml(history.medications || '')}" />
          </label>
          <label class="feature-field">
            <span>Alerji / hassasiyet</span>
            <input id="historyAllergy" placeholder="Mama, ilaç, çevresel alerji..." value="${escapeHtml(history.allergies || '')}" />
          </label>
          <label class="feature-field">
            <span>Son dönem değişiklikleri</span>
            <textarea id="historyRecent" placeholder="Yeni mama, ortam değişimi, travma, aşı/ilaç, stres...">${escapeHtml(history.recentChanges || '')}</textarea>
          </label>
          <div class="feature-field">
            <span>Bu şikayet daha önce oldu mu?</span>
            <div class="feature-chip-row" id="historyPrevious">
              ${['Hayır', 'Evet benzer oldu', 'Sık tekrarlıyor', 'Emin değilim'].map(option => `
                <button type="button" class="${history.previousComplaint === option ? 'selected' : ''}">${option}</button>
              `).join('')}
            </div>
          </div>
          <div class="feature-field">
            <span>Evde müdahale edildi mi?</span>
            <div class="feature-chip-row" id="historyHomeCare">
              ${['Hayır', 'Mama/su düzenlendi', 'İlaç verildi', 'Veteriner arandı'].map(option => `
                <button type="button" class="${(history.homeCare || []).includes(option) ? 'selected' : ''}">${option}</button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--max-width); border-radius: 24px 24px 0 0; padding: 20px 24px; box-shadow: var(--shadow-xl); z-index: 10; border-top: 1px solid rgba(229, 222, 209, 0.8); background: rgba(255, 254, 251, 0.9); backdrop-filter: blur(20px);">
        <button class="btn btn-primary btn-full mb-3" id="btnContinue">Acil Belirti Kontrolüne Geç</button>
        <button class="btn btn-ghost btn-full text-secondary" id="btnSkip">Boş Bırak ve Devam Et</button>
      </div>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());

  document.querySelectorAll('.feature-chip-row button').forEach(button => {
    button.addEventListener('click', () => {
      const group = button.parentElement;
      if (group?.id === 'historyPrevious') {
        group.querySelectorAll('button').forEach(item => item.classList.remove('selected'));
      }
      button.classList.toggle('selected');
    });
  });

  function saveAndContinue() {
    setState(current => {
      current.session.historySnapshot = {
        chronic: fieldValue('historyChronic'),
        medications: fieldValue('historyMeds'),
        allergies: fieldValue('historyAllergy'),
        recentChanges: fieldValue('historyRecent'),
        previousComplaint: selectedChips('historyPrevious')[0] || '',
        homeCare: selectedChips('historyHomeCare'),
        capturedAt: new Date().toISOString()
      };
    });
    navigate('/check/new/red-flags');
  }

  document.getElementById('btnContinue')?.addEventListener('click', saveAndContinue);
  document.getElementById('btnSkip')?.addEventListener('click', () => navigate('/check/new/red-flags'));
}
