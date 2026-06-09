-- Hourly estimate fields on quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS pricing_mode TEXT DEFAULT 'fixed'
  CHECK (pricing_mode IN ('fixed', 'time', 'combined', 'estimate'));
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS estimate_min_hours NUMERIC(6,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS estimate_max_hours NUMERIC(6,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS estimate_quantity INTEGER DEFAULT 1;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS estimate_hourly_rate NUMERIC(8,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS estimate_min_price NUMERIC(10,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS estimate_max_price NUMERIC(10,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS estimate_risk_level TEXT DEFAULT 'low'
  CHECK (estimate_risk_level IN ('low', 'medium', 'high', 'extreme'));
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS estimate_customer_text TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS approval_limit NUMERIC(10,2);

-- Min/max hours defaults on services (for hourly/risky services)
ALTER TABLE services ADD COLUMN IF NOT EXISTS min_hours NUMERIC(5,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS max_hours NUMERIC(5,2);
