-- Quality Control checks table
CREATE TABLE IF NOT EXISTS qc_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','needs_fix','approved','ready')),
  checked_items TEXT[] DEFAULT '{}',
  toggle_values JSONB DEFAULT '{}',
  notes TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(work_order_id)
);

ALTER TABLE qc_checks DISABLE ROW LEVEL SECURITY;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_qc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS qc_updated_at_trigger ON qc_checks;
CREATE TRIGGER qc_updated_at_trigger
  BEFORE UPDATE ON qc_checks
  FOR EACH ROW EXECUTE FUNCTION update_qc_updated_at();
