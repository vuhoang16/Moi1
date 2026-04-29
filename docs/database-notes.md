# Database Design Notes — App Quản Lý Cho Thuê Nhà

**Schema file:** `docs/database-schema.sql`  
**Target:** Supabase (PostgreSQL 15+)  
**Generated:** 2026-04-16

---

## Architecture Overview

| Section | Content |
|---------|---------|
| 0 | Extensions: uuid-ossp, pg_trgm, unaccent |
| 1 | Enum types (12 enums replacing VARCHAR checks) |
| 2 | 13 core tables |
| 3 | 38 indexes (FK, status, date, full-text) |
| 4 | `updated_at` auto-trigger on all mutable tables |
| 5 | 5 business-logic triggers / helper functions |
| 6 | RLS policies (all 13 tables) |
| 7 | 2 helper views |
| 8 | Seed data for development |
| 9 | pg_cron schedule snippets |

---

## Key Design Decisions

### 1. Enums over VARCHAR
All status/type/role columns use PostgreSQL native enums. This enforces valid values at the DB layer, enables faster index scans, and keeps storage compact.

### 2. Generated Columns for Computed Money
`electricity_amount`, `water_amount`, and `total_amount` in `invoices` are `GENERATED ALWAYS AS ... STORED` columns. The database always computes them; the application never needs to send these values, preventing stale/wrong totals.

### 3. One Conversation per Contract
`conversations` has a `UNIQUE (contract_id)` constraint and the `ON CONFLICT DO NOTHING` pattern in the trigger. A chat thread is automatically created the moment a contract is activated.

### 4. Soft Cascade Strategy
- `rooms → properties`: CASCADE (room has no meaning without property)
- `contracts → rooms`: RESTRICT (history must be preserved)
- `invoices → contracts`: RESTRICT (billing history must be preserved)
- `payments → invoices`: RESTRICT (financial audit trail)
- `notifications → profiles`: CASCADE (notifications disappear with the user account)

### 5. Maintenance Tickets — contract_id Nullable
A landlord may log a maintenance ticket outside of an active contract context (e.g., between tenancies). `contract_id` is nullable with `ON DELETE SET NULL` to handle contract deletion without losing ticket history.

### 6. RLS Philosophy
- Landlords get `FOR ALL` on their own data.
- Tenants get `SELECT` on read-only entities (invoices, payments) and `ALL` on participatory entities (checklist records, maintenance tickets, messages).
- RLS is enforced even through views because the base tables have RLS enabled.

---

## Index Strategy

| Index Type | Tables Covered |
|------------|---------------|
| FK indexes | All foreign key columns |
| Status filter | contracts, invoices, payments, deposits, maintenance_tickets, notifications |
| Date range | contracts (start/end_date), invoices (due_date, year+month), payments (created_at) |
| Compound | contracts (landlord_id+status), contracts (tenant_id+status) |
| Partial | payments (transaction_ref WHERE NOT NULL), notifications (WHERE read_at IS NULL), messages (WHERE seen_at IS NULL) |
| GIN full-text | properties (name+address), maintenance_tickets (description) — Vietnamese-safe via `unaccent()` |

---

## Triggers Summary

| Trigger | Event | Effect |
|---------|-------|--------|
| `trg_contracts_sync_room_status` | AFTER INSERT/UPDATE ON contracts | Sets room status to `da_thue` / `trong` |
| `trg_contracts_create_conversation` | AFTER INSERT/UPDATE ON contracts | Creates conversation when status → `active` |
| `trg_messages_update_conversation` | AFTER INSERT ON messages | Updates `last_message_at` |
| `trg_auth_users_create_profile` | AFTER INSERT ON auth.users | Auto-creates profile row |
| `trg_*_updated_at` (×11) | BEFORE UPDATE | Sets `updated_at = NOW()` |

Scheduled functions (via pg_cron — must be enabled in Supabase):
- `fn_mark_overdue_invoices()` — daily at 01:00 UTC
- Inline contract expiry — daily at 02:00 UTC

---

## Migration Notes

