-- ============================================================
-- Notifications Table
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  message          TEXT,
  type             TEXT NOT NULL DEFAULT 'system',
  priority         TEXT NOT NULL DEFAULT 'normal',  -- low | normal | high | urgent
  recipient_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_role   TEXT,  -- admin | mechanic | customer | all
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  vehicle_id       UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  work_order_id    UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  quote_id         UUID REFERENCES quotes(id) ON DELETE SET NULL,
  action_label     TEXT,
  action_type      TEXT,  -- open_workorder | open_customer | open_quote | open_photos
  action_id        TEXT,
  is_read          BOOLEAN DEFAULT FALSE,
  read_at          TIMESTAMPTZ,
  created_by       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient   ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_role        ON notifications(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_work_order  ON notifications(work_order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read     ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created     ON notifications(created_at DESC);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_enabled  BOOLEAN DEFAULT TRUE,
  push_enabled   BOOLEAN DEFAULT FALSE,
  system_enabled BOOLEAN DEFAULT TRUE,
  preferences    JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_preferences DISABLE ROW LEVEL SECURITY;

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
