// Pati Sağlık — i18n Turkish translations
import en from './en.js';

export const supportedLocales = [
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', rtl: false },
  { code: 'en', nativeName: 'English', englishName: 'English', rtl: false },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', rtl: false },
  { code: 'fr', nativeName: 'Français', englishName: 'French', rtl: false },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', rtl: false },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian', rtl: false },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese', rtl: false },
  { code: 'nl', nativeName: 'Nederlands', englishName: 'Dutch', rtl: false },
  { code: 'pl', nativeName: 'Polski', englishName: 'Polish', rtl: false },
  { code: 'ro', nativeName: 'Română', englishName: 'Romanian', rtl: false },
  { code: 'el', nativeName: 'Ελληνικά', englishName: 'Greek', rtl: false },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian', rtl: false },
  { code: 'uk', nativeName: 'Українська', englishName: 'Ukrainian', rtl: false },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', rtl: true },
  { code: 'he', nativeName: 'עברית', englishName: 'Hebrew', rtl: true },
  { code: 'fa', nativeName: 'فارسی', englishName: 'Persian', rtl: true },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', rtl: false },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', rtl: false },
  { code: 'ms', nativeName: 'Bahasa Melayu', englishName: 'Malay', rtl: false },
  { code: 'th', nativeName: 'ไทย', englishName: 'Thai', rtl: false },
  { code: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', rtl: false },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese', rtl: false },
  { code: 'ko', nativeName: '한국어', englishName: 'Korean', rtl: false },
  { code: 'zh', nativeName: '中文', englishName: 'Chinese', rtl: false }
];

