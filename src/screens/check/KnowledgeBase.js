import { navigate, goBack } from '../../router.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const topics = [
  {
    id: 'toxic',
    icon: 'alert',
    tone: 'danger',
    title: 'Toksik Madde / Zehirlenme',
    desc: 'Şüpheli gıda, ilaç, bitki, temizlik ürünü veya kimyasal teması.',
    signals: ['Çikolata, ksilitol, üzüm/kuru üzüm, soğan/sarımsak', 'İnsan ilacı, haşere zehiri, temizlik ürünü', 'Kusma, salya, titreme, halsizlik, nöbet'],
    dont: ['Veteriner söylemeden kusturmaya çalışma.', 'Aktif kömür, süt, yağ, tuzlu su veya insan ilacı verme.', 'Belirti yok diye bekleme; bazı toksinlerde belirtiler gecikebilir.'],
    prepare: ['Ambalajı, etiketi veya kalan maddeyi sakla.', 'Ne kadar ve ne zaman yediğini not et.', 'Petin türünü, kilosunu ve mevcut belirtileri hazır tut.'],
    urgent: ['Nefes sorunu, nöbet, bayılma, bilinç değişikliği', 'Şiddetli veya tekrarlayan kusma', 'Ksilitol, ilaç, zehir, pil, kimyasal veya bilinmeyen madde şüphesi']
  },
  {
    id: 'foreign-body',
    icon: 'search',
    tone: 'slate',
    title: 'Yabancı Cisim / Boğulma',
    desc: 'Oyuncak, ip, kemik, paket, pil veya keskin parça yutma/boğaza kaçma şüphesi.',
    signals: ['Öğürme, salya, ağızla uğraşma', 'Kusmaya çalışma ama çıkaramama', 'Karın ağrısı, dışkı yapamama, halsizlik'],
    dont: ['Boğaza parmak sokarak körlemesine müdahale etme.', 'İp, misina veya kumaş görünüyorsa çekme.', 'Kusmasını bekleyerek zamanı uzatma.'],
    prepare: ['Yuttuğu nesnenin aynısını veya fotoğrafını hazırla.', 'Yaklaşık boyut, malzeme ve zamanı not et.', 'Kusma, dışkı, karın ağrısı ve iştah durumunu kaydet.'],
    urgent: ['Nefes alamama veya morarma', 'Pil, mıknatıs, iğne, ip/misina, keskin cisim', 'Sürekli öğürme, şiş karın veya belirgin ağrı']
  },
  {
    id: 'vomit-diarrhea',
    icon: 'activity',
    tone: 'teal',
    title: 'Kusma / İshal',
    desc: 'Sindirim sistemi belirtilerinde takip ve acil risk ayrımı.',
    signals: ['Tekrarlayan kusma veya sulu ishal', 'Kan, siyah dışkı veya belirgin karın ağrısı', 'Su tutamama, halsizlik, hızlı kötüleşme'],
    dont: ['Veteriner önermeden ishal/kusma ilacı verme.', 'Zehir veya yabancı cisim ihtimalini göz ardı etme.', 'Yavru, yaşlı veya kronik hasta petlerde beklemeyi uzatma.'],
    prepare: ['Başlangıç saatini ve kaç kez olduğunu not et.', 'Dışkı/kusmuk fotoğrafını sağlık kaydına ekle.', 'Mama değişimi, ilaç, çöp/bitki teması gibi tetikleyicileri yaz.'],
    urgent: ['Kan görülmesi', 'Sürekli kusma veya suyu tutamama', 'Yavru/yaşlı pet, kronik hastalık veya toksin şüphesi']
  },
  {
    id: 'breathing',
    icon: 'lungs',
    tone: 'danger',
    title: 'Solunum Zorluğu',
    desc: 'Nefes alma güçlüğü, morarma, hızlı veya eforlu solunum.',
    signals: ['Ağız açık nefes alma, hırıltı, mor/soluk diş eti', 'Göğüs/karınla belirgin efor', 'Dinlenirken hızlı solunum veya panik'],
    dont: ['Ağız içine zorla su/ilaç verme.', 'Strese sokacak taşıma veya kovalamadan kaçın.', 'Belirti geçer diye uzun süre izleme.'],
    prepare: ['Petin en sakin pozisyonda kalmasını sağla.', 'Solunum videosu çekebiliyorsan kısa kayıt al.', 'Yakın klinik ve ulaşım planını hazırla.'],
    urgent: ['Morarma, bayılma, bilinç değişikliği', 'Dinlenirken belirgin nefes çabası', 'Boğulma, travma veya toksik temas şüphesi']
  },
  {
    id: 'seizure-collapse',
    icon: 'heartPulse',
    tone: 'danger',
    title: 'Nöbet / Bayılma',
    desc: 'Kasılma, yere yığılma, bilinç kaybı veya kontrolsüz titreme.',
    signals: ['Kasılma, çene kilitlenmesi, idrar kaçırma', 'Aniden yere yığılma veya dalgınlık', 'Nöbet sonrası şaşkınlık veya kör gibi davranma'],
    dont: ['Ağzına elini sokma.', 'Zorla su, mama veya ilaç verme.', 'Sarsarak ayıltmaya çalışma.'],
    prepare: ['Çevresindeki sert/can yakıcı eşyaları uzaklaştır.', 'Süre tut ve mümkünse video al.', 'Öncesinde ilaç, toksin, travma veya ısı maruziyeti var mı not et.'],
    urgent: ['Nöbet 2-3 dakikadan uzun sürerse', 'Tekrarlayan nöbet olursa', 'Nöbet sonrası toparlamazsa veya zehir şüphesi varsa']
  },
  {
    id: 'heatstroke',
    icon: 'thermometer',
    tone: 'danger',
    title: 'Sıcak Çarpması',
    desc: 'Aşırı sıcak, kapalı araç, yoğun egzersiz veya güneş sonrası hızlı kötüleşme.',
    signals: ['Aşırı panting, salya, halsizlik', 'Kusma, ishal, koordinasyon bozukluğu', 'Çökme, bilinç değişikliği'],
    dont: ['Buzlu suya sokma veya şok soğutma yapma.', 'Zorla su içirmeye çalışma.', 'Serinledi gibi görünüyor diye klinik kontrolünü atlama.'],
    prepare: ['Gölge/serin alana al, ortamı sakinleştir.', 'Islak serin havlu ve hava akımıyla kontrollü serinlet.', 'Maruziyet süresini ve belirtileri not et.'],
    urgent: ['Çökme, bilinç değişikliği, nöbet', 'Kusma/ishal veya yürüyememe', 'Kapalı araç veya uzun süre yüksek sıcaklık maruziyeti']
  },
  {
    id: 'eye-injury',
    icon: 'search',
    tone: 'slate',
    title: 'Göz Yaralanması',
    desc: 'Gözde darbe, çizik, yabancı cisim, kimyasal temas veya ani kapanma.',
    signals: ['Gözü kapalı tutma, patileme, kızarıklık', 'Akıntı, bulanıklık, şişlik', 'Darbe, kedi tırmığı veya kimyasal temas'],
    dont: ['Gözü ovalama veya bastırma.', 'İnsan göz damlası kullanma.', 'Gözde görünen cismi çekmeye çalışma.'],
    prepare: ['Kimyasal/ürün ambalajını sakla.', 'Fotoğraf çekebiliyorsan flaşsız kısa kayıt al.', 'Ne zaman başladığını ve travma ihtimalini not et.'],
    urgent: ['Göz kapalı kalıyorsa', 'Kimyasal temas veya travma varsa', 'Gözde bulanıklık, kan veya belirgin ağrı varsa']
  },
  {
    id: 'wound-bleeding',
    icon: 'shield',
    tone: 'danger',
    title: 'Yara / Kanama',
    desc: 'Kesik, ısırık, şişlik, akıntı veya durmayan kanama.',
    signals: ['Kanama, açık yara, kötü koku veya irin', 'Isırık sonrası küçük delik yaralar', 'Şişlik, sıcaklık, ağrı'],
    dont: ['Derin yarayı evde kapatmaya çalışma.', 'Veteriner önermeden merhem veya insan ilacı sürme.', 'Isırık yarasını küçük görüp bekleme.'],
    prepare: ['Temiz gazlı bezle hafif bası uygula.', 'Yara fotoğrafı çek ve zamanı not et.', 'Isırık, travma veya yabancı cisim ihtimalini yaz.'],
    urgent: ['Kanama durmuyorsa', 'Derin/ısırık/kirli yara varsa', 'Halsizlik, soluk diş eti veya şok belirtisi varsa']
  },
  {
    id: 'urinary',
    icon: 'alert',
    tone: 'danger',
    title: 'İdrar Yapamama',
    desc: 'Özellikle erkek kedilerde acil kabul edilen idrar tıkanıklığı riski.',
    signals: ['Kuma sık gitme ama az/hiç idrar yok', 'Ağlama, zorlanma, karın ağrısı', 'Kanlı idrar, halsizlik, kusma'],
    dont: ['Kabızlık sanıp bekleme.', 'Karına bastırma.', 'Evde ilaç veya ağrı kesici verme.'],
    prepare: ['Son idrar zamanını not et.', 'Kum kabı davranışını ve idrar miktarını kaydet.', 'Kusma/halsizlik varsa acil bilgisini öne çıkar.'],
    urgent: ['Hiç idrar yapamama şüphesi', 'Erkek kedi + zorlanma', 'Kusma, halsizlik veya ağrılı miyavlama']
  },
  {
    id: 'birth',
    icon: 'calendar',
    tone: 'gold',
    title: 'Doğum Komplikasyonu',
    desc: 'Gebelik/doğum sürecinde uzama, zorlanma veya anne/yavru riski.',
    signals: ['Uzun süre ıkınma ama yavru gelmemesi', 'Kötü kokulu/kanlı akıntı', 'Anne çok halsiz veya ağrılı görünmesi'],
    dont: ['Yavruyu zorla çekme.', 'Doğumu hızlandırmak için ilaç verme.', 'Uzun süren zorlanmayı normal sayma.'],
    prepare: ['Başlangıç saatini ve doğan yavru sayısını not et.', 'Akıntı rengi/kokusu ve annenin durumunu kaydet.', 'Gebelik günü ve önceki doğum bilgilerini hazırla.'],
    urgent: ['Şiddetli zorlanma ve yavru gelmemesi', 'Kötü kokulu akıntı veya yoğun kanama', 'Anne baygın, çok halsiz veya ağrılıysa']
  }
];

