-- Tasks v2: Central Task Management System
-- Run in Supabase SQL Editor

-- Extend tasks table with new columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'general'
  CHECK (task_type IN ('workorder','general','daily','weekly','monthly','procurement','qc'));

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT 'none'
  CHECK (recurrence_type IN ('none','daily','weekdays','weekly','monthly'));

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[]; -- weekdays 0=Mon..6=Sun, or day-of-month 1..31

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS template_name TEXT;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_generated_date DATE;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS waiting_reason TEXT;

-- Ensure status includes 'waiting' and 'closed'
-- (existing check constraint may need to be dropped and recreated)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('open','in_progress','waiting','done','problem','cancelled','closed'));

-- Seed default templates (recurring tasks)
INSERT INTO tasks (title, description, task_type, priority, recurrence_type, recurrence_days, is_template, template_name, status)
VALUES
  ('Napi nyitás – szervizautó ellenőrzése', 'Olajszint, guminyomás, fények ellenőrzése', 'daily', 'normal', 'weekdays', NULL, true, 'Napi nyitás', 'open'),
  ('Napi nyitás – eszközök ellenőrzése', 'Szerszámok, emelők, berendezések rendben?', 'daily', 'normal', 'weekdays', NULL, true, 'Napi nyitás', 'open'),
  ('Napi nyitás – munkák áttekintése', 'Mai munkalapok és foglalások áttekintése', 'daily', 'normal', 'weekdays', NULL, true, 'Napi nyitás', 'open'),
  ('Napi zárás – munkalapok ellenőrzése', 'Minden nyitott munkalap státusz frissítve?', 'daily', 'normal', 'weekdays', NULL, true, 'Napi zárás', 'open'),
  ('Napi zárás – fotók feltöltve?', 'Minden elvégzett munkáról fotó dokumentálva?', 'daily', 'normal', 'weekdays', NULL, true, 'Napi zárás', 'open'),
  ('Heti készletellenőrzés', 'Olaj, szűrők, fékbetétek készletszint ellenőrzése', 'weekly', 'normal', 'weekly', ARRAY[4], true, 'Heti készlet', 'open'),
  ('Havi leltár', 'Teljes alkatrész raktár leltározása', 'monthly', 'high', 'monthly', ARRAY[1], true, 'Havi leltár', 'open'),
  ('Havi KPI riport', 'Bevétel, feladatok, ügyfél-elégedettség összesítése', 'monthly', 'normal', 'monthly', ARRAY[1], true, 'Havi riport', 'open')
ON CONFLICT DO NOTHING;

-- Ensure RLS is off
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
