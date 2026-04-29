# DevOps Runbook — App Quản Lý Cho Thuê Nhà

**Role:** @devops  
**Date:** 2026-04-23

---

## 1. Initial Project Setup (One-time, Day 1)

### 1.1 Supabase

1. Create **two** Supabase projects: `rentapp-dev` and `rentapp-prod`
2. In each project → SQL Editor → run `database-schema.sql` (full schema)
3. Run `infra/supabase-storage-setup.sql` to create storage buckets
4. Settings → Auth → enable **Google OAuth** provider
5. Settings → Auth → set Site URL = `rentapp://` (deep link for mobile)
6. Settings → Auth → add Redirect URL = `rentapp://auth/callback`
7. Copy `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` → `.env`

### 1.2 Railway

1. Create Railway project `rentapp`
2. Add two services: `rentapp-api` and `rentapp-pdf-worker`
3. Add Redis add-on (for BullMQ)
4. Set env vars from `infra/env.api.example` in Railway dashboard
5. Link GitHub repo → auto-deploy on push to `main`
6. Install Railway CLI: `npm i -g @railway/cli && railway login`

### 1.3 Firebase

1. Create Firebase project `rentapp-vn`
2. Add Android app (`com.rentapp.vn`) and iOS app (`com.rentapp.vn`)
3. Enable Cloud Messaging (FCM)
4. Download `google-services.json` → `apps/mobile/android/app/`
5. Download `GoogleService-Info.plist` → `apps/mobile/ios/`
6. Generate APNs **Auth Key** (.p8) from Apple Developer Portal → upload to Firebase
7. Export service account JSON → extract `project_id`, `client_email`, `private_key` → set in Railway env

### 1.4 GitHub Repository

```bash
git init
git remote add origin https://github.com/<org>/rentapp.git
git checkout -b main
git checkout -b develop
# develop is the default working branch; PRs → develop → merge to main for deploy
```

Add GitHub Secrets (Settings → Secrets):

| Secret | Value |
|---|---|
| `RAILWAY_TOKEN` | From Railway → Account Settings → Tokens |
| `EXPO_TOKEN` | From expo.dev → Account Settings → Access Tokens |
| `SUPABASE_URL` | Prod Supabase URL |
| `SUPABASE_SERVICE_KEY` | Prod service key |

### 1.5 EAS (Expo Application Services)

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli build:configure   # generates eas.json
npx eas-cli credentials       # set up iOS + Android signing
```

---

## 2. Environment Promotion Flow

```
Developer Machine
  └─ .env (from env.api.example)
  └─ apps/mobile/.env (from env.mobile.example)

Pull Request → develop branch
  └─ CI runs (ci.yml): lint, typecheck, unit tests, schema check

Merge to develop
  └─ No auto-deploy (dev env is local)

Merge to main (PR from develop)
  └─ deploy-api.yml → Railway auto-deploy
  └─ eas-build.yml → EAS Preview build (TestFlight / Internal Track)
