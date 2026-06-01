# Pati Sağlık — Güvenli Öneri Politikası ve Takipli Muayene Modülü

> **Devam / revizyon talimat dosyasıdır.**
>
> Bu dosya, önceki Pati Sağlık plan dosyalarının devamıdır. Amaç iki kararı netleştirmektir:
>
> 1. Uygulama veteriner hekim önerisi dışında da kullanıcıya fayda sağlayacak **güvenli öneriler** verebilir.
> 2. Tek seferlik kontrol yeterli değildir; her kontrol gerekirse **takipli muayene dosyasına** dönüşebilmelidir.

---

## 1. Net Ürün Kararı

Uygulama sadece “veterinere gidin” diyen kuru bir sistem olmamalıdır. Ancak uygulama hiçbir şekilde veteriner hekimin yerine geçmemeli; teşhis, tedavi, ilaç veya doz önerisi vermemelidir.

Doğru konumlandırma:

> **Pati Sağlık, evcil hayvanınızda fark ettiğiniz şikayeti anlamaya çalışan, güvenli takip adımları sunan, yapılmaması gereken riskli hataları hatırlatan, belirtileri zaman içinde izleyen ve veteriner görüşmesi için düzenli rapor hazırlayan pet sağlık asistanıdır.**

Uygulamanın verebileceği öneriler:

- Güvenli takip önerileri
- Belirti/kayıt tutma önerileri
- Fotoğraf/video/ses/ölçüm ekleme önerileri
- Veterinere hazırlık önerileri
- Yapılmaması gereken riskli hatalar
- Ortam güvenliği ve düşük riskli bakım önerileri
- Ne zaman beklememeli uyarıları
- Takip planı ve hatırlatma önerileri

Uygulamanın veremeyeceği öneriler:

- Hastalık teşhisi
- Tedavi planı
- İlaç adı
- İlaç dozu
- Antibiyotik / ağrı kesici / damla / krem önerisi
- Ev tipi karışım
- Kusturma yöntemi
- Aç bırakma talimatı
- Kesin diyet reçetesi
- “Veterinere gerek yok” ifadesi

---

## 2. Hukuki Güvenlik Prensibi

Bu uygulama **teşhis ve tedavi uygulaması** değil, **triyaj + sağlık kaydı + takip + veteriner hazırlık uygulaması** olarak konumlandırılmalıdır.

Kullanılacak sınır:

```text
Teşhis / tedavi / ilaç / doz / reçete = yasak alan

Genel bilgilendirme / triyaj / takip / kayıt / kaçınılacaklar / veteriner hazırlığı = güvenli ürün alanı
```

Önemli not:

> Sorumluluk reddi metinleri riski azaltır ama tamamen ortadan kaldırmaz. Bu nedenle ürün dili baştan güvenli tasarlanmalıdır. Kullanım koşulları, KVKK, sorumluluk reddi ve veterinerlik mevzuatı için hukukçu ve mümkünse veteriner hekim danışman kontrolü gereklidir.

---

## 3. Sonuç Ekranında Öneriler Nasıl Verilecek?

Öneriler tek bir “tavsiye” kutusu olarak verilmemelidir. Sonuç ekranında ayrı bloklar kullanılmalıdır.

Önerilen yapı:

```text
Risk Kartı
  -> Belirti Özeti
  -> Değerlendirme
  -> Güvenli Takip Adımları
  -> Yapılmaması Gerekenler
  -> Ne Zaman Beklememeli?
  -> Takip Planı
  -> Veterinere Hazırlık
  -> Geçmişe Kaydet / Takibe Al / Rapor Oluştur
```

Her sonuçta şu uyarı bulunmalıdır:

> **Bu değerlendirme veteriner muayenesinin yerine geçmez. Acil veya kötüleşen belirtilerde beklemeden veteriner kliniğine başvurun.**

---

## 4. Öneri Güvenlik Seviyeleri

### 4.1. Seviye 1 — Güvenli Bilgi, Kayıt ve Hazırlık

Bu seviye uygulamada serbestçe kullanılabilir. Tedavi değil, kayıt ve hazırlıktır.

Örnekler:

