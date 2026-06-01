# Pati Sağlık — Test / Şikayet Türleri ve Akıllı Muayene Kütüphanesi — Dosya 1

> **Devam Dosyasıdır.**  
> Bu dosya, önceki şu dosyaların devamı ve revizyon tamamlayıcısıdır:
>
> 1. `pet_on_saglik_kontrol_uygulama_plani.md`
> 2. `pet_saglik_hafizasi_ek_plani.md`
> 3. `pati_saglik_ekran_akisi_ui_sartnamesi.md`
> 4. `pati_saglik_akilli_muayene_ekran_haritasi.md`
>
> Bu dosyanın amacı, uygulamadaki **test / şikayet türlerini**, AI’ın şikayeti nasıl sınıflandıracağını, hangi soru setlerini getireceğini, hangi fotoğraf/video/ses/ölçüm görevlerini açacağını ve hangi durumlarda acil uyarı vereceğini netleştirmektir.
>
> **Önemli ürün kararı:**  
> AI serbest şekilde tıbbi soru üretmeyecek. AI’ın görevi, kullanıcının şikayetini anlamak ve bu dokümanda tanımlı **onaylı soru kütüphanesinden** uygun soru setlerini ve görevleri seçmektir.

---

# 1. Ürün Sınırı

Uygulama veteriner teşhisi koymaz.

Uygulama şu işleri yapar:

- Kullanıcının pet hakkında yazdığı / seçtiği şikayeti anlar.
- Şikayeti kategoriye ayırır.
- Acil belirti var mı kontrol eder.
- Uygun soru setlerini açar.
- Gerekiyorsa fotoğraf/video/ses/ölçüm görevleri ister.
- Pet’in geçmiş kayıtlarıyla karşılaştırır.
- Risk seviyesi ve veteriner öncesi rapor oluşturur.

Uygulama şu ifadeleri kullanmaz:

- “Hastalık teşhisi koyduk.”
- “Şu hastalık var.”
- “Veterinere gitmenize gerek yok.”
- “Kesin sağlıklı.”
- “Antibiyotik gerekir.”
- “Kanser değil.”
- “İltihap var.”

Uygulama şu ifadeleri kullanır:

- “Bu bulgu veteriner değerlendirmesi gerektirebilir.”
- “Takip edilmesi gereken değişim olabilir.”
- “Acil riskli belirti olabilir.”
- “Belirtiler kötüleşirse beklemeyin.”
- “Bu sonuç teşhis değildir.”
- “Veteriner muayenesinin yerine geçmez.”

---

# 2. Ana Mantık: Şikayet → Kategori → Soru Seti → Görev → Sonuç

Yeni muayene akışı şu şekilde olmalıdır:

```text
Kullanıcı şikayet girer
  -> AI / sınıflandırıcı şikayeti analiz eder
    -> Ana kategori ve alt kategori seçilir
      -> Acil belirti grupları belirlenir
        -> Soru setleri çağrılır
          -> Fotoğraf/video/ses/ölçüm görevleri oluşturulur
            -> Kullanıcı görevleri tamamlar veya atlar
              -> Kontrol özeti oluşur
                -> AI son değerlendirme yapar
                  -> Risk sonucu + rapor + geçmiş kaydı
```

---

# 3. AI’ın Rolü

AI veya sınıflandırıcı üç aşamada kullanılmalıdır.

## 3.1. İlk Sınıflandırma

Girdi:

- Pet türü: kedi / köpek
- Yaş
- Kilo
- Cinsiyet
- Kısır durumu
- Kronik hastalıklar
- Alerjiler
- Kullanılan ilaçlar
- Kullanıcının şikayet metni
- Seçilen hızlı belirti chip’leri
- Şikayet süresi
- Kullanıcının durum şiddeti algısı
- Cihaz modu: `phone_only` / `basic_kit`
- Son sağlık geçmişi özeti

Çıktı:

- Ana kategoriler
- Alt kategoriler
- Acil belirti grupları
- Soru seti ID’leri
- Fotoğraf/video/ses/ölçüm görevleri
- Basic Kit görevleri
- Güven skoru
- Kullanıcıya gösterilecek “kontrol planı”

## 3.2. Dinamik Akış Kurma

AI soru yazmaz. AI yalnızca şunları seçer:

- Hangi `question_set_id` kullanılacak?
- Hangi medya görevi gerekli?
- Hangi ölçüm önerilmeli?
- Basic Kit varsa hangi görev açılmalı?
- Geçmişten hangi kayıtlar bağlam olarak kullanılmalı?

## 3.3. Son Değerlendirme

Girdi:

- Şikayet
- Soru cevapları
- Acil belirti yanıtları
- Eklenen medya özetleri
- Ölçümler
- Basic Kit sonuçları
- Pet geçmişi
- Benzer geçmiş kayıtlar

Çıktı:

- Risk skoru
- Risk seviyesi
- Bulgular
- Geçmişe göre değişim
- Takip önerisi
- Veteriner raporu taslağı
- Güvenli uyarı

---

# 4. Sınıflandırma Çıktı Şeması

Classifier / AI aşağıdaki JSON formatına benzer bir çıktı üretmelidir:

```json
{
  "session_intent": "health_check",
  "primary_categories": ["appetite_digestive"],
  "secondary_categories": ["vomiting", "general_weakness"],
  "suspected_complaint_types": ["vomiting", "loss_of_appetite"],
  "red_flag_groups": ["dehydration", "toxic_ingestion", "persistent_vomiting"],
  "question_set_ids": [
    "red_flags_general",
    "digestive_appetite_basic",
    "vomiting_basic",
    "hydration_basic"
  ],
  "task_plan": [
    {
      "task_key": "vomit_photo",
      "task_type": "photo",
      "priority": "optional"
    },
    {
      "task_key": "behavior_video",
      "task_type": "video",
      "priority": "recommended"
    },
    {
      "task_key": "temperature_measurement",
      "task_type": "measurement",
      "priority": "optional"
    }
  ],
  "basic_kit_tasks": [],
  "history_lookup_keys": [
    "vomiting",
    "appetite",
    "weight",
    "temperature",
    "digestive"
  ],
  "confidence": 0.84,
  "user_confirmation_text_key": "classifier.confirm.digestive_vomiting"
}
```

---

# 5. Risk Seviyeleri

