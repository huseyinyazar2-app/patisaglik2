# Veteriner Canli Gorusme Genisleme Plani

## Karar

Canli gorusme icin ilk tercih: **Daily Video SDK**.

Gerekce:
- MVP entegrasyonu en hizli seceneklerden biri.
- Prebuilt gorusme odasi ile ilk surum az UI/SDK karmasasiyla cikabilir.
- 10.000 participant-minute/ay ucretsiz kota baslangic testleri icin yeterli.
- Fiyat modeli net: kota sonrasi yaklasik `$0.004 / participant-minute`.
- Uygulama ici fiyat ilk MVP icin 8 kredi.
- Gorusme suresi MVP'de 15 dakika olarak belirtilir; 15 dakikayi asan gorusmeler icin ileride ek kredi uyarisi gosterilir, su an ek kredi dusulmez.
- Kredi randevu/talep olusurken bloke edilir. Oda/gorusme baslarsa iptal hakki kapanir ve 8 kredi harcanmis sayilir; baslamadan iptal edilirse bloke iade edilir.
- Gorusme tamamlandiktan sonra pet sahibi ve veteriner icin ayri anket acilir. Pet sahibi puani veterinerin siralama/kalite puanina yansir; veteriner geri bildirimi de kullanici davranisini operasyonel degerlendirmek icin saklanir.
- 2 kisilik 15 dakikalik gorusme Daily maliyeti ucretsiz kota sonrasi yaklasik `$0.12`.
- Video trafigini kendi serverimiz tasimaz; server sadece oda/token, yetki, odeme ve kayit metadata yonetir.

Alternatifler:
- Whereby Embedded: cok kolay embed, fakat aylik Build plan ve marka/ozellestirme sinirlari dikkate alinmali.
- Agora: guclu ve uygun maliyetli, ama SDK ve urunlestirme isi daha fazla.
- Twilio/Vonage: guvenilir, fiyat benzer; ilk MVP icin Daily kadar hizli olmayabilir.

## Urun Konumu

Ozellik "AI yerine veteriner" degil, su akisin devami olacak:

1. Pet sahibi sikayet/semptom girer.
2. AI on kontrol bilgi toplar, aciliyet sinyali verir ve veteriner icin vaka ozeti hazirlar.
3. Gerekiyorsa kullanici ucretli canli veteriner gorusmesine gecir.
4. Veteriner, AI ozeti + pet gecmisi + medya/belge kayitlari ile gorusmeye girer.
5. Gorusme sonrasi veteriner notu saglik gecmisine kaydedilir.

Urun dili:
- Tani/tedavi iddiasi yok.
- Acil durumda uygulama bekleme onermez; klinik/acil veteriner yonlendirmesi one cikar.
- Canli gorusme "uzaktan danisma / on degerlendirme" olarak konumlanir.

## MVP Kapsami

### Kullanici tarafi

- Ana sayfada tek `Veteriner Canli Gorusme` CTA; sonraki dagilim tamamen ayri vet-live sayfalarinda.
- Uygun veteriner/randevu secimi.
- Randevu oncesi vaka ozeti onizlemesi.
- Odeme/kredi kontrolu.
- Randevu oncesi 8 kredi bloke edilir; gorusme baslamazsa iptal/iade akisinda kredi geri verilir.
- Gorusme basladiktan sonra iptal/iade yoktur; 8 kredi her durumda harcanir.
- Kullanici, bu kredi/iptal politikasini ve uzaktan danismanin acil klinik muayene yerine gecmedigini onaylamadan randevu acamaz.
- Gorusme odasina katilma.
- Gorusme sonrasi veteriner notunu saglik gecmisinde gorme.
- Gorusme tamamlandiktan sonra veteriner memnuniyet anketi doldurma.

### Veteriner tarafi

- Basit veteriner paneli.
- Bekleyen/planlanmis gorusmeler listesi.
- Havuzdaki atanmamis talebi kendi hesabina ustlenme.
- Veteriner hesabi `vet_live` roluyle girer; normal kullanici ana ekranlarini gormeden kendi paneline yonlenir.
- Pet profili, sikayet, kirmizi bayraklar, yanitlar, medya, belge ve olcum ozetini gorme.
- Gorusmeye katilma.
- Gorusme sonucu notu yazma:
  - genel degerlendirme
  - aciliyet
  - onerilen sonraki adim
  - kontrol / takip tarihi
  - "klinik muayene gerekir" isareti
- Gorusme tamamlandiktan sonra kullanici gorusme davranisi/uygunlugu icin anket doldurma.

### Admin tarafi

- Veteriner hesaplarini onaylama/pasiflestirme.
- Veteriner musaitliklerini ve komisyon oranini yonetme.
- Gorusme kayitlarini, odeme durumunu ve sikayet/iade durumunu gorme.
- Uygunsuz davranis/kalite kontrol notlari.

## Teknik Mimari

### Daily entegrasyon modeli

Frontend:
- Kullanici ve veteriner icin ayni gorusme ekranini kullan.
- Ilk surumde Daily Prebuilt embed yeterli olabilir.
- Daha sonra custom UI gerekirse Daily SDK ile ozellestirme yapilir.

