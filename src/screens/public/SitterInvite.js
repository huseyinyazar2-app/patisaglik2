import { navigate } from '../../router.js';
import { showToast } from '../../ui/toast.js';
import { t } from '../../i18n/tr.js';

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
  if (status === 'accepted') return t('sitterInvite.accepted');
  if (status === 'declined') return t('sitterInvite.declined');
  return t('sitterInvite.pending');
}

export function render(params = {}) {
  const inviteId = params.inviteId || '';
  const currentState = inviteState(inviteId);
  return `
    <div class="screen public-card-screen">
      <div class="public-card-shell">
        <div class="public-card-hero">
          <div>
            <div class="premium-screen-kicker">${t('sitterInvite.kicker')}</div>
            <h1>${t('app.name')}</h1>
            <p>${t('sitterInvite.subtitle')}</p>
          </div>
          <span class="public-card-badge">${window.__icons?.profile || window.__icons?.shield}</span>
        </div>

        <div class="public-card-notice">
          <strong>${t('sitterInvite.ready_title')}</strong>
          <span>${t('sitterInvite.ready_desc')}</span>
        </div>

        <div class="public-card-panel">
          <div class="public-card-row">
            <span class="public-card-icon">${window.__icons?.lock || window.__icons?.shield}</span>
            <div>
              <small>${t('sitterInvite.invite_code')}</small>
              <strong>${escapeHtml(inviteId)}</strong>
            </div>
          </div>
          <div class="public-card-row">
            <span class="public-card-icon">${window.__icons?.clipboard || window.__icons?.note}</span>
            <div>
              <small>${t('sitterInvite.status')}</small>
              <strong id="inviteStatusText">${stateLabel(currentState.status)}</strong>
            </div>
          </div>
        </div>

        <div class="public-card-actions">
          <button class="btn btn-primary btn-full" id="btnAcceptInvite">${t('sitterInvite.accept')}</button>
          <button class="btn btn-outline btn-full" id="btnDeclineInvite">${t('sitterInvite.decline')}</button>
          <button class="btn btn-primary btn-full" id="btnOpenApp">${t('publicPetCard.open_app')}</button>
          <button class="btn btn-outline btn-full" id="btnCopyInvite">${t('publicPetCard.copy_link')}</button>
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
      showToast(t('sitterInvite.link_copied'));
    } catch {
      input.select();
      showToast(t('publicPetCard.link_selected'));
    }
  });
}