Uygulamada 4 ana risk seviyesi kullanılmalıdır.

| Risk Seviyesi | Kod | Anlam | Kullanıcıya Gösterilecek Dil |
|---|---|---|---|
| Düşük | `low` | Şu an acil görünmeyen, takip edilecek durum | “Belirtileri takip edin. Değişim olursa yeni kontrol oluşturun.” |
| Orta | `medium` | Veteriner randevusu önerilebilecek durum | “Veteriner randevusu planlamanız önerilir.” |
| Yüksek | `high` | Kısa sürede veteriner değerlendirmesi önerilir | “Kısa sürede veteriner değerlendirmesi önerilir.” |
| Acil | `emergency` | Beklemeden veteriner desteği gerekir | “Beklemeden veteriner kliniğine başvurun.” |

---

# 6. Acil Belirti Grupları

Acil belirtiler AI yorumuna bırakılmamalıdır. Bunlar mümkün olduğunca kural tabanlı çalışmalıdır.

## 6.1. Genel Acil Belirtiler

Her yeni sağlık kontrolünde veya ilgili şikayette sorulabilecek kritik sorular:

| Kod | Soru | Acil Tetikleyici |
|---|---|---|
| `breathing_difficulty` | Nefes almakta zorlanıyor mu? | Evet |
| `collapse_unconscious` | Bayılma veya bilinç kaybı oldu mu? | Evet |
| `seizure` | Nöbet geçirdi mi? | Evet |
| `severe_bleeding` | Şiddetli kanama var mı? | Evet |
| `toxic_ingestion` | Zehirli bir şey yeme/içme ihtimali var mı? | Evet |
| `urinary_blockage` | İdrar yapmak istiyor ama hiç yapamıyor mu? | Evet |
| `major_trauma` | Trafik kazası, yüksekten düşme veya ciddi travma oldu mu? | Evet |
| `blue_pale_gums` | Diş etleri mor, mavi, gri veya çok soluk mu? | Evet |
| `severe_pain` | Dokununca şiddetli ağrı/çığlık var mı? | Evet |
| `uncontrolled_vomiting` | Sürekli kusuyor ve su tutamıyor mu? | Evet |

## 6.2. Kediye Özel Acil Öncelikler

| Kod | Soru | Acil Tetikleyici |
|---|---|---|
| `male_cat_no_urine` | Erkek kedi idrar yapmak için zorlanıyor ama idrar yapamıyor mu? | Evet |
| `cat_open_mouth_breathing` | Kedi ağzı açık nefes alıyor mu? | Evet |
| `cat_not_eating_24h` | Kedi 24 saatten uzun süredir hiç yemek yemiyor mu? | Evet / yüksek risk |
| `cat_sudden_hind_leg_weakness` | Kedinin arka bacaklarında ani güçsüzlük/soğukluk var mı? | Evet |

## 6.3. Köpeğe Özel Acil Öncelikler

| Kod | Soru | Acil Tetikleyici |
|---|---|---|
| `dog_bloat_risk` | Karın aniden şişti mi, öğürme var ama kusamıyor mu? | Evet |
| `dog_heatstroke` | Sıcak çarpması ihtimali var mı? Aşırı soluma, halsizlik, çökme var mı? | Evet |
| `dog_severe_lameness_no_weight` | Bacağına hiç basamıyor ve şiddetli ağrı var mı? | Evet / yüksek risk |
| `dog_choking` | Boğulma, tıkanma veya yabancı cisim şüphesi var mı? | Evet |

---

# 7. Ana Test / Şikayet Türleri

Aşağıdaki test türleri uygulamanın ana şikayet sınıflarıdır.

Her test türü için şu alanlar tanımlanmalıdır:

- Kullanıcı bunu nasıl anlatır?
- Hangi kategoriye girer?
- Hangi soru setleri çağrılır?
- Hangi medya/ölçüm görevleri açılır?
- Basic Kit varsa ne değişir?
- Hangi red flag’ler kontrol edilir?
- Geçmişten hangi kayıtlar dikkate alınır?

---

# 8. Test Türü 01 — Genel Durum / Halsizlik / Davranış Değişikliği

## 8.1. Kullanıcı Şikayet Örnekleri

- “Bugün çok halsiz.”
- “Normalde oyun oynar, bugün sürekli yatıyor.”
- “Keyifsiz görünüyor.”
- “Saklanıyor.”
- “Bize tepki vermiyor.”
- “Davranışı değişti.”
- “Kedim normalden farklı davranıyor.”
- “Köpeğim sürekli uyuyor.”

## 8.2. Kategori

- Ana kategori: `general`
- Alt kategoriler:
  - `lethargy`
  - `behavior_change`
  - `reduced_activity`
  - `weakness`

## 8.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `general_condition_basic`
- `activity_behavior_basic`
- Şikayette iştah varsa: `digestive_appetite_basic`
- Şikayette ateş varsa: `temperature_basic`
- Şikayette ağrı varsa: `pain_basic`

## 8.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Genel davranış videosu | video | önerilir |
| Ateş ölçümü | measurement | opsiyonel |
| Son kilo bilgisi | measurement | opsiyonel |
| Serbest not | note | önerilir |

## 8.5. Basic Kit Etkisi

Basic Kit şart değildir.

Eğer Basic Kit varsa:

- Dijital derece ölçümü önerilebilir.
- Yakın görüntü yalnızca kullanıcı belirli bir yara/şişlik seçerse açılır.

## 8.6. Geçmiş Karşılaştırması

- Önceki halsizlik kayıtları
- Kilo trendi
- Son iştah kayıtları
- Son ateş ölçümleri
- Son veteriner ziyaretleri
- Kronik hastalık bilgisi
- İlaç değişiklikleri

## 8.7. Risk Mantığı

Acil belirtiler yoksa ama halsizlik + iştahsızlık + kusma/ishal varsa orta/yüksek risk olabilir.

Kedi 24 saatten uzun hiç yemiyorsa yüksek risk / acil uyarı düşünülmelidir.

---

# 9. Test Türü 02 — İştahsızlık / Yemek Yememe

## 9.1. Kullanıcı Şikayet Örnekleri

- “Mama yemiyor.”
- “İki gündür iştahsız.”
- “Yemek kokluyor ama yemiyor.”
- “Normalden az yiyor.”
- “Su içiyor ama mama yemiyor.”
- “Kedim 24 saattir yemek yemedi.”