- Kusma sayısını, saatini ve görünümünü kaydedin.
- Dışkı görünümünü ve sıklığını kaydedin.
- Topallama için kısa yürüyüş videosu ekleyin.
- Göz/kulak/deri görüntüsünü net ışıkta kaydedin.
- Veterinere giderken kullandığı ilaçları, son mama değişimini ve belirtilerin başlama zamanını not edin.
- Ambalaj, yabancı cisim veya şüpheli madde varsa fotoğrafını çekip veterinerle paylaşın.
- Aynı bölgenin fotoğrafını benzer ışık ve açıyla tekrar çekin.
- Bu kontrolü sağlık geçmişine kaydedin.

### 4.2. Seviye 2 — Düşük Riskli Bakım ve Ortam Güvenliği

Bu seviye dikkatli dille ve acil belirti yoksa kullanılabilir.

Örnekler:

- Pet’i sakin ve güvenli bir alanda tutun.
- Hareket etmekte zorlanıyorsa zıplama, koşma ve merdiven kullanımını sınırlayın.
- Pet huzursuzsa fotoğraf/video çekmek için zorlamayın.
- Basic Kit kullanırken pet acı hissederse işlemi durdurun.
- Şüpheli madde veya ambalajı saklayıp veterinerle paylaşın.
- Yara bölgesini yalamasını engellemek için veterinerin daha önce önerdiği koruyucu ekipmanı kullanabilirsiniz.

### 4.3. Seviye 3 — Tıbbi Tedavi Alanı

Bu seviye uygulama tarafından otomatik olarak verilmez.

Kesin yasak içerikler:

- İlaç adı
- Doz
- Antibiyotik
- Ağrı kesici
- Antiparaziter
- Göz/kulak damlası
- Krem
- Serum/sıvı tedavisi
- Kusturma yöntemi
- Ev tipi karışım
- Bitkisel tedavi
- Kesin diyet reçetesi
- Aç bırakma talimatı
- Veteriner yerine geçecek tedavi planı

---

## 5. Kullanılacak ve Kullanılmayacak Dil

### 5.1. Kullanılacak Dil

- “Takip edin.”
- “Kaydedin.”
- “Not edin.”
- “Veterinerle paylaşın.”
- “Veteriner değerlendirmesi önerilir.”
- “Beklemeden veteriner kliniğine başvurun.”
- “Bu belirti acil olabilir.”
- “Bu sonuç teşhis değildir.”
- “Bu yaklaşımın pet’inize uygunluğunu veteriner hekiminiz değerlendirmelidir.”
- “Aşağıdaki durumlarda beklemeyin.”

### 5.2. Kullanılmayacak Dil

- “Tedavi edin.”
- “İlaç verin.”
- “Şunu yedirin.”
- “Şu kadar aç bırakın.”
- “Su vermeyin.”
- “Bu hastalık var.”
- “Bu kesin enfeksiyon.”
- “Veterinere gerek yok.”
- “Evde geçer.”
- “Sadece takip yeterli.”

---

## 6. Sonuç JSON Formatı

AI veya kural motoru sonuç döndürürken aşağıdaki alanları üretmelidir.

```json
{
  "risk_level": "medium",
  "risk_score": 62,
  "summary": "Kusma ve iştahsızlık birlikte takip edilmesi gereken belirtilerdir.",
  "safe_followup_steps": [
    "Kusma sayısını, saatini ve görünümünü kaydedin.",
    "İştah ve su içme durumunu takip edin.",
    "Belirti devam ederse yeni takip kontrolü oluşturun."
  ],
  "avoid_actions": [
    "Veteriner önermedikçe insan ilacı veya ağrı kesici vermeyin.",
    "Veteriner yönlendirmesi olmadan kusturmaya çalışmayın.",
    "Belirtiler kötüleşirse evde beklemeyin."
  ],
  "when_not_to_wait": [
    "Kanlı kusma görülürse",
    "Sürekli kusma olursa",
    "Su içemiyor veya suyu tutamıyorsa",
    "Belirgin halsizlik veya çökme varsa"
  ],
  "vet_preparation": [
    "Kusmuk fotoğrafı varsa rapora ekleyin.",
    "Son mama değişimini not edin.",
    "Kullandığı ilaçları rapora ekleyin."
  ],
  "followup_plan": {
    "enabled": true,
    "suggested_interval_hours": 24,
    "reason": "Kusma ve iştah durumu kısa aralıkla takip edilmelidir."
  },
  "disclaimer": "Bu değerlendirme veteriner muayenesinin yerine geçmez."
}
```

---

## 7. Kategori Bazlı Güvenli Öneriler

### 7.1. Kusma

Güvenli takip:

