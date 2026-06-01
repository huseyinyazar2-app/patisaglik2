# Pati Sağlık — Kütüphane Paketi Özeti

Bu dosya, oluşturulan JSON kütüphane paketinin özetidir.

## Sayılar

| Kütüphane | Sayı |
|---|---:|
| Olay / Şikayet türü | 20 |
| Soru seti | 60 |
| Görev tanımı | 80 |
| Güvenli öneri bloğu | 300 |
| Takip protokolü | 50 |
| Red flag kuralı | 100 |

## Ana İlke

AI serbest tıbbi öneri yazmayacak. AI yalnızca kütüphanedeki ID’leri seçecek. Ekranda gösterilecek metinler kütüphaneden gelecek.

## Dosyalar

- `complaint_types.json`
- `question_sets.json`
- `task_definitions.json`
- `recommendation_blocks.json`
- `followup_protocols.json`
- `red_flag_rules.json`
- `safety_guardrails.json`
- `README.md`

## Canlıya Alma Notu

Tüm kayıtlar `draft_ai_generated` durumundadır. Üretim ortamında sadece veteriner/hukuk/ürün kontrolünden geçmiş `approved` kayıtlar gösterilmelidir.