## 9.2. Kategori

- Ana kategori: `appetite_digestive`
- Alt kategoriler:
  - `loss_of_appetite`
  - `reduced_food_intake`
  - `anorexia`
  - `selective_eating`

## 9.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `digestive_appetite_basic`
- `hydration_basic`
- Eğer kusma varsa: `vomiting_basic`
- Eğer ağız/salya varsa: `mouth_dental_basic`
- Eğer kilo kaybı varsa: `weight_change_basic`

## 9.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Genel davranış videosu | video | önerilir |
| Ateş ölçümü | measurement | opsiyonel |
| Son kilo bilgisi | measurement | önerilir |
| Mama/su tüketim notu | note | önerilir |
| Ağız fotoğrafı | photo | şikayet ağız/salya içeriyorsa önerilir |

## 9.5. Basic Kit Etkisi

- Dijital derece varsa ateş ölçümü daha görünür önerilir.
- Ağız/damak yakın görüntüsü sadece kullanıcı uygun şekilde çekebiliyorsa önerilir.

## 9.6. Geçmiş Karşılaştırması

- Önceki iştah kayıtları
- Kilo trendi
- Kullanılan ilaçlar
- Kronik böbrek/karaciğer/diabet gibi kullanıcı kaydı
- Son aşı/operasyon bilgisi
- Önceki kusma/ishal kayıtları

## 9.7. Risk Mantığı

- Kedi 24 saatten uzun hiç yemiyorsa yüksek risk.
- İştahsızlık + kusma + halsizlik orta/yüksek risk.
- İştahsızlık + nefes zorluğu / bilinç kaybı / zehirlenme şüphesi acil.
- Yeni mama değişimi ve hafif iştah azalması düşük/orta risk olabilir.

---

# 10. Test Türü 03 — Kusma

## 10.1. Kullanıcı Şikayet Örnekleri

- “Bugün kustu.”
- “Dün geceden beri kusuyor.”
- “Mama yedikten sonra kustu.”
- “Sarı köpük kustu.”
- “Kanlı kusma var.”
- “Sürekli kusuyor.”
- “Kusuyor ve su içemiyor.”

## 10.2. Kategori

- Ana kategori: `appetite_digestive`
- Alt kategoriler:
  - `vomiting`
  - `nausea`
  - `regurgitation_possible`

## 10.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `vomiting_basic`
- `digestive_appetite_basic`
- `hydration_basic`
- `foreign_body_toxin_basic`
- Eğer ishal varsa: `diarrhea_basic`

## 10.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Kusmuk fotoğrafı | photo | opsiyonel |
| Genel davranış videosu | video | önerilir |
| Ateş ölçümü | measurement | opsiyonel |
| Su içme notu | note | önerilir |
| Dışkı fotoğrafı | photo | ishal varsa opsiyonel |

## 10.5. Basic Kit Etkisi

Basic Kit çoğu kusma vakasında şart değildir.

Eğer halsizlik/ateş şikayeti varsa:

- Dijital derece görevi önerilebilir.

## 10.6. Geçmiş Karşılaştırması

- Önceki kusma kayıtları
- Mama değişikliği notları
- İştah kayıtları
- Kilo trendi
- Yabancı cisim yeme geçmişi
- Önceki veteriner raporları

## 10.7. Risk Mantığı

Acil / yüksek risk tetikleyiciler:

- Kanlı kusma
- Sürekli kusma
- Su tutamama
- Şiddetli halsizlik
- Karın şişliği
- Zehirlenme ihtimali
- Yabancı cisim yeme ihtimali
- Kedi/köpekte çok küçük yavru olması

---

# 11. Test Türü 04 — İshal / Dışkı Değişimi / Kabızlık

## 11.1. Kullanıcı Şikayet Örnekleri

- “İshal oldu.”
- “Dışkısı çok sulu.”
- “Dışkısında kan var.”
- “Siyah dışkı yaptı.”
- “Kabız gibi, zorlanıyor.”
- “Dışkı rengi değişti.”
- “Kum kabına sık gidiyor ama dışkı yapamıyor.”

## 11.2. Kategori

- Ana kategori: `urine_stool`
- Alt kategoriler:
  - `diarrhea`
  - `constipation`
  - `stool_color_change`
  - `blood_in_stool`

## 11.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `diarrhea_basic`
- `constipation_basic`
- `hydration_basic`
- `digestive_appetite_basic`
- Eğer idrar karışıklığı varsa: `urination_basic`

## 11.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Dışkı fotoğrafı | photo | opsiyonel |
| Su tüketim notu | note | önerilir |
| Ateş ölçümü | measurement | opsiyonel |
| Genel davranış videosu | video | opsiyonel |
| Kilo bilgisi | measurement | opsiyonel |

## 11.5. Basic Kit Etkisi

- Basic Kit doğrudan dışkı için şart değildir.
- Kullanıcı idrar sorunu da bildirirse idrar strip görevi açılabilir.

## 11.6. Geçmiş Karşılaştırması

- Önceki ishal/kabızlık kayıtları
- Mama değişiklikleri
- Parazit/aşı takibi
- Kilo trendi
- Su tüketim notları
- İlaç geçmişi

## 11.7. Risk Mantığı

Yüksek/acil risk tetikleyiciler:

- Kanlı dışkı
- Siyah katran gibi dışkı
- Şiddetli halsizlik
- Yavru pet
- Su içememe
- 24-48 saatten uzun süren şiddetli ishal
- Karın şişliği/ağrı

---

# 12. Test Türü 05 — Öksürük / Hırıltı / Solunum

## 12.1. Kullanıcı Şikayet Örnekleri

- “Öksürüyor.”
- “Hırıltılı nefes alıyor.”
- “Nefesi hızlı.”
- “Zor nefes alıyor.”
- “Kedim ağzı açık nefes alıyor.”
- “Köpeğim sanki boğazına bir şey kaçmış gibi öksürüyor.”
- “Nefes alırken ses geliyor.”

## 12.2. Kategori

- Ana kategori: `respiratory_cough`
- Alt kategoriler:
  - `cough`
  - `wheezing`
  - `labored_breathing`
  - `rapid_breathing`
  - `choking_possible`

