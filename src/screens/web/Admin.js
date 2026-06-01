import { navigate } from '../../router.js';
import { getState } from '../../store.js';
import { getPets } from '../../services/pets.js';
import { getFreeRecords, mergeRecentRecords } from '../../services/freeRecords.js';
import { getClinicExportDocuments } from '../../services/documents.js';

const API_FALLBACK = 'http://patisaglik2.46.225.9.243.sslip.io';

function fmtDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return '-';
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function metricCard(label, value, note) {
  return `<article class="admin-metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
}

function renderRecent(items) {
  if (!items.length) return '<div class="admin-empty">Henüz kayıt yok.</div>';
  return items.slice(0, 6).map((item) => `
    <div class="admin-row">
      <div>
        <strong>${item.title || item.category || item.record_type || 'Kayıt'}</strong>
        <small>${item.kind || 'kayıt'} · ${fmtDate(item.date || item.created_at)}</small>
      </div>
      <span>${item.status || item.currency || item.source || 'aktif'}</span>
    </div>
  `).join('');
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
            <div class="premium-screen-kicker">Kontrol merkezi</div>
            <h1>Ürün, AI, kayıt ve canlı servis durumunu tek ekrandan izle.</h1>
            <p>Bu ilk admin sürümü okuma ve test paneli olarak çalışır. Canlı operasyon aksiyonları daha sonra yetkilendirme ile bağlanacak.</p>
          </div>
          <div class="admin-status-card" id="apiStatusCard">
            <span>API durumu</span>
            <strong>Kontrol ediliyor...</strong>
            <small>Same-origin ve canlı fallback denenir.</small>
          </div>
        </section>

        <section class="admin-grid admin-grid-4" id="adminMetrics">
          ${metricCard('Pet', '-', 'profil sayısı')}
          ${metricCard('Sağlık', '-', 'kayıt')}
          ${metricCard('Masraf', '-', 'kayıt')}
          ${metricCard('Takvim', '-', 'hatırlatıcı')}
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
          <article class="admin-panel">
            <div class="admin-panel-head">
              <div>
                <span>Son kayıtlar</span>
                <h2>Ücretsiz veri akışı</h2>
              </div>
            </div>
            <div id="adminRecent">${renderRecent([])}</div>
          </article>

          <article class="admin-panel">
            <div class="admin-panel-head">
              <div>
                <span>Belgeler</span>
                <h2>Rapor ve OCR kuyruğu</h2>
              </div>
            </div>
            <div id="adminDocs">${renderRecent([])}</div>
          </article>
        </section>
      </main>
    </div>
  `;
}

async function fetchHealth() {
  const candidates = ['', API_FALLBACK];
  for (const base of candidates) {
    try {
      const response = await fetch(`${base}/api/health`, { headers: { Accept: 'application/json' } });
      const data = await response.json();
      if (data.ok) return { ok: true, base: base || 'same-origin', data };
    } catch {
      // try next candidate
    }
  }
  return { ok: false };
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

export function afterRender() {
  const state = getState();
  const petId = state.activePetId;

  document.getElementById('btnLanding')?.addEventListener('click', () => navigate('/web'));
  document.getElementById('btnWeb')?.addEventListener('click', () => navigate('/web'));
  document.getElementById('btnMobile')?.addEventListener('click', () => navigate('/home'));
  document.querySelectorAll('[data-route]').forEach((button) => {
    button.addEventListener('click', () => navigate(button.dataset.route));
  });

  fetchHealth().then((health) => {
    const card = document.getElementById('apiStatusCard');
    if (!card) return;
    card.classList.toggle('ok', health.ok);
    card.innerHTML = health.ok
      ? `<span>API durumu</span><strong>Çalışıyor</strong><small>${health.base} · ${health.data.service || 'pati-saglik-api'}</small>`
      : '<span>API durumu</span><strong>Ulaşılamadı</strong><small>Local dev sunucusu API proxy olmadan çalışıyor olabilir.</small>';
  });

  Promise.all([
    getPets({ userId: state.user?.id || 'user-1' }).catch(() => []),
    getFreeRecords({ petId, limit: 30 }).catch(() => ({ expenses: [], reminders: [], healthRecords: [] })),
    getClinicExportDocuments({ petId, limit: 12 }).catch(() => [])
  ]).then(([pets, records, docs]) => {
    const metrics = document.getElementById('adminMetrics');
    if (metrics) {
      metrics.innerHTML = [
        metricCard('Pet', pets.length, 'profil sayısı'),
        metricCard('Sağlık', records.healthRecords.length, records.storage || 'kayıt'),
        metricCard('Masraf', records.expenses.length, 'harcama kaydı'),
        metricCard('Takvim', records.reminders.length, 'hatırlatıcı')
      ].join('');
    }
    const recent = document.getElementById('adminRecent');
    if (recent) recent.innerHTML = renderRecent(mergeRecentRecords(records));
    const docsBox = document.getElementById('adminDocs');
    if (docsBox) docsBox.innerHTML = renderRecent(docs.map((doc) => ({ ...doc, kind: doc.document_type, date: doc.created_at })));
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
        ? `<strong>${result.data.level || 'unknown'} · ${result.data.headline || 'Yanıt alındı'}</strong><small>${result.base} üzerinden çalıştı. Güvenli hazırlık: ${(result.data.prepare || []).join(' ')}</small>`
        : '<strong>Test başarısız</strong><small>API veya model erişimi kontrol edilmeli.</small>';
    }
    button.disabled = false;
    button.textContent = 'Kritik testi çalıştır';
  });
}
