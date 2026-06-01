# Pati Sağlık — Soru Kütüphanesi, Görev Kütüphanesi ve AI Seçim Kuralları — Dosya 2

> **Devam Dosyasıdır.**  
> Bu dosya, `Pati Sağlık — Test / Şikayet Türleri ve Akıllı Muayene Kütüphanesi — Dosya 1` dosyasının devamıdır.
>
> Dosya 1’de test/şikayet türleri tanımlanmıştır. Bu dosyada uygulamanın kullanacağı detaylı **soru kütüphanesi**, **görev kütüphanesi**, **AI seçim kuralları**, **cevap tipleri**, **red flag tetikleyicileri** ve **veri şeması önerileri** yer alır.
>
> **Temel ilke:**  
> AI serbest tıbbi soru üretmez. AI, bu dosyada tanımlanan soru setlerinden uygun olanları seçer.

---

# 1. Soru Nesnesi Standart Şeması

Her soru aşağıdaki yapıya uygun tanımlanmalıdır.

```json
{
  "id": "vomiting_count_24h",
  "question_set_id": "vomiting_basic",
  "category": "appetite_digestive",
  "text_key": "questions.vomiting.count24h",
  "type": "single_choice",
  "required": true,
  "options": [
    {
      "value": "none",
      "label_key": "common.none"
    },
    {
      "value": "once",
      "label_key": "common.once"
    }
  ],
  "red_flag_values": ["four_plus", "continuous"],
  "risk_weight": {
    "none": 0,
    "once": 1,
    "two_three": 2,
    "four_plus": 4,
    "continuous": 5
  },
  "followup_question_ids": [],
  "task_triggers": [
    {
      "if_value_in": ["two_three", "four_plus", "continuous"],
      "task_key": "vomit_photo",
      "priority": "optional"
    }
  ]
}
```

---

# 2. Cevap Tipleri

## 2.1. `single_choice`

Tek seçenek seçilir.

Örnek:

```json
{
  "type": "single_choice",
  "options": ["yes", "no", "unknown"]
}
```

## 2.2. `multi_choice`

Birden fazla seçenek seçilebilir.

## 2.3. `number`

Sayısal değer girilir.

Örnek:

- Ateş: °C
- Kilo: kg
- Kusma sayısı
- Solunum sayısı

## 2.4. `text`

Serbest not.

## 2.5. `scale`

1-5 veya 1-10 arası şiddet.

## 2.6. `duration`

Süre seçimi.

Örnek:

- Bugün başladı
- 1-2 gündür
- 3-7 gündür
- 1 haftadan uzun
- Emin değilim

## 2.7. `body_location`

Vücut bölgesi seçimi.

Örnek:

- Sağ ön bacak
- Sol arka bacak
- Sağ kulak
- Sol göz
- Karın
- Sırt
- Kuyruk
- Ağız

---

# 3. Ortak Seçenek Sözlüğü

Uygulamada tekrar eden cevap seçenekleri ortak sözlükten gelmelidir.

```json
{
  "common.yes": "Evet",
  "common.no": "Hayır",
  "common.unknown": "Emin değilim",
  "common.not_observed": "Gözlemlemedim",
  "common.none": "Yok",
  "common.mild": "Hafif",
  "common.moderate": "Orta",
  "common.severe": "Şiddetli",
  "common.today": "Bugün başladı",
  "common.one_two_days": "1-2 gündür",
  "common.three_seven_days": "3-7 gündür",
  "common.more_than_week": "1 haftadan uzun",
  "common.once": "1 kez",
  "common.two_three": "2-3 kez",
  "common.four_plus": "4 veya daha fazla",
  "common.continuous": "Sürekli"
}
```

---

# 4. Soru Seti 01 — Genel Acil Belirti Kontrolü

## ID

`red_flags_general`

## Ne Zaman Çağrılır?

- Tüm yeni sağlık kontrollerinde kısa versiyon çağrılabilir.
- Özellikle halsizlik, kusma, solunum, idrar, travma, nörolojik belirtilerde zorunludur.

## Sorular

### RF-GEN-01 — Nefes Zorluğu

- ID: `rf_breathing_difficulty`
- Soru: `Nefes almakta zorlanıyor mu?`
- Tip: `single_choice`
- Seçenekler:
  - Evet
  - Hayır
  - Emin değilim
- Acil tetikleyici:
  - Evet
- Risk:
  - Evet: acil
  - Emin değilim: yüksek

### RF-GEN-02 — Bayılma / Bilinç Kaybı

- ID: `rf_collapse_unconscious`
- Soru: `Bayılma, yere yığılma veya bilinç kaybı oldu mu?`
- Tip: `single_choice`
- Acil:
  - Evet

### RF-GEN-03 — Nöbet

- ID: `rf_seizure`
- Soru: `Nöbet, kasılma veya kontrolsüz titreme oldu mu?`
- Tip: `single_choice`
- Acil:
  - Evet

### RF-GEN-04 — Şiddetli Kanama

- ID: `rf_severe_bleeding`
- Soru: `Şiddetli veya durmayan kanama var mı?`
- Tip: `single_choice`
- Acil:
  - Evet

### RF-GEN-05 — Zehirlenme İhtimali

- ID: `rf_toxic_ingestion`
- Soru: `Zehirli olabilecek bir şey yeme/içme ihtimali var mı?`
- Tip: `single_choice`
- Acil:
  - Evet

### RF-GEN-06 — İdrar Yapamama

- ID: `rf_unable_to_urinate`
- Soru: `İdrar yapmak istiyor ama hiç yapamıyor gibi mi?`
- Tip: `single_choice`
- Acil:
  - Evet

### RF-GEN-07 — Büyük Travma

- ID: `rf_major_trauma`
- Soru: `Trafik kazası, yüksekten düşme veya ciddi darbe oldu mu?`
- Tip: `single_choice`
- Acil:
  - Evet

### RF-GEN-08 — Diş Eti Rengi

- ID: `rf_gum_color_abnormal`
- Soru: `Diş etleri mor, mavi, gri veya çok soluk görünüyor mu?`
- Tip: `single_choice`
- Acil:
  - Evet
- Görev tetikleyici:
  - `mouth_gum_photo` opsiyonel, fakat kullanıcıyı oyalamayacak şekilde

### RF-GEN-09 — Şiddetli Ağrı

- ID: `rf_severe_pain`
- Soru: `Dokununca şiddetli ağrı, çığlık veya aşırı tepki veriyor mu?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek/acil

### RF-GEN-10 — Çok Kötü Genel Durum

- ID: `rf_extreme_weakness`
- Soru: `Ayağa kalkamayacak kadar halsiz veya tepkisiz mi?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek/acil

---

# 5. Soru Seti 02 — Solunum Acil Kontrolü

## ID

`respiratory_red_flags`

## Ne Zaman Çağrılır?

- Öksürük
- Hırıltı
- Zor nefes alma
- Hızlı nefes alma
- Ağız açık nefes alma
- Boğulma/yabancı cisim şüphesi

## Sorular

### RESP-RF-01

- ID: `resp_open_mouth_breathing`
- Soru: `Ağzı açık şekilde nefes alıyor mu?`
- Kedi için:
  - Evet: acil
- Köpek için:
  - Evet + halsizlik/morarma/zorlanma varsa acil

### RESP-RF-02

- ID: `resp_blue_tongue_gums`
- Soru: `Dili veya diş etleri mor/mavi görünüyor mu?`
- Evet: acil

### RESP-RF-03

- ID: `resp_labored_resting`
- Soru: `Dinlenirken bile nefes almakta zorlanıyor mu?`
- Evet: acil/yüksek

### RESP-RF-04

- ID: `resp_choking_possible`
- Soru: `Boğazına bir şey kaçmış veya tıkanmış gibi mi?`
- Evet: acil

### RESP-RF-05

- ID: `resp_fainting`
- Soru: `Öksürük veya nefes zorluğu sırasında bayılma oldu mu?`
- Evet: acil

---

# 6. Soru Seti 03 — İdrar Acil Kontrolü

## ID

`urinary_red_flags`

## Ne Zaman Çağrılır?

- İdrar yapamama
- Sık kum kabına gitme
- Kanlı idrar
- Erkek kedide zorlanma
- Ağrılı idrar

## Sorular

### UR-RF-01

- ID: `ur_no_urine`
- Soru: `İdrar yapmak için zorlanıyor ama hiç idrar yapamıyor mu?`
- Evet: acil

### UR-RF-02

- ID: `ur_male_cat_straining`
- Soru: `Pet erkek kedi ise kum kabında zorlanıp idrar yapamıyor gibi mi?`
- Evet: acil

### UR-RF-03

- ID: `ur_pain_vocalization`
- Soru: `İdrar yapmaya çalışırken miyavlama/ağlama/acı belirtisi var mı?`
- Evet: yüksek/acil

### UR-RF-04

- ID: `ur_blood_visible`
- Soru: `İdrarda gözle görülen kan var mı?`
- Evet: yüksek

