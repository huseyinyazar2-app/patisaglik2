# Pet Help Hata Kodlari

Mobil developer testlerinde kullaniciya gosterilen numerik kodlar sabittir. Kod bana verildiginde ilgili katman nokta atisi bulunabilir.

## Genel

- `1001` body cok buyuk.
- `1002` gecersiz JSON.
- `1003` genel server hatasi.
- `1004` endpoint bulunamadi.
- `1201` veritabani ayari yok.

## Auth

- `1301` kayit alanlari gecersiz.
- `1302` telefon daha once kayitli.
- `1303` giris alanlari gecersiz.
- `1304` giris bilgileri hatali.
- `1305` admin girisi hatali.
- `1306` yetkisiz istek.

## AI

- `3101` AI icin dosya eksik.
- `3102` Gemini/API anahtari yok.
- `3103` AI saglayici HTTP hatasi.
- `3104` AI yaniti beklenen semaya uymadi.
- `3105` AI JSON yaniti okunamadi.
- `3106` AI istek/akis hatasi.
- `3107` AI anahtar alias/konfigurasyon hatasi.

## Medya

- `3201` desteklenmeyen medya kategorisi.
- `3202` zorunlu medya alanlari eksik.
- `3203` dosya boyutu limiti asildi.
- `3204` object key gecersiz.

## Client

- `9001` ag/fetch hatasi.
- `9002` signed upload basarisiz.
- `9003` lokal dosya okunamadi.
- `9999` bilinmeyen client hatasi.

## AI Audit Log

AI loglari `ai_analysis_jobs` tablosunda tutulur.

Kaydedilen ana alanlar:
- `feature_code`: `document-ocr`, `package-risk` vb.
- `input_payload.model`
- `input_payload.systemPrompt`
- `input_payload.userPrompt`
- `input_payload.mediaRefs`
- `output_payload.data`
- `output_payload.raw`
- `output_payload.durationMs`
- `error_message`

Admin panelde `/admin` altinda `AI Log` bolumunden gorulur.
