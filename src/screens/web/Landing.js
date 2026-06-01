import { navigate } from '../../router.js';

const features = [
  ['AI ön triyaj', 'Şikayeti, pet geçmişini ve kırmızı bayrakları veterinere hazır özetler.'],
  ['Sağlık pasaportu', 'Aşı, parazit, ölçüm, belge, masraf ve takip kayıtlarını tek dosyada toplar.'],
  ['Güvenli risk akışı', 'Zehirlenme ve yabancı cisim şüphesinde evde tedavi değil, güvenli aciliyet yönlendirmesi yapar.'],
  ['Takip asistanı', 'Tedavi sonrası ilaç uyumu, belirti değişimi, yara/foto kontrolü ve randevu takibini düzenler.']
];

export function render() {
  return `
    <div class="web-page">
      <header class="web-nav">
        <button class="web-brand" id="brandHome" type="button">
          <span>${window.__icons?.paw || ''}</span>
          <strong>Pati Sağlık</strong>
        </button>
        <nav>
          <button type="button" id="btnAdmin">Admin</button>
          <button type="button" id="btnOpenApp">Uygulamayı Aç</button>
        </nav>
      </header>

      <main class="web-hero">
        <section class="web-hero-copy">
          <div class="premium-screen-kicker">Pet sağlık yönetimi</div>
          <h1>Panik anında doğru veriyi topla, veterinere eksiksiz dosyayla git.</h1>
          <p>Pet sahibi için sağlık pasaportu, AI ön şikayet dosyası, güvenli aciliyet yönlendirmesi ve tedavi sonrası takip aynı deneyimde birleşir.</p>
          <div class="web-hero-actions">
            <button class="btn btn-primary" id="btnStart">Admin Paneli</button>
            <button class="btn btn-secondary" id="btnDemo">Mobil Önizleme</button>
          </div>
        </section>

        <section class="web-product-visual" aria-label="Pati Sağlık ürün özeti">
          <div class="web-phone-frame">
            <div class="web-phone-top"></div>
            <div class="web-phone-card hero">
              <span>Ücretsiz sağlık alanı</span>
              <strong>Boncuk</strong>
              <small>Kedi · British · 4.2 kg</small>
            </div>
            <div class="web-phone-grid">
              <div><b>AI</b><small>Ön kontrol</small></div>
              <div><b>4.4</b><small>kg</small></div>
              <div><b>1</b><small>takip</small></div>
              <div><b>3.5</b><small>kritik model</small></div>
            </div>
            <div class="web-phone-card alert">
              <span>Risk sinyali</span>
              <strong>Veteriner yönlendirme hazır</strong>
            </div>
          </div>
        </section>
      </main>

      <section class="web-feature-band">
        ${features.map(([title, desc]) => `
          <article class="web-feature-card">
            <span>${window.__icons?.checkCircle || ''}</span>
            <h3>${title}</h3>
            <p>${desc}</p>
          </article>
        `).join('')}
      </section>

      <section class="web-section-split">
        <div>
          <div class="premium-screen-kicker">Hibrit AI modeli</div>
          <h2>Önemsiz işte 3 Flash, kritik sağlık analizinde 3.5 Flash.</h2>
        </div>
        <p>Standart belge/özet akışları maliyet kontrollü çalışır. Zehirlenme, kırmızı bayrak ve kritik yönlendirme gibi hassas alanlarda daha güçlü model devreye girer; server filtresi evde müdahale önerilerini temizler.</p>
      </section>
    </div>
  `;
}

export function afterRender() {
  document.getElementById('brandHome')?.addEventListener('click', () => navigate('/web'));
  document.getElementById('btnAdmin')?.addEventListener('click', () => navigate('/admin'));
  document.getElementById('btnStart')?.addEventListener('click', () => navigate('/admin'));
  document.getElementById('btnOpenApp')?.addEventListener('click', () => navigate('/home'));
  document.getElementById('btnDemo')?.addEventListener('click', () => navigate('/home'));
}