- Kusma sayısını ve saatlerini kaydedin.
- Kusmuk görünümünü not edin.
- Kusmuk fotoğrafı varsa rapora ekleyin.
- İştah ve su içme durumunu takip edin.
- Belirti devam ederse takip kontrolü oluşturun.

Yapılmaması gerekenler:

- Veteriner önermedikçe ilaç vermeyin.
- Veteriner yönlendirmesi olmadan kusturmaya çalışmayın.
- İnsan mide ilacı veya ağrı kesici vermeyin.
- Kan, yabancı cisim veya sürekli kusma varsa evde beklemeyin.

Beklenmemesi gereken durumlar:

- Kanlı kusma
- Sürekli kusma
- Su tutamama
- Şiddetli halsizlik
- Zehirlenme ihtimali
- Yabancı cisim yeme ihtimali
- Karın şişliği
- Yavru veya yaşlı pet

### 7.2. İshal / Dışkı Değişimi

Güvenli takip:

- Dışkı sıklığını ve görünümünü kaydedin.
- Dışkı fotoğrafı varsa ekleyin.
- Mama değişikliği olduysa not edin.
- Su içme durumunu takip edin.

Yapılmaması gerekenler:

- Veteriner önermedikçe ishal ilacı vermeyin.
- İnsan ilacı kullanmayın.
- Kanlı veya siyah dışkıda evde beklemeyin.
- Yavru petlerde uzun süre takip etmekle yetinmeyin.

Beklenmemesi gereken durumlar:

- Kanlı dışkı
- Siyah/katran gibi dışkı
- Şiddetli halsizlik
- Kusma ile birlikte ishal
- Yavru pet
- Uzun süren şiddetli ishal

### 7.3. Topallama / Hareket Sorunu

Güvenli takip:

- Kısa yürüyüş videosu ekleyin.
- Etkilenen pati/bacak fotoğrafı ekleyin.
- Hangi bacak olduğunu not edin.
- Zıplama, koşma ve merdiven kullanımını sınırlayın.
- Travma olduysa zamanını ve şeklini not edin.

Yapılmaması gerekenler:

- İnsan ağrı kesicisi vermeyin.
- Bölgeye sert masaj yapmayın.
- Zorla yürütmeyin.
- Şiddetli ağrıda evde beklemeyin.

Beklenmemesi gereken durumlar:

- Hiç basamama
- Şiddetli ağrı
- Trafik kazası / düşme
- Açık yara / kanama
- Ani arka bacak güçsüzlüğü
- Denge kaybı

### 7.4. Kulak

Güvenli takip:

- Kulak dış görünümünü zorlamadan fotoğraflayın.
- Kaşıma, baş sallama, kötü koku ve akıntı durumunu kaydedin.
- Basic Kit varsa kulak içi görüntüyü sadece pet rahatsa alın.
- Aynı kulakta tekrar eden kayıtları takip edin.

Yapılmaması gerekenler:

- Kulağa kulak çubuğu sokmayın.
- Sirke, alkol, oksijenli su veya ev tipi karışım uygulamayın.
- Veteriner önermedikçe kulak damlası kullanmayın.
- Pet acı hissediyorsa kamera/temizlik işlemi yapmayın.

Beklenmemesi gereken durumlar:

- Şiddetli ağrı
- Kanlı akıntı
- Denge kaybı
- Baş eğik durma
- Kulağa yabancı cisim şüphesi

### 7.5. Göz

Güvenli takip:

- Flaş kullanmadan net fotoğraf çekin.
- Hangi gözde olduğunu işaretleyin.
- Akıntı, kızarıklık, şişlik ve göz kısma durumunu kaydedin.
- Önceki göz fotoğraflarıyla karşılaştırın.

Yapılmaması gerekenler:

- İnsan göz damlası kullanmayın.
- Çay, bitkisel karışım veya ev tipi solüsyon uygulamayın.
- Göze baskı uygulamayın.
- Pet huzursuzsa çekim için zorlamayın.

Beklenmemesi gereken durumlar:

- Göz travması
- Gözünü açamama
- Şiddetli ağrı
- Kanama
- Ani şişlik
- Görme kaybı şüphesi
- Gözde belirgin bulanıklık

### 7.6. Deri / Yara / Şişlik

Güvenli takip:

- Bölgeyi net ışıkta fotoğraflayın.
- Aynı açı ve ışıkla tekrar fotoğraf alın.
- Alan büyüyor mu takip edin.
- Yalama/kaşıma davranışını not edin.
- Veteriner önerdiyse koruyucu yakalık kullanımını not edin.

