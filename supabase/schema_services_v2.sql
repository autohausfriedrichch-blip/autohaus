-- Advanced Service Pricing System – Schema Migration
-- Run this in Supabase SQL Editor

-- ── 1. Extend services table ──────────────────────────────────────────────────

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS pricing_type TEXT NOT NULL DEFAULT 'fixed'
    CHECK (pricing_type IN ('fixed', 'per_unit', 'hourly', 'custom')),
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2),          -- CHF per unit (per_unit)
  ADD COLUMN IF NOT EXISTS unit_label TEXT DEFAULT 'db',      -- "db", "kerék", "sor" etc.
  ADD COLUMN IF NOT EXISTS unit_time_minutes INTEGER,         -- minutes per unit
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2),         -- override default hourly rate
  ADD COLUMN IF NOT EXISTS is_risky BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high', 'extreme')),
  ADD COLUMN IF NOT EXISTS risk_description TEXT,             -- shown to customer
  ADD COLUMN IF NOT EXISTS requires_customer_approval BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS default_quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- ── 2. Work order service line items (advanced) ───────────────────────────────

CREATE TABLE IF NOT EXISTS work_order_service_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),
  service_name TEXT NOT NULL,
  pricing_type TEXT NOT NULL DEFAULT 'fixed',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2),
  unit_label TEXT DEFAULT 'db',
  fixed_price NUMERIC(10,2),
  hourly_rate NUMERIC(10,2),
  hours NUMERIC(5,2),
  difficulty_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  is_risky BOOLEAN DEFAULT FALSE,
  risk_acknowledged BOOLEAN DEFAULT FALSE,
  technician_note TEXT,
  extra_work_needed BOOLEAN DEFAULT FALSE,
  extra_work_description TEXT,
  final_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Technician difficulty/risk flags ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS technician_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
  service_item_id UUID REFERENCES work_order_service_items(id),
  flag_type TEXT NOT NULL CHECK (flag_type IN (
    'seized_spark_plug', 'broken_spark_plug', 'seized_glow_plug', 'broken_glow_plug',
    'seized_injector', 'damaged_thread', 'corroded_bolt', 'extra_time',
    'customer_approval_needed', 'other'
  )),
  description TEXT,
  extra_hours NUMERIC(4,2) DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  barbara_notified BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE
);

-- ── 4. Seed: Complete Service Library ─────────────────────────────────────────

-- Helper: insert only if name+category doesn't exist
INSERT INTO services (name, category, pricing_type, price, unit_price, unit_label, unit_time_minutes, duration_minutes, is_mobile, is_active, is_visible_to_customer, is_risky, risk_level, risk_description, requires_customer_approval, default_quantity, sort_order, description)
VALUES

-- MOTOR kategória
('Gyújtógyertya csere (1 db)', 'Motor', 'per_unit', NULL, 25.00, 'db', 15, NULL, FALSE, TRUE, TRUE, TRUE, 'medium',
 'A gyújtógyertyák kiszerelésekor előfordulhat, hogy berohadt vagy eltört gyertya esetén a hengerfej megsérülhet. Az ügyfél elfogadja a kockázatot.',
 TRUE, 4, 10,
 'Normál gyújtógyertya csere. Kockázat: berohadt/eltört gyertya esetén extra munka szükséges.'),

('Eltört/berohadt gyújtógyertya eltávolítása', 'Motor', 'hourly', 180.00, NULL, NULL, NULL, NULL, FALSE, TRUE, FALSE, TRUE, 'extreme',
 'Eltört vagy berohadt gyújtógyertya eltávolítása speciális szerszámmal. Magas kockázat: a menet sérülhet.',
 TRUE, 1, 11,
 'Speciális extrakció eltört/berohadt gyújtógyertya esetén.'),

('Izzítógyertya csere (1 db)', 'Motor', 'per_unit', NULL, 35.00, 'db', 20, NULL, FALSE, TRUE, TRUE, TRUE, 'high',
 'Az izzítógyertyák kiszerelésekor különösen nagy a kockázat, hogy a gyertya eltörik. Eltörés esetén külön eltávolítás szükséges.',
 TRUE, 4, 20,
 'Diesel izzítógyertya csere.'),

