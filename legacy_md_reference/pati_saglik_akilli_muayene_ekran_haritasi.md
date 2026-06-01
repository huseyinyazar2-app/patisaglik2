# Pati Sağlık — Akıllı Muayene Akışı Ekran Haritası ve Uygulama İskeleti

> **REVİZYON TALİMATI — MEVCUT PROJE ÜZERİNDEN DEVAM**
>
> Bu dosya, daha önce hazırlanan `pet_on_saglik_kontrol_uygulama_plani.md`, `pet_saglik_hafizasi_ek_plani.md` ve `pati_saglik_ekran_akisi_ui_sartnamesi.md` dosyalarının **akıllı muayene akışı revizyonudur**.
>
> Mevcut uygulama tamamen çöpe atılmayacak. Auth, pet profili, tema, alt menü, medya yükleme, i18n, sağlık geçmişi ve rapor altyapısı korunacak. Ancak mevcut “Semptom Kontrolü / Fotoğraf Kontrolü / Video Kontrolü / Ses Kontrolü” şeklindeki dağınık ana kontrol yapısı bırakılacak.
>
> Yeni ana ürün mantığı:
>
> **Kullanıcı petindeki şikayeti anlatır → sistem/AI şikayeti sınıflandırır → uygun soru setleri açılır → gerekli fotoğraf/video/ses/ölçüm görevleri tek bir muayene oturumunda toplanır → risk sonucu ve veteriner raporu oluşur.**
>
> Fotoğraf, video, ses ve ölçüm artık bağımsız ana modül değil; **muayene oturumu içindeki görevlerdir**.

---

## 1. Temel Karar

### 1.1 Eski Yapı

```text
Ana Sayfa
  -> Semptom Kontrolü
  -> Fotoğraf Kontrolü
  -> Video Kontrolü
  -> Ses Kontrolü
```

Bu yapı kullanıcıyı teknik modül seçmeye zorlar. Kullanıcı “petimde ne var?” sorusuyla gelir; “fotoğraf mı çekeyim, video mu ekleyeyim, semptom mu seçeyim?” diye düşünmemelidir.

### 1.2 Yeni Yapı

```text
Ana Sayfa
  -> Yeni Sağlık Kontrolü Başlat
    -> Şikayet Girişi
      -> Şikayet Sınıflandırma / Ön Anlama
        -> Acil Belirti Kontrolü
          -> Dinamik Soru Akışı
            -> Medya / Ölçüm Görevleri
              -> Kontrol Özeti
                -> AI Değerlendirme
                  -> Sonuç / Risk Skoru
                    -> Geçmişe Kaydet / Rapor Oluştur / Paylaş
```

### 1.3 Ana Veri Nesnesi

Yeni sistemin ana nesnesi:

```text
health_check_session
```

Bir muayene oturumu içinde şunlar tutulur:

- Pet bilgisi
- Kullanıcının serbest şikayet metni
- Seçilen hızlı belirti chip’leri
- AI/sistem sınıflandırması
- Acil belirti cevapları
- Dinamik soru cevapları
- Medya görevleri
- Fotoğraf/video/ses kayıtları
- Ölçümler
- Basic Kit görevleri
- Geçmiş karşılaştırmaları
- AI sonuç objesi
- Risk skoru
- Veteriner raporu

---

## 2. Ana Navigasyon

Alt tab bar korunur.

| Tab | Label | Route | Açıklama |
|---|---|---|---|
| 1 | Ana Sayfa | `/home` | Aktif pet özeti, yeni sağlık kontrolü, son kayıtlar |
| 2 | Kontrol | `/check` | Yeni muayene başlatma merkezi |
| 3 | Geçmiş | `/history` | Sağlık zaman çizelgesi, ölçümler, takip edilen sorunlar |
| 4 | Raporlar | `/reports` | Veteriner raporları |
| 5 | Profil | `/profile` | Kullanıcı, pet, cihaz, gizlilik ve ayarlar |

Ana aksiyon:

```text
Yeni Sağlık Kontrolü Başlat
```

Bu buton her zaman `/check/new/complaint` ekranına gider.

---

## 3. Route Haritası

```text
/auth/splash
/auth/onboarding
/auth/login
/auth/register

/pets/new
/pets/select
/pets/:petId/edit
/pets/device-mode

/home

/check
/check/new/complaint
/check/new/understanding
/check/new/red-flags
/check/new/emergency
/check/new/questions
/check/new/task-plan
/check/new/task/:taskId
/check/new/photo/:taskId/guide
/check/new/photo/:taskId/capture
/check/new/photo/:taskId/preview
/check/new/video/:taskId/guide
/check/new/video/:taskId/capture
/check/new/video/:taskId/preview
/check/new/audio/:taskId/guide
/check/new/audio/:taskId/record
/check/new/audio/:taskId/preview
/check/new/measurement/:taskId
/check/new/basic-kit/:taskId
/check/new/summary
/check/new/processing
/check/new/result

/history
/history/timeline
/history/session/:sessionId
/history/measurements
/history/measurements/new
/history/issues
/history/issues/new
/history/issues/:issueId

/reports
/reports/:reportId
/reports/new

/profile
/profile/settings
/profile/devices
/profile/privacy
/profile/notifications
/profile/language
```

---

## 4. Global UI Kuralları

### 4.1 Hardcode Metin Yasağı

Hiçbir başlık, açıklama, buton, kategori, soru veya uyarı doğrudan component içine yazılmayacak. Tüm metinler i18n dosyalarından gelecek.

Örnek:

```json
{
  "check.new.complaint.title": "Milo’da ne fark ettiniz?",
  "check.new.complaint.placeholder": "Örn. İki gündür iştahsız, bugün bir kez kustu.",
  "check.new.complaint.continue": "Devam Et",
  "result.disclaimer": "Bu değerlendirme veteriner muayenesinin yerine geçmez."
}
```

### 4.2 Güvenli Sağlık Dili

Kullanılmayacak ifadeler:

- Hastalık teşhisi koyduk
- Şu hastalık var
- Veterinere gitmenize gerek yok
- Kesin sağlıklı
- Antibiyotik gerekir
- Kanser değil
- İltihap var

Kullanılacak ifadeler:

- Bu bulgu veteriner değerlendirmesi gerektirebilir.
- Acil riskli belirti olabilir.
- Belirtiler kötüleşirse beklemeyin.
- Bu sonuç teşhis değildir.
- Veteriner muayenesinin yerine geçmez.
- Takip edilmesi gereken değişim olabilir.

### 4.3 Acil Durum Önceliği

Acil belirti yakalanırsa:

- AI analiz bekletilmez.
- Kullanıcı doğrudan acil durum ekranına gönderilir.
- Kullanıcı isterse kayıt geçmişe eklenebilir.
- Acil ekranda tedavi talimatı verilmez.

---

# 5. Ekran Detayları

## Ekran 01 — Splash

**Route:** `/auth/splash`

**Amaç:** Uygulamayı açmak, marka hissi vermek, giriş durumunu kontrol etmek.

**İçerik:**

- Logo
- Uygulama adı: `Pati Sağlık`
- Kısa açıklama: `Evcil dostunuzun sağlık geçmişini takip edin, değişimleri erken fark edin.`
- Görsel: kedi/köpek veya pati/kalp ikonlu sade grafik

**Butonlar:**

- `Başlayalım`
- `Giriş Yap`

**Tıklama Davranışı:**

- `Başlayalım` → `/auth/onboarding`
- `Giriş Yap` → `/auth/login`
- Kullanıcı oturum açmış ve pet kaydı varsa → otomatik `/home`
- Kullanıcı oturum açmış ama pet yoksa → `/pets/new`

---

## Ekran 02 — Onboarding

**Route:** `/auth/onboarding`

**Amaç:** Uygulamanın kullanım mantığını kısa anlatmak.

**Slaytlar:**

1. `Pet sağlık asistanınız` — `Evcil dostunuzun sağlık kayıtlarını tek yerde toplayın.`
2. `Şikayeti anlatın, uygulama yönlendirsin` — `Gözlemlediğiniz belirtiyi yazın; uygulama uygun soruları ve gerekli kayıtları seçsin.`
3. `Fotoğraf, video, ses ve ölçümler` — `Gerekli durumlarda fotoğraf, video, ses veya ölçüm görevleriyle kontrolü tamamlayın.`
4. `Veteriner öncesi düzenli rapor` — `Uygulama teşhis koymaz; veteriner görüşmesi için anlaşılır rapor hazırlar.`

**Butonlar:**

- `Devam Et`
- `Atla`

**Tıklama Davranışı:**

- `Devam Et` → sonraki slayt
- Son slaytta `Devam Et` → `/auth/register`
- `Atla` → `/auth/register`

---

## Ekran 03 — Giriş Yap

**Route:** `/auth/login`

**Amaç:** Kullanıcı girişi.

**Alanlar:**

- E-posta
- Şifre

**Butonlar:**

