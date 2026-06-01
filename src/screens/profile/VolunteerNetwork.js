import { goBack } from '../../router.js';
import { getState } from '../../store.js';
import { getPets } from '../../services/pets.js';
import { submitFeatureForm } from '../../services/formSubmissions.js';
import { showToast } from '../../ui/toast.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function mapUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function renderList(pets = null) {
  if (!pets) {
    return `<div class="free-record-panel"><p>Gönüllü ağı yükleniyor...</p></div>`;
  }

  const volunteers = pets.filter((pet) => ['stray', 'foster'].includes(pet.ownership));
  if (!volunteers.length) {
    return `
      <div class="empty-state">
        <div class="modern-empty-icon">${window.__icons?.paw}</div>
        <div class="empty-state-title">Gönüllü profili yok</div>
        <div class="empty-state-desc">Sokak veya geçici yuva profili eklediğinde burada konum ve bakım notlarıyla listelenir.</div>
      </div>
    `;
  }

  return volunteers.map((pet) => `
    <div class="volunteer-card">
      <div class="volunteer-card-head">
        <div class="premium-icon-box">${window.__icons?.paw}</div>
        <div>
          <strong>${escapeHtml(pet.name)}</strong>
          <small>${pet.ownership === 'foster' ? 'Geçici yuva' : 'Sokak / gönüllü'} · ${escapeHtml(pet.breed || pet.type || 'Pet')}</small>
        </div>
      </div>
      <p>${escapeHtml(pet.volunteerNote || 'Bakım notu eklenmedi.')}</p>
      <div class="volunteer-location">
        <span>${window.__icons?.search}</span>
        <strong>${escapeHtml(pet.location || 'Konum girilmedi')}</strong>
      </div>
      <div class="pet-card-map-actions">
        ${pet.location ? `<button type="button" class="pet-map-action" data-map-location="${escapeHtml(pet.location)}">${window.__icons?.search} Haritada Aç</button>` : ''}
        ${pet.location ? `<button type="button" class="pet-map-action secondary" data-share-location="${escapeHtml(pet.location)}" data-pet-name="${escapeHtml(pet.name)}">${window.__icons?.upload} Konumu Paylaş</button>` : ''}
        <button type="button" class="pet-map-action accent" data-volunteer-request="${escapeHtml(pet.id)}" data-pet-name="${escapeHtml(pet.name)}">${window.__icons?.heartPulse} Destek Talebi</button>
      </div>
    </div>
  `).join('');
}