function getTopic(topicId) {
  return topics.find(topic => topic.id === topicId);
}

function renderList(items) {
  return `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderTopicCard(topic) {
  return `
    <button class="knowledge-topic-card ${topic.tone}" data-topic-id="${topic.id}">
      <div class="premium-icon-box">${window.__icons?.[topic.icon] || window.__icons?.clipboard}</div>
      <div>
        <strong>${escapeHtml(topic.title)}</strong>
        <p>${escapeHtml(topic.desc)}</p>
      </div>
      <span>${window.__icons?.chevronRight}</span>
    </button>
  `;
}

function renderTopicDetail(topic) {
  return `
    <div class="screen premium-check knowledge-screen">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${escapeHtml(topic.title)}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.[topic.icon] || window.__icons?.clipboard}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero ${topic.tone}">
          <div class="premium-icon-box">${window.__icons?.[topic.icon] || window.__icons?.clipboard}</div>
          <div>
            <div class="premium-screen-kicker">Güvenli bilgi</div>
            <h1>${escapeHtml(topic.title)}</h1>
            <p>${escapeHtml(topic.desc)}</p>
          </div>
        </div>

        <div class="info-box warning mb-4">
          <span class="info-box-icon">${window.__icons?.alert}</span>
          <span>Bu ekran tanı veya tedavi önermez. Amaç, riskli durumda neyi yapmamak ve veterinere hangi bilgiyi hazırlamak gerektiğini netleştirmektir.</span>
        </div>

        <div class="knowledge-detail-grid">
          <section class="knowledge-panel">
            <h3>Risk sinyalleri</h3>
            ${renderList(topic.signals)}
          </section>
          <section class="knowledge-panel danger">
            <h3>Yapma</h3>
            ${renderList(topic.dont)}
          </section>
          <section class="knowledge-panel">
            <h3>Hazırla</h3>
            ${renderList(topic.prepare)}
          </section>
          <section class="knowledge-panel urgent">
            <h3>Acil veteriner</h3>
            ${renderList(topic.urgent)}
          </section>
        </div>

        <div class="feature-bottom-actions">
          ${topic.id === 'toxic' ? '<button class="btn btn-primary btn-full" id="btnToxicRecord">Toksik Acil Kayıt Aç</button>' : ''}
          <button class="btn btn-secondary btn-full" id="btnVetPrep">Kliniğe Hazırlık Notu</button>
        </div>
      </div>
    </div>
  `;
}

export function render(params = {}) {
  const topic = params.topicId ? getTopic(params.topicId) : null;
  if (params.topicId && !topic) {
    return `
      <div class="screen premium-check knowledge-screen">
        <div class="header premium-soft-header">
          <div class="header-left"><button class="header-icon" id="btnBack">${window.__icons?.back}</button></div>
          <div class="header-title">Bilgi Bulunamadı</div>
          <div class="header-right"></div>
        </div>
        <div class="section pt-4">
          <div class="empty-state">
            <div class="empty-state-icon">${window.__icons?.search || ''}</div>
            <div class="empty-state-title">Bu konu bulunamadı</div>
            <div class="empty-state-desc">Acil bilgi bankasındaki güncel konulara geri dön.</div>
            <button class="btn btn-primary btn-full mt-4" id="btnKnowledgeHome">Bilgi Bankasına Dön</button>
          </div>
        </div>
      </div>
    `;
  }

  if (topic) return renderTopicDetail(topic);

  return `
    <div class="screen premium-check knowledge-screen">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-icon" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">Acil Bilgi Bankası</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.shield}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="knowledge-hero">
          <div>
            <div class="premium-screen-kicker">Veteriner öncesi güvenli rehber</div>
            <h1>Ne yapmamalı, ne hazırlamalı?</h1>
            <p>Bu alan tedavi önermez. Acil durumda güvenli sınırlar, risk sinyalleri ve veteriner görüşmesine hazırlık sağlar.</p>
          </div>
        </div>

        <div class="knowledge-rule-strip">
          <span>${window.__icons?.xCircle}</span>
          <b>İlaç, kusturma, doz veya evde tedavi önerisi yok.</b>
        </div>

        <div class="knowledge-topic-list">
          ${topics.map(renderTopicCard).join('')}
        </div>
      </div>
    </div>
  `;
}

export function afterRender(params = {}) {
  document.getElementById('btnBack')?.addEventListener('click', () => {
    if (params.topicId) navigate('/check/knowledge');
    else goBack();
  });
  document.getElementById('btnKnowledgeHome')?.addEventListener('click', () => navigate('/check/knowledge'));
  document.getElementById('btnToxicRecord')?.addEventListener('click', () => navigate('/feature/toxic'));
  document.getElementById('btnVetPrep')?.addEventListener('click', () => navigate('/feature/vet-prep'));

  document.querySelectorAll('[data-topic-id]').forEach(card => {
    card.addEventListener('click', () => navigate(`/check/knowledge/${card.dataset.topicId}`));
  });
}
