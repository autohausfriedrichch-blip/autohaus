-- Fix RLS for tasks and related tables
-- Run this in Supabase SQL Editor if you get "violates row-level security policy" errors

ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE parts_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_followups DISABLE ROW LEVEL SECURITY;

-- If DISABLE doesn't work (e.g. superuser restriction), use permissive policies instead:
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "allow_all_tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "allow_all_parts_requests" ON parts_requests FOR ALL USING (true) WITH CHECK (true);
