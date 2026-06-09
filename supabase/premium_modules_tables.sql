-- ============================================================
-- Premium Modules – Database Tables
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Digital Signatures
CREATE TABLE IF NOT EXISTS signatures (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                 TEXT NOT NULL,
  customer_name        TEXT,
  signed_at            TIMESTAMPTZ DEFAULT NOW(),
  signature_data       TEXT,
  document_label       TEXT,
  work_order_id        UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  quote_id             UUID REFERENCES quotes(id) ON DELETE SET NULL,
  pickup_delivery_id   UUID REFERENCES pickup_deliveries(id) ON DELETE SET NULL,
  ip_address           TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE signatures DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_signatures_work_order ON signatures(work_order_id);

-- 2. Vehicle Health Reports
CREATE TABLE IF NOT EXISTS vehicle_health_reports (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id                   UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  customer_id                     UUID REFERENCES customers(id) ON DELETE SET NULL,
  vehicle_id                      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  categories                      JSONB DEFAULT '[]',
  health_score                    INTEGER DEFAULT 0 CHECK (health_score >= 0 AND health_score <= 100),
  next_service_recommendation     TEXT,
  general_notes                   TEXT,
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  created_by                      TEXT
);
ALTER TABLE vehicle_health_reports DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_vhr_work_order ON vehicle_health_reports(work_order_id);
CREATE INDEX IF NOT EXISTS idx_vhr_vehicle ON vehicle_health_reports(vehicle_id);

-- 3. Family Fleet Accounts
CREATE TABLE IF NOT EXISTS family_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  contact_person   TEXT,
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  vip              BOOLEAN DEFAULT FALSE,
  discount_type    TEXT DEFAULT 'none',
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE family_accounts DISABLE ROW LEVEL SECURITY;

-- Add family_account_id to customers (if not exists)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS family_account_id UUID REFERENCES family_accounts(id) ON DELETE SET NULL;

-- 4. Maintenance reminders enhancements
ALTER TABLE maintenance_reminders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE maintenance_reminders ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE maintenance_reminders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 5. Update communication tables only if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    EXECUTE 'ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT ''whatsapp''';
    EXECUTE 'ALTER TABLE messages ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT ''outbound''';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'communication_logs') THEN
    EXECUTE 'ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT ''whatsapp''';
  END IF;
END $$;

-- Done!
