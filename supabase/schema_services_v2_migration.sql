-- ═══════════════════════════════════════════════════════════════
-- LÉPÉS 1/2: Futtatsd ezt ELŐSZÖR a Supabase SQL Editorban
-- Advanced Service Pricing – Tábla migráció
-- ═══════════════════════════════════════════════════════════════

-- Alap oszlopok (ha hiányoznak)
ALTER TABLE services ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'autószerviz';
-- service_type: add if missing, then ensure default exists on the column either way
ALTER TABLE services ADD COLUMN IF NOT EXISTS service_type TEXT NOT NULL DEFAULT 'garage';
ALTER TABLE services ALTER COLUMN service_type SET DEFAULT 'garage';
UPDATE services SET service_type = 'garage' WHERE service_type IS NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS base_price NUMERIC;
ALTER TABLE services ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_mobile BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_visible_to_customer BOOLEAN NOT NULL DEFAULT TRUE;

-- Új árazási oszlopok
ALTER TABLE services ADD COLUMN IF NOT EXISTS pricing_type TEXT NOT NULL DEFAULT 'fixed';
ALTER TABLE services ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS unit_label TEXT DEFAULT 'db';
ALTER TABLE services ADD COLUMN IF NOT EXISTS unit_time_minutes INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_risky BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low';
ALTER TABLE services ADD COLUMN IF NOT EXISTS risk_description TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS requires_customer_approval BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS default_quantity INTEGER DEFAULT 1;
ALTER TABLE services ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Munkalap tételek tábla
CREATE TABLE IF NOT EXISTS work_order_service_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),
  service_name TEXT NOT NULL,
  pricing_type TEXT NOT NULL DEFAULT 'fixed',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2),
  unit_label TEXT DEFAULT 'db',
  fixed_price NUMERIC(10,2),
  hourly_rate NUMERIC(10,2),
  hours NUMERIC(5,2),
  difficulty_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  is_risky BOOLEAN DEFAULT FALSE,
  risk_acknowledged BOOLEAN DEFAULT FALSE,
  technician_note TEXT,
  extra_work_needed BOOLEAN DEFAULT FALSE,
  extra_work_description TEXT,
  final_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Technikus jelzők tábla
CREATE TABLE IF NOT EXISTS technician_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  service_item_id UUID REFERENCES work_order_service_items(id),
  flag_type TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  extra_hours NUMERIC(4,2) DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  barbara_notified BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE
);

ALTER TABLE work_order_service_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE technician_flags DISABLE ROW LEVEL SECURITY;

SELECT 'Migration OK – most futtasd a schema_services_v2_seed.sql fájlt' AS status;