### UR-RF-05

- ID: `ur_lethargy_with_urinary`
- Soru: `İdrar sorunu ile birlikte belirgin halsizlik var mı?`
- Evet: yüksek/acil

---

# 7. Soru Seti 04 — Genel Durum

## ID

`general_condition_basic`

## Sorular

### GEN-01

- ID: `gen_duration`
- Soru: `Bu durum ne zamandır var?`
- Tip: `duration`

### GEN-02

- ID: `gen_activity_level`
- Soru: `Hareketliliği normalden az mı?`
- Tip: `single_choice`
- Seçenekler:
  - Hayır, normal
  - Biraz az
  - Belirgin az
  - Neredeyse hiç hareket etmiyor
  - Emin değilim
- Risk:
  - Belirgin az: orta
  - Neredeyse hiç: yüksek/acil

### GEN-03

- ID: `gen_response`
- Soru: `Size ve çevresine tepkisi normal mi?`
- Tip: `single_choice`
- Seçenekler:
  - Normal
  - Daha sakin
  - Saklanıyor/kaçıyor
  - Tepkisiz gibi
  - Emin değilim

### GEN-04

- ID: `gen_appetite_change`
- Soru: `İştahında değişiklik var mı?`
- Tip: `single_choice`
- Seçenekler:
  - Normal
  - Azaldı
  - Hiç yemiyor
  - Arttı
  - Emin değilim
- Follow-up:
  - Azaldı / hiç yemiyor → `digestive_appetite_basic`

### GEN-05

- ID: `gen_water_change`
- Soru: `Su içmesinde belirgin değişiklik var mı?`
- Tip: `single_choice`
- Seçenekler:
  - Normal
  - Daha az içiyor
  - Daha çok içiyor
  - Hiç içmiyor
  - Emin değilim
- Follow-up:
  - Daha çok içiyor → `hydration_basic`, `urination_basic`, `weight_change_basic`
  - Hiç içmiyor → orta/yüksek

### GEN-06

- ID: `gen_temperature_known`
- Soru: `Ateş ölçtünüz mü?`
- Tip: `single_choice`
- Seçenekler:
  - Hayır
  - Evet, normal
  - Evet, yüksek
  - Evet, düşük
  - Emin değilim
- Task:
  - Hayır → `temperature_measurement` opsiyonel

### GEN-07

- ID: `gen_pain_signs`
- Soru: `Ağrı belirtisi fark ettiniz mi?`
- Tip: `single_choice`
- Seçenekler:
  - Hayır
  - Dokununca tepki veriyor
  - İnliyor/sızlanıyor
  - Saklanıyor
  - Emin değilim
- Follow-up:
  - Evet seçenekleri → `pain_basic`

### GEN-08

- ID: `gen_recent_change`
- Soru: `Son günlerde mama, ilaç, ortam veya rutin değişikliği oldu mu?`
- Tip: `multi_choice`
- Seçenekler:
  - Mama değişti
  - Yeni ilaç
  - Aşı oldu
  - Taşınma/seyahat
  - Yeni pet/insan
  - Temizlik/kimyasal temas
  - Değişiklik yok
  - Emin değilim

---

# 8. Soru Seti 05 — Aktivite / Davranış

## ID

`activity_behavior_basic`

## Sorular

### ACT-01

- ID: `act_sleeping_more`
- Soru: `Normalden daha fazla uyuyor mu?`
- Tip: `single_choice`

### ACT-02

- ID: `act_hiding`
- Soru: `Saklanma, kaçma veya yalnız kalma isteği arttı mı?`
- Tip: `single_choice`

### ACT-03

- ID: `act_aggression`
- Soru: `Normalden daha agresif veya huzursuz mu?`
- Tip: `single_choice`

### ACT-04

- ID: `act_play_interest`
- Soru: `Oyun veya yürüyüş isteği azaldı mı?`
- Tip: `single_choice`

### ACT-05

- ID: `act_video_available`
- Soru: `Bu davranışı gösteren kısa bir video eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `behavior_video`

---

# 9. Soru Seti 06 — İştah

## ID

`digestive_appetite_basic`

## Sorular

### APP-01

- ID: `appetite_duration`
- Soru: `İştah değişikliği ne zamandır var?`
- Tip: `duration`

### APP-02

- ID: `appetite_level`
- Soru: `Ne kadar yemek yiyor?`
- Tip: `single_choice`
- Seçenekler:
  - Normal
  - Normalden az
  - Çok az
  - Hiç yemiyor
  - Sadece ödül/mama seçiyor
  - Emin değilim
- Risk:
  - Hiç yemiyor + kedi + 24 saatten uzun: yüksek/acil

### APP-03

- ID: `appetite_water`
- Soru: `Su içmesi nasıl?`
- Tip: `single_choice`
- Seçenekler:
  - Normal
  - Azaldı
  - Arttı
  - Hiç içmiyor
  - Emin değilim

### APP-04

- ID: `appetite_interest`
- Soru: `Mamaya ilgi gösterip sonra vazgeçiyor mu?`
- Tip: `single_choice`
- Follow-up:
  - Evet → ağız/diş veya bulantı şüphesi; `mouth_dental_basic`, `vomiting_basic` opsiyonel

### APP-05

- ID: `appetite_mouth_pain`
- Soru: `Yemek yerken ağzını kullanmakta zorlanıyor, ağzını patiliyor veya salya akıtıyor mu?`
- Tip: `single_choice`
- Follow-up:
  - Evet → `mouth_dental_basic`

### APP-06

- ID: `appetite_weight_loss`
- Soru: `Son dönemde kilo kaybı fark ettiniz mi?`
- Tip: `single_choice`
- Follow-up:
  - Evet → `weight_change_basic`

### APP-07

- ID: `appetite_food_change`
- Soru: `Son günlerde mama veya beslenme düzeni değişti mi?`
- Tip: `single_choice`

---

# 10. Soru Seti 07 — Kusma

## ID

`vomiting_basic`

## Sorular

### VOM-01

- ID: `vomiting_started`
- Soru: `Kusma ne zaman başladı?`
- Tip: `duration`

### VOM-02

- ID: `vomiting_count_24h`
- Soru: `Son 24 saatte kaç kez kustu?`
- Tip: `single_choice`
- Seçenekler:
  - Hiç
  - 1 kez
  - 2-3 kez
  - 4 veya daha fazla
  - Sürekli kusuyor
  - Emin değilim
- Risk:
  - 4 veya daha fazla: yüksek
  - Sürekli kusuyor: acil/yüksek
- Task:
  - 2-3 kez veya üzeri → `vomit_photo` opsiyonel

### VOM-03

- ID: `vomiting_blood`
- Soru: `Kusmukta kan veya kahve telvesi gibi koyu parçalar gördünüz mü?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek/acil

### VOM-04

- ID: `vomiting_color`
- Soru: `Kusmuk daha çok nasıl görünüyor?`
- Tip: `single_choice`
- Seçenekler:
  - Mama gibi
  - Sarı/safra gibi
  - Köpüklü
  - Kanlı
  - Yabancı madde var
  - Bilmiyorum
- Risk:
  - Kanlı: yüksek
  - Yabancı madde var: yüksek

### VOM-05

- ID: `vomiting_water_keep`
- Soru: `Su içtiğinde de kusuyor mu?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek

### VOM-06

- ID: `vomiting_foreign_body`
- Soru: `Oyuncak, ip, kemik, çöp veya yabancı cisim yeme ihtimali var mı?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek/acil
- Follow-up:
  - Evet → `foreign_body_toxin_basic`

### VOM-07

- ID: `vomiting_with_diarrhea`
- Soru: `İshal de var mı?`
- Tip: `single_choice`
- Follow-up:
  - Evet → `diarrhea_basic`

### VOM-08

- ID: `vomiting_lethargy`
- Soru: `Kusma ile birlikte belirgin halsizlik var mı?`
- Tip: `single_choice`
- Risk:
  - Evet: orta/yüksek

---

# 11. Soru Seti 08 — İshal

## ID

`diarrhea_basic`

## Sorular

### DIA-01

- ID: `diarrhea_duration`
- Soru: `İshal ne zamandır var?`
- Tip: `duration`

### DIA-02

- ID: `diarrhea_frequency`
- Soru: `Son 24 saatte kaç kez sulu dışkı yaptı?`
- Tip: `single_choice`
- Seçenekler:
  - 1 kez
  - 2-3 kez
  - 4+ kez
  - Çok sık / tutamıyor
  - Emin değilim

### DIA-03

- ID: `diarrhea_blood`
- Soru: `Dışkıda kan gördünüz mü?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek

### DIA-04

- ID: `diarrhea_black`
- Soru: `Dışkı siyah, katran gibi veya çok koyu görünüyor mu?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek/acil

### DIA-05

- ID: `diarrhea_mucus`
- Soru: `Dışkıda mukus/jölemsi yapı var mı?`
- Tip: `single_choice`

### DIA-06

