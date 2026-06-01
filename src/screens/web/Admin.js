import { navigate } from '../../router.js';

const API_FALLBACK = 'http://patisaglik2.46.225.9.243.sslip.io';
const TOKEN_KEY = 'pati_admin_token';

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
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function metricCard(label, value, note) {
  return `<article class="admin-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;
}

function rowList(items, emptyText, renderItem) {
  if (!items?.length) return `<div class="admin-empty">${escapeHtml(emptyText)}</div>`;
  return items.slice(0, 12).map(renderItem).join('');
}

function adminToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

async function adminGet(path) {
  const token = adminToken();
  if (!token) throw new Error('missing_token');
  const candidates = ['', API_FALLBACK];
  let lastError = null;
  for (const base of candidates) {
    try {
      const response = await fetch(`${base}${path}`, {
        headers: {
          Accept: 'application/json',
          'X-Admin-Token': token
        }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || `http_${response.status}`);
      return { base: base || 'same-origin', data: data.data };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('admin_api_failed');
}

async function runAiTest() {
  const prompt = `Evcil hayvan için ambalaj/toksik risk ön değerlendirmesi yap.
Kesin teşhis, doz, ilaç, evde kusturma, aktif kömür veya tedavi talimatı verme.
Kullanıcı girdisi: köpek 8 kg, ksilitol sakız, az miktar, 10 dakika önce, belirti yok.
JSON döndür: {"level":"critical|high|foreign|watch|unknown","headline":"","reason":"","doNotDo":[""],"prepare":[""],"askVet":[""]}`;
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
      // try next candidate
    }
  }
  return { ok: false };
}

function renderUsers(users = []) {
  return rowList(users, 'Henüz kullanıcı yok veya token bekleniyor.', (user) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(user.display_name || 'İsimsiz kullanıcı')}</strong>
        <small>${escapeHtml(user.phone || user.email || 'iletişim yok')} · ${escapeHtml(user.pet_count || 0)} pet · ${escapeHtml(user.submission_count || 0)} işlem</small>
      </div>
      <span>${escapeHtml(user.plan_code || user.subscription_status || user.status || 'active')}</span>
    </div>
  `);
}

function renderPets(pets = []) {
  return rowList(pets, 'Henüz pet yok veya token bekleniyor.', (pet) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(pet.name || 'İsimsiz pet')}</strong>
        <small>${escapeHtml(pet.species_code || '-')} · ${escapeHtml(pet.owner_name || 'sahip yok')} · ${escapeHtml(pet.health_count || 0)} sağlık kaydı</small>
      </div>
      <span>${escapeHtml(pet.ownership_type || pet.status || 'owned')}</span>
    </div>
  `);
}

function renderRecords(records = []) {
  return rowList(records, 'Henüz kayıt yok veya token bekleniyor.', (item) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(item.title || item.kind || 'Kayıt')}</strong>
        <small>${escapeHtml(item.kind || 'kayıt')} · ${escapeHtml(item.type || '-')} · ${fmtDate(item.event_at || item.created_at)}</small>
      </div>
      <span>${escapeHtml(item.summary || item.kind || 'aktif')}</span>
    </div>
  `);
}