## 12.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `respiratory_red_flags`
- `cough_basic`
- `breathing_basic`
- Eğer kusma/öğürme varsa: `vomiting_basic`
- Eğer alerji/yeni ortam varsa: `environment_exposure_basic`

## 12.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Solunum videosu | video | önerilir |
| Öksürük/hırıltı sesi | audio | önerilir |
| Dinlenme solunum sayısı | measurement | opsiyonel |
| Genel davranış videosu | video | opsiyonel |

## 12.5. Basic Kit Etkisi

- Basic Kit yoksa telefon videosu/sesi yeterli.
- Oksimetre gibi cihazlar MVP kapsamına alınmamalıdır.
- Dijital derece varsa ateş ölçümü opsiyonel önerilir.

## 12.6. Geçmiş Karşılaştırması

- Önceki öksürük/solunum kayıtları
- Alerji notları
- Aşı geçmişi
- Kronik kalp/solunum hastalığı notu
- Son ilaçlar
- Önceki ses kayıtları

## 12.7. Risk Mantığı

Acil tetikleyiciler:

- Nefes almakta zorlanma
- Ağız açık nefes alma, özellikle kedide
- Mor/mavi diş eti veya dil
- Bayılma
- Boğulma/yabancı cisim şüphesi
- Dinlenirken belirgin hızlı ve zor nefes alma

---

# 13. Test Türü 06 — Göz Akıntısı / Kızarıklık / Şişlik

## 13.1. Kullanıcı Şikayet Örnekleri

- “Gözü akıyor.”
- “Gözünde kızarıklık var.”
- “Gözünü kısıyor.”
- “Gözü şişti.”
- “Göz çevresi çapaklı.”
- “Tek gözü kapalı gibi.”
- “Gözüne bir şey kaçmış olabilir.”

## 13.2. Kategori

- Ana kategori: `eye`
- Alt kategoriler:
  - `eye_discharge`
  - `red_eye`
  - `squinting`
  - `swelling`
  - `possible_trauma`

## 13.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `eye_basic`
- `eye_trauma_basic`
- Eğer genel halsizlik varsa: `general_condition_basic`

## 13.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Etkilenen göz fotoğrafı | photo | önerilir |
| İki göz karşılaştırma fotoğrafı | photo | opsiyonel |
| Kısa davranış videosu | video | opsiyonel |

## 13.5. Basic Kit Etkisi

- Basic Kit gerekli değildir.
- Göz için otoskop/mini kamera kullanılmamalıdır.
- Flaş doğrudan göze tutulmamalıdır.

## 13.6. Geçmiş Karşılaştırması

- Önceki göz kayıtları
- Aynı gözde tekrar eden problem
- Fotoğraf karşılaştırması
- Alerji notları
- Son travma/oyun/kaşıma kayıtları

## 13.7. Risk Mantığı

Yüksek/acil risk tetikleyiciler:

- Göz travması
- Gözünü hiç açamama
- Şiddetli ağrı
- Ani görme kaybı şüphesi
- Gözde belirgin bulanıklık/beyazlık
- Kanama
- Şiddetli şişlik

---

# 14. Test Türü 07 — Kulak Kaşıma / Kötü Koku / Akıntı

## 14.1. Kullanıcı Şikayet Örnekleri

- “Kulağını kaşıyor.”
- “Kulağından kötü koku geliyor.”
- “Başını sallıyor.”
- “Kulakta kir/akıntı var.”
- “Kulağına dokununca tepki veriyor.”
- “Kulağı kızarmış.”

## 14.2. Kategori

- Ana kategori: `ear`
- Alt kategoriler:
  - `ear_scratching`
  - `ear_discharge`
  - `ear_smell`
  - `head_shaking`
  - `ear_pain_possible`

## 14.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `ear_basic`
- `pain_basic`
- Eğer denge kaybı varsa: `neurologic_balance_basic`

## 14.4. Medya / Ölçüm Görevleri

Cihazsız kullanıcı:

| Görev | Tip | Öncelik |
|---|---|---|
| Kulak dışı fotoğraf | photo | önerilir |
| Baş sallama videosu | video | opsiyonel |

Basic Kit kullanıcısı:

| Görev | Tip | Öncelik |
|---|---|---|
| Kulak içi kamera görüntüsü | basic_kit/photo | önerilir |
| Kulak dışı fotoğraf | photo | opsiyonel |
| Baş sallama videosu | video | opsiyonel |

## 14.5. Basic Kit Etkisi

Basic Kit bu kategori için yüksek değer sağlar.

Uyarılar:

- Cihaz kulağa zorla sokulmaz.
- Pet acı duyuyorsa işlem durdurulur.
- Kulak zarı, derin kulak kanalı gibi alanlarda kullanıcıya tıbbi yorum yaptırılmaz.
- Görüntü veteriner raporu için kayıt edilir.

## 14.6. Geçmiş Karşılaştırması

- Önceki kulak kayıtları
- Aynı kulakta tekrar
- Önceki kulak fotoğrafları
- Koku/akıntı notları
- Veteriner tedavi geçmişi

## 14.7. Risk Mantığı

Yüksek risk:

- Şiddetli ağrı
- Denge kaybı
- Baş eğik durma
- Kanlı akıntı
- Kulak travması
- Kulağa yabancı cisim şüphesi

---

# 15. Test Türü 08 — Deri / Tüy / Kaşıntı / Yara

## 15.1. Kullanıcı Şikayet Örnekleri

- “Sürekli kaşınıyor.”
- “Derisinde kızarıklık var.”
- “Tüyleri döküldü.”
- “Yara çıktı.”
- “Kabuklanma var.”
- “Pire olabilir.”
- “Derisinde şişlik var.”
- “Bir bölgeyi sürekli yalıyor.”

## 15.2. Kategori

- Ana kategori: `skin_fur`
- Alt kategoriler:
  - `itching`
  - `redness`
  - `hair_loss`
  - `wound`
  - `lump_swelling`
  - `scab`
  - `licking_hotspot_possible`

## 15.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `skin_basic`
- `wound_basic`
- `itching_basic`
- `lump_swelling_basic`
- Eğer ağrı varsa: `pain_basic`

## 15.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Deri/yara fotoğrafı | photo | önerilir |
| Yakın fotoğraf | photo | önerilir |
| Önceki fotoğrafla karşılaştır | comparison | geçmiş varsa önerilir |
| Kaşınma/yalama videosu | video | opsiyonel |
| Ölçek kartı ile fotoğraf | photo | opsiyonel |