- ID: `diarrhea_appetite`
- Soru: `İştahı nasıl?`
- Tip: `single_choice`
- Follow-up:
  - Azaldı/hiç yemiyor → `digestive_appetite_basic`

### DIA-07

- ID: `diarrhea_hydration`
- Soru: `Su içmesi normal mi?`
- Tip: `single_choice`
- Follow-up:
  - Azaldı/hiç içmiyor → `hydration_basic`

### DIA-08

- ID: `diarrhea_photo`
- Soru: `Dışkı fotoğrafı eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `stool_photo`

---

# 12. Soru Seti 09 — Kabızlık / Dışkı Yapamama

## ID

`constipation_basic`

## Sorular

### CON-01

- ID: `constipation_duration`
- Soru: `Ne zamandır dışkı yapmadı veya zorlanıyor?`
- Tip: `duration`

### CON-02

- ID: `constipation_straining`
- Soru: `Dışkı yapmak için zorlanıyor mu?`
- Tip: `single_choice`

### CON-03

- ID: `constipation_pain`
- Soru: `Zorlanırken ağrı, miyavlama veya inleme var mı?`
- Tip: `single_choice`
- Risk:
  - Evet: orta/yüksek

### CON-04

- ID: `constipation_vomit`
- Soru: `Kusma da var mı?`
- Tip: `single_choice`
- Follow-up:
  - Evet → `vomiting_basic`

### CON-05

- ID: `constipation_appetite`
- Soru: `İştahında azalma var mı?`
- Tip: `single_choice`

### CON-06

- ID: `constipation_urine_confusion`
- Soru: `Bu durum idrar yapamama ile karışıyor olabilir mi?`
- Tip: `single_choice`
- Follow-up:
  - Evet/Emin değilim → `urinary_red_flags`

---

# 13. Soru Seti 10 — Su Tüketimi / Dehidrasyon

## ID

`hydration_basic`

## Sorular

### HYD-01

- ID: `hydration_water_intake`
- Soru: `Su içmesi nasıl değişti?`
- Tip: `single_choice`
- Seçenekler:
  - Normal
  - Azaldı
  - Arttı
  - Hiç içmiyor
  - Emin değilim

### HYD-02

- ID: `hydration_urine_change`
- Soru: `İdrar miktarında veya sıklığında değişiklik var mı?`
- Tip: `single_choice`
- Follow-up:
  - Arttı/Azaldı/Zorlanıyor → `urination_basic`

### HYD-03

- ID: `hydration_gums`
- Soru: `Diş etleri kuru/yapışkan gibi mi?`
- Tip: `single_choice`

### HYD-04

- ID: `hydration_skin_elasticity`
- Soru: `Deri elastikiyeti azalmış gibi mi?`
- Tip: `single_choice`
- Not:
  - Kullanıcıya yanlış test yaptıracak ayrıntılı tıbbi yönerge verilmez.

### HYD-05

- ID: `hydration_vomit_diarrhea`
- Soru: `Kusma veya ishal nedeniyle sıvı kaybı olabilir mi?`
- Tip: `multi_choice`
- Seçenekler:
  - Kusma var
  - İshal var
  - İkisi de var
  - Yok
  - Emin değilim

---

# 14. Soru Seti 11 — Öksürük

## ID

`cough_basic`

## Sorular

### COU-01

- ID: `cough_duration`
- Soru: `Öksürük ne zamandır var?`
- Tip: `duration`

### COU-02

- ID: `cough_frequency`
- Soru: `Öksürük ne sıklıkta oluyor?`
- Tip: `single_choice`
- Seçenekler:
  - Ara sıra
  - Günde birkaç kez
  - Sık sık
  - Nöbet gibi geliyor
  - Sürekli

### COU-03

- ID: `cough_type`
- Soru: `Öksürük nasıl duyuluyor?`
- Tip: `single_choice`
- Seçenekler:
  - Kuru
  - Balgamlı/ıslak gibi
  - Boğazına bir şey takılmış gibi
  - Havlar gibi sert
  - Emin değilim

### COU-04

- ID: `cough_after_exercise`
- Soru: `Egzersiz/oyun/yürüyüş sonrası artıyor mu?`
- Tip: `single_choice`

### COU-05

- ID: `cough_with_breathing`
- Soru: `Öksürük dışında nefes almakta zorlanma var mı?`
- Tip: `single_choice`
- Risk:
  - Evet: acil/yüksek
- Follow-up:
  - Evet → `respiratory_red_flags`

### COU-06

- ID: `cough_audio`
- Soru: `Öksürük sesini kaydetmek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `cough_audio`

---

# 15. Soru Seti 12 — Solunum

## ID

`breathing_basic`

## Sorular

### BRE-01

- ID: `breathing_resting_fast`
- Soru: `Dinlenirken nefesi normalden hızlı mı?`
- Tip: `single_choice`

### BRE-02

- ID: `breathing_effort`
- Soru: `Nefes alırken göğüs/karın hareketleri belirgin zorlanıyor gibi mi?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek/acil

### BRE-03

- ID: `breathing_noise`
- Soru: `Nefes alırken hırıltı, ıslık veya tıkanma sesi var mı?`
- Tip: `single_choice`
- Task:
  - Evet → `breathing_audio`

### BRE-04

- ID: `breathing_position`
- Soru: `Rahat nefes almak için boynunu uzatma, oturur pozisyonda kalma gibi davranış var mı?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek/acil

### BRE-05

- ID: `breathing_video`
- Soru: `Dinlenirken kısa solunum videosu eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `breathing_video`

### BRE-06

- ID: `breathing_rate_measure`
- Soru: `Dinlenirken 1 dakikadaki nefes sayısını girmek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `resting_respiratory_rate`

---

# 16. Soru Seti 13 — Göz

## ID

`eye_basic`

## Sorular

### EYE-01

- ID: `eye_side`
- Soru: `Hangi gözde sorun var?`
- Tip: `single_choice`
- Seçenekler:
  - Sağ göz
  - Sol göz
  - İki göz
  - Emin değilim

### EYE-02

- ID: `eye_discharge`
- Soru: `Akıntı var mı?`
- Tip: `single_choice`
- Seçenekler:
  - Yok
  - Şeffaf/sulu
  - Sarı/yeşil
  - Kanlı
  - Emin değilim
- Risk:
  - Kanlı: yüksek

### EYE-03

- ID: `eye_redness`
- Soru: `Kızarıklık var mı?`
- Tip: `single_choice`

### EYE-04

- ID: `eye_squinting`
- Soru: `Gözünü kısıyor veya kapalı tutuyor mu?`
- Tip: `single_choice`
- Risk:
  - Evet: orta/yüksek

### EYE-05

- ID: `eye_swelling`
- Soru: `Göz veya göz çevresinde şişlik var mı?`
- Tip: `single_choice`

### EYE-06

- ID: `eye_trauma`
- Soru: `Göze darbe, çizilme veya yabancı cisim kaçma ihtimali var mı?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek

### EYE-07

- ID: `eye_photo`
- Soru: `Göz fotoğrafı eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `eye_photo`

---

# 17. Soru Seti 14 — Kulak

## ID

`ear_basic`

## Sorular

### EAR-01

- ID: `ear_side`
- Soru: `Hangi kulakta sorun var?`
- Tip: `single_choice`
- Seçenekler:
  - Sağ kulak
  - Sol kulak
  - İki kulak
  - Emin değilim

### EAR-02

- ID: `ear_scratching`
- Soru: `Kulağını kaşıyor mu?`
- Tip: `single_choice`

### EAR-03

- ID: `ear_head_shaking`
- Soru: `Başını sık sık sallıyor mu?`
- Tip: `single_choice`

### EAR-04

- ID: `ear_smell`
- Soru: `Kötü koku var mı?`
- Tip: `single_choice`

### EAR-05

- ID: `ear_discharge`
- Soru: `Akıntı veya yoğun kir var mı?`
- Tip: `single_choice`
- Seçenekler:
  - Yok
  - Kahverengi/siyah kir
  - Sarı/yeşil akıntı
  - Kanlı
  - Emin değilim
- Risk:
  - Kanlı: yüksek

### EAR-06

- ID: `ear_touch_pain`
- Soru: `Kulağa dokununca acı/tepki veriyor mu?`
- Tip: `single_choice`
- Risk:
  - Evet: orta/yüksek

### EAR-07

- ID: `ear_balance`
- Soru: `Denge kaybı, baş eğik tutma veya yürürken sapma var mı?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek
- Follow-up:
  - Evet → `neurologic_balance_basic`

### EAR-08

- ID: `ear_media_task`
- Soru: `Kulak görüntüsü eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - phone_only → `ear_outer_photo`
  - basic_kit → `ear_inner_camera`

---

# 18. Soru Seti 15 — Deri / Tüy / Kaşıntı

## ID

`skin_basic`

## Sorular

### SKIN-01

- ID: `skin_location`
- Soru: `Sorun hangi bölgede?`
- Tip: `body_location`

### SKIN-02