Yapılmaması gerekenler:

- Ev tipi krem/merhem uygulamayın.
- Yarayı kazımayın/sıkmayın.
- Derin yarayı evde kapatmaya çalışmayın.
- Şiddetli kanamada beklemeyin.

Beklenmemesi gereken durumlar:

- Şiddetli kanama
- Derin yara
- Hızla büyüyen şişlik
- Kötü kokulu akıntı
- Yaygın kızarıklık + halsizlik
- Isırık/travma şüphesi

### 7.7. Ağız / Diş / Salya

Güvenli takip:

- Ağız/diş fotoğrafı yalnızca pet rahatsa çekin.
- Salya, ağız kokusu, yemek yerken zorlanma durumunu kaydedin.
- Diş eti rengini gözlemleyin.
- İştah değişimini takip edin.

Yapılmaması gerekenler:

- Ağzını zorla açmayın.
- İnsan ağrı kesicisi vermeyin.
- Veteriner önermedikçe ağız içi ürün kullanmayın.
- Ağızda yabancı cisim varsa çekiştirmeyin.

Beklenmemesi gereken durumlar:

- Diş eti mor/mavi/gri/çok soluk
- Ağızda kanama
- Şiddetli salya + halsizlik
- Zehirlenme ihtimali
- Yemek yiyememe
- Şiddetli ağrı

### 7.8. İdrar Sorunu

Güvenli takip:

- Kum kabına gitme sıklığını kaydedin.
- İdrar olup olmadığını not edin.
- İdrar rengi değişimi varsa fotoğraf ekleyin.
- Basic Kit varsa idrar strip sonucunu kayıt olarak ekleyin.
- Su içme durumunu takip edin.

Yapılmaması gerekenler:

- İdrar yapamama durumunda beklemeyin.
- Evde ilaç/bitkisel ürün vermeyin.
- Kum kabına sık gidip hiç idrar yapamıyorsa “stres” deyip geçmeyin.
- Özellikle erkek kedide evde takip ile yetinmeyin.

Beklenmemesi gereken durumlar:

- Hiç idrar yapamama
- Erkek kedide idrar zorlanması
- Kanlı idrar
- İdrar yaparken ağlama
- Halsizlik + idrar sorunu

### 7.9. Solunum / Öksürük

Güvenli takip:

- Öksürük/hırıltı sesi kısa kayıt olarak eklenebilir.
- Dinlenirken solunum videosu eklenebilir.
- Öksürüğün zamanı ve sıklığı kaydedilir.
- Egzersiz sonrası artıp artmadığı not edilir.

Yapılmaması gerekenler:

- Nefes zorluğunda video çekmekle vakit kaybetmeyin.
- İnsan öksürük şurubu veya ilaç vermeyin.
- Boğazına yabancı cisim şüphesinde evde müdahale etmeye çalışmayın.
- Kedide ağzı açık nefes almayı hafife almayın.

Beklenmemesi gereken durumlar:

- Nefes almakta zorlanma
- Ağız açık nefes alma, özellikle kedide
- Mor/mavi dil veya diş eti
- Bayılma
- Boğulma şüphesi
- Dinlenirken belirgin zor nefes alma

### 7.10. Zehirlenme / Yabancı Cisim

Güvenli takip:

- Yenen/yalalanan maddeyi ve ambalajını saklayın.
- Fotoğrafını rapora ekleyin.
- Ne zaman ve yaklaşık ne kadar alındığını not edin.
- Veterinerle hızlıca paylaşmak için rapor oluşturun.

Yapılmaması gerekenler:

- Veteriner yönlendirmesi olmadan kusturmaya çalışmayın.
- Evde bekleyip belirti çıkmasını izlemekle yetinmeyin.
- İnsan ilacı, aktif kömür veya ev karışımı vermeyin.
- Zehirlenme ihtimalini hafife almayın.

Beklenmemesi gereken durumlar:

- Zehirli madde ihtimali
- İnsan ilacı yutma
- Çikolata/kakao, temizlik ürünü, fare zehiri, bitki, ip/yabancı cisim şüphesi
- Kusma, salya, titreme, nöbet, halsizlik
- Nefes zorluğu

---

# 8. Takipli Muayene Modülü

## 8.1. Net Ürün Kararı

Tek seferlik kontrol yeterli değildir. Her kontrol sonucu gerekirse bir **takip planına** dönüşmelidir.

