import { navigate } from '../../router.js';
import { t } from '../../i18n/tr.js';
import { getPetByPublicToken } from '../../services/pets.js';
import { showToast } from '../../ui/toast.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function listValue(items, empty = 'Kayıt paylaşılmadı') {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  return values.length ? values.map(escapeHtml).join(', ') : empty;
}

function speciesLabel(type) {
  return t(`pets.${type}`) === `pets.${type}` ? type : t(`pets.${type}`);
}

function canShow(sharedFields, label) {
  return !sharedFields.length || sharedFields.includes(label);
}

function mapUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function infoRow(icon, title, value) {
  return `
    <div class="public-card-row">
      <span class="public-card-icon">${window.__icons?.[icon] || window.__icons?.shield}</span>
      <div>
        <small>${escapeHtml(title)}</small>
        <strong>${value}</strong>
      </div>
    </div>
  `;
}

function renderPetCard(pet, token) {
  const card = pet.qrHealthCard || {};
  const sharedFields = Array.isArray(card.shared_fields) ? card.shared_fields : [];
  const publicUrl = `${window.location.origin}${window.location.pathname}#/public/pet/${token}`;
  const canShareLocation = pet.location && ['stray', 'foster'].includes(pet.ownership);

  const rows = [
    canShow(sharedFields, 'İsim ve tür') ? infoRow('paw', 'Pet', `${escapeHtml(pet.name)} · ${escapeHtml(speciesLabel(pet.type))}${pet.breed ? ` · ${escapeHtml(pet.breed)}` : ''}`) : '',
    infoRow('weight', 'Kilo', `${Number(pet.weight || 0).toLocaleString('tr-TR')} kg`),
    canShareLocation ? infoRow('search', 'Bakım konumu', escapeHtml(pet.location)) : '',
    canShow(sharedFields, 'Kronik hastalıklar') ? infoRow('clipboard', 'Kronik hastalıklar', listValue(pet.chronicDiseases)) : '',
    canShow(sharedFields, 'Alerjiler') ? infoRow('alert', 'Alerjiler', listValue(pet.allergies)) : '',
    canShow(sharedFields, 'İlaçlar') ? infoRow('stethoscope', 'Kullanılan ilaçlar', listValue(pet.medications)) : '',
    pet.rawHistory ? infoRow('note', 'Kısa sağlık notu', escapeHtml(pet.rawHistory)) : '',
    canShow(sharedFields, 'Sahip iletişimi') && pet.ownerEmail ? infoRow('profile', 'Sahip iletişimi', `${escapeHtml(pet.ownerName || 'Sahip')} · ${escapeHtml(pet.ownerEmail)}`) : ''
  ].filter(Boolean).join('');

  return `
    <div class="screen public-card-screen">
      <div class="public-card-shell">
        <div class="public-card-hero">
          <div>
            <div class="premium-screen-kicker">Acil sağlık kartı</div>
            <h1>${escapeHtml(pet.name)}</h1>
            <p>${escapeHtml(speciesLabel(pet.type))}${pet.breed ? ` · ${escapeHtml(pet.breed)}` : ''}${pet.age ? ` · ${escapeHtml(pet.age)}` : ''}</p>
          </div>
          <span class="public-card-badge">${window.__icons?.shield}</span>
        </div>

        <div class="public-card-notice">
          <strong>Veteriner yerine geçmez.</strong>
          <span>Acil durumda petin temel kayıtlarını hızlı göstermek için hazırlanmıştır.</span>
        </div>

        <div class="public-card-panel">
          ${rows || '<div class="empty-state-desc">Bu kartta paylaşılacak kayıt bulunamadı.</div>'}
        </div>

        <div class="public-card-meta">
          <span>Erişim: ${escapeHtml(card.access_duration || 'Belirtilmedi')}</span>
          <span>Güncelleme: ${card.updated_at ? new Date(card.updated_at).toLocaleDateString('tr-TR') : '-'}</span>
        </div>

        <div class="public-card-actions">
          ${canShareLocation ? `<button class="btn btn-secondary btn-full" id="btnOpenPublicMap" data-map-location="${escapeHtml(pet.location)}">Konumu Haritada Aç</button>` : ''}
          <button class="btn btn-primary btn-full" id="btnSharePublicCard">${t('common.share')}</button>
          <button class="btn btn-outline btn-full" id="btnCopyPublicCard">Bağlantıyı Kopyala</button>
          <button class="btn btn-ghost btn-full" id="btnOpenApp">Uygulamaya Dön</button>
        </div>
        <input id="publicCardUrl" value="${escapeHtml(publicUrl)}" readonly />
      </div>
    </div>
  `;
}

export function render() {
  return `
    <div class="screen public-card-screen">
      <div class="public-card-shell">
        <div class="public-card-loading">${t('common.loading')}</div>
      </div>
    </div>
  `;
}

export async function afterRender(params = {}) {
  const root = document.querySelector('.public-card-screen');
  const token = params.token || '';

  try {
    const pet = await getPetByPublicToken(token);
    if (!pet) {
      root.innerHTML = `
        <div class="public-card-shell">
          <div class="public-card-panel">
            <div class="empty-state-title">Kart bulunamadı</div>
            <div class="empty-state-desc">Bu bağlantı pasif olabilir veya henüz oluşturulmamış olabilir.</div>
            <button class="btn btn-primary btn-full mt-4" id="btnOpenApp">Uygulamaya Dön</button>
          </div>
        </div>
      `;
    } else {
      root.outerHTML = renderPetCard(pet, token);
    }

    document.getElementById('btnOpenApp')?.addEventListener('click', () => navigate('/profile'));
    document.getElementById('btnCopyPublicCard')?.addEventListener('click', async () => {
      const input = document.getElementById('publicCardUrl');
      try {
        await navigator.clipboard.writeText(input.value);
        showToast('Bağlantı kopyalandı.');
      } catch {
        input.select();
        showToast('Bağlantı alanı seçili bırakıldı.');
      }
    });
    document.getElementById('btnSharePublicCard')?.addEventListener('click', async () => {
      const url = document.getElementById('publicCardUrl')?.value;
      if (navigator.share) await navigator.share({ title: 'Pati Sağlık Acil Kart', url });
      else showToast('Paylaşım desteklenmiyor. Bağlantıyı kopyalayabilirsiniz.');
    });
    document.getElementById('btnOpenPublicMap')?.addEventListener('click', (event) => {
      const location = event.currentTarget.dataset.mapLocation;
      if (location) window.open(mapUrl(location), '_blank', 'noopener,noreferrer');
    });
  } catch (err) {
    root.innerHTML = `
      <div class="public-card-shell">
        <div class="public-card-panel">
          <div class="empty-state-title">Kart açılamadı</div>
          <div class="empty-state-desc">${escapeHtml(err.message)}</div>
        </div>
      </div>
    `;
  }
}