- ID: `skin_problem_type`
- Soru: `Ne tür bir değişiklik görüyorsunuz?`
- Tip: `multi_choice`
- Seçenekler:
  - Kızarıklık
  - Tüy dökülmesi
  - Kabuklanma
  - Yara
  - Şişlik
  - Kepeklenme
  - Islak/akıntılı alan
  - Pire/kene şüphesi
  - Emin değilim

### SKIN-03

- ID: `skin_itching`
- Soru: `Kaşıntı veya sürekli yalama var mı?`
- Tip: `single_choice`
- Follow-up:
  - Evet → `itching_basic`

### SKIN-04

- ID: `skin_duration`
- Soru: `Ne zamandır fark ediyorsunuz?`
- Tip: `duration`

### SKIN-05

- ID: `skin_spreading`
- Soru: `Alan büyüyor veya yayılıyor gibi mi?`
- Tip: `single_choice`
- Risk:
  - Evet: orta/yüksek

### SKIN-06

- ID: `skin_pain_discharge`
- Soru: `Bölgede ağrı, akıntı, kötü koku veya sıcaklık var mı?`
- Tip: `multi_choice`
- Seçenekler:
  - Ağrı
  - Akıntı
  - Kötü koku
  - Sıcaklık
  - Yok
  - Emin değilim
- Risk:
  - Ağrı/akıntı/kötü koku: orta/yüksek

### SKIN-07

- ID: `skin_photo`
- Soru: `Bölgenin fotoğrafını eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `skin_photo`

---

# 19. Soru Seti 16 — Yara / Şişlik

## ID

`wound_basic`

## Sorular

### WND-01

- ID: `wound_location`
- Soru: `Yara veya şişlik hangi bölgede?`
- Tip: `body_location`

### WND-02

- ID: `wound_type`
- Soru: `Nasıl görünüyor?`
- Tip: `multi_choice`
- Seçenekler:
  - Kesik
  - Sıyrık
  - Delik/ısırık gibi
  - Şişlik
  - Kızarıklık
  - Akıntı
  - Kanama
  - Kabuk
  - Emin değilim

### WND-03

- ID: `wound_bleeding`
- Soru: `Kanama var mı?`
- Tip: `single_choice`
- Seçenekler:
  - Yok
  - Az
  - Devam ediyor
  - Şiddetli
  - Emin değilim
- Risk:
  - Devam ediyor: yüksek
  - Şiddetli: acil

### WND-04

- ID: `wound_depth`
- Soru: `Yara derin görünüyor mu?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek

### WND-05

- ID: `wound_pain`
- Soru: `Dokununca ağrı/tepki var mı?`
- Tip: `single_choice`

### WND-06

- ID: `wound_photo`
- Soru: `Yara/şişlik fotoğrafı eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `wound_photo`

### WND-07

- ID: `wound_compare`
- Soru: `Bu bölgenin önceki fotoğrafıyla karşılaştırmak ister misiniz?`
- Tip: `single_choice`
- Şart:
  - Aynı bölgede geçmiş medya varsa gösterilir.

---

# 20. Soru Seti 17 — Kaşıntı

## ID

`itching_basic`

## Sorular

### ITCH-01

- ID: `itching_frequency`
- Soru: `Ne sıklıkta kaşınıyor veya yalıyor?`
- Tip: `single_choice`
- Seçenekler:
  - Ara sıra
  - Günde birkaç kez
  - Sık sık
  - Neredeyse sürekli
  - Emin değilim

### ITCH-02

- ID: `itching_location`
- Soru: `En çok hangi bölgeyi kaşıyor/yalıyor?`
- Tip: `body_location`

### ITCH-03

- ID: `itching_skin_change`
- Soru: `Kaşınan bölgede kızarıklık, yara veya tüy dökülmesi var mı?`
- Tip: `single_choice`
- Follow-up:
  - Evet → `skin_basic`

### ITCH-04

- ID: `itching_parasite`
- Soru: `Pire, kene veya siyah küçük parçacıklar fark ettiniz mi?`
- Tip: `single_choice`

### ITCH-05

- ID: `itching_new_food_env`
- Soru: `Son dönemde mama, şampuan, temizlik ürünü veya ortam değişti mi?`
- Tip: `multi_choice`

### ITCH-06

- ID: `itching_video`
- Soru: `Kaşıma/yalama davranışını gösteren kısa video eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `itching_video`

---

# 21. Soru Seti 18 — Ağız / Diş

## ID

`mouth_dental_basic`

## Sorular

### MOU-01

- ID: `mouth_main_issue`
- Soru: `Ağız veya dişle ilgili ne fark ettiniz?`
- Tip: `multi_choice`
- Seçenekler:
  - Ağız kokusu
  - Diş eti kızarıklığı
  - Diş taşı gibi görüntü
  - Salya artışı
  - Yemek yerken zorlanma
  - Ağızda yara
  - Kanama
  - Emin değilim

### MOU-02

- ID: `mouth_eating_pain`
- Soru: `Yemek yerken zorlanıyor veya ağzının bir tarafını kullanıyor gibi mi?`
- Tip: `single_choice`

### MOU-03

- ID: `mouth_drooling`
- Soru: `Normalden fazla salya var mı?`
- Tip: `single_choice`
- Follow-up:
  - Evet → `foreign_body_toxin_basic` opsiyonel, şikayete göre

### MOU-04

- ID: `mouth_gum_color`
- Soru: `Diş etlerinin rengi normal pembe görünüyor mu?`
- Tip: `single_choice`
- Seçenekler:
  - Pembe/normal
  - Çok soluk
  - Mor/mavi/gri
  - Çok kırmızı
  - Bilmiyorum
- Risk:
  - Mor/mavi/gri: acil
  - Çok soluk: yüksek/acil

### MOU-05

- ID: `mouth_bleeding`
- Soru: `Ağızda veya diş etinde kanama var mı?`
- Tip: `single_choice`
- Risk:
  - Evet: orta/yüksek

### MOU-06

- ID: `mouth_photo`
- Soru: `Ağız/diş fotoğrafı eklemek ister misiniz?`
- Tip: `single_choice`
- Uyarı:
  - Pet zorlanmamalı, ısırma riski varsa fotoğraf çekilmemeli.
- Task:
  - Evet → `mouth_photo`

---

# 22. Soru Seti 19 — İdrar

## ID

`urination_basic`

## Sorular

### URI-01

- ID: `urination_frequency`
- Soru: `İdrar sıklığında değişiklik var mı?`
- Tip: `single_choice`
- Seçenekler:
  - Normal
  - Daha sık
  - Daha az
  - Hiç yapmıyor gibi
  - Emin değilim
- Risk:
  - Hiç yapmıyor gibi: acil/yüksek

### URI-02

- ID: `urination_straining`
- Soru: `İdrar yaparken zorlanıyor mu?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek/acil, özellikle erkek kedide

### URI-03

- ID: `urination_blood`
- Soru: `İdrarda kan veya pembe/kırmızı renk gördünüz mü?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek

### URI-04

- ID: `urination_accidents`
- Soru: `Ev içine/kum dışına idrar yapma başladı mı?`
- Tip: `single_choice`

### URI-05

- ID: `urination_thirst`
- Soru: `Su içmesi arttı mı?`
- Tip: `single_choice`
- Follow-up:
  - Evet → `hydration_basic`, `weight_change_basic`

### URI-06

- ID: `urination_pain`
- Soru: `İdrar yaparken ağlama, huzursuzluk veya sık gidip gelme var mı?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek

### URI-07

- ID: `urine_strip_task`
- Soru: `İdrar strip testi eklemek ister misiniz?`
- Tip: `single_choice`
- Şart:
  - Basic Kit varsa gösterilir.
- Task:
  - Evet → `urine_strip`

---

# 23. Soru Seti 20 — Hareket / Topallama

## ID

`movement_lameness_basic`

## Sorular

### MOV-01

- ID: `movement_duration`
- Soru: `Topallama veya hareket sorunu ne zamandır var?`
- Tip: `duration`

### MOV-02

- ID: `movement_limb`
- Soru: `Hangi bacak/pati etkilenmiş görünüyor?`
- Tip: `single_choice`
- Seçenekler:
  - Sağ ön
  - Sol ön
  - Sağ arka
  - Sol arka
  - Birden fazla
  - Emin değilim

### MOV-03

- ID: `movement_weight_bearing`
- Soru: `Etkilenen bacağa basabiliyor mu?`
- Tip: `single_choice`
- Seçenekler:
  - Normal basıyor
  - Az basıyor
  - Hiç basmıyor
  - Bazen basıyor
  - Emin değilim
- Risk:
  - Hiç basmıyor: yüksek

### MOV-04

- ID: `movement_trauma`
- Soru: `Düşme, çarpma, kavga veya travma oldu mu?`
- Tip: `single_choice`
- Follow-up:
  - Evet → `trauma_basic`

### MOV-05

- ID: `movement_swelling_wound`
- Soru: `Pati/bacakta şişlik, yara veya kanama görüyor musunuz?`
- Tip: `single_choice`
- Task:
  - Evet → `paw_limb_photo`

### MOV-06

- ID: `movement_pain_touch`
- Soru: `Bölgeye dokununca ağrı/tepki veriyor mu?`
- Tip: `single_choice`
- Risk:
  - Evet: orta/yüksek

### MOV-07

- ID: `movement_video_side`
- Soru: `Yandan yürüyüş videosu eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `gait_video_side`

