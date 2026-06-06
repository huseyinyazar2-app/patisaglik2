# Pet Help DB Mimarisi

## Hedef

Bu dokuman, baska ajanlarin veritabani isini kaldigi yerden anlayabilmesi icin tutulur. Ilk hedef Turso/libSQL ustunde test altyapisidir. Nihai yapida PWA/Capacitor istemcisi dogrudan DB token tasimaz; kendi server/API katmanina istek atar.

## Temel Kararlar

- Kedi/kopek disina buyume icin `pet_species`, `pet_breeds`, `pet_profile_attributes` ayrildi.
- Bir kullanici birden fazla pet ekleyebilir.
- Ayni pet birden fazla kullaniciya acilabilir: `pet_members`, `roles`, `permissions`, `role_permissions`.
- Ucretsiz, kredi ve abonelik altyapisi hazir: `plans`, `subscriptions`, `credit_wallets`, `credit_transactions`, `feature_usage`.
- Cok dil altyapisi hazir: `locales`, `translation_keys`, `translations`, `localized_content`.
- Yeni formlar ilk asamada `form_submissions` tablosuna JSON payload olarak yazilir. Sonra ilgili domain tablolarina ayrilabilir.

## Domain Tablolari

- Kimlik: `users`
- Pet: `pets`, `pet_species`, `pet_breeds`, `pet_profile_attributes`
- Paylasim/yetki: `pet_members`, `roles`, `permissions`, `role_permissions`, `pet_member_permission_overrides`
- Ticari model: `plans`, `credit_packages`, `subscriptions`, `credit_wallets`, `credit_transactions`, `store_purchases`, `feature_usage`
- Saglik kayitlari: `health_records`, `measurements`, `reminders`, `expenses`, `media_files`, `documents`
- AI/is akisi: `ai_analysis_jobs`, `followups`, `form_submissions`

## Odeme ve Kredi Katalogu

- Plan katalogu `plans` tablosundan gelir; admin panelinde fiyat, aylik AI kredi hakki, pet limiti, aktiflik ve Google Play product id duzenlenebilir.
- Varsayilan abonelikler: `premium_monthly` = 24900 kurus / TRY, aylik 8 AI kredi; `premium_yearly` = 199000 kurus / TRY, aylik 8 AI kredi.
- Kredi paketleri `credit_packages` tablosundan gelir; varsayilan paketler `credit_1` = 1 kredi / 4900 kurus ve `credit_10` = 10 kredi / 39000 kurus.
- Google Play satin alma dogrulamasi gelince dogrulanan tokenlar `store_purchases` tablosuna yazilacak; abonelik hakki `subscriptions`, kredi hakki `credit_wallets` ve `credit_transactions` ile yansitilacak.
- AI kullanim maliyeti varsayilan 1 kredidir. Abonelik varsa once aylik `monthly_credit_allowance`, sonra kullanicinin `credit_wallets.balance` bakiyesi kullanilir; kullanim `feature_usage.credit_cost` ile izlenir.
- Dil: `locales`, `translation_keys`, `translations`, `localized_content`
- Guvenlik/iz: `audit_logs`

## Su Anki Uygulama Durumu

- `db/schema.sql` olusturuldu.
- `scripts/migrate-turso.mjs` Turso'ya semayi uygular.
- `scripts/db-smoke-test.mjs` tablo ve temel seed kontrolu yapar.
- `src/services/dbClient.js` gecici browser/client DB baglantisi icin hazirlandi.
- `src/services/formSubmissions.js` form payload'unu `form_submissions` tablosuna yazmaya calisir; DB env yoksa local fallback yapar.
- Ucretsiz form mapper'i eklendi:
  - `expense` -> `expenses`
  - `reminders` -> `reminders`
  - `photo-followup`, `poop-score`, `diet-log`, `chronic`, `postop`, `reproduction`, `senior` -> `health_records`
- `src/screens/features/FeatureForm.js` gorsel formlardan payload toplar.
- Kullanici profili telefon oncelikli olacak sekilde genisletildi. `users.phone`, `users.locale`, `users.timezone` dogrudan alan; ulke/il/ilce/mahalle gibi konum bilgileri `users.metadata.location` icinde tutulur.
- Pet profil baglami uygulama katmaninda uretilir: yasam evresi, kisa burunlu/buyuk irk/yavru/yasli/kronik risk etiketleri `riskContext` olarak pet metadata/local profil uzerinden tasinir ve AI triage akisi tarafindan kullanilir.

## Komutlar

```powershell
$env:TURSO_DATABASE_URL="libsql://..."
$env:TURSO_AUTH_TOKEN="..."
npm run db:migrate
npm run db:smoke
```

Yerel browser prototipinde formlarin Turso'ya yazmasi icin Vite dev server baslamadan once `VITE_TURSO_DATABASE_URL` ve `VITE_TURSO_AUTH_TOKEN` verilmelidir. Bu sadece test icindir; production build'e tasinmaz.

## Guvenlik Notu

`VITE_TURSO_AUTH_TOKEN` sadece yerel prototip icindir. Production PWA/Capacitor build icinde kullanilmaz. Production icin:

1. Backend API endpointleri ac.
2. Turso token server env'de dursun.
3. Kullanici/pet yetkilerini API katmaninda kontrol et.
4. Client sadece session token ile API'ye konussun.

## Hibrit Medya / B2 Karari

- Varsayilan model lokal-oncelikli hibrittir: gunluk medya cihazda kalir, server sadece metadata ve paylasim/AI icin gereken gecici objeleri bilir.
- B2 bucket private kalir. Client B2 anahtari tasimaz; server `/api/media/sign-upload` ile kisa omurlu signed PUT URL uretir.
- Rapor, recete, tahlil, fatura gibi kalici belgeler `documents` / `reports` kategorisinde saklanabilir.
- AI girdileri `ai-inputs` kategorisinde gecici saklanir; hedef saklama suresi 90 gundur.
- Oncesi/sonrasi takip medyasi simdilik kalici kabul edilir; kullanici silme/arsivleme politikasi daha sonra urunlestirilecek.
- B2 object path formati: `users/{userId}/pets/{petId}/{category}/{yyyy}/{mm}/{fileId}-{safeName}`.
- Ilk limitler: foto 20 MB, PDF/belge 30 MB, video 120 MB.

## Production API Ilk Faz

- `server/index.js` Node built-in HTTP server olarak eklendi; ek framework dependency yok.
- `GET /api/health`
- `POST /api/media/sign-upload`
- `POST /api/media/complete`
- `GET /api/media/sign-download`
- Docker/Coolify deploy icin `Dockerfile` eklendi. Secretlar Coolify environment degiskenlerinde tutulacak.

## Sonraki Is Sirasi

1. Pet ekleme ekranini `pets` + `pet_profile_attributes` tablolarina bagla.
2. Pet secme ve ana sayfa mock datasini DB okuma katmanina tasir.
3. Ucretsiz formlar icin listeleme ekranlarini DB'den okur hale getir.
4. Bakici modu icin invite akisi ve `pet_members` kaydi ekle.
5. QR saglik karti icin public token/link modeli ekle.
6. Kredi, abonelik ve AI kontrolunu API katmanina tasi.
