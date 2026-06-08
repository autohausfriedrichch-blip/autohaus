-- ============================================
-- SETTINGS / BEÁLLÍTÁSOK SCHEMA
-- Run in Supabase SQL Editor
-- ============================================

-- System settings key-value store
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category, key)
);
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;

-- Default settings
INSERT INTO system_settings (category, key, value) VALUES
  ('company', 'name', '"Autohaus Friedrich"'),
  ('company', 'slogan', '"Swiss Automotive Service"'),
  ('company', 'phone', '"+41 33 123 45 67"'),
  ('company', 'whatsapp', '"+41 79 123 45 67"'),
  ('company', 'email', '"info@autohaus-friedrich.ch"'),
  ('company', 'website', '"autohaus-kappa.vercel.app"'),
  ('company', 'address', '"Musterstrasse 1"'),
  ('company', 'postal_code', '"3600"'),
  ('company', 'city', '"Thun"'),
  ('company', 'country', '"Schweiz"'),
  ('company', 'uid', '"CHE-123.456.789"'),
  ('company', 'mwst', '"CHE-123.456.789 MWST"'),
  ('company', 'iban', '"CH56 0483 5012 3456 7800 9"'),
  ('company', 'bic', '"CRESCHZZ"'),
  ('company', 'bank_name', '"Credit Suisse"'),
  ('pricing', 'hourly_rate', '125'),
  ('pricing', 'mobile_hourly_rate', '145'),
  ('pricing', 'urgent_hourly_rate', '175'),
  ('pricing', 'tax_rate', '7.7'),
  ('pricing', 'currency', '"CHF"'),
  ('documents', 'quote_prefix', '"SG-Q"'),
  ('documents', 'workorder_prefix', '"SG-WO"'),
  ('documents', 'checkin_prefix', '"SG-CI"'),
  ('documents', 'checkout_prefix', '"SG-CO"'),
  ('documents', 'year_in_number', 'true'),
  ('booking', 'max_daily_bookings', '8'),
  ('booking', 'slot_duration', '60'),
  ('booking', 'opening_hours', '{"monday":{"open":"08:00","close":"18:00","active":true},"tuesday":{"open":"08:00","close":"18:00","active":true},"wednesday":{"open":"08:00","close":"18:00","active":true},"thursday":{"open":"08:00","close":"18:00","active":true},"friday":{"open":"08:00","close":"17:00","active":true},"saturday":{"open":"09:00","close":"13:00","active":true},"sunday":{"open":"00:00","close":"00:00","active":false}}'),
  ('notifications', 'new_booking', 'true'),
  ('notifications', 'quote_accepted', 'true'),
  ('notifications', 'whatsapp_received', 'true'),
  ('notifications', 'parts_arrived', 'true'),
  ('checkin', 'require_mileage', 'true'),
  ('checkin', 'require_plate_photo', 'true'),
  ('checkin', 'require_damage_photo', 'true'),
  ('checkout', 'require_photos', 'true'),
  ('checkout', 'require_signature', 'false'),
  ('checkout', 'send_review_request', 'true'),
  ('review', 'google_link', '""'),
  ('review', 'auto_send_hours', '24'),
  ('mobile', 'enabled', 'true'),
  ('mobile', 'regions', '["Thun","Bern","Solothurn"]'),
  ('pickup', 'enabled', 'true'),
  ('communication', 'smtp_host', '""'),
  ('communication', 'smtp_port', '587'),
  ('communication', 'smtp_user', '""'),
  ('communication', 'email_signature', '"Mit freundlichen Grüssen,\nAutohaus Friedrich"')
ON CONFLICT (category, key) DO NOTHING;

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