- `Giriş Yap`
- `Google ile Devam Et` opsiyonel
- `Şifremi Unuttum`
- `Hesabın yok mu? Kayıt Ol`

**Tıklama Davranışı:**

- `Giriş Yap` başarılı:
  - Pet varsa → `/home`
  - Pet yoksa → `/pets/new`
- `Kayıt Ol` → `/auth/register`
- `Şifremi Unuttum` → şifre sıfırlama modalı veya ekranı

---

## Ekran 04 — Kayıt Ol

**Route:** `/auth/register`

**Amaç:** Yeni kullanıcı oluşturmak.

**Alanlar:**

- Ad soyad
- E-posta
- Şifre
- Şifre tekrar
- Kullanım koşulları checkbox
- Gizlilik politikası checkbox

**Butonlar:**

- `Hesap Oluştur`
- `Google ile Devam Et` opsiyonel
- `Zaten hesabın var mı? Giriş Yap`

**Tıklama Davranışı:**

- `Hesap Oluştur` başarılı → `/pets/new`
- `Giriş Yap` → `/auth/login`

---

## Ekran 05 — Pet Ekle

**Route:** `/pets/new`

**Amaç:** Pet profilini oluşturmak.

**Alanlar:**

- Fotoğraf ekle / çek
- İsim
- Tür: Kedi / Köpek
- Cins
- Doğum tarihi veya yaş
- Cinsiyet: Erkek / Dişi
- Kısır mı: Evet / Hayır / Bilmiyorum
- Kilo
- Kronik hastalıklar
- Alerjiler
- Kullanılan ilaçlar
- Özel not

**Butonlar:**

- `Kaydet`
- `Daha Sonra Tamamla`

**Tıklama Davranışı:**

- `Kaydet` → `/pets/device-mode`
- `Daha Sonra Tamamla` → minimum pet kaydı oluşturup `/pets/device-mode`

---

## Ekran 06 — Cihaz Kullanım Seçimi

**Route:** `/pets/device-mode`

**Amaç:** Kullanıcının cihazsız mı Basic Kit ile mi kullanacağını belirlemek.

**Başlık:** `Kontrolleri nasıl yapacaksınız?`

**Açıklama:** `Bazı kontroller Basic Kit ile daha kapsamlı yapılabilir. Bu seçimi daha sonra ayarlardan değiştirebilirsiniz.`

**Seçenek Kartları:**

1. `Sadece telefonla kullanacağım` — `Fotoğraf, video, ses ve manuel ölçüm kayıtlarıyla başlayın.`
2. `Basic Kit kullanıyorum` — `Kulak kamerası, idrar stripi ve derece destekli kontroller açılır.`
3. `Daha sonra ekleyeceğim` — `Şimdilik cihazsız modda devam edin.`

**Tıklama Davranışı:**

- `Sadece Telefon` → `device_mode = phone_only`, sonra `/home`
- `Basic Kit’im Var` → `device_mode = basic_kit`, sonra `/profile/devices`
- `Daha sonra` → `device_mode = phone_only`, sonra `/home`

---

## Ekran 07 — Ana Sayfa

**Route:** `/home`

**Amaç:** Aktif pet özeti ve yeni muayene başlatma merkezi.

**Üst Alan:**

- `Merhaba`
- `Milo nasıl?`
- Sağ üst: Bildirim ikonu, pet/profil kısa ikonu

**Aktif Pet Kartı:**

- Pet fotoğrafı
- Pet adı
- Tür / cins / kilo
- Genel durum etiketi:
  - `Genel durum iyi görünüyor`
  - `Takip gereken kayıt var`
  - `Acil kayıt var`
- Son kontrol: `Son kontrol: 2 gün önce`

**Ana Aksiyon Kartı:**

- Başlık: `Yeni Sağlık Kontrolü`
- Açıklama: `Petinizde fark ettiğiniz belirtiyi anlatın; uygulama sizi doğru sorular ve kayıtlarla yönlendirsin.`
- Buton: `Kontrol Başlat`

**İkincil Hızlı İşlemler:**

Eski `Semptom / Fotoğraf / Video / Ses` ana kartları kaldırılacak veya ikincil hale getirilecek.

Yeni küçük hızlı işlem kartları:

- `Acil Durum`
- `Ölçüm Ekle`
- `Geçmişe Not Ekle`
- `Raporlar`

**Kayıtlarım Bölümü:**

1. `Sağlık Zaman Çizelgesi` — `Tüm sağlık kayıtlarını tarih sırasıyla gör.`
2. `Ölçümler` — `Kilo, ateş ve trendleri takip et.`
3. `Takip Edilen Sorunlar` — `Devam eden belirtileri düzenli izle.`
4. `Veteriner Raporları` — `Oluşturulan raporları görüntüle.`

**Tıklama Davranışı:**

- `Kontrol Başlat` → `/check/new/complaint`
- `Acil Durum` → `/check/new/red-flags?direct=true`
- `Ölçüm Ekle` → `/history/measurements/new`
- `Geçmişe Not Ekle` → not ekleme modalı
- `Raporlar` → `/reports`
- `Sağlık Zaman Çizelgesi` → `/history/timeline`
- `Ölçümler` → `/history/measurements`
- `Takip Edilen Sorunlar` → `/history/issues`
- `Veteriner Raporları` → `/reports`

---

## Ekran 08 — Kontrol Merkezi

**Route:** `/check`

**Amaç:** Yeni sağlık kontrolü başlatmak için merkez ekran.

**Başlık:** `Yeni Sağlık Kontrolü`

**Açıklama:** `Petinizle ilgili gözlemlediğiniz durumu anlatın. Uygulama uygun soruları ve gerekli kayıtları seçsin.`

**Ana Kart:**

- Başlık: `Milo’da ne fark ettiniz?`
- Açıklama: `Şikayeti yazın, sesle anlatın veya hızlı belirtilerden seçin.`
- Buton: `Kontrol Başlat`

**Yardımcı Kartlar:**

1. `Acil Durum`
2. `Ölçüm Ekle`
3. `Sadece Fotoğraf Ekle`
4. `Sadece Video Ekle`
5. `Sadece Ses Ekle`
6. `Basic Kit Kontrolleri` — sadece Basic Kit kullanıcısında aktif

**Önemli Kural:**

`Sadece Fotoğraf/Video/Ses Ekle` ana muayene yerine geçmez. Bu seçenekler hızlı kayıt oluşturur veya kullanıcıyı yine bir `health_check_session` içine yönlendirir.

**Tıklama Davranışı:**

- `Kontrol Başlat` → `/check/new/complaint`
- `Acil Durum` → `/check/new/red-flags?direct=true`
- `Ölçüm Ekle` → `/history/measurements/new`
- `Sadece Fotoğraf Ekle` → `/check/new/complaint?prefillTask=photo`
- `Sadece Video Ekle` → `/check/new/complaint?prefillTask=video`
- `Sadece Ses Ekle` → `/check/new/complaint?prefillTask=audio`
- `Basic Kit Kontrolleri` → `/profile/devices`

---

# 6. Yeni Akıllı Muayene Akışı

## Ekran 09 — Şikayet Girişi

**Route:** `/check/new/complaint`

**Amaç:** Kullanıcının pet ile ilgili gözlemini serbest metin, ses veya hızlı belirti chip’leri ile girmesi.

**Başlık:** `Milo’da ne fark ettiniz?`

**Açıklama:** `Belirtiyi kendi cümlelerinizle yazabilir veya hızlı seçimlerden işaretleyebilirsiniz.`

**Alanlar:**

### 1. Serbest Metin Alanı

Placeholder:

`Örn. İki gündür iştahsız, bugün bir kez kustu ve halsiz görünüyor.`

Kurallar:

- En az 5 karakter veya en az 1 chip seçili olmalı.
- Kullanıcı boş geçerse uyarı verilir.

### 2. Sesle Anlat

Buton: `Sesle Anlat`

Davranış:

- Mikrofon izni ister.
- Kullanıcı sesi kaydeder.
- Mümkünse speech-to-text ile metne çevirir.
- Ses kaydı ayrıca session içine medya olarak eklenebilir.

### 3. Hızlı Belirti Chip’leri

- İştahsız
- Kusma
- İshal
- Halsizlik
- Öksürük
- Hırıltı
- Topallama
- Kaşıntı
- Göz akıntısı
- Kulak kaşıma
- Ağız kokusu
- Çok su içme
- İdrar sorunu
- Dışkı değişimi
- Yara / şişlik
- Davranış değişimi

### 4. Süre Seçimi

Başlık: `Ne zamandır var?`

Seçenekler:

- Bugün başladı
- 1-2 gündür
- 3-7 gündür
- 1 haftadan uzun
- Emin değilim

### 5. Şiddet Seçimi

Başlık: `Size göre durum ne kadar ciddi?`

Seçenekler:

- Hafif
- Orta
- Ciddi
- Çok ciddi / acil gibi

