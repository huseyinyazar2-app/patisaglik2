# Pati Saglik Database

Bu klasor Turso/libSQL semasini ve migration notlarini tutar.

- `schema.sql`: ana tablolar, indexler ve seed verileri.
- `../docs/DATABASE_ARCHITECTURE.md`: sonraki ajanlar icin mimari kararlar ve uygulama sirasi.

Migration calistirma:

```powershell
$env:TURSO_DATABASE_URL="libsql://..."
$env:TURSO_AUTH_TOKEN="..."
node scripts/migrate-turso.mjs
```

Not: Token dosyalara yazilmaz. Uretimde frontend dogrudan Turso token kullanmayacak; kendi API/server katmani kullanilacak.
