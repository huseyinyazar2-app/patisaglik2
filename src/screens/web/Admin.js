import { navigate } from '../../router.js';
import { t } from '../../i18n/tr.js';

const API_FALLBACK = 'http://patisaglik2.46.225.9.243.sslip.io';
const SESSION_KEY = 'pati_admin_session';

let adminState = { users: [], pets: [], records: [], usage: [], documents: [], plans: [] };

function tx(key, vars = {}) {
  return String(t(key)).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
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
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

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
      return { base: base || 'same-origin', data: data.data };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('api_failed');
}

function metricCard(label, value, note) {
  return `<article class="admin-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;
}

function rowList(items, emptyText, renderItem) {
  if (!items?.length) return `<div class="admin-empty">${escapeHtml(emptyText)}</div>`;
  return items.slice(0, 14).map(renderItem).join('');
}

function planOptions() {
  return adminState.plans.map((plan) => `<option value="${escapeHtml(plan.id)}">${escapeHtml(plan.code)} · ${escapeHtml(plan.name_tr)}</option>`).join('');
}

function renderUsers(users = []) {
  return rowList(users, t('admin.empty_users'), (user) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(user.display_name || t('admin.unnamed_user'))}</strong>
        <small>${escapeHtml(user.phone || user.email || t('admin.no_contact'))} · ${escapeHtml(tx('admin.user_meta', { pets: user.pet_count || 0, submissions: user.submission_count || 0, credits: user.credit_balance || 0 }))}</small>
      </div>
      <div class="admin-actions">
        <span>${escapeHtml(user.plan_code || user.subscription_status || user.status || 'active')}</span>
        <button data-action="user-status" data-id="${escapeHtml(user.id)}" data-status="${user.status === 'active' ? 'suspended' : 'active'}">${user.status === 'active' ? t('admin.suspend') : t('admin.activate')}</button>
        <button data-action="credit" data-id="${escapeHtml(user.id)}">${t('admin.credit')}</button>
        <button data-action="plan" data-id="${escapeHtml(user.id)}">Plan</button>
      </div>
    </div>
  `);
}

function renderPets(pets = []) {
  return rowList(pets, t('admin.empty_pets'), (pet) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(pet.name || t('admin.unnamed_pet'))}</strong>
        <small>${escapeHtml(tx('admin.pet_meta', { species: pet.species_code || '-', owner: pet.owner_name || t('admin.no_owner'), count: pet.health_count || 0 }))}</small>
      </div>
      <div class="admin-actions">
        <span>${escapeHtml(pet.status || 'active')}</span>
        <button data-action="pet-status" data-id="${escapeHtml(pet.id)}" data-status="${pet.status === 'active' ? 'archived' : 'active'}">${pet.status === 'active' ? t('admin.archive') : t('admin.activate')}</button>
      </div>
    </div>
  `);
}

function renderRecords(records = []) {
  return rowList(records, t('admin.empty_records'), (item) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(item.title || item.kind || t('admin.record'))}</strong>
        <small>${escapeHtml(item.kind || t('admin.record_lower'))} · ${escapeHtml(item.type || '-')} · ${fmtDate(item.event_at || item.created_at)}</small>
      </div>
      <div class="admin-actions">
        <span>${escapeHtml(item.summary || item.kind || t('admin.active'))}</span>
        <button class="danger" data-action="record-delete" data-kind="${escapeHtml(item.kind)}" data-id="${escapeHtml(item.id)}">${t('common.delete')}</button>
      </div>
    </div>
  `);
}

function renderUsage(items = []) {
  return rowList(items, t('admin.empty_usage'), (item) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(item.feature_code || 'feature')}</strong>
        <small>${escapeHtml(item.user_name || item.user_email || t('admin.user'))} · ${escapeHtml(item.pet_name || t('admin.no_pet'))} · ${fmtDate(item.created_at)}</small>
      </div>
      <span>${escapeHtml(item.credit_cost || 0)} ${t('admin.credit')}</span>
    </div>
  `);
}

function renderDocuments(docs = []) {
  return rowList(docs, t('admin.empty_docs'), (doc) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(doc.title || t('admin.document'))}</strong>
        <small>${escapeHtml(doc.pet_name || t('admin.pet'))} · ${escapeHtml(doc.user_name || doc.user_email || t('admin.user'))} · ${fmtDate(doc.created_at)}</small>
      </div>
      <span>${escapeHtml(doc.status || doc.document_type || 'draft')}</span>
    </div>
  `);
}

