-- ═══════════════════════════════════════════════════════════════
-- LÉPÉS 1/2: Futtatsd ezt ELŐSZÖR a Supabase SQL Editorban
-- Advanced Service Pricing – Tábla migráció
-- ═══════════════════════════════════════════════════════════════

-- Hiányzó alaposzlopok hozzáadása (ha az eredeti schema.sql nem futott teljesen)
DO $$
DECLARE
  col TEXT;
  cols TEXT[][] := ARRAY[
    ARRAY['category',               'TEXT NOT NULL DEFAULT ''autószerviz'''],
    ARRAY['price',                  'NUMERIC'],
    ARRAY['duration_minutes',       'INTEGER'],
    ARRAY['description',            'TEXT'],
    ARRAY['is_mobile',              'BOOLEAN NOT NULL DEFAULT FALSE'],
    ARRAY['is_active',              'BOOLEAN NOT NULL DEFAULT TRUE'],
    ARRAY['is_visible_to_customer', 'BOOLEAN NOT NULL DEFAULT TRUE']
  ];
BEGIN
  FOR i IN 1..array_length(cols, 1) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'services' AND column_name = cols[i][1]
    ) THEN
      EXECUTE 'ALTER TABLE services ADD COLUMN ' || cols[i][1] || ' ' || cols[i][2];
    END IF;
  END LOOP;
END $$;

-- Új árazási oszlopok
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS pricing_type TEXT NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS unit_label TEXT DEFAULT 'db',
  ADD COLUMN IF NOT EXISTS unit_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS is_risky BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS risk_description TEXT,
  ADD COLUMN IF NOT EXISTS requires_customer_approval BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS default_quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

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

-- Technikus nehézség/kockázat jelzők
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