export function render() {
  return `
    <div class="screen premium-check">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">Gönüllü Ağı</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.paw}</span>
        </div>
      </div>

      <div class="section pt-4">
        <div class="profile-plan-card">
          <div>
            <strong>Sokak ve geçici yuva profilleri</strong>
            <p>Konum, bakım notu ve paylaşım aksiyonları tek yerde görünür.</p>
          </div>
          <span class="plan-pill">Ücretsiz</span>
        </div>
      </div>

      <div class="section pt-0 pb-24">
        <div class="volunteer-list" id="volunteerList">${renderList(null)}</div>
      </div>

      <div class="modal-backdrop volunteer-request-modal" id="volunteerRequestModal" hidden>
        <div class="modal">
          <div class="modal-handle"></div>
          <div class="modal-title">Gönüllü destek talebi</div>
          <p class="modal-text" id="volunteerRequestPet">Bu profil için yardım, takip veya sahiplenme iletişimi bırak.</p>
          <div class="feature-field">
            <span>İletişim</span>
            <input id="volunteerContact" placeholder="Telefon veya e-posta" />
          </div>
          <div class="feature-field mt-3">
            <span>Talep türü</span>
            <input id="volunteerNeed" placeholder="Mama, veteriner, geçici yuva, sahiplenme..." />
          </div>
          <div class="feature-field mt-3">
            <span>Not</span>
            <textarea id="volunteerNote" placeholder="Kısa bir not ekle"></textarea>
          </div>
          <p class="volunteer-request-status" id="volunteerRequestStatus"></p>
          <div class="modal-actions">
            <button class="btn btn-primary btn-full" id="btnVolunteerSubmit">Talebi Kaydet</button>
            <button class="btn btn-secondary btn-full" id="btnVolunteerCancel">Vazgeç</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  const modal = document.getElementById('volunteerRequestModal');
  const status = document.getElementById('volunteerRequestStatus');

  function openRequestModal(button) {
    if (!modal) return;
    modal.dataset.petId = button.dataset.volunteerRequest || '';
    document.getElementById('volunteerRequestPet').textContent = `${button.dataset.petName || 'Bu profil'} için yardım, takip veya sahiplenme iletişimi bırak.`;
    document.getElementById('volunteerContact').value = '';
    document.getElementById('volunteerNeed').value = '';
    document.getElementById('volunteerNote').value = '';
    if (status) status.textContent = '';
    modal.hidden = false;
  }

  function closeRequestModal() {
    if (modal) modal.hidden = true;
  }

  function bindActions() {
    document.querySelectorAll('[data-map-location]').forEach((button) => {
      button.addEventListener('click', () => window.open(mapUrl(button.dataset.mapLocation), '_blank', 'noopener,noreferrer'));
    });
    document.querySelectorAll('[data-share-location]').forEach((button) => {
      button.addEventListener('click', async () => {
        const text = `${button.dataset.petName || 'Pet'} konumu: ${button.dataset.shareLocation}`;
        const url = mapUrl(button.dataset.shareLocation);
        if (navigator.share) {
          try {
            await navigator.share({ title: 'Pati Sağlık Gönüllü Konumu', text, url });
            return;
          } catch {}
        }
        try {
          await navigator.clipboard.writeText(`${text}\n${url}`);
          showToast('Konum bağlantısı kopyalandı.');
        } catch {
          showToast('Konum bağlantısı kopyalanamadı. Harita bağlantısını açarak paylaşabilirsiniz.');
        }
      });
    });
    document.querySelectorAll('[data-volunteer-request]').forEach((button) => {
      button.addEventListener('click', () => openRequestModal(button));
    });
  }

  document.getElementById('btnVolunteerCancel')?.addEventListener('click', closeRequestModal);
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeRequestModal();
  });

  document.getElementById('btnVolunteerSubmit')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const petId = modal?.dataset.petId || '';
    const contact = document.getElementById('volunteerContact')?.value.trim();
    const need = document.getElementById('volunteerNeed')?.value.trim();
    const note = document.getElementById('volunteerNote')?.value.trim();
    if (!contact || !need) {
      if (status) status.textContent = 'İletişim ve talep türü zorunlu.';
      return;
    }
    button.disabled = true;
    button.textContent = 'Kaydediliyor...';
    try {
      await submitFeatureForm({
        userId: state.user?.id || 'user-1',
        petId,
        featureCode: 'volunteer-help',
        locale: state.locale || 'tr',
        payload: {
          'İletişim': contact,
          'Talep türü': need,
          Not: note
        }
      });
      if (status) status.textContent = 'Talep kaydedildi. Profil sahibi bu kaydı görebilecek.';
      setTimeout(closeRequestModal, 700);
    } catch (err) {
      if (status) status.textContent = `Talep kaydedilemedi: ${err.message}`;
    } finally {
      button.disabled = false;
      button.textContent = 'Talebi Kaydet';
    }
  });

  getPets({ userId: state.user?.id || 'user-1' }).then((pets) => {
    const target = document.getElementById('volunteerList');
    if (target) target.innerHTML = renderList(pets);
    bindActions();
  }).catch((err) => {
    const target = document.getElementById('volunteerList');
    if (target) target.innerHTML = `<div class="free-record-panel"><p>Gönüllü ağı açılamadı: ${escapeHtml(err.message)}</p></div>`;
  });
}
