import { navigate } from '../../router.js';

const API_FALLBACK = 'https://api.pethelp.app';
const SESSION_KEY = 'pati_admin_session';

let adminState = {
  metrics: {},
  users: [],
  pets: [],
  records: [],
  documents: [],
  usage: [],
  plans: [],
  creditPackages: [],
  payments: [],
  settings: {
    mediaQualityCheckEnabled: false,
    aiIgnoreLowQualityMedia: true
  },
  lookups: { users: [], pets: [], plans: [], species: [] },
  filters: {
    users: { q: '', status: '', limit: 30 },
    pets: { q: '', status: '', ownerId: '', limit: 30 },
    records: { q: '', kind: '', petId: '', userId: '', limit: 40 },
    documents: { q: '', status: '', type: '', limit: 30 },
    payments: { q: '', status: '', limit: 40 }
  }
};

function session() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveSession(value) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmtDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return '-';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function prettyJson(value) {
  try {
    return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : (value ?? {}), null, 2);
  } catch {
    return String(value || '');
  }
}

function getValue(id) {
  return document.getElementById(id)?.value ?? '';
}

const STATUS_LABELS = {
  active: 'Aktif',
  inactive: 'Pasif',
  suspended: 'Askıya alındı',
  deleted: 'Silindi',
  archived: 'Arşiv',
  draft: 'Taslak',
  ready: 'Hazır',
  pending: 'Bekliyor',
  verified: 'Doğrulandı',
  refunded: 'İade edildi',
  cancelled: 'İptal edildi',
  scheduled: 'Planlandı',
  completed: 'Tamamlandı',
  skipped: 'Atlandı',
  canceled: 'İptal edildi'
};

const KIND_LABELS = {
  health: 'Sağlık',
  measurement: 'Ölçüm',
  expense: 'Masraf',
  reminder: 'Hatırlatıcı',
  document: 'Belge',
  form: 'Form'
};

const BILLING_LABELS = {
  free: 'Ücretsiz',
  credit: 'Kredi',
  subscription: 'Abonelik',
  monthly: 'Aylık',
  yearly: 'Yıllık'
};

function labelFrom(map, value, fallback = '-') {
  if (!value) return fallback;
  return map[value] || value;
}

function localeOptions(selected = 'tr') {
  const items = [
    { value: 'tr', label: 'Türkçe (tr)' },
    { value: 'en', label: 'İngilizce (en)' },
    { value: 'de', label: 'Almanca (de)' },
    { value: 'fr', label: 'Fransızca (fr)' },
    { value: 'es', label: 'İspanyolca (es)' },
    { value: 'it', label: 'İtalyanca (it)' }
  ];
  return items.map((item) => `<option value="${item.value}" ${item.value === selected ? 'selected' : ''}>${item.label}</option>`).join('');
}

function yesNoOptions(selected = '0') {
  return `
    <option value="1" ${String(selected) === '1' ? 'selected' : ''}>Evet</option>
    <option value="0" ${String(selected) === '0' ? 'selected' : ''}>Hayır</option>
  `;
}

function datetimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function api(path, options = {}) {
  const auth = session();
  const candidates = ['', API_FALLBACK];
  let lastError = null;

  for (const base of candidates) {
    try {
      const response = await fetch(`${base}${path}`, {
        method: options.method || 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(auth?.token ? { 'X-Admin-Session': auth.token } : {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || `http_${response.status}`);
      return data.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('api_failed');
}

function metricCard(label, value, note) {
  return `<article class="admin-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;
}

function optionList(items, valueKey, labelKey, selectedValue = '', allowEmpty = true, emptyLabel = 'Tümü') {
  return [
    allowEmpty ? `<option value="">${escapeHtml(emptyLabel)}</option>` : '',
    ...items.map((item) => `<option value="${escapeHtml(item[valueKey])}" ${String(item[valueKey]) === String(selectedValue) ? 'selected' : ''}>${escapeHtml(item[labelKey])}</option>`)
  ].join('');
}

function userOptions(selected = '') {
  return optionList(adminState.lookups.users, 'id', 'display_name', selected, false);
}

function petOptions(selected = '', allowEmpty = true) {
  return optionList(adminState.lookups.pets, 'id', 'name', selected, allowEmpty);
}

function planOptions(selected = '') {
  return optionList(adminState.lookups.plans, 'id', 'name_tr', selected, false);
}

function speciesOptions(selected = '') {
  const items = adminState.lookups.species.map((item) => ({ ...item, label: `${item.default_name_tr} (${item.code})` }));
  return optionList(items, 'code', 'label', selected, false);
}

function renderUsers(items = []) {
  if (!items.length) return `<div class="admin-empty">Bu filtreye uyan kullanıcı yok.</div>`;
  return items.map((user) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(user.display_name || 'İsimsiz kullanıcı')}</strong>
        <small>${escapeHtml(user.email || user.phone || '-')} · dil ${escapeHtml(user.locale || 'tr')} · pet ${escapeHtml(user.pet_count || 0)} · kredi ${escapeHtml(user.credit_balance || 0)}</small>
      </div>
      <div class="admin-actions">
        <span>${escapeHtml(labelFrom(STATUS_LABELS, user.status, 'Aktif'))}</span>
        <button data-action="user-view" data-id="${escapeHtml(user.id)}">Gör</button>
        <button data-action="user-edit" data-id="${escapeHtml(user.id)}">Düzenle</button>
        <button data-action="user-credit" data-id="${escapeHtml(user.id)}">Kredi</button>
        <button data-action="user-plan" data-id="${escapeHtml(user.id)}">Plan</button>
        <button class="danger" data-action="user-delete" data-id="${escapeHtml(user.id)}">Sil</button>
      </div>
    </div>
  `).join('');
}

function renderPets(items = []) {
  if (!items.length) return `<div class="admin-empty">Bu filtreye uyan pet yok.</div>`;
  return items.map((pet) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(pet.name || 'İsimsiz pet')}</strong>
        <small>${escapeHtml(pet.species_code || '-')} · sahip ${escapeHtml(pet.owner_name || '-')} · kayıt ${escapeHtml(pet.health_count || 0)} · belge ${escapeHtml(pet.document_count || 0)}</small>
      </div>
      <div class="admin-actions">
        <span>${escapeHtml(labelFrom(STATUS_LABELS, pet.status, 'Aktif'))}</span>
        <button data-action="pet-view" data-id="${escapeHtml(pet.id)}">Gör</button>
        <button data-action="pet-edit" data-id="${escapeHtml(pet.id)}">Düzenle</button>
        <button class="danger" data-action="pet-delete" data-id="${escapeHtml(pet.id)}">Sil</button>
      </div>
    </div>
  `).join('');
}

function renderRecords(items = []) {
  if (!items.length) return `<div class="admin-empty">Bu filtreye uyan kayıt yok.</div>`;
  return items.map((item) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(item.title || labelFrom(KIND_LABELS, item.kind, 'Kayıt'))}</strong>
        <small>${escapeHtml(labelFrom(KIND_LABELS, item.kind, item.kind))} · ${escapeHtml(item.type || '-')} · pet ${escapeHtml(item.pet_id || '-')} · ${fmtDate(item.event_at || item.created_at)}</small>
      </div>
      <div class="admin-actions">
        <span>${escapeHtml(labelFrom(KIND_LABELS, item.kind, item.kind))}</span>
        <button data-action="record-view" data-kind="${escapeHtml(item.kind)}" data-id="${escapeHtml(item.id)}">Gör</button>
        <button data-action="record-edit" data-kind="${escapeHtml(item.kind)}" data-id="${escapeHtml(item.id)}">Düzenle</button>
        <button class="danger" data-action="record-delete" data-kind="${escapeHtml(item.kind)}" data-id="${escapeHtml(item.id)}">Sil</button>
      </div>
    </div>
  `).join('');
}

function renderDocuments(items = []) {
  if (!items.length) return `<div class="admin-empty">Bu filtreye uyan belge yok.</div>`;
  return items.map((doc) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(doc.title || 'Başlıksız belge')}</strong>
        <small>${escapeHtml(doc.document_type || '-')} · ${escapeHtml(doc.pet_name || '-')} · ${escapeHtml(doc.user_name || doc.user_email || '-')}</small>
      </div>
      <div class="admin-actions">
        <span>${escapeHtml(labelFrom(STATUS_LABELS, doc.status, 'Taslak'))}</span>
        <button data-action="document-view" data-id="${escapeHtml(doc.id)}">Gör</button>
        <button data-action="document-edit" data-id="${escapeHtml(doc.id)}">Düzenle</button>
        <button class="danger" data-action="document-delete" data-id="${escapeHtml(doc.id)}">Sil</button>
      </div>
    </div>
  `).join('');
}

function renderUsage(items = []) {
  if (!items.length) return `<div class="admin-empty">Henüz kullanım kaydı yok.</div>`;
  return items.map((item) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(item.feature_code || 'feature')}</strong>
        <small>${escapeHtml(item.user_name || item.user_email || '-')} · ${escapeHtml(item.pet_name || '-')} · ${fmtDate(item.created_at)}</small>
      </div>
      <div class="admin-actions">
        <span>${escapeHtml(item.credit_cost || 0)} kredi</span>
      </div>
    </div>
  `).join('');
}

function renderPrice(cents, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(cents || 0) / 100);
}

function renderPlans(items = []) {
  if (!items.length) return `<div class="admin-empty">Plan bulunamadı.</div>`;
  return items.map((plan) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(plan.name_tr || plan.code)}</strong>
        <small>${escapeHtml(plan.code)} · ${escapeHtml(labelFrom(BILLING_LABELS, plan.billing_type, '-'))}${plan.billing_period ? `/${escapeHtml(labelFrom(BILLING_LABELS, plan.billing_period, plan.billing_period))}` : ''} · ${renderPrice(plan.price_cents, plan.currency)} · pet limiti ${escapeHtml(plan.max_pets ?? '-')} · aylık AI kredisi ${escapeHtml(plan.monthly_credit_allowance ?? 0)}${plan.play_product_id ? ` · Play ${escapeHtml(plan.play_product_id)}` : ''}</small>
      </div>
      <div class="admin-actions">
        <span>${Number(plan.is_active) ? 'Aktif' : 'Pasif'}</span>
        <button data-action="plan-edit" data-id="${escapeHtml(plan.id)}">Düzenle</button>
        <button class="danger" data-action="plan-delete" data-id="${escapeHtml(plan.id)}">Sil</button>
      </div>
    </div>
  `).join('');
}

function renderCreditPackages(items = []) {
  if (!items.length) return `<div class="admin-empty">Kredi paketi bulunamadı.</div>`;
  return items.map((pack) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(pack.name_tr || pack.code)}</strong>
        <small>${escapeHtml(pack.code)} · ${escapeHtml(pack.credit_amount || 0)} kredi · ${renderPrice(pack.price_cents, pack.currency)}${pack.play_product_id ? ` · Play ${escapeHtml(pack.play_product_id)}` : ''}</small>
      </div>
      <div class="admin-actions">
        <span>${Number(pack.is_active) ? 'Aktif' : 'Pasif'}</span>
        <button data-action="credit-package-edit" data-id="${escapeHtml(pack.id)}">Düzenle</button>
        <button class="danger" data-action="credit-package-delete" data-id="${escapeHtml(pack.id)}">Sil</button>
      </div>
    </div>
  `).join('');
}

