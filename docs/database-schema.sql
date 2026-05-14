-- ============================================================
-- App Quản Lý Cho Thuê Nhà — Production-Grade PostgreSQL Schema
-- Target: Supabase (PostgreSQL 15+)
-- Generated: 2026-04-16
-- ============================================================

-- ============================================================
-- SECTION 0: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- for full-text trigram search
CREATE EXTENSION IF NOT EXISTS "unaccent";     -- for Vietnamese accent-insensitive search

-- ============================================================
-- SECTION 1: ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('landlord', 'tenant');

CREATE TYPE property_type AS ENUM ('nha_nguyen_can', 'nha_tro', 'chung_cu');

CREATE TYPE room_status AS ENUM ('trong', 'da_thue', 'dang_sua_chua');

CREATE TYPE contract_status AS ENUM ('draft', 'active', 'expired', 'terminated');

CREATE TYPE invoice_status AS ENUM ('chua_thanh_toan', 'da_thanh_toan', 'qua_han');

CREATE TYPE payment_method AS ENUM ('momo', 'zalopay', 'vietqr', 'tien_mat');

CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed');

CREATE TYPE deposit_status AS ENUM ('held', 'refunded', 'partially_refunded');

CREATE TYPE checklist_type AS ENUM ('checkin', 'checkout');

CREATE TYPE maintenance_category AS ENUM ('dien', 'nuoc', 'noi_that', 'thiet_bi', 'khac');

CREATE TYPE maintenance_priority AS ENUM ('thap', 'trung_binh', 'khan_cap');

CREATE TYPE maintenance_status AS ENUM ('moi', 'dang_xu_ly', 'da_giao_tho', 'hoan_thanh');

CREATE TYPE notification_type AS ENUM ('thanh_toan', 'hop_dong', 'sua_chua', 'thong_bao');

CREATE TYPE message_type AS ENUM ('text', 'image');

-- ============================================================
-- SECTION 2: CORE TABLES
-- ============================================================

-- 2.1 profiles
-- Extends Supabase auth.users (auth.users is managed by Supabase Auth)
CREATE TABLE profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    phone           TEXT,
    avatar_url      TEXT,
    role            user_role NOT NULL DEFAULT 'tenant',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Extends Supabase auth.users with app-specific profile data.';
COMMENT ON COLUMN profiles.role IS 'landlord = chủ nhà, tenant = người thuê';

-- 2.2 properties
CREATE TABLE properties (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    name            TEXT NOT NULL,
    address         TEXT NOT NULL,
    type            property_type NOT NULL,
    description     TEXT,
    photos          TEXT[]    NOT NULL DEFAULT '{}',
    amenities       TEXT[]    NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE properties IS 'Landlord-owned properties (buildings / houses).';
COMMENT ON COLUMN properties.photos IS 'Array of public storage URLs.';
COMMENT ON COLUMN properties.amenities IS 'e.g. ["wifi", "parking", "camera"]';

-- 2.3 rooms
CREATE TABLE rooms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    floor           SMALLINT,
    area_m2         DECIMAL(8, 2) NOT NULL CHECK (area_m2 > 0),
    rent_price      DECIMAL(12, 2) NOT NULL CHECK (rent_price >= 0),
    deposit_amount  DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
    status          room_status NOT NULL DEFAULT 'trong',
    amenities       TEXT[]    NOT NULL DEFAULT '{}',
    photos          TEXT[]    NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE rooms IS 'Individual rentable rooms within a property.';
COMMENT ON COLUMN rooms.floor IS 'NULL means the property is single-floor or floor is irrelevant.';

-- 2.4 contracts
CREATE TABLE contracts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id             UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    landlord_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    tenant_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    rent_price          DECIMAL(12, 2) NOT NULL CHECK (rent_price >= 0),
    deposit_amount      DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    status              contract_status NOT NULL DEFAULT 'draft',
    pdf_url             TEXT,
    landlord_signed_at  TIMESTAMPTZ,
    tenant_signed_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT contracts_dates_check CHECK (end_date > start_date),
    CONSTRAINT contracts_different_parties CHECK (landlord_id <> tenant_id)
);

COMMENT ON TABLE contracts IS 'Lease agreements between landlord and tenant for a room.';

