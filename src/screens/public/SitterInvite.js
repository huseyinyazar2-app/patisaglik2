import { navigate } from '../../router.js';
import { showToast } from '../../ui/toast.js';

const INVITE_STATE_KEY = 'pati_sitter_invite_acceptance';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function readInviteStates() {
  try {
    return JSON.parse(localStorage.getItem(INVITE_STATE_KEY) || '{}');
  } catch {
    return {};
  }
}

function inviteState(inviteId) {
  return readInviteStates()[inviteId] || { status: 'pending', updatedAt: null };
}

function stateLabel(status) {
  if (status === 'accepted') return 'Kabul edildi';
  if (status === 'declined') return 'Reddedildi';
  return 'Kabul bekliyor';
}

export function render(params = {}) {
  const inviteId = params.inviteId || '';
  const currentState = inviteState(inviteId);
  return `
    <div class="screen public-card-screen">
      <div class="public-card-shell">
        <div class="public-card-hero">
          <div>
            <div class="premium-screen-kicker">Bakıcı daveti</div>
            <h1>Pati Sağlık</h1>
            <p>Sınırlı erişim davet bağlantısı</p>
          </div>
          <span class="public-card-badge">${window.__icons?.profile || window.__icons?.shield}</span>
        </div>

        <div class="public-card-notice">
          <strong>Davet bağlantısı hazır.</strong>
          <span>Bu ekranda kabul/ret durumu cihazda tutulur. Production auth geldiğinde aynı akış kullanıcı hesabına bağlanacak.</span>
        </div>

        <div class="public-card-panel">
          <div class="public-card-row">
            <span class="public-card-icon">${window.__icons?.lock || window.__icons?.shield}</span>
            <div>
              <small>Davet kodu</small>
              <strong>${escapeHtml(inviteId)}</strong>
            </div>
          </div>
          <div class="public-card-row">
            <span class="public-card-icon">${window.__icons?.clipboard || window.__icons?.note}</span>
            <div>
              <small>Durum</small>
              <strong id="inviteStatusText">${stateLabel(currentState.status)}</strong>
            </div>
          </div>
        </div>

        <div class="public-card-actions">
          <button class="btn btn-primary btn-full" id="btnAcceptInvite">Daveti Kabul Et</button>
          <button class="btn btn-outline btn-full" id="btnDeclineInvite">Reddet</button>
          <button class="btn btn-primary btn-full" id="btnOpenApp">Uygulamaya Dön</button>
          <button class="btn btn-outline btn-full" id="btnCopyInvite">Bağlantıyı Kopyala</button>
        </div>
        <input id="inviteUrl" value="${escapeHtml(`${window.location.origin}${window.location.pathname}#/invite/sitter/${inviteId}`)}" readonly />
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  const inviteId = params.inviteId || '';
  function saveStatus(status) {
    const states = readInviteStates();
    states[inviteId] = { status, updatedAt: new Date().toISOString() };
    localStorage.setItem(INVITE_STATE_KEY, JSON.stringify(states));
    const target = document.getElementById('inviteStatusText');
    if (target) target.textContent = stateLabel(status);
  }

  document.getElementById('btnAcceptInvite')?.addEventListener('click', () => saveStatus('accepted'));
  document.getElementById('btnDeclineInvite')?.addEventListener('click', () => saveStatus('declined'));
  document.getElementById('btnOpenApp')?.addEventListener('click', () => navigate('/profile'));
  document.getElementById('btnCopyInvite')?.addEventListener('click', async () => {
    const input = document.getElementById('inviteUrl');
    try {
      await navigator.clipboard.writeText(input.value);
      showToast('Davet bağlantısı kopyalandı.');
    } catch {
      input.select();
      showToast('Bağlantı alanı seçili bırakıldı.');
    }
  });
}