Bu özellik uygulamaya mutlaka eklenmelidir.

Çünkü:

- Belirtiler zamanla değişir.
- İlk kontrolde net olmayan risk, takipte belirginleşebilir.
- Kullanıcı uygulamaya tekrar döner.
- Pet sağlık hafızası daha anlamlı hale gelir.
- Veteriner raporu daha profesyonel olur.
- Ürün abonelik değerini artırır.
- “Tek seferlik AI testi” algısını kırar.

Yeni ana mantık:

```text
İlk kontrol
  -> Risk sonucu
    -> Takip planı önerisi
      -> 6/12/24/48 saat sonra takip kontrolü
        -> Değişim analizi
          -> Risk güncelleme
            -> Gerekirse veteriner raporu / acil yönlendirme
```

---

## 8.2. Takip Dosyası Nedir?

Takip dosyası, tek bir sağlık şikayeti etrafında açılan ve zaman içinde güncellenen kayıt grubudur.

Örnek takip dosyaları:

- Kusma takibi
- Topallama takibi
- Göz akıntısı takibi
- Kulak kaşıma takibi
- Deri/yara takibi
- İdrar sorunu takibi
- Operasyon sonrası yara takibi
- Kronik hastalık takibi
- Kilo takibi
- Öksürük/solunum takibi

Takip dosyası şu verileri bağlar:

- İlk şikayet
- İlk risk sonucu
- Soru cevapları
- Fotoğraf/video/ses kayıtları
- Ölçümler
- Sonraki takip kontrolleri
- Risk değişimi
- Kullanıcı notları
- Veteriner notları
- Raporlar

---

## 8.3. Takip Planı Ne Zaman Önerilir?

Takip planı şu durumlarda önerilmelidir:

- Düşük/orta risk ama belirti devam edebilir.
- Görsel değişim izlenebilir: deri, yara, göz, kulak.
- Ölçüm trendi önemlidir: kilo, ateş, solunum, idrar.
- İlk sonuç belirsizdir.
- Kullanıcı “takip etmek istiyorum” der.
- Aynı şikayet geçmişte tekrar etmiştir.
- Veteriner randevusu alınana kadar izleme gereklidir.
- Operasyon/tedavi sonrası süreçtir.
- Kronik hastalık takibidir.

Acil risk varsa takip planı ana öneri olmamalıdır. Acil durumda ana mesaj:

> **Beklemeden veteriner kliniğine başvurun.**

Takip seçeneği yalnızca ek olarak sunulabilir:

> **Bu acil kaydı veterinerle paylaşmak için geçmişe ekleyebilirsiniz.**

---

## 8.4. Takip Planı Aralıkları

| Durum | Önerilen Takip |
|---|---|
| Düşük risk hafif belirti | 24-48 saat |
| Orta risk sindirim belirtisi | 12-24 saat |
| Kusma/ishal | 12-24 saat |
| Deri/yara/göz/kulak görsel takip | 24-48 saat |
| Topallama | 24 saat |
| Solunum öksürük ama acil değil | 12-24 saat |
| Kilo takibi | Haftalık |
| Kronik takip | Günlük/haftalık kullanıcı seçimi |
| Operasyon sonrası | Günlük veya veteriner planına göre |

---

# 9. Takip Ekranları

## 9.1. Sonuç Ekranında Takip Önerisi

Route:

`/check/new/result`

Bölüm başlığı:

`Takip planı önerisi`

Örnek metin:

> “Bu belirtiyi 24 saat içinde tekrar değerlendirmeniz faydalı olabilir. Yeni takip kontrolünde kusma sayısı, iştah, su içme ve genel davranış tekrar sorulacak.”

Butonlar:

- `Takip Planı Oluştur`
- `Sadece Geçmişe Kaydet`
- `Hatırlatma Kur`
- `Şimdilik Atla`

Davranış:

- `Takip Planı Oluştur` → `/followups/new?sessionId=...`
- `Sadece Geçmişe Kaydet` → session completed, timeline kaydı
- `Hatırlatma Kur` → takip planı + notification
- `Şimdilik Atla` → takip planı olmadan sonuç tamamlanır

---

## 9.2. Takip Planı Oluştur

Route:

`/followups/new?sessionId=...`

Alanlar:

1. Takip başlığı
   - Varsayılan: `Kusma Takibi`, `Topallama Takibi`, `Göz Akıntısı Takibi`

