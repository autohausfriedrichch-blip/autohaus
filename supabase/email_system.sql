-- Email fiók tároló (Gmail OAuth tokenek)
CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  provider TEXT DEFAULT 'gmail',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);
ALTER TABLE email_accounts DISABLE ROW LEVEL SECURITY;

-- Emailek tároló
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES email_accounts(id) ON DELETE SET NULL,
  gmail_message_id TEXT UNIQUE,
  gmail_thread_id TEXT,
  direction TEXT NOT NULL DEFAULT 'outbound',
  status TEXT NOT NULL DEFAULT 'draft',
  from_email TEXT,
  from_name TEXT,
  to_emails TEXT[] DEFAULT '{}',
  cc_emails TEXT[] DEFAULT '{}',
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  attachments JSONB DEFAULT '[]',
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  labels TEXT[] DEFAULT '{}'
);
ALTER TABLE emails DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_emails_customer ON emails(customer_id);
CREATE INDEX IF NOT EXISTS idx_emails_work_order ON emails(work_order_id);
CREATE INDEX IF NOT EXISTS idx_emails_direction ON emails(direction);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);
CREATE INDEX IF NOT EXISTS idx_emails_gmail_id ON emails(gmail_message_id);

-- Email sablonok
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE email_templates DISABLE ROW LEVEL SECURITY;

INSERT INTO email_templates (name, category, subject, body_html) VALUES
('Árajánlat küldése', 'quote',
 'Árajánlat – {{plate}} – Autohaus Friedrich',
 '<p>Tisztelt {{customer_name}}!</p><p>Mellékelten küldjük az Ön <strong>{{plate}}</strong> rendszámú járművére vonatkozó árajánlatunkat.</p><p>Az ajánlat <strong>14 napig</strong> érvényes. Kérdés esetén szívesen állunk rendelkezésre.</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich csapata</strong></p>'),
('Számla küldése', 'invoice',
 'Számla – {{plate}} – Autohaus Friedrich',
 '<p>Tisztelt {{customer_name}}!</p><p>Mellékelten küldjük a elvégzett munkákról szóló számlát (<strong>{{plate}}</strong>).</p><p>Köszönjük bizalmát! Várjuk ismét!</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich csapata</strong></p>'),
('Munkalap elkészült', 'workorder',
 'Járműve elkészült – {{plate}}',
 '<p>Tisztelt {{customer_name}}!</p><p>Örömmel értesítjük, hogy <strong>{{plate}}</strong> rendszámú járműve elkészült és átvehető.</p><p>🕐 Nyitvatartásunk: Hétfő–Péntek 8:00–17:00</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich csapata</strong></p>'),
('Google Review kérés', 'review',
 'Kérjük értékelje szolgáltatásunkat!',
 '<p>Tisztelt {{customer_name}}!</p><p>Köszönjük, hogy az Autohaus Friedrichet választotta! Kérjük, értékelje tapasztalatait Google-on – néhány perc alatt sokat segít nekünk!</p><p>⭐ <a href="https://g.page/r/review">Értékelés írása</a></p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich csapata</strong></p>'),
('Szerviz emlékeztető', 'reminder',
 'Szerviz emlékeztető – {{plate}}',
 '<p>Tisztelt {{customer_name}}!</p><p>Emlékeztetjük, hogy <strong>{{plate}}</strong> rendszámú járműve esedékes szervizre.</p><p>📅 Foglaljon időpontot online vagy hívjon minket: <a href="tel:+41000000000">+41 00 000 00 00</a></p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich csapata</strong></p>'),
('Köszönjük látogatását', 'followup',
 'Köszönjük látogatását! – Autohaus Friedrich',
 '<p>Tisztelt {{customer_name}}!</p><p>Köszönjük, hogy felkereste műhelyünket! Reméljük elégedett az elvégzett munkával.</p><p>🚗 Kellemes vezetést kívánunk!</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich csapata</strong></p>'),
('Fizetési emlékeztető', 'payment',
 'Fizetési emlékeztető – Számla #{{invoice_number}}',
 '<p>Tisztelt {{customer_name}}!</p><p>Emlékeztetjük, hogy <strong>#{{invoice_number}}</strong> számú számlánk még rendezetlen.</p><p>Összeg: <strong>CHF {{amount}}</strong> | Határidő: <strong>{{due_date}}</strong></p><p>Kérdés esetén szívesen segítünk.</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich csapata</strong></p>')
ON CONFLICT DO NOTHING;
