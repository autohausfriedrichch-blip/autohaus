-- ═══════════════════════════════════════════════════════════════
-- LÉPÉS 2/2: Futtatsd ezt MÁSODIKKÉNT (migration után)
-- Advanced Service Pricing – Szolgáltatás könyvtár seed
-- ═══════════════════════════════════════════════════════════════

INSERT INTO services
  (name, category, service_type, pricing_type, base_price, unit_price, unit_label,
   unit_time_minutes, duration_minutes, is_mobile, is_active,
   is_visible_to_customer, is_risky, risk_level, risk_description,
   requires_customer_approval, default_quantity, sort_order, description)
VALUES

-- ── MOTOR ─────────────────────────────────────────────────────
('Gyújtógyertya csere (1 db)', 'Motor', 'garage', 'per_unit',
 NULL, 25.00, 'db', 15, NULL, FALSE, TRUE, TRUE, TRUE, 'medium',
 'Berohadt/eltört gyertya esetén a hengerfej megsérülhet.',
 TRUE, 4, 10, 'Normál gyújtógyertya csere.'),

('Eltört/berohadt gyújtógyertya eltávolítása', 'Motor', 'garage', 'hourly',
 180.00, NULL, NULL, NULL, NULL, FALSE, TRUE, FALSE, TRUE, 'extreme',
 'Speciális extrakció. Magas kockázat: a menet sérülhet.',
 TRUE, 1, 11, 'Extrakció eltört/berohadt gyújtógyertya esetén.'),

('Izzítógyertya csere (1 db)', 'Motor', 'garage', 'per_unit',
 NULL, 35.00, 'db', 20, NULL, FALSE, TRUE, TRUE, TRUE, 'high',
 'Eltörés esetén külön eltávolítás szükséges.',
 TRUE, 4, 20, 'Diesel izzítógyertya csere.'),

('Eltört izzítógyertya eltávolítása', 'Motor', 'garage', 'hourly',
 200.00, NULL, NULL, NULL, NULL, FALSE, TRUE, FALSE, TRUE, 'extreme',
 'Alumínium hengerfej megsérülhet eltörés esetén.',
 TRUE, 1, 21, 'Extrakció eltört izzítógyertya esetén.'),

('Porlasztó csere (1 db)', 'Motor', 'garage', 'per_unit',
 NULL, 85.00, 'db', 45, NULL, FALSE, TRUE, TRUE, TRUE, 'high',
 'Beragadt porlasztó esetén a hengerfej menete megsérülhet.',
 TRUE, 4, 30, 'Dízel/benzin porlasztó csere.'),

('Beragadt porlasztó eltávolítása', 'Motor', 'garage', 'hourly',
 220.00, NULL, NULL, NULL, 120, FALSE, TRUE, FALSE, TRUE, 'extreme',
 'Speciális kihúzás. Hengerfej menet sérülhet.',
 TRUE, 1, 31, 'Speciális eljárás beragadt porlasztó esetén.'),

('Szelepfedél tömítés csere', 'Motor', 'garage', 'fixed',
 95.00, NULL, NULL, NULL, 60, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 40, 'Szelepfedél tömítés csere + tisztítás.'),

('Motorolaj és szűrő csere', 'Motor', 'garage', 'fixed',
 75.00, NULL, NULL, NULL, 30, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 5, 'Motorolaj + olajszűrő csere.'),

('Levegőszűrő csere', 'Motor', 'garage', 'fixed',
 35.00, NULL, NULL, NULL, 15, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 6, 'Motor levegőszűrő csere.'),

('Üzemanyagszűrő csere', 'Motor', 'garage', 'fixed',
 55.00, NULL, NULL, NULL, 30, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 7, NULL),

('Vezérszíj csere', 'Motor', 'garage', 'fixed',
 350.00, NULL, NULL, NULL, 180, FALSE, TRUE, TRUE, TRUE, 'medium',
 'Vezérszíj csere során más alkatrészek sérülhetnek.',
 FALSE, 1, 50, NULL),

-- ── FÉKRENDSZER ───────────────────────────────────────────────
('Fékbetét csere (tengely)', 'Fékrendszer', 'garage', 'fixed',
 120.00, NULL, NULL, NULL, 45, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 10, 'Első vagy hátsó fékbetét csere – egy tengely.'),

('Féktárcsa csere (tengely)', 'Fékrendszer', 'garage', 'fixed',
 200.00, NULL, NULL, NULL, 90, TRUE, TRUE, TRUE, TRUE, 'medium',
 'Rozsdás féktárcsa eltávolításakor a csavar eltörhet.',
 FALSE, 1, 11, 'Féktárcsa + fékbetét csere.'),

('Fékolaj csere / légtelenítés', 'Fékrendszer', 'garage', 'fixed',
 65.00, NULL, NULL, NULL, 45, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 12, NULL),

('Kézifék beállítás', 'Fékrendszer', 'garage', 'fixed',
 45.00, NULL, NULL, NULL, 30, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 13, NULL),

('Féknyereg javítás/csere', 'Fékrendszer', 'garage', 'hourly',
 125.00, NULL, NULL, NULL, 60, FALSE, TRUE, TRUE, TRUE, 'medium',
 'Berágott féknyereg esetén extra munkaidő szükséges.',
 FALSE, 1, 14, NULL),

-- ── FUTÓMŰ ────────────────────────────────────────────────────
('Lengőkar csere', 'Futómű', 'garage', 'fixed',
 180.00, NULL, NULL, NULL, 90, FALSE, TRUE, TRUE, TRUE, 'medium',
 'Korrodált csavarok eltörhetnek.',
 FALSE, 1, 10, NULL),

