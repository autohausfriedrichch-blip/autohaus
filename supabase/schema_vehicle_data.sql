-- Vehicle extended fields
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS power_kw INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS power_hp INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS displacement_cc INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS body_type TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transmission TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS drive_type TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS doors INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tire_size TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS oil_spec TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_label TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'manual'
  CHECK (data_source IN ('database', 'vin_api', 'manual', 'ocr'));
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin_validated BOOLEAN DEFAULT false;

-- Customer address extensions
ALTER TABLE customers ADD COLUMN IF NOT EXISTS canton TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'CH';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lat NUMERIC(10,7);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lng NUMERIC(10,7);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_source TEXT DEFAULT 'manual'
  CHECK (address_source IN ('google', 'manual'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_formatted TEXT;

-- App settings table (key-value store for API keys etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique index on VIN for duplicate detection (nullable VIN → partial index)
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_vin_unique
  ON vehicles (vin) WHERE vin IS NOT NULL AND vin <> '';

-- Unique index on license plate (case-insensitive via lower())
CREATE UNIQUE INDEX IF NOT EXISTS vehicles_plate_lower_unique
  ON vehicles (lower(license_plate));
