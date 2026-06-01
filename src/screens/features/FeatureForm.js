import { goBack, navigate } from '../../router.js';
import { getState } from '../../store.js';
import { getActivePet } from '../../mock/pets.js';
import { submitFeatureForm } from '../../services/formSubmissions.js';
import { isDocumentOcrConfigured, runDocumentOcr } from '../../services/documentOcr.js';
import QRCode from 'qrcode';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const featureForms = {
  'photo-followup': {
    icon: 'camera',
    eyebrow: 'Ücretsiz takip',
    title: 'Fotoğraf Karşılaştırmalı Takip',
    desc: 'Deri, yara veya fiziksel değişimi fotoğraflarla karşılaştırmak için görsel kayıt formu.',
    tone: 'teal',
    fields: [
      { type: 'upload-pair', before: 'Önceki fotoğraf', after: 'Bugünkü fotoğraf' },
      { type: 'text', label: 'Takip konusu', placeholder: 'Örn. sağ patide kızarıklık' },
      { type: 'chips', label: 'Görsel değişim', options: ['Azaldı', 'Aynı', 'Arttı', 'Yeni belirti'] },
      { type: 'textarea', label: 'Kısa not', placeholder: 'Renk, şişlik, akıntı veya kaşıma değişimi...' }
    ]
  },
  'poop-score': {
    icon: 'activity',
    eyebrow: 'Günlük kayıt',
    title: 'Dışkı Skoru',
    desc: 'Dışkı kalitesini görsel skala ile not almak için hızlı kayıt formu.',
    tone: 'slate',
    fields: [
      { type: 'score', label: 'Skor', options: ['1', '2', '3', '4', '5'] },
      { type: 'chips', label: 'Ek bulgu', options: ['Normal', 'Mukus', 'Kan', 'Çok sulu', 'Çok sert'] },
      { type: 'upload', label: 'Fotoğraf ekle' },
      { type: 'textarea', label: 'Not', placeholder: 'Mama değişimi, ilaç, stres veya diğer gözlemler...' }
    ]
  },
  'diet-log': {
    icon: 'heartPulse',
    eyebrow: 'Beslenme takibi',
    title: 'Mama / Beslenme Değişimi',
    desc: 'Yeni mamaya geçişte iştah, dışkı ve reaksiyonları izlemek için form.',
    tone: 'gold',
    fields: [
      { type: 'text', label: 'Yeni mama / öğün', placeholder: 'Örn. somonlu hassas mama' },
      { type: 'chips', label: 'Geçiş günü', options: ['1. gün', '3. gün', '7. gün', '14. gün'] },
      { type: 'chips', label: 'Reaksiyon', options: ['İştah iyi', 'Kusma', 'İshal', 'Kaşıntı', 'Gaz'] },
      { type: 'textarea', label: 'Beslenme notu', placeholder: 'Miktar, öğün saati ve fark edilen değişimler...' }
    ]
  },
  expense: {
    icon: 'briefcase',
    eyebrow: 'Ücretsiz kayıt',
    title: 'Masraf Takibi',
    desc: 'Mama, veteriner, aşı, ilaç ve bakım harcamalarını kategorize etmek için form.',
    tone: 'teal',
    fields: [
      { type: 'chips', label: 'Kategori', options: ['Veteriner', 'Mama', 'Aşı', 'İlaç', 'Bakım'] },
      { type: 'money', label: 'Tutar', placeholder: '0,00 TL' },
      { type: 'date', label: 'Tarih' },
      { type: 'upload', label: 'Fatura / belge ekle' },
      { type: 'textarea', label: 'Not', placeholder: 'Klinik adı, işlem veya ürün detayı...' }
    ]
  },
  reminders: {
    icon: 'calendar',
    eyebrow: 'Takvim',
    title: 'Aşı / İlaç / Randevu Hatırlatıcı',
    desc: 'Gelecek sağlık işlerini planlamak için görsel hatırlatıcı formu.',
    tone: 'teal',
    fields: [
      { type: 'chips', label: 'Hatırlatıcı türü', options: ['Aşı', 'İlaç', 'Randevu', 'Pire/Parazit'] },
      { type: 'text', label: 'Başlık', placeholder: 'Örn. karma aşı kontrolü' },
      { type: 'date', label: 'Tarih' },
      { type: 'chips', label: 'Tekrar', options: ['Tek sefer', 'Günlük', 'Haftalık', 'Aylık', 'Yıllık'] },
      { type: 'textarea', label: 'Not', placeholder: 'Doz, klinik, veteriner veya hazırlık notu...' }
    ]
  },
  'clinic-export': {
    icon: 'clipboard',
    eyebrow: 'Rapor',
    title: 'Sigorta / Klinik Hazırlık Dosyası',
    desc: 'Petin geçmişini veteriner veya sigorta için tek dosyada toparlama önizlemesi.',
    tone: 'gold',
    fields: [
      { type: 'checks', label: 'Dahil edilecekler', options: ['Pet profili', 'Aşı ve ilaçlar', 'Şikayet geçmişi', 'Fotoğraflar', 'Masraflar', 'Kural tabanlı notlar'] },
      { type: 'chips', label: 'Dosya amacı', options: ['Klinik ziyareti', 'Sigorta', 'İkinci görüş', 'Arşiv'] },
      { type: 'textarea', label: 'Veterinere not', placeholder: 'Özellikle bakılmasını istediğiniz konular...' }
    ]
  },
  chronic: {
    icon: 'clipboard',
    eyebrow: 'Takip şablonu',
    title: 'Kronik Hastalık Takibi',
    desc: 'Diyabet, böbrek, kalp gibi uzun dönemli durumlar için günlük izlem formu.',
    tone: 'teal',
    fields: [
      { type: 'chips', label: 'Şablon', options: ['Diyabet', 'Böbrek', 'Kalp', 'Alerji', 'Özel'] },
      { type: 'chips', label: 'Bugünkü durum', options: ['Stabil', 'İyi', 'Daha kötü', 'İlaç atlandı'] },
      { type: 'text', label: 'Ölçüm / gözlem', placeholder: 'Örn. su tüketimi arttı' },
      { type: 'textarea', label: 'Takip notu', placeholder: 'İştah, su, idrar, halsizlik veya ağrı gözlemi...' }
    ]
  },
  postop: {
    icon: 'shield',
    eyebrow: 'Takip şablonu',
    title: 'Operasyon Sonrası Takip',
    desc: 'Yara yeri, iştah, ilaç ve genel durum kontrolü için form.',
    tone: 'slate',
    fields: [
      { type: 'chips', label: 'Operasyon günü', options: ['1. gün', '3. gün', '7. gün', '14. gün'] },
      { type: 'chips', label: 'Yara durumu', options: ['Temiz', 'Kızarık', 'Şiş', 'Akıntı var'] },
      { type: 'chips', label: 'İlaç kullanımı', options: ['Verildi', 'Atlandı', 'Yan etki var', 'Bitti'] },
      { type: 'date', label: 'Sonraki doz / kontrol' },
      { type: 'upload', label: 'Yara fotoğrafı' },
      { type: 'textarea', label: 'Genel durum', placeholder: 'İştah, tuvalet, hareket, ilaç kullanımı...' }
    ]
  },
  reproduction: {
    icon: 'calendar',
    eyebrow: 'Takvim',
    title: 'Kızgınlık / Gebelik / Doğum Takibi',
    desc: 'Üreme döngüsü ve doğum sürecini takvimle izlemek için form.',
    tone: 'gold',
    fields: [
      { type: 'chips', label: 'Takip türü', options: ['Kızgınlık', 'Gebelik', 'Doğum sonrası'] },
      { type: 'date', label: 'Başlangıç tarihi' },
      { type: 'chips', label: 'Belirti', options: ['Davranış değişimi', 'Akıntı', 'İştah değişimi', 'Yuva arama'] },
      { type: 'textarea', label: 'Not', placeholder: 'Takvim, belirti veya veteriner görüşü...' }
    ]
  },
  senior: {
    icon: 'heartPulse',
    eyebrow: 'Özel mod',
    title: 'Yaşlı Pet İzlemi',
    desc: 'Senior petler için su, kilo, ağrı ve hareket hassasiyetlerini takip etme formu.',
    tone: 'slate',
    fields: [
      { type: 'chips', label: 'Günlük durum', options: ['İyi', 'Daha az hareketli', 'Ağrılı', 'İştahsız'] },
      { type: 'chips', label: 'Odak', options: ['Su', 'Kilo', 'Ağrı', 'Merdiven', 'Uyku'] },
      { type: 'text', label: 'Gözlem', placeholder: 'Örn. bugün daha çok su içti' },
      { type: 'textarea', label: 'Not', placeholder: 'Günlük değişim, ağrı belirtisi veya veteriner planı...' }
    ]
  },
  qr: {
    icon: 'shield',
    eyebrow: 'Paylaşım',
    title: 'QR Sağlık Kartı',
    desc: 'Acil durumda gösterilecek kısa sağlık kartı için görsel önizleme.',
    tone: 'teal',
    fields: [
      { type: 'preview-card' },
      { type: 'checks', label: 'Paylaşılacak bilgiler', options: ['İsim ve tür', 'Alerjiler', 'Kronik hastalıklar', 'İlaçlar', 'Sahip iletişimi'] },
      { type: 'chips', label: 'Erişim süresi', options: ['24 saat', '7 gün', 'Süresiz'] }
    ]
  },
  sitter: {
    icon: 'profile',
    eyebrow: 'Pro paylaşım',
    title: 'Bakıcı Modu',
    desc: 'Pet sitter veya aile üyeleri için sınırlı erişim davet formu.',
    tone: 'gold',
    requiresPaid: true,
    fields: [
      { type: 'text', label: 'Davet edilecek kişi', placeholder: 'Ad Soyad' },
      { type: 'text', label: 'Telefon / e-posta', placeholder: 'ornek@email.com' },
      { type: 'checks', label: 'İzinler', options: ['Günlük not ekle', 'Hatırlatıcı gör', 'Acil kartı gör', 'Raporları gör'] },
      { type: 'chips', label: 'Erişim süresi', options: ['1 gün', '1 hafta', '1 ay'] }
    ]
  },
  'document-ai': {
    icon: 'upload',
    eyebrow: 'AI okuma hazırlığı',
    title: 'Belge / Tahlil / Fatura AI Okuma',
    desc: 'Veteriner belgesini kaydedip OCR/AI ayrıştırma kuyruğuna hazırlama formu.',
    tone: 'slate',
    fields: [
      { type: 'upload', label: 'Belge yükle' },
      { type: 'chips', label: 'Belge türü', options: ['Kan tahlili', 'Görüntüleme', 'Fatura', 'Reçete', 'Aşı kartı', 'Epikriz / rapor'] },
      { type: 'chips', label: 'Okuma hedefi', options: ['Klinik özeti', 'Tahlil değerleri', 'İlaç / reçete', 'Masraf', 'Takip görevi'] },
      { type: 'checks', label: 'İşaretlenecek bilgiler', options: ['Tarih', 'Klinik', 'İşlem', 'İlaçlar', 'Masraf', 'Anormal değer', 'Kontrol tarihi'] },
      { type: 'textarea', label: 'Görünen önemli değerler', placeholder: 'AI/OCR çalışana kadar elle görünen kritik değer, ilaç veya tutarı yazabilirsiniz...' },
      { type: 'textarea', label: 'Ek not', placeholder: 'Belgeyle ilgili hatırlamak istediğiniz şey...' }
    ]
  },
  'vet-prep': {
    icon: 'stethoscope',
    eyebrow: 'Klinik hazırlık',
    title: 'Kliniğe Hazırlık Modu',
    desc: 'Veteriner ziyareti öncesi cevapları toplayıp net bir görüşme özeti hazırlama formu.',
    tone: 'teal',
    fields: [
      { type: 'textarea', label: 'Ziyaret nedeni', placeholder: 'Veterinere neden gidiyorsunuz?' },
      { type: 'chips', label: 'Aciliyet', options: ['Rutin', 'Yakın takip', 'Bugün görülmeli'] },
      { type: 'checks', label: 'Yanıma alacağım', options: ['Fotoğraflar', 'Tahliller', 'Aşı kartı', 'Mama bilgisi', 'İlaç listesi'] },
      { type: 'textarea', label: 'Sorularım', placeholder: 'Veterinere sormak istediğiniz maddeler...' }
    ]
  },
  toxic: {
    icon: 'alert',
    eyebrow: 'Ücretsiz acil kayıt',
    title: 'Toksik Madde / Yabancı Cisim Kontrolü',
    desc: 'Zehirlenme veya yutma şüphesinde hızlı bilgi toplama ekranı.',
    tone: 'danger',
    fields: [
      { type: 'text', label: 'Ne yuttu / temas etti?', placeholder: 'Örn. çikolata, ilaç, oyuncak parçası' },
      { type: 'chips', label: 'Ne zaman oldu?', options: ['0-1 saat', '1-3 saat', 'Bugün', 'Emin değilim'] },
      { type: 'checks', label: 'Belirti var mı?', options: ['Kusma', 'Halsizlik', 'Titreme', 'Salya', 'Nefes sorunu'] },
      { type: 'textarea', label: 'Detay', placeholder: 'Miktar, paket fotoğrafı, davranış değişimi...' }
    ]
  }
};