```

---

## 3. Monorepo Structure

```
rentapp/
├── .github/
│   └── workflows/
│       ├── ci.yml                  # lint + test on PR
│       ├── deploy-api.yml          # Railway deploy on main push
│       └── eas-build.yml           # EAS build on main push
├── apps/
│   ├── api/                        # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── properties/
│   │   │   ├── rooms/
│   │   │   ├── contracts/
│   │   │   ├── invoices/
│   │   │   ├── payments/
│   │   │   ├── deposits/
│   │   │   ├── checklists/
│   │   │   ├── maintenance/
│   │   │   ├── chat/
│   │   │   ├── notifications/
│   │   │   ├── reports/
│   │   │   ├── webhooks/
│   │   │   ├── workers/
│   │   │   │   └── pdf.worker.ts
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # from database-schema.sql
│   │   │   └── migrations/
│   │   ├── test/
│   │   ├── .env                    # from env.api.example
│   │   └── package.json
│   └── mobile/                     # Expo React Native
│       ├── src/
│       │   ├── screens/
│       │   ├── components/
│       │   ├── navigation/
│       │   ├── store/              # Zustand slices
│       │   ├── queries/            # TanStack Query hooks
│       │   ├── api/                # Axios client
│       │   └── theme/              # design tokens from design-spec.md
│       ├── assets/
│       ├── app.json
│       ├── eas.json
│       ├── .env
│       └── package.json
├── packages/
│   └── shared/                     # shared types (DTOs, enums)
│       └── package.json
├── infra/
│   ├── env.api.example
│   ├── env.mobile.example
│   ├── railway.toml
│   ├── Dockerfile.api
│   ├── supabase-storage-setup.sql
│   └── devops-runbook.md
├── docs/                           # all spec docs
├── pnpm-workspace.yaml
└── package.json
```

---

## 4. Prisma Migration Workflow

```bash
# New feature requiring schema change:
cd apps/api
npx prisma migrate dev --name <migration-name>   # dev only
git add prisma/migrations/
git commit -m "db: <migration-name>"

# Production (runs automatically on Railway deploy):
# startCommand includes: pnpm prisma migrate deploy
```

**Never** run `prisma migrate dev` in production — always `migrate deploy`.

---

## 5. Supabase RLS Verification

After any schema change, verify RLS is still enforced:

```sql
-- Check all tables have RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = FALSE;   -- should return 0 rows

-- Spot-check: tenant cannot see another tenant's invoices
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub": "<other-tenant-uuid>"}';
SELECT * FROM invoices WHERE tenant_id = '<your-tenant-uuid>';
-- should return 0 rows
```

---

## 6. Secret Rotation Checklist

| Secret | Rotation Frequency | Notes |
|---|---|---|
| `JWT_SECRET` + `JWT_REFRESH_SECRET` | On breach / yearly | Rotate both together; active refresh tokens invalidated |
| Supabase `SERVICE_KEY` | On breach | Rotate in Supabase dashboard |
| MoMo `SECRET_KEY` | Per partner agreement | Update Railway env + redeploy |
| ZaloPay `KEY1`/`KEY2` | Per partner agreement | Update Railway env + redeploy |
| Firebase service account | Never (unless breach) | Key doesn't expire |
| APNs Auth Key | Never (p8 key doesn't expire) | Keep `.p8` file secure offline |

---

## 7. Monitoring & Alerting

### Railway

- Enable **Health Check** on `rentapp-api` → `/health` endpoint (NestJS Terminus)
- Set **Memory alert** on `rentapp-pdf-worker` at 400MB (Puppeteer-heavy)
- Enable **Deploy Failure** notifications → Slack or email

### Supabase

- Dashboard → Advisors: run weekly, fix any missing-index warnings
- Set alert if DB size > 400MB (free tier limit: 500MB)
- Monitor Realtime connection count (keep < 200 concurrent)

### Firebase

- FCM → Cloud Messaging → delivery stats → alert if delivery rate drops below 90%

---

## 8. Pre-Launch Security Checklist

- [ ] All 37 RLS policies from database-schema.sql active in prod Supabase
- [ ] Webhook signature verification: MoMo HMAC-SHA256, ZaloPay HMAC-SHA256
- [ ] `CORS_ORIGIN` set to specific domains (not `*`) in production
- [ ] Rate limiting enabled on NestJS (Throttler guard: 60 req/min per IP)
- [ ] Supabase `SERVICE_KEY` never exposed to mobile client
- [ ] All PII fields (fullName, phone, CCCD) encrypted at rest via Supabase Vault
- [ ] Privacy policy URL live before App Store submission
- [ ] HTTPS enforced on Railway (automatic via Railway's proxy)
- [ ] `/health` endpoint returns 200 (no sensitive data leaked)
- [ ] JWT access token TTL = 15min, refresh = 30 days, stored in SecureStore (not AsyncStorage)