### MOV-08

- ID: `movement_video_front`
- Soru: `Önden yürüyüş videosu eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `gait_video_front`

---

# 24. Soru Seti 21 — Travma

## ID

`trauma_basic`

## Sorular

### TRA-01

- ID: `trauma_type`
- Soru: `Ne tür bir olay oldu?`
- Tip: `multi_choice`
- Seçenekler:
  - Düşme
  - Çarpma
  - Trafik kazası
  - Kavga/ısırık
  - Sıkışma
  - Üzerine basıldı
  - Emin değilim
- Risk:
  - Trafik kazası: acil/yüksek

### TRA-02

- ID: `trauma_time`
- Soru: `Olay ne zaman oldu?`
- Tip: `duration`

### TRA-03

- ID: `trauma_bleeding`
- Soru: `Kanama var mı?`
- Tip: `single_choice`
- Risk:
  - Şiddetli/devam eden: acil

### TRA-04

- ID: `trauma_breathing`
- Soru: `Olaydan sonra nefes almasında değişiklik oldu mu?`
- Tip: `single_choice`
- Risk:
  - Evet: acil/yüksek

### TRA-05

- ID: `trauma_walk`
- Soru: `Olaydan sonra yürüyebiliyor mu?`
- Tip: `single_choice`
- Risk:
  - Hayır: yüksek/acil

### TRA-06

- ID: `trauma_photo_video`
- Soru: `Etkilenen bölgenin fotoğrafını veya kısa videosunu eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `trauma_media`

---

# 25. Soru Seti 22 — Ağrı

## ID

`pain_basic`

## Sorular

### PAIN-01

- ID: `pain_location`
- Soru: `Ağrı nerede gibi görünüyor?`
- Tip: `body_location`

### PAIN-02

- ID: `pain_severity`
- Soru: `Ağrı tepkisi ne kadar şiddetli?`
- Tip: `scale`
- Ölçek:
  - 1 hafif
  - 5 çok şiddetli

### PAIN-03

- ID: `pain_touch`
- Soru: `Dokununca tepki veriyor mu?`
- Tip: `single_choice`

### PAIN-04

- ID: `pain_vocalization`
- Soru: `İnleme, ağlama veya çığlık var mı?`
- Tip: `single_choice`
- Risk:
  - Evet: orta/yüksek

### PAIN-05

- ID: `pain_behavior`
- Soru: `Saklanma, saldırganlık veya huzursuzluk arttı mı?`
- Tip: `single_choice`

### PAIN-06

- ID: `pain_media`
- Soru: `Ağrı davranışını veya bölgeyi gösteren kayıt eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `pain_media`

---

# 26. Soru Seti 23 — Nörolojik / Denge

## ID

`neurologic_balance_basic`

## Sorular

### NEU-01

- ID: `neuro_balance`
- Soru: `Dengesiz yürüme veya düşme var mı?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek

### NEU-02

- ID: `neuro_head_tilt`
- Soru: `Başını sürekli eğik tutuyor mu?`
- Tip: `single_choice`
- Risk:
  - Evet: orta/yüksek

### NEU-03

- ID: `neuro_eye_movement`
- Soru: `Gözlerde istemsiz hareket veya garip bakış var mı?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek

### NEU-04

- ID: `neuro_tremor`
- Soru: `Kontrolsüz titreme var mı?`
- Tip: `single_choice`

### NEU-05

- ID: `neuro_weak_limbs`
- Soru: `Bacaklarda ani güçsüzlük var mı?`
- Tip: `single_choice`
- Risk:
  - Evet: yüksek/acil

### NEU-06

- ID: `neuro_video`
- Soru: `Yürüyüş/dengesizlik videosu eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `neuro_video`

---

# 27. Soru Seti 24 — Nöbet

## ID

`seizure_basic`

## Sorular

### SEI-01

- ID: `seizure_now`
- Soru: `Nöbet şu anda devam ediyor mu?`
- Tip: `single_choice`
- Risk:
  - Evet: acil

### SEI-02

- ID: `seizure_duration`
- Soru: `Nöbet yaklaşık ne kadar sürdü?`
- Tip: `single_choice`
- Seçenekler:
  - 1 dakikadan az
  - 1-3 dakika
  - 3-5 dakika
  - 5 dakikadan uzun
  - Emin değilim
- Risk:
  - 5 dakikadan uzun: acil

### SEI-03

- ID: `seizure_count`
- Soru: `Bugün birden fazla nöbet oldu mu?`
- Tip: `single_choice`
- Risk:
  - Evet: acil/yüksek

### SEI-04

- ID: `seizure_recovery`
- Soru: `Nöbetten sonra normale döndü mü?`
- Tip: `single_choice`
- Risk:
  - Hayır: yüksek/acil

### SEI-05

- ID: `seizure_toxin`
- Soru: `Zehirli madde veya ilaç yeme ihtimali var mı?`
- Tip: `single_choice`
- Risk:
  - Evet: acil
- Follow-up:
  - Evet → `foreign_body_toxin_basic`

### SEI-06

- ID: `seizure_video`
- Soru: `Güvenliyse nöbet/titreme videosu eklemek ister misiniz?`
- Tip: `single_choice`
- Uyarı:
  - Kayıt almak için pet’in güvenliği riske atılmamalıdır.

---

# 28. Soru Seti 25 — Zehirlenme / Yabancı Cisim

## ID

`foreign_body_toxin_basic`

## Sorular

### TOX-01

- ID: `toxin_item_type`
- Soru: `Ne yemiş/içmiş/yalamış olabilir?`
- Tip: `multi_choice`
- Seçenekler:
  - İnsan ilacı
  - Çikolata/kakao
  - Soğan/sarımsak
  - Üzüm/kuru üzüm
  - Temizlik ürünü
  - Bitki
  - Oyuncak/ip/plastik
  - Kemik
  - Fare/haşere zehiri
  - Bilmiyorum

### TOX-02

- ID: `toxin_time`
- Soru: `Ne zaman oldu?`
- Tip: `duration`

### TOX-03

- ID: `toxin_amount`
- Soru: `Yaklaşık ne kadar aldığı biliniyor mu?`
- Tip: `text`

### TOX-04

- ID: `toxin_symptoms`
- Soru: `Şu belirtilerden biri var mı?`
- Tip: `multi_choice`
- Seçenekler:
  - Kusma
  - İshal
  - Salya
  - Titreme
  - Nöbet
  - Halsizlik
  - Nefes zorluğu
  - Yok
  - Emin değilim
- Risk:
  - Nöbet / nefes zorluğu / şiddetli halsizlik: acil

### TOX-05

- ID: `toxin_package_photo`
- Soru: `Yediği/yaladığı şeyin veya ambalajın fotoğrafını eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `toxin_package_photo`

### TOX-06

- ID: `toxin_emergency_notice`
- Soru: `Zehirlenme ihtimali varsa veterinerle hızlıca görüşmek önemlidir.`
- Tip: `info`
- Not:
  - Bu soru değil, bilgi kartıdır.
  - Çoğu zehirlenme senaryosunda risk yüksek/acil kabul edilmelidir.

---

# 29. Soru Seti 26 — Kilo Değişimi

## ID

`weight_change_basic`

## Sorular

### WGT-01

- ID: `weight_current`
- Soru: `Güncel kilosunu biliyor musunuz?`
- Tip: `number`
- Birim: `kg`
- Task:
  - Veri yoksa `weight_measurement`

### WGT-02

- ID: `weight_change_direction`
- Soru: `Kilo değişimi nasıl?`
- Tip: `single_choice`
- Seçenekler:
  - Kilo kaybetti
  - Kilo aldı
  - Emin değilim
  - Değişim yok

### WGT-03

- ID: `weight_change_duration`
- Soru: `Bu değişimi ne kadar sürede fark ettiniz?`
- Tip: `duration`

### WGT-04

- ID: `weight_appetite`
- Soru: `İştahı nasıl?`
- Tip: `single_choice`
- Follow-up:
  - Azaldı/hiç yemiyor → `digestive_appetite_basic`

### WGT-05

- ID: `weight_thirst_urine`
- Soru: `Su içme veya idrar miktarı arttı mı?`
- Tip: `single_choice`
- Follow-up:
  - Evet → `hydration_basic`, `urination_basic`

### WGT-06

- ID: `weight_body_photos`
- Soru: `Vücut kondisyonu için üstten ve yandan fotoğraf eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `body_condition_photos`

---

# 30. Soru Seti 27 — Aşı / İlaç Sonrası