('Eltört izzítógyertya eltávolítása', 'Motor', 'hourly', 200.00, NULL, NULL, NULL, NULL, FALSE, TRUE, FALSE, TRUE, 'extreme',
 'Eltört izzítógyertya eltávolítása speciális extrakciós szerszámmal. Az alumínium hengerfej megsérülhet.',
 TRUE, 1, 21,
 'Extrakció eltört izzítógyertya esetén.'),

('Porlasztó csere (1 db)', 'Motor', 'per_unit', NULL, 85.00, 'db', 45, NULL, FALSE, TRUE, TRUE, TRUE, 'high',
 'A beragadt porlasztók eltávolításakor a hengerfej menete megsérülhet. Az ügyfél elfogadja a kockázatot.',
 TRUE, 4, 30,
 'Dízel/benzin porlasztó csere.'),

('Beragadt porlasztó eltávolítása', 'Motor', 'hourly', 220.00, NULL, NULL, NULL, 120, FALSE, TRUE, FALSE, TRUE, 'extreme',
 'Beragadt porlasztó speciális kihúzása. Magas kockázat: a hengerfej menet sérülhet. Extra munkaidő.',
 TRUE, 1, 31,
 'Speciális eljárás beragadt porlasztó esetén.'),

('Szelepfedél tömítés csere', 'Motor', 'fixed', 95.00, NULL, NULL, NULL, 60, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 40, 'Szelepfedél tömítés csere + tisztítás.'),

('Motorolaj és szűrő csere', 'Motor', 'fixed', 75.00, NULL, NULL, NULL, 30, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 5, 'Motorolaj + olajszűrő csere.'),

('Levegőszűrő csere', 'Motor', 'fixed', 35.00, NULL, NULL, NULL, 15, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 6, 'Motor levegőszűrő csere.'),

('Üzemanyagszűrő csere', 'Motor', 'fixed', 55.00, NULL, NULL, NULL, 30, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 7, NULL),

('Vezérszíj csere', 'Motor', 'fixed', 350.00, NULL, NULL, NULL, 180, FALSE, TRUE, TRUE, TRUE, 'medium',
 'Vezérszíj csere során más motoralkatrészek sérülhetnek. Ajánlott egyszerre vízpumpát is cserélni.',
 FALSE, 1, 50, NULL),

-- FÉKRENDSZER
('Fékbetét csere (tengely)', 'Fékrendszer', 'fixed', 120.00, NULL, NULL, NULL, 45, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 10, 'Első vagy hátsó fékbetét csere – egy tengely.'),

('Féktárcsa csere (tengely)', 'Fékrendszer', 'fixed', 200.00, NULL, NULL, NULL, 90, TRUE, TRUE, TRUE, TRUE, 'medium',
 'Rozsdás/korrodált féktárcsa eltávolításakor a csavar eltörhet.',
 FALSE, 1, 11, 'Féktárcsa + fékbetét csere.'),

('Fékolaj csere / légtelenítés', 'Fékrendszer', 'fixed', 65.00, NULL, NULL, NULL, 45, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 12, NULL),

('Kézifék beállítás', 'Fékrendszer', 'fixed', 45.00, NULL, NULL, NULL, 30, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 13, NULL),

('Féknyereg javítás/csere', 'Fékrendszer', 'hourly', 125.00, NULL, NULL, NULL, 60, FALSE, TRUE, TRUE, TRUE, 'medium',
 'Berágott féknyereg esetén extra munkaidő szükséges.',
 FALSE, 1, 14, NULL),

-- FUTÓMŰ
('Lengőkar csere', 'Futómű', 'fixed', 180.00, NULL, NULL, NULL, 90, FALSE, TRUE, TRUE, TRUE, 'medium',
 'Korrodált csavarok eltörhetnek. Extra munkaidőt vonhat maga után.',
 FALSE, 1, 10, NULL),

('Gömbfej csere', 'Futómű', 'fixed', 120.00, NULL, NULL, NULL, 60, FALSE, TRUE, TRUE, TRUE, 'medium',
 'Korrodált gömbfej esetén a csavarok eltörhetnek.',
 FALSE, 1, 11, NULL),

('Stabilizátor összekötő rúd csere', 'Futómű', 'per_unit', NULL, 65.00, 'db', 30, NULL, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 2, 12, NULL),

('Kerékcsapágy csere', 'Futómű', 'fixed', 250.00, NULL, NULL, NULL, 120, FALSE, TRUE, TRUE, TRUE, 'high',
 'Berohadt csapágy esetén a villa vagy a tengelytag sérülhet.',
 FALSE, 1, 20, NULL),

