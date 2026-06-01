import { navigate, goBack } from '../../router.js';
import { getState } from '../../store.js';
import { getFreeRecords } from '../../services/freeRecords.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(date) {
  if (!date || Number.isNaN(Date.parse(date))) return 'Tarih yok';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

function first(value) {
  if (Array.isArray(value)) return value[0]?.label || value[0] || '';
  return value || '';
}

function field(payload = {}, labels = [], fallback = '') {
  for (const label of labels) {
    const value = first(payload[label]);
    if (value) return value;
  }
  return fallback;
}

function issueTitle(item) {
  return item.title || field(item.payload, ['Sorun adı', 'issue_name'], 'Sağlık sorunu');
}

function issueDescription(item) {
  return item.summary || field(item.payload, ['Açıklama', 'description', 'Takip notu'], 'Detay eklenmemiş.');
}

function renderField(label, value) {
  if (value === undefined || value === null || value === '') return '';
  const display = Array.isArray(value) ? value.join(', ') : String(value);
  return `
    <div class="record-detail-field">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(display)}</strong>
    </div>
  `;
}

function payloadFields(payload = {}) {
  const renderedKeys = [
    'Sorun adı',
    'issue_name',
    'Kategori',
    'category',
    'İlk fark edilme',
    'first_noticed',
    'Açıklama',
    'description',
    'Takip sıklığı',
    'tracking_frequency'
  ];
  return Object.entries(payload)
    .filter(([key, value]) => !key.startsWith('__') && !['form_submission_id', 'feature_code', ...renderedKeys].includes(key) && value !== '')
    .map(([key, value]) => renderField(key, Array.isArray(value) ? value.join(', ') : value))
    .join('');
}

function renderDetail(issue = null) {
  if (!issue) {
    return '<div class="free-record-panel"><p>Sorun detayı getiriliyor...</p></div>';
  }

  const payload = issue.payload || {};
  const frequency = field(payload, ['Takip sıklığı', 'tracking_frequency'], 'Takip sıklığı belirtilmedi');

  return `
    <div class="record-detail-card">
      <div class="record-detail-main">
        <div class="premium-icon-box">${window.__icons?.heartPulse || ''}</div>
        <div>
          <span>Sağlık sorunu</span>
          <h2>${escapeHtml(issueTitle(issue))}</h2>
          <p>${formatDate(issue.occurred_at || issue.created_at)}</p>
        </div>
      </div>

      <div class="record-alert-panel watch">
        <span>${window.__icons?.search || ''}</span>
        <div>
          <strong>${escapeHtml(frequency)}</strong>
          <small>${escapeHtml(issueDescription(issue))}</small>
          <em>Bu alan veteriner teşhisi değildir; takip notlarını düzenli tutmak için kullanılır.</em>
        </div>
      </div>

      <div class="record-detail-grid">
        ${renderField('Kategori', field(payload, ['Kategori', 'category'], 'Genel takip'))}
        ${renderField('İlk fark edilme', field(payload, ['İlk fark edilme', 'first_noticed']))}
        ${renderField('Açıklama', issueDescription(issue))}
        ${payloadFields(payload)}
        ${renderField('Kayıt tarihi', formatDate(issue.created_at))}
      </div>
    </div>
  `;
}

export function render() {
  return `
    <div class="screen premium-check record-list-screen">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="btnBack">${window.__icons?.back || ''}</button>
        </div>
        <div class="header-title">Sorun Detayı</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.heartPulse || ''}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero teal">
          <div class="premium-icon-box">${window.__icons?.search || ''}</div>
          <div>
            <div class="premium-screen-kicker">Ücretsiz takip kaydı</div>
            <h1>Sağlık Sorunu</h1>
            <p>Belirti, kategori ve takip notlarının canlı kayıt detayı.</p>
          </div>
        </div>

        <div id="issueDetail" class="mt-4">
          ${renderDetail()}
        </div>

        <div class="record-detail-actions">
          <button class="btn btn-primary btn-full" id="btnNewCheck">Yeni Takip Ekle</button>
          <button class="btn btn-secondary btn-full" id="btnCreateReport">Rapor Hazırla</button>
          <button class="btn btn-ghost btn-full" id="btnList">Listeye Dön</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  const state = getState();
  const target = document.getElementById('issueDetail');

  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnNewCheck')?.addEventListener('click', () => navigate('/history/issues/new'));
  document.getElementById('btnCreateReport')?.addEventListener('click', () => navigate('/reports/new'));
  document.getElementById('btnList')?.addEventListener('click', () => navigate('/history/issues'));

  getFreeRecords({ petId: state.activePetId, limit: 100 }).then((records) => {
    const issue = (records.healthRecords || []).find((item) => item.record_type === 'issue' && item.id === params.issueId);
    if (target) {
      target.innerHTML = issue ? renderDetail(issue) : `
        <div class="empty-state">
          <div class="empty-state-icon">${window.__icons?.search || ''}</div>
          <div class="empty-state-title">Sorun kaydı bulunamadı</div>
          <div class="empty-state-desc">Kayıt silinmiş veya farklı bir pete ait olabilir.</div>
        </div>
      `;
    }
  }).catch((err) => {
    if (target) {
      target.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${window.__icons?.alert || ''}</div>
          <div class="empty-state-title">Detay alınamadı</div>
          <div class="empty-state-desc">${escapeHtml(err.message)}</div>
        </div>
      `;
    }
  });
}
