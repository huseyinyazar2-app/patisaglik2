# I18N Audit

Son kontrol: 2026-06-01

## Mevcut Yapı

- Veritabanında dil altyapısı var:
  - `locales`
  - `translation_keys`
  - `translations`
  - `localized_content`
- Frontend tarafında aktif çeviri altyapısı dosya bazlıdır:
  - `src/i18n/tr.js`
  - `src/i18n/en.js`
- `t(key)` artık aktif kullanıcı profili `locale` değerine göre `tr` veya `en` sözlüğünü kullanır.
- Eksik İngilizce anahtar varsa otomatik Türkçe fallback uygulanır.

## Eklenenler

- İngilizce sözlük ilk faz olarak eklendi.
- Splash, auth, pet, home, check, result, history, reports, profile, notifications, common ve tab bar anahtarlarının İngilizce karşılıkları yazıldı.
- Profil > Hesap Bilgileri ekranında dil seçimi `Türkçe / English` select alanına çevrildi.
- Ana tab bar etiketleri `t()` ile çevrilebilir hale getirildi.
- `scripts/audit-i18n.mjs` eklendi.

## Kalan Hardcoded Türkçe

Audit komutu:

```bash
node scripts/audit-i18n.mjs
```

Son çıktı:

- Toplam Türkçe string literal: `1076`
- Etkilenen dosya: `74`

En yoğun dosyalar:

| Dosya | Kalan |
| --- | ---: |
| `src/screens/history/FreeRecordDetail.js` | 162 |
| `src/screens/history/FreeRecordList.js` | 71 |
| `src/services/formSubmissions.js` | 64 |
| `src/mock/questions.js` | 61 |
| `src/screens/result/Result.js` | 56 |
| `src/screens/home/Home.js` | 45 |
| `src/screens/web/Admin.js` | 41 |
| `src/screens/reports/ReportDetail.js` | 32 |
| `src/screens/check/PackageRisk.js` | 26 |
| `src/screens/history/History.js` | 26 |

## Production Notu

Frontend UI metinleri için dosya bazlı sözlük daha hızlı ve güvenli. DB çeviri tabloları şu işler için kullanılmalı:

- Bilgi bankası içerikleri
- Dinamik sağlık içerikleri
- Admin panelden düzenlenecek pazarlama/yardım metinleri
- İleride 20-30 dil desteği için CMS benzeri içerik yönetimi

## Önerilen Sıra

1. `FreeRecordDetail`, `FreeRecordList`, `formSubmissions`, `questions` ve `Result` dosyalarını i18n’e taşı.
2. Bilgi bankası içeriklerini `localized_content` veya ayrı içerik JSON yapısına taşı.
3. Tarih/para formatlarını sabit `tr-TR` yerine aktif locale ile üret.
4. Dil değişiminden sonra açık ekranın yeniden render edilmesini standartlaştır.