Server:
- Daily API anahtari sadece serverda tutulur.
- Server oda olusturur.
- Server katilim tokeni uretir.
- Oda linki/token sadece yetkili kullanici ve ilgili veteriner icin verilir.
- Gorusme baslangic/bitis webhooklari metadata olarak kaydedilir.

Video medya trafigi:
- Kendi Node serverimizden gecmez.
- Daily altyapisi uzerinden akar.

### Onerilen DB tablolari

`vet_profiles`
- id
- user_id
- display_name
- license_no
- specialties
- bio
- status: pending | approved | suspended
- rating_avg
- created_at

`vet_availability`
- id
- vet_id
- weekday
- starts_at
- ends_at
- timezone
- is_active

`vet_consultation_bookings`
- id
- user_id
- pet_id
- vet_id
- ai_session_id
- report_id
- status: requested | scheduled | paid | live | completed | cancelled | refunded
- scheduled_at
- duration_minutes
- price_cents
- currency
- payment_id
- daily_room_name
- daily_room_url
- metadata: kredi/iptal onayi, talep havuzu bilgisi, Daily/provider detaylari
- created_at

`vet_credit_holds`
- id
- booking_id
- wallet_id
- user_id
- amount
- status: held | captured | released
- hold_transaction_id
- capture_transaction_id
- release_transaction_id
- created_at

`vet_consultation_surveys`
- id
- booking_id
- reviewer_role: owner | vet
- reviewer_user_id
- reviewed_user_id
- vet_id
- rating
- feedback
- tags
- created_at

`vet_consultation_notes`
- id
- booking_id
- vet_id
- summary
- urgency_level
- next_step
- followup_at
- clinic_visit_recommended
- created_at

`vet_consultation_events`
- id
- booking_id
- type
- payload_json
- created_at

## API Taslagi

Kullanici:
- `GET /api/vet-live/vets`
- `POST /api/vet-live/quote`
- `GET /api/vet-live/bookings`
- `POST /api/vet-live/bookings`
- `GET /api/vet-live/bookings/:id`
- `POST /api/vet-live/bookings/:id/pay`
- `POST /api/vet-live/bookings/:id/join-token`

Veteriner:
- `GET /api/vet-live/bookings?vetId=:vetId`
- `POST /api/vet-live/bookings/:id/join-token`
- `POST /api/vet-live/bookings/:id/notes`

Webhook:
- `POST /api/vet-live/webhooks/daily`
- `POST /api/vet-live/webhooks/payment`

## Faz Plani

### Faz 1 - Manuel randevu + Daily oda MVP

- Daily hesap/API anahtari server env'e eklenir.
- Admin tarafindan onayli veteriner seed/manual kaydi yapilir.
- Kullanici ana sayfadaki tek CTA ile ayri vet-live alanina gecer ve gorusme talebi olusturur.
- Basit randevu slotlari sunulur.
- Odeme ilk fazda manuel/kapali olabilir; admin test icin gorusmeyi `paid` yapabilir.
- Daily room serverda olusturulur.
- Kullanici ve veteriner gorusmeye katilir.
- Veteriner notu saglik gecmisine kaydedilir.

Basari kriteri:
- Uctan uca 1 test gorusmesi acilir.
- Gorusme sonrasi not pet saglik arsivinde gorunur.

### Faz 2 - Odeme ve ticari akis

- Google Play / web odeme modeli netlestirilir.
- Gorusme fiyatlari admin panelden yonetilir.
- Kullanici odeme sonrasi oda erisimi alir.
- Iptal/iade kurallari eklenir.
- Veteriner komisyon raporu tutulur.

### Faz 3 - Musaitlik ve operasyon

- Veteriner kendi musaitliklerini yonetir.
- Otomatik slot hesaplama.
- Bildirimler:
  - randevu onayi
  - 15 dk kala hatirlatici
  - veteriner gecikti
  - kullanici katilmadi
- Gorusme kalite/puanlama.

### Faz 4 - Klinik kalite ve gelismis kayit

- Gorusme kaydi opsiyonel hale getirilir.
- Kayit kullanilacaksa acik riza metni zorunlu olur.
- Transkript/ozet AI destekli alinabilir.
- Veteriner kalite denetimi ve sikayet sureci eklenir.

## Hukuki ve Operasyonel Notlar

- Veterinerlerin lisans/oda kaydi dogrulanmali.
- Uzaktan gorusme kapsami net yazilmali: tani/tedavi yerine danisma ve yonlendirme.
- Acil durumlarda "canli gorusme bekleme" yerine acil klinik yonlendirmesi one cikarilmali.
- Gorusme kaydi alinirsa kullanicidan ayri acik riza alinmali.
- Veteriner panelinde kullanici/pet verisi sadece ilgili randevu icin gorunmeli.

## Ilk Tasarim Karari

MVP'de gorusme odasi icin custom WebRTC UI yazilmayacak.

Daily Prebuilt kullanilacak:
- daha az kod
- daha az hata riski
- hizli test
- kamera/mikrofon izinleri, ekran paylasimi ve temel oda deneyimi hazir

Urun dogrulandiktan sonra custom Daily SDK UI fazina gecilebilir.