## 15.5. Basic Kit Etkisi

Basic Kit veya makro lens varsa:

- Yakın cilt kontrolü açılır.
- Yara alanı, kabuklanma, tüy dökülmesi daha net kaydedilir.
- Kesin teşhis dili kullanılmaz.

## 15.6. Geçmiş Karşılaştırması

- Aynı bölgedeki önceki fotoğraflar
- Yara boyutu değişimi
- Kaşıntı sıklığı
- Alerji notları
- Mama değişimi
- Parazit koruma geçmişi
- Önceki deri veteriner raporları

## 15.7. Risk Mantığı

Yüksek/acil risk:

- Derin yara
- Şiddetli kanama
- Hızla büyüyen şişlik
- Ağrılı, sıcak, akıntılı yara
- Geniş yaygın döküntü + halsizlik
- Zehirli temas ihtimali

---

# 16. Test Türü 09 — Ağız / Diş / Diş Eti / Salya

## 16.1. Kullanıcı Şikayet Örnekleri

- “Ağzı kokuyor.”
- “Diş eti kızarmış.”
- “Çok salya akıtıyor.”
- “Yemek yerken zorlanıyor.”
- “Ağzını açmak istemiyor.”
- “Diş taşı var gibi.”
- “Ağzında yara var.”
- “Dili garip görünüyor.”

## 16.2. Kategori

- Ana kategori: `mouth_dental`
- Alt kategoriler:
  - `bad_breath`
  - `gum_redness`
  - `drooling`
  - `oral_pain`
  - `dental_tartar_possible`
  - `mouth_wound`

## 16.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `mouth_dental_basic`
- `pain_basic`
- Eğer iştahsızlık varsa: `digestive_appetite_basic`
- Eğer zehirlenme/salya varsa: `foreign_body_toxin_basic`

## 16.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Ağız/diş fotoğrafı | photo | önerilir, kullanıcı güvenliyse |
| Diş eti fotoğrafı | photo | opsiyonel |
| Yemek yerken kısa video | video | opsiyonel |
| Ateş ölçümü | measurement | opsiyonel |

## 16.5. Basic Kit Etkisi

- Mini kamera ile ağız içi yakın görüntü opsiyonel olabilir.
- Pet zorlanmamalı.
- Isırma riski varsa işlem yapılmamalı.

## 16.6. Geçmiş Karşılaştırması

- Önceki ağız/diş kayıtları
- İştah değişimi
- Kilo trendi
- Ağız kokusu takip notları
- Diş temizliği/veteriner geçmişi

## 16.7. Risk Mantığı

Yüksek/acil risk:

- Ağızda yabancı cisim
- Şiddetli salya + halsizlik + zehirlenme ihtimali
- Diş eti mor/mavi/çok soluk
- Ağız kanaması
- Yemek yiyememe + halsizlik
- Şiddetli ağrı

---

# 17. Test Türü 10 — İdrar Sorunu

## 17.1. Kullanıcı Şikayet Örnekleri

- “Sık sık kuma gidiyor.”
- “İdrar yapamıyor gibi.”
- “İdrarında kan var.”
- “Çişini kaçırıyor.”
- “Çok su içiyor ve çok idrar yapıyor.”
- “Erkek kedim idrar yapmak için zorlanıyor.”
- “Kum kabında uzun süre kalıyor.”

## 17.2. Kategori

- Ana kategori: `urine_stool`
- Alt kategoriler:
  - `urination_difficulty`
  - `blood_in_urine`
  - `increased_urination`
  - `urinary_accidents`
  - `possible_blockage`

## 17.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `urinary_red_flags`
- `urination_basic`
- `hydration_basic`
- Eğer iştahsızlık/halsizlik varsa: `general_condition_basic`

## 17.4. Medya / Ölçüm Görevleri

Cihazsız:

| Görev | Tip | Öncelik |
|---|---|---|
| Kum kabı / idrar gözlem notu | note | önerilir |
| İdrar rengi fotoğrafı | photo | opsiyonel |
| Genel davranış videosu | video | opsiyonel |

Basic Kit:

| Görev | Tip | Öncelik |
|---|---|---|
| İdrar strip okuma | basic_kit/photo | önerilir |
| Su tüketim notu | note | önerilir |
| Ateş ölçümü | measurement | opsiyonel |

## 17.5. Basic Kit Etkisi

İdrar test stripi bu kategori için yüksek değer sağlar.

Ancak sonuç dili:

- “Protein yüksek çıktı, şu hastalık var” denmez.
- “Protein alanında anormallik olabilir, veteriner değerlendirmesi önerilir” denir.

## 17.6. Geçmiş Karşılaştırması

- Önceki idrar şikayetleri
- İdrar strip geçmişi
- Su tüketim notları
- Kilo trendi
- Kronik böbrek/diabet notları
- Veteriner raporları

## 17.7. Risk Mantığı

Acil:

- Erkek kedide idrar yapamama
- İdrar yapmak için zorlanıp hiç yapamama
- Halsizlik + idrar yapamama
- Ağrı vokalizasyonu + kum kabında uzun süre kalma

Yüksek:

- İdrarda kan
- Sık idrar + ağrı
- Çok su içme + kilo kaybı
- Tekrarlayan idrar sorunu

---

# 18. Test Türü 11 — Topallama / Hareket / Yürüyüş

## 18.1. Kullanıcı Şikayet Örnekleri

- “Topallıyor.”
- “Sol arka ayağına basmıyor.”
- “Merdiven çıkamıyor.”
- “Kalkarken zorlanıyor.”
- “Yürürken dengesiz.”
- “Patisini yalıyor.”
- “Koşmak istemiyor.”
- “Ani topallama başladı.”

## 18.2. Kategori

- Ana kategori: `movement_gait`
- Alt kategoriler:
  - `lameness`
  - `not_bearing_weight`
  - `difficulty_rising`
  - `balance_issue`
  - `paw_pain_possible`

## 18.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `movement_lameness_basic`
- `trauma_basic`
- `pain_basic`
- Eğer denge/nörolojik belirti varsa: `neurologic_balance_basic`

## 18.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Yandan yürüyüş videosu | video | önerilir |
| Önden yürüyüş videosu | video | opsiyonel |
| Pati/bacak fotoğrafı | photo | önerilir |
| Şişlik/yara yakın fotoğrafı | photo | varsa önerilir |
| Genel davranış videosu | video | opsiyonel |