-- 2.5 invoices
CREATE TABLE invoices (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id             UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    room_id                 UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    month                   SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year                    SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    rent_amount             DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (rent_amount >= 0),
    -- electricity
    electricity_start       INTEGER NOT NULL DEFAULT 0 CHECK (electricity_start >= 0),
    electricity_end         INTEGER NOT NULL DEFAULT 0 CHECK (electricity_end >= electricity_start),
    electricity_unit_price  DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (electricity_unit_price >= 0),
    electricity_amount      DECIMAL(12, 2) GENERATED ALWAYS AS (
                                (electricity_end - electricity_start) * electricity_unit_price
                            ) STORED,
    -- water
    water_start             INTEGER NOT NULL DEFAULT 0 CHECK (water_start >= 0),
    water_end               INTEGER NOT NULL DEFAULT 0 CHECK (water_end >= water_start),
    water_unit_price        DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (water_unit_price >= 0),
    water_amount            DECIMAL(12, 2) GENERATED ALWAYS AS (
                                (water_end - water_start) * water_unit_price
                            ) STORED,
    service_fee             DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
    total_amount            DECIMAL(12, 2) GENERATED ALWAYS AS (
                                rent_amount
                                + ((electricity_end - electricity_start) * electricity_unit_price)
                                + ((water_end - water_start) * water_unit_price)
                                + service_fee
                            ) STORED,
    status                  invoice_status NOT NULL DEFAULT 'chua_thanh_toan',
    due_date                DATE NOT NULL,
    paid_at                 TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT invoices_unique_month UNIQUE (contract_id, month, year)
);

COMMENT ON TABLE invoices IS 'Monthly billing records per contract.';
COMMENT ON COLUMN invoices.electricity_amount IS 'Auto-computed: (end - start) * unit_price.';
COMMENT ON COLUMN invoices.water_amount IS 'Auto-computed: (end - start) * unit_price.';
COMMENT ON COLUMN invoices.total_amount IS 'Auto-computed sum of all charges.';

-- 2.6 payments
CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id          UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    amount              DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    method              payment_method NOT NULL,
    status              payment_status NOT NULL DEFAULT 'pending',
    transaction_ref     TEXT,
    gateway_response    JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE payments IS 'Individual payment transactions for invoices.';
COMMENT ON COLUMN payments.gateway_response IS 'Raw JSON from payment gateway (MoMo, ZaloPay, VietQR, etc.).';

-- 2.7 deposits
CREATE TABLE deposits (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id         UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    amount              DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    collected_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    refunded_at         TIMESTAMPTZ,
    refund_amount       DECIMAL(12, 2) CHECK (refund_amount >= 0),
    deduction_amount    DECIMAL(12, 2) CHECK (deduction_amount >= 0),
    deduction_reason    TEXT,
    status              deposit_status NOT NULL DEFAULT 'held',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT deposits_refund_when_refunded CHECK (
        status <> 'refunded' OR (refunded_at IS NOT NULL AND refund_amount IS NOT NULL)
    ),
    CONSTRAINT deposits_partial_refund_check CHECK (
        status <> 'partially_refunded' OR (
            refunded_at IS NOT NULL
            AND refund_amount IS NOT NULL
            AND deduction_amount IS NOT NULL
            AND deduction_reason IS NOT NULL
        )
    )
);

COMMENT ON TABLE deposits IS 'Security deposit tracking per contract.';

-- 2.8 checklist_templates
CREATE TABLE checklist_templates (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    items       JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT checklist_templates_one_per_room UNIQUE (room_id)
);

COMMENT ON TABLE checklist_templates IS 'Room inspection item templates. items = [{name, category, condition}].';

-- 2.9 checklist_records
CREATE TABLE checklist_records (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id             UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    type                    checklist_type NOT NULL,
    items                   JSONB NOT NULL DEFAULT '[]',
    signed_at               TIMESTAMPTZ,
    tenant_signature_url    TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT checklist_records_unique_type UNIQUE (contract_id, type)
);

COMMENT ON TABLE checklist_records IS 'Checkin/checkout inspection records. items = [{name, category, condition, tenant_confirmed, notes, photo_url}].';

-- 2.10 maintenance_tickets
CREATE TABLE maintenance_tickets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id     UUID REFERENCES contracts(id) ON DELETE SET NULL,
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    tenant_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    category        maintenance_category NOT NULL,
    description     TEXT NOT NULL,
    priority        maintenance_priority NOT NULL DEFAULT 'trung_binh',
    status          maintenance_status NOT NULL DEFAULT 'moi',
    media_urls      TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
    rating_comment  TEXT,

    CONSTRAINT maintenance_rating_requires_resolution CHECK (
        rating IS NULL OR resolved_at IS NOT NULL
    )
);