**Butonlar:**

- `Devam Et`
- `Vazgeç`

**Tıklama Davranışı:**

- `Devam Et`:
  1. Yeni `health_check_session` oluşturur.
  2. Complaint bilgilerini kaydeder.
  3. Acil kelime ön filtresi çalıştırır.
  4. AI/sistem sınıflandırması için `/check/new/understanding` ekranına gider.
- `Vazgeç` → `/home` veya önceki ekrana döner.

**Arka Plan İşlemi:**

Aşağıdaki bilgiler classifier’a gönderilir:

- `complaint_text`
- `selected_chips`
- `duration`
- `user_severity`
- `pet_id`
- `device_mode`
- `recent_history_summary`

---

## Ekran 10 — Şikayet Ön Anlama / Sınıflandırma

**Route:** `/check/new/understanding`

**Amaç:** Sistemin şikayeti nasıl anladığını kullanıcıya göstermek ve yanlışsa düzeltme imkanı vermek.

**Başlık:** `Kontrol planı`

**Açıklama:** `Anladığımız kadarıyla şu konularla ilgili kısa bir kontrol yapacağız.`

**İçerik:**

### 1. Algılanan Kategoriler

Kart veya chip olarak gösterilir. Örnek:

- `İştah & Sindirim`
- `Genel Durum`
- `Kusma`
- `Ağız & Diş`

### 2. Öncelik Seviyesi

- `Normal kontrol`
- `Dikkat gerektiren kontrol`
- `Acil belirti kontrolü gerekli`

### 3. Planlanan Adımlar

1. `Acil belirti kontrolü`
2. `Kısa sorular`
3. `Önerilen kayıtlar`
4. `Kontrol özeti`
5. `Risk sonucu`

### 4. Düzeltme Linki

`Yanlış anlaşıldıysa düzelt`

Tıklanınca kategori seçim modalı açılır.

**Butonlar:**

- `Devam Et`
- `Şikayeti Düzenle`

**Tıklama Davranışı:**

- `Devam Et` → `/check/new/red-flags`
- `Şikayeti Düzenle` → `/check/new/complaint`

**Classifier Çıktı Formatı:**

```json
{
  "primary_categories": ["appetite_digestive", "general"],
  "secondary_categories": ["vomiting"],
  "red_flag_groups": ["poisoning", "severe_weakness", "dehydration"],
  "question_set_ids": ["digestive_basic", "vomiting_basic", "general_activity"],
  "suggested_tasks": ["vomit_photo_optional", "behavior_video_optional", "temperature_optional"],
  "basic_kit_tasks": [],
  "confidence": 0.82
}
```

**Kritik Kural:**

AI kategoriyi belirsiz bulursa kullanıcıdan kategori seçmesini ister.

---

## Ekran 11 — Acil Belirti Kontrolü

**Route:** `/check/new/red-flags`

**Amaç:** Acil belirtileri kısa ve net şekilde kontrol etmek.

**Başlık:** `Acil belirti kontrolü`

**Açıklama:** `Aşağıdaki belirtilerden biri varsa beklemeden veteriner desteği gerekebilir.`

**Soru Listesi:**

Sadece ilgili red flag gruplarından sorular gösterilir. Ancak bazı kritik sorular her kontrolde sorulabilir.

### Genel Kritik Sorular

- Nefes almakta zorlanıyor mu?
- Bayılma veya bilinç kaybı oldu mu?
- Nöbet geçirdi mi?
- Şiddetli kanama var mı?
- Zehirlenme ihtimali var mı?
- Hiç idrar yapamıyor mu?
- Trafik kazası / düşme / ciddi travma oldu mu?
- Diş etleri mor, mavi veya çok soluk görünüyor mu?

### Sindirim Özel

- Kusmukta kan var mı?
- Sürekli kusuyor ve su tutamıyor mu?
- Karın şişliği veya şiddetli ağrı var mı?

### Solunum Özel

- Dinlenirken hızlı ve zor nefes alıyor mu?
- Dili veya diş etleri morardı mı?
- Nefes alırken belirgin hırıltı / boğulma hissi var mı?

### İdrar Özel

- İdrar yapmak için zorlanıyor ama hiç yapamıyor mu?
- İdrarda kan var mı?
- Erkek kedide idrar yapamama şüphesi var mı?

**Cevap Tipi:**

Her soru:

- Evet
- Hayır
- Emin değilim

**Butonlar:**

- `Devam Et`
- `Geri`

**Tıklama Davranışı:**

- Herhangi bir yüksek acil cevap `Evet` ise → `/check/new/emergency`
- `Emin değilim` bazı kritik sorularda orta/yüksek risk olarak işaretlenir.
- Acil cevap yoksa → `/check/new/questions`

---

## Ekran 12 — Acil Durum

**Route:** `/check/new/emergency`

**Amaç:** Kullanıcıyı analiz bekletmeden acile yönlendirmek.

**Başlık:** `Acil veteriner değerlendirmesi gerekebilir`

**Ana Uyarı:** `Belirttiğiniz işaretler acil olabilir. Lütfen vakit kaybetmeden en yakın veteriner kliniğine başvurun.`

**İçerik:**

- Tespit edilen acil yanıtlar listesi
- Kısa açıklama
- Veteriner muayenesi uyarısı
- Tedavi talimatı vermeyen güvenli bilgilendirme

**Butonlar:**

- `En Yakın Kliniği Bul`
- `Acil Kaydı Geçmişe Ekle`
- `Veterinerle Paylaşılacak Özet Oluştur`
- `Ana Sayfaya Dön`

**Tıklama Davranışı:**

- `En Yakın Kliniği Bul` → harita/konum ekranı veya placeholder
- `Acil Kaydı Geçmişe Ekle` → session geçmişe kaydedilir
- `Veterinerle Paylaşılacak Özet Oluştur` → `/reports/new?sessionId=...`
- `Ana Sayfaya Dön` → `/home`

**Kritik Kural:**

Bu ekrandan normal AI değerlendirme yapılması zorunlu değildir. Ana amaç acil yönlendirmedir.

---

## Ekran 13 — Dinamik Soru Akışı

**Route:** `/check/new/questions`

**Amaç:** Sadece ilgili kategori ve şikayete uygun soruları sormak.

**Başlık:** Kategoriye göre değişir. Örnek:

- `İştah & Sindirim Soruları`
- `Kulak Soruları`
- `Topallama Soruları`
- `Solunum Soruları`
- veya genel: `Birkaç kısa soru`

**Üst Alan:**

- İlerleme göstergesi: `2 / 6`
- Kategori etiketi
- Geri butonu

**Soru Kaynağı:**

Sorular AI tarafından serbest üretilmez. Sistem, `question_library` içinden seçilmiş `question_set_ids` ile soruları getirir.

**Soru Tipleri:**

### Tek Seçim

Örnek: `Bugün kaç kez kustu?`

- Hiç
- 1 kez
- 2-3 kez
- 4+ kez
- Emin değilim

### Çoklu Seçim

Örnek: `Aşağıdakilerden hangileri var?`

- Halsizlik
- Su içmede azalma
- Dışkı değişimi
- Karın hassasiyeti
- Titreme

### Sayı Girişi

Örnek: `Son ölçülen ateş kaç °C?`

### Metin Notu

Örnek: `Eklemek istediğiniz başka bir gözlem var mı?`

**Alt Butonlar:**

- `Devam`
- `Geri`
- `Bilmiyorum / Atla`

**Tıklama Davranışı:**

- `Devam`: cevabı kaydeder, sonraki soruya geçer.
- `Geri`: önceki soruya döner.
- `Bilmiyorum / Atla`: soru `unknown/skipped` olarak kaydedilir.
- Son sorudan sonra → `/check/new/task-plan`

**Acil Yanıt Kuralı:**

Soru akışı sırasında acil cevap verilirse:

- Kullanıcı hemen acil ekrana yönlendirilir.
- Session’da `emergency_triggered = true` olarak saklanır.

---

## Ekran 14 — Görev Planı

**Route:** `/check/new/task-plan`

**Amaç:** Bu muayene için önerilen fotoğraf/video/ses/ölçüm görevlerini kullanıcıya göstermek.

**Başlık:** `Bu kontrol için önerilen kayıtlar`

**Açıklama:** `Aşağıdaki görevler sonucu ve veteriner raporunu daha anlaşılır hale getirir. Zorunlu olmayanları atlayabilirsiniz.`

**Görev Kartı Yapısı:**

Her kartta:

- Görev ikonu
- Görev adı
- Açıklama
- Zorunlu / Önerilir / Opsiyonel etiketi
- Durum: Bekliyor / Tamamlandı / Atlandı
- Sağ ok

**Görev Tipleri:**

- Fotoğraf
- Video
- Ses
- Ölçüm
- Basic Kit
- Not

**Örnek Görevler:**

### Sindirim Şikayeti