## 18.5. Basic Kit Etkisi

- Basic Kit gerekli değildir.
- Yakın kamera/makro lens varsa pati/yara görüntüsü için kullanılabilir.

## 18.6. Geçmiş Karşılaştırması

- Önceki topallama kayıtları
- Aynı bacak/pati bilgisi
- Video karşılaştırması
- Kilo trendi
- Yaş/kronik eklem notları
- Travma geçmişi

## 18.7. Risk Mantığı

Yüksek/acil:

- Hiç basamama + şiddetli ağrı
- Açık kırık/derin yara şüphesi
- Trafik kazası/düşme
- Ani arka bacak güçsüzlüğü
- Denge kaybı / nörolojik belirti

---

# 19. Test Türü 12 — Ağrı / Dokununca Tepki / İnleme

## 19.1. Kullanıcı Şikayet Örnekleri

- “Dokununca bağırıyor.”
- “Karnına dokundurmuyor.”
- “Kucağa alınca ağlıyor.”
- “Yatarken inliyor.”
- “Bir yerine dokununca tepki veriyor.”
- “Saklanıyor ve dokunmak istemiyor.”

## 19.2. Kategori

- Ana kategori: `general`
- Alt kategoriler:
  - `pain`
  - `touch_sensitivity`
  - `abdominal_pain_possible`
  - `injury_possible`

## 19.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `pain_basic`
- `trauma_basic`
- Bölgeye göre ek:
  - karın: `digestive_abdominal_basic`
  - bacak: `movement_lameness_basic`
  - ağız: `mouth_dental_basic`
  - kulak: `ear_basic`

## 19.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Genel davranış videosu | video | önerilir |
| Ağrılı bölge fotoğrafı | photo | varsa önerilir |
| Ateş ölçümü | measurement | opsiyonel |
| Not | note | önerilir |

## 19.5. Basic Kit Etkisi

Bölgeye göre değişir:

- Kulak ağrısı: kulak kamerası
- Deri/yara: yakın görüntü
- Ağız: dikkatli ağız fotoğrafı

## 19.6. Geçmiş Karşılaştırması

- Önceki ağrı/topallama kayıtları
- Travma notları
- Kronik hastalık
- İlaç geçmişi
- Operasyon geçmişi

## 19.7. Risk Mantığı

Acil/yüksek:

- Şiddetli ağrı
- Travma
- Karın şişliği
- Nefes zorluğu
- Bilinç değişimi
- Hiç hareket edememe

---

# 20. Test Türü 13 — Nörolojik / Denge / Nöbet / Titreme

## 20.1. Kullanıcı Şikayet Örnekleri

- “Nöbet geçirdi.”
- “Titriyor.”
- “Dengesi bozuk.”
- “Yürürken düşüyor.”
- “Kafası eğik duruyor.”
- “Gözleri garip hareket ediyor.”
- “Birden yere yığıldı.”
- “Arka bacakları tutmuyor.”

## 20.2. Kategori

- Ana kategori: `behavior`
- Alt kategoriler:
  - `seizure`
  - `tremor`
  - `balance_issue`
  - `collapse`
  - `hind_limb_weakness`

## 20.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `neurologic_red_flags`
- `neurologic_balance_basic`
- `seizure_basic`
- `toxin_exposure_basic`

## 20.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Nöbet/titreme videosu | video | varsa, güvenliyse |
| Yürüyüş/dengesizlik videosu | video | önerilir |
| Genel davranış videosu | video | önerilir |
| Zehirlenme ihtimali notu | note | önerilir |

## 20.5. Basic Kit Etkisi

Basic Kit şart değildir.

## 20.6. Geçmiş Karşılaştırması

- Önceki nöbet/titreme kayıtları
- İlaç geçmişi
- Toksin/zehirlenme notları
- Kronik hastalıklar
- Önceki acil raporları

## 20.7. Risk Mantığı

Acil:

- Aktif nöbet
- Tekrarlayan nöbet
- Bilinç kaybı
- Şiddetli dengesizlik
- Zehirlenme ihtimali
- Ani arka bacak güçsüzlüğü
- Nefes zorluğu ile birlikte nörolojik belirti

---

# 21. Test Türü 14 — Zehirlenme / Yabancı Cisim / Tehlikeli Madde

## 21.1. Kullanıcı Şikayet Örnekleri

- “Çikolata yedi.”
- “İlaç yuttu.”
- “Zehirli bir şey yemiş olabilir.”
- “Temizlik malzemesi yaladı.”
- “Oyuncak parçası yuttu.”
- “Kemik yuttu.”
- “Bitki yedi.”
- “Ağzından köpük geliyor.”

## 21.2. Kategori

- Ana kategori: `general`
- Alt kategoriler:
  - `toxic_ingestion`
  - `foreign_body`
  - `oral_irritation`
  - `poisoning_possible`

## 21.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `foreign_body_toxin_basic`
- `vomiting_basic`
- `neurologic_red_flags`
- `mouth_dental_basic`

## 21.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Yenen madde/ambalaj fotoğrafı | photo | önerilir |
| Kusmuk fotoğrafı | photo | varsa opsiyonel |
| Genel davranış videosu | video | opsiyonel |
| Madde miktarı notu | note | önerilir |

## 21.5. Basic Kit Etkisi

Basic Kit gerekli değildir.

## 21.6. Geçmiş Karşılaştırması

- Önceki zehirlenme/yabancı cisim kayıtları
- Kronik hastalık
- Kilo
- İlaçlar
- Önceki kusma kayıtları

## 21.7. Risk Mantığı

Zehirlenme ve yabancı cisim şüphesinde uygulama çok temkinli olmalıdır.

Çoğu durumda:

- `Acil veteriner değerlendirmesi gerekebilir` mesajı verilir.
- Kullanıcı analiz bekletilmez.
- Madde fotoğrafı ve miktar bilgisi rapora eklenir.

---

# 22. Test Türü 15 — Kilo Değişimi / Zayıflama / Obezite Takibi

## 22.1. Kullanıcı Şikayet Örnekleri

- “Kilo verdi.”
- “Çok zayıfladı.”
- “Kilo aldı.”
- “Şişmanladı.”
- “Mama miktarı aynı ama kilo kaybediyor.”
- “Karnı büyüdü.”
- “Vücut kondisyonunu takip etmek istiyorum.”