COMMENT ON TABLE maintenance_tickets IS 'Repair/maintenance requests submitted by tenants.';

-- 2.11 notifications
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type        notification_type NOT NULL,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    data        JSONB,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'In-app notifications per user.';

-- 2.12 conversations
CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id     UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    landlord_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    tenant_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT conversations_unique_contract UNIQUE (contract_id),
    CONSTRAINT conversations_different_parties CHECK (landlord_id <> tenant_id)
);

COMMENT ON TABLE conversations IS 'One chat thread per contract between landlord and tenant.';

-- 2.13 messages
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    type            message_type NOT NULL DEFAULT 'text',
    content         TEXT,
    image_url       TEXT,
    seen_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT messages_content_or_image CHECK (
        (type = 'text' AND content IS NOT NULL)
        OR (type = 'image' AND image_url IS NOT NULL)
    )
);

COMMENT ON TABLE messages IS 'Chat messages within a conversation.';

-- ============================================================
-- SECTION 3: INDEXES
-- ============================================================

-- profiles
CREATE INDEX idx_profiles_role ON profiles (role);

-- properties
CREATE INDEX idx_properties_landlord_id ON properties (landlord_id);
CREATE INDEX idx_properties_type ON properties (type);
-- Full-text search on property name and address (Vietnamese-friendly with unaccent)
CREATE INDEX idx_properties_fts ON properties
    USING GIN (to_tsvector('simple', unaccent(name) || ' ' || unaccent(address)));

-- rooms
CREATE INDEX idx_rooms_property_id ON rooms (property_id);
CREATE INDEX idx_rooms_status ON rooms (status);
CREATE INDEX idx_rooms_rent_price ON rooms (rent_price);

-- contracts
CREATE INDEX idx_contracts_room_id ON contracts (room_id);
CREATE INDEX idx_contracts_landlord_id ON contracts (landlord_id);
CREATE INDEX idx_contracts_tenant_id ON contracts (tenant_id);
CREATE INDEX idx_contracts_status ON contracts (status);
CREATE INDEX idx_contracts_start_date ON contracts (start_date);
CREATE INDEX idx_contracts_end_date ON contracts (end_date);
-- Compound: landlord's active contracts
CREATE INDEX idx_contracts_landlord_status ON contracts (landlord_id, status);
-- Compound: tenant's active contracts
CREATE INDEX idx_contracts_tenant_status ON contracts (tenant_id, status);

-- invoices
CREATE INDEX idx_invoices_contract_id ON invoices (contract_id);
CREATE INDEX idx_invoices_room_id ON invoices (room_id);
CREATE INDEX idx_invoices_status ON invoices (status);
CREATE INDEX idx_invoices_due_date ON invoices (due_date);
CREATE INDEX idx_invoices_year_month ON invoices (year DESC, month DESC);

-- payments
CREATE INDEX idx_payments_invoice_id ON payments (invoice_id);
CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_payments_method ON payments (method);
CREATE INDEX idx_payments_created_at ON payments (created_at DESC);
CREATE INDEX idx_payments_transaction_ref ON payments (transaction_ref) WHERE transaction_ref IS NOT NULL;

-- deposits
CREATE INDEX idx_deposits_contract_id ON deposits (contract_id);
CREATE INDEX idx_deposits_status ON deposits (status);

-- checklist_templates
CREATE INDEX idx_checklist_templates_room_id ON checklist_templates (room_id);

-- checklist_records
CREATE INDEX idx_checklist_records_contract_id ON checklist_records (contract_id);
CREATE INDEX idx_checklist_records_type ON checklist_records (type);

-- maintenance_tickets
CREATE INDEX idx_maintenance_room_id ON maintenance_tickets (room_id);
CREATE INDEX idx_maintenance_tenant_id ON maintenance_tickets (tenant_id);
CREATE INDEX idx_maintenance_contract_id ON maintenance_tickets (contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX idx_maintenance_status ON maintenance_tickets (status);
CREATE INDEX idx_maintenance_priority ON maintenance_tickets (priority);
CREATE INDEX idx_maintenance_created_at ON maintenance_tickets (created_at DESC);
-- Full-text search on description
CREATE INDEX idx_maintenance_fts ON maintenance_tickets
    USING GIN (to_tsvector('simple', unaccent(description)));

-- notifications
CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_type ON notifications (type);
CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC);

