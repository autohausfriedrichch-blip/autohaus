-- Autohaus Friedrich – Full Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- PROFILES (extends auth.users)
-- =====================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('super_admin','admin','mechanic','customer')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')));
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')));
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================
-- FLEET ACCOUNTS
-- =====================
CREATE TABLE IF NOT EXISTS fleet_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  billing_address TEXT,
  discount_percent NUMERIC DEFAULT 0,
  contract_status TEXT DEFAULT 'active' CHECK (contract_status IN ('active','inactive','pending')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE fleet_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fleet_accounts_all" ON fleet_accounts USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- =====================
-- CUSTOMERS
-- =====================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  preferred_contact TEXT DEFAULT 'phone' CHECK (preferred_contact IN ('phone','whatsapp','email')),
  marketing_consent BOOLEAN DEFAULT false,
  notes TEXT,
  fleet_account_id UUID REFERENCES fleet_accounts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_select" ON customers FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','mechanic')));
CREATE POLICY "customers_write" ON customers FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- =====================
-- VEHICLES
-- =====================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT,
  year INTEGER,
  license_plate TEXT,
  vin TEXT,
  mileage INTEGER,
  fuel_type TEXT DEFAULT 'petrol' CHECK (fuel_type IN ('petrol','diesel','electric','hybrid','lpg')),
  color TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','mechanic')));
CREATE POLICY "vehicles_write" ON vehicles FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- =====================
-- SERVICES
-- =====================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC,
  duration_minutes INTEGER,
  description TEXT,
  is_mobile BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_visible_to_customer BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_select" ON services FOR SELECT USING (true);
CREATE POLICY "services_write" ON services FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- =====================
-- BOOKINGS
-- =====================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  vehicle_id UUID REFERENCES vehicles(id),
  service_id UUID REFERENCES services(id),
  service_type TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  is_mobile BOOLEAN DEFAULT false,
  mobile_address TEXT,
  notes TEXT,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal','urgent','asap')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','mechanic')));
CREATE POLICY "bookings_write" ON bookings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- =====================
-- WORK ORDERS
-- =====================
CREATE SEQUENCE IF NOT EXISTS work_order_number_seq START 1000;

CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL DEFAULT ('WO-' || LPAD(nextval('work_order_number_seq')::TEXT, 5, '0')),
  customer_id UUID NOT NULL REFERENCES customers(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  service_type TEXT,
  status TEXT DEFAULT 'new_booking' CHECK (status IN (
    'new_booking','confirmed','checked_in','diagnostics','waiting_quote',
    'waiting_approval','waiting_parts','in_repair','quality_check',
    'ready','checkout_ready','delivered','closed'
  )),
  mechanic_id UUID REFERENCES profiles(id),
  scheduled_date DATE,
  scheduled_time TIME,
  is_mobile BOOLEAN DEFAULT false,
  mobile_address TEXT,
  fault_description TEXT,
  work_to_do TEXT,
  work_done TEXT,
  parts_cost NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  internal_notes TEXT,
  customer_notes TEXT,
  next_service_date DATE,
  checkin_mileage INTEGER,
  checkin_fuel_level INTEGER,
  checkin_signature TEXT,
  checkin_at TIMESTAMPTZ,
  checkout_at TIMESTAMPTZ,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','partial')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wo_select" ON work_orders FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','mechanic')));
CREATE POLICY "wo_write" ON work_orders FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));
CREATE POLICY "wo_mechanic_update" ON work_orders FOR UPDATE USING (mechanic_id = auth.uid());

-- =====================
-- WORK ORDER PHOTOS
-- =====================
CREATE TABLE IF NOT EXISTS work_order_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  category TEXT DEFAULT 'check-in',
  caption TEXT,
  is_visible_to_customer BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE work_order_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos_select" ON work_order_photos FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','mechanic')));
CREATE POLICY "photos_write" ON work_order_photos FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','mechanic')));

-- =====================
-- QUOTES
-- =====================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID REFERENCES work_orders(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  vehicle_id UUID REFERENCES vehicles(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','approved','rejected','expired')),
  valid_until DATE,
  items JSONB DEFAULT '[]',
  labor_cost NUMERIC DEFAULT 0,
  parts_cost NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 7.7,
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  customer_notes TEXT,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes_select" ON quotes FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','mechanic')));
CREATE POLICY "quotes_write" ON quotes FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- =====================
-- COMMUNICATION LOGS
-- =====================
CREATE TABLE IF NOT EXISTS communication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  work_order_id UUID REFERENCES work_orders(id),
  quote_id UUID REFERENCES quotes(id),
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp','phone','email','in_person')),
  message_type TEXT NOT NULL,
  content TEXT,
  handled_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commlogs_select" ON communication_logs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));
CREATE POLICY "commlogs_write" ON communication_logs FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- =====================
-- STORAGE BUCKET
-- =====================
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "photos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "photos_auth_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- =====================
-- SAMPLE DATA
-- =====================
-- Insert sample services
INSERT INTO services (name, category, price, duration_minutes, is_mobile, is_active, is_visible_to_customer) VALUES
('Mobil Reifenwechsel Komplett', 'mobil gumiszerviz', 120, 60, true, true, true),
('Mobil Reifenwechsel 2 Achsen', 'mobil gumiszerviz', 80, 45, true, true, true),
('Reifenhotel (Satz)', 'mobil gumiszerviz', 50, 15, false, true, true),
('Express Clean', 'mobil autótakarítás', 89, 60, true, true, true),
('Interior Premium', 'mobil autótakarítás', 149, 120, true, true, true),
('Exterior Premium', 'mobil autótakarítás', 129, 90, true, true, true),
('Full Detail', 'detailing', 349, 360, true, true, true),
('Family Car Clean', 'mobil autótakarítás', 169, 150, true, true, true),
('Fleet Clean', 'flotta', 79, 60, true, true, true),
('Inspektion Komplett', 'autószerviz', 280, 120, false, true, true),
('Ölwechsel', 'autószerviz', 89, 30, false, true, true),
('Diagnose / Fehlerauslese', 'autószerviz', 75, 30, false, true, true),
('Bremsbeläge vorne', 'autószerviz', 180, 60, false, true, true),
('MFK Vorbereitung', 'autószerviz', 150, 90, false, true, true),
('Pickup & Delivery', 'pickup & delivery', 45, 60, true, true, true)
ON CONFLICT DO NOTHING;