- `Kusmuk fotoğrafı ekle` — opsiyonel
- `Dışkı fotoğrafı ekle` — opsiyonel
- `Genel davranış videosu` — önerilir
- `Ateş ölçümü gir` — varsa
- `Son kilo bilgisini gir` — opsiyonel

### Topallama

- `Yandan yürüyüş videosu çek` — önerilir
- `Önden yürüyüş videosu çek` — opsiyonel
- `Pati/bacak fotoğrafı çek` — önerilir
- `Şişlik/yara yakın fotoğrafı ekle` — varsa

### Kulak

Cihazsız:

- `Kulak dışı fotoğraf çek` — önerilir

Basic Kit:

- `Kulak içi kamera görüntüsü al` — önerilir
- `Kulak dışı fotoğraf çek` — opsiyonel

### Solunum

- `Solunum videosu çek` — önerilir
- `Öksürük/hırıltı sesi kaydet` — önerilir
- `Dinlenme solunum sayısı gir` — opsiyonel

**Butonlar:**

- `Seçili Görevleri Tamamla`
- `Görevleri Atla ve Devam Et`
- `Görev Ekle`

**Tıklama Davranışı:**

- Görev kartına basınca ilgili görev ekranı açılır:
  - Fotoğraf → `/check/new/photo/:taskId/guide`
  - Video → `/check/new/video/:taskId/guide`
  - Ses → `/check/new/audio/:taskId/guide`
  - Ölçüm → `/check/new/measurement/:taskId`
  - Basic Kit → `/check/new/basic-kit/:taskId`
- `Seçili Görevleri Tamamla`: ilk bekleyen göreve gider.
- Tüm zorunlu/önerilen görevler tamamlanınca veya atlanınca → `/check/new/summary`
- `Görevleri Atla ve Devam Et`: opsiyonel görevleri atlar, `/check/new/summary`
- `Görev Ekle`: kullanıcı ek fotoğraf/video/ses/ölçüm ekleyebilir.

**Önemli Kural:**

Cihazsız kullanıcıya Basic Kit görevleri gösterilmez. Sadece küçük bir öneri kartı gösterilebilir:

`Basic Kit ile bu kontrol daha kapsamlı yapılabilir.`

---

# 7. Görev Ekranları

## Ekran 15 — Fotoğraf Görevi Rehberi

**Route:** `/check/new/photo/:taskId/guide`

**Amaç:** İlgili muayene görevi için doğru fotoğraf çekimini anlatmak.

**Başlık:** Göreve göre değişir:

- `Göz fotoğrafı çek`
- `Deri/yara fotoğrafı çek`
- `Kusmuk fotoğrafı ekle`
- `Dışkı fotoğrafı ekle`
- `Kulak dışı fotoğraf çek`
- `Ağız/diş fotoğrafı çek`

**İçerik:** Göreve göre dinamik rehber maddeleri gösterilir.

Örnek — Göz:

- Göz çevresi net görünsün.
- Doğal ışık kullanın.
- Flaşı doğrudan göze tutmayın.
- Pet huzursuzsa zorlamayın.

Örnek — Yara:

- Bölgeyi iyi ışıkta çekin.
- Mümkünse aynı açıdan çekmeye çalışın.
- Derin yara veya kanama varsa beklemeyin.

**Butonlar:**

- `Fotoğraf Çek`
- `Galeriden Seç`
- `Bu Görevi Atla`

**Tıklama Davranışı:**

- `Fotoğraf Çek` → `/check/new/photo/:taskId/capture`
- `Galeriden Seç` → dosya seçici, sonra `/check/new/photo/:taskId/preview`
- `Bu Görevi Atla` → görev `skipped`, sonra `/check/new/task-plan`

---

## Ekran 16 — Fotoğraf Çekim

**Route:** `/check/new/photo/:taskId/capture`

**Amaç:** Kamera ile fotoğraf almak.

**İçerik:**

- Kamera önizleme
- Kadraj rehberi
- Kısa çekim uyarıları
- Flaş aç/kapat
- Kamera değiştir

**Butonlar:**

- Çekim butonu
- Galeri butonu
- İptal

**Tıklama Davranışı:**

- Çekim butonu → fotoğraf alır, `/check/new/photo/:taskId/preview`
- Galeri → dosya seçici
- İptal → `/check/new/task-plan`

---

## Ekran 17 — Fotoğraf Önizleme

**Route:** `/check/new/photo/:taskId/preview`

**Amaç:** Fotoğrafın kullanılmasını onaylamak.

**İçerik:**

- Büyük fotoğraf önizleme
- Kalite uyarısı: `Fotoğraf net mi?`
- Opsiyonel not alanı: `Bu fotoğrafla ilgili not ekleyin`

**Butonlar:**

- `Kullan`
- `Tekrar Çek`
- `İptal`

**Tıklama Davranışı:**

- `Kullan`:
  - Fotoğraf session media listesine kaydedilir.
  - Görev `completed` olur.
  - Kullanıcı `/check/new/task-plan` ekranına döner.
- `Tekrar Çek` → `/check/new/photo/:taskId/capture`
- `İptal` → `/check/new/task-plan`

---

## Ekran 18 — Video Görevi Rehberi

**Route:** `/check/new/video/:taskId/guide`

**Amaç:** İlgili video görevini anlatmak.

**Başlık:** Göreve göre değişir:

- `Yürüyüş videosu çek`
- `Solunum videosu çek`
- `Genel davranış videosu çek`
- `Titreme/dengesizlik videosu çek`

**Rehber Maddeleri:**

Yürüyüş için:

- Düz zeminde çekin.
- Pet’i yandan görüntüleyin.
- Mümkünse kısa bir önden yürüyüş videosu da ekleyin.
- Pet’i zorlamayın.

Solunum için:

- Pet dinlenirken çekin.
- Göğüs hareketleri görünsün.
- Çok gürültülü ortamdan kaçının.
- Nefes almakta zorlanıyorsa kayıtla uğraşmayın, acile başvurun.

**Butonlar:**

- `Video Çek`
- `Galeriden Seç`
- `Bu Görevi Atla`

**Tıklama Davranışı:**

- `Video Çek` → `/check/new/video/:taskId/capture`
- `Galeriden Seç` → dosya seçici, sonra `/check/new/video/:taskId/preview`
- `Bu Görevi Atla` → `/check/new/task-plan`

---

## Ekran 19 — Video Çekim

**Route:** `/check/new/video/:taskId/capture`

**Amaç:** Video kaydı almak.

**İçerik:**

- Kamera önizleme
- Süre göstergesi
- Maksimum süre uyarısı: önerilen 10-30 saniye
- Başlat/durdur butonu

**Butonlar:**

- `Kaydı Başlat`
- `Kaydı Durdur`
- `İptal`

**Tıklama Davranışı:**

- `Kaydı Başlat` → video kaydı başlar.
- `Kaydı Durdur` → `/check/new/video/:taskId/preview`
- `İptal` → `/check/new/task-plan`

---

## Ekran 20 — Video Önizleme

**Route:** `/check/new/video/:taskId/preview`

**Amaç:** Videoyu onaylamak.

**İçerik:**

- Video oynatıcı
- Not alanı
- Kalite önerisi: `Pet net görünüyor mu?`

**Butonlar:**

- `Kullan`
- `Tekrar Çek`
- `İptal`

**Tıklama Davranışı:**

- `Kullan` → video session media listesine kaydedilir, görev tamamlanır, `/check/new/task-plan`
- `Tekrar Çek` → `/check/new/video/:taskId/capture`
- `İptal` → `/check/new/task-plan`

---

## Ekran 21 — Ses Görevi Rehberi

**Route:** `/check/new/audio/:taskId/guide`

**Amaç:** Öksürük, hırıltı, solunum sesi veya miyavlama/havlama değişimini kaydetmek.

**Başlık:** Göreve göre değişir:

- `Öksürük sesi kaydet`
- `Hırıltı / solunum sesi kaydet`
- `Ses değişimi kaydet`

**Rehber:**

- Sessiz ortamda kayıt alın.
- Telefonu pet’in ağzına çok yaklaştırmayın.
- Pet’i zorla öksürtmeye çalışmayın.
- Nefes almakta zorlanıyorsa kayıtla uğraşmayın, acil destek alın.

**Butonlar:**

- `Kayda Başla`
- `Bu Görevi Atla`

**Tıklama Davranışı:**

- `Kayda Başla` → `/check/new/audio/:taskId/record`
- `Bu Görevi Atla` → `/check/new/task-plan`

---

## Ekran 22 — Ses Kayıt

**Route:** `/check/new/audio/:taskId/record`

**Amaç:** Ses kaydı almak.

**İçerik:**

- Mikrofon animasyonu
- Süre göstergesi
- Ses seviyesi göstergesi
- Kayıt notu

**Butonlar:**

- `Kaydı Başlat`
- `Kaydı Durdur`
- `İptal`

**Tıklama Davranışı:**