const tr = {
  app: { name: 'Pati Sağlık', tagline: 'Evcil dostunuzun sağlık geçmişini takip edin, değişimleri erken fark edin.' },
  splash: { start: 'Başlayalım', login: 'Giriş Yap' },
  onboarding: {
    s1_title: 'Pet sağlık asistanınız', s1_desc: 'Evcil dostunuzun sağlık kayıtlarını tek yerde toplayın.',
    s2_title: 'Şikayeti anlatın, uygulama yönlendirsin', s2_desc: 'Gözlemlediğiniz belirtiyi yazın; uygulama uygun soruları ve gerekli kayıtları seçsin.',
    s3_title: 'Fotoğraf, video, ses ve ölçümler', s3_desc: 'Gerekli durumlarda fotoğraf, video, ses veya ölçüm görevleriyle kontrolü tamamlayın.',
    s4_title: 'Veteriner öncesi düzenli rapor', s4_desc: 'Uygulama teşhis koymaz; veteriner görüşmesi için anlaşılır rapor hazırlar.',
    next: 'Devam Et', skip: 'Atla'
  },
  auth: {
    login_title: 'Hoş Geldiniz', login_subtitle: 'Hesabınıza giriş yapın',
    register_title: 'Hesap Oluştur', register_subtitle: 'Yeni bir hesap oluşturun',
    email: 'E-posta', password: 'Şifre', password_confirm: 'Şifre Tekrar', fullname: 'Ad Soyad',
    login_btn: 'Giriş Yap', register_btn: 'Hesap Oluştur',
    forgot: 'Şifremi Unuttum',
    no_account: 'Hesabın yok mu?', has_account: 'Zaten hesabın var mı?',
    register_link: 'Kayıt Ol', login_link: 'Giriş Yap',
    terms: 'Kullanım koşullarını kabul ediyorum', privacy: 'Gizlilik politikasını okudum ve onaylıyorum',
    phone: 'Telefon', optional: 'opsiyonel'
  },
  pets: {
    add_title: 'Pet Ekle', photo_add: 'Fotoğraf Ekle',
    name: 'İsim', type: 'Tür', breed: 'Cins', birth_date: 'Doğum Tarihi', gender: 'Cinsiyet',
    neutered: 'Kısır mı?', weight: 'Kilo (kg)', chronic: 'Kronik Hastalıklar', allergies: 'Alerjiler',
    medications: 'Kullanılan İlaçlar', notes: 'Özel Not',
    save: 'Kaydet', later: 'Daha Sonra Tamamla',
    cat: 'Kedi', dog: 'Köpek', bird: 'Kuş', fish: 'Akvaryum', reptile: 'Sürüngen', small_mammal: 'Küçük memeli', exotic: 'Egzotik',
    male: 'Erkek', female: 'Dişi',
    yes: 'Evet', no: 'Hayır', unknown: 'Bilmiyorum',
    profile_kicker: 'Pet profili', new_profile_title: 'Yeni profil oluştur',
    new_profile_desc: 'Kedi, köpek, kuş, akvaryum, sürüngen ve diğer evcil türler için temel sağlık profili.',
    ownership: 'Sahiplik / Bakım Durumu', owned: 'Evcil', stray: 'Sokak / gönüllü', foster: 'Geçici yuva',
    location: 'Konum / Bölge', location_placeholder: 'Örn. Kadıköy, park, geçici yuva adresi',
    volunteer_note: 'Gönüllü / bakım notu', volunteer_note_placeholder: 'Sokak hayvanı, geçici yuva veya bakım paylaşımı için kısa not...',
    breed_placeholder: 'Irk / tür detayı', chronic_placeholder: 'Varsa kronik durum',
    allergies_placeholder: 'Varsa alerjiler', medications_placeholder: 'Varsa düzenli ilaçlar',
    medical_history: 'Tıbbi Geçmiş ve Öykü',
    medical_history_placeholder: 'Geçirdiği kazalar, ameliyatlar, genel huyu veya dikkat edilmesi gereken notlar...',
    save_profile: 'Profili Kaydet', saving: 'Kaydediliyor...', save_error: 'Pet kaydedilemedi',
    loading_profiles: 'Pet profilleri getiriliyor...', no_profiles: 'Henüz pet profili yok',
    no_profiles_desc: 'İlk pet profilini ekleyerek ücretsiz kayıtları ona bağlayabilirsin.',
    profiles_error: 'Pet profilleri getirilemedi', profiles_error_desc: 'Bağlantıyı kontrol edip tekrar deneyin.',
    multi_panel_title: 'Çoklu Pet Gelişmiş Yönetim Paneli',
    multi_panel_desc: 'Ücretsiz planda 1 pet; Pro planda aile, klinik ve sokak hayvanı profilleri birlikte yönetilir.',
    breed_missing: 'Irk belirtilmedi', volunteer: 'Gönüllü',
    free_limit_confirm: 'Ücretsiz plan limitine ulaştınız. Test için yine de pet ekleme formunu açmak ister misiniz?',
    device_title: 'Kontrolleri nasıl yapacaksınız?',
    device_desc: 'Bazı kontroller Basic Kit ile daha kapsamlı yapılabilir. Bu seçimi daha sonra ayarlardan değiştirebilirsiniz.',
    phone_only: 'Sadece telefonla kullanacağım', phone_only_desc: 'Fotoğraf, video, ses ve manuel ölçüm kayıtlarıyla başlayın.',
    basic_kit: 'Basic Kit kullanıyorum', basic_kit_desc: 'Kulak kamerası, idrar stripi ve derece destekli kontroller açılır.',
    device_later: 'Daha sonra ekleyeceğim', device_later_desc: 'Şimdilik cihazsız modda devam edin.'
  },
  home: {
    greeting: 'Merhaba', how_is: 'nasıl?',
    new_check: 'Yeni Sağlık Kontrolü',
    new_check_desc: 'Petinizde fark ettiğiniz belirtiyi anlatın; uygulama sizi doğru sorular ve kayıtlarla yönlendirsin.',
    start_check: 'Kontrol Başlat',
    emergency: 'Acil Durum', add_measurement: 'Ölçüm Ekle', add_note: 'Not Ekle', reports: 'Raporlar',
    timeline: 'Sağlık Zaman Çizelgesi', timeline_desc: 'Tüm sağlık kayıtlarını tarih sırasıyla gör.',
    measurements: 'Ölçümler', measurements_desc: 'Kilo, ateş ve trendleri takip et.',
    issues: 'Takip Edilen Sorunlar', issues_desc: 'Devam eden belirtileri düzenli izle.',
    vet_reports: 'Veteriner Raporları', vet_reports_desc: 'Oluşturulan raporları görüntüle.',
    last_check: 'Son kontrol', good_status: 'Genel durum iyi görünüyor',
    watch_status: 'Takip gereken kayıt var', urgent_status: 'Acil kayıt var'
  },
  check: {
    title: 'Yeni Sağlık Kontrolü',
    desc: 'Petinizle ilgili gözlemlediğiniz durumu anlatın. Uygulama uygun soruları ve gerekli kayıtları seçsin.',
    whats_wrong: '{name}\'da ne fark ettiniz?',
    complaint_desc: 'Belirtiyi kendi cümlelerinizle yazabilir veya hızlı seçimlerden işaretleyebilirsiniz.',
    placeholder: 'Örn. İki gündür iştahsız, bugün bir kez kustu ve halsiz görünüyor.',
    voice: 'Sesle Anlat', duration_title: 'Ne zamandır var?', severity_title: 'Size göre durum ne kadar ciddi?',
    continue: 'Devam Et', cancel: 'Vazgeç', back: 'Geri',
    quick_photo: 'Sadece Fotoğraf Ekle', quick_video: 'Sadece Video Ekle', quick_audio: 'Sadece Ses Ekle',
    basic_kit_checks: 'Basic Kit Kontrolleri'
  },
  understanding: {
    title: 'Kontrol Planı',
    desc: 'Anladığımız kadarıyla şu konularla ilgili kısa bir kontrol yapacağız.',
    priority_normal: 'Normal kontrol', priority_attention: 'Dikkat gerektiren kontrol', priority_urgent: 'Acil belirti kontrolü gerekli',
    steps: ['Acil belirti kontrolü', 'Kısa sorular', 'Önerilen kayıtlar', 'Kontrol özeti', 'Risk sonucu'],
    fix_link: 'Yanlış anlaşıldıysa düzelt', edit: 'Şikayeti Düzenle'
  },
  redflags: {
    title: 'Acil belirti kontrolü',
    desc: 'Aşağıdaki belirtilerden biri varsa beklemeden veteriner desteği gerekebilir.',
    yes: 'Evet', no: 'Hayır', unsure: 'Emin değilim'
  },
  emergency: {
    title: 'Acil veteriner değerlendirmesi gerekebilir',
    desc: 'Belirttiğiniz işaretler acil olabilir. Lütfen vakit kaybetmeden en yakın veteriner kliniğine başvurun.',
    find_clinic: 'En Yakın Kliniği Bul',
    save_record: 'Acil Kaydı Geçmişe Ekle',
    create_summary: 'Veterinerle Paylaşılacak Özet Oluştur',
    go_home: 'Ana Sayfaya Dön'
  },
  questions: { skip: 'Bilmiyorum / Atla', next: 'Devam', back: 'Geri' },
  tasks: {
    title: 'Bu kontrol için önerilen kayıtlar',
    desc: 'Aşağıdaki görevler sonucu ve veteriner raporunu daha anlaşılır hale getirir. Zorunlu olmayanları atlayabilirsiniz.',
    complete_selected: 'Seçili Görevleri Tamamla', skip_all: 'Görevleri Atla ve Devam Et', add_task: 'Görev Ekle',
    required: 'Zorunlu', recommended: 'Önerilir', optional: 'Opsiyonel',
    pending: 'Bekliyor', completed: 'Tamamlandı', skipped: 'Atlandı',
    take_photo: 'Fotoğraf Çek', from_gallery: 'Galeriden Seç', skip_task: 'Bu Görevi Atla',
    record_video: 'Video Çek', start_record: 'Kayda Başla', stop_record: 'Kaydı Durdur',
    use: 'Kullan', retake: 'Tekrar Çek', rerecord: 'Tekrar Kaydet',
    photo_quality: 'Fotoğraf net mi?', video_quality: 'Pet net görünüyor mu?',
    add_note: 'Bu kayıtla ilgili not ekleyin',
    save: 'Kaydet', skip: 'Atla'
  },
  summary: {
    title: 'Kontrol Özeti', complaint: 'Şikayet', categories: 'Anlaşılan Kategoriler',
    redflags: 'Acil Belirti Yanıtları', no_redflags: 'Acil belirti bildirimi yok',
    answers: 'Soru Cevapları', records: 'Eklenen Kayıtlar', history: 'Geçmiş Bağlantıları',
    evaluate: 'Değerlendir', complete_tasks: 'Eksik Görevleri Tamamla', edit: 'Düzenle',
    save_draft: 'Kaydet ve Sonra Devam Et', cancel: 'İptal'
  },
  processing: {
    title: 'Kontrol değerlendiriliyor',
    desc: 'Şikayet, cevaplar, eklenen kayıtlar ve pet geçmişi birlikte değerlendiriliyor.',
    steps: ['Şikayet özeti hazırlanıyor', 'Cevaplar kontrol ediliyor', 'Medya kayıtları inceleniyor', 'Pet geçmişiyle karşılaştırılıyor', 'Risk sonucu oluşturuluyor', 'Rapor taslağı hazırlanıyor'],
    disclaimer: 'Bu değerlendirme veteriner muayenesinin yerine geçmez.'
  },
  result: {
    title: 'Sonuç',
    low: 'Düşük Risk', low_desc: 'Belirtileri takip edin. Değişim olursa yeni kontrol oluşturun.',
    medium: 'Orta Risk', medium_desc: 'Veteriner randevusu planlamanız önerilir.',
    high: 'Yüksek Risk', high_desc: 'Kısa sürede veteriner değerlendirmesi önerilir.',
    critical: 'Acil Risk', critical_desc: 'Beklemeden veteriner kliniğine başvurun.',
    findings: 'Belirti Özeti', evaluation: 'Değerlendirme', history_change: 'Geçmişe Göre Değişim',
    next_step: 'Önerilen Sonraki Adım', report_ready: 'Rapor taslağı hazır',
    save_history: 'Geçmişe Kaydet', create_report: 'Veteriner Raporu Oluştur',
    share_vet: 'Veterinerle Paylaş', track_issue: 'Takip Sorunu Olarak Kaydet',
    new_check: 'Yeni Kontrol Başlat', go_home: 'Ana Sayfaya Dön',
    disclaimer: 'Bu değerlendirme veteriner muayenesinin yerine geçmez.'
  },
  history: {
    title: 'Sağlık Geçmişi', timeline: 'Sağlık Zaman Çizelgesi',
    measurements: 'Ölçümler', issues: 'Takip Edilen Sorunlar',
    vaccines: 'Aşılar & İlaçlar', vet_visits: 'Veteriner Ziyaretleri',
    all: 'Tümü', checks: 'Kontroller', meas: 'Ölçümler', notes: 'Notlar',
    filter_reports: 'Raporlar', filter_vet: 'Veteriner',
    new_check: 'Yeni Sağlık Kontrolü', add_measurement: 'Ölçüm Ekle', add_note: 'Not Ekle',
    add_vet_visit: 'Veteriner Ziyareti Ekle', add_media: 'Belge/Fotoğraf Ekle',
    view_report: 'Raporu Görüntüle', recheck: 'Tekrar Kontrol Et',
    link_issue: 'Takip Sorununa Bağla', share: 'Paylaş',
    weight: 'Kilo', temperature: 'Ateş', respiratory: 'Solunum', urine: 'İdrar', other: 'Diğer',
    add_new: 'Yeni Ölçüm Ekle', add_to_report: 'Rapora Ekle',
    new_issue: 'Yeni Sorun Ekle', issue_name: 'Sorun adı', issue_category: 'Kategori',
    first_noticed: 'İlk fark edilen tarih', issue_desc: 'Açıklama',
    tracking_freq: 'Takip sıklığı',
    status_new: 'Yeni', status_tracking: 'Takipte', status_improving: 'İyileşiyor',
    status_worsening: 'Kötüleşiyor', status_closed: 'Kapandı'
  },
  reports: {
    title: 'Raporlar', new_report: 'Yeni Rapor Oluştur',
    source_last: 'Son muayene sonucu', source_issue: 'Takip edilen sorun',
    source_date: 'Tarih aralığı', source_manual: 'Manuel seçim',
    preview: 'Önizle', download: 'PDF Olarak İndir',
    share: 'Paylaş', send_vet: 'Veterinere Gönder', edit: 'Düzenle', delete: 'Sil'
  },
  profile: {
    title: 'Profil', edit: 'Profili Düzenle',
    pet_profiles: 'Pet Profilleri', notifications: 'Bildirimler',
    my_devices: 'Cihaz Kitim', backup: 'Yedekle & Senkronize',
    language: 'Dil', privacy: 'Gizlilik & Veri İzinleri',
    help: 'Yardım & Destek', about: 'Hakkında', logout: 'Çıkış Yap',
    add_pet: 'Yeni Pet Ekle',
    device_phone: 'Cihaz modu: Sadece telefon', device_kit: 'Basic Kit aktif',
    activate_kit: 'Basic Kit\'i Aktifleştir', phone_mode: 'Sadece Telefon Moduna Geç',
    kit_info: 'Kit Hakkında', test_connection: 'Test Bağlantısı',
    privacy_health: 'Sağlık kayıtları saklama izni', privacy_media: 'Medya dosyaları saklama izni',
    privacy_ai: 'AI değerlendirme izni', privacy_anon: 'Anonim ürün geliştirme izni',
    export_data: 'Verilerimi dışa aktar', delete_data: 'Verilerimi sil', delete_account: 'Hesabımı sil',
    save_settings: 'Ayarları Kaydet', download_data: 'Verilerimi İndir',
    delete_all: 'Hesabımı ve Verilerimi Sil'
  },
  account: {
    title: 'Hesap Bilgileri',
    kicker: 'Telefon öncelikli profil',
    heading: 'İletişim ve konum',
    desc: 'Acil yönlendirme, bildirim ve yerel ayarlar için temel hesap bilgileri.',
    phone: 'Telefon',
    full_name: 'Ad soyad',
    email: 'E-posta',
    optional: 'Opsiyonel',
    country: 'Ülke',
    province: 'İl',
    district: 'İlçe',
    neighborhood: 'Mahalle',
    language: 'Dil',
    timezone: 'Saat dilimi',
    privacy_note: 'Konum mahalle düzeyinde tutulur; klinik/yakın destek yönlendirmesi için kullanılır. Hassas canlı konum paylaşımı bu formda alınmaz.',
    phone_required: 'Telefon ana giriş bilgisi olarak gereklidir.',
    saving: 'Kaydediliyor...',
    saved: 'Hesap bilgileri kaydedildi.',
    save_failed: 'Hesap kaydedilemedi'
  },
  knowledge: {
    title: 'Acil Bilgi Bankası',
    kicker: 'Veteriner öncesi güvenli rehber',
    heading: 'Ne yapmamalı, ne hazırlamalı?',
    desc: 'Bu alan tedavi önermez. Acil durumda güvenli sınırlar, risk sinyalleri ve veteriner görüşmesine hazırlık sağlar.',
    rule: 'İlaç, kusturma, doz veya evde tedavi önerisi yok.',
    safe_info: 'Güvenli bilgi',
    disclaimer: 'Bu ekran tanı veya tedavi önermez. Amaç, riskli durumda neyi yapmamak ve veterinere hangi bilgiyi hazırlamak gerektiğini netleştirmektir.',
    signals: 'Risk sinyalleri',
    dont: 'Yapma',
    prepare: 'Hazırla',
    urgent: 'Acil veteriner',
    toxic_record: 'Toksik Acil Kayıt Aç',
    vet_prep: 'Kliniğe Hazırlık Notu',
    not_found_title: 'Bilgi Bulunamadı',
    not_found_empty: 'Bu konu bulunamadı',
    not_found_desc: 'Acil bilgi bankasındaki güncel konulara geri dön.',
    back_to_bank: 'Bilgi Bankasına Dön',
    topics: [
      {
        id: 'toxic', icon: 'alert', tone: 'danger', title: 'Toksik Madde / Zehirlenme',
        desc: 'Şüpheli gıda, ilaç, bitki, temizlik ürünü veya kimyasal teması.',
        signals: ['Çikolata, ksilitol, üzüm/kuru üzüm, soğan/sarımsak', 'İnsan ilacı, haşere zehiri, temizlik ürünü', 'Kusma, salya, titreme, halsizlik, nöbet'],
        dont: ['Veteriner söylemeden kusturmaya çalışma.', 'Aktif kömür, süt, yağ, tuzlu su veya insan ilacı verme.', 'Belirti yok diye bekleme; bazı toksinlerde belirtiler gecikebilir.'],
        prepare: ['Ambalajı, etiketi veya kalan maddeyi sakla.', 'Ne kadar ve ne zaman yediğini not et.', 'Petin türünü, kilosunu ve mevcut belirtileri hazır tut.'],
        urgent: ['Nefes sorunu, nöbet, bayılma, bilinç değişikliği', 'Şiddetli veya tekrarlayan kusma', 'Ksilitol, ilaç, zehir, pil, kimyasal veya bilinmeyen madde şüphesi']
      },
      {
        id: 'foreign-body', icon: 'search', tone: 'slate', title: 'Yabancı Cisim / Boğulma',
        desc: 'Oyuncak, ip, kemik, paket, pil veya keskin parça yutma/boğaza kaçma şüphesi.',
        signals: ['Öğürme, salya, ağızla uğraşma', 'Kusmaya çalışma ama çıkaramama', 'Karın ağrısı, dışkı yapamama, halsizlik'],
        dont: ['Boğaza parmak sokarak körlemesine müdahale etme.', 'İp, misina veya kumaş görünüyorsa çekme.', 'Kusmasını bekleyerek zamanı uzatma.'],
        prepare: ['Yuttuğu nesnenin aynısını veya fotoğrafını hazırla.', 'Yaklaşık boyut, malzeme ve zamanı not et.', 'Kusma, dışkı, karın ağrısı ve iştah durumunu kaydet.'],
        urgent: ['Nefes alamama veya morarma', 'Pil, mıknatıs, iğne, ip/misina, keskin cisim', 'Sürekli öğürme, şiş karın veya belirgin ağrı']
      },
      {
        id: 'vomit-diarrhea', icon: 'activity', tone: 'teal', title: 'Kusma / İshal',
        desc: 'Sindirim sistemi belirtilerinde takip ve acil risk ayrımı.',
        signals: ['Tekrarlayan kusma veya sulu ishal', 'Kan, siyah dışkı veya belirgin karın ağrısı', 'Su tutamama, halsizlik, hızlı kötüleşme'],
        dont: ['Veteriner önermeden ishal/kusma ilacı verme.', 'Zehir veya yabancı cisim ihtimalini göz ardı etme.', 'Yavru, yaşlı veya kronik hasta petlerde beklemeyi uzatma.'],
        prepare: ['Başlangıç saatini ve kaç kez olduğunu not et.', 'Dışkı/kusmuk fotoğrafını sağlık kaydına ekle.', 'Mama değişimi, ilaç, çöp/bitki teması gibi tetikleyicileri yaz.'],
        urgent: ['Kan görülmesi', 'Sürekli kusma veya suyu tutamama', 'Yavru/yaşlı pet, kronik hastalık veya toksin şüphesi']
      },
      {
        id: 'breathing', icon: 'lungs', tone: 'danger', title: 'Solunum Zorluğu',
        desc: 'Nefes alma güçlüğü, morarma, hızlı veya eforlu solunum.',
        signals: ['Ağız açık nefes alma, hırıltı, mor/soluk diş eti', 'Göğüs/karınla belirgin efor', 'Dinlenirken hızlı solunum veya panik'],
        dont: ['Ağız içine zorla su/ilaç verme.', 'Strese sokacak taşıma veya kovalamadan kaçın.', 'Belirti geçer diye uzun süre izleme.'],
        prepare: ['Petin en sakin pozisyonda kalmasını sağla.', 'Solunum videosu çekebiliyorsan kısa kayıt al.', 'Yakın klinik ve ulaşım planını hazırla.'],
        urgent: ['Morarma, bayılma, bilinç değişikliği', 'Dinlenirken belirgin nefes çabası', 'Boğulma, travma veya toksik temas şüphesi']
      },
      {
        id: 'seizure-collapse', icon: 'heartPulse', tone: 'danger', title: 'Nöbet / Bayılma',
        desc: 'Kasılma, yere yığılma, bilinç kaybı veya kontrolsüz titreme.',
        signals: ['Kasılma, çene kilitlenmesi, idrar kaçırma', 'Aniden yere yığılma veya dalgınlık', 'Nöbet sonrası şaşkınlık veya kör gibi davranma'],
        dont: ['Ağzına elini sokma.', 'Zorla su, mama veya ilaç verme.', 'Sarsarak ayıltmaya çalışma.'],
        prepare: ['Çevresindeki sert/can yakıcı eşyaları uzaklaştır.', 'Süre tut ve mümkünse video al.', 'Öncesinde ilaç, toksin, travma veya ısı maruziyeti var mı not et.'],
        urgent: ['Nöbet 2-3 dakikadan uzun sürerse', 'Tekrarlayan nöbet olursa', 'Nöbet sonrası toparlamazsa veya zehir şüphesi varsa']
      },
      {
        id: 'heatstroke', icon: 'thermometer', tone: 'danger', title: 'Sıcak Çarpması',
        desc: 'Aşırı sıcak, kapalı araç, yoğun egzersiz veya güneş sonrası hızlı kötüleşme.',
        signals: ['Aşırı panting, salya, halsizlik', 'Kusma, ishal, koordinasyon bozukluğu', 'Çökme, bilinç değişikliği'],
        dont: ['Buzlu suya sokma veya şok soğutma yapma.', 'Zorla su içirmeye çalışma.', 'Serinledi gibi görünüyor diye klinik kontrolünü atlama.'],
        prepare: ['Gölge/serin alana al, ortamı sakinleştir.', 'Islak serin havlu ve hava akımıyla kontrollü serinlet.', 'Maruziyet süresini ve belirtileri not et.'],
        urgent: ['Çökme, bilinç değişikliği, nöbet', 'Kusma/ishal veya yürüyememe', 'Kapalı araç veya uzun süre yüksek sıcaklık maruziyeti']
      },
      {
        id: 'eye-injury', icon: 'search', tone: 'slate', title: 'Göz Yaralanması',
        desc: 'Gözde darbe, çizik, yabancı cisim, kimyasal temas veya ani kapanma.',
        signals: ['Gözü kapalı tutma, patileme, kızarıklık', 'Akıntı, bulanıklık, şişlik', 'Darbe, kedi tırmığı veya kimyasal temas'],
        dont: ['Gözü ovalama veya bastırma.', 'İnsan göz damlası kullanma.', 'Gözde görünen cismi çekmeye çalışma.'],
        prepare: ['Kimyasal/ürün ambalajını sakla.', 'Fotoğraf çekebiliyorsan flaşsız kısa kayıt al.', 'Ne zaman başladığını ve travma ihtimalini not et.'],
        urgent: ['Göz kapalı kalıyorsa', 'Kimyasal temas veya travma varsa', 'Gözde bulanıklık, kan veya belirgin ağrı varsa']
      },
      {
        id: 'wound-bleeding', icon: 'shield', tone: 'danger', title: 'Yara / Kanama',
        desc: 'Kesik, ısırık, şişlik, akıntı veya durmayan kanama.',
        signals: ['Kanama, açık yara, kötü koku veya irin', 'Isırık sonrası küçük delik yaralar', 'Şişlik, sıcaklık, ağrı'],
        dont: ['Derin yarayı evde kapatmaya çalışma.', 'Veteriner önermeden merhem veya insan ilacı sürme.', 'Isırık yarasını küçük görüp bekleme.'],
        prepare: ['Temiz gazlı bezle hafif bası uygula.', 'Yara fotoğrafı çek ve zamanı not et.', 'Isırık, travma veya yabancı cisim ihtimalini yaz.'],
        urgent: ['Kanama durmuyorsa', 'Derin/ısırık/kirli yara varsa', 'Halsizlik, soluk diş eti veya şok belirtisi varsa']
      },
      {
        id: 'urinary', icon: 'alert', tone: 'danger', title: 'İdrar Yapamama',
        desc: 'Özellikle erkek kedilerde acil kabul edilen idrar tıkanıklığı riski.',
        signals: ['Kuma sık gitme ama az/hiç idrar yok', 'Ağlama, zorlanma, karın ağrısı', 'Kanlı idrar, halsizlik, kusma'],
        dont: ['Kabızlık sanıp bekleme.', 'Karına bastırma.', 'Evde ilaç veya ağrı kesici verme.'],
        prepare: ['Son idrar zamanını not et.', 'Kum kabı davranışını ve idrar miktarını kaydet.', 'Kusma/halsizlik varsa acil bilgisini öne çıkar.'],
        urgent: ['Hiç idrar yapamama şüphesi', 'Erkek kedi + zorlanma', 'Kusma, halsizlik veya ağrılı miyavlama']
      },
      {
        id: 'birth', icon: 'calendar', tone: 'gold', title: 'Doğum Komplikasyonu',
        desc: 'Gebelik/doğum sürecinde uzama, zorlanma veya anne/yavru riski.',
        signals: ['Uzun süre ıkınma ama yavru gelmemesi', 'Kötü kokulu/kanlı akıntı', 'Anne çok halsiz veya ağrılı görünmesi'],
        dont: ['Yavruyu zorla çekme.', 'Doğumu hızlandırmak için ilaç verme.', 'Uzun süren zorlanmayı normal sayma.'],
        prepare: ['Başlangıç saatini ve doğan yavru sayısını not et.', 'Akıntı rengi/kokusu ve annenin durumunu kaydet.', 'Gebelik günü ve önceki doğum bilgilerini hazırla.'],
        urgent: ['Şiddetli zorlanma ve yavru gelmemesi', 'Kötü kokulu akıntı veya yoğun kanama', 'Anne baygın, çok halsiz veya ağrılıysa']
      }
    ]
  },
  freeRecords: {
    common: {
      no_date: 'Tarih yok',
      other: 'Diğer',
      record: 'Kayıt',
      no_records_yet: 'Henüz kayıt yok',
      none_yet: 'Henüz yok',
      expense: 'Masraf',
      general_expense: 'Genel masraf',
      reminder: 'Hatırlatıcı',
      once: 'Tek sefer',
      scheduled: 'Planlı',
      completed: 'Tamamlandı',
      health_record: 'Sağlık kaydı',
      form_record: 'Form kaydı'
    },
    types: {
      poop_score: 'Dışkı',
      photo_followup: 'Foto',
      diet_log: 'Beslenme',
      issue: 'Sorun',
      chronic_followup: 'Kronik',
      postop_followup: 'Operasyon',
      reproduction_followup: 'Üreme',
      senior_followup: 'Yaşlı',
      toxin_foreign_body: 'Acil'
    },
    list: {
      configs: {
        expenses: {
          title: 'Masraf Takibi',
          eyebrow: 'Ücretsiz kayıtlar',
          desc: 'mama, veteriner, aşı, ilaç ve bakım harcamaları',
          empty: 'Henüz masraf kaydı yok.',
          button: 'Masraf Ekle'
        },
        reminders: {
          title: 'Aşı / İlaç / Randevu',
          eyebrow: 'Takvim',
          desc: 'planlanan sağlık işleri ve tekrar eden hatırlatıcılar',
          empty: 'Henüz hatırlatıcı yok.',
          button: 'Hatırlatıcı Ekle'
        },
        health: {
          title: 'Sağlık Dosyaları',
          eyebrow: 'Takip arşivi',
          desc: 'dışkı skoru, foto takip, beslenme ve takip şablonları',
          empty: 'Henüz sağlık kaydı yok.',
          button: 'Takip Kaydı Ekle'
        }
      },
      tabs: { expenses: 'Masraf', reminders: 'Takvim', health: 'Sağlık' },
      filters: {
        expenses: [['all', 'Hepsi'], ['veteriner', 'Veteriner'], ['mama', 'Mama'], ['aşı', 'Aşı'], ['ilaç', 'İlaç'], ['bakım', 'Bakım']],
        reminders: [['all', 'Hepsi'], ['scheduled', 'Planlı'], ['aşı', 'Aşı'], ['ilaç', 'İlaç'], ['randevu', 'Randevu']],
        health: [['all', 'Hepsi'], ['poop_score', 'Dışkı'], ['photo_followup', 'Foto'], ['diet_log', 'Beslenme'], ['issue', 'Sorun'], ['chronic_followup', 'Kronik'], ['postop_followup', 'Operasyon'], ['reproduction_followup', 'Üreme'], ['senior_followup', 'Yaşlı'], ['toxin_foreign_body', 'Acil']]
      },
      sorts: {
        expenses: [['newest', 'Yeni'], ['amount_desc', 'Tutar ↓'], ['amount_asc', 'Tutar ↑']],
        reminders: [['due_asc', 'Yakın'], ['due_desc', 'Uzak'], ['newest', 'Yeni']],
        health: [['newest', 'Yeni'], ['oldest', 'Eski'], ['type', 'Türe göre']]
      },
      healthActions: {
        poop_score: 'Dışkı Kaydı Ekle',
        photo_followup: 'Foto Takip Ekle',
        diet_log: 'Beslenme Kaydı Ekle',
        issue: 'Sorun Kaydı Ekle',
        chronic_followup: 'Kronik Takip Ekle',
        postop_followup: 'Operasyon Takibi Ekle',
        reproduction_followup: 'Üreme Takibi Ekle',
        senior_followup: 'Yaşlı Pet Kaydı Ekle',
        toxin_foreign_body: 'Acil Kayıt Ekle'
      },
      programs: {
        chronic_followup: { title: 'Kronik takip', cadence: 'Haftalık durum' },
        postop_followup: { title: 'Operasyon sonrası', cadence: 'Yara ve ilaç kontrolü' },
        diet_log: { title: 'Beslenme geçişi', cadence: 'Reaksiyon takibi' },
        poop_score: { title: 'Dışkı skoru', cadence: 'Günlük kalite' },
        reproduction_followup: { title: 'Üreme takibi', cadence: 'Takvim ve belirti' },
        senior_followup: { title: 'Senior izlem', cadence: 'Hassasiyet takibi' }
      },
      filter: 'Filtre',
      sort: 'Sıralama',
      programs_title: 'Takip programları',
      programs_summary: 'Şablon durum özeti',
      last_7_days: 'Son 7 gün yoğunluğu',
      no_distribution: 'Henüz dağılım yok.',
      summary: 'Özet',
      records_preparing: 'Kayıtlar hazırlanıyor',
      distribution: 'Dağılım',
      waiting_data: 'Veri bekleniyor',
      total: 'Toplam',
      top: 'En yoğun',
      expense_count: '{count} masraf kaydı',
      record_count: '{count} kayıt',
      seven_days: '7 gün',
      upcoming_task: 'yaklaşan iş',
      next: 'Sıradaki',
      no_plan: 'Plan yok',
      health_count: 'sağlık kaydı',
      last_record: 'Son kayıt',
      records_loading: 'Kayıtlar getiriliyor...',
      empty_filter: 'Bu filtrede kayıt yok.',
      empty_filter_desc: 'Farklı bir filtre seçerek tekrar deneyebilirsin.',
      empty_desc: 'Yeni kayıt eklediğinde burada listelenecek.',
      pet_desc: '{name} için {desc}'
    },
    detail: {
      configs: {
        expenses: { title: 'Masraf Detayı' },
        reminders: { title: 'Hatırlatıcı Detayı' },
        health: { title: 'Sağlık Kaydı Detayı' }
      },
      repeat: 'Tekrar',
      no_size: 'Boyut yok',
      open: 'Aç',
      reminder_ics_title: 'Pati Sağlık Hatırlatıcı',
      reminder_ics_desc: 'Pati Sağlık hatırlatıcısı',
      appointment: 'Randevu',
      medication: 'İlaç',
      daily: 'Günlük',
      weekly: 'Haftalık',
      followup_reminder: 'Takip hatırlatıcısı',
      set_reminder: 'Hatırlatıcı Kur',
      previous_record: 'Önceki kayıt',
      today_record: 'Bugünkü kayıt',
      file_pending: 'Dosya bekleniyor',
      media_records: 'Medya kayıtları',
      media_count: '{count} dosya bu {subject} bağlı',
      file: 'Dosya',
      document: 'Belge',
      file_lower: 'dosya',
      subject_expense: 'masraf kaydına',
      subject_reminder: 'hatırlatıcıya',
      subject_health: 'sağlık kaydına',
      loading: 'Kayıt detayı getiriliyor...',
      notification_prep: 'Bildirim hazırlığı',
      calendar_status_title: 'Takvim durumu güncellenebilir',
      calendar_status_desc: 'PWA/Capacitor bildirim izni geldiğinde bu kayıt durumları kullanılacak.',
      remind_tomorrow: 'Yarın Hatırlat',
      export_calendar: 'Takvime Aktar',
      kicker: 'Ücretsiz kayıt detayı',
      hero_desc: '{name} için kaydedilen bilginin okunabilir özeti.',
      new_record: 'Yeni Kayıt Ekle',
      back_to_list: 'Listeye Dön',
      processing: 'İşleniyor...',
      reminder_update_failed: 'Hatırlatıcı güncellenemedi',
      not_found_title: 'Kayıt bulunamadı',
      not_found_desc: 'Kayıt silinmiş veya farklı bir pete ait olabilir.',
      no_duration: 'Süre kaydı yok',
      day_count: '{count}. gün',
      vet_search: 'Veteriner Ara',
      open_nearby_clinics: 'Yakındaki Klinikleri Aç',
      alert_disclaimer: 'Bu uyarı teşhis değildir; veteriner görüşmesine hazırlık için kayıtları düzenler.',
      fields: {
        category: 'Kategori',
        note: 'Not',
        created_at: 'Kayıt tarihi',
        type: 'Tür',
        repeat: 'Tekrar',
        status: 'Durum',
        record_type: 'Kayıt türü',
        summary: 'Özet',
        source: 'Kaynak'
      },
      alerts: {
        poop_danger: { title: 'Dışkı kaydında dikkat', desc: 'Skor uç değerde veya kan bulgusu var. Devam ederse veteriner görüşmesi için notları hazır tut.' },
        poop_watch: { title: 'Yakın takip önerilir', desc: 'Skor normalden sapmış görünüyor. Beslenme, su tüketimi ve tekrar eden kayıtları izlemek iyi olur.' },
        diet_danger: { title: 'Beslenme reaksiyonu', desc: 'Kusma veya ishal işaretlenmiş. Mama geçişini ve tekrar eden belirtileri dikkatle takip et.' },
        diet_watch: { title: 'Hassasiyet olabilir', desc: 'Kaşıntı veya gaz gibi reaksiyonlar kaydedilmiş. Sonraki öğünlerde aynı belirtiyi kontrol et.' },
        chronic_watch: { title: 'Kronik takip uyarısı', desc: 'Durum kötüleşme veya ilaç atlama içeriyor. Ölçüm ve notları aynı gün içinde tamamlamak faydalı olur.' },
        postop_danger: { title: 'Yara yeri dikkat', desc: 'Akıntı işaretlenmiş. Fotoğraf kaydı ve veteriner kontrol planı önerilir.' },
        postop_watch: { title: 'Yara yakın takip', desc: 'Kızarıklık veya şişlik kaydedilmiş. Aynı açıdan fotoğrafla değişimi takip et.' },
        medication_watch: { title: 'İlaç takibi', desc: 'İlaç atlama veya yan etki kaydedilmiş. Bir sonraki doz/kontrol için hatırlatıcı planla.' },
        reproduction_watch: { title: 'Üreme takibi dikkat', desc: 'Belirti değişimi kaydedilmiş. Takvim ve veteriner notlarını güncel tut.' },
        senior_watch: { title: 'Senior hassasiyet', desc: 'Ağrı veya iştah hassasiyeti kaydedilmiş. Su, kilo ve hareket notlarını düzenli karşılaştır.' },
        toxin_danger: { title: 'Acil veteriner yönlendirmesi', desc: 'Toksik madde/yabancı cisim şüphesi ve riskli belirti/zaman bilgisi var. Paket, miktar ve zamanı not edip beklemeden veterinerle görüş.' },
        toxin_watch: { title: 'Yakın acil takip', desc: 'Belirti veya belirsiz zaman bilgisi kaydedilmiş. Miktarı, saatini ve mümkünse fotoğrafını hazır tut; kötüleşirse acil destek al.' }
      },
      plans: {
        common: {
          measurement_observation: 'Ölçüm/gözlem',
          routine_check: 'Rutin kontrol',
          wound_status: 'Yara durumu',
          reaction: 'Reaksiyon',
          next_check: 'Sonraki kontrol',
          visual_record: 'Görsel kayıt',
          sign: 'Belirti',
          reminder: 'Hatırlatma',
          observation: 'Gözlem',
          routine: 'Rutin'
        },
        chronic: {
          title: 'Kronik takip planı',
          desc: 'Düzenli durum, ölçüm ve ilaç notlarını aynı şablonda biriktir.',
          template: 'Takip şablonu',
          no_status: 'Son durum kaydı bekleniyor',
          measurement_desc: 'Bir sonraki kayıtta ölçüm veya gözlem ekle',
          routine_desc: 'Haftalık kayıt düzeni trendi daha okunabilir yapar.',
          reminder_title: 'Kronik takip kontrolü',
          reminder_note: 'Kronik takip kaydını güncelle ve ölçüm/gözlem ekle.'
        },
        postop: {
          title: 'Operasyon sonrası plan',
          desc: 'Yara, ilaç ve genel durum kayıtlarını gün gün takip et.',
          day_desc: 'Operasyon günü bilgisini sonraki kontrollerle karşılaştır.',
          wound_desc: 'Fotoğraf ve kısa notla takip et',
          medication_title: 'İlaç/randevu',
          medication_desc: 'İlaç veya kontrol tarihi varsa takvim hatırlatıcısı ekle.',
          reminder_title: 'Operasyon sonrası ilaç/kontrol',
          reminder_note: 'Operasyon sonrası ilaç, yara ve genel durum kontrolünü kaydet.'
        },
        diet: {
          title: 'Beslenme geçiş planı',
          desc: 'Yeni mamaya geçişte reaksiyonları aynı kayıt hattında tut.',
          new_food: 'Yeni mama',
          no_transition_day: 'Geçiş günü belirtilmedi',
          no_reaction: 'Reaksiyon kaydı yok',
          next_desc: 'Dışkı, iştah ve kaşıntı notunu bir sonraki kayda ekle.',
          reminder_title: 'Beslenme geçiş kontrolü',
          reminder_note: 'Yeni mama sonrası iştah, dışkı ve kaşıntı notlarını kontrol et.'
        },
        poop: {
          title: 'Dışkı takip planı',
          desc: 'Skor değişimini düzenli kaydederek beslenme ve stres etkisini izleyebilirsin.',
          last_score: 'Son skor',
          no_score: 'Skor girilmedi',
          extra_finding: 'Ek bulgu',
          no_finding: 'Ek bulgu yok',
          visual_desc: 'Gerekirse aynı ışıkta fotoğraf ekleyerek karşılaştırmayı güçlendir.'
        },
        reproduction: {
          title: 'Üreme takip planı',
          desc: 'Kızgınlık, gebelik veya doğum sonrası belirtileri takvim halinde izle.',
          followup_type: 'Takip türü',
          no_sign: 'Belirti kaydı yok',
          reminder_desc: 'Kontrol günü veya veteriner ziyareti için ayrı hatırlatıcı ekle.',
          reminder_title: 'Üreme takip kontrolü',
          reminder_note: 'Belirti değişimi, iştah ve veteriner notunu kontrol et.'
        },
        senior: {
          title: 'Senior hassasiyet planı',
          desc: 'Yaşlı petlerde küçük değişimleri düzenli ve sakin bir akışta kaydet.',
          daily_status: 'Günlük durum',
          no_focus: 'Odak alanı yok',
          no_observation: 'Gözlem eklenmedi',
          routine_desc: 'Su, kilo, ağrı ve hareket kayıtlarını haftalık karşılaştır.',
          reminder_title: 'Senior rutin kontrol',
          reminder_note: 'Su, kilo, ağrı ve hareket gözlemlerini güncelle.'
        },
        toxin: {
          title: 'Acil kontrol planı',
          desc: 'Toksik madde veya yabancı cisim şüphesinde veteriner görüşmesi için bilgileri hazır tut.',
          substance: 'Madde/cisim',
          no_time: 'Zaman bilgisi yok',
          no_sign: 'Belirti işaretlenmedi',
          vet_prep: 'Veteriner hazırlığı',
          vet_prep_desc: 'Paket/fotoğraf, yaklaşık miktar, saat ve belirtileri tek yerde hazır tut.'
        }
      },
      compare: {
        size_delta: '{delta} KB dosya farkı',
        size_close: 'Dosya boyutları yakın',
        waiting_pair: 'Karşılaştırma için iki fotoğraf bekleniyor',
        photo_danger_title: 'Değişim yakından izlenmeli',
        photo_good_title: 'İyileşme eğilimi',
        photo_watch_title: 'Değişim stabil',
        photo_danger_desc: 'Kayıtta artış veya yeni belirti seçilmiş. Aynı açıdan yeni fotoğraf ve veteriner notu eklemek iyi olur.',
        photo_good_desc: 'Azalma seçilmiş. Aynı ışık/açı ile bir sonraki kontrol fotoğrafı trendi daha net gösterir.',
        photo_watch_desc: 'Belirti aynı görünüyor. Düzenli aralıkla tekrar fotoğraf eklemek karşılaştırmayı güçlendirir.',
        no_visual_change: 'Görsel değişim seçilmedi',
        wound_danger_title: 'Yara fotoğrafı acil takipte',
        wound_watch_title: 'Yara değişimi izlenmeli',
        wound_good_title: 'Yara kaydı sakin',
        wound_danger_desc: 'Akıntı işaretlenmiş. Fotoğrafı sakla, doz/kontrol hatırlatıcısını kullan ve veterinerle paylaş.',
        wound_watch_desc: 'Kızarıklık veya şişlik var. Sonraki kayıtta aynı açıdan fotoğraf ekleyerek farkı karşılaştır.',
        wound_good_desc: 'Yara durumu temiz görünüyor. Aynı açıdan aralıklı fotoğraf eklemek iyileşme kaydını güçlendirir.',
        no_wound_status: 'Yara durumu yok',
        media_count: '{count} medya'
      }
    }
  },
  notifications: {
    title: 'Bildirimler',
    reminder_title: 'Hatırlatıcı Bildirimleri',
    reminder_desc: 'PWA ve Capacitor tarafında aynı hatırlatıcı kayıtları kullanılacak. Bu ekranda cihaz izni ve yaklaşan plan izlenir.',
    permission_granted: 'Aktif',
    permission_denied: 'Kapalı',
    permission_unsupported: 'Desteklenmiyor',
    permission_default: 'İzin bekliyor',
    loading_plan: 'Yaklaşan bildirimler getiriliyor...',
    empty_title: 'Planlı bildirim yok',
    empty_desc: 'Aşı, ilaç veya randevu hatırlatıcısı eklediğinde burada görünecek.',
    reminders_toggle: 'Aşı / ilaç / randevu bildirimleri',
    active: 'Aktif',
    daily_summary: 'Günlük özet',
    evening_summary: 'Akşam özeti',
    quiet_hours: 'Sessiz saatler',
    permission_button: 'Bildirim İzni Ver',
    test_button: 'Test Bildirimi',
    plan_title: 'Yaklaşan Bildirim Planı',
    planned: 'Planlı',
    test_permission_required: 'Test bildirimi için önce tarayıcı bildirim izni gerekli.',
    scheduler_title: 'Uygulama içi zamanlayıcı',
    scheduler_desc: 'Uygulama açıkken gelen hatırlatıcıları kontrol eder ve aynı kayıt için tekrar bildirim göndermez.',
    scheduler_started: 'Başlatıldı',
    scheduler_checked: 'Kontrol edildi',
    scheduler_sent: 'Bildirim gönderildi',
    scheduler_disabled: 'Ayar kapalı',
    scheduler_waiting_permission: 'İzin bekliyor',
    scheduler_quiet_hours: 'Sessiz saatlerde',
    scheduler_no_active_pet: 'Aktif pet yok',
    scheduler_not_started: 'Başlamadı',
    scheduler_error: 'Hata',
    check_now: 'Şimdi Kontrol Et',
    last_check: 'Son kontrol',
    native_title: 'Native cihaz planı',
    native_desc: 'Capacitor LocalNotifications plugini varsa yaklaşan hatırlatıcıları cihazın yerel planına yazar.',
    native_platform: 'Platform',
    native_available: 'Capacitor hazır',
    native_unavailable: 'PWA modu',
    native_sync_button: 'Cihaz Planına Yaz',
    native_last_result: 'Planlanan bildirim',
    native_unsupported: 'Bu ortamda native bildirim plugini yok; PWA bildirimleri kullanılmaya devam eder.'
  },
  common: {
    save: 'Kaydet', cancel: 'İptal', back: 'Geri', next: 'Devam', done: 'Tamam',
    delete: 'Sil', edit: 'Düzenle', share: 'Paylaş', close: 'Kapat',
    loading: 'Yükleniyor...', error: 'Bir hata oluştu', retry: 'Tekrar Dene',
    confirm: 'Onayla', yes: 'Evet', no: 'Hayır',
    photos: 'fotoğraf', videos: 'video', audio: 'ses kaydı', measurements: 'ölçüm'
  },
  tabs: {
    home: 'Ana Sayfa',
    check: 'Pati AI',
    history: 'Geçmiş',
    reports: 'Raporlar',
    profile: 'Profil'
  }
};

const dictionaries = { tr, en };

function normalizeLocale(locale) {
  return supportedLocales.some(item => item.code === locale) ? locale : 'tr';
}

export function getLocale() {
  try {
    const profile = JSON.parse(localStorage.getItem('pati_user_profile') || '{}');
    return normalizeLocale(profile.locale || 'tr');
  } catch {
    return 'tr';
  }
}

export function setLocale(locale) {
  const nextLocale = normalizeLocale(locale);
  try {
    const profile = JSON.parse(localStorage.getItem('pati_user_profile') || '{}');
    localStorage.setItem('pati_user_profile', JSON.stringify({ ...profile, locale: nextLocale }));
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = supportedLocales.find(item => item.code === nextLocale)?.rtl ? 'rtl' : 'ltr';
  } catch {}
  return nextLocale;
}

function readValue(dictionary, key) {
  const keys = key.split('.');
  let val = dictionary;
  for (const k of keys) {
    if (val && typeof val === 'object' && k in val) {
      val = val[k];
    } else {
      return undefined;
    }
  }
  return val;
}

export function t(key) {
  const locale = getLocale();
  return readValue(dictionaries[locale], key) ?? readValue(en, key) ?? readValue(tr, key) ?? key;
}

export default tr;