-- conversations
CREATE INDEX idx_conversations_contract_id ON conversations (contract_id);
CREATE INDEX idx_conversations_landlord_id ON conversations (landlord_id);
CREATE INDEX idx_conversations_tenant_id ON conversations (tenant_id);
CREATE INDEX idx_conversations_last_message ON conversations (last_message_at DESC);

-- messages
CREATE INDEX idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX idx_messages_sender_id ON messages (sender_id);
CREATE INDEX idx_messages_created_at ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_unseen ON messages (conversation_id, created_at DESC) WHERE seen_at IS NULL;

-- ============================================================
-- SECTION 4: UPDATED_AT TRIGGER (reusable function)
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Attach to every table that has updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'profiles', 'properties', 'rooms', 'contracts',
        'invoices', 'payments', 'deposits',
        'checklist_templates', 'checklist_records',
        'maintenance_tickets', 'conversations'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();',
            t, t
        );
    END LOOP;
END;
$$;

-- ============================================================
-- SECTION 5: BUSINESS LOGIC TRIGGERS
-- ============================================================

-- 5.1 Auto-update room status when contract changes
CREATE OR REPLACE FUNCTION fn_sync_room_status_on_contract()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- When a contract becomes active → mark room as da_thue
    IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status <> 'active') THEN
        UPDATE rooms SET status = 'da_thue', updated_at = NOW()
        WHERE id = NEW.room_id;

    -- When a contract is expired or terminated → mark room as trong
    ELSIF NEW.status IN ('expired', 'terminated')
          AND OLD.status NOT IN ('expired', 'terminated') THEN
        -- Only set to trong if no other active contract occupies the room
        IF NOT EXISTS (
            SELECT 1 FROM contracts
            WHERE room_id = NEW.room_id
              AND status = 'active'
              AND id <> NEW.id
        ) THEN
            UPDATE rooms SET status = 'trong', updated_at = NOW()
            WHERE id = NEW.room_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contracts_sync_room_status
AFTER INSERT OR UPDATE OF status ON contracts
FOR EACH ROW EXECUTE FUNCTION fn_sync_room_status_on_contract();

-- 5.2 Auto-create conversation when contract becomes active
CREATE OR REPLACE FUNCTION fn_create_conversation_on_contract_active()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status <> 'active') THEN
        INSERT INTO conversations (contract_id, landlord_id, tenant_id)
        VALUES (NEW.id, NEW.landlord_id, NEW.tenant_id)
        ON CONFLICT (contract_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contracts_create_conversation
AFTER INSERT OR UPDATE OF status ON contracts
FOR EACH ROW EXECUTE FUNCTION fn_create_conversation_on_contract_active();

-- 5.3 Update conversations.last_message_at on new message
CREATE OR REPLACE FUNCTION fn_update_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE conversations
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_messages_update_conversation
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION fn_update_conversation_last_message();

-- 5.4 Auto-mark invoice as qua_han if due date has passed (called by a scheduled job)
-- This function is intended to be called by a Supabase pg_cron job daily.
CREATE OR REPLACE FUNCTION fn_mark_overdue_invoices()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE invoices
    SET status = 'qua_han', updated_at = NOW()
    WHERE status = 'chua_thanh_toan'
      AND due_date < CURRENT_DATE;
END;
$$;

COMMENT ON FUNCTION fn_mark_overdue_invoices() IS
    'Call daily via pg_cron: SELECT cron.schedule(''mark-overdue-invoices'', ''0 1 * * *'', ''SELECT fn_mark_overdue_invoices()'');';

-- 5.5 Auto-create profile on new Supabase Auth user
-- Place this trigger on auth.users (Supabase allows this via a migration).
CREATE OR REPLACE FUNCTION fn_create_profile_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO profiles (id, name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'tenant')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auth_users_create_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION fn_create_profile_on_signup();

-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all application tables
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms               ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages            ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────────────────
-- Users can read any profile (needed for name display)
CREATE POLICY profiles_select ON profiles
    FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY profiles_update ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Insert handled by trigger fn_create_profile_on_signup
CREATE POLICY profiles_insert ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ── properties ────────────────────────────────────────────────
CREATE POLICY properties_landlord_all ON properties
    FOR ALL USING (auth.uid() = landlord_id);

-- Tenants with an active contract can view the property
CREATE POLICY properties_tenant_select ON properties
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contracts c
            JOIN rooms r ON r.id = c.room_id
            WHERE r.property_id = properties.id
              AND c.tenant_id = auth.uid()
              AND c.status = 'active'
        )
    );

-- ── rooms ─────────────────────────────────────────────────────
CREATE POLICY rooms_landlord_all ON rooms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = rooms.property_id
              AND p.landlord_id = auth.uid()
        )
    );