- `Kaydı Başlat` → kayıt başlar.
- `Kaydı Durdur` → `/check/new/audio/:taskId/preview`
- `İptal` → `/check/new/task-plan`

---

## Ekran 23 — Ses Önizleme

**Route:** `/check/new/audio/:taskId/preview`

**Amaç:** Ses kaydını dinlemek ve onaylamak.

**İçerik:**

- Ses oynatıcı
- Not alanı
- Süre bilgisi

**Butonlar:**

- `Kullan`
- `Tekrar Kaydet`
- `İptal`

**Tıklama Davranışı:**

- `Kullan` → ses kaydı session media listesine eklenir, görev tamamlanır, `/check/new/task-plan`
- `Tekrar Kaydet` → `/check/new/audio/:taskId/record`
- `İptal` → `/check/new/task-plan`

---

## Ekran 24 — Ölçüm Görevi

**Route:** `/check/new/measurement/:taskId`

**Amaç:** Bu muayene oturumu için ilgili ölçümü almak.

**Başlık:** Göreve göre değişir:

- `Ateş ölçümü gir`
- `Kilo bilgisi gir`
- `Solunum sayısı gir`
- `Su tüketimi notu`
- `İdrar / dışkı gözlemi`

**Alanlar:**

### Ateş

- Değer: °C
- Ölçüm yöntemi: Rektal / Kulaktan / Temassız / Bilmiyorum
- Ölçüm zamanı
- Not

### Kilo

- Değer: kg
- Ölçüm tarihi
- Not

### Solunum Sayısı

- Dinlenirken 1 dakikadaki nefes sayısı
- Ölçüm zamanı
- Not

### Genel Gözlem

- Serbest not
- Şiddet seçimi
- Süre seçimi

**Butonlar:**

- `Kaydet`
- `Atla`
- `İptal`

**Tıklama Davranışı:**

- `Kaydet` → ölçüm session’a eklenir, görev tamamlanır, `/check/new/task-plan`
- `Atla` → görev skipped, `/check/new/task-plan`
- `İptal` → `/check/new/task-plan`

---

## Ekran 25 — Basic Kit Görevi

**Route:** `/check/new/basic-kit/:taskId`

**Amaç:** Basic Kit ile yapılan görevleri muayene oturumuna eklemek.

**Görev Tipleri:**

- Kulak içi kamera
- İdrar strip okuma
- Yakın cilt/yara görüntüsü
- Dijital derece kaydı

**Cihazsız Kullanıcı Davranışı:**

Eğer kullanıcı `device_mode = phone_only` ise bu ekran açılmamalı. Yanlışlıkla açılırsa:

- Başlık: `Bu görev Basic Kit gerektirir`
- Butonlar:
  - `Basic Kit hakkında bilgi al`
  - `Bu görevi atla`

**Basic Kit Kullanıcısı İçerik:**

### Kulak İçi Kamera

- Güvenli kullanım uyarısı
- Kamera bağlantı durumu
- `Kamerayı Aç`
- `Bu Görevi Atla`

### İdrar Strip

- Strip kullanma adımları
- Bekleme süresi bilgisi
- Renk kartı uyarısı
- `Strip Fotoğrafı Çek`
- `Bu Görevi Atla`

### Yakın Cilt

- Makro/mini kamera rehberi
- `Fotoğraf Çek`
- `Öncekiyle Karşılaştır`

**Tıklama Davranışı:**

- İlgili görev medya/ölçüm olarak session’a eklenir.
- Görev tamamlanınca `/check/new/task-plan`.

---

## Ekran 26 — Kontrol Özeti

**Route:** `/check/new/summary`

**Amaç:** AI değerlendirme öncesi kullanıcının tüm muayene verilerini görmesi.

**Başlık:** `Kontrol Özeti`

**Bölümler:**

### 1. Şikayet

- Kullanıcının yazdığı metin
- Seçilen chip’ler
- Süre
- Kullanıcı şiddet algısı

### 2. Anlaşılan Kategoriler

- Ana kategori
- Yan kategoriler
- Kullanıcı düzeltme yaptıysa son hali

### 3. Acil Belirti Yanıtları

- Yanıtlanan kritik sorular
- Acil tetiklenmediyse: `Acil belirti bildirimi yok`

### 4. Soru Cevapları

- Dinamik sorular ve yanıtlar

### 5. Eklenen Kayıtlar

- Fotoğraf sayısı
- Video sayısı
- Ses kaydı sayısı
- Ölçüm sayısı
- Basic Kit kaydı var/yok

### 6. Geçmiş Bağlantıları

Sistem geçmişten alakalı kayıt bulduysa:

- `Benzer kulak şikayeti 2 ay önce kaydedilmiş`
- `Son kilo ölçümüne göre değişim var`
- `Aynı bölgede önceki yara kaydı var`

**Butonlar:**

- `Değerlendir`
- `Eksik Görevleri Tamamla`
- `Düzenle`
- `Kaydet ve Sonra Devam Et`
- `İptal`

**Tıklama Davranışı:**

- `Değerlendir` → `/check/new/processing`
- `Eksik Görevleri Tamamla` → `/check/new/task-plan`
- `Düzenle` → ilgili bölüme döndürür
- `Kaydet ve Sonra Devam Et` → session draft olarak saklanır, `/home`
- `İptal` → onay modalı

---

## Ekran 27 — Değerlendirme / Processing

**Route:** `/check/new/processing`

**Amaç:** AI değerlendirme sürecini göstermek.

**Başlık:** `Kontrol değerlendiriliyor`

**Açıklama:** `Şikayet, cevaplar, eklenen kayıtlar ve pet geçmişi birlikte değerlendiriliyor.`

**Durum Adımları:**

- Şikayet özeti hazırlanıyor
- Cevaplar kontrol ediliyor
- Medya kayıtları inceleniyor
- Pet geçmişiyle karşılaştırılıyor
- Risk sonucu oluşturuluyor
- Rapor taslağı hazırlanıyor

**Güvenli Uyarı:**

`Bu değerlendirme veteriner muayenesinin yerine geçmez.`

**Davranış:**

- Başarılı → `/check/new/result`
- Hata → hata modalı:
  - `Değerlendirme tamamlanamadı`
  - Butonlar:
    - `Tekrar Dene`
    - `Taslak Olarak Kaydet`

---

## Ekran 28 — Sonuç / Risk Skoru

**Route:** `/check/new/result`

**Amaç:** Muayene sonucunu güvenli şekilde göstermek.

**Başlık:** `Sonuç`

**Risk Kartı:**

### Düşük Risk

- Başlık: `Düşük Risk`
- Renk: yeşil
- Açıklama: `Belirtileri takip edin. Değişim olursa yeni kontrol oluşturun.`

### Orta Risk

- Başlık: `Orta Risk`
- Renk: sarı/turuncu
- Açıklama: `Veteriner randevusu planlamanız önerilir.`

### Yüksek Risk

- Başlık: `Yüksek Risk`
- Renk: kırmızımsı
- Açıklama: `Kısa sürede veteriner değerlendirmesi önerilir.`

### Acil Risk

- Başlık: `Acil Risk`
- Renk: kırmızı
- Açıklama: `Beklemeden veteriner kliniğine başvurun.`

**Bölümler:**

### 1. Belirti Özeti

- Kullanıcı şikayeti kısa özetlenir.
- Seçilen kategoriler gösterilir.

### 2. Değerlendirme

Güvenli dilde madde madde açıklama:

- `İştahsızlık ve kusma birlikte takip edilmesi gereken belirtilerdir.`
- `Eklenen video genel davranışın değerlendirilmesine yardımcı olur.`
- `Bu sonuç teşhis değildir.`

### 3. Geçmişe Göre Değişim

- Benzer önceki kayıtlar
- Kilo/ateş trendi
- Tekrarlayan şikayetler
- Önceki medya karşılaştırmaları

### 4. Önerilen Sonraki Adım

- `Takip et`
- `24-48 saat içinde tekrar kontrol`
- `Veteriner randevusu al`
- `Acil veteriner`

### 5. Rapor Durumu

- `Rapor taslağı hazır`

**Butonlar:**

- `Geçmişe Kaydet`
- `Veteriner Raporu Oluştur`
- `Veterinerle Paylaş`
- `Takip Sorunu Olarak Kaydet`
- `Yeni Kontrol Başlat`
- `Ana Sayfaya Dön`

**Tıklama Davranışı:**

- `Geçmişe Kaydet`:
  - session status `completed`
  - timeline kaydı oluşturur
- `Veteriner Raporu Oluştur` → `/reports/new?sessionId=...`
- `Veterinerle Paylaş` → paylaşım ekranı / PDF link
- `Takip Sorunu Olarak Kaydet` → `/history/issues/new?sessionId=...`
- `Yeni Kontrol Başlat` → `/check/new/complaint`
- `Ana Sayfaya Dön` → `/home`

---

# 8. Sağlık Geçmişi Ekranları

## Ekran 29 — Geçmiş Ana Sayfa

