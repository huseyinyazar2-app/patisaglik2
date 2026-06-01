// Pati Sağlık — i18n Turkish translations
import en from './en.js';

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
    terms: 'Kullanım koşullarını kabul ediyorum', privacy: 'Gizlilik politikasını okudum ve onaylıyorum'
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

export function getLocale() {
  try {
    const profile = JSON.parse(localStorage.getItem('pati_user_profile') || '{}');
    return profile.locale || 'tr';
  } catch {
    return 'tr';
  }
}

export function setLocale(locale) {
  const nextLocale = dictionaries[locale] ? locale : 'tr';
  try {
    const profile = JSON.parse(localStorage.getItem('pati_user_profile') || '{}');
    localStorage.setItem('pati_user_profile', JSON.stringify({ ...profile, locale: nextLocale }));
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
  return readValue(dictionaries[locale] || tr, key) ?? readValue(tr, key) ?? key;
}

export default tr;