-- Tenants can see rooms they have/had contracts for
CREATE POLICY rooms_tenant_select ON rooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contracts c
            WHERE c.room_id = rooms.id
              AND c.tenant_id = auth.uid()
        )
    );

-- ── contracts ─────────────────────────────────────────────────
CREATE POLICY contracts_landlord_all ON contracts
    FOR ALL USING (auth.uid() = landlord_id);

CREATE POLICY contracts_tenant_select ON contracts
    FOR SELECT USING (auth.uid() = tenant_id);

-- ── invoices ──────────────────────────────────────────────────
CREATE POLICY invoices_landlord_all ON invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contracts c
            WHERE c.id = invoices.contract_id
              AND c.landlord_id = auth.uid()
        )
    );

CREATE POLICY invoices_tenant_select ON invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contracts c
            WHERE c.id = invoices.contract_id
              AND c.tenant_id = auth.uid()
        )
    );

-- ── payments ──────────────────────────────────────────────────
CREATE POLICY payments_landlord_all ON payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM invoices i
            JOIN contracts c ON c.id = i.contract_id
            WHERE i.id = payments.invoice_id
              AND c.landlord_id = auth.uid()
        )
    );

CREATE POLICY payments_tenant_select ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM invoices i
            JOIN contracts c ON c.id = i.contract_id
            WHERE i.id = payments.invoice_id
              AND c.tenant_id = auth.uid()
        )
    );

-- Tenants can insert a payment (initiate payment)
CREATE POLICY payments_tenant_insert ON payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices i
            JOIN contracts c ON c.id = i.contract_id
            WHERE i.id = payments.invoice_id
              AND c.tenant_id = auth.uid()
        )
    );

-- ── deposits ──────────────────────────────────────────────────
CREATE POLICY deposits_landlord_all ON deposits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contracts c
            WHERE c.id = deposits.contract_id
              AND c.landlord_id = auth.uid()
        )
    );

CREATE POLICY deposits_tenant_select ON deposits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contracts c
            WHERE c.id = deposits.contract_id
              AND c.tenant_id = auth.uid()
        )
    );

-- ── checklist_templates ───────────────────────────────────────
CREATE POLICY checklist_templates_landlord_all ON checklist_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rooms r
            JOIN properties p ON p.id = r.property_id
            WHERE r.id = checklist_templates.room_id
              AND p.landlord_id = auth.uid()
        )
    );

-- Tenants can view the template for their rented room
CREATE POLICY checklist_templates_tenant_select ON checklist_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contracts c
            WHERE c.room_id = checklist_templates.room_id
              AND c.tenant_id = auth.uid()
        )
    );

-- ── checklist_records ─────────────────────────────────────────
CREATE POLICY checklist_records_landlord_all ON checklist_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contracts c
            WHERE c.id = checklist_records.contract_id
              AND c.landlord_id = auth.uid()
        )
    );

CREATE POLICY checklist_records_tenant_all ON checklist_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contracts c
            WHERE c.id = checklist_records.contract_id
              AND c.tenant_id = auth.uid()
        )
    );

-- ── maintenance_tickets ───────────────────────────────────────
-- Tenants can create and view their own tickets
CREATE POLICY maintenance_tenant_all ON maintenance_tickets
    FOR ALL USING (auth.uid() = tenant_id);

-- Landlords can view and update tickets for their rooms
CREATE POLICY maintenance_landlord_all ON maintenance_tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rooms r
            JOIN properties p ON p.id = r.property_id
            WHERE r.id = maintenance_tickets.room_id
              AND p.landlord_id = auth.uid()
        )
    );

-- ── notifications ─────────────────────────────────────────────
CREATE POLICY notifications_own ON notifications
    FOR ALL USING (auth.uid() = user_id);

-- ── conversations ─────────────────────────────────────────────
CREATE POLICY conversations_participants ON conversations
    FOR ALL USING (
        auth.uid() = landlord_id OR auth.uid() = tenant_id
    );

-- ── messages ──────────────────────────────────────────────────
CREATE POLICY messages_participants_select ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations cv
            WHERE cv.id = messages.conversation_id
              AND (cv.landlord_id = auth.uid() OR cv.tenant_id = auth.uid())
        )
    );

CREATE POLICY messages_participants_insert ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM conversations cv
            WHERE cv.id = messages.conversation_id
              AND (cv.landlord_id = auth.uid() OR cv.tenant_id = auth.uid())
        )
    );

