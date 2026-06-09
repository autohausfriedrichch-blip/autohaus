-- Fix 1: Add missing columns to work_order_tasks
ALTER TABLE work_order_tasks ADD COLUMN IF NOT EXISTS service_id UUID;
ALTER TABLE work_order_tasks ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'fixed';
ALTER TABLE work_order_tasks ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE work_order_tasks ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 0;
ALTER TABLE work_order_tasks ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]';
ALTER TABLE work_order_tasks ADD COLUMN IF NOT EXISTS checklist_done JSONB DEFAULT '[]';
ALTER TABLE work_order_tasks ADD COLUMN IF NOT EXISTS requires_photo BOOLEAN DEFAULT false;
ALTER TABLE work_order_tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE work_order_tasks ADD COLUMN IF NOT EXISTS notes_internal TEXT;
ALTER TABLE work_order_tasks ADD COLUMN IF NOT EXISTS notes_customer TEXT;
ALTER TABLE work_order_tasks ADD COLUMN IF NOT EXISTS notes_problem TEXT;
ALTER TABLE work_order_tasks ADD COLUMN IF NOT EXISTS notes_extra TEXT;
ALTER TABLE work_order_tasks ADD COLUMN IF NOT EXISTS task_number TEXT;

-- Fix 2: work_order_timeline does not exist — create it as alias for work_order_events
-- so existing code that inserts into work_order_timeline continues to work
CREATE TABLE IF NOT EXISTS work_order_timeline (
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
ALTER TABLE work_order_timeline DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wo_timeline ON work_order_timeline(work_order_id, created_at);
