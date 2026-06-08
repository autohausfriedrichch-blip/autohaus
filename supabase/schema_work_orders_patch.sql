-- work_orders hiányzó oszlopok pótlása – biztonságos, újrafuttatható
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'garage';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS scheduled_time TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS is_mobile BOOLEAN DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS mobile_address TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS fault_description TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS work_to_do TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS work_done TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS parts_cost NUMERIC DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS labor_cost NUMERIC DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS customer_notes TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS next_service_date DATE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS checkin_mileage INTEGER;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS checkin_fuel_level INTEGER;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS checkin_signature TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS checkin_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS checkout_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS technician_hours NUMERIC DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS fuel_cost NUMERIC DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS travel_cost NUMERIC DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS real_cost NUMERIC DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS profit NUMERIC DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS profit_percent NUMERIC DEFAULT 0;

-- RLS kikapcsolás (ha még nincs)
ALTER TABLE work_orders DISABLE ROW LEVEL SECURITY;

SELECT 'work_orders patch OK' AS status;