-- Senders can update (edit) their own messages
CREATE POLICY messages_sender_update ON messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- ============================================================
-- SECTION 7: HELPER VIEWS
-- ============================================================

-- Active contracts with room and property info (landlord-scoped via RLS)
CREATE OR REPLACE VIEW v_active_contracts AS
SELECT
    c.id                AS contract_id,
    c.status,
    c.start_date,
    c.end_date,
    c.rent_price,
    c.deposit_amount,
    r.id                AS room_id,
    r.name              AS room_name,
    r.floor,
    p.id                AS property_id,
    p.name              AS property_name,
    p.address,
    lp.id               AS landlord_id,
    lp.name             AS landlord_name,
    tp.id               AS tenant_id,
    tp.name             AS tenant_name,
    tp.phone            AS tenant_phone
FROM contracts c
JOIN rooms r        ON r.id = c.room_id
JOIN properties p   ON p.id = r.property_id
JOIN profiles lp    ON lp.id = c.landlord_id
JOIN profiles tp    ON tp.id = c.tenant_id
WHERE c.status = 'active';

COMMENT ON VIEW v_active_contracts IS 'Convenience view: active contracts with full context. RLS applies through base tables.';

-- Unpaid/overdue invoices with tenant info
CREATE OR REPLACE VIEW v_outstanding_invoices AS
SELECT
    i.id            AS invoice_id,
    i.month,
    i.year,
    i.total_amount,
    i.status,
    i.due_date,
    c.landlord_id,
    c.tenant_id,
    tp.name         AS tenant_name,
    tp.phone        AS tenant_phone,
    r.id            AS room_id,
    r.name          AS room_name,
    p.name          AS property_name
FROM invoices i
JOIN contracts c ON c.id = i.contract_id
JOIN rooms r     ON r.id = i.room_id
JOIN properties p ON p.id = r.property_id
JOIN profiles tp  ON tp.id = c.tenant_id
WHERE i.status IN ('chua_thanh_toan', 'qua_han');

COMMENT ON VIEW v_outstanding_invoices IS 'Unpaid and overdue invoices with full context.';

-- ============================================================
-- SECTION 8: SEED DATA (Development / Demo)
-- ============================================================

-- NOTE: Insert seed data only in development/staging databases.
-- In production, remove this section or guard with: DO $$ BEGIN IF current_database() <> 'prod' THEN ...

DO $$
DECLARE
    landlord_auth_id    UUID := '00000000-0000-0000-0000-000000000001';
    tenant_auth_id      UUID := '00000000-0000-0000-0000-000000000002';
    tenant2_auth_id     UUID := '00000000-0000-0000-0000-000000000003';
    prop1_id            UUID := uuid_generate_v4();
    prop2_id            UUID := uuid_generate_v4();
    room1_id            UUID := uuid_generate_v4();
    room2_id            UUID := uuid_generate_v4();
    room3_id            UUID := uuid_generate_v4();
    room4_id            UUID := uuid_generate_v4();
    contract1_id        UUID := uuid_generate_v4();
    contract2_id        UUID := uuid_generate_v4();
    invoice1_id         UUID := uuid_generate_v4();
BEGIN

-- Profiles (auth.users must exist; in dev, create via Supabase dashboard or Auth API)
-- Landlord based on real listing contact: Nguyễn Đức Vũ — 0936166578
INSERT INTO profiles (id, name, phone, role) VALUES
    (landlord_auth_id, 'Nguyễn Đức Vũ',   '0936166578', 'landlord'),
    (tenant_auth_id,   'Trần Thị Lan',     '0912345678', 'tenant'),
    (tenant2_auth_id,  'Phạm Minh Tuấn',   '0923456789', 'tenant')
ON CONFLICT (id) DO NOTHING;

-- Properties
-- prop1: real listing — Sleepbox Cao Cấp Thủ Đức (phongtro123.com)
INSERT INTO properties (id, landlord_id, name, address, type, description, amenities)
VALUES (
    prop1_id,
    landlord_auth_id,
    'Sleepbox Cao Cấp Thủ Đức',
    '45 Đường Võ Văn Ngân, Phường Bình Thọ, TP. Thủ Đức, TP.HCM',
    'nha_tro',
    'Sleepbox cao cấp mới 100%, có thang máy. Gần ĐH Ngân Hàng, SPKT, Cao đẳng Công Thương, Cao đẳng Nghề. Cách chợ Thủ Đức 500m, cách ngã tư Thủ Đức 300m. Cửa khoá riêng tư, đầy đủ tiện nghi.',
    ARRAY['thang_may', 'wifi', 'camera_an_ninh', 'bai_do_xe_may', 'nuoc_nong', 'khoa_rieng']
);