function renderLogin(error = '') {
  return `
    <div class="web-page admin-page">
      <main class="admin-login-shell">
        <section class="admin-login-card">
          <div class="premium-screen-kicker">${t('admin.login_kicker')}</div>
          <h1>${t('admin.login_title')}</h1>
          <p>${t('admin.login_desc')}</p>
          <label><span>${t('admin.username')}</span><input id="adminUsername" autocomplete="username" value="admin" /></label>
          <label><span>${t('admin.password')}</span><input id="adminPassword" type="password" autocomplete="current-password" value="admin123" /></label>
          ${error ? `<div class="admin-error">${escapeHtml(error)}</div>` : ''}
          <button class="btn btn-primary" id="btnAdminLogin">${t('admin.login_button')}</button>
          <button class="btn btn-ghost" id="btnWeb">${t('admin.back_to_web')}</button>
        </section>
      </main>
    </div>
  `;
}

export function render() {
  if (!session()?.token) return renderLogin();
  const auth = session();
  return `
    <div class="web-page admin-page">
      <header class="web-nav">
        <button type="button" class="web-brand" id="btnWeb"><span class="web-brand-mark">🐾</span><strong>${t('admin.brand')}</strong></button>
        <nav>
          <button type="button" id="btnWebTop">${t('admin.web_intro')}</button>
          <button type="button" id="btnMobile">Mobil App</button>
          <button type="button" id="btnLogout">${t('admin.logout')}</button>
        </nav>
      </header>

      <main class="admin-shell">
        <section class="admin-hero">
          <div>
            <div class="premium-screen-kicker">${t('admin.hero_kicker')}</div>
            <h1>${t('admin.hero_title')}</h1>
            <p>${t('admin.session')}: ${escapeHtml(auth.admin?.username || 'admin')} · ${escapeHtml(auth.admin?.role || 'super_admin')}</p>
          </div>
          <div class="admin-status-card" id="apiStatusCard">
            <span>Admin API</span>
            <strong>${t('admin.connecting')}</strong>
            <small>${t('admin.live_turso')}</small>
          </div>
        </section>

        <section class="admin-grid admin-grid-4" id="adminMetrics">
          ${metricCard(t('admin.metric_users'), '-', t('admin.total'))}
          ${metricCard(t('admin.pet'), '-', t('admin.total'))}
          ${metricCard(t('admin.metric_records'), '-', t('admin.health_measurement'))}
          ${metricCard(t('admin.metric_usage'), '-', 'feature usage')}
        </section>

        <section class="admin-grid admin-grid-2">
          <article class="admin-panel">
            <div class="admin-panel-head"><div><span>${t('admin.model_layers')}</span><h2>${t('admin.hybrid_gemini')}</h2></div><button class="btn btn-small" id="btnAiTest">${t('admin.run_critical_test')}</button></div>
            <div class="admin-model-list">
              <div><strong>${t('admin.low_importance_flows')}</strong><small>gemini-3-flash-preview</small></div>
              <div><strong>${t('admin.critical_analysis')}</strong><small>gemini-3.5-flash</small></div>
            </div>
            <div class="admin-test-result" id="aiTestResult">${t('admin.test_placeholder')}</div>
          </article>

          <article class="admin-panel">
            <div class="admin-panel-head"><div><span>${t('admin.settings')}</span><h2>${t('admin.change_password')}</h2></div></div>
            <form class="admin-settings-form" id="passwordForm">
              <input type="password" id="currentPassword" placeholder="${t('admin.current_password')}" />
              <input type="password" id="newPassword" placeholder="${t('admin.new_password')}" />
              <button class="btn btn-primary" type="submit">${t('admin.change_password_button')}</button>
            </form>
            <div class="admin-test-result" id="settingsResult">${t('admin.all_permissions')}</div>
          </article>
        </section>

        <section class="admin-grid admin-grid-2">
          <article class="admin-panel"><div class="admin-panel-head"><div><span>${t('admin.users')}</span><h2>${t('admin.users_question')}</h2></div></div><div id="adminUsers">${renderUsers()}</div></article>
          <article class="admin-panel"><div class="admin-panel-head"><div><span>${t('admin.pets')}</span><h2>${t('admin.pets_question')}</h2></div></div><div id="adminPets">${renderPets()}</div></article>
          <article class="admin-panel"><div class="admin-panel-head"><div><span>${t('admin.recent_actions')}</span><h2>${t('admin.actions_question')}</h2></div></div><div id="adminRecords">${renderRecords()}</div></article>
          <article class="admin-panel"><div class="admin-panel-head"><div><span>${t('admin.documents')}</span><h2>${t('admin.document_queue')}</h2></div></div><div id="adminDocs">${renderDocuments()}</div></article>
          <article class="admin-panel admin-panel-wide"><div class="admin-panel-head"><div><span>${t('admin.usage')}</span><h2>${t('admin.usage_title')}</h2></div></div><div id="adminUsage">${renderUsage()}</div></article>
        </section>
      </main>

      <dialog class="admin-modal" id="adminModal"><div id="adminModalBody"></div></dialog>
    </div>
  `;
}

