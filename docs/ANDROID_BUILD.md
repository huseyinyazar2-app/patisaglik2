# Pet Help Android Build

Bu proje Capacitor Android ile mobil build almaya hazirlandi.

## Yerel bilgisayarda yapilacaklar

- Native Android build yerelde zorunlu degil.
- Web senkronu icin: `npm run cap:sync:android`
- Android Studio acmak gerekirse: `npm run cap:open:android`

## GitHub Actions

Workflow: `.github/workflows/android-build.yml`

- Her `main` push'unda veya manuel `workflow_dispatch` ile calisir.
- Debug APK her calismada uretilir.
- Signed release AAB sadece asagidaki GitHub Secrets doluysa uretilir:
  - `ANDROID_KEYSTORE_BASE64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`

## Imza dosyasi

Workflow, secret'lardan `android/keystore.properties` dosyasini gecici olarak uretir. Bu dosya ve keystore dosyalari repoya eklenmez.

## Store oncesi notlar

- Pet Help launcher/adaptive ikonlari Android ve PWA kaynaklarina islendi.
- Play Console icon ve feature graphic hazirlandi: `store/play-console/`.
- OTP ve odeme ekranlari ilk store surumu icin pasif tutuldu; sonradan guncelleme ile acilacak.
