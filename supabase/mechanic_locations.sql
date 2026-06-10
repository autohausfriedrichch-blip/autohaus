-- Karl valós idejű GPS pozíciója
CREATE TABLE IF NOT EXISTS mechanic_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mechanic_id)
);
ALTER TABLE mechanic_locations DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_mechanic_locations ON mechanic_locations(mechanic_id);