-- prop2: second building — chung cư mini Quận 7
INSERT INTO properties (id, landlord_id, name, address, type, description, amenities)
VALUES (
    prop2_id,
    landlord_auth_id,
    'Chung Cư Mini Quận 7',
    '18 Đường Huỳnh Tấn Phát, Phường Tân Thuận Đông, Quận 7, TP.HCM',
    'chung_cu_mini',
    'Căn hộ mini đầy đủ nội thất, ban công thoáng mát. Gần KCX Tân Thuận, siêu thị BigC Quận 7. An ninh 24/7.',
    ARRAY['thang_may', 'wifi', 'camera_an_ninh', 'bai_do_xe_may', 'nuoc_nong', 'ban_cong']
);

-- Rooms — prop1 (Sleepbox, price from real listing: 1.2M/tháng, area 25m²)
INSERT INTO rooms (id, property_id, name, floor, area_m2, rent_price, deposit_amount, status, amenities)
VALUES
    (room1_id, prop1_id, 'Phòng 101', 1, 25.0, 1200000, 2400000, 'da_thue',
     ARRAY['dieu_hoa', 'may_nuoc_nong', 'khoa_van_tay', 'ban_cong']),
    (room2_id, prop1_id, 'Phòng 102', 1, 25.0, 1200000, 2400000, 'trong',
     ARRAY['dieu_hoa', 'may_nuoc_nong', 'khoa_van_tay']),
    -- Rooms — prop2 (Chung cư mini Quận 7, ~4.5M/tháng)
    (room3_id, prop2_id, 'Phòng 201', 2, 35.0, 4500000, 9000000, 'da_thue',
     ARRAY['dieu_hoa', 'tu_lanh', 'may_giat', 'may_nuoc_nong', 'ban_cong']),
    (room4_id, prop2_id, 'Phòng 202', 2, 32.0, 4200000, 8400000, 'trong',
     ARRAY['dieu_hoa', 'tu_lanh', 'may_nuoc_nong', 'ban_cong']);

-- Checklist template for room 1
INSERT INTO checklist_templates (room_id, items) VALUES (
    room1_id,
    '[
        {"name": "Điều hòa",     "category": "Thiết bị điện", "condition": "Tốt"},
        {"name": "Tủ lạnh",      "category": "Thiết bị điện", "condition": "Tốt"},
        {"name": "Bóng đèn",     "category": "Điện",          "condition": "Tốt"},
        {"name": "Khóa cửa",     "category": "Nội thất",      "condition": "Tốt"},
        {"name": "Vòi nước",     "category": "Nước",          "condition": "Tốt"},
        {"name": "Bồn cầu",      "category": "Nước",          "condition": "Tốt"}
    ]'
);

-- Contracts
-- contract1: active — Trần Thị Lan thuê Phòng 101 tại Sleepbox Thủ Đức
INSERT INTO contracts (id, room_id, landlord_id, tenant_id, rent_price, deposit_amount,
                       start_date, end_date, status, landlord_signed_at, tenant_signed_at)
VALUES (
    contract1_id,
    room1_id, landlord_auth_id, tenant_auth_id,
    1200000, 2400000,
    '2026-01-01', '2026-12-31',
    'active',
    '2025-12-28 10:00:00+07', '2025-12-29 14:00:00+07'
);

-- contract2: draft — Phạm Minh Tuấn sắp thuê Phòng 201 tại Quận 7
INSERT INTO contracts (id, room_id, landlord_id, tenant_id, rent_price, deposit_amount,
                       start_date, end_date, status)
VALUES (
    contract2_id,
    room3_id, landlord_auth_id, tenant2_auth_id,
    4500000, 9000000,
    '2026-06-01', '2027-05-31',
    'draft'
);

-- Deposit for active contract
INSERT INTO deposits (contract_id, amount, status)
VALUES (contract1_id, 2400000, 'held');

