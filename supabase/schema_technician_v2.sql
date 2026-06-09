-- ─── work_order_tasks: add missing columns ─────────────────────────────────
ALTER TABLE work_order_tasks
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id),
  ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS checklist TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS checklist_done TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes_internal TEXT,
  ADD COLUMN IF NOT EXISTS notes_customer TEXT,
  ADD COLUMN IF NOT EXISTS notes_problem TEXT,
  ADD COLUMN IF NOT EXISTS notes_extra TEXT,
  ADD COLUMN IF NOT EXISTS requires_photo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS task_number TEXT;

-- ─── work_order_tasks: task_number auto-generation ─────────────────────────
CREATE SEQUENCE IF NOT EXISTS work_order_task_seq START 1;

CREATE OR REPLACE FUNCTION assign_task_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.task_number IS NULL THEN
    NEW.task_number := 'SG-T-' || LPAD(nextval('work_order_task_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_number ON work_order_tasks;
CREATE TRIGGER trg_task_number
  BEFORE INSERT ON work_order_tasks
  FOR EACH ROW EXECUTE FUNCTION assign_task_number();

-- ─── work_order_timeline table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  user_name TEXT,
  phase TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE work_order_timeline DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_wo_timeline_order ON work_order_timeline(work_order_id, created_at DESC);

-- ─── work_orders: pricing_mode ───────────────────────────────────────────────
ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS pricing_mode TEXT DEFAULT 'fixed';

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE work_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE work_order_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE work_order_timeline;