2. Takip nedeni
   - İlk AI sonucu özetinden otomatik gelir.

3. Takip sıklığı
   - 6 saat sonra
   - 12 saat sonra
   - 24 saat sonra
   - 48 saat sonra
   - Günlük
   - Haftalık
   - Özel tarih/saat

4. Takipte sorulacaklar
   - Sistem seçer, kullanıcı görebilir.

5. Takipte istenecek medya/ölçüm
   - Sistem seçer, kullanıcı görebilir.

6. Hatırlatma
   - Açık / Kapalı

Butonlar:

- `Takibi Başlat`
- `Düzenle`
- `İptal`

Davranış:

- `Takibi Başlat`: `followup_case` oluşturur, ilk session’ı bu case’e bağlar ve hatırlatma kurar.
- `Düzenle`: takip sıklığı/görevler düzenlenir.
- `İptal`: sonuç ekranına döner.

---

## 9.3. Takip Dosyası Detayı

Route:

`/followups/:caseId`

Üst kart:

- Takip adı
- Pet adı
- Başlangıç tarihi
- Güncel risk seviyesi
- Son kontrol tarihi
- Son durum:
  - İyileşiyor
  - Aynı
  - Kötüleşiyor
  - Belirsiz
  - Veteriner önerildi
  - Acil

Bölümler:

1. Son durum
2. Takip zaman çizelgesi
3. Risk değişim grafiği
4. Ölçüm değişimleri
5. Medya karşılaştırması
6. Veteriner raporları

Butonlar:

- `Yeni Takip Kontrolü Yap`
- `Rapor Oluştur`
- `Hatırlatmayı Düzenle`
- `Takibi Kapat`
- `Veterinerle Paylaş`

---

## 9.4. Takip Kontrolü

Route:

`/followups/:caseId/check`

Takip kontrolü ilk kontrol kadar uzun olmamalıdır. Sadece değişim odaklı kısa sorular gelmelidir.

Ortak ilk soru:

`İlk kontrole göre durum nasıl?`

Seçenekler:

- Belirgin düzeldi
- Biraz düzeldi
- Aynı
- Biraz kötüleşti
- Belirgin kötüleşti
- Emin değilim

Sonra şikayete özel kısa sorular gelir.

Örnek kusma takibi:

- Son kontrolden beri kaç kez kustu?
- İştahı nasıl?
- Su içmesi nasıl?
- Halsizlik arttı mı?
- Kan/yabancı cisim gördünüz mü?
- Yeni kusmuk fotoğrafı eklemek ister misiniz?

Örnek topallama takibi:

- Etkilenen bacağa daha iyi basıyor mu?
- Ağrı arttı mı?
- Şişlik/yara oluştu mu?
- Yürüyüş videosu eklemek ister misiniz?

Örnek deri/yara takibi:

- Alan büyüdü mü?
- Kızarıklık arttı mı?
- Akıntı/koku oluştu mu?
- Yeni fotoğraf eklemek ister misiniz?

Butonlar:

- `Devam Et`
- `Medya Ekle`
- `Atla`
- `İptal`

---

## 9.5. Takip Sonucu

Route:

`/followups/:caseId/result`

Bölümler:

1. Güncel risk
2. Değişim durumu
3. Önceki kontrolle karşılaştırma
4. Güvenli takip adımları
5. Yapılmaması gerekenler
6. Ne zaman beklememeli?
7. Sonraki takip önerisi
8. Veteriner raporu

Butonlar:

- `Takibi Sürdür`
- `Takibi Kapat`
- `Veteriner Raporu Oluştur`
- `Veterinerle Paylaş`
- `Ana Sayfaya Dön`

---

# 10. Takip Modülü Veri Modeli

## 10.1. `followup_cases`

```sql
CREATE TABLE followup_cases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pet_id TEXT NOT NULL,
  initial_session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL, -- active, closed, escalated, emergency
  current_risk_level TEXT,
  current_risk_score INTEGER,
  trend_status TEXT, -- improving, same, worsening, unclear
  followup_interval_hours INTEGER,
  next_followup_at TEXT,
  reminder_enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT,
  closure_reason TEXT
);
```

## 10.2. `followup_checks`

```sql
CREATE TABLE followup_checks (
  id TEXT PRIMARY KEY,
  followup_case_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  check_number INTEGER NOT NULL,
  change_status TEXT, -- improved, slightly_improved, same, worse, much_worse, unclear
  risk_level TEXT,
  risk_score INTEGER,
  comparison_summary TEXT,
  recommendation_json TEXT,
  created_at TEXT NOT NULL
);
```