-- Checkin record
INSERT INTO checklist_records (contract_id, type, items, signed_at)
VALUES (
    contract1_id,
    'checkin',
    '[
        {"name": "Điều hòa",  "condition": "Tốt", "tenant_confirmed": true,  "notes": "",            "photo_url": null},
        {"name": "Tủ lạnh",   "condition": "Tốt", "tenant_confirmed": true,  "notes": "",            "photo_url": null},
        {"name": "Bóng đèn",  "condition": "Tốt", "tenant_confirmed": true,  "notes": "",            "photo_url": null},
        {"name": "Khóa cửa",  "condition": "Tốt", "tenant_confirmed": true,  "notes": "",            "photo_url": null},
        {"name": "Vòi nước",  "condition": "Tốt", "tenant_confirmed": true,  "notes": "Hơi chảy nhỏ", "photo_url": null},
        {"name": "Bồn cầu",   "condition": "Tốt", "tenant_confirmed": true,  "notes": "",            "photo_url": null}
    ]',
    '2026-01-01 10:30:00+07'
);

-- Invoices (Jan–Mar 2026)
INSERT INTO invoices (id, contract_id, room_id, month, year,
                      rent_amount, electricity_start, electricity_end, electricity_unit_price,
                      water_start, water_end, water_unit_price,
                      service_fee, status, due_date, paid_at)
VALUES
    -- January — paid (tiền thuê 1.2M + điện 85kWh×3500 + nước 8m³×15000 + phí dịch vụ 50K = ~1.677M)
    (invoice1_id, contract1_id, room1_id, 1, 2026,
     1200000, 100, 185, 3500,
     10, 18, 15000,
     50000, 'da_thanh_toan', '2026-01-10', '2026-01-08 09:00:00+07'),
    -- February — paid
    (uuid_generate_v4(), contract1_id, room1_id, 2, 2026,
     1200000, 185, 268, 3500,
     18, 27, 15000,
     50000, 'da_thanh_toan', '2026-02-10', '2026-02-09 11:00:00+07'),
    -- March — unpaid (overdue)
    (uuid_generate_v4(), contract1_id, room1_id, 3, 2026,
     1200000, 268, 351, 3500,
     27, 36, 15000,
     50000, 'qua_han', '2026-03-10', NULL),
    -- April — unpaid (current)
    (uuid_generate_v4(), contract1_id, room1_id, 4, 2026,
     1200000, 351, 430, 3500,
     36, 45, 15000,
     50000, 'chua_thanh_toan', '2026-04-10', NULL);

-- Payment for January invoice
INSERT INTO payments (invoice_id, amount, method, status, transaction_ref)
VALUES (invoice1_id, 1547500, 'momo', 'success', 'MOMO_20260108_001');

-- Maintenance ticket — thực tế từ listing: điều hoà không mát
INSERT INTO maintenance_tickets (contract_id, room_id, tenant_id, category, description, priority, status)
VALUES (
    contract1_id, room1_id, tenant_auth_id,
    'dien', 'Điều hoà phòng 101 chạy nhưng không ra hơi lạnh, đã thử reset nhưng không được. Ngoài trời nắng nóng, phòng rất bức bí.',
    'cao', 'dang_xu_ly'
);

-- Notifications
INSERT INTO notifications (user_id, type, title, body, data)
VALUES
    (tenant_auth_id, 'thanh_toan',
     'Hóa đơn tháng 4/2026 chưa thanh toán',
     'Hóa đơn tháng 4/2026 phòng 101 — Sleepbox Thủ Đức sẽ đến hạn ngày 10/04/2026. Vui lòng thanh toán đúng hạn để tránh phát sinh phí trễ hạn.',
     '{"invoice_id": null, "month": 4, "year": 2026}'),
    (landlord_auth_id, 'sua_chua',
     'Yêu cầu bảo trì khẩn từ phòng 101',
     'Khách thuê Trần Thị Lan gửi yêu cầu: Điều hoà phòng 101 không lạnh. Mức độ: Cao.',
     '{"room_name": "Phòng 101", "priority": "cao"}');

END $$;

-- ============================================================
-- SECTION 9: pg_cron SCHEDULE (run after enabling pg_cron extension)
-- ============================================================
-- Uncomment and run after enabling pg_cron in Supabase:
--
-- SELECT cron.schedule(
--     'mark-overdue-invoices',
--     '0 1 * * *',                  -- daily at 01:00 UTC
--     'SELECT fn_mark_overdue_invoices()'
-- );
--
-- SELECT cron.schedule(
--     'expire-old-contracts',
--     '0 2 * * *',                  -- daily at 02:00 UTC
--     $$
--         UPDATE contracts
--         SET status = 'expired', updated_at = NOW()
--         WHERE status = 'active' AND end_date < CURRENT_DATE;
--     $$
-- );

-- ============================================================
-- END OF SCHEMA
-- ============================================================
