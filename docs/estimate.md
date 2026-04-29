# Sprint Estimate & Cost Breakdown — App Quản Lý Cho Thuê Nhà

**Role:** @estimator  
**Date:** 2026-04-23  
**Version:** 1.0  
**Input Docs:** architecture.md, product-spec.md, api-spec.md, design-spec.md, database-schema.sql

---

## Table of Contents

1. [Assumptions](#1-assumptions)
2. [Team Composition](#2-team-composition)
3. [Phase-by-Phase Estimate](#3-phase-by-phase-estimate)
4. [Sprint Plan (16-week roadmap)](#4-sprint-plan-16-week-roadmap)
5. [Infrastructure Cost Breakdown](#5-infrastructure-cost-breakdown)
6. [Third-Party Integration Cost](#6-third-party-integration-cost)
7. [Risk-Adjusted Totals](#7-risk-adjusted-totals)
8. [MVP Cutline](#8-mvp-cutline)
9. [Go/No-Go Gate Checklist](#9-gono-go-gate-checklist)

---

## 1. Assumptions

| # | Assumption |
|---|---|
| A-1 | Solo developer (full-stack) working 6–8 hours/day, 5 days/week |
| A-2 | Developer is proficient in React Native + NestJS but new to MoMo/ZaloPay APIs |
| A-3 | Supabase free tier for development; upgrade to Pro before launch |
| A-4 | Railway Starter plan for backend during development |
| A-5 | Apple Developer account and Google Play account already exist |
| A-6 | MoMo and ZaloPay sandbox accounts available from week 7 |
| A-7 | Design tokens from design-spec.md are final; no redesign mid-project |
| A-8 | No localization beyond Vietnamese (no i18n infrastructure needed) |
| A-9 | All estimates include unit + manual testing time, not a separate QA phase |
| A-10 | "Hours" = productive coding hours (not wall-clock) |

---

## 2. Team Composition

### Solo Developer (Recommended Baseline)

| Role | Coverage | Hours/Week |
|---|---|---|
| Full-stack Developer | All phases | 30–40h |
| **Total capacity** | | **30–40h/week** |

### 2-Person Team (Accelerated)

| Role | Coverage | Notes |
|---|---|---|
| Backend Developer | NestJS, Prisma, webhooks, PDF, jobs | ~60% of work |
| Frontend Developer | React Native, all screens, Socket.io client | ~40% of work |

With a 2-person team, the 16-week plan compresses to ~9–10 weeks.

---

## 3. Phase-by-Phase Estimate

### Phase 1 — Foundation (Auth, Monorepo, CI)

| Task | Hours | Notes |
|---|---|---|
| 1.1 Monorepo setup (pnpm workspaces, apps/mobile + apps/api) | 4 | |
| 1.2 NestJS bootstrap: Prisma, Supabase connection, JWT auth module | 10 | |
| 1.3 Expo app: React Navigation v7, theme provider, Zustand store | 8 | |
| 1.4 Prisma schema migration (from database-schema.sql) | 6 | 13 tables |
| 1.5 Auth module: email/password register + login + Supabase Auth sync | 16 | JWT refresh token |
| 1.6 Social login: Google OAuth via Supabase | 8 | |
| 1.7 Role selection screen (Chủ nhà / Người thuê) | 4 | |
| 1.8 Axios JWT interceptor (access + refresh) | 6 | |
| 1.9 GitHub Actions CI: lint, type-check, Prisma format | 6 | |
| **Phase 1 Total** | **68h** | **~2 weeks solo** |

**Deliverables:** Working auth (email + Google), role-based navigation skeleton, CI green.

---

### Phase 2 — Core Listing & Rooms

| Task | Hours | Notes |
|---|---|---|
| 2.1 Property CRUD API (NestJS) | 8 | |
| 2.2 Property screens: list, create, edit, detail | 16 | |
| 2.3 Room CRUD API | 8 | |
| 2.4 Room screens: list, create, edit, detail | 16 | |
| 2.5 Room status management + transition validation | 8 | trống/đã thuê/đang sửa |
| 2.6 Room availability calendar | 10 | custom month view |
| 2.7 Image upload to Supabase Storage (property + room) | 10 | multi-image picker |
| 2.8 Property/Room filter & search (NestJS query params) | 8 | |
| **Phase 2 Total** | **84h** | **~2.5 weeks solo** |

**Deliverables:** Full property + room management, image uploads, vacancy calendar.

---

### Phase 3 — Contracts & Digital Signatures

| Task | Hours | Notes |
|---|---|---|
| 3.1 Contract create API (auto-update room → Đã thuê) | 10 | |
| 3.2 Contract form UI (multi-step: 5 steps) | 20 | tenant picker, date, terms |
| 3.3 Puppeteer PDF service on Railway worker | 16 | Vietnamese HTML template |
| 3.4 BullMQ job queue for PDF generation | 6 | |
| 3.5 Signature canvas — landlord then tenant flow | 10 | react-native-signature-canvas |
| 3.6 Embed signature PNG into PDF, upload to Storage | 8 | |
| 3.7 Contract status machine (nhap → cho_ky → hieu_luc) | 8 | |
| 3.8 Auto-create ChatConversation on contract activation | 4 | |
| 3.9 Auto-create Deposit record | 4 | |
| 3.10 PDF viewer screen | 4 | react-native-pdf |
| 3.11 Contract list + status badges | 6 | |
| **Phase 3 Total** | **96h** | **~2.5 weeks solo** |

**Deliverables:** Contract lifecycle from creation to activation, signed PDF stored in Supabase.

---

### Phase 4 — Payments & Invoices

| Task | Hours | Notes |
|---|---|---|
| 4.1 Invoice create API (landlord enters meter readings) | 10 | electricity + water calc |
| 4.2 Invoice detail screen + auto-calculated total | 10 | |
| 4.3 Invoice list screen (both roles) | 8 | |
| 4.4 MoMo payment: create order, deeplink, webhook | 20 | sandbox → prod |
| 4.5 ZaloPay payment: create order, deeplink, webhook | 20 | sandbox → prod |
| 4.6 VietQR generation + SePay/PayOS webhook | 14 | |
| 4.7 Webhook handler + idempotency + auto-reconcile | 12 | R-2 mitigation |
| 4.8 Payment history screen (per invoice) | 8 | |
| 4.9 Deposit collection flow (landlord marks collected) | 8 | |
| 4.10 Deposit refund flow (landlord issues refund) | 8 | |
| 4.11 Deposit transaction history screen | 6 | |
| **Phase 4 Total** | **124h** | **~3 weeks solo** |

**Deliverables:** 3-gateway payment integration, automatic invoice reconciliation, deposit management.

**Note:** Payment phase is highest-risk. Add 20% buffer. Register MoMo + ZaloPay partner accounts no later than Week 5.

---

### Phase 5 — Checklist & Maintenance

| Task | Hours | Notes |
|---|---|---|
| 5.1 Checklist template CRUD API + screens | 12 | landlord defines items |
| 5.2 Check-in checklist UI (tenant confirms each item) | 14 | photo per item |
| 5.3 Checkout checklist + cross-check diff vs check-in | 16 | immutable after confirm |
| 5.4 Maintenance ticket submit (tenant): text + media | 12 | max 50MB video |
| 5.5 Maintenance ticket list (landlord): filter by status/priority | 10 | |
| 5.6 Status update flow + assign worker + schedule | 10 | statusHistory JSON |
| 5.7 Tenant rating & feedback form | 6 | 1-5 stars |
| **Phase 5 Total** | **80h** | **~2 weeks solo** |

**Deliverables:** Full checklist system (check-in/out), maintenance ticket lifecycle with worker assignment.

---

### Phase 6 — Realtime: Chat & Push Notifications

| Task | Hours | Notes |
|---|---|---|
| 6.1 Socket.io Gateway (NestJS) + auth middleware | 12 | JWT via handshake |
| 6.2 Chat message send/receive | 12 | |
| 6.3 Image message (upload Storage → send URL) | 8 | |
| 6.4 Seen status + read receipts | 8 | |
| 6.5 Conversation list (last message preview, unread badge) | 10 | |
| 6.6 FCM setup: firebase.json, APNs Auth Key | 6 | use Auth Key (no expiry) |
| 6.7 Push notification service: payment reminder, contract expiry, maintenance | 14 | |
| 6.8 Notification center screen + mark as read | 8 | |
| 6.9 In-app notification handler (foreground) | 6 | |
| 6.10 Background notification tap → deep link | 6 | |
| **Phase 6 Total** | **90h** | **~2.5 weeks solo** |

**Deliverables:** Real-time 1-1 chat per contract, FCM push for all key events, notification center.

---

### Phase 7 — Reports & Polish

| Task | Hours | Notes |
|---|---|---|
| 7.1 Monthly financial report API (aggregation queries) | 12 | per property, date range |
| 7.2 Report screen: tổng thu, bar chart, transaction list | 16 | Victory Native charts |
| 7.3 Export report to PDF (Puppeteer, queue) | 10 | |
| 7.4 Contract expiry warning cron (30 days ahead) | 6 | BullMQ recurring |
| 7.5 Monthly invoice auto-reminder cron | 6 | |
| 7.6 List virtualization + image caching | 8 | FlashList + expo-image |
| 7.7 TanStack Query stale-while-revalidate + offline | 8 | |
| 7.8 Error handling, empty states, loading skeletons | 14 | all screens |
| 7.9 App icon, splash screen, store metadata | 6 | EAS asset pipeline |
| **Phase 7 Total** | **86h** | **~2.5 weeks solo** |

**Deliverables:** Financial reporting with PDF export, cron reminders, production-ready polish.

---

### Phase 8 — Testing & Launch

| Task | Hours | Notes |
|---|---|---|
| 8.1 Unit tests: payment calc, invoice total, contract state machine | 16 | Jest |
| 8.2 Integration tests: MoMo/ZaloPay webhook handlers | 12 | real fixture payloads |
| 8.3 E2E: auth flow, contract creation, payment flow | 16 | Detox |
| 8.4 Security review: JWT, RLS policies, webhook signature | 10 | |
| 8.5 EAS Build (iOS + Android) + TestFlight / Internal Testing | 6 | |
| 8.6 Production deploy: Railway (backend) + Supabase (prod project) | 8 | env migration |
| 8.7 App Store + Google Play submission | 8 | metadata, screenshots |
| **Phase 8 Total** | **76h** | **~2 weeks solo** |

**Deliverables:** Test suite passing, apps submitted to both stores.

---

## 4. Sprint Plan (16-week roadmap)

```
Week  1–2   Phase 1 — Foundation            68h  ████████████████
Week  3–4   Phase 2 — Rooms & Properties    84h  ████████████████████
Week  5–6   Phase 3 — Contracts & PDF       96h  ████████████████████████
Week  7–9   Phase 4 — Payments              124h ██████████████████████████████
Week 10–11  Phase 5 — Checklist & Maint.    80h  ████████████████████
Week 12–13  Phase 6 — Chat & Notifications  90h  ██████████████████████
Week 14–15  Phase 7 — Reports & Polish      86h  █████████████████████
Week 16     Phase 8 — Testing & Launch      76h  ███████████████████
─────────────────────────────────────────────────────────────────
TOTAL                                       704h  16 weeks (solo)
                                                   9 weeks (2-person team)
```

### Milestones

| Week | Milestone | Gate Criteria |
|---|---|---|
| 2 | **M1 — Auth Green** | Register, login (email + Google), role selection working |
| 4 | **M2 — CRUD Complete** | Landlord can create property + room, upload photos |
| 6 | **M3 — Contract Active** | Full contract lifecycle, signed PDF in Supabase |
| 9 | **M4 — Payment Live** | At least 1 gateway (MoMo) in sandbox passing E2E |
| 11 | **M5 — Checklist + Maint.** | Tenant can submit maintenance ticket with photo |
| 13 | **M6 — Realtime Live** | Chat + push notification working on physical device |
| 15 | **M7 — Store-Ready** | Report generated, all empty states done, no crash on audit |
| 16 | **M8 — Submitted** | App Store + Google Play submissions sent |

---

## 5. Infrastructure Cost Breakdown

### Development Phase (Month 1–4)

| Service | Plan | Cost/month | Notes |
|---|---|---|---|
| Railway | Starter | $5 | NestJS API + Puppeteer worker |
| Supabase | Free | $0 | 500MB DB, 1GB Storage, 50K MAU |
| Firebase | Spark (Free) | $0 | FCM free tier |
| Domain (.vn) | — | ~$3 | amortized monthly |
| **Dev Total** | | **~$8/month** | |

### Production Phase (Month 5+)

| Service | Plan | Cost/month | Notes |
|---|---|---|---|
| Railway | Pro | $20 | Dedicated resources, custom domain, autoscale |
| Railway (Puppeteer worker) | Pro add-on | $10 | Separate worker service, more RAM |
| Supabase | Pro | $25 | 8GB DB, 100GB Storage, unlimited MAU |
| Firebase | Blaze (pay-as-you-go) | ~$0–5 | FCM is free; only Firestore usage billed |
| Domain + SSL | — | ~$3 | |
| **Production Total** | | **~$58–63/month** | |

### Annual Production Cost

| Item | Annual |
|---|---|
| Railway Pro (API + Worker) | $360 |
| Supabase Pro | $300 |
| Firebase | $0–60 |
| Domain + misc | $36 |
| **Total Infrastructure** | **~$696–756/year** |

---

## 6. Third-Party Integration Cost

| Service | Fee Model | Notes |
|---|---|---|
| MoMo | ~1.1% per transaction | Requires business registration |
| ZaloPay | ~0.5–1% per transaction | Requires business registration |
| VietQR via SePay | Free QR gen; SePay: 0.1–0.5% | PayOS alternative: flat 2,000–5,000 VND/transaction |
| VNPT SmartCA (future) | ~30,000–50,000 VND/signature | Phase 2 roadmap for legal e-signature |
| EAS Build (Expo) | Free tier: 25 builds/month | Sufficient for dev; $29/month for higher volume |

---

## 7. Risk-Adjusted Totals

| Risk | Probability | Additional Buffer |
|---|---|---|
| MoMo/ZaloPay API integration delays | High | +20h (Phase 4) |
| Apple review rejection (payment gateway) | Medium | +1 week (Phase 8) |
| Puppeteer memory issues on Railway | Medium | +8h (Phase 3) |
| Supabase Realtime unexpected limits | Low | +4h (Phase 6) |
| APNs cert/key issues | Low | +4h (Phase 6) |

**Base estimate:** 704h / 16 weeks  
**Risk-adjusted estimate:** 740h / 17 weeks (5% buffer on critical path)  
**Recommended commitment to stakeholders:** **18 weeks** (includes scope creep buffer)

---

## 8. MVP Cutline

If the timeline needs to compress to **10 weeks**, ship this subset:

### MVP Must-Have (Phases 1–4 core only)

| Feature | Include? |
|---|---|
| Auth (email + Google) | ✅ |
| Property + Room management | ✅ |
| Contract creation + PDF | ✅ |
| Signature (canvas) | ✅ |
| Invoice creation | ✅ |
| 1 payment gateway (MoMo only) | ✅ |
| Basic push notification (payment reminder) | ✅ |
| Maintenance ticket submit (no status tracking) | ✅ |
| Checklist (check-in only) | ✅ |

### MVP Defer to v1.1

| Feature | Reason |
|---|---|
| ZaloPay + VietQR | Add after MoMo proven |
| Chat (Socket.io) | Use simple SMS/Zalo link for v1 |
| Checkout checklist | Low MVP priority |
| Financial reports + PDF export | Defer to v1.1 |
| Cron reminders (contract expiry) | Manual workaround acceptable |

**MVP timeline:** ~10 weeks, ~440h

---

## 9. Go/No-Go Gate Checklist

### Before Writing Code (Gate 0 — NOW)

- [ ] Supabase project created (production project separate from dev)
- [ ] Railway account created, billing added
- [ ] Firebase project created, FCM enabled
- [ ] MoMo Partner/Merchant account applied
- [ ] ZaloPay Merchant account applied
- [ ] Apple Developer account active ($99/year paid)
- [ ] Google Play Developer account active ($25 one-time paid)
- [ ] GitHub repo created (private)
- [ ] `pnpm` installed locally
- [ ] Expo CLI + EAS CLI installed

### Before Phase 4 Starts (Gate 4 — Week 6)

- [ ] MoMo sandbox credentials received
- [ ] ZaloPay sandbox credentials received
- [ ] SePay/PayOS merchant account active
- [ ] Railway worker service deployed (Puppeteer healthcheck passing)
- [ ] Supabase Storage buckets created (contracts, avatars, maintenance-media)

### Before Phase 8 (Gate 8 — Week 15)

- [ ] All 8.1–8.4 tests passing in CI
- [ ] RLS policies audited against all 37 defined in database-schema.sql
- [ ] Webhook signature verification live for MoMo + ZaloPay
- [ ] Privacy policy published (URL ready for store submissions)
- [ ] Vietnamese app description + screenshots prepared (6.5" iPhone, tablet)