## ID

`post_vaccine_medication_basic`

## Sorular

### MED-01

- ID: `med_event_type`
- Soru: `Son dönemde ne oldu?`
- Tip: `multi_choice`
- Seçenekler:
  - Aşı oldu
  - Yeni ilaç başladı
  - İlaç dozu değişti
  - Parazit uygulaması yapıldı
  - Operasyon/işlem oldu
  - Emin değilim

### MED-02

- ID: `med_event_time`
- Soru: `Bu işlem/ilaç ne zaman oldu?`
- Tip: `duration`

### MED-03

- ID: `med_symptoms`
- Soru: `Sonrasında ne fark ettiniz?`
- Tip: `multi_choice`
- Seçenekler:
  - Halsizlik
  - Kusma
  - İshal
  - Kaşıntı
  - Yüz/göz çevresi şişlik
  - Nefes zorluğu
  - Aşı yerinde şişlik
  - İştahsızlık
  - Diğer
- Risk:
  - Nefes zorluğu / yüz şişliği / çökme: acil

### MED-04

- ID: `med_photo`
- Soru: `Aşı/uygulama bölgesinde şişlik veya kızarıklık varsa fotoğraf eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `injection_site_photo`

### MED-05

- ID: `med_name_note`
- Soru: `İlaç/aşı adını biliyorsanız yazın.`
- Tip: `text`

---

# 31. Soru Seti 28 — Operasyon Sonrası

## ID

`post_operation_basic`

## Sorular

### POST-01

- ID: `post_operation_type`
- Soru: `Hangi işlem/operasyon sonrası takip yapıyorsunuz?`
- Tip: `text`

### POST-02

- ID: `post_operation_date`
- Soru: `İşlem ne zaman yapıldı?`
- Tip: `duration`

### POST-03

- ID: `post_wound_status`
- Soru: `Operasyon/yara bölgesinde ne fark ettiniz?`
- Tip: `multi_choice`
- Seçenekler:
  - Kızarıklık
  - Şişlik
  - Akıntı
  - Kanama
  - Kötü koku
  - Dikiş açılması
  - Sürekli yalama
  - Normal görünüyor
  - Emin değilim
- Risk:
  - Kanama / dikiş açılması / kötü koku + akıntı: yüksek

### POST-04

- ID: `post_appetite`
- Soru: `Operasyondan sonra iştahı nasıl?`
- Tip: `single_choice`

### POST-05

- ID: `post_pain`
- Soru: `Ağrı belirtisi var mı?`
- Tip: `single_choice`
- Follow-up:
  - Evet → `pain_basic`

### POST-06

- ID: `post_wound_photo`
- Soru: `Yara/operasyon bölgesi fotoğrafı eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `post_operation_wound_photo`

---

# 32. Soru Seti 29 — Gebelik / Doğum / Yavru

## ID

`pregnancy_birth_basic`

## Sorular

### PREG-01

- ID: `pregnancy_status`
- Soru: `Durum hangisine daha yakın?`
- Tip: `single_choice`
- Seçenekler:
  - Gebelik şüphesi
  - Doğum başladı
  - Doğum sonrası takip
  - Yavru takibi
  - Emin değilim

### PREG-02

- ID: `pregnancy_vet_seen`
- Soru: `Bu süreç için veteriner kontrolü yapıldı mı?`
- Tip: `single_choice`

### PREG-03

- ID: `pregnancy_red_flags`
- Soru: `Aşağıdakilerden biri var mı?`
- Tip: `multi_choice`
- Seçenekler:
  - Şiddetli kanama
  - Uzun süredir doğum ilerlemiyor
  - Anne çok halsiz/çökük
  - Kötü kokulu akıntı
  - Yavru nefes almıyor/ememiyor
  - Yok
  - Emin değilim
- Risk:
  - İlk beş seçenek: acil/yüksek

### PREG-04

- ID: `pregnancy_temperature`
- Soru: `Ateş ölçümü var mı?`
- Tip: `single_choice`
- Task:
  - Hayır → `temperature_measurement` opsiyonel

### PREG-05

- ID: `pregnancy_note`
- Soru: `Eklemek istediğiniz not var mı?`
- Tip: `text`

---

# 33. Soru Seti 30 — Rutin Sağlık Kontrolü

## ID

`routine_wellness_basic`

## Sorular

### ROUT-01

- ID: `routine_goal`
- Soru: `Bugün neyi kaydetmek istiyorsunuz?`
- Tip: `multi_choice`
- Seçenekler:
  - Genel durum
  - Kilo
  - Aşı/ilaç
  - Diş/ağız
  - Deri/tüy
  - Aktivite
  - Rutin fotoğraf
  - Diğer

### ROUT-02

- ID: `routine_appetite`
- Soru: `İştahı normal mi?`
- Tip: `single_choice`

### ROUT-03

- ID: `routine_activity`
- Soru: `Hareketliliği normal mi?`
- Tip: `single_choice`

### ROUT-04