function renderUsage(items = []) {
  return rowList(items, 'Henüz kullanım kaydı yok veya token bekleniyor.', (item) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(item.feature_code || 'feature')}</strong>
        <small>${escapeHtml(item.user_name || item.user_email || 'kullanıcı')} · ${escapeHtml(item.pet_name || 'pet yok')} · ${fmtDate(item.created_at)}</small>
      </div>
      <span>${escapeHtml(item.credit_cost || 0)} kredi</span>
    </div>
  `);
}

function renderDocuments(docs = []) {
  return rowList(docs, 'Henüz belge yok veya token bekleniyor.', (doc) => `
    <div class="admin-row admin-row-wide">
      <div>
        <strong>${escapeHtml(doc.title || 'Belge')}</strong>
        <small>${escapeHtml(doc.pet_name || 'pet')} · ${escapeHtml(doc.user_name || doc.user_email || 'kullanıcı')} · ${fmtDate(doc.created_at)}</small>
      </div>
      <span>${escapeHtml(doc.status || doc.document_type || 'draft')}</span>
    </div>
  `);
}

export function render() {
  return `
    <div class="web-page admin-page">
      <header class="web-nav">
        <button class="web-brand" id="btnLanding" type="button">
          <span>${window.__icons?.paw || ''}</span>
          <strong>Pati Sağlık Admin</strong>
        </button>
        <nav>
          <button type="button" id="btnWeb">Tanıtım</button>
          <button type="button" id="btnMobile">Mobil App</button>
        </nav>
      </header>

      <main class="admin-shell">
        <section class="admin-hero">
          <div>
            <div class="premium-screen-kicker">Gerçek yönetim paneli</div>
            <h1>Kullanıcı, pet, kayıt, belge ve AI kullanımını canlı veritabanından izle.</h1>
            <p>Bu sürüm güvenli okuma panelidir. Silme, askıya alma ve ödeme müdahaleleri sonraki fazda audit log ile eklenecek.</p>
          </div>
          <div class="admin-status-card" id="apiStatusCard">
            <span>Admin API</span>
            <strong>Token bekleniyor</strong>
            <small>Admin token girildiğinde canlı Turso verisi okunur.</small>
          </div>
        </section>

        <section class="admin-token-card">
          <label>
            <span>Admin token</span>
            <input id="adminTokenInput" type="password" placeholder="ADMIN_TOKEN" value="${escapeHtml(adminToken())}" />
          </label>
          <button class="btn btn-primary" id="btnSaveToken">Bağlan</button>
          <button class="btn btn-ghost" id="btnClearToken">Temizle</button>
        </section>

        <section class="admin-grid admin-grid-4" id="adminMetrics">
          ${metricCard('Kullanıcı', '-', 'toplam')}
          ${metricCard('Pet', '-', 'toplam')}
          ${metricCard('Kayıt', '-', 'sağlık + ölçüm')}
          ${metricCard('AI/Kullanım', '-', 'feature usage')}
        </section>

        <section class="admin-grid admin-grid-2">
          <article class="admin-panel">
            <div class="admin-panel-head">
              <div>
                <span>AI model katmanları</span>
                <h2>Hibrit Gemini</h2>
              </div>
              <button class="btn btn-secondary" id="btnAiTest">Kritik testi çalıştır</button>
            </div>
            <div class="admin-model-list">
              <div><span>Standart işler</span><strong>gemini-3-flash-preview</strong><small>Belge OCR, özet, düşük riskli içerikler</small></div>
              <div><span>Kritik işler</span><strong>gemini-3.5-flash</strong><small>Zehirlenme, kırmızı bayrak, aciliyet yönlendirmesi</small></div>
              <div><span>Güvenlik filtresi</span><strong>Aktif</strong><small>Evde müdahale çağrıştıran önerileri temizler</small></div>
            </div>
            <div class="admin-test-result" id="aiTestResult">Test sonucu burada görünecek.</div>
          </article>

          <article class="admin-panel">
            <div class="admin-panel-head">
              <div>
                <span>Hızlı geçişler</span>
                <h2>Mobil akışlar</h2>
              </div>
            </div>
            <div class="admin-link-grid">
              <button data-route="/check/package-risk">Ambalaj risk</button>
              <button data-route="/feature/document-ai">Belge AI/OCR</button>
              <button data-route="/history/measurements">Ölçümler</button>
              <button data-route="/reports">Raporlar</button>
              <button data-route="/profile/passport">Sağlık pasaportu</button>
              <button data-route="/profile/plan">Plan / kredi</button>
            </div>
          </article>
        </section>

        <section class="admin-grid admin-grid-2">
          <article class="admin-panel"><div class="admin-panel-head"><div><span>Kullanıcılar</span><h2>Kim kaydolmuş?</h2></div></div><div id="adminUsers">${renderUsers()}</div></article>
          <article class="admin-panel"><div class="admin-panel-head"><div><span>Petler</span><h2>Hangi petler var?</h2></div></div><div id="adminPets">${renderPets()}</div></article>
          <article class="admin-panel"><div class="admin-panel-head"><div><span>Son hareketler</span><h2>Ne yapılmış?</h2></div></div><div id="adminRecords">${renderRecords()}</div></article>
          <article class="admin-panel"><div class="admin-panel-head"><div><span>Belgeler</span><h2>OCR / rapor kuyruğu</h2></div></div><div id="adminDocs">${renderDocuments()}</div></article>
          <article class="admin-panel admin-panel-wide"><div class="admin-panel-head"><div><span>Kullanım</span><h2>Kredi / özellik hareketleri</h2></div></div><div id="adminUsage">${renderUsage()}</div></article>
        </section>
      </main>
    </div>
  `;
}

async function loadAdmin() {
  const card = document.getElementById('apiStatusCard');
  if (!adminToken()) {
    if (card) card.innerHTML = '<span>Admin API</span><strong>Token bekleniyor</strong><small>Admin token girildiğinde canlı veritabanı okunur.</small>';
    return;
  }

  if (card) card.innerHTML = '<span>Admin API</span><strong>Bağlanıyor...</strong><small>Canlı Turso verisi okunuyor.</small>';

  try {
    const [overview, users, pets, records, usage, docs] = await Promise.all([
      adminGet('/api/admin/overview'),
      adminGet('/api/admin/users?limit=30'),
      adminGet('/api/admin/pets?limit=30'),
      adminGet('/api/admin/records?limit=40'),
      adminGet('/api/admin/usage?limit=40'),
      adminGet('/api/admin/documents?limit=30')
    ]);

    if (card) {
      card.classList.add('ok');
      card.innerHTML = `<span>Admin API</span><strong>Bağlı</strong><small>${overview.base} · canlı veritabanı</small>`;
    }

    const metrics = overview.data.metrics || {};
    document.getElementById('adminMetrics').innerHTML = [
      metricCard('Kullanıcı', metrics.users || 0, 'toplam'),
      metricCard('Pet', metrics.pets || 0, 'toplam'),
      metricCard('Kayıt', (metrics.healthRecords || 0) + (metrics.measurements || 0), 'sağlık + ölçüm'),
      metricCard('AI/Kullanım', metrics.featureUsage || 0, 'feature usage')
    ].join('');
    document.getElementById('adminUsers').innerHTML = renderUsers(users.data);
    document.getElementById('adminPets').innerHTML = renderPets(pets.data);
    document.getElementById('adminRecords').innerHTML = renderRecords(records.data);
    document.getElementById('adminUsage').innerHTML = renderUsage(usage.data);
    document.getElementById('adminDocs').innerHTML = renderDocuments(docs.data);
  } catch (err) {
    if (card) {
      card.classList.remove('ok');
      card.innerHTML = `<span>Admin API</span><strong>Bağlanamadı</strong><small>${escapeHtml(err.message || 'admin_api_failed')}</small>`;
    }
  }
}

export function afterRender() {
  document.getElementById('btnLanding')?.addEventListener('click', () => navigate('/web'));
  document.getElementById('btnWeb')?.addEventListener('click', () => navigate('/web'));
  document.getElementById('btnMobile')?.addEventListener('click', () => navigate('/home'));
  document.querySelectorAll('[data-route]').forEach((button) => {
    button.addEventListener('click', () => navigate(button.dataset.route));
  });

  document.getElementById('btnSaveToken')?.addEventListener('click', () => {
    const value = document.getElementById('adminTokenInput')?.value?.trim() || '';
    if (value) localStorage.setItem(TOKEN_KEY, value);
    loadAdmin();
  });
  document.getElementById('btnClearToken')?.addEventListener('click', () => {
    localStorage.removeItem(TOKEN_KEY);
    const input = document.getElementById('adminTokenInput');
    if (input) input.value = '';
    loadAdmin();
  });

  document.getElementById('btnAiTest')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const target = document.getElementById('aiTestResult');
    button.disabled = true;
    button.textContent = 'Test ediliyor...';
    if (target) target.textContent = '3.5 Flash kritik hat üzerinden canlı istek gönderiliyor...';
    const result = await runAiTest();
    if (target) {
      target.innerHTML = result.ok
        ? `<strong>${escapeHtml(result.data.level || 'unknown')} · ${escapeHtml(result.data.headline || 'Yanıt alındı')}</strong><small>${escapeHtml(result.base)} üzerinden çalıştı. Güvenli hazırlık: ${escapeHtml((result.data.prepare || []).join(' '))}</small>`
        : '<strong>Test başarısız</strong><small>API veya model erişimi kontrol edilmeli.</small>';
    }
    button.disabled = false;
    button.textContent = 'Kritik testi çalıştır';
  });

  loadAdmin();
}