**Route:** `/history`

**Amaç:** Sağlık geçmişi bölümlerini göstermek.

**Kartlar:**

1. `Sağlık Zaman Çizelgesi`
2. `Ölçümler`
3. `Takip Edilen Sorunlar`
4. `Aşılar & İlaçlar`
5. `Veteriner Ziyaretleri`

**Tıklama Davranışı:**

- İlgili route’a gider.

---

## Ekran 30 — Sağlık Zaman Çizelgesi

**Route:** `/history/timeline`

**Amaç:** Tüm sağlık kayıtlarını kronolojik listelemek.

**Üst Alan:**

- Başlık: `Sağlık Zaman Çizelgesi`
- Pet filtresi
- Tarih filtresi
- Kayıt türü filtresi

**Filtre Sekmeleri:**

- Tümü
- Kontroller
- Ölçümler
- Notlar
- Raporlar
- Veteriner

**Kayıt Kartı İçeriği:**

- Tarih/saat
- Kayıt türü ikonu
- Başlık
- Risk etiketi
- Kısa özet
- Medya küçük önizleme
- Sağ ok

**Sağ Alt Buton:** `+`

**`+` Menü:**

- Yeni Sağlık Kontrolü
- Ölçüm Ekle
- Not Ekle
- Veteriner Ziyareti Ekle
- Belge/Fotoğraf Ekle

**Tıklama Davranışı:**

- Kayıt kartı → `/history/session/:sessionId`
- `Yeni Sağlık Kontrolü` → `/check/new/complaint`
- `Ölçüm Ekle` → `/history/measurements/new`

---

## Ekran 31 — Muayene Kaydı Detayı

**Route:** `/history/session/:sessionId`

**Amaç:** Tamamlanmış muayene oturumunun detayını göstermek.

**Bölümler:**

- Pet bilgisi
- Şikayet
- Kategoriler
- Acil belirti cevapları
- Soru cevapları
- Medya kayıtları
- Ölçümler
- Risk sonucu
- AI değerlendirme özeti
- Geçmiş karşılaştırması
- Rapor bağlantısı
- Notlar

**Butonlar:**

- `Raporu Görüntüle`
- `Tekrar Kontrol Et`
- `Takip Sorununa Bağla`
- `Paylaş`
- `Düzenle`
- `Sil`

**Tıklama Davranışı:**

- `Raporu Görüntüle` → `/reports/:reportId`
- `Tekrar Kontrol Et` → `/check/new/complaint?repeatFrom=sessionId`
- `Takip Sorununa Bağla` → issue seçme veya oluşturma modalı
- `Paylaş` → sistem paylaşım
- `Düzenle` → sınırlı düzenleme
- `Sil` → onay modalı

---

## Ekran 32 — Ölçümler

**Route:** `/history/measurements`

**Amaç:** Kilo, ateş, solunum sayısı, idrar strip gibi ölçümleri göstermek.

**Sekmeler:**

- Kilo
- Ateş
- Solunum
- İdrar
- Diğer

**İçerik:**

- Son ölçüm değeri
- Grafik
- 7 gün / 30 gün / 90 gün / 1 yıl filtresi
- En düşük / en yüksek / ortalama
- Değişim uyarısı

**Butonlar:**

- `Yeni Ölçüm Ekle`
- `Rapora Ekle`

**Tıklama Davranışı:**

- `Yeni Ölçüm Ekle` → `/history/measurements/new`
- `Rapora Ekle` → rapor taslağına ekler

---

## Ekran 33 — Ölçüm Ekle

**Route:** `/history/measurements/new`

**Amaç:** Muayene dışında ölçüm eklemek.

**Ölçüm Tipleri:**

- Kilo
- Ateş
- Solunum sayısı
- İdrar strip
- İştah notu
- Su tüketimi
- Dışkı notu
- Aktivite notu

**Alanlar:** Ölçüm tipine göre dinamik.

**Butonlar:**

- `Kaydet`
- `İptal`

**Tıklama Davranışı:**

- `Kaydet`:
  - ölçüm kaydı oluşturur
  - timeline’a ekler
  - riskli değer varsa uyarı modalı gösterir
- `İptal` → önceki ekran

---

## Ekran 34 — Takip Edilen Sorunlar

**Route:** `/history/issues`

**Amaç:** Devam eden belirtileri/rahatsızlıkları dosya gibi takip etmek.

**Liste Kartı İçeriği:**

- Sorun adı
- Kategori
- Başlangıç tarihi
- Son güncelleme
- Durum: Yeni / Takipte / İyileşiyor / Kötüleşiyor / Kapandı
- Risk etiketi

**Butonlar:**

- `Yeni Sorun Ekle`

**Tıklama Davranışı:**

- Kart → `/history/issues/:issueId`
- `Yeni Sorun Ekle` → `/history/issues/new`

---

## Ekran 35 — Takip Sorunu Detayı

**Route:** `/history/issues/:issueId`

**Amaç:** Belirli sorunun tüm geçmişini göstermek.

**Bölümler:**

- Sorun özeti
- Durum
- İlgili muayene kayıtları
- Medya karşılaştırmaları
- Ölçüm trendleri
- Kullanıcı notları
- Veteriner notları

**Butonlar:**

- `Yeni Kontrol Ekle`
- `Fotoğraf Karşılaştır`
- `Rapor Oluştur`
- `Durumu Güncelle`
- `Sorunu Kapat`

**Tıklama Davranışı:**

- `Yeni Kontrol Ekle` → `/check/new/complaint?issueId=...`
- `Fotoğraf Karşılaştır` → medya karşılaştırma ekranı
- `Rapor Oluştur` → `/reports/new?issueId=...`
- `Sorunu Kapat` → durum `closed`

---

## Ekran 36 — Takip Sorunu Ekle

**Route:** `/history/issues/new`

**Amaç:** Yeni takip sorunu oluşturmak.

**Alanlar:**

- Sorun adı
- Kategori
- İlk fark edilen tarih
- Açıklama
- İlgili muayene kaydı seçimi
- Fotoğraf/video/ses ekle
- Takip sıklığı
- Not

**Butonlar:**

- `Kaydet`
- `İptal`

**Tıklama Davranışı:**

- `Kaydet` → `/history/issues/:issueId`
- `İptal` → `/history/issues`

---

# 9. Rapor Ekranları

## Ekran 37 — Raporlar Listesi

**Route:** `/reports`

**Amaç:** Oluşturulmuş veteriner raporlarını listelemek.

**Üst Alan:**

- Başlık: `Raporlar`
- Pet filtresi
- Risk filtresi
- Tarih filtresi

**Rapor Kartı:**

- Rapor tarihi
- Pet adı
- Rapor türü
- Risk seviyesi
- Kısa özet
- PDF durumu
- Paylaşım durumu

**Buton:** `Yeni Rapor Oluştur`

**Tıklama Davranışı:**

- Rapor kartı → `/reports/:reportId`
- `Yeni Rapor Oluştur` → `/reports/new`

---

## Ekran 38 — Rapor Oluştur

**Route:** `/reports/new`

**Amaç:** Session, issue veya tarih aralığından rapor oluşturmak.

**Rapor Kaynağı Seçimi:**

- Son muayene sonucu
- Takip edilen sorun
- Tarih aralığı
- Manuel seçim

**Dahil Edilecek Bölümler:**

- Pet profili
- Şikayet özeti
- Soru cevapları
- Risk sonucu
- Medya kayıtları
- Ölçümler
- Takip edilen sorunlar
- Kullanıcı notları
- Veteriner notları
- Geçmiş karşılaştırması

**Butonlar:**

- `Önizle`
- `İptal`

**Tıklama Davranışı:**

- `Önizle` → `/reports/:reportId?preview=true`
- `İptal` → `/reports`

---

## Ekran 39 — Rapor Detayı / Önizleme

**Route:** `/reports/:reportId`

**Amaç:** Veterinerle paylaşılabilir raporu göstermek.

**Bölümler:**

- Pet bilgisi
- Rapor tarihi
- Rapor özeti
- Şikayet
- Bulgular
- Ölçümler
- Medya listesi
- Risk sonucu
- Geçmiş kayıtlar
- Takip önerileri
- Güvenli uyarı

**Butonlar:**

- `PDF Olarak İndir`
- `Paylaş`
- `Veterinere Gönder`
- `Düzenle`
- `Sil`

**Tıklama Davranışı:**

- `PDF Olarak İndir` → PDF oluşturur
- `Paylaş` → sistem paylaşım
- `Veterinere Gönder` → e-posta/link paylaşımı
- `Düzenle` → rapor bölüm seçimi
- `Sil` → onay modalı

---

# 10. Profil ve Ayarlar

## Ekran 40 — Profil

**Route:** `/profile`

**Amaç:** Kullanıcı ve uygulama ayarları.

**Kullanıcı Kartı:**

- Ad soyad
- E-posta
- Profil fotoğrafı
- `Profili Düzenle`