- ID: `routine_weight`
- Soru: `Kilo ölçümü eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `weight_measurement`

### ROUT-05

- ID: `routine_photos`
- Soru: `Rutin karşılaştırma için fotoğraf eklemek ister misiniz?`
- Tip: `single_choice`
- Task:
  - Evet → `routine_body_photo`

### ROUT-06

- ID: `routine_notes`
- Soru: `Bugünkü genel notunuz var mı?`
- Tip: `text`

---

# 34. Görev Kütüphanesi

Görevler, soru setlerinden ve classifier sonucundan seçilir.

## 34.1. Fotoğraf Görevleri

### `eye_photo`

- Başlık: `Göz fotoğrafı çek`
- Açıklama: `Göz çevresi ve akıntı net görünsün. Flaşı doğrudan göze tutmayın.`
- Kategoriler: `eye`
- Öncelik: `recommended`
- Maksimum dosya: 2 fotoğraf
- Gereken izin: kamera / galeri

### `skin_photo`

- Başlık: `Deri/tüy bölgesi fotoğrafı çek`
- Açıklama: `Kızarıklık, tüy dökülmesi veya kaşıntı alanını net gösterin.`
- Kategoriler: `skin_fur`
- Öncelik: `recommended`
- Maksimum dosya: 3 fotoğraf

### `wound_photo`

- Başlık: `Yara/şişlik fotoğrafı çek`
- Açıklama: `Bölgeyi iyi ışıkta çekin. Derin yara veya kanama varsa beklemeyin.`
- Kategoriler: `skin_fur`, `trauma`
- Öncelik: `recommended`

### `vomit_photo`

- Başlık: `Kusmuk fotoğrafı ekle`
- Açıklama: `Varsa kusmuk görüntüsünü net şekilde ekleyin. Hijyene dikkat edin.`
- Kategoriler: `appetite_digestive`
- Öncelik: `optional`

### `stool_photo`

- Başlık: `Dışkı fotoğrafı ekle`
- Açıklama: `Dışkı rengi ve kıvamı görünür olsun.`
- Kategoriler: `urine_stool`
- Öncelik: `optional`

### `mouth_photo`

- Başlık: `Ağız/diş fotoğrafı çek`
- Açıklama: `Pet zorlanıyorsa çekim yapmayın. Isırma riski varsa bu görevi atlayın.`
- Kategoriler: `mouth_dental`
- Öncelik: `recommended`

### `ear_outer_photo`

- Başlık: `Kulak dışı fotoğraf çek`
- Açıklama: `Kulağın dış kısmını ve görünür akıntı/kızarıklığı çekin.`
- Kategoriler: `ear`
- Öncelik: `recommended`

### `paw_limb_photo`

- Başlık: `Pati/bacak fotoğrafı çek`
- Açıklama: `Şişlik, yara veya hassas bölge varsa net fotoğraf ekleyin.`
- Kategoriler: `movement_gait`
- Öncelik: `recommended`

### `toxin_package_photo`

- Başlık: `Yenen madde veya ambalaj fotoğrafı`
- Açıklama: `Veterinerin ne yediğini anlamasına yardımcı olabilir.`
- Kategoriler: `toxin_foreign_body`
- Öncelik: `recommended`

---

## 34.2. Video Görevleri

### `behavior_video`

- Başlık: `Genel davranış videosu çek`
- Açıklama: `Pet’in genel duruşunu, hareketini ve tepkisini kısa video ile kaydedin.`
- Süre: 10-20 saniye
- Maksimum: 30 saniye
- Öncelik: `recommended`

### `gait_video_side`

- Başlık: `Yandan yürüyüş videosu çek`
- Açıklama: `Düz zeminde yandan yürüyüşünü kaydedin.`
- Süre: 10-20 saniye
- Kategori: `movement_gait`
- Öncelik: `recommended`

### `gait_video_front`

- Başlık: `Önden yürüyüş videosu çek`
- Açıklama: `Mümkünse kısa bir önden yürüyüş videosu ekleyin.`
- Süre: 10-20 saniye
- Kategori: `movement_gait`
- Öncelik: `optional`

### `breathing_video`

- Başlık: `Solunum videosu çek`
- Açıklama: `Pet dinlenirken göğüs/karın hareketleri görünecek şekilde çekin.`
- Süre: 10-20 saniye
- Kategori: `respiratory_cough`
- Öncelik: `recommended`

### `itching_video`

- Başlık: `Kaşıma/yalama videosu çek`
- Açıklama: `Davranışı gösteren kısa bir video ekleyin.`
- Süre: 10-20 saniye
- Kategori: `skin_fur`
- Öncelik: `optional`

### `neuro_video`

- Başlık: `Denge/titreme videosu çek`
- Açıklama: `Güvenliyse yürüyüş veya titreme davranışını kaydedin.`
- Süre: 10-20 saniye
- Kategori: `behavior`
- Öncelik: `recommended`

---

## 34.3. Ses Görevleri

### `cough_audio`

- Başlık: `Öksürük sesi kaydet`
- Açıklama: `Sessiz ortamda kısa bir öksürük kaydı alın. Pet’i zorla öksürtmeyin.`
- Süre: 10-20 saniye
- Maksimum: 30 saniye
- Kategori: `respiratory_cough`
- Öncelik: `recommended`

### `breathing_audio`

- Başlık: `Hırıltı/solunum sesi kaydet`
- Açıklama: `Telefonu çok yaklaştırmadan, sessiz ortamda kısa kayıt alın.`
- Süre: 10-20 saniye
- Kategori: `respiratory_cough`
- Öncelik: `recommended`

### `voice_change_audio`

- Başlık: `Ses değişimi kaydet`
- Açıklama: `Miyavlama/havlama değişimini gösteren kısa kayıt ekleyin.`
- Süre: 10-20 saniye
- Kategori: `behavior`
- Öncelik: `optional`

---

## 34.4. Ölçüm Görevleri

### `temperature_measurement`

- Başlık: `Ateş ölçümü gir`
- Alanlar:
  - Değer °C
  - Ölçüm yöntemi
  - Ölçüm zamanı
  - Not
- Öncelik: `optional/recommended`
- Uyarı:
  - Agresif veya huzursuz pet’te zorlamayın.

### `weight_measurement`

- Başlık: `Kilo bilgisi gir`
- Alanlar:
  - Kilo kg
  - Ölçüm zamanı
  - Not

### `resting_respiratory_rate`

- Başlık: `Dinlenme solunum sayısı gir`
- Alanlar:
  - 1 dakikadaki nefes sayısı
  - Ölçüm zamanı
  - Not

### `water_intake_note`

- Başlık: `Su tüketimi notu gir`
- Alanlar:
  - Normal / arttı / azaldı / emin değilim
  - Not

### `food_intake_note`

- Başlık: `Mama tüketimi notu gir`
- Alanlar:
  - Normal / az / hiç / seçici / emin değilim
  - Not

---

## 34.5. Basic Kit Görevleri

### `ear_inner_camera`

- Başlık: `Kulak içi kamera görüntüsü al`
- Cihaz: mini otoskop/kamera
- Uyarı:
  - Cihaz kulağa zorla sokulmaz.
  - Pet acı duyuyorsa işlem durdurulur.
- Kategori: `ear`
- Öncelik: `recommended`

### `urine_strip`

- Başlık: `İdrar strip okuma`
- Cihaz: idrar strip + renk kartı
- Uyarı:
  - Kesin tanı değildir.
  - Anormal sonuçlar veteriner değerlendirmesi gerektirir.
- Kategori: `urine_stool`
- Öncelik: `recommended`

### `close_skin_camera`

- Başlık: `Yakın cilt/yara görüntüsü`
- Cihaz: makro lens / mini kamera
- Kategori: `skin_fur`
- Öncelik: `optional/recommended`

### `digital_thermometer`

- Başlık: `Dijital derece ölçümü`
- Cihaz: dijital derece
- Kategori: genel
- Öncelik: `optional`

---

# 35. AI Görev Seçim Kuralları

## 35.1. Genel Kural

AI şikayeti sınıflandırdıktan sonra:

1. En fazla 2 ana kategori seçsin.
2. En fazla 3 alt kategori seçsin.
3. İlk akışta 5-8 arası soru sorsun.
4. Acil belirti varsa daha fazla soru sormadan acil ekrana yönlendirsin.
5. Medya görevlerini gereksiz çoğaltmasın.
6. Video ve ses görevlerinde süre sınırı uygulasın.
7. Cihazsız kullanıcıya Basic Kit görevi açmasın.
8. Basic Kit kullanıcısına ilgili cihaz görevini opsiyonel/önerilen olarak açsın.
9. Geçmişte aynı şikayet varsa karşılaştırma görevi eklesin.
10. Rutin kontrolde gereksiz risk dili kullanmasın.

## 35.2. Soru Sayısı Kuralı

| Şikayet Karmaşıklığı | Maksimum Soru |
|---|---:|
| Tek basit şikayet | 5 |
| İki ilişkili şikayet | 7 |
| Üç veya daha fazla şikayet | 9 |
| Acil şüpheli | 3-5 acil soru sonrası yönlendirme |

## 35.3. Görev Sayısı Kuralı

| Şikayet | Önerilen Görev Sayısı |
|---|---:|
| Basit metin şikayeti | 0-2 |
| Görsel bulgu | 1-2 fotoğraf |
| Hareket şikayeti | 1-2 video + 1 foto |
| Solunum şikayeti | 1 video + 1 ses |
| Basic Kit uygun şikayet | 1 kit görevi + opsiyonel foto |

## 35.4. Medya Limiti

- Fotoğraf: test başına önerilen maksimum 3
- Video: test başına önerilen maksimum 2
- Video süresi: önerilen 10-20 sn, maksimum 30 sn
- Ses: test başına önerilen maksimum 2
- Ses süresi: önerilen 10-20 sn, maksimum 30 sn

---

# 36. Geçmiş Kayıt Kullanma Kuralları

AI son değerlendirme sırasında geçmişi özet olarak almalıdır.

## 36.1. Geçmişte Aranacaklar

| Şikayet | Geçmiş Anahtarları |
|---|---|
| Kusma | vomiting, appetite, diarrhea, weight |
| İştahsızlık | appetite, weight, medication, chronic |
| Solunum | cough, breathing, heart, allergy |
| Kulak | ear, head_shaking, ear_photo |
| Göz | eye, discharge, redness, eye_photo |
| Deri | skin, wound, itching, allergy, photo_compare |
| İdrar | urination, water_intake, urine_strip, weight |
| Topallama | movement, gait, trauma, pain |
| Kilo | weight, appetite, water, urination |
| Kronik | chronic, medication, vet_reports, measurements |

## 36.2. Geçmiş Karşılaştırma Dili

Kullanılacak örnekler:

- `Benzer belirti daha önce 12 Mart 2026 tarihinde kaydedilmiş.`
- `Son 30 günde kilo kaybı görülüyor.`
- `Aynı bölgede önceki fotoğraf kaydı bulundu.`
- `Bu bulgu geçmiş kayıtlarla birlikte takip edilmelidir.`
- `Karşılaştırma için yeterli geçmiş kayıt yok.`

Kullanılmayacak örnekler:

- `Bu hastalık tekrarlamış.`
- `Kesin nüks var.`
- `Önceki teşhisle aynı.`

---

# 37. Sonuç Üretme Formatı

AI son değerlendirme aşağıdaki formatta dönmelidir:

```json
{
  "risk_level": "medium",
  "risk_score": 62,
  "title_key": "result.medium.title",
  "summary": "İştahsızlık ve kusma birlikte takip edilmesi gereken belirtilerdir.",
  "observations": [
    "Son 24 saatte 2-3 kez kusma bildirildi.",
    "İştahın azaldığı belirtildi.",
    "Acil belirti yanıtlarında nefes zorluğu veya bilinç kaybı bildirilmedi."
  ],
  "history_comparison": [
    "Benzer sindirim şikayeti için yakın dönemde kayıt bulunamadı.",
    "Son kilo ölçümü 24.2 kg olarak kayıtlı."
  ],
  "recommendations": [
    "Belirtiler devam ederse veteriner randevusu planlayın.",
    "Kusma artarsa, kan görülürse veya su tutamazsa beklemeden veteriner kliniğine başvurun.",
    "Bugünkü kontrolü sağlık geçmişine kaydedin."
  ],
  "next_action": "vet_appointment",
  "followup_interval_hours": 24,
  "report_sections": [
    "complaint",
    "answers",
    "media",
    "measurements",
    "history",
    "recommendations"
  ],
  "disclaimer": "Bu değerlendirme veteriner muayenesinin yerine geçmez."
}
```

---

# 38. Risk Puanlama İçin Basit Kural Motoru

AI sonucuna ek olarak deterministik bir risk puan sistemi kullanılabilir.

## 38.1. Puanlama

| Durum | Puan |
|---|---:|
| Hafif belirti | +5 |
| 1-2 gündür devam | +5 |
| 3-7 gündür devam | +10 |
| 1 haftadan uzun | +15 |
| Belirgin halsizlik | +15 |
| İştahsızlık | +10 |
| Hiç yememe | +20 |
| Kedi 24 saat yememe | +30 |
| Kusma 2-3 kez | +15 |
| Kusma 4+ kez | +30 |
| Kanlı kusma/dışkı/idrar | +35 |
| Nefes zorluğu | acil |
| İdrar yapamama | acil |
| Nöbet | acil |
| Zehirlenme ihtimali | yüksek/acil |
| Şiddetli kanama | acil |
| Travma | +25 / acil |
| Geçmişte aynı şikayet tekrarı | +10 |
| Kilo kaybı | +15 |

## 38.2. Skor Aralıkları

| Skor | Risk |
|---:|---|
| 0-29 | Düşük |
| 30-59 | Orta |
| 60-79 | Yüksek |
| 80+ veya acil tetikleyici | Acil |

## 38.3. Not

Bu puanlama nihai tıbbi karar değildir. UI’da kesin tıbbi iddia olarak gösterilmez.

---

# 39. TypeScript Veri Tipi Önerileri

```ts
export type PetSpecies = "cat" | "dog";

