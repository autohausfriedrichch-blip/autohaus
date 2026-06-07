-- ============================================
-- PHASE 3 FIXED - No profiles FK dependency
-- Run in Supabase SQL Editor on zpsjlmtrhsnchndifejd
-- ============================================

-- New columns for work_orders
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS scheduled_time TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'garage';

-- Pickup & Delivery table (no profiles FK)
CREATE TABLE IF NOT EXISTS pickup_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  pickup_address TEXT,
  delivery_address TEXT,
  pickup_datetime TIMESTAMPTZ,
  delivery_datetime TIMESTAMPTZ,
  key_handover_method TEXT,
  parking_info TEXT,
  gate_code TEXT,
  contact_person TEXT,
  urgency TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'scheduling',
  notes TEXT,
  driver_name TEXT,
  pickup_km INTEGER,
  pricing_type TEXT DEFAULT 'fixed',
  price NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks table (UUID references to auth.users instead of profiles)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  due_date DATE,
  assigned_to UUID,
  created_by UUID,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Parts requests table (UUID references, no profiles FK)
CREATE TABLE IF NOT EXISTS parts_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  requested_by UUID,
  part_name TEXT NOT NULL,
  part_number TEXT,
  quantity INTEGER DEFAULT 1,
  urgency TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'searching',
  supplier TEXT,
  estimated_price NUMERIC(10,2),
  actual_price NUMERIC(10,2),
  notes TEXT,
  ordered_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS
ALTER TABLE pickup_deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE parts_requests DISABLE ROW LEVEL SECURITY;
