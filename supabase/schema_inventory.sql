-- Parts catalog (master list, separate from parts_inventory which is per work order)
CREATE TABLE IF NOT EXISTS parts_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  article_number TEXT,
  barcode TEXT,
  manufacturer TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  supplier_id UUID,
  purchase_price NUMERIC(10,2) DEFAULT 0,
  sale_price NUMERIC(10,2) DEFAULT 0,
  vat_rate NUMERIC(5,2) DEFAULT 7.7,
  stock_qty INTEGER DEFAULT 0,
  min_stock_qty INTEGER DEFAULT 0,
  reorder_qty INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'db',
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE parts_catalog DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_parts_catalog_category ON parts_catalog(category);
CREATE INDEX IF NOT EXISTS idx_parts_catalog_article ON parts_catalog(article_number);

-- Stock movements log
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts_catalog(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in','out','adjustment','scrap')),
  quantity INTEGER NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  user_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_stock_movements_part ON stock_movements(part_id, created_at DESC);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  category TEXT DEFAULT 'parts',
  address TEXT,
  notes TEXT,
  orders_count INTEGER DEFAULT 0,
  avg_delivery_days INTEGER,
  last_order_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;

-- Service templates (bundles)
CREATE TABLE IF NOT EXISTS service_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  estimated_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  is_mobile BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE service_templates DISABLE ROW LEVEL SECURITY;

-- Service template items (what's included in a template)
CREATE TABLE IF NOT EXISTS service_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES service_templates(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('service','part','labor','checklist')),
  service_id UUID,
  part_id UUID,
  name TEXT NOT NULL,
  quantity NUMERIC(8,2) DEFAULT 1,
  unit_price NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  sort_order INTEGER DEFAULT 0
);
ALTER TABLE service_template_items DISABLE ROW LEVEL SECURITY;

-- Tire hotel (storage management)
CREATE TABLE IF NOT EXISTS tire_hotel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  season TEXT NOT NULL DEFAULT 'winter' CHECK (season IN ('winter','summer','allseason')),
  tire_size TEXT,
  dot TEXT,
  tread_depth_fl NUMERIC(4,2),
  tread_depth_fr NUMERIC(4,2),
  tread_depth_rl NUMERIC(4,2),
  tread_depth_rr NUMERIC(4,2),
  pressure_fl NUMERIC(5,2),
  pressure_fr NUMERIC(5,2),
  pressure_rl NUMERIC(5,2),
  pressure_rr NUMERIC(5,2),
  storage_location TEXT,
  storage_shelf TEXT,
  storage_row TEXT,
  status TEXT NOT NULL DEFAULT 'stored' CHECK (status IN ('stored','issued','mounted','scrapped')),
  notes TEXT,
  stored_at TIMESTAMPTZ DEFAULT NOW(),
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tire_hotel DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tire_hotel_customer ON tire_hotel(customer_id);
CREATE INDEX IF NOT EXISTS idx_tire_hotel_status ON tire_hotel(status);
