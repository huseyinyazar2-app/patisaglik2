# Pet Help — Olay, Soru, Görev, Öneri ve Takip Kütüphanesi Paketi

Oluşturma tarihi: 2026-05-30 17:05

Bu paket, Pet Help uygulamasında kullanılacak çekirdek sağlık kontrol kütüphanesidir.

## İçerik Sayıları

- `complaint_types.json`: **20 olay/şikayet türü**
- `question_sets.json`: **60 soru seti**
- `task_definitions.json`: **80 görev tanımı**
- `recommendation_blocks.json`: **300 güvenli öneri bloğu**
- `followup_protocols.json`: **50 takip protokolü**
- `red_flag_rules.json`: **100 red flag / acil risk kuralı**
- `safety_guardrails.json`: AI ve öneri güvenlik kuralları

## Mimari Karar

AI canlı uygulamada serbest öneri yazmaz. AI sadece şunları seçer:

- `complaint_type_id`
- `question_set_ids`
- `task_keys`
- `recommendation_block_ids`
- `followup_protocol_id`
- `risk_level`
- `red_flag_rules`

Ekranda gösterilecek öneri metinleri `recommendation_blocks.json` içinden gelir.

## Önemli Güvenlik Kuralı

Bu paket AI tarafından hazırlanmış taslak içeriktir. Üretim ortamına alınmadan önce veteriner hekim ve hukuk danışmanı gözden geçirmesi önerilir.

`review_status = draft_ai_generated` olan kayıtlar canlıya doğrudan alınmamalıdır. Canlı uygulamada sadece `approved` durumundaki kayıtlar gösterilmelidir.

## Önerilen Proje Konumu

```text
/src/health-library/
  complaint_types.json
  question_sets.json
  task_definitions.json
  recommendation_blocks.json
  followup_protocols.json
  red_flag_rules.json
  safety_guardrails.json
```

## Ajan Uygulama Talimatı

1. Bu dosyaları `/src/health-library/` altına koy.
2. TypeScript tiplerini oluştur.
3. Classifier çıktısını bu ID sistemine bağla.
4. Dinamik soru ekranını `question_sets.json` üzerinden render et.
5. Görev planını `task_definitions.json` üzerinden oluştur.
6. Sonuç ekranındaki güvenli önerileri `recommendation_blocks.json` üzerinden göster.
7. Acil durumları `red_flag_rules.json` ile deterministik yakala.
8. Takip planını `followup_protocols.json` ile oluştur.
9. AI serbest metin önerisi üretirse `safety_guardrails.json` filtresinden geçir.
10. Tüm kayıtları sonradan `approved` sürecine uygun hale getir.

## Not

Bu içerikler tanı/tedavi değildir. Ürün konumu: triyaj, kayıt, takip, güvenli öneri ve veteriner hazırlığıdır.