### First-time deployment
1. Run the full `database-schema.sql` in the Supabase SQL Editor (or via `supabase db push`).
2. Verify the `auth.users` trigger was created:
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;
   ```
3. Enable `pg_cron` in Supabase dashboard → Database → Extensions, then uncomment Section 9 and run.

### Supabase Storage Buckets needed
Create these buckets in Supabase Storage:
- `property-photos` — public
- `room-photos` — public
- `contract-pdfs` — private (signed URLs only)
- `checklist-photos` — private
- `maintenance-media` — private
- `avatars` — public

### Environment configuration
Ensure Supabase service role key is never exposed to the client. All admin operations (e.g., marking invoices overdue, creating notifications) must go through Supabase Edge Functions using the service role.

---

## Review Checklist

### Schema integrity
- [x] All tables have UUID primary keys with `uuid_generate_v4()` defaults
- [x] All timestamp columns use `TIMESTAMPTZ` (timezone-aware)
- [x] All money columns use `DECIMAL(12, 2)` (no floating-point precision issues)
- [x] All array columns default to `'{}'` (not NULL)
- [x] All JSONB columns for dynamic data
- [x] `CHECK` constraints on enums (using native enum types)
- [x] `CHECK` constraints on numeric ranges (area > 0, meter readings increasing, rating 1-5)
- [x] Cross-column constraints (`end_date > start_date`, `landlord_id <> tenant_id`)
- [x] Business-rule constraints on deposits (refund fields required when status = refunded)

### Security
- [x] RLS enabled on all 13 application tables
- [x] No table is readable by everyone without an RLS policy
- [x] Tenants cannot access other tenants' data
- [x] Landlords cannot access other landlords' data
- [x] Messages are readable only by conversation participants
- [x] Payment insert policy prevents tenants paying on other tenants' invoices
- [x] Trigger functions use `SECURITY DEFINER` where elevated privileges are needed
- [x] Profile creation trigger uses `ON CONFLICT DO NOTHING` (idempotent)

### Performance
- [x] Every foreign key column has a dedicated index
- [x] High-cardinality filter columns are indexed (status, due_date, created_at)
- [x] Partial indexes used for common filtered queries (unread notifications, unseen messages)
- [x] Full-text GIN indexes with `unaccent()` for Vietnamese text search
- [x] Compound indexes for the most common JOIN patterns (landlord+status, tenant+status)

### Data integrity
- [x] `invoices` has UNIQUE (contract_id, month, year) — no duplicate monthly invoices
- [x] `conversations` has UNIQUE (contract_id) — one chat per contract
- [x] `checklist_records` has UNIQUE (contract_id, type) — one checkin + one checkout per contract
- [x] `checklist_templates` has UNIQUE (room_id) — one template per room
- [x] `fn_mark_overdue_invoices()` is idempotent (safe to re-run)

### Operational
- [x] Seed data uses fixed UUIDs for predictable dev/test environments
- [x] `COMMENT ON TABLE/COLUMN` annotations for all non-obvious fields
- [x] `pg_cron` snippets documented but commented out (safe for initial migration)
- [x] Views (`v_active_contracts`, `v_outstanding_invoices`) provided for common dashboard queries

---

## Known Limitations & Future Improvements

| Item | Notes |
|------|-------|
| Payment webhook validation | Implement in Edge Functions; store raw `gateway_response` JSONB for replay |
| Contract versioning | Currently no history of contract amendments. Add `contract_amendments` table if needed. |
| Multi-currency | All amounts assumed VND. Add `currency` column if internationalisation is required. |
| Soft delete | Tables use hard deletes with RESTRICT FKs. Consider adding `deleted_at` to `contracts`, `properties`, `rooms` for recycle-bin UX. |
| Audit log | No general audit log table. Consider `pgaudit` extension or a generic `audit_log` table for compliance. |
| Push notifications | `notifications` table covers in-app only. Integrate FCM/APNs token storage in `profiles` for mobile push. |
| File size limits | Enforce storage limits via Supabase Storage policies, not at DB level. |