('Gömbfej csere', 'Futómű', 'garage', 'fixed',
 120.00, NULL, NULL, NULL, 60, FALSE, TRUE, TRUE, TRUE, 'medium',
 'Korrodált gömbfej esetén a csavarok eltörhetnek.',
 FALSE, 1, 11, NULL),

('Stabilizátor összekötő rúd csere', 'Futómű', 'garage', 'per_unit',
 NULL, 65.00, 'db', 30, NULL, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 2, 12, NULL),

('Kerékcsapágy csere', 'Futómű', 'garage', 'fixed',
 250.00, NULL, NULL, NULL, 120, FALSE, TRUE, TRUE, TRUE, 'high',
 'Berohadt csapágy esetén a villa vagy a tengelytag sérülhet.',
 FALSE, 1, 20, NULL),

('Kormánymű felújítás', 'Futómű', 'garage', 'custom',
 450.00, NULL, NULL, NULL, 180, FALSE, TRUE, TRUE, TRUE, 'high',
 'Egyedi ajánlat szükséges az állapotfelmérés után.',
 FALSE, 1, 30, NULL),

-- ── DIAGNOSZTIKA ──────────────────────────────────────────────
('OBD hibakód olvasás', 'Diagnosztika', 'garage', 'fixed',
 35.00, NULL, NULL, NULL, 20, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 10, 'OBD2 diagnosztika + hibajelentés.'),

('Komplex elektromos diagnosztika', 'Diagnosztika', 'garage', 'hourly',
 125.00, NULL, NULL, NULL, 60, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 20, 'Oszcilloszkópos elektromos hibakeresés.'),

('Motor teljesítménymérés', 'Diagnosztika', 'garage', 'fixed',
 85.00, NULL, NULL, NULL, 45, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 30, 'Fékpad mérés + teljesítményjelentés.'),

('Klíma diagnosztika', 'Diagnosztika', 'garage', 'fixed',
 55.00, NULL, NULL, NULL, 30, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 40, NULL),

-- ── GUMISZERVIZ ───────────────────────────────────────────────
('Kerékcsere (4 kerék)', 'Gumiszerviz', 'garage', 'fixed',
 80.00, NULL, NULL, NULL, 30, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 10, 'Szezonális kerékcsere, 4 kerék.'),

('Kerékcsere (1 kerék)', 'Gumiszerviz', 'garage', 'per_unit',
 NULL, 22.00, 'kerék', 8, NULL, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 4, 11, NULL),

('Centírozás (1 kerék)', 'Gumiszerviz', 'garage', 'per_unit',
 NULL, 15.00, 'kerék', 10, NULL, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 4, 12, NULL),

('Gumiszerelés + centírozás (1 db)', 'Gumiszerviz', 'garage', 'per_unit',
 NULL, 25.00, 'db', 12, NULL, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 4, 13, NULL),

('Guminyomás ellenőrzés', 'Gumiszerviz', 'garage', 'fixed',
 15.00, NULL, NULL, NULL, 10, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 5, NULL),

('Defektjavítás', 'Gumiszerviz', 'garage', 'fixed',
 35.00, NULL, NULL, NULL, 20, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 20, NULL),

('Kerékcsavar csere (1 db)', 'Gumiszerviz', 'garage', 'per_unit',
 NULL, 12.00, 'db', 5, NULL, FALSE, TRUE, FALSE, TRUE, 'medium',
 'Korrodált kerékcsavar eltörhet.',
 FALSE, 1, 25, NULL),

-- ── KÜLÖNLEGES MUNKÁK ─────────────────────────────────────────
('Motorfelújítás (egyedi ajánlat)', 'Különleges munkák', 'garage', 'custom',
 NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, FALSE, TRUE, 'high',
 'Egyedi árajánlat az állapotfelmérés alapján.',
 TRUE, 1, 10, 'Komplett motorfelújítás egyedi ajánlat alapján.'),

('Hengerfej javítás', 'Különleges munkák', 'garage', 'custom',
 NULL, NULL, NULL, NULL, NULL, FALSE, TRUE, FALSE, TRUE, 'extreme',
 'Kötelező állapotfelmérés. Magas kockázat.',
 TRUE, 1, 20, NULL),

('Kipufogó rendszer javítás', 'Különleges munkák', 'garage', 'hourly',
 125.00, NULL, NULL, NULL, 60, FALSE, TRUE, TRUE, TRUE, 'high',
 'Korrodált kipufogócsavarok eltörhetnek.',
 TRUE, 1, 30, NULL),

-- ── VILÁGÍTÁS ─────────────────────────────────────────────────
('Izzó csere (1 db)', 'Világítás', 'garage', 'per_unit',
 NULL, 18.00, 'db', 15, NULL, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 2, 10, 'Tompított/távolsági/ködlámpa izzó csere.'),

('LED izzókészlet csere', 'Világítás', 'garage', 'fixed',
 55.00, NULL, NULL, NULL, 30, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 11, NULL),

-- ── KLÍMA ─────────────────────────────────────────────────────
('Klíma utántöltés', 'Klíma', 'garage', 'fixed',
 95.00, NULL, NULL, NULL, 45, FALSE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 10, 'Klíma gáz utántöltés + ellenőrzés.'),

('Pollenszűrő csere', 'Klíma', 'garage', 'fixed',
 45.00, NULL, NULL, NULL, 20, TRUE, TRUE, TRUE, FALSE, 'low',
 NULL, FALSE, 1, 11, NULL);

SELECT COUNT(*) AS betoltott_szolgaltatasok FROM services;