## 22.2. Kategori

- Ana kategori: `general`
- Alt kategoriler:
  - `weight_loss`
  - `weight_gain`
  - `body_condition`
  - `chronic_tracking`

## 22.3. Çağrılacak Soru Setleri

- `weight_change_basic`
- `digestive_appetite_basic`
- `hydration_basic`
- `general_condition_basic`
- Eğer çok su içme varsa: `urination_basic`

## 22.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Kilo ölçümü | measurement | önerilir |
| Üstten vücut fotoğrafı | photo | opsiyonel |
| Yandan vücut fotoğrafı | photo | opsiyonel |
| Mama miktarı notu | note | önerilir |
| Aktivite notu | note | opsiyonel |

## 22.5. Basic Kit Etkisi

Basic Kit gerekli değildir.

## 22.6. Geçmiş Karşılaştırması

- Kilo trendi
- İştah notları
- Su tüketimi
- Aktivite notları
- Kronik hastalık kayıtları
- Veteriner raporları

## 22.7. Risk Mantığı

Yüksek risk:

- Hızlı kilo kaybı
- Kilo kaybı + çok su içme + çok idrar
- Kilo kaybı + iştahsızlık
- Karın şişliği
- Halsizlik

---

# 23. Test Türü 16 — Aşı / İlaç Sonrası Takip

## 23.1. Kullanıcı Şikayet Örnekleri

- “Aşıdan sonra halsiz.”
- “İlaçtan sonra kustu.”
- “Yeni ilaca başladık, iştahsız oldu.”
- “Aşı yerinde şişlik var.”
- “İlaç sonrası kaşıntı başladı.”

## 23.2. Kategori

- Ana kategori: `general`
- Alt kategoriler:
  - `post_vaccine`
  - `medication_reaction_possible`
  - `injection_site_swelling`
  - `side_effect_tracking`

## 23.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `post_vaccine_medication_basic`
- `skin_basic`
- `vomiting_basic`
- `respiratory_red_flags`

## 23.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Aşı/şişlik bölgesi fotoğrafı | photo | varsa önerilir |
| Genel davranış videosu | video | opsiyonel |
| Ateş ölçümü | measurement | opsiyonel |
| İlaç/aşı adı notu | note | önerilir |

## 23.5. Basic Kit Etkisi

- Dijital derece varsa ateş ölçümü önerilir.
- Yakın cilt fotoğrafı Basic Kit/makro lens ile desteklenebilir.

## 23.6. Geçmiş Karşılaştırması

- Aşı takvimi
- İlaç geçmişi
- Önceki alerjik reaksiyonlar
- Önceki ateş/halsizlik kayıtları

## 23.7. Risk Mantığı

Acil:

- Nefes zorluğu
- Yüz/göz çevresinde hızlı şişme
- Şiddetli halsizlik/çökme
- Tekrarlayan kusma
- Nöbet
- Şiddetli alerji şüphesi

---

# 24. Test Türü 17 — Operasyon / Tedavi Sonrası Takip

## 24.1. Kullanıcı Şikayet Örnekleri

- “Ameliyat yerini yalıyor.”
- “Dikiş bölgesi kızardı.”
- “Operasyondan sonra yemek yemiyor.”
- “Yara yerinde akıntı var.”
- “Tedavi sonrası takip yapmak istiyorum.”

## 24.2. Kategori

- Ana kategori: `skin_fur`
- Alt kategoriler:
  - `post_operation`
  - `wound_followup`
  - `recovery_tracking`
  - `suture_site`

## 24.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `post_operation_basic`
- `wound_basic`
- `general_condition_basic`
- `digestive_appetite_basic`

## 24.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Operasyon/yara yeri fotoğrafı | photo | önerilir |
| Yakın fotoğraf | photo | önerilir |
| Ateş ölçümü | measurement | opsiyonel |
| Genel davranış videosu | video | opsiyonel |
| İlaç kullanım notu | note | önerilir |

## 24.5. Basic Kit Etkisi

- Yakın cilt/yara kontrolü faydalı olabilir.
- Dijital derece ile ateş takibi önerilebilir.

## 24.6. Geçmiş Karşılaştırması

- Önceki yara fotoğrafları
- Operasyon tarihi
- İlaçlar
- Ateş trendi
- İştah/halsizlik notları
- Veteriner raporu

## 24.7. Risk Mantığı

Yüksek/acil:

- Şiddetli kanama
- Dikiş açılması
- Kötü kokulu akıntı
- Ateş + halsizlik
- Şiddetli ağrı
- Yemek yememe + çökme

---

# 25. Test Türü 18 — Gebelik / Doğum / Yavru Takibi

## 25.1. Kullanıcı Şikayet Örnekleri

- “Hamile olabilir.”
- “Doğum başladı mı?”
- “Doğumdan sonra halsiz.”
- “Yavrular emiyor mu bilmiyorum.”
- “Yavru kilo almıyor.”

## 25.2. Kategori

- Ana kategori: `general`
- Alt kategoriler:
  - `pregnancy_possible`
  - `birth_followup`
  - `newborn_followup`

## 25.3. Çağrılacak Soru Setleri

- `red_flags_general`
- `pregnancy_birth_basic`
- `general_condition_basic`
- `appetite_digestive_basic`
- Yavru için: `newborn_basic`

## 25.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Genel davranış videosu | video | opsiyonel |
| Kilo ölçümü | measurement | önerilir |
| Ateş ölçümü | measurement | opsiyonel |
| Doğum/yavru notu | note | önerilir |

## 25.5. Basic Kit Etkisi

Basic Kit çoğunlukla gerekli değildir.

## 25.6. Geçmiş Karşılaştırması

- Gebelik notları
- Kilo trendi
- Yavruların kilo trendi
- Veteriner raporları
- Aşı/ilaç geçmişi

## 25.7. Risk Mantığı

Bu alan hassastır. Uygulama çok temkinli olmalıdır.

Acil:

- Doğumda uzun süre ilerleme olmaması
- Şiddetli kanama
- Anne aşırı halsiz/çökük
- Yavru nefes almıyor / ememiyor
- Ateş + kötü kokulu akıntı

---

# 26. Test Türü 19 — Yaşlı Pet / Kronik Hastalık Takibi

