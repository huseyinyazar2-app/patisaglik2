# I18N Audit

Son kontrol: 2026-06-06

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
- Dictionary key sayisi: `tr=2233`, `en=2233`
- `missingInEn`: `0`
- `extraInEn`: `0`
- Kalan hardcoded Turkce string literal: `0`
- Etkilenen dosya: `0`
- Admin panel sadece ic kullanim icin sabit Turkce tutuldu ve audit istisnasina alindi: `src/screens/web/Admin.js`

En yogun dosyalar:

| Dosya | Kalan |
| --- | ---: |
| - | 0 |

## Production Notu

UI metinleri icin dosya bazli sozluk hizli ve dusuk riskli kalmali. DB ceviri tablolari su alanlarda kullanilmali:

- Admin panelden duzenlenecek bilgi bankasi ve yardim icerikleri
- Dinamik saglik icerikleri
- Pazarlama/tanitim metinleri
- 20+ dil icin sonradan CMS benzeri ceviri yonetimi

## Siradaki Sira

1. `questions` icinde kalan Turkce keyword listelerini cok dilli NLP/keyword stratejisiyle ayri ele al.
2. Tarih, para ve sayi formatlarini sabit `tr-TR` yerine aktif locale ile uret.
3. Diger 22 dil icin profesyonel ceviri dosyalari eklendiginde sadece dictionary import haritasini genislet.