## 10.3. `followup_reminders`

```sql
CREATE TABLE followup_reminders (
  id TEXT PRIMARY KEY,
  followup_case_id TEXT NOT NULL,
  reminder_at TEXT NOT NULL,
  status TEXT NOT NULL, -- scheduled, sent, dismissed, completed
  channel TEXT, -- push, email, in_app
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## 10.4. `health_check_sessions` Tablosuna Eklenecek Alanlar

```sql
ALTER TABLE health_check_sessions ADD COLUMN followup_case_id TEXT;
ALTER TABLE health_check_sessions ADD COLUMN is_followup_check INTEGER DEFAULT 0;
ALTER TABLE health_check_sessions ADD COLUMN followup_check_number INTEGER;
```

---

# 11. Takip AI Çıktısı

Takip değerlendirmesi klasik sonuçtan farklı olarak değişim odaklı olmalıdır.

```json
{
  "followup_case_id": "case_123",
  "previous_risk_level": "medium",
  "current_risk_level": "low",
  "previous_risk_score": 62,
  "current_risk_score": 28,
  "trend_status": "improving",
  "comparison_summary": "Kusma sayısı azalmış, iştah normale dönmüş ve halsizlik bildirilmemiş.",
  "safe_followup_steps": [
    "Bugünkü durumu sağlık geçmişine kaydedin.",
    "Belirti tekrar ederse yeni takip kontrolü oluşturun."
  ],
  "avoid_actions": [
    "Veteriner önermedikçe ilaç vermeyin.",
    "Belirti tekrar kötüleşirse evde beklemeyin."
  ],
  "when_not_to_wait": [
    "Kusma yeniden sıklaşırsa",
    "Kan görülürse",
    "Halsizlik belirginleşirse",
    "Su içemiyor veya suyu tutamıyorsa"
  ],
  "next_followup": {
    "recommended": false,
    "reason": "Belirtiler düzelme eğiliminde."
  },
  "should_escalate_to_vet": false,
  "disclaimer": "Bu takip değerlendirmesi veteriner muayenesinin yerine geçmez."
}
```

---

# 12. Takipte Risk Değişimi Mantığı

## 12.1. Risk Düşebilir

Aşağıdaki durumlarda risk düşebilir:

- Belirti sıklığı azalmış
- İştah normale dönmüş
- Kusma/ishal durmuş
- Ağrı azalmış
- Topallama azalmış
- Fotoğraf karşılaştırmasında yara/kızarıklık küçülmüş
- Ateş/solunum/kilo ölçümü normale yaklaşmış

Kullanılacak dil:

> “Düzelme eğilimi olabilir.”

Kullanılmayacak dil:

> “İyileşti.”

## 12.2. Risk Artmalıdır

Aşağıdaki durumlarda risk artmalıdır:

- Belirti kötüleşmiş
- Yeni acil belirti eklenmiş
- Kusma/ishal sıklaşmış
- Kan görülmüş
- Halsizlik artmış
- Nefes sorunu eklenmiş
- İdrar yapamama bildirilmiş
- Yara büyümüş/akıntı/koku oluşmuş
- Topallama hiç basamama seviyesine gelmiş
- Göz/kulak şikayeti ağrı/denge kaybıyla ilerlemiş

Kullanılacak dil:

> “Kötüleşme belirtisi olabilir. Veteriner değerlendirmesi önerilir.”

Acil durumda:

> “Beklemeden veteriner kliniğine başvurun.”

---

# 13. Pro / Ücretsiz Ayrımı

Takip modülü uygulamanın ücretli değerini artırır.

## Ücretsiz Plan

- 1 aktif takip dosyası
- Sınırlı medya
- Temel hatırlatma
- Kısa geçmiş

## Pro Plan

- Birden fazla aktif takip dosyası
- Çoklu pet takibi
- Medya karşılaştırma
- Risk değişim grafiği
- Takip raporu PDF
- Hatırlatma planlama
- Basic Kit takipleri
- Geçmişe göre AI değerlendirme

## Basic Kit + Pro

- Kulak takip dosyası
- İdrar strip takip dosyası
- Deri/yara yakın görüntü takibi
- Ateş/kilo trendleri

---

# 14. Kabul Kriterleri

## 14.1. Güvenli Öneri

- Sonuç ekranında güvenli takip adımları var.
- Yapılmaması gerekenler bölümü var.
- Ne zaman beklememeli bölümü var.
- Veterinere hazırlık bölümü var.
- İlaç, doz, teşhis, tedavi veya kesin diyet önerisi yok.
- Her sonuçta veteriner muayenesi uyarısı var.

## 14.2. Takip Modülü

- Sonuç ekranından takip planı oluşturulabiliyor.
- Takip planı kategoriye göre önerilen süreyle geliyor.
- Takip dosyası açılıyor.
- İlk kontrol takip dosyasına bağlanıyor.
- Takip dosyası timeline gösteriyor.
- Yeni takip kontrolü yapılabiliyor.
- Takip kontrolü ilk kontrolden kısa ve değişim odaklı.
- Önceki ve yeni sonuç karşılaştırılıyor.
- Risk değişimi gösteriliyor.
- Takip raporu oluşturulabiliyor.
- Hatırlatma kurulabiliyor.

## 14.3. Acil Güvenlik

- Acil belirtilerde takip planı ana öneri olarak sunulmuyor.
- Acil belirtilerde kullanıcı “bekleyip takip et” akışına yönlendirilmiyor.
- Ana mesaj her zaman acil veteriner yönlendirmesi oluyor.

---

# 15. Ajan İçin Uygulama Sırası

1. Sonuç JSON formatına şu alanları ekle:
   - `safe_followup_steps`
   - `avoid_actions`
   - `when_not_to_wait`
   - `vet_preparation`
   - `followup_plan`

2. Sonuç ekranını bu blokları gösterecek şekilde güncelle.

3. Yasak öneriler listesini hem prompt hem kod tarafında guardrail olarak ekle.

4. Kategori bazlı güvenli öneri kütüphanesini oluştur.

5. Sonuç riskine göre takip planı öneren basit kural motorunu yaz.

6. `followup_cases`, `followup_checks`, `followup_reminders` tablolarını ekle.

7. `health_check_sessions` tablosuna takip bağlantı alanlarını ekle.

8. Sonuç ekranına `Takip Planı Oluştur` butonu ekle.

9. Takip planı oluşturma ekranını yap.

10. Takip dosyası detay ekranını yap.

11. Takip kontrolü kısa soru akışını yap.

12. Takip sonucu ve karşılaştırma ekranını yap.

13. Hatırlatma kurma/iptal etme fonksiyonlarını ekle.

14. Rapor oluştururken takip dosyasındaki tüm sessionları rapora dahil et.

15. Pro/Free limitlerini config olarak ekle.

16. Tüm metinleri i18n dosyasına taşı.

17. Test senaryolarını çalıştır.

---

# 16. AI Prompt Guardrail Talimatı

AI değerlendirme promptuna aşağıdaki güvenlik kuralları mutlaka eklenmelidir:

```text
Sen veteriner hekim yerine geçmezsin.
Teşhis koyma.
Hastalık adıyla kesin hüküm verme.
İlaç adı, doz, antibiyotik, ağrı kesici, damla, krem veya tedavi önerme.
Ev tipi karışım, kusturma yöntemi, aç bırakma veya kesin diyet talimatı verme.
Kullanıcıyı acil durumda evde bekletme.
Sadece triyaj, güvenli takip, kayıt, kaçınılacaklar, veteriner hazırlığı ve takip planı öner.
Her sonuçta veteriner muayenesinin yerine geçmediğini belirt.
Acil belirti varsa sonucu acil yönlendirme olarak ver.
```

---

# 17. Son Karar

Bu revizyon uygulamaya kesin eklenmelidir.

Asıl değer yalnızca “tek seferlik AI kontrol” değildir. Asıl değer:

- Pet’in geçmişini bilmek
- Aynı şikayeti zaman içinde takip etmek
- Riskin düşüp yükseldiğini görmek
- Kullanıcıyı yanlış ev tedavilerinden korumak
- Veterinere daha düzenli bilgi sunmak
- Gerektiğinde beklemeden kliniğe yönlendirmek

Nihai konumlandırma:

> **Pati Sağlık, teşhis koyan bir uygulama değil; pet sahibinin şikayeti doğru kaydetmesine, güvenli şekilde takip etmesine, riskli durumları kaçırmamasına ve veteriner görüşmesine daha hazırlıklı gitmesine yardımcı olan profesyonel pet sağlık takip asistanıdır.**
