-- vehicle_events: timeline of all events per vehicle
CREATE TABLE IF NOT EXISTS vehicle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'work_order','checkin','checkout','reminder','photo','invoice','payment','pickup'
  event_date TIMESTAMPTZ DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC,
  work_order_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE vehicle_events DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_vehicle_events_vehicle ON vehicle_events(vehicle_id, event_date DESC);

-- maintenance_reminders
CREATE TABLE IF NOT EXISTS maintenance_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID,
  customer_id UUID,
  type TEXT NOT NULL, -- 'oil_change','annual_service','brakes','battery','climate','mfk','tires_summer','tires_winter','custom'
  title TEXT NOT NULL,
  due_date DATE,
  due_mileage INTEGER,
  status TEXT DEFAULT 'pending', -- 'pending','sent','opened','replied','booked'
  channel TEXT DEFAULT 'email', -- 'email','whatsapp','push'
  sent_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE maintenance_reminders DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_reminders_due ON maintenance_reminders(due_date, status);

-- parts_inventory (enhanced parts management)
CREATE TABLE IF NOT EXISTS parts_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  article_number TEXT,
  manufacturer TEXT,
  supplier TEXT,
  purchase_price NUMERIC DEFAULT 0,
  sale_price NUMERIC DEFAULT 0,
  margin_percent NUMERIC DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'in_stock', -- 'in_stock','ordered','arrived','used','low_stock'
  work_order_id UUID,
  vehicle_id UUID,
  customer_id UUID,
  expected_arrival DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE parts_inventory DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_parts_status ON parts_inventory(status);

-- travel_costs
CREATE TABLE IF NOT EXISTS travel_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID,
  distance_km NUMERIC DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  fuel_cost NUMERIC DEFAULT 0,
  vehicle_cost NUMERIC DEFAULT 0,
  real_cost NUMERIC DEFAULT 0,
  billed_amount NUMERIC DEFAULT 0,
  is_vip_free BOOLEAN DEFAULT false,
  region TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE travel_costs DISABLE ROW LEVEL SECURITY;

-- family_accounts
CREATE TABLE IF NOT EXISTS family_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  primary_customer_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE family_accounts DISABLE ROW LEVEL SECURITY;

-- Add columns to existing tables
ALTER TABLE customers ADD COLUMN IF NOT EXISTS family_account_id UUID;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vip_notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 85;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_service_date DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS next_service_date DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS next_tire_change DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tire_profile_mm NUMERIC;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS brake_condition TEXT DEFAULT 'good';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS battery_condition TEXT DEFAULT 'good';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mileage INTEGER DEFAULT 0;

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS technician_hours NUMERIC DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS fuel_cost NUMERIC DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS travel_cost NUMERIC DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS real_cost NUMERIC DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS profit NUMERIC DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS profit_percent NUMERIC DEFAULT 0;
