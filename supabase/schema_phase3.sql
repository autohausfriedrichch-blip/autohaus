-- ============================================
-- PHASE 3: Garage, Pickup/Delivery, Tasks, Parts
-- Run in Supabase SQL Editor on project zpsjlmtrhsnchndifejd
-- ============================================

-- Add missing columns to work_orders
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS review_requested BOOLEAN DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS review_sent_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS scheduled_time TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'garage'; -- garage, mobile, pickup

-- Pickup & Delivery table
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
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal','urgent','express')),
  status TEXT DEFAULT 'scheduling',
  notes TEXT,
  driver_name TEXT,
  pickup_km INTEGER,
  checkout_km INTEGER,
  pricing_type TEXT DEFAULT 'fixed' CHECK (pricing_type IN ('fixed','distance','zone','free')),
  price NUMERIC(10,2) DEFAULT 0,
  pickup_confirmed_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','done','cancelled')),
  due_date DATE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  pickup_delivery_id UUID REFERENCES pickup_deliveries(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Parts requests table
CREATE TABLE IF NOT EXISTS parts_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  part_name TEXT NOT NULL,
  part_number TEXT,
  quantity INTEGER DEFAULT 1,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal','urgent')),
  status TEXT DEFAULT 'searching' CHECK (status IN ('searching','ordered','arrived','installed','cancelled')),
  supplier TEXT,
  estimated_price NUMERIC(10,2),
  actual_price NUMERIC(10,2),
  notes TEXT,
  ordered_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Follow-up tracking
CREATE TABLE IF NOT EXISTS customer_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- review_request, 24h_followup, seasonal_reminder, annual_service
  scheduled_for DATE,
  sent_at TIMESTAMPTZ,
  channel TEXT DEFAULT 'whatsapp', -- whatsapp, email, phone
  status TEXT DEFAULT 'pending', -- pending, sent, responded, skipped
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pickup_deliveries_customer ON pickup_deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_pickup_deliveries_status ON pickup_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_pickup_deliveries_pickup_datetime ON pickup_deliveries(pickup_datetime);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_parts_requests_work_order ON parts_requests(work_order_id);
CREATE INDEX IF NOT EXISTS idx_parts_requests_status ON parts_requests(status);

-- Disable RLS for simplicity (same as other tables)
ALTER TABLE pickup_deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE parts_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_followups DISABLE ROW LEVEL SECURITY;