function presetForField(field, preset = {}) {
  const label = field.label || '';
  if (label === 'Hatırlatıcı türü') return preset.type || '';
  if (label === 'Başlık') return preset.title || '';
  if (label === 'Tarih') return preset.date || '';
  if (label === 'Tekrar') return preset.repeat || '';
  if (label === 'Not') return preset.note || '';
  return '';
}

function renderField(field, preset = {}) {
  const presetValue = presetForField(field, preset);

  if (field.type === 'text' || field.type === 'money' || field.type === 'date') {
    const inputType = field.type === 'date' ? 'date' : 'text';
    return `
      <label class="feature-field">
        <span>${field.label}</span>
        <input type="${inputType}" placeholder="${field.placeholder || ''}" value="${escapeHtml(presetValue)}" />
      </label>
    `;
  }

  if (field.type === 'textarea') {
    return `
      <label class="feature-field">
        <span>${field.label}</span>
        <textarea placeholder="${field.placeholder || ''}">${escapeHtml(presetValue)}</textarea>
      </label>
    `;
  }

  if (field.type === 'chips' || field.type === 'score') {
    return `
      <div class="feature-field">
        <span>${field.label}</span>
        <div class="${field.type === 'score' ? 'feature-score-row' : 'feature-chip-row'}">
          ${field.options.map((option, index) => `
            <button class="${(presetValue ? option === presetValue : index === 0) ? 'selected' : ''}" type="button">${option}</button>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (field.type === 'checks') {
    return `
      <div class="feature-field">
        <span>${field.label}</span>
        <div class="feature-check-grid">
          ${field.options.map((option, index) => `
            <label>
              <input type="checkbox" ${index < 3 ? 'checked' : ''} />
              <b>${option}</b>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (field.type === 'upload') {
    return `
      <div class="feature-field">
        <span>${field.label}</span>
        <input type="file" class="feature-upload-input hidden" data-upload-label="${field.label}" />
        <button class="feature-upload" type="button" data-upload-trigger>
          ${window.__icons?.upload}
          <strong>Dosya seç</strong>
          <small>Fotoğraf, PDF veya belge önizlemesi</small>
        </button>
      </div>
    `;
  }

  if (field.type === 'upload-pair') {
    return `
      <div class="feature-photo-pair">
        <div class="feature-field">
          <span>${field.before}</span>
          <input type="file" class="feature-upload-input hidden" data-upload-label="${field.before}" accept="image/*" />
          <button class="feature-upload" type="button" data-upload-trigger>
            ${window.__icons?.camera}
            <strong>${field.before}</strong>
            <small>Eski kayıt</small>
          </button>
        </div>
        <div class="feature-field">
          <span>${field.after}</span>
          <input type="file" class="feature-upload-input hidden" data-upload-label="${field.after}" accept="image/*" />
          <button class="feature-upload" type="button" data-upload-trigger>
            ${window.__icons?.camera}
            <strong>${field.after}</strong>
            <small>Yeni kayıt</small>
          </button>
        </div>
      </div>
    `;
  }

  if (field.type === 'preview-card') {
    const state = getState();
    const pet = getActivePet(state.activePetId);
    const previewToken = pet.publicProfileToken || `preview-${pet.id || state.activePetId || 'pet'}`;
    const previewUrl = `${window.location.origin}${window.location.pathname}#/public/pet/${previewToken}`;
    return `
      <div class="feature-qr-preview" data-qr-url="${previewUrl}">
        <div>
          <small>Acil Sağlık Kartı</small>
          <strong>${pet.name}</strong>
          <span>${pet.breed || 'Profil'} · ${pet.weight || '0'} kg · ${pet.statusText || 'Sağlık profili'}</span>
        </div>
        <div class="feature-qr-box">
          <span>QR</span>
        </div>
      </div>
    `;
  }

  return '';
}

function renderDocumentOcrPanel() {
  return `
    <div class="feature-form-card document-ocr-panel" id="documentOcrPanel">
      <div class="info-box info">
        <span class="info-box-icon">${window.__icons?.spark || window.__icons?.upload || ''}</span>
        <span>Belgeyi kaydetmeden önce Gemini ile gerçek OCR okutabilirsin. Sonuç kayda işlenir; teşhis veya tedavi önerisi üretmez.</span>
      </div>
      <div class="feature-bottom-actions" style="padding: 0; margin-top: 14px;">
        <button class="btn btn-outline btn-full" id="btnRunDocumentOcr" type="button">
          <span class="modern-button-icon">${window.__icons?.search || window.__icons?.spark || ''}</span> Belgeyi AI ile Oku
        </button>
      </div>
      <div class="feature-form-notice hidden" id="documentOcrResult" role="status"></div>
    </div>
  `;
}

export function render(params = {}, query = {}) {
  const state = getState();
  const pet = getActivePet(state.activePetId);
  const config = featureForms[params.featureId];

  if (!config) {
    return `
      <div class="screen premium-check feature-form-screen">
        <div class="header premium-soft-header">
          <div class="header-left">
            <button class="header-back" id="btnBack">${window.__icons?.back}</button>
          </div>
          <div class="header-title">Özellik Bulunamadı</div>
          <div class="header-right">
            <span class="premium-header-shield">${window.__icons?.search || window.__icons?.clipboard}</span>
          </div>
        </div>

        <div class="section pt-4 pb-24">
          <div class="empty-state">
            <div class="empty-state-icon">${window.__icons?.search || ''}</div>
            <div class="empty-state-title">Bu form artık kullanılmıyor</div>
            <div class="empty-state-desc">Geçerli ücretsiz takip araçlarına ana sayfadan ulaşabilirsin.</div>
            <button class="btn btn-primary btn-full mt-4" id="btnGoHome">Ana Sayfaya Dön</button>
          </div>
        </div>
      </div>
    `;
  }

  const planCode = state.subscription?.planCode || state.subscription?.tier || 'free';
  if (config.requiresPaid && planCode === 'free') {
    return `
      <div class="screen premium-check feature-form-screen">
        <div class="header premium-soft-header">
          <div class="header-left">
            <button class="header-back" id="btnBack">${window.__icons?.back}</button>
          </div>
          <div class="header-title">${config.title}</div>
          <div class="header-right">
            <span class="premium-header-shield">${window.__icons?.lock || window.__icons?.spark}</span>
          </div>
        </div>

        <div class="section pt-4 pb-24">
          <div class="feature-form-hero ${config.tone}">
            <div class="premium-icon-box">${window.__icons?.lock || window.__icons?.spark}</div>
            <div>
              <div class="premium-screen-kicker">Kredi / Pro Alanı</div>
              <h1>${config.title}</h1>
              <p>${config.desc} Bu özellik ücretsiz sağlık kayıtlarından ayrı tutulur.</p>
            </div>
          </div>

          <div class="feature-form-card">
            <div class="info-box">
              <span class="info-box-icon">${window.__icons?.shield || ''}</span>
              <span>Ücretsiz planda kayıt arşivi, masraf, hatırlatıcı, QR kart ve takip formları açıktır. Bakıcı paylaşımı için kredi veya Pro plan gerekir.</span>
            </div>
          </div>

          <div class="feature-bottom-actions">
            <button class="btn btn-primary btn-full" id="btnPlan">Planları Gör</button>
            <button class="btn btn-ghost btn-full" id="btnCancel">Vazgeç</button>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="screen premium-check feature-form-screen">
      <div class="header premium-soft-header">
        <div class="header-left">
          <button class="header-back" id="btnBack">${window.__icons?.back}</button>
        </div>
        <div class="header-title">${config.title}</div>
        <div class="header-right">
          <span class="premium-header-shield">${window.__icons?.[config.icon] || window.__icons?.clipboard}</span>
        </div>
      </div>

      <div class="section pt-4 pb-24">
        <div class="feature-form-hero ${config.tone}">
          <div class="premium-icon-box">${window.__icons?.[config.icon] || window.__icons?.clipboard}</div>
          <div>
            <div class="premium-screen-kicker">${config.eyebrow}</div>
            <h1>${config.title}</h1>
            <p>${pet.name} için ${config.desc}</p>
          </div>
        </div>

        <div class="feature-form-card">
          ${config.fields.map((field) => renderField(field, query)).join('')}
        </div>

        ${params.featureId === 'document-ai' ? renderDocumentOcrPanel() : ''}

        <div class="feature-form-notice hidden" id="featureFormNotice" role="status"></div>

        <div class="feature-bottom-actions">
          <button class="btn btn-primary btn-full" id="btnSaveFeature">Kaydet</button>
          <button class="btn btn-ghost btn-full" id="btnCancel">Vazgeç</button>
        </div>
      </div>
    </div>
  `;
}

export function afterRender() {
  const state = getState();
  let currentDocumentOcrResult = null;

  function showNotice(message, tone = 'info') {
    const notice = document.getElementById('featureFormNotice');
    if (!notice) return;
    notice.textContent = message;
    notice.className = `feature-form-notice ${tone}`;
  }

  function firstSelected(label) {
    const field = [...document.querySelectorAll('.feature-field')]
      .find((item) => item.querySelector(':scope > span')?.textContent?.trim() === label);
    return field?.querySelector('button.selected')?.textContent?.trim() || '';
  }

  function checkedValues(label) {
    const field = [...document.querySelectorAll('.feature-field')]
      .find((item) => item.querySelector(':scope > span')?.textContent?.trim() === label);
    return [...(field?.querySelectorAll('input[type="checkbox"]') || [])]
      .filter((input) => input.checked)
      .map((input) => input.parentElement?.textContent?.trim() || '')
      .filter(Boolean);
  }

  function textareaValue(label) {
    const field = [...document.querySelectorAll('.feature-field')]
      .find((item) => item.querySelector(':scope > span')?.textContent?.trim() === label);
    return field?.querySelector('textarea')?.value || '';
  }

  function ocrSummaryText(result) {
    const labs = (result.labValues || []).slice(0, 5).map((item) => `${item.name}: ${item.value} ${item.unit || ''}`.trim());
    const meds = (result.medications || []).slice(0, 4).map((item) => [item.name, item.doseText, item.frequency].filter(Boolean).join(' · '));
    const tasks = (result.followupTasks || []).slice(0, 3).map((item) => [item.title, item.dueDate].filter(Boolean).join(' · '));
    return [
      result.summary,
      result.documentDate ? `Tarih: ${result.documentDate}` : '',
      result.clinic ? `Klinik: ${result.clinic}` : '',
      result.invoice?.total ? `Tutar: ${result.invoice.total} ${result.invoice.currency || ''}` : '',
      labs.length ? `Tahlil: ${labs.join(', ')}` : '',
      meds.length ? `İlaçlar: ${meds.join(', ')}` : '',
      tasks.length ? `Takip: ${tasks.join(', ')}` : ''
    ].filter(Boolean).join('\n');
  }

  function renderOcrResult(result) {
    const box = document.getElementById('documentOcrResult');
    if (!box) return;
    box.className = 'feature-form-notice success';
    box.innerHTML = `
      <strong>OCR tamamlandı</strong>
      <div class="mt-1">${escapeHtml(result.summary || 'Belgeden yapılandırılmış veri çıkarıldı.')}</div>
      <div class="text-xs mt-1">Güven: ${Math.round(result.confidence || 0)} / 100${result.warnings?.length ? ` · Uyarı: ${escapeHtml(result.warnings[0])}` : ''}</div>
    `;
  }

  async function renderQrImage(url) {
    const box = document.querySelector('.feature-qr-box');
    if (!box || !url) return;
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        margin: 1,
        scale: 5,
        color: {
          dark: '#003D34',
          light: '#FFFFFF'
        }
      });
      box.innerHTML = `<img src="${dataUrl}" alt="QR sağlık kartı" />`;
      box.dataset.qrGenerated = 'true';
    } catch {
      box.innerHTML = '<span>QR</span>';
    }
  }

  function collectPayload() {
    const fields = {};
    document.querySelectorAll('.feature-field').forEach((field) => {
      const label = field.querySelector(':scope > span')?.textContent?.trim();
      if (!label) return;

      const textInput = field.querySelector('input[type="text"], input[type="date"], textarea');
      if (textInput) {
        fields[label] = textInput.value || '';
        return;
      }

      const selectedButtons = [...field.querySelectorAll('button.selected')].map((btn) => btn.textContent.trim());
      if (selectedButtons.length) {
        fields[label] = selectedButtons;
        return;
      }

      const checks = [...field.querySelectorAll('input[type="checkbox"]')].map((input) => ({
        label: input.parentElement?.textContent?.trim() || '',
        checked: input.checked
      }));
      if (checks.length) {
        fields[label] = checks;
      }
    });

    const mediaFiles = [...document.querySelectorAll('.feature-upload-input')]
      .filter((input) => input.files?.[0])
      .map((input) => {
        const file = input.files[0];
        return {
          label: input.dataset.uploadLabel || '',
          name: file.name,
          mime_type: file.type,
          file_size_bytes: file.size,
          local_uri: `local://${file.name}`
        };
      });
    if (mediaFiles.length) fields.__media_files = mediaFiles;

    const qrPreview = document.querySelector('.feature-qr-preview')?.textContent?.trim();
    if (qrPreview) fields.qr_preview = qrPreview;
    if (currentDocumentOcrResult) fields.__ai_ocr_result = currentDocumentOcrResult;

    return fields;
  }

  document.getElementById('btnRunDocumentOcr')?.addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    const originalText = btn.textContent;
    const file = document.querySelector('.feature-upload-input')?.files?.[0];
    if (!file) {
      showNotice('Önce belge, fotoğraf veya PDF seçmelisin.', 'error');
      return;
    }
    if (!isDocumentOcrConfigured()) {
      showNotice('Gemini API anahtarı bulunamadı. VITE_GEMINI_API_KEY env değeri ile dev server yeniden başlatılınca gerçek OCR aktif olur.', 'error');
      return;
    }

    btn.textContent = 'Belge okunuyor...';
    btn.disabled = true;
    try {
      const response = await runDocumentOcr({
        file,
        documentKind: firstSelected('Belge türü') || firstSelected('Belge tÃ¼rÃ¼'),
        readGoal: firstSelected('Okuma hedefi'),
        extractionOptions: checkedValues('İşaretlenecek bilgiler').length ? checkedValues('İşaretlenecek bilgiler') : checkedValues('Ä°ÅŸaretlenecek bilgiler'),
        note: textareaValue('Ek not')
      });
      if (!response.ok) throw new Error(response.reason || 'ocr_failed');
      currentDocumentOcrResult = response.data;
      renderOcrResult(response.data);
      const visibleValues = [...document.querySelectorAll('.feature-field')]
        .find((item) => ['Görünen önemli değerler', 'GÃ¶rÃ¼nen Ã¶nemli deÄŸerler'].includes(item.querySelector(':scope > span')?.textContent?.trim()))
        ?.querySelector('textarea');
      if (visibleValues && !visibleValues.value.trim()) visibleValues.value = ocrSummaryText(response.data);
    } catch (err) {
      showNotice(`OCR başarısız: ${err.message}`, 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });

  const qrPreview = document.querySelector('.feature-qr-preview');
  if (qrPreview?.dataset.qrUrl) renderQrImage(qrPreview.dataset.qrUrl);

  document.querySelectorAll('.feature-chip-row button').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
    });
  });

  document.querySelectorAll('.feature-score-row button').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.parentElement?.querySelectorAll('button').forEach((item) => item.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  document.querySelectorAll('[data-upload-trigger]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.parentElement?.querySelector('.feature-upload-input')?.click();
    });
  });

  document.querySelectorAll('.feature-upload-input').forEach((input) => {
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      const button = input.parentElement?.querySelector('.feature-upload');
      if (!file || !button) return;
      const title = button.querySelector('strong');
      const desc = button.querySelector('small');
      if (title) title.textContent = file.name;
      if (desc) desc.textContent = `${file.type || 'Dosya'} · ${Math.ceil(file.size / 1024)} KB`;
    });
  });

  document.getElementById('btnBack')?.addEventListener('click', () => goBack());
  document.getElementById('btnGoHome')?.addEventListener('click', () => navigate('/home'));
  document.getElementById('btnPlan')?.addEventListener('click', () => navigate('/profile/plan'));
  document.getElementById('btnCancel')?.addEventListener('click', () => goBack());
  document.getElementById('btnSaveFeature')?.addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    const originalText = btn.textContent;
    btn.textContent = 'Kaydediliyor...';
    btn.disabled = true;

    try {
      const featureCode = window.location.hash.split('/feature/')[1]?.split('?')[0] || 'unknown';
      const result = await submitFeatureForm({
        userId: state.user?.id || 'user-1',
        petId: state.activePetId || 'pet-1',
        featureCode,
        locale: state.user?.locale || 'tr',
        payload: collectPayload()
      });
      if (result.storage === 'turso') {
        const target = result.domainTable ? ` ve ${result.domainTable} tablosuna işlendi` : '';
        showNotice(`Form Turso test veritabanına yazıldı${target}.`, 'success');
      } else {
        showNotice('Form yerel yedek kayda yazıldı. Turso için VITE_TURSO_* env gerekli.', 'success');
      }
      if (featureCode === 'qr' && result.publicPath) {
        await renderQrImage(`${window.location.origin}${window.location.pathname}#${result.publicPath}`);
      }
      if (featureCode === 'sitter' && result.invitePath) {
        const inviteUrl = `${window.location.origin}${window.location.pathname}#${result.invitePath}`;
        const shareText = result.inviteText || 'Pati Sağlık bakıcı daveti hazır.';
        try {
          if (navigator.share) await navigator.share({ title: 'Pati Sağlık Bakıcı Daveti', text: shareText, url: inviteUrl });
          else await navigator.clipboard.writeText(`${shareText}\n${inviteUrl}`);
        } catch {}
      }
      const nextRoute = ['clinic-export', 'document-ai', 'vet-prep'].includes(featureCode) ? '/reports' : featureCode === 'sitter' && result.invitePath ? result.invitePath : featureCode === 'qr' && result.publicPath ? result.publicPath : '/home';
      navigate(nextRoute);
    } catch (err) {
      showNotice(`Kayıt başarısız: ${err.message}`, 'error');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}