## 26.1. Kullanıcı Şikayet Örnekleri

- “Yaşlı köpeğimi takip etmek istiyorum.”
- “Kronik böbrek hastalığı var.”
- “Şeker hastası, su içmesi arttı.”
- “Kalp hastası, öksürüğü arttı.”
- “Hareketleri azaldı.”

## 26.2. Kategori

- Ana kategori: `chronic_tracking`
- Alt kategoriler:
  - `senior_pet`
  - `kidney_followup`
  - `diabetes_followup`
  - `heart_followup`
  - `mobility_followup`

## 26.3. Çağrılacak Soru Setleri

Kronik bilgiye göre:

- `general_condition_basic`
- `weight_change_basic`
- `hydration_basic`
- `urination_basic`
- `respiratory_cough_basic`
- `movement_lameness_basic`
- `medication_followup_basic`

## 26.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Kilo ölçümü | measurement | önerilir |
| Su tüketimi notu | note | önerilir |
| İdrar notu / strip | measurement/basic_kit | Basic Kit varsa önerilir |
| Solunum videosu | video | solunum şikayeti varsa |
| Yürüyüş videosu | video | hareket şikayeti varsa |
| İlaç kullanım notu | note | önerilir |

## 26.5. Basic Kit Etkisi

- İdrar strip
- Ateş ölçümü
- Yakın cilt/yara görüntüsü

## 26.6. Geçmiş Karşılaştırması

Bu türde geçmiş çok önemlidir:

- Kilo trendi
- Su tüketimi
- İdrar kayıtları
- Öksürük sıklığı
- Aktivite değişimi
- İlaç düzeni
- Veteriner raporları

## 26.7. Risk Mantığı

Kronik hastalıkta ufak değişimler bile önemli olabilir. Uygulama “geçmişe göre sapma” mantığını özellikle kullanmalıdır.

---

# 27. Test Türü 20 — Rutin Kontrol / Sağlık Dosyası Güncelleme

## 27.1. Kullanıcı Şikayet Örnekleri

- “Rutin kontrol yapmak istiyorum.”
- “Bugün bir sorun yok, kayıt tutmak istiyorum.”
- “Aylık sağlık kontrolü.”
- “Kilo ve genel durum kaydı ekleyeceğim.”

## 27.2. Kategori

- Ana kategori: `routine_check`
- Alt kategoriler:
  - `wellness`
  - `health_record_update`
  - `monthly_check`

## 27.3. Çağrılacak Soru Setleri

- `routine_wellness_basic`
- `general_condition_basic`
- `weight_change_basic`
- İsteğe bağlı:
  - `skin_basic`
  - `dental_basic`
  - `activity_behavior_basic`

## 27.4. Medya / Ölçüm Görevleri

| Görev | Tip | Öncelik |
|---|---|---|
| Kilo ölçümü | measurement | önerilir |
| Genel vücut fotoğrafı | photo | opsiyonel |
| Davranış/aktivite notu | note | opsiyonel |
| Aşı/ilaç kontrolü | checklist | önerilir |
| Diş/göz/deri hızlı fotoğraf | photo | opsiyonel |

## 27.5. Basic Kit Etkisi

- İdrar strip, ateş ölçümü, kulak kontrolü opsiyonel rutin kontrol olarak sunulabilir.
- Kullanıcıya gereksiz test baskısı yapılmamalıdır.

## 27.6. Geçmiş Karşılaştırması

- Önceki rutin kayıtlar
- Kilo trendi
- Aşı/ilaç takvimi
- Takip edilen sorunlar
- Kronik hastalıklar

## 27.7. Risk Mantığı

Rutin kontrolde amaç risk yaratmak değil, baz çizgi oluşturmaktır.

---

# 28. Hızlı Belirti Chip Eşleme Tablosu

| Chip | Ana Kategori | Soru Setleri | Görevler |
|---|---|---|---|
| İştahsız | `appetite_digestive` | `digestive_appetite_basic`, `hydration_basic` | davranış videosu, kilo, ateş |
| Kusma | `appetite_digestive` | `vomiting_basic`, `foreign_body_toxin_basic` | kusmuk foto, davranış video |
| İshal | `urine_stool` | `diarrhea_basic`, `hydration_basic` | dışkı foto, su notu |
| Halsizlik | `general` | `general_condition_basic`, `activity_behavior_basic` | davranış video, ateş |
| Öksürük | `respiratory_cough` | `cough_basic`, `respiratory_red_flags` | ses, solunum video |
| Hırıltı | `respiratory_cough` | `breathing_basic`, `respiratory_red_flags` | ses, solunum video |
| Topallama | `movement_gait` | `movement_lameness_basic`, `trauma_basic` | yürüyüş video, pati foto |
| Kaşıntı | `skin_fur` | `itching_basic`, `skin_basic` | deri foto, kaşınma video |
| Göz akıntısı | `eye` | `eye_basic` | göz foto |
| Kulak kaşıma | `ear` | `ear_basic` | kulak foto / kit kamera |
| Ağız kokusu | `mouth_dental` | `mouth_dental_basic` | ağız foto |
| Çok su içme | `urine_stool` | `hydration_basic`, `urination_basic`, `weight_change_basic` | su notu, kilo, idrar strip |
| İdrar sorunu | `urine_stool` | `urinary_red_flags`, `urination_basic` | idrar notu, strip |
| Dışkı değişimi | `urine_stool` | `diarrhea_basic`, `constipation_basic` | dışkı foto |
| Yara / şişlik | `skin_fur` | `wound_basic`, `lump_swelling_basic` | yara foto, yakın görüntü |
| Davranış değişimi | `behavior` | `activity_behavior_basic`, `general_condition_basic` | davranış video |

---

# 29. Dosya 2 İçeriği

Bu dosyanın devamı olan **Dosya 2** içinde detaylı soru kütüphanesi verilecektir:

- Red flag soru setleri
- Genel durum soru setleri
- İştah/kusma/ishal soru setleri
- Solunum/öksürük soru setleri
- Göz/kulak/deri/ağız soru setleri
- İdrar/dışkı soru setleri
- Hareket/topallama soru setleri
- Nörolojik/zehirlenme soru setleri
- Kronik/rutin takip soru setleri
- Görev kütüphanesi
- JSON/TypeScript veri şeması önerisi
