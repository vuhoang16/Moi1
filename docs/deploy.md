# Deployment Guide — App Quản Lý Cho Thuê Nhà

## Deferred (not blocking launch)

These items were intentionally skipped for MVP. Revisit post-launch:

- **PDPA / Nghị định 13/2023 compliance** — add data processing consent screen, privacy policy link at registration, right-to-erasure flow in profile screen.
- **E-signature legal validity** — current canvas signature is cosmetic only. For enforceable contracts integrate VNPT SmartCA v2 API (`.well-known/did.json` + signing endpoint). Estimate: 3–5 days.
- **Maestro E2E flows** — `/.maestro/` flows exist but have not been validated on a real device. Run against Android emulator or physical device before store submission.
- **iOS App Store submission** — `eas.json` `submit.production.ios` has empty `ascAppId` and `appleTeamId`. Fill these before submitting to TestFlight.

---

## Pre-deployment checklist

### 1. GitHub Secrets (Settings → Secrets → Actions)

| Secret | Where to get it |
|---|---|
| `RAILWAY_TOKEN` | Railway dashboard → Account → Tokens |
| `EXPO_TOKEN` | expo.dev → Account → Access Tokens |
| `SUPABASE_URL` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase project → Settings → API → service_role key |

### 2. Railway environment variables

Set these on **both** `rentapp-api` and `rentapp-pdf-worker` services in Railway dashboard. Reference `infra/env.api.example` for all keys.

**Required before first deploy:**
```
DATABASE_URL           # Supabase pooler (port 6543)
DATABASE_URL_DIRECT    # Supabase direct (port 5432, for migrations)
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
JWT_SECRET             # min 32 chars, random
JWT_REFRESH_SECRET     # min 32 chars, different from JWT_SECRET
REDIS_URL              # Railway Redis add-on URL
CORS_ORIGIN            # your production domain, e.g. https://rentapp.vn
```

**Payment gateways (switch sandbox → production):**
```
MOMO_ENDPOINT=https://payment.momo.vn/v2/gateway/api/create
ZALOPAY_ENDPOINT=https://openapi.zalopay.vn/v2/create
MOMO_IPN_URL=https://api.rentapp.vn/v1/webhooks/momo
ZALOPAY_CALLBACK_URL=https://api.rentapp.vn/v1/webhooks/zalopay
```

**Firebase FCM:**
```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY   # paste the full key including \n escapes
```

### 3. Supabase storage buckets

Run `infra/supabase-storage-setup.sql` in Supabase SQL editor to create buckets:
- `avatars` (public)
- `contracts` (private)
- `property-images` (public)
- `maintenance-media` (public)

### 4. Railway: PDF worker memory

In Railway dashboard → `rentapp-pdf-worker` → Settings → Resources:
set Memory to **512 MB minimum** (Puppeteer requirement).

---

## Deploy API

Triggered automatically on push to `main` (via `.github/workflows/deploy-api.yml`).

Manual trigger:
```bash
railway up --service rentapp-api
railway up --service rentapp-pdf-worker
```

Health check: `GET https://api.rentapp.vn/v1/health`

---

## Build & distribute mobile app

### Preview build (internal testers via Expo Go / internal distribution)
```bash
eas build --platform all --profile preview
```

### Production build (app stores)
```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

### Submit to stores
```bash
# Android — fill google-play-key.json first
eas submit --platform android --profile production

# iOS — fill ascAppId + appleTeamId in eas.json first
eas submit --platform ios --profile production
```

---

## CI

`.github/workflows/ci.yml` runs on every push to `main`/`develop`:
- API: lint + typecheck + 119 unit tests + Prisma schema format check
- Mobile: lint + typecheck

All checks must be green before Railway auto-deploys.

---

## Domain

Point `api.rentapp.vn` → Railway service public URL (Settings → Networking → Custom Domain).