('Kormánymű felújítás', 'Futómű', 'custom', 450.00, NULL, NULL, NULL, 180, FALSE, TRUE, TRUE, TRUE, 'high',
 'Egyedi ajánlat szükséges az állapotfelmérés után.',
 FALSE, 1, 30, NULL),

-- DIAGNOSZTIKA
('OBD hibakód olvasás', 'Diagnosztika', 'fixed', 35.00, NULL, NULL, NULL, 20, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 10, 'OBD2 diagnosztika + hibajelentés.'),

('Komplex elektromos diagnosztika', 'Diagnosztika', 'hourly', 125.00, NULL, NULL, NULL, 60, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 20, 'Oszcilloszkópos, komplex elektromos hibakeresés.'),

('Motor teljesítménymérés', 'Diagnosztika', 'fixed', 85.00, NULL, NULL, NULL, 45, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 30, 'Fékpad mérés + teljesítményjelentés.'),

('Klíma diagnosztika', 'Diagnosztika', 'fixed', 55.00, NULL, NULL, NULL, 30, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 40, NULL),

-- GUMISZERVIZ
('Kerékcsere (4 kerék)', 'Gumiszerviz', 'fixed', 80.00, NULL, NULL, NULL, 30, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 10, 'Szezonális kerékcsere, 4 kerék.'),

('Kerékcsere (1 kerék)', 'Gumiszerviz', 'per_unit', NULL, 22.00, 'kerék', 8, NULL, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 4, 11, NULL),

('Centírozás (1 kerék)', 'Gumiszerviz', 'per_unit', NULL, 15.00, 'kerék', 10, NULL, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 4, 12, NULL),

('Gumiszerelés + centírozás (1 db)', 'Gumiszerviz', 'per_unit', NULL, 25.00, 'db', 12, NULL, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 4, 13, NULL),

('Guminyomás ellenőrzés', 'Gumiszerviz', 'fixed', 15.00, NULL, NULL, NULL, 10, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 5, NULL),

('Defektjavítás', 'Gumiszerviz', 'fixed', 35.00, NULL, NULL, NULL, 20, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 20, NULL),

-- EGYÉB / KÜLÖNLEGES
('Motorfelújítás (egyedi ajánlat)', 'Különleges munkák', 'custom', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, FALSE, TRUE, 'high',
 'Motorfelújítás komplex munka, egyedi árajánlat készül az állapotfelmérés alapján.',
 TRUE, 1, 10, 'Komplett motorfelújítás egyedi ajánlat alapján.'),

('Hengerfej javítás', 'Különleges munkák', 'custom', NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, FALSE, TRUE, 'extreme',
 'Hengerfej felújítás/csere. Kötelező állapotfelmérés. Magas kockázat.',
 TRUE, 1, 20, NULL),

('Kipufogó rendszer javítás', 'Különleges munkák', 'hourly', 125.00, NULL, NULL, NULL, 60, FALSE, TRUE, TRUE, TRUE, 'high',
 'Korrodált kipufogócsavarok eltörhetnek. Alumínium menet különösen veszélyes.',
 TRUE, 1, 30, NULL),

('Kerékcsavar csere (1 db)', 'Gumiszerviz', 'per_unit', NULL, 12.00, 'db', 5, NULL, FALSE, TRUE, FALSE, TRUE, 'medium',
 'Korrodált kerékcsavar csere esetén a csavar eltörhet.',
 FALSE, 1, 25, NULL),

('Izzó csere (1 db)', 'Világítás', 'per_unit', NULL, 18.00, 'db', 15, NULL, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 2, 10, 'Tompított/távolsági/ködlámpa izzó csere.'),

('LED izzókészlet csere', 'Világítás', 'fixed', 55.00, NULL, NULL, NULL, 30, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 11, NULL),

('Klíma utántöltés', 'Klíma', 'fixed', 95.00, NULL, NULL, NULL, 45, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 10, 'Klíma gáz utántöltés + ellenőrzés.'),

('Pollenszűrő csere', 'Klíma', 'fixed', 45.00, NULL, NULL, NULL, 20, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 11, NULL)

ON CONFLICT (id) DO NOTHING;

-- ── 5. Enable RLS disable for new tables ─────────────────────────────────────

ALTER TABLE work_order_service_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE technician_flags DISABLE ROW LEVEL SECURITY;
