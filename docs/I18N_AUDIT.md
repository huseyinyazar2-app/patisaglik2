# I18N Audit

Son kontrol: 2026-06-02

## Mevcut Durum

- Frontend aktif ceviri altyapisi dosya bazlidir:
  - `src/i18n/tr.js`
  - `src/i18n/en.js`
- Store yayini icin 24 locale altyapisi hazirdir:
  - `tr`, `en`, `de`, `fr`, `es`, `it`, `pt`, `nl`, `pl`, `ro`, `el`, `ru`, `uk`, `ar`, `he`, `fa`, `hi`, `id`, `ms`, `th`, `vi`, `ja`, `ko`, `zh`
- Tam ceviri sozlugu su an `tr` ve `en` icin vardir.
- Diger 22 dil secilebilir durumdadir; ceviri eklenene kadar fallback sirasiyla English -> Turkish -> key olarak calisir.
- `setLocale()` HTML `lang` ve RTL dilleri icin `dir` degerini ayarlar.
- Veritabani `locales` seed kayitlari 24 dili kapsayacak sekilde guncellendi.

## Yapilanlar

- Hesap ekranindaki dil secimi 24 locale listesine baglandi.
- Ana uygulama acilisinda secili locale yeniden uygulanir.
- Acil Bilgi Bankasi (`/check/knowledge`) TR/EN sozluklerine tasindi.
- TR/EN dictionary key parity temizlendi.
- `npm run audit:i18n` script'i eklendi.

## Son Audit

Komut:

```bash
npm run audit:i18n
```

Ozet:

- Desteklenen locale: `24`
- Tam ceviri sozlugu: `tr`, `en`
- Dictionary key sayisi: `tr=772`, `en=772`
- `missingInEn`: `0`
- `extraInEn`: `0`
- Kalan hardcoded Turkce string literal: `787`
- Etkilenen dosya: `73`

En yogun dosyalar:

| Dosya | Kalan |
| --- | ---: |
| `src/screens/history/FreeRecordDetail.js` | 47 |
| `src/screens/home/Home.js` | 45 |
| `src/screens/web/Admin.js` | 41 |
| `src/services/formSubmissions.js` | 39 |
| `src/mock/questions.js` | 38 |
| `src/screens/reports/ReportDetail.js` | 32 |
| `src/screens/check/PackageRisk.js` | 26 |
| `src/screens/history/History.js` | 26 |

## Production Notu

UI metinleri icin dosya bazli sozluk hizli ve dusuk riskli kalmali. DB ceviri tablolari su alanlarda kullanilmali:

- Admin panelden duzenlenecek bilgi bankasi ve yardim icerikleri
- Dinamik saglik icerikleri
- Pazarlama/tanitim metinleri
- 20+ dil icin sonradan CMS benzeri ceviri yonetimi

## Siradaki Sira

1. `Home`, `Admin`, `ReportDetail` dosyalarini i18n'e tasi.
2. `questions` icinde kalan Turkce keyword listelerini cok dilli NLP/keyword stratejisiyle ayri ele al.
3. `formSubmissions` icinde kalan payload/form label anahtarlarini guvenli alias yapisina tasidiktan sonra i18n'e al.
4. Tarih, para ve sayi formatlarini sabit `tr-TR` yerine aktif locale ile uret.
5. Admin ve web tanitim ekranlarindaki kalan metinleri sozluge al.
6. Diger 22 dil icin profesyonel ceviri dosyalari eklendiginde sadece dictionary import haritasini genislet.