**Menü:**

1. `Pet Profilleri`
2. `Bildirimler`
3. `Cihaz Kitim`
4. `Yedekle & Senkronize`
5. `Dil`
6. `Gizlilik & Veri İzinleri`
7. `Yardım & Destek`
8. `Hakkında`

**Alt Buton:** `Çıkış Yap`

**Tıklama Davranışı:**

- `Pet Profilleri` → `/pets/select`
- `Bildirimler` → `/profile/notifications`
- `Cihaz Kitim` → `/profile/devices`
- `Dil` → `/profile/language`
- `Gizlilik & Veri İzinleri` → `/profile/privacy`
- `Çıkış Yap` → onay modalı

---

## Ekran 41 — Pet Profilleri

**Route:** `/pets/select`

**Amaç:** Birden fazla pet yönetmek.

**Liste Kartı:**

- Pet fotoğrafı
- İsim
- Tür/cins
- Son kontrol
- Genel durum
- Aktif pet işareti

**Buton:** `Yeni Pet Ekle`

**Tıklama Davranışı:**

- Pet kartı → aktif pet değişir, `/home`
- `Yeni Pet Ekle` → `/pets/new`

---

## Ekran 42 — Cihaz Kitim

**Route:** `/profile/devices`

**Amaç:** Basic Kit durumunu ve cihazlı testleri yönetmek.

**Durum Kartı:**

- `Cihaz modu: Sadece telefon`
- veya `Basic Kit aktif`

**Basic Kit Tanıtım:**

- Kulak kamerası
- İdrar strip okuma
- Dijital derece
- Yakın cilt görüntüsü

**Butonlar:**

- `Basic Kit’i Aktifleştir`
- `Sadece Telefon Moduna Geç`
- `Kit Hakkında`
- `Test Bağlantısı`

**Tıklama Davranışı:**

- `Basic Kit’i Aktifleştir` → device_mode = basic_kit
- `Sadece Telefon Moduna Geç` → device_mode = phone_only
- `Test Bağlantısı` → cihaz bağlantı kontrolü

---

## Ekran 43 — Gizlilik & Veri İzinleri

**Route:** `/profile/privacy`

**Amaç:** Sağlık ve medya verisi izinlerini yönetmek.

**Bölümler:**

1. Sağlık kayıtları saklama izni
2. Medya dosyaları saklama izni
3. AI değerlendirme izni
4. Anonim ürün geliştirme izni
5. Verilerimi dışa aktar
6. Verilerimi sil
7. Hesabımı sil

**Kritik Kural:**

Anonim ürün geliştirme izni varsayılan kapalı olmalıdır.

**Butonlar:**

- `Ayarları Kaydet`
- `Verilerimi İndir`
- `Hesabımı ve Verilerimi Sil`

---

# 11. Soru Kütüphanesi Mantığı

AI serbest soru üretmeyecek. Aşağıdaki gibi kütüphane mantığı kurulacak.

## 11.1 Soru Seti Yapısı

```json
{
  "question_set_id": "vomiting_basic",
  "category": "appetite_digestive",
  "questions": [
    {
      "id": "vomiting_count_24h",
      "type": "single_choice",
      "text_key": "questions.vomiting.count24h",
      "options": [
        {"value": "none", "label_key": "common.none"},
        {"value": "once", "label_key": "questions.options.once"},
        {"value": "two_three", "label_key": "questions.options.twoThree"},
        {"value": "four_plus", "label_key": "questions.options.fourPlus"},
        {"value": "unknown", "label_key": "common.unknown"}
      ],
      "red_flag_values": ["four_plus"]
    }
  ]
}
```

## 11.2 Ana Kategoriler

- `general`
- `appetite_digestive`
- `respiratory_cough`
- `skin_fur`
- `eye`
- `ear`
- `mouth_dental`
- `urine_stool`
- `movement_gait`
- `behavior`
- `other`

## 11.3 Örnek Soru Setleri

### Genel Durum

- Ne zamandır halsiz?
- Normalden daha az hareket ediyor mu?
- İştahında değişiklik var mı?
- Su içmesinde değişiklik var mı?
- Ateş ölçtünüz mü?

### İştah & Sindirim

- Ne zamandır iştahsız?
- Bugün kaç kez kustu?
- Kusmukta kan var mı?
- İshal var mı?
- Dışkıda kan veya siyahlık var mı?
- Yabancı cisim yeme ihtimali var mı?

### Solunum & Öksürük

- Ne zamandır öksürüyor?
- Dinlenirken zor nefes alıyor mu?
- Hırıltı var mı?
- Dili/diş eti morarma var mı?
- Öksürük nöbet halinde mi geliyor?

### Hareket & Yürüyüş

- Ne zamandır topallıyor?
- Hangi bacak?
- Hiç basamıyor mu?
- Travma oldu mu?
- Şişlik/yara var mı?
- Dokununca tepki veriyor mu?

### Kulak

- Hangi kulak?
- Kaşıma var mı?
- Baş sallama var mı?
- Kötü koku var mı?
- Akıntı var mı?
- Dokununca acı hissediyor mu?

### Göz

- Hangi göz?
- Akıntı var mı?
- Kızarıklık var mı?
- Gözünü kısıyor mu?
- Şişlik var mı?
- Travma ihtimali var mı?

---

# 12. Görev Seçme Kuralları

## 12.1 Kategoriye Göre Görevler

### İştah & Sindirim

- Kusmuk fotoğrafı — opsiyonel
- Dışkı fotoğrafı — opsiyonel
- Genel davranış videosu — önerilir
- Ateş ölçümü — opsiyonel
- Kilo ölçümü — opsiyonel

### Solunum & Öksürük

- Solunum videosu — önerilir
- Öksürük/hırıltı sesi — önerilir
- Dinlenme solunum sayısı — opsiyonel
- Acil belirti kontrolü — zorunlu

### Hareket & Yürüyüş

- Yandan yürüyüş videosu — önerilir
- Önden yürüyüş videosu — opsiyonel
- Pati/bacak fotoğrafı — önerilir
- Yakın yara/şişlik fotoğrafı — varsa

### Göz

- Göz fotoğrafı — önerilir
- İki göz karşılaştırma fotoğrafı — opsiyonel
- Davranış notu — opsiyonel

### Kulak

Cihazsız:

- Kulak dışı fotoğraf — önerilir

Basic Kit:

- Kulak içi kamera — önerilir
- Kulak dışı fotoğraf — opsiyonel

### Deri & Tüy

- Deri/yara fotoğrafı — önerilir
- Yakın fotoğraf — opsiyonel
- Önceki fotoğrafla karşılaştırma — geçmiş varsa önerilir

### İdrar & Dışkı

- Dışkı fotoğrafı — opsiyonel
- İdrar gözlem notu — önerilir
- Basic Kit varsa idrar strip — önerilir
- Acil idrar yapamama kontrolü — zorunlu

---

# 13. Merkezi Veri Modeli

Mevcut veri yapısı korunabilir ancak yeni akış için aşağıdaki merkezi yapı oluşturulmalıdır.

## 13.1 `health_check_sessions`

```sql
CREATE TABLE health_check_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pet_id TEXT NOT NULL,
  status TEXT NOT NULL, -- draft, active, completed, emergency, cancelled
  complaint_text TEXT,
  selected_chips_json TEXT,
  duration_key TEXT,
  user_severity TEXT,
  device_mode TEXT,
  primary_categories_json TEXT,
  secondary_categories_json TEXT,
  classifier_confidence REAL,
  risk_level TEXT,
  risk_score INTEGER,
  result_summary TEXT,
  result_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
```

## 13.2 `health_check_answers`

```sql
CREATE TABLE health_check_answers (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_set_id TEXT,
  answer_value TEXT,
  answer_json TEXT,
  is_red_flag INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
```

## 13.3 `health_check_tasks`

