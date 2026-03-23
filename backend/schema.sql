-- ============================================================
--  InviteFlow — Complete Database Schema
--  Database: PostgreSQL 15+
--  Author:   InviteFlow System
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS (Admin accounts)
-- ============================================================
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username    VARCHAR(60)  UNIQUE NOT NULL,
    email       VARCHAR(120) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,          -- bcrypt hash
    full_name   VARCHAR(120) NOT NULL,
    role        VARCHAR(30)  NOT NULL DEFAULT 'admin'
                    CHECK (role IN ('superadmin','admin','viewer')),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    last_login  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. EVENTS
-- ============================================================
CREATE TABLE events (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name          VARCHAR(200) NOT NULL,
    description   TEXT,
    event_date    DATE         NOT NULL,
    event_time    TIME         NOT NULL,
    venue_name    VARCHAR(200) NOT NULL,
    venue_address TEXT,
    venue_city    VARCHAR(100),
    emoji         VARCHAR(10)  DEFAULT '🎉',
    banner_url    TEXT,                         -- S3/Cloudinary URL
    status        VARCHAR(20)  NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','completed','cancelled')),
    max_guests    INTEGER,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. GUESTS
-- ============================================================
CREATE TABLE guests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_code      VARCHAR(20) UNIQUE NOT NULL,  -- e.g. G-00142
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(30)  NOT NULL,
    email           VARCHAR(120),
    notes           TEXT,
    table_number    VARCHAR(20),
    is_vip          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, phone)
);

CREATE INDEX idx_guests_event   ON guests(event_id);
CREATE INDEX idx_guests_code    ON guests(guest_code);
CREATE INDEX idx_guests_phone   ON guests(phone);

-- ============================================================
-- 4. INVITATION CARDS (card design per event)
-- ============================================================
CREATE TABLE invitation_cards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    template_type   VARCHAR(30) DEFAULT 'custom'
                        CHECK (template_type IN ('custom','classic','modern','minimal')),
    bg_image_url    TEXT,
    overlay_color   VARCHAR(20) DEFAULT '#000000',
    overlay_opacity NUMERIC(3,2) DEFAULT 0.4,
    title_text      VARCHAR(200),
    subtitle_text   VARCHAR(300),
    body_message    TEXT,
    footer_text     VARCHAR(200),
    font_family     VARCHAR(80) DEFAULT 'Playfair Display',
    primary_color   VARCHAR(20) DEFAULT '#d4a843',
    text_color      VARCHAR(20) DEFAULT '#ffffff',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. QR CODES
-- ============================================================
CREATE TABLE qr_codes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id        UUID UNIQUE NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    token           VARCHAR(80) UNIQUE NOT NULL,   -- signed JWT-like token
    qr_image_url    TEXT,                          -- cached QR PNG URL
    scan_count      INTEGER NOT NULL DEFAULT 0,
    last_scanned_at TIMESTAMPTZ,
    last_scanned_ip INET,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qr_token ON qr_codes(token);

-- ============================================================
-- 6. INVITATIONS (send log per guest)
-- ============================================================
CREATE TABLE invitations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id        UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    channel         VARCHAR(20) NOT NULL CHECK (channel IN ('sms','whatsapp','email')),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','sent','delivered','failed')),
    provider        VARCHAR(40),                   -- 'africas_talking','twilio', etc.
    provider_msg_id VARCHAR(120),                  -- provider's message ID
    message_body    TEXT,
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    error_message   TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_guest   ON invitations(guest_id);
CREATE INDEX idx_invitations_event   ON invitations(event_id);
CREATE INDEX idx_invitations_status  ON invitations(status);

-- ============================================================
-- 7. RSVP RESPONSES
-- ============================================================
CREATE TABLE rsvp_responses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id        UUID UNIQUE NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    event_id        UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','confirmed','declined','maybe')),
    responded_at    TIMESTAMPTZ,
    response_note   TEXT,
    plus_ones       INTEGER NOT NULL DEFAULT 0,
    ip_address      INET,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rsvp_event  ON rsvp_responses(event_id);
CREATE INDEX idx_rsvp_status ON rsvp_responses(status);

-- ============================================================
-- 8. ATTENDANCE (QR scan log at event entrance)
-- ============================================================
CREATE TABLE attendance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id        UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    qr_code_id      UUID REFERENCES qr_codes(id),
    checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checked_in_by   UUID REFERENCES users(id),    -- staff who scanned
    check_in_method VARCHAR(20) DEFAULT 'qr_scan'
                        CHECK (check_in_method IN ('qr_scan','manual','nfc')),
    device_info     TEXT,
    ip_address      INET,
    UNIQUE (guest_id, event_id)                    -- one check-in per guest per event
);

CREATE INDEX idx_attendance_event ON attendance(event_id);

-- ============================================================
-- 9. BULK UPLOAD JOBS
-- ============================================================
CREATE TABLE bulk_upload_jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    file_name       VARCHAR(200),
    file_url        TEXT,
    total_rows      INTEGER DEFAULT 0,
    success_rows    INTEGER DEFAULT 0,
    failed_rows     INTEGER DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'processing'
                        CHECK (status IN ('processing','completed','failed')),
    error_log       JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- ============================================================
-- 10. AUDIT LOG
-- ============================================================
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id),
    action      VARCHAR(80) NOT NULL,             -- 'CREATE_GUEST', 'SEND_SMS', etc.
    entity_type VARCHAR(40),                      -- 'guest', 'event', 'invitation'
    entity_id   UUID,
    meta        JSONB DEFAULT '{}',
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user   ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','events','guests','invitation_cards','rsvp_responses']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END; $$;

-- ============================================================
-- VIEWS: handy reporting
-- ============================================================
CREATE OR REPLACE VIEW v_event_summary AS
SELECT
    e.id,
    e.name,
    e.event_date,
    e.event_time,
    e.venue_name,
    e.status,
    COUNT(DISTINCT g.id)                                      AS total_guests,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'sent')    AS invitations_sent,
    COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'confirmed') AS rsvp_confirmed,
    COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'declined')  AS rsvp_declined,
    COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'pending')   AS rsvp_pending,
    COUNT(DISTINCT a.id)                                      AS attended
FROM events e
LEFT JOIN guests      g ON g.event_id = e.id
LEFT JOIN invitations i ON i.event_id = e.id
LEFT JOIN rsvp_responses r ON r.event_id = e.id
LEFT JOIN attendance  a ON a.event_id = e.id
GROUP BY e.id;

-- ============================================================
-- SEED: default superadmin
-- ============================================================
INSERT INTO users (username, email, password, full_name, role)
VALUES (
    'admin',
    'admin@inviteflow.app',
    -- bcrypt of 'admin123' (replace in production!)
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMGaJ7A9UE9K6GBVbxOJfVQi',
    'System Administrator',
    'superadmin'
);