export type DeviceMode = "phone_only" | "basic_kit";

export type RiskLevel = "low" | "medium" | "high" | "emergency";

export type QuestionType =
  | "single_choice"
  | "multi_choice"
  | "number"
  | "text"
  | "scale"
  | "duration"
  | "body_location"
  | "info";

export type TaskType =
  | "photo"
  | "video"
  | "audio"
  | "measurement"
  | "basic_kit"
  | "note"
  | "comparison";

export type TaskPriority = "required" | "recommended" | "optional";

export interface QuestionOption {
  value: string;
  labelKey: string;
  riskWeight?: number;
  triggers?: Array<{
    type: "question_set" | "task" | "red_flag";
    id: string;
  }>;
}

export interface QuestionDefinition {
  id: string;
  questionSetId: string;
  category: string;
  textKey: string;
  type: QuestionType;
  required: boolean;
  options?: QuestionOption[];
  redFlagValues?: string[];
  riskWeight?: Record<string, number>;
  followupQuestionIds?: string[];
  taskTriggers?: Array<{
    ifValueIn: string[];
    taskKey: string;
    priority: TaskPriority;
  }>;
}

export interface QuestionSet {
  id: string;
  category: string;
  titleKey: string;
  descriptionKey?: string;
  questions: QuestionDefinition[];
}

export interface TaskDefinition {
  key: string;
  type: TaskType;
  category: string;
  titleKey: string;
  descriptionKey: string;
  priority: TaskPriority;
  requiresDeviceMode?: DeviceMode;
  maxFiles?: number;
  maxDurationSeconds?: number;
  safetyWarningKey?: string;
}

export interface ClassifierResult {
  primaryCategories: string[];
  secondaryCategories: string[];
  suspectedComplaintTypes: string[];
  redFlagGroups: string[];
  questionSetIds: string[];
  taskPlan: Array<{
    taskKey: string;
    taskType: TaskType;
    priority: TaskPriority;
  }>;
  basicKitTasks: string[];
  historyLookupKeys: string[];
  confidence: number;
  userConfirmationTextKey: string;
}

export interface HealthCheckResult {
  riskLevel: RiskLevel;
  riskScore: number;
  summary: string;
  observations: string[];
  historyComparison: string[];
  recommendations: string[];
  nextAction:
    | "follow_up"
    | "repeat_check"
    | "vet_appointment"
    | "urgent_vet"
    | "save_record";
  followupIntervalHours?: number;
  disclaimer: string;
}
```

---

# 40. İlk MVP’de Mutlaka Olacak Soru Setleri

İlk sürümde tüm kütüphaneyi eksiksiz bitirmek zor olabilir. Ancak aşağıdaki setler MVP için zorunludur:

1. `red_flags_general`
2. `respiratory_red_flags`
3. `urinary_red_flags`
4. `general_condition_basic`
5. `digestive_appetite_basic`
6. `vomiting_basic`
7. `diarrhea_basic`
8. `cough_basic`
9. `breathing_basic`
10. `eye_basic`
11. `ear_basic`
12. `skin_basic`
13. `wound_basic`
14. `mouth_dental_basic`
15. `urination_basic`
16. `movement_lameness_basic`
17. `foreign_body_toxin_basic`
18. `weight_change_basic`
19. `routine_wellness_basic`

---

# 41. Ajan İçin Uygulama Talimatı

Ajan bu dosyayı uygularken şu sırayı takip etmelidir:

1. `QuestionDefinition`, `QuestionSet`, `TaskDefinition` TypeScript tiplerini oluştur.
2. Ortak seçenek sözlüğünü i18n dosyasına taşı.
3. Red flag soru setlerini oluştur.
4. Genel durum, iştah, kusma, ishal soru setlerini oluştur.
5. Solunum, göz, kulak, deri, ağız, idrar, hareket soru setlerini oluştur.
6. Görev kütüphanesini oluştur.
7. Şikayet sınıflandırıcı için mock mapping oluştur.
8. AI entegre edilene kadar keyword/chip tabanlı classifier kullan.
9. Classifier sonucu `question_set_ids` ve `task_plan` üretmeli.
10. Dinamik soru akışı, bu soru setlerinden render edilmeli.
11. Soru cevaplarına göre ek soru seti veya görev tetiklenebilmeli.
12. Acil cevaplar normal akışı kesip acil ekrana yönlendirmeli.
13. Sonuç üretimi başlangıçta mock/kural tabanlı olabilir.
14. Gemini entegrasyonu sonradan aynı JSON şemasına bağlanmalı.
15. Tüm metinler i18n’den gelmeli.
16. Hiçbir yerde teşhis dili kullanılmamalı.

---

# 42. Örnek Classifier Mapping — MVP İçin Kural Tabanlı Başlangıç

AI entegrasyonu öncesinde kullanılabilecek basit mapping:

```ts
const complaintKeywordMap = [
  {
    keywords: ["kus", "kustu", "kusuyor", "sarı köpük"],
    primaryCategories: ["appetite_digestive"],
    questionSetIds: ["red_flags_general", "vomiting_basic", "hydration_basic"],
    taskPlan: ["vomit_photo", "behavior_video", "temperature_measurement"]
  },
  {
    keywords: ["ishal", "dışkı", "sulu", "kanlı dışkı"],
    primaryCategories: ["urine_stool"],
    questionSetIds: ["red_flags_general", "diarrhea_basic", "hydration_basic"],
    taskPlan: ["stool_photo", "temperature_measurement"]
  },
  {
    keywords: ["öksür", "hırıltı", "nefes", "solunum"],
    primaryCategories: ["respiratory_cough"],
    questionSetIds: ["red_flags_general", "respiratory_red_flags", "cough_basic", "breathing_basic"],
    taskPlan: ["breathing_video", "cough_audio"]
  },
  {
    keywords: ["topal", "basmıyor", "yürüyemiyor", "pati", "bacak"],
    primaryCategories: ["movement_gait"],
    questionSetIds: ["red_flags_general", "movement_lameness_basic", "trauma_basic"],
    taskPlan: ["gait_video_side", "paw_limb_photo"]
  },
  {
    keywords: ["kulak", "kaşıyor", "koku", "akıntı"],
    primaryCategories: ["ear"],
    questionSetIds: ["red_flags_general", "ear_basic", "pain_basic"],
    taskPlan: ["ear_outer_photo"],
    basicKitTaskPlan: ["ear_inner_camera"]
  },
  {
    keywords: ["göz", "akıntı", "kızarıklık", "çapak", "şiş"],
    primaryCategories: ["eye"],
    questionSetIds: ["red_flags_general", "eye_basic"],
    taskPlan: ["eye_photo"]
  },
  {
    keywords: ["kaşıntı", "deri", "tüy", "yara", "şişlik", "kızarıklık"],
    primaryCategories: ["skin_fur"],
    questionSetIds: ["red_flags_general", "skin_basic", "itching_basic", "wound_basic"],
    taskPlan: ["skin_photo", "wound_photo"]
  },
  {
    keywords: ["idrar", "çiş", "kum", "yapamıyor", "kanlı idrar"],
    primaryCategories: ["urine_stool"],
    questionSetIds: ["red_flags_general", "urinary_red_flags", "urination_basic", "hydration_basic"],
    taskPlan: ["urine_note"],
    basicKitTaskPlan: ["urine_strip"]
  }
];
```

---

# 43. Son Not

Bu kütüphane zamanla büyütülebilir. Ancak ilk sürümde en kritik başarı şudur:

> Kullanıcı şikayetini yazınca uygulama doğru kategoriye gitmeli, gereksiz sorular sormamalı, doğru medya/ölçüm görevlerini getirmeli ve acil durumları kaçırmamalıdır.

Bu dosyadaki yapı, bu amaca hizmet eden temel soru ve görev kütüphanesidir.
