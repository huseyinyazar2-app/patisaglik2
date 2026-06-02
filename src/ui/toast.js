import { t } from '../i18n/tr.js';

export function showToast(message, { duration = 2500 } = {}) {
  const doc = globalThis.document;
  if (!doc) return;

  const toast = doc.createElement('div');
  toast.className = 'toast';
  toast.textContent = String(message || '');
  doc.body.appendChild(toast);
  globalThis.setTimeout(() => toast.remove(), duration);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function showConfirmDialog({
  title = 'Onay gerekli',
  message = '',
  confirmText = 'Onayla',
  cancelText = t('common.cancel'),
  danger = false
} = {}) {
  const doc = globalThis.document;
  if (!doc) return Promise.resolve(false);

  return new Promise((resolve) => {
    const backdrop = doc.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-handle"></div>
        <div class="modal-title">${escapeHtml(title)}</div>
        <p class="modal-text">${escapeHtml(message)}</p>
        <div class="modal-actions">
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-full" data-confirm-yes>${escapeHtml(confirmText)}</button>
          <button class="btn btn-secondary btn-full" data-confirm-no>${escapeHtml(cancelText)}</button>
        </div>
      </div>
    `;

    function close(value) {
      backdrop.remove();
      resolve(value);
    }

    backdrop.querySelector('[data-confirm-yes]')?.addEventListener('click', () => close(true));
    backdrop.querySelector('[data-confirm-no]')?.addEventListener('click', () => close(false));
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) close(false);
    });
    doc.body.appendChild(backdrop);
  });
}