function renderPayments(items = []) {
  if (!items.length) return `<div class="admin-empty">Ödeme kaydı bulunamadı.</div>`;
  return items.map((payment) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(payment.user_name || payment.user_email || payment.user_id)}</strong>
        <small>${escapeHtml(payment.provider || 'google_play')} · ${escapeHtml(labelFrom(BILLING_LABELS, payment.product_type, payment.product_type))} · ${escapeHtml(payment.product_id)} · ${renderPrice(payment.amount_cents, payment.currency)} · kredi ${escapeHtml(payment.credits_granted || 0)}</small>
      </div>
      <div class="admin-actions">
        <span>${escapeHtml(labelFrom(STATUS_LABELS, payment.status, 'Bekliyor'))}</span>
        <button data-action="payment-edit" data-id="${escapeHtml(payment.id)}">Düzenle</button>
        <button class="danger" data-action="payment-delete" data-id="${escapeHtml(payment.id)}">Sil</button>
      </div>
    </div>
  `).join('');
}

function renderLogin(error = '') {
  return `
    <div class="web-page admin-page">
      <main class="admin-login-shell">
        <section class="admin-login-card">
          <div class="premium-screen-kicker">Süper Yönetici</div>
          <h1>Yönetici Girişi</h1>
          <p>Kullanıcı, pet, kayıt, belge, ödeme ve canlı ayarlara doğrudan erişim.</p>
          <label><span>Kullanıcı adı / e-posta</span><input id="adminUsername" autocomplete="username" placeholder="a@b.com" /></label>
          <label><span>Şifre</span><input id="adminPassword" type="password" autocomplete="current-password" placeholder="Şifre" /></label>
          ${error ? `<div class="admin-error">${escapeHtml(error)}</div>` : ''}
          <button class="btn btn-primary" id="btnAdminLogin">Giriş Yap</button>
          <button class="btn btn-ghost" id="btnWeb">Web sitesine dön</button>
        </section>
      </main>
    </div>
  `;
}

function renderFilters() {
  const usersFilter = adminState.filters.users;
  const petsFilter = adminState.filters.pets;
  const recordsFilter = adminState.filters.records;
  const documentsFilter = adminState.filters.documents;
  const paymentsFilter = adminState.filters.payments;

  return `
    <section class="admin-grid admin-grid-2">
      <article class="admin-panel">
        <div class="admin-panel-head">
          <div><span>Kullanıcılar</span><h2>Kullanıcılar & Hesaplar</h2></div>
          <div class="admin-actions"><button data-action="user-add">Kullanıcı ekle</button></div>
        </div>
        <div class="admin-toolbar">
          <input id="usersQ" placeholder="Ad, e-posta, telefon ara" value="${escapeHtml(usersFilter.q)}" />
          <select id="usersStatus">
            <option value="">Tüm durumlar</option>
            <option value="active" ${usersFilter.status === 'active' ? 'selected' : ''}>Aktif</option>
            <option value="suspended" ${usersFilter.status === 'suspended' ? 'selected' : ''}>Askıda</option>
            <option value="deleted" ${usersFilter.status === 'deleted' ? 'selected' : ''}>Silindi</option>
          </select>
          <button data-action="users-search">Ara</button>
        </div>
        <div id="adminUsers">${renderUsers(adminState.users)}</div>
      </article>

      <article class="admin-panel">
        <div class="admin-panel-head">
          <div><span>Petler</span><h2>Petler & Sahiplik</h2></div>
          <div class="admin-actions"><button data-action="pet-add">Pet ekle</button></div>
        </div>
        <div class="admin-toolbar">
          <input id="petsQ" placeholder="Pet, sahip, tür ara" value="${escapeHtml(petsFilter.q)}" />
          <select id="petsOwner">
            ${optionList(adminState.lookups.users, 'id', 'display_name', petsFilter.ownerId, true, 'Tüm sahipler')}
          </select>
          <select id="petsStatus">
            <option value="">Tüm durumlar</option>
            <option value="active" ${petsFilter.status === 'active' ? 'selected' : ''}>Aktif</option>
            <option value="archived" ${petsFilter.status === 'archived' ? 'selected' : ''}>Arşiv</option>
            <option value="deleted" ${petsFilter.status === 'deleted' ? 'selected' : ''}>Silindi</option>
          </select>
          <button data-action="pets-search">Ara</button>
        </div>
        <div id="adminPets">${renderPets(adminState.pets)}</div>
      </article>

      <article class="admin-panel admin-panel-wide">
        <div class="admin-panel-head">
          <div><span>Kayıtlar</span><h2>Tüm Mobil Kayıtlar</h2></div>
          <div class="admin-actions">
            <button data-action="record-add" data-kind="health">Sağlık ekle</button>
            <button data-action="record-add" data-kind="measurement">Ölçüm ekle</button>
            <button data-action="record-add" data-kind="expense">Masraf ekle</button>
            <button data-action="record-add" data-kind="reminder">Hatırlatıcı ekle</button>
            <button data-action="record-add" data-kind="form">Form ekle</button>
          </div>
        </div>
        <div class="admin-toolbar admin-toolbar-wide">
          <input id="recordsQ" placeholder="Başlık, tür, özet ara" value="${escapeHtml(recordsFilter.q)}" />
          <select id="recordsKind">
            <option value="">Tüm türler</option>
            <option value="health" ${recordsFilter.kind === 'health' ? 'selected' : ''}>Sağlık</option>
            <option value="measurement" ${recordsFilter.kind === 'measurement' ? 'selected' : ''}>Ölçüm</option>
            <option value="expense" ${recordsFilter.kind === 'expense' ? 'selected' : ''}>Masraf</option>
            <option value="reminder" ${recordsFilter.kind === 'reminder' ? 'selected' : ''}>Hatırlatıcı</option>
            <option value="document" ${recordsFilter.kind === 'document' ? 'selected' : ''}>Belge</option>
            <option value="form" ${recordsFilter.kind === 'form' ? 'selected' : ''}>Form</option>
          </select>
          <select id="recordsPet">${petOptions(recordsFilter.petId, true)}</select>
          <select id="recordsUser">${optionList(adminState.lookups.users, 'id', 'display_name', recordsFilter.userId, true, 'Tüm kullanıcılar')}</select>
          <button data-action="records-search">Ara</button>
        </div>
        <div id="adminRecords">${renderRecords(adminState.records)}</div>
      </article>

      <article class="admin-panel">
        <div class="admin-panel-head">
          <div><span>Belgeler</span><h2>Belgeler & AI Dosyaları</h2></div>
          <div class="admin-actions"><button data-action="document-add">Belge ekle</button></div>
        </div>
        <div class="admin-toolbar">
          <input id="documentsQ" placeholder="Başlık, kullanıcı, pet ara" value="${escapeHtml(documentsFilter.q)}" />
          <select id="documentsStatus">
            <option value="">Tüm durumlar</option>
            <option value="draft" ${documentsFilter.status === 'draft' ? 'selected' : ''}>Taslak</option>
            <option value="ready" ${documentsFilter.status === 'ready' ? 'selected' : ''}>Hazır</option>
            <option value="archived" ${documentsFilter.status === 'archived' ? 'selected' : ''}>Arşiv</option>
          </select>
          <input id="documentsType" placeholder="Belge türü" value="${escapeHtml(documentsFilter.type)}" />
          <button data-action="documents-search">Ara</button>
        </div>
        <div id="adminDocuments">${renderDocuments(adminState.documents)}</div>
      </article>

      <article class="admin-panel">
        <div class="admin-panel-head">
          <div><span>Planlar</span><h2>Planlar & Ücret Modeli</h2></div>
          <div class="admin-actions"><button data-action="plan-add">Plan ekle</button></div>
        </div>
        <div id="adminPlans">${renderPlans(adminState.plans)}</div>
      </article>

      <article class="admin-panel">
        <div class="admin-panel-head">
          <div><span>Krediler</span><h2>Kredi Paketleri</h2></div>
          <div class="admin-actions"><button data-action="credit-package-add">Paket ekle</button></div>
        </div>
        <div id="adminCreditPackages">${renderCreditPackages(adminState.creditPackages)}</div>
      </article>

      <article class="admin-panel admin-panel-wide">
        <div class="admin-panel-head">
          <div><span>Ödemeler</span><h2>Mağaza Ödemeleri & Haklar</h2></div>
          <div class="admin-actions"><button data-action="payment-add">Ödeme ekle</button></div>
        </div>
        <div class="admin-toolbar">
          <input id="paymentsQ" placeholder="Kullanıcı, ürün, sağlayıcı ara" value="${escapeHtml(paymentsFilter.q)}" />
          <select id="paymentsStatus">
            <option value="">Tüm durumlar</option>
            <option value="pending" ${paymentsFilter.status === 'pending' ? 'selected' : ''}>Bekliyor</option>
            <option value="verified" ${paymentsFilter.status === 'verified' ? 'selected' : ''}>Doğrulandı</option>
            <option value="active" ${paymentsFilter.status === 'active' ? 'selected' : ''}>Aktif</option>
            <option value="refunded" ${paymentsFilter.status === 'refunded' ? 'selected' : ''}>İade edildi</option>
            <option value="cancelled" ${paymentsFilter.status === 'cancelled' ? 'selected' : ''}>İptal edildi</option>
          </select>
          <button data-action="payments-search">Ara</button>
        </div>
        <div id="adminPayments">${renderPayments(adminState.payments)}</div>
      </article>

      <article class="admin-panel">
        <div class="admin-panel-head"><div><span>Kullanım</span><h2>Özellik Kullanımı</h2></div></div>
        <div id="adminUsage">${renderUsage(adminState.usage)}</div>
      </article>

      <article class="admin-panel">
        <div class="admin-panel-head"><div><span>AI & Medya</span><h2>Uygulama Kontrolleri</h2></div></div>
        <form class="admin-settings-form" id="appSettingsForm">
          <label>
            <span>Otomatik medya kalite kontrolü</span>
            <select id="mediaQualityCheckEnabled">${yesNoOptions(adminState.settings.mediaQualityCheckEnabled ? '1' : '0')}</select>
          </label>
          <label>
            <span>Düşük kaliteli medyayı raporda dikkate alma</span>
            <select id="aiIgnoreLowQualityMedia">${yesNoOptions(adminState.settings.aiIgnoreLowQualityMedia ? '1' : '0')}</select>
          </label>
          <button class="btn btn-primary" type="submit">Uygulama kontrollerini kaydet</button>
        </form>
        <div class="admin-test-result" id="appSettingsResult">Medya kalite kontrolü şu an ${adminState.settings.mediaQualityCheckEnabled ? 'açık' : 'kapalı'}.</div>
      </article>

      <article class="admin-panel">
        <div class="admin-panel-head"><div><span>Güvenlik</span><h2>Yönetici Şifresi</h2></div></div>
        <form class="admin-settings-form" id="passwordForm">
          <input type="password" id="currentPassword" placeholder="Mevcut şifre" />
          <input type="password" id="newPassword" placeholder="Yeni şifre" />
          <button class="btn btn-primary" type="submit">Şifreyi değiştir</button>
        </form>
        <div class="admin-test-result" id="settingsResult">Bu alan sadece oturumdaki yönetici hesabının şifresini değiştirir.</div>
      </article>
    </section>
  `;
}

export function render() {
  if (!session()?.token) return renderLogin();
  const auth = session();
  const metrics = adminState.metrics || {};

  return `
    <div class="web-page admin-page">
      <header class="web-nav">
        <button type="button" class="web-brand" id="btnWeb"><span>${window.__icons?.paw || ''}</span><strong>Pet Help Yönetim</strong></button>
        <nav>
          <button type="button" id="btnRefresh">Yenile</button>
          <button type="button" id="btnMobile">Mobil ekranı aç</button>
          <button type="button" id="btnLogout">Çıkış</button>
        </nav>
      </header>

      <main class="admin-shell">
        <section class="admin-hero">
          <div>
            <div class="premium-screen-kicker">Süper Yönetici</div>
            <h1>Kullanıcı, pet, kayıt, belge ve ödeme yönetimi.</h1>
            <p>Oturum: ${escapeHtml(auth.admin?.username || 'admin')} · yetki ${escapeHtml(auth.admin?.role || 'super_admin')}</p>
          </div>
          <div class="admin-status-card ok" id="apiStatusCard">
            <span>Yönetim API</span>
            <strong>Bağlı</strong>
            <small>Canlı veritabanı yönetimi</small>
          </div>
        </section>

        <section class="admin-grid admin-grid-4" id="adminMetrics">
          ${metricCard('Kullanıcılar', metrics.users || 0, 'tüm hesaplar')}
          ${metricCard('Petler', metrics.pets || 0, 'tüm pet profilleri')}
          ${metricCard('Sağlık + ölçüm', (metrics.healthRecords || 0) + (metrics.measurements || 0), 'mobil kayıtlar')}
          ${metricCard('Belgeler + formlar', (metrics.documents || 0) + (metrics.formSubmissions || 0), 'belge ve form arşivi')}
        </section>

        ${renderFilters()}
      </main>

      <dialog class="admin-modal admin-modal-wide" id="adminModal"><div id="adminModalBody"></div></dialog>
    </div>
  `;
}

function renderState() {
  const metrics = adminState.metrics || {};
  const metricsTarget = document.getElementById('adminMetrics');
  if (metricsTarget) {
    metricsTarget.innerHTML = [
      metricCard('Kullanıcılar', metrics.users || 0, 'tüm hesaplar'),
      metricCard('Petler', metrics.pets || 0, 'tüm pet profilleri'),
      metricCard('Sağlık + ölçüm', (metrics.healthRecords || 0) + (metrics.measurements || 0), 'mobil kayıtlar'),
      metricCard('Belgeler + formlar', (metrics.documents || 0) + (metrics.formSubmissions || 0), 'belge ve form arşivi')
    ].join('');
  }
  const usersTarget = document.getElementById('adminUsers');
  const petsTarget = document.getElementById('adminPets');
  const recordsTarget = document.getElementById('adminRecords');
  const docsTarget = document.getElementById('adminDocuments');
  const usageTarget = document.getElementById('adminUsage');
  const plansTarget = document.getElementById('adminPlans');
  const creditPackagesTarget = document.getElementById('adminCreditPackages');
  const paymentsTarget = document.getElementById('adminPayments');
  if (usersTarget) usersTarget.innerHTML = renderUsers(adminState.users);
  if (petsTarget) petsTarget.innerHTML = renderPets(adminState.pets);
  if (recordsTarget) recordsTarget.innerHTML = renderRecords(adminState.records);
  if (docsTarget) docsTarget.innerHTML = renderDocuments(adminState.documents);
  if (usageTarget) usageTarget.innerHTML = renderUsage(adminState.usage);
  if (plansTarget) plansTarget.innerHTML = renderPlans(adminState.plans);
  if (creditPackagesTarget) creditPackagesTarget.innerHTML = renderCreditPackages(adminState.creditPackages);
  if (paymentsTarget) paymentsTarget.innerHTML = renderPayments(adminState.payments);
  const mediaQualitySelect = document.getElementById('mediaQualityCheckEnabled');
  const ignoreMediaSelect = document.getElementById('aiIgnoreLowQualityMedia');
  const appSettingsResult = document.getElementById('appSettingsResult');
  if (mediaQualitySelect) mediaQualitySelect.value = adminState.settings.mediaQualityCheckEnabled ? '1' : '0';
  if (ignoreMediaSelect) ignoreMediaSelect.value = adminState.settings.aiIgnoreLowQualityMedia ? '1' : '0';
  if (appSettingsResult) appSettingsResult.textContent = `Medya kalite kontrolü şu an ${adminState.settings.mediaQualityCheckEnabled ? 'açık' : 'kapalı'}.`;
  refreshFilterControls();
}

function refreshFilterControls() {
  const petsOwner = document.getElementById('petsOwner');
  const recordsPet = document.getElementById('recordsPet');
  const recordsUser = document.getElementById('recordsUser');
  if (petsOwner) petsOwner.innerHTML = optionList(adminState.lookups.users, 'id', 'display_name', adminState.filters.pets.ownerId, true, 'Tüm sahipler');
  if (recordsPet) recordsPet.innerHTML = petOptions(adminState.filters.records.petId, true);
  if (recordsUser) recordsUser.innerHTML = optionList(adminState.lookups.users, 'id', 'display_name', adminState.filters.records.userId, true, 'Tüm kullanıcılar');
}

async function loadOverview() {
  const data = await api('/api/admin/overview');
  adminState.metrics = data.metrics || {};
}

async function loadLookups() {
  adminState.lookups = await api('/api/admin/lookups');
}

function queryString(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

async function loadUsers() {
  adminState.users = await api(`/api/admin/users${queryString(adminState.filters.users)}`);
}

async function loadPets() {
  adminState.pets = await api(`/api/admin/pets${queryString(adminState.filters.pets)}`);
}

async function loadRecords() {
  adminState.records = await api(`/api/admin/records${queryString(adminState.filters.records)}`);
}

async function loadDocuments() {
  adminState.documents = await api(`/api/admin/documents${queryString(adminState.filters.documents)}`);
}

async function loadUsage() {
  adminState.usage = await api('/api/admin/usage?limit=40');
}

async function loadPlans() {
  adminState.plans = await api('/api/admin/plans');
}

async function loadCreditPackages() {
  adminState.creditPackages = await api('/api/admin/credit-packages');
}

async function loadPayments() {
  adminState.payments = await api(`/api/admin/payments${queryString(adminState.filters.payments)}`);
}

async function loadSettings() {
  try {
    adminState.settings = await api('/api/admin/settings');
  } catch {
    adminState.settings = {
      mediaQualityCheckEnabled: false,
      aiIgnoreLowQualityMedia: true
    };
  }
}

async function loadAll() {
  const statusCard = document.getElementById('apiStatusCard');
  try {
    await loadLookups();
    await Promise.all([loadOverview(), loadUsers(), loadPets(), loadRecords(), loadDocuments(), loadUsage(), loadPlans(), loadCreditPackages(), loadPayments(), loadSettings()]);
    renderState();
    if (statusCard) statusCard.innerHTML = `<span>Yönetim API</span><strong>Bağlı</strong><small>Canlı veritabanı yönetimi</small>`;
  } catch (error) {
    if (statusCard) statusCard.innerHTML = `<span>Yönetim API</span><strong>Bağlantı yok</strong><small>${escapeHtml(error.message)}</small>`;
    throw error;
  }
}

function bindLogin() {
  document.getElementById('btnAdminLogin')?.addEventListener('click', login);
  document.getElementById('adminPassword')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') login();
  });
  document.getElementById('btnWeb')?.addEventListener('click', () => navigate('/web'));
}

async function login() {
  try {
    const result = await api('/api/admin/login', {
      method: 'POST',
      body: { username: getValue('adminUsername').trim(), password: getValue('adminPassword') }
    });
    saveSession(result);
    navigate('/admin');
    window.location.reload();
  } catch {
    document.getElementById('app').innerHTML = renderLogin('Giriş başarısız.');
    bindLogin();
  }
}

function openModal(html) {
  const modal = document.getElementById('adminModal');
  document.getElementById('adminModalBody').innerHTML = html;
  modal?.showModal();
}

function closeModal() {
  document.getElementById('adminModal')?.close();
}

function baseFormActions(submitLabel = 'Kaydet') {
  return `
    <div class="admin-modal-actions">
      <button class="btn btn-primary" type="submit">${submitLabel}</button>
      <button class="btn btn-ghost" type="button" id="modalClose">İptal</button>
    </div>
  `;
}

function bindModalClose() {
  document.getElementById('modalClose')?.addEventListener('click', closeModal);
}

function openUserForm(user = null) {
  const metadata = prettyJson(user?.metadata || { location: {}, notificationPreference: 'push' });
  openModal(`
    <form class="admin-modal-card admin-modal-card-wide" id="userForm">
      <h3>${user ? 'Kullanıcıyı düzenle' : 'Kullanıcı ekle'}</h3>
      <div class="admin-form-grid">
        <label><span>Ad</span><input id="userDisplayName" value="${escapeHtml(user?.display_name || '')}" required /></label>
        <label><span>E-posta</span><input id="userEmail" value="${escapeHtml(user?.email || '')}" /></label>
        <label><span>Telefon</span><input id="userPhone" value="${escapeHtml(user?.phone || '')}" /></label>
        <label><span>Dil</span><select id="userLocale">${localeOptions(user?.locale || 'tr')}</select></label>
        <label><span>Saat dilimi</span><input id="userTimezone" value="${escapeHtml(user?.timezone || 'Europe/Istanbul')}" /></label>
        <label><span>Durum</span>
          <select id="userStatus">
            <option value="active" ${user?.status === 'active' ? 'selected' : ''}>Aktif</option>
            <option value="suspended" ${user?.status === 'suspended' ? 'selected' : ''}>Askıda</option>
            <option value="deleted" ${user?.status === 'deleted' ? 'selected' : ''}>Silindi</option>
          </select>
        </label>
      </div>
      <label><span>Metadata JSON</span><textarea id="userMetadata" rows="10" spellcheck="false" placeholder='{"location":{"country":"TR"}}'>${escapeHtml(metadata)}</textarea></label>
      ${baseFormActions(user ? 'Kullanıcıyı güncelle' : 'Kullanıcı oluştur')}
    </form>
  `);
  bindModalClose();
  document.getElementById('userForm').onsubmit = async (event) => {
    event.preventDefault();
    const body = {
      display_name: getValue('userDisplayName'),
      email: getValue('userEmail'),
      phone: getValue('userPhone'),
      locale: getValue('userLocale'),
      timezone: getValue('userTimezone'),
      status: getValue('userStatus'),
      metadata: getValue('userMetadata')
    };
    if (user?.id) await api(`/api/admin/users/${user.id}`, { method: 'POST', body });
    else await api('/api/admin/users', { method: 'POST', body });
    closeModal();
    await Promise.all([loadUsers(), loadLookups(), loadOverview()]);
    renderState();
  };
}

function openPetForm(pet = null) {
  const meta = prettyJson(pet?.metadata || { breed: '', chronic: '', allergies: '', medications: '', location: '', volunteerNote: '' });
  openModal(`
    <form class="admin-modal-card admin-modal-card-wide" id="petForm">
      <h3>${pet ? 'Peti düzenle' : 'Pet ekle'}</h3>
      <div class="admin-form-grid">
        <label><span>Ad</span><input id="petName" value="${escapeHtml(pet?.name || '')}" required /></label>
        <label><span>Sahip</span><select id="petOwner">${userOptions(pet?.primary_owner_user_id || pet?.owner_user_id || '')}</select></label>
        <label><span>Tür</span><select id="petSpecies">${speciesOptions(pet?.species_code || 'cat')}</select></label>
        <label><span>Cinsiyet</span><select id="petSex">
          <option value="female" ${pet?.sex === 'female' ? 'selected' : ''}>Dişi</option>
          <option value="male" ${pet?.sex === 'male' ? 'selected' : ''}>Erkek</option>
          <option value="unknown" ${(!pet?.sex || pet?.sex === 'unknown') ? 'selected' : ''}>Bilinmiyor</option>
        </select></label>
        <label><span>Doğum tarihi</span><input id="petBirthDate" type="date" value="${escapeHtml((pet?.birth_date || '').slice(0, 10))}" /></label>
        <label><span>Kilo kg</span><input id="petWeight" type="number" step="0.1" value="${escapeHtml(pet?.weight_kg ?? '')}" /></label>
        <label><span>Kısırlaştırma</span><select id="petNeutered">
          <option value="yes" ${pet?.neutered_status === 'yes' ? 'selected' : ''}>Evet</option>
          <option value="no" ${pet?.neutered_status === 'no' ? 'selected' : ''}>Hayır</option>
          <option value="unknown" ${(!pet?.neutered_status || pet?.neutered_status === 'unknown') ? 'selected' : ''}>Bilinmiyor</option>
        </select></label>
        <label><span>Sahiplik</span><select id="petOwnership">
          <option value="owned" ${(!pet?.ownership_type || pet?.ownership_type === 'owned') ? 'selected' : ''}>Sahipli</option>
          <option value="family" ${pet?.ownership_type === 'family' ? 'selected' : ''}>Aile</option>
          <option value="foster" ${pet?.ownership_type === 'foster' ? 'selected' : ''}>Geçici bakım</option>
          <option value="shelter" ${pet?.ownership_type === 'shelter' ? 'selected' : ''}>Barınak</option>
        </select></label>
        <label><span>Durum</span>
          <select id="petStatus">
            <option value="active" ${pet?.status === 'active' ? 'selected' : ''}>Aktif</option>
            <option value="archived" ${pet?.status === 'archived' ? 'selected' : ''}>Arşiv</option>
            <option value="deleted" ${pet?.status === 'deleted' ? 'selected' : ''}>Silindi</option>
          </select>
        </label>
        <label><span>Profil görseli URL</span><input id="petAvatar" value="${escapeHtml(pet?.avatar_url || '')}" /></label>
      </div>
      <label><span>Sağlık özeti</span><textarea id="petSummary">${escapeHtml(pet?.medical_summary || '')}</textarea></label>
      <label><span>Metadata JSON</span><textarea id="petMetadata" rows="10" spellcheck="false" placeholder='{"breed":"british shorthair"}'>${escapeHtml(meta)}</textarea></label>
      ${baseFormActions(pet ? 'Peti güncelle' : 'Pet oluştur')}
    </form>
  `);
  bindModalClose();
  document.getElementById('petForm').onsubmit = async (event) => {
    event.preventDefault();
    const body = {
      name: getValue('petName'),
      ownerUserId: getValue('petOwner'),
      speciesCode: getValue('petSpecies'),
      sex: getValue('petSex'),
      birthDate: getValue('petBirthDate'),
      weightKg: getValue('petWeight'),
      neuteredStatus: getValue('petNeutered'),
      ownershipType: getValue('petOwnership'),
      status: getValue('petStatus'),
      avatarUrl: getValue('petAvatar'),
      medicalSummary: getValue('petSummary'),
      metadata: getValue('petMetadata')
    };
    if (pet?.id) await api(`/api/admin/pets/${pet.id}`, { method: 'POST', body });
    else await api('/api/admin/pets', { method: 'POST', body });
    closeModal();
    await Promise.all([loadPets(), loadLookups(), loadOverview()]);
    renderState();
  };
}

function recordKindFields(kind, record = {}) {
  if (kind === 'health') {
    return `
      <div class="admin-form-grid">
        <label><span>Pet</span><select id="recordPet">${petOptions(record.pet_id || '', false)}</select></label>
        <label><span>Kullanıcı</span><select id="recordUser">${userOptions(record.created_by_user_id || record.user_id || '')}</select></label>
        <label><span>Kayıt türü</span><input id="recordType" value="${escapeHtml(record.record_type || record.type || '')}" /></label>
        <label><span>Olay zamanı</span><input id="recordDate" type="datetime-local" value="${escapeHtml(datetimeLocalValue(record.occurred_at))}" /></label>
      </div>
      <label><span>Başlık</span><input id="recordTitle" value="${escapeHtml(record.title || '')}" /></label>
      <label><span>Özet</span><textarea id="recordSummary">${escapeHtml(record.summary || '')}</textarea></label>
      <label><span>Payload JSON</span><textarea id="recordPayload" rows="10" spellcheck="false">${escapeHtml(prettyJson(record.payload || {}))}</textarea></label>
    `;
  }
  if (kind === 'measurement') {
    return `
      <div class="admin-form-grid">
        <label><span>Pet</span><select id="recordPet">${petOptions(record.pet_id || '', false)}</select></label>
        <label><span>Kullanıcı</span><select id="recordUser">${userOptions(record.created_by_user_id || record.user_id || '')}</select></label>
        <label><span>Ölçüm türü</span><input id="recordType" value="${escapeHtml(record.measurement_type || record.title || '')}" /></label>
        <label><span>Ölçüm zamanı</span><input id="recordDate" type="datetime-local" value="${escapeHtml(datetimeLocalValue(record.measured_at))}" /></label>
        <label><span>Değer</span><input id="recordValue" type="number" step="0.1" value="${escapeHtml(record.value ?? '')}" /></label>
        <label><span>Birim</span><input id="recordUnit" value="${escapeHtml(record.unit || '')}" /></label>
      </div>
      <label><span>Not</span><textarea id="recordNote">${escapeHtml(record.note || '')}</textarea></label>
      <label><span>Metadata JSON</span><textarea id="recordPayload" rows="10" spellcheck="false">${escapeHtml(prettyJson(record.metadata || {}))}</textarea></label>
    `;
  }
  if (kind === 'expense') {
    return `
      <div class="admin-form-grid">
        <label><span>Pet</span><select id="recordPet">${petOptions(record.pet_id || '', false)}</select></label>
        <label><span>Kullanıcı</span><select id="recordUser">${userOptions(record.created_by_user_id || record.user_id || '')}</select></label>
        <label><span>Kategori</span><input id="recordType" value="${escapeHtml(record.category || record.type || '')}" /></label>
        <label><span>Harcama zamanı</span><input id="recordDate" type="datetime-local" value="${escapeHtml(datetimeLocalValue(record.spent_at))}" /></label>
        <label><span>Tutar kuruş</span><input id="recordValue" type="number" step="1" value="${escapeHtml(record.amount_cents ?? '')}" /></label>
        <label><span>Para birimi</span><select id="recordUnit">
          <option value="TRY" ${(record.currency || 'TRY') === 'TRY' ? 'selected' : ''}>TRY</option>
          <option value="USD" ${record.currency === 'USD' ? 'selected' : ''}>USD</option>
          <option value="EUR" ${record.currency === 'EUR' ? 'selected' : ''}>EUR</option>
        </select></label>
      </div>
      <label><span>Başlık</span><input id="recordTitle" value="${escapeHtml(record.title || '')}" /></label>
      <label><span>Not</span><textarea id="recordNote">${escapeHtml(record.note || '')}</textarea></label>
      <label><span>Metadata JSON</span><textarea id="recordPayload" rows="10" spellcheck="false">${escapeHtml(prettyJson(record.metadata || {}))}</textarea></label>
    `;
  }
  if (kind === 'reminder') {
    return `
      <div class="admin-form-grid">
        <label><span>Pet</span><select id="recordPet">${petOptions(record.pet_id || '', false)}</select></label>
        <label><span>Kullanıcı</span><select id="recordUser">${userOptions(record.created_by_user_id || record.user_id || '')}</select></label>
        <label><span>Hatırlatıcı türü</span><input id="recordType" value="${escapeHtml(record.reminder_type || record.type || '')}" /></label>
        <label><span>Zamanı</span><input id="recordDate" type="datetime-local" value="${escapeHtml(datetimeLocalValue(record.due_at))}" /></label>
        <label><span>Durum</span><select id="recordStatus">
          <option value="scheduled" ${(!record.status || record.status === 'scheduled') ? 'selected' : ''}>Planlandı</option>
          <option value="completed" ${record.status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
          <option value="skipped" ${record.status === 'skipped' ? 'selected' : ''}>Atlandı</option>
          <option value="canceled" ${record.status === 'canceled' ? 'selected' : ''}>İptal edildi</option>
        </select></label>
        <label><span>Tekrar kuralı</span><input id="recordUnit" value="${escapeHtml(record.repeat_rule || '')}" /></label>
      </div>
      <label><span>Başlık</span><input id="recordTitle" value="${escapeHtml(record.title || '')}" /></label>
      <label><span>Not</span><textarea id="recordNote">${escapeHtml(record.note || '')}</textarea></label>
      <label><span>Metadata JSON</span><textarea id="recordPayload" rows="10" spellcheck="false">${escapeHtml(prettyJson(record.metadata || {}))}</textarea></label>
    `;
  }
  return `
    <div class="admin-form-grid">
      <label><span>Kullanıcı</span><select id="recordUser">${userOptions(record.user_id || '', false)}</select></label>
      <label><span>Pet</span><select id="recordPet">${petOptions(record.pet_id || '', true)}</select></label>
      <label><span>Özellik kodu</span><input id="recordType" value="${escapeHtml(record.feature_code || record.title || '')}" /></label>
      <label><span>Dil</span><select id="recordUnit">${localeOptions(record.locale || 'tr')}</select></label>
      <label><span>Durum</span><select id="recordStatus">
        <option value="draft" ${(!record.status || record.status === 'draft') ? 'selected' : ''}>Taslak</option>
        <option value="ready" ${record.status === 'ready' ? 'selected' : ''}>Hazır</option>
        <option value="archived" ${record.status === 'archived' ? 'selected' : ''}>Arşiv</option>
      </select></label>
    </div>
    <label><span>Payload JSON</span><textarea id="recordPayload" rows="10" spellcheck="false">${escapeHtml(prettyJson(record.payload || {}))}</textarea></label>
  `;
}

function openRecordForm(kind, detail = null) {
  const record = detail?.record || {};
  openModal(`
    <form class="admin-modal-card admin-modal-card-wide" id="recordForm">
      <h3>${record.id ? `${labelFrom(KIND_LABELS, kind, kind)} kaydını düzenle` : `${labelFrom(KIND_LABELS, kind, kind)} kaydı ekle`}</h3>
      ${recordKindFields(kind, record)}
      ${baseFormActions(record.id ? 'Kaydı güncelle' : 'Kayıt oluştur')}
    </form>
  `);
  bindModalClose();
  document.getElementById('recordForm').onsubmit = async (event) => {
    event.preventDefault();
    const body = kind === 'health' ? {
      petId: getValue('recordPet'),
      userId: getValue('recordUser'),
      recordType: getValue('recordType'),
      occurredAt: getValue('recordDate'),
      title: getValue('recordTitle'),
      summary: getValue('recordSummary'),
      payload: getValue('recordPayload')
    } : kind === 'measurement' ? {
      petId: getValue('recordPet'),
      userId: getValue('recordUser'),
      measurementType: getValue('recordType'),
      measuredAt: getValue('recordDate'),
      value: getValue('recordValue'),
      unit: getValue('recordUnit'),
      note: getValue('recordNote'),
      metadata: getValue('recordPayload')
    } : kind === 'expense' ? {
      petId: getValue('recordPet'),
      userId: getValue('recordUser'),
      category: getValue('recordType'),
      spentAt: getValue('recordDate'),
      amountCents: getValue('recordValue'),
      currency: getValue('recordUnit'),
      title: getValue('recordTitle'),
      note: getValue('recordNote'),
      metadata: getValue('recordPayload')
    } : kind === 'reminder' ? {
      petId: getValue('recordPet'),
      userId: getValue('recordUser'),
      reminderType: getValue('recordType'),
      dueAt: getValue('recordDate'),
      status: getValue('recordStatus'),
      repeatRule: getValue('recordUnit'),
      title: getValue('recordTitle'),
      note: getValue('recordNote'),
      metadata: getValue('recordPayload')
    } : {
      petId: getValue('recordPet'),
      userId: getValue('recordUser'),
      featureCode: getValue('recordType'),
      locale: getValue('recordUnit'),
      status: getValue('recordStatus'),
      payload: getValue('recordPayload')
    };
    if (record.id) await api(`/api/admin/records/${kind}/${record.id}`, { method: 'POST', body });
    else await api(`/api/admin/records/${kind}`, { method: 'POST', body });
    closeModal();
    await Promise.all([loadRecords(), loadOverview()]);
    renderState();
  };
}

function openDocumentForm(doc = null) {
  openModal(`
    <form class="admin-modal-card admin-modal-card-wide" id="documentForm">
      <h3>${doc?.id ? 'Belgeyi düzenle' : 'Belge ekle'}</h3>
      <div class="admin-form-grid">
        <label><span>Pet</span><select id="documentPet">${petOptions(doc?.pet_id || '', false)}</select></label>
        <label><span>Kullanıcı</span><select id="documentUser">${userOptions(doc?.uploaded_by_user_id || doc?.user_id || '', false)}</select></label>
        <label><span>Belge türü</span><input id="documentType" value="${escapeHtml(doc?.document_type || '')}" /></label>
        <label><span>Durum</span><select id="documentStatus">
          <option value="draft" ${(!doc?.status || doc?.status === 'draft') ? 'selected' : ''}>Taslak</option>
          <option value="ready" ${doc?.status === 'ready' ? 'selected' : ''}>Hazır</option>
          <option value="archived" ${doc?.status === 'archived' ? 'selected' : ''}>Arşiv</option>
        </select></label>
        <label><span>Dosya medya ID</span><input id="documentFileMedia" value="${escapeHtml(doc?.file_media_id || '')}" /></label>
      </div>
      <label><span>Başlık</span><input id="documentTitle" value="${escapeHtml(doc?.title || '')}" /></label>
      <label><span>Okunan metin</span><textarea id="documentText" rows="8">${escapeHtml(doc?.extracted_text || '')}</textarea></label>
      <label><span>Okunan veri JSON</span><textarea id="documentData" rows="10" spellcheck="false">${escapeHtml(prettyJson(doc?.extracted_data || {}))}</textarea></label>
      ${baseFormActions(doc?.id ? 'Belgeyi güncelle' : 'Belge oluştur')}
    </form>
  `);
  bindModalClose();
  document.getElementById('documentForm').onsubmit = async (event) => {
    event.preventDefault();
    const body = {
      petId: getValue('documentPet'),
      userId: getValue('documentUser'),
      documentType: getValue('documentType'),
      status: getValue('documentStatus'),
      fileMediaId: getValue('documentFileMedia'),
      title: getValue('documentTitle'),
      extractedText: getValue('documentText'),
      extractedData: getValue('documentData')
    };
    if (doc?.id) await api(`/api/admin/documents/${doc.id}`, { method: 'POST', body });
    else await api('/api/admin/documents', { method: 'POST', body });
    closeModal();
    await Promise.all([loadDocuments(), loadOverview()]);
    renderState();
  };
}

function openPlanForm(plan = null) {
  openModal(`
    <form class="admin-modal-card admin-modal-card-wide" id="planForm">
      <h3>${plan?.id ? 'Planı düzenle' : 'Plan ekle'}</h3>
      <div class="admin-form-grid">
        <label><span>Kod</span><input id="planCode" value="${escapeHtml(plan?.code || '')}" /></label>
        <label><span>Ücret tipi</span><select id="planBillingType">
          <option value="free" ${(!plan?.billing_type || plan.billing_type === 'free') ? 'selected' : ''}>Ücretsiz</option>
          <option value="credit" ${plan?.billing_type === 'credit' ? 'selected' : ''}>Kredi</option>
          <option value="subscription" ${plan?.billing_type === 'subscription' ? 'selected' : ''}>Abonelik</option>
        </select></label>
        <label><span>Ücret dönemi</span><select id="planBillingPeriod">
          <option value="" ${!plan?.billing_period ? 'selected' : ''}>Yok</option>
          <option value="monthly" ${plan?.billing_period === 'monthly' ? 'selected' : ''}>Aylık</option>
          <option value="yearly" ${plan?.billing_period === 'yearly' ? 'selected' : ''}>Yıllık</option>
        </select></label>
        <label><span>Ad (TR)</span><input id="planName" value="${escapeHtml(plan?.name_tr || '')}" /></label>
        <label><span>Fiyat kuruş</span><input id="planPrice" type="number" step="1" value="${escapeHtml(plan?.price_cents ?? 0)}" /></label>
        <label><span>Para birimi</span><select id="planCurrency">
          <option value="TRY" ${(plan?.currency || 'TRY') === 'TRY' ? 'selected' : ''}>TRY</option>
          <option value="USD" ${plan?.currency === 'USD' ? 'selected' : ''}>USD</option>
          <option value="EUR" ${plan?.currency === 'EUR' ? 'selected' : ''}>EUR</option>
        </select></label>
        <label><span>Google Play ürün ID</span><input id="planPlayProductId" value="${escapeHtml(plan?.play_product_id || '')}" /></label>
        <label><span>Pet limiti</span><input id="planPets" type="number" step="1" value="${escapeHtml(plan?.max_pets ?? '')}" /></label>
        <label><span>Aylık kredi</span><input id="planCredits" type="number" step="1" value="${escapeHtml(plan?.monthly_credit_allowance ?? 0)}" /></label>
        <label><span>Aktif</span><select id="planActive">${yesNoOptions(Number(plan?.is_active ?? 1))}</select></label>
      </div>
      <label><span>Özellikler JSON</span><textarea id="planFeatures" rows="10" spellcheck="false">${escapeHtml(prettyJson(plan?.features || {}))}</textarea></label>
      ${baseFormActions(plan?.id ? 'Planı güncelle' : 'Plan oluştur')}
    </form>
  `);
  bindModalClose();
  document.getElementById('planForm').onsubmit = async (event) => {
    event.preventDefault();
    const body = {
      code: getValue('planCode'),
      billingType: getValue('planBillingType'),
      billingPeriod: getValue('planBillingPeriod'),
      nameTr: getValue('planName'),
      priceCents: getValue('planPrice'),
      currency: getValue('planCurrency'),
      playProductId: getValue('planPlayProductId'),
      maxPets: getValue('planPets'),
      monthlyCreditAllowance: getValue('planCredits'),
      is_active: getValue('planActive'),
      features: getValue('planFeatures')
    };
    if (plan?.id) await api(`/api/admin/plans/${plan.id}`, { method: 'POST', body });
    else await api('/api/admin/plans', { method: 'POST', body });
    closeModal();
    await loadPlans();
    renderState();
  };
}

function openCreditPackageForm(pack = null) {
  openModal(`
    <form class="admin-modal-card admin-modal-card-wide" id="creditPackageForm">
      <h3>${pack?.id ? 'Kredi paketini düzenle' : 'Kredi paketi ekle'}</h3>
      <div class="admin-form-grid">
        <label><span>Kod</span><input id="creditPackageCode" value="${escapeHtml(pack?.code || '')}" /></label>
        <label><span>Ad (TR)</span><input id="creditPackageName" value="${escapeHtml(pack?.name_tr || '')}" /></label>
        <label><span>Kredi adedi</span><input id="creditPackageAmount" type="number" step="1" value="${escapeHtml(pack?.credit_amount ?? 1)}" /></label>
        <label><span>Fiyat kuruş</span><input id="creditPackagePrice" type="number" step="1" value="${escapeHtml(pack?.price_cents ?? 0)}" /></label>
        <label><span>Para birimi</span><select id="creditPackageCurrency">
          <option value="TRY" ${(pack?.currency || 'TRY') === 'TRY' ? 'selected' : ''}>TRY</option>
          <option value="USD" ${pack?.currency === 'USD' ? 'selected' : ''}>USD</option>
          <option value="EUR" ${pack?.currency === 'EUR' ? 'selected' : ''}>EUR</option>
        </select></label>
        <label><span>Google Play ürün ID</span><input id="creditPackagePlayProductId" value="${escapeHtml(pack?.play_product_id || '')}" /></label>
        <label><span>Sıralama</span><input id="creditPackageOrder" type="number" step="1" value="${escapeHtml(pack?.sort_order ?? 0)}" /></label>
        <label><span>Aktif</span><select id="creditPackageActive">${yesNoOptions(Number(pack?.is_active ?? 1))}</select></label>
      </div>
      <label><span>Metadata JSON</span><textarea id="creditPackageMetadata" rows="8" spellcheck="false">${escapeHtml(prettyJson(pack?.metadata || { aiCreditCost: 1 }))}</textarea></label>
      ${baseFormActions(pack?.id ? 'Paketi güncelle' : 'Paket oluştur')}
    </form>
  `);
  bindModalClose();
  document.getElementById('creditPackageForm').onsubmit = async (event) => {
    event.preventDefault();
    const body = {
      code: getValue('creditPackageCode'),
      nameTr: getValue('creditPackageName'),
      creditAmount: getValue('creditPackageAmount'),
      priceCents: getValue('creditPackagePrice'),
      currency: getValue('creditPackageCurrency'),
      playProductId: getValue('creditPackagePlayProductId'),
      sortOrder: getValue('creditPackageOrder'),
      is_active: getValue('creditPackageActive'),
      metadata: getValue('creditPackageMetadata')
    };
    if (pack?.id) await api(`/api/admin/credit-packages/${pack.id}`, { method: 'POST', body });
    else await api('/api/admin/credit-packages', { method: 'POST', body });
    closeModal();
    await loadCreditPackages();
    renderState();
  };
}

function creditPackageOptions(selected = '') {
  return optionList(adminState.creditPackages, 'id', 'name_tr', selected, true, 'Kredi paketi yok');
}

function openPaymentForm(payment = null) {
  openModal(`
    <form class="admin-modal-card admin-modal-card-wide" id="paymentForm">
      <h3>${payment?.id ? 'Ödemeyi düzenle' : 'Ödeme ekle'}</h3>
      <div class="admin-form-grid">
        <label><span>Kullanıcı</span><select id="paymentUser">${userOptions(payment?.user_id || '')}</select></label>
        <label><span>Sağlayıcı</span><input id="paymentProvider" value="${escapeHtml(payment?.provider || 'google_play')}" /></label>
        <label><span>Ürün tipi</span><select id="paymentProductType">
          <option value="subscription" ${(!payment?.product_type || payment.product_type === 'subscription') ? 'selected' : ''}>Abonelik</option>
          <option value="credit" ${payment?.product_type === 'credit' ? 'selected' : ''}>Kredi</option>
        </select></label>
        <label><span>Ürün ID</span><input id="paymentProductId" value="${escapeHtml(payment?.product_id || '')}" /></label>
        <label><span>Plan</span><select id="paymentPlan">${optionList(adminState.lookups.plans, 'id', 'name_tr', payment?.plan_id || '', true, 'Plan yok')}</select></label>
        <label><span>Kredi paketi</span><select id="paymentCreditPackage">${creditPackageOptions(payment?.credit_package_id || '')}</select></label>
        <label><span>Durum</span><select id="paymentStatus">
          <option value="pending" ${(!payment?.status || payment.status === 'pending') ? 'selected' : ''}>Bekliyor</option>
          <option value="verified" ${payment?.status === 'verified' ? 'selected' : ''}>Doğrulandı</option>
          <option value="active" ${payment?.status === 'active' ? 'selected' : ''}>Aktif</option>
          <option value="refunded" ${payment?.status === 'refunded' ? 'selected' : ''}>İade edildi</option>
          <option value="cancelled" ${payment?.status === 'cancelled' ? 'selected' : ''}>İptal edildi</option>
        </select></label>
        <label><span>Tutar kuruş</span><input id="paymentAmount" type="number" step="1" value="${escapeHtml(payment?.amount_cents ?? 0)}" /></label>
        <label><span>Para birimi</span><select id="paymentCurrency">
          <option value="TRY" ${(payment?.currency || 'TRY') === 'TRY' ? 'selected' : ''}>TRY</option>
          <option value="USD" ${payment?.currency === 'USD' ? 'selected' : ''}>USD</option>
          <option value="EUR" ${payment?.currency === 'EUR' ? 'selected' : ''}>EUR</option>
        </select></label>
        <label><span>Verilen kredi</span><input id="paymentCreditsGranted" type="number" step="1" value="${escapeHtml(payment?.credits_granted ?? 0)}" /></label>
        <label><span>Satın alma zamanı</span><input id="paymentPurchasedAt" type="datetime-local" value="${escapeHtml(datetimeLocalValue(payment?.purchased_at))}" /></label>
        <label><span>Bitiş zamanı</span><input id="paymentExpiresAt" type="datetime-local" value="${escapeHtml(datetimeLocalValue(payment?.expires_at))}" /></label>
      </div>
      <label><span>Satın alma token</span><input id="paymentToken" value="${escapeHtml(payment?.purchase_token || '')}" /></label>
      <label><span>Metadata JSON</span><textarea id="paymentMetadata" rows="8" spellcheck="false">${escapeHtml(prettyJson(payment?.metadata || {}))}</textarea></label>
      ${baseFormActions(payment?.id ? 'Ödemeyi güncelle' : 'Ödeme oluştur')}
    </form>
  `);
  bindModalClose();
  document.getElementById('paymentForm').onsubmit = async (event) => {
    event.preventDefault();
    const body = {
      userId: getValue('paymentUser'),
      provider: getValue('paymentProvider'),
      productType: getValue('paymentProductType'),
      productId: getValue('paymentProductId'),
      planId: getValue('paymentPlan'),
      creditPackageId: getValue('paymentCreditPackage'),
      status: getValue('paymentStatus'),
      amountCents: getValue('paymentAmount'),
      currency: getValue('paymentCurrency'),
      creditsGranted: getValue('paymentCreditsGranted'),
      purchasedAt: getValue('paymentPurchasedAt'),
      expiresAt: getValue('paymentExpiresAt'),
      purchaseToken: getValue('paymentToken'),
      metadata: getValue('paymentMetadata')
    };
    if (payment?.id) await api(`/api/admin/payments/${payment.id}`, { method: 'POST', body });
    else await api('/api/admin/payments', { method: 'POST', body });
    closeModal();
    await Promise.all([loadPayments(), loadOverview()]);
    renderState();
  };
}

function openReadOnly(title, object) {
  openModal(`
    <div class="admin-modal-card admin-modal-card-wide">
      <h3>${escapeHtml(title)}</h3>
      <pre class="admin-json-view">${escapeHtml(prettyJson(object))}</pre>
      <div class="admin-modal-actions">
        <button class="btn btn-ghost" type="button" id="modalClose">Kapat</button>
      </div>
    </div>
  `);
  bindModalClose();
}

function openCreditForm(userId) {
  openModal(`
    <form class="admin-modal-card" id="creditForm">
      <h3>Kredi düzenle</h3>
      <label><span>Tutar</span><input id="creditAmount" type="number" placeholder="+10 veya -5" /></label>
      <label><span>Not</span><input id="creditNote" placeholder="Gerekçe" /></label>
      ${baseFormActions('Uygula')}
    </form>
  `);
  bindModalClose();
  document.getElementById('creditForm').onsubmit = async (event) => {
    event.preventDefault();
    await api('/api/admin/credits/adjust', { method: 'POST', body: { userId, amount: getValue('creditAmount'), note: getValue('creditNote') } });
    closeModal();
    await Promise.all([loadUsers(), loadOverview()]);
    renderState();
  };
}

function openUserPlanForm(userId) {
  openModal(`
    <form class="admin-modal-card" id="userPlanForm">
      <h3>Aktif plan ata</h3>
      <label><span>Plan</span><select id="assignPlanId">${planOptions()}</select></label>
      <label><span>Yenileme zamanı</span><input id="assignRenewsAt" type="datetime-local" /></label>
      <label><span>Not</span><input id="assignPlanNote" placeholder="İç not" /></label>
      ${baseFormActions('Ata')}
    </form>
  `);
  bindModalClose();
  document.getElementById('userPlanForm').onsubmit = async (event) => {
    event.preventDefault();
    await api('/api/admin/billing/plan', {
      method: 'POST',
      body: { userId, planId: getValue('assignPlanId'), renewsAt: getValue('assignRenewsAt'), note: getValue('assignPlanNote') }
    });
    closeModal();
    await Promise.all([loadUsers(), loadPlans()]);
    renderState();
  };
}

async function handleAction(button) {
  const action = button.dataset.action;
  const id = button.dataset.id;
  const kind = button.dataset.kind;

  if (action === 'users-search') {
    adminState.filters.users = { ...adminState.filters.users, q: getValue('usersQ').trim(), status: getValue('usersStatus') };
    await loadUsers();
    renderState();
    return;
  }
  if (action === 'pets-search') {
    adminState.filters.pets = { ...adminState.filters.pets, q: getValue('petsQ').trim(), status: getValue('petsStatus'), ownerId: getValue('petsOwner') };
    await loadPets();
    renderState();
    return;
  }
  if (action === 'records-search') {
    adminState.filters.records = {
      ...adminState.filters.records,
      q: getValue('recordsQ').trim(),
      kind: getValue('recordsKind'),
      petId: getValue('recordsPet'),
      userId: getValue('recordsUser')
    };
    await loadRecords();
    renderState();
    return;
  }
  if (action === 'documents-search') {
    adminState.filters.documents = { ...adminState.filters.documents, q: getValue('documentsQ').trim(), status: getValue('documentsStatus'), type: getValue('documentsType').trim() };
    await loadDocuments();
    renderState();
    return;
  }
  if (action === 'payments-search') {
    adminState.filters.payments = { ...adminState.filters.payments, q: getValue('paymentsQ').trim(), status: getValue('paymentsStatus') };
    await loadPayments();
    renderState();
    return;
  }

  if (action === 'user-add') return openUserForm();
  if (action === 'pet-add') return openPetForm();
  if (action === 'record-add') return openRecordForm(kind || 'health');
  if (action === 'document-add') return openDocumentForm();
  if (action === 'plan-add') return openPlanForm();
  if (action === 'credit-package-add') return openCreditPackageForm();
  if (action === 'payment-add') return openPaymentForm();

  if (action === 'user-view') return openReadOnly('Kullanıcı detayı', await api(`/api/admin/users/${id}`));
  if (action === 'user-edit') return openUserForm(await api(`/api/admin/users/${id}`));
  if (action === 'user-credit') return openCreditForm(id);
  if (action === 'user-plan') return openUserPlanForm(id);
  if (action === 'user-delete') {
    if (!window.confirm('Bu kullanıcı silindi olarak işaretlensin mi?')) return;
    await api(`/api/admin/users/${id}`, { method: 'DELETE' });
    await Promise.all([loadUsers(), loadOverview()]);
    renderState();
    return;
  }

  if (action === 'pet-view') return openReadOnly('Pet detayı', await api(`/api/admin/pets/${id}`));
  if (action === 'pet-edit') return openPetForm(await api(`/api/admin/pets/${id}`));
  if (action === 'pet-delete') {
    if (!window.confirm('Bu pet silindi olarak işaretlensin mi?')) return;
    await api(`/api/admin/pets/${id}`, { method: 'DELETE' });
    await Promise.all([loadPets(), loadOverview()]);
    renderState();
    return;
  }

  if (action === 'record-view') return openReadOnly(`${labelFrom(KIND_LABELS, kind, kind)} detayı`, await api(`/api/admin/records/${kind}/${id}`));
  if (action === 'record-edit') return openRecordForm(kind, await api(`/api/admin/records/${kind}/${id}`));
  if (action === 'record-delete') {
    if (!window.confirm('Bu kayıt kalıcı olarak silinsin mi?')) return;
    await api(`/api/admin/records/${kind}/${id}`, { method: 'DELETE' });
    await Promise.all([loadRecords(), loadOverview()]);
    renderState();
    return;
  }

  if (action === 'document-view') return openReadOnly('Belge detayı', await api(`/api/admin/documents/${id}`));
  if (action === 'document-edit') return openDocumentForm(await api(`/api/admin/documents/${id}`));
  if (action === 'document-delete') {
    if (!window.confirm('Bu belge kalıcı olarak silinsin mi?')) return;
    await api(`/api/admin/documents/${id}`, { method: 'DELETE' });
    await Promise.all([loadDocuments(), loadOverview()]);
    renderState();
    return;
  }

  if (action === 'plan-edit') {
    const plan = adminState.plans.find((item) => item.id === id);
    return openPlanForm(plan);
  }
  if (action === 'plan-delete') {
    if (!window.confirm('Bu plan kalıcı olarak silinsin mi?')) return;
    await api(`/api/admin/plans/${id}`, { method: 'DELETE' });
    await loadPlans();
    renderState();
    return;
  }
  if (action === 'credit-package-edit') {
    const pack = adminState.creditPackages.find((item) => item.id === id);
    return openCreditPackageForm(pack);
  }
  if (action === 'credit-package-delete') {
    if (!window.confirm('Bu kredi paketi kalıcı olarak silinsin mi?')) return;
    await api(`/api/admin/credit-packages/${id}`, { method: 'DELETE' });
    await loadCreditPackages();
    renderState();
    return;
  }
  if (action === 'payment-edit') {
    const payment = adminState.payments.find((item) => item.id === id);
    return openPaymentForm(payment);
  }
  if (action === 'payment-delete') {
    if (!window.confirm('Bu ödeme kaydı kalıcı olarak silinsin mi?')) return;
    await api(`/api/admin/payments/${id}`, { method: 'DELETE' });
    await Promise.all([loadPayments(), loadOverview()]);
    renderState();
  }
}

export function afterRender() {
  if (!session()?.token) {
    bindLogin();
    return;
  }

  document.getElementById('btnWeb')?.addEventListener('click', () => navigate('/web'));
  document.getElementById('btnMobile')?.addEventListener('click', () => navigate('/home'));
  document.getElementById('btnRefresh')?.addEventListener('click', () => loadAll().catch((error) => window.alert(error.message)));
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    localStorage.removeItem(SESSION_KEY);
    navigate('/admin');
    window.location.reload();
  });
  document.getElementById('passwordForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const target = document.getElementById('settingsResult');
    try {
      await api('/api/admin/settings/password', {
        method: 'POST',
        body: {
          currentPassword: getValue('currentPassword'),
          newPassword: getValue('newPassword'),
          keepToken: session()?.token
        }
      });
      if (target) target.textContent = 'Şifre güncellendi.';
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
    } catch (error) {
      if (target) target.textContent = error.message;
    }
  });
  document.getElementById('appSettingsForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const target = document.getElementById('appSettingsResult');
    try {
      const data = await api('/api/admin/settings', {
        method: 'POST',
        body: {
          mediaQualityCheckEnabled: getValue('mediaQualityCheckEnabled') === '1',
          aiIgnoreLowQualityMedia: getValue('aiIgnoreLowQualityMedia') === '1'
        }
      });
      adminState.settings = data;
      localStorage.setItem('pati_app_settings', JSON.stringify({
        mediaQualityCheckEnabled: Boolean(data.mediaQualityCheckEnabled),
        aiIgnoreLowQualityMedia: Boolean(data.aiIgnoreLowQualityMedia)
      }));
      if (target) target.textContent = `Kaydedildi. Medya kalite kontrolü ${data.mediaQualityCheckEnabled ? 'açık' : 'kapalı'}.`;
      renderState();
    } catch (error) {
      if (target) target.textContent = error.message;
    }
  });

  document.getElementById('app')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    handleAction(button).catch((error) => window.alert(error.message));
  });

  loadAll().catch((error) => {
    const card = document.getElementById('apiStatusCard');
    if (card) card.innerHTML = `<span>Yönetim API</span><strong>Bağlantı yok</strong><small>${escapeHtml(error.message)}</small>`;
  });
}