```sql
CREATE TABLE health_check_tasks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  task_type TEXT NOT NULL, -- photo, video, audio, measurement, basic_kit, note
  task_key TEXT NOT NULL,
  title_key TEXT NOT NULL,
  description_key TEXT,
  priority TEXT NOT NULL, -- required, recommended, optional
  status TEXT NOT NULL, -- pending, completed, skipped
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## 13.4 `health_check_media`

```sql
CREATE TABLE health_check_media (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  task_id TEXT,
  media_type TEXT NOT NULL, -- photo, video, audio
  local_uri TEXT,
  remote_url TEXT,
  thumbnail_url TEXT,
  note TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
```

## 13.5 `health_check_measurements`

```sql
CREATE TABLE health_check_measurements (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  pet_id TEXT NOT NULL,
  measurement_type TEXT NOT NULL, -- weight, temperature, respiratory_rate, urine_strip, other
  value REAL,
  unit TEXT,
  value_json TEXT,
  note TEXT,
  measured_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

## 13.6 `health_check_reports`

```sql
CREATE TABLE health_check_reports (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  pet_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  report_json TEXT,
  pdf_url TEXT,
  created_at TEXT NOT NULL
);
```

---

# 14. AI / Classifier Görevleri

## 14.1 İlk Classifier

**Girdi:**

- Pet türü
- Yaş
- Kilo
- Kronik hastalıklar
- Complaint text
- Chip’ler
- Süre
- Kullanıcı şiddet algısı
- Device mode
- Son sağlık geçmişi özeti

**Çıktı:**

- Ana kategoriler
- Yan kategoriler
- Red flag grupları
- Soru setleri
- Medya/ölçüm görevleri
- Basic Kit görevleri
- Güven skoru

## 14.2 Son Değerlendirme

**Girdi:**

- Şikayet
- Soru cevapları
- Acil belirti cevapları
- Medya analiz özetleri
- Ölçümler
- Geçmiş karşılaştırmaları

**Çıktı:**

```json
{
  "risk_level": "medium",
  "risk_score": 65,
  "summary": "İştahsızlık ve kusma nedeniyle takip ve veteriner randevusu önerilir.",
  "observations": [
    "Son 24 saatte kusma bildirildi.",
    "İştah azalması var.",
    "Acil belirti yanıtlarında yüksek risk tetiklenmedi."
  ],
  "history_comparison": [
    "Benzer sindirim şikayeti için geçmiş kayıt bulunamadı."
  ],
  "recommendations": [
    "Belirtiler devam ederse veteriner randevusu alın.",
    "Kusma artarsa veya kan görülürse beklemeyin."
  ],
  "next_action": "vet_appointment",
  "disclaimer": "Bu değerlendirme veteriner muayenesinin yerine geçmez."
}
```

---

# 15. Mevcut Proje Üzerinde Refactor Planı

## 15.1 Korunacaklar

- Auth
- Pet profili
- Alt tab navigation
- Tema ve genel kart yapısı
- i18n altyapısı
- Medya seçme/yükleme altyapısı
- Sağlık geçmişi ekranlarının temel mantığı
- Rapor ekranlarının temel mantığı
- Basic Kit ayar fikri

## 15.2 Değiştirilecekler

- Ana sayfadaki `Semptom / Fotoğraf / Video / Ses` 4’lü hızlı kontrol kartları ana akış olmaktan çıkarılacak.
- `Yeni Sağlık Kontrolü Başlat` ana aksiyon yapılacak.
- Fotoğraf/video/ses ekranları muayene görevi ekranlarına dönüştürülecek.
- Semptom kategori ekranı ana başlangıç olmayacak; şikayet anlama sonrası destek ekranı olacak.
- Soru akışı dinamik soru kütüphanesine bağlanacak.
- Kontrol sonucu merkezi `health_check_session` kaydına bağlanacak.

## 15.3 Silinmeyecek Ama Pasifleştirilecekler

Mevcut ekranlar varsa tamamen silinmeden önce yeni akışta kullanılabilir component’e dönüştürülsün:

- Fotoğraf çekim rehberi → `PhotoTaskGuide`
- Fotoğraf önizleme → `PhotoTaskPreview`
- Video kontrol → `VideoTaskGuide`
- Ses kontrol → `AudioTaskGuide`
- Semptom soruları → `DynamicQuestionFlow`

---

# 16. Kabul Kriterleri

## 16.1 Ana Akış

- Kullanıcı ana sayfadan tek butonla yeni sağlık kontrolü başlatabiliyor.
- Kullanıcı şikayetini yazabiliyor.
- Chip seçebiliyor.
- Sistem kategorileri belirleyip kullanıcıya kontrol planı gösteriyor.
- Acil belirti kontrolü çalışıyor.
- Sadece ilgili sorular geliyor.
- Görev planı kategoriye göre oluşuyor.
- Fotoğraf/video/ses/ölçüm görevleri tek session içinde toplanıyor.
- Kontrol özeti oluşuyor.
- Sonuç ekranı risk seviyesiyle geliyor.
- Geçmişe kayıt çalışıyor.
- Rapor oluşturma çalışıyor.

## 16.2 Cihazlı / Cihazsız

- Cihazsız kullanıcıya Basic Kit görevleri zorunlu gösterilmiyor.
- Basic Kit kullanıcısında kulak içi, idrar strip, yakın görüntü görevleri açılabiliyor.
- Cihaz modu profilden değiştirilebiliyor.

## 16.3 Güvenlik

- Acil belirtilerde kullanıcı normal akışta bekletilmiyor.
- Teşhis dili kullanılmıyor.
- Her sonuçta veteriner muayenesi uyarısı var.
- “Veterinere gitmenize gerek yok” gibi ifadeler yok.

## 16.4 Veri

- Her muayene bir `health_check_session` olarak kaydoluyor.
- Cevaplar, görevler, medya ve ölçümler session’a bağlı.
- Timeline’da tamamlanan session görünüyor.
- Rapor session’dan üretilebiliyor.

## 16.5 UI

- Tüm metinler i18n’den geliyor.
- Mobil ekranlarda taşma yok.
- Butonlar tutarlı.
- Geri navigasyon doğru.
- Boş durum ekranları var.
- Hata/izin modal’ları var.

---

# 17. Ajan İçin Uygulama Sırası

1. Yeni route haritasını oluştur.
2. Mevcut ana sayfa hızlı kontrol bölümünü değiştir.
3. `Yeni Sağlık Kontrolü Başlat` ana aksiyonunu ekle.
4. `health_check_session` veri modelini ekle.
5. Şikayet girişi ekranını oluştur.
6. Basit classifier mock fonksiyonunu yaz.
7. Ön anlama/kontrol planı ekranını oluştur.
8. Acil belirti ekranını oluştur.
9. Soru kütüphanesi yapısını kur.
10. Dinamik soru akışını oluştur.
11. Görev planı ekranını oluştur.
12. Mevcut fotoğraf/video/ses ekranlarını task component olarak uyarlayın.
13. Ölçüm görevi ekranını ekle.
14. Basic Kit görev ekranını ekle.
15. Kontrol özeti ekranını oluştur.
16. Processing ekranını oluştur.
17. Sonuç/risk ekranını session’a bağla.
18. Geçmişe kaydetmeyi tamamla.
19. Rapor oluşturma bağlantısını kur.
20. Eski bağımsız modül girişlerini ana akıştan kaldır veya ikincil yap.
21. Tüm metinleri i18n’e taşı.
22. Mock data ile uçtan uca test yap.

---

# 18. Örnek Uçtan Uca Senaryolar

## 18.1 Kusma / İştahsızlık

```text
Ana Sayfa
  -> Kontrol Başlat
    -> "İki gündür iştahsız, bugün 2 kez kustu"
      -> Sistem: İştah & Sindirim + Genel Durum
        -> Acil sorular
          -> Kusma/iştah soruları
            -> Kusmuk fotoğrafı opsiyonel
            -> Genel davranış videosu opsiyonel
            -> Ateş ölçümü opsiyonel
              -> Özet
                -> Değerlendir
                  -> Orta Risk
                    -> Rapor oluştur
```

## 18.2 Topallama

```text
Ana Sayfa
  -> Kontrol Başlat
    -> "Sol arka ayağına basmıyor"
      -> Sistem: Hareket & Yürüyüş
        -> Travma/acil soruları
          -> Topallama soruları
            -> Yandan yürüyüş videosu
            -> Pati/bacak fotoğrafı
              -> Özet
                -> Değerlendir
                  -> Orta/Yüksek Risk
```

## 18.3 Solunum

```text
Ana Sayfa
  -> Kontrol Başlat
    -> "Hırıltılı nefes alıyor"
      -> Sistem: Solunum & Öksürük
        -> Acil solunum soruları
          -> Eğer morarma/nefes zorluğu varsa Acil Ekran
          -> Yoksa ses ve video görevleri
            -> Sonuç
```

## 18.4 Kulak Kaşıma — Cihazsız

```text
Ana Sayfa
  -> Kontrol Başlat
    -> "Kulağını kaşıyor, kötü koku var"
      -> Sistem: Kulak
        -> Kulak soruları
          -> Kulak dışı fotoğraf görevi
            -> Sonuç
```

## 18.5 Kulak Kaşıma — Basic Kit

```text
Ana Sayfa
  -> Kontrol Başlat
    -> "Kulağını kaşıyor, kötü koku var"
      -> Sistem: Kulak
        -> Kulak soruları
          -> Kulak içi kamera görevi
          -> Kulak dışı fotoğraf opsiyonel
            -> Sonuç
```

---

# 19. Son Ürün Cümlesi

Uygulamanın ana deneyimi şu cümleye hizmet etmelidir:

> **Pati Sağlık, evcil hayvanınızda fark ettiğiniz şikayeti anlayıp size uygun soruları, kayıt görevlerini ve takip adımlarını sunan; veteriner öncesi aciliyet skoru ve sağlık raporu oluşturan pet sağlık asistanıdır.**
