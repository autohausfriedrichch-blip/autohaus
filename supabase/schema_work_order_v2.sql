CREATE TABLE IF NOT EXISTS work_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  description TEXT,
  user_name TEXT,
  phase TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE work_order_events DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wo_events ON work_order_events(work_order_id, created_at);

CREATE TABLE IF NOT EXISTS work_order_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_name TEXT,
  timer_started_at TIMESTAMPTZ,
  elapsed_seconds INTEGER DEFAULT 0,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE work_order_tasks DISABLE ROW LEVEL SECURITY;

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS arrival_status TEXT DEFAULT 'new';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS checkin_status TEXT DEFAULT 'pending';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS diagnostics_status TEXT DEFAULT 'not_needed';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS quote_status TEXT DEFAULT 'not_needed';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS parts_status TEXT DEFAULT 'not_needed';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS repair_status TEXT DEFAULT 'not_started';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS quality_status TEXT DEFAULT 'pending';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS checkout_status TEXT DEFAULT 'pending';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'waiting';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS health TEXT DEFAULT 'green';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS sla_warning BOOLEAN DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