async function runAiTest() {
  const prompt = t('admin.ai_test_prompt');
  const candidates = ['', API_FALLBACK];
  for (const base of candidates) {
    try {
      const response = await fetch(`${base}/api/ai/package-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json();
      if (data.ok) return { ok: true, base: base || 'same-origin', data: data.data };
    } catch {
      // try next
    }
  }
  return { ok: false };
}

async function loadAdmin() {
  const card = document.getElementById('apiStatusCard');
  try {
    const [overview, users, pets, records, usage, docs, plans] = await Promise.all([
      api('/api/admin/overview'),
      api('/api/admin/users?limit=30'),
      api('/api/admin/pets?limit=30'),
      api('/api/admin/records?limit=40'),
      api('/api/admin/usage?limit=40'),
      api('/api/admin/documents?limit=30'),
      api('/api/admin/plans')
    ]);

    adminState = { users: users.data, pets: pets.data, records: records.data, usage: usage.data, documents: docs.data, plans: plans.data };
    if (card) {
      card.classList.add('ok');
      card.innerHTML = `<span>Admin API</span><strong>${t('admin.connected')}</strong><small>${overview.base} · ${t('admin.live_database')}</small>`;
    }
    const metrics = overview.data.metrics || {};
    document.getElementById('adminMetrics').innerHTML = [
      metricCard(t('admin.metric_users'), metrics.users || 0, t('admin.total')),
      metricCard(t('admin.pet'), metrics.pets || 0, t('admin.total')),
      metricCard(t('admin.metric_records'), (metrics.healthRecords || 0) + (metrics.measurements || 0), t('admin.health_measurement')),
      metricCard(t('admin.metric_usage'), metrics.featureUsage || 0, 'feature usage')
    ].join('');
    document.getElementById('adminUsers').innerHTML = renderUsers(users.data);
    document.getElementById('adminPets').innerHTML = renderPets(pets.data);
    document.getElementById('adminRecords').innerHTML = renderRecords(records.data);
    document.getElementById('adminUsage').innerHTML = renderUsage(usage.data);
    document.getElementById('adminDocs').innerHTML = renderDocuments(docs.data);
  } catch (err) {
    if (String(err.message).includes('unauthorized')) {
      localStorage.removeItem(SESSION_KEY);
      navigate('/admin');
      window.location.reload();
      return;
    }
    if (card) card.innerHTML = `<span>Admin API</span><strong>${t('admin.disconnected')}</strong><small>${escapeHtml(err.message)}</small>`;
  }
}

async function login() {
  const username = document.getElementById('adminUsername')?.value?.trim();
  const password = document.getElementById('adminPassword')?.value || '';
  try {
    const result = await api('/api/admin/login', { method: 'POST', body: { username, password } });
    saveSession(result.data);
    navigate('/admin');
    window.location.reload();
  } catch {
    document.getElementById('app').innerHTML = renderLogin(t('admin.login_failed'));
    bindLogin();
  }
}

function bindLogin() {
  document.getElementById('btnAdminLogin')?.addEventListener('click', login);
  document.getElementById('adminPassword')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') login();
  });
  document.getElementById('btnWeb')?.addEventListener('click', () => navigate('/web'));
}

function openModal(html) {
  const modal = document.getElementById('adminModal');
  document.getElementById('adminModalBody').innerHTML = html;
  modal?.showModal();
}

function closeModal() {
  document.getElementById('adminModal')?.close();
}

async function handleAction(button) {
  const action = button.dataset.action;
  if (action === 'user-status') {
    await api('/api/admin/users/status', { method: 'POST', body: { userId: button.dataset.id, status: button.dataset.status } });
    return loadAdmin();
  }
  if (action === 'pet-status') {
    await api('/api/admin/pets/status', { method: 'POST', body: { petId: button.dataset.id, status: button.dataset.status } });
    return loadAdmin();
  }
  if (action === 'record-delete') {
    if (!window.confirm(t('admin.delete_confirm'))) return;
    await api(`/api/admin/records/${button.dataset.kind}/${button.dataset.id}`, { method: 'DELETE' });
    return loadAdmin();
  }
  if (action === 'credit') {
    openModal(`
      <form class="admin-modal-card" id="creditForm">
        <h3>${t('admin.adjust_credit')}</h3>
        <input id="creditAmount" type="number" placeholder="+10 veya -5" />
        <input id="creditNote" placeholder="Not" />
        <button class="btn btn-primary" type="submit">${t('common.save')}</button>
        <button class="btn btn-ghost" type="button" id="modalClose">${t('admin.cancel')}</button>
      </form>`);
    document.getElementById('modalClose').onclick = closeModal;
    document.getElementById('creditForm').onsubmit = async (event) => {
      event.preventDefault();
      await api('/api/admin/credits/adjust', { method: 'POST', body: { userId: button.dataset.id, amount: document.getElementById('creditAmount').value, note: document.getElementById('creditNote').value } });
      closeModal();
      loadAdmin();
    };
  }
  if (action === 'plan') {
    openModal(`
      <form class="admin-modal-card" id="planForm">
        <h3>${t('admin.assign_plan')}</h3>
        <select id="planId">${planOptions()}</select>
        <input id="planNote" placeholder="Not" />
        <button class="btn btn-primary" type="submit">${t('admin.assign_plan_button')}</button>
        <button class="btn btn-ghost" type="button" id="modalClose">${t('admin.cancel')}</button>
      </form>`);
    document.getElementById('modalClose').onclick = closeModal;
    document.getElementById('planForm').onsubmit = async (event) => {
      event.preventDefault();
      await api('/api/admin/billing/plan', { method: 'POST', body: { userId: button.dataset.id, planId: document.getElementById('planId').value, note: document.getElementById('planNote').value } });
      closeModal();
      loadAdmin();
    };
  }
}

export function afterRender() {
  if (!session()?.token) {
    bindLogin();
    return;
  }

  document.getElementById('btnWeb')?.addEventListener('click', () => navigate('/web'));
  document.getElementById('btnWebTop')?.addEventListener('click', () => navigate('/web'));
  document.getElementById('btnMobile')?.addEventListener('click', () => navigate('/home'));
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
          currentPassword: document.getElementById('currentPassword').value,
          newPassword: document.getElementById('newPassword').value,
          keepToken: session()?.token
        }
      });
      target.textContent = t('admin.password_changed');
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
    } catch (err) {
      target.textContent = tx('admin.password_change_failed', { message: err.message });
    }
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    handleAction(button).catch((err) => window.alert(tx('admin.action_failed', { message: err.message })));
  }, { once: false });

  document.getElementById('btnAiTest')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const target = document.getElementById('aiTestResult');
    button.disabled = true;
    button.textContent = t('admin.testing');
    if (target) target.textContent = t('admin.testing_gemini');
    const result = await runAiTest();
    if (target) {
      target.innerHTML = result.ok
        ? `<strong>${escapeHtml(result.data.level || 'unknown')} · ${escapeHtml(result.data.headline || t('admin.response_received'))}</strong><small>${escapeHtml(tx('admin.test_success', { base: result.base, prepare: (result.data.prepare || []).join(' ') }))}</small>`
        : `<strong>${t('admin.test_failed_title')}</strong><small>${t('admin.test_failed_desc')}</small>`;
    }
    button.disabled = false;
    button.textContent = t('admin.run_critical_test');
  });

  loadAdmin();
}
