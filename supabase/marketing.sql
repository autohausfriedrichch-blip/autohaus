-- Marketing kampány sablonok
CREATE TABLE IF NOT EXISTS marketing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  icon TEXT DEFAULT '📣',
  target_segment TEXT NOT NULL DEFAULT 'all',
  trigger_type TEXT DEFAULT 'manual',
  trigger_days INTEGER,
  whatsapp_text TEXT,
  email_subject TEXT,
  email_body TEXT,
  fb_post TEXT,
  ig_post TEXT,
  google_post TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 99,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE marketing_templates DISABLE ROW LEVEL SECURITY;

-- Kampányok
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES marketing_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  target_segment TEXT,
  custom_message TEXT,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  booked_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE marketing_campaigns DISABLE ROW LEVEL SECURITY;

-- Kampány küldések (per ügyfél)
CREATE TABLE IF NOT EXISTS marketing_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  booked_at TIMESTAMPTZ
);
ALTER TABLE marketing_sends DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_marketing_sends_campaign ON marketing_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_sends_customer ON marketing_sends(customer_id);

-- Referral program
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  referred_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  reward_type TEXT DEFAULT 'credit',
  reward_value DECIMAL(10,2) DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE referrals DISABLE ROW LEVEL SECURITY;

-- 15 előre elkészített sablon
INSERT INTO marketing_templates (name, category, icon, target_segment, trigger_type, trigger_days, whatsapp_text, email_subject, email_body, fb_post, ig_post, sort_order) VALUES

('Téli Gumicsere Kampány', 'seasonal', '❄️', 'tire_5_6mo', 'seasonal', NULL,
 'Üdvözöljük! 🧊 Közeleg a tél – ideje téli gumikat felszerelni! Foglaljon időpontot most és kapjon prioritásos időpontot. 👉 [LINK]',
 '❄️ Téli gumicsere – foglaljon most!',
 '<p>Tisztelt {{customer_name}}!</p><p>A téli szezon közeleg. Az Ön <strong>{{plate}}</strong> járművére javasoljuk a téli gumicsere elvégzését.</p><p>Foglaljon időpontot online – prioritásos helyek korlátosan elérhetők!</p>',
 '❄️ Téli gumicsere szezon! 🔧 Foglalj időpontot most – korlátolt férőhely! Autohaus Friedrich Zürich #teligumi #winterreifen #autohaus',
 '❄️ Tél közeleg! Időpontfoglalás 👉 link a bio-ban #teligumi #zürich',
 1),

('Nyári Gumicsere Kampány', 'seasonal', '☀️', 'tire_winter', 'seasonal', NULL,
 'Üdvözöljük! ☀️ Tavasz van – ideje visszaváltani nyári gumikat! Foglaljon időpontot az Autohaus Friedrichnél. 👉 [LINK]',
 '☀️ Nyári gumicsere – tavasz érkezett!',
 '<p>Tisztelt {{customer_name}}!</p><p>A tavasz megérkezett – itt az ideje visszaváltani nyári gumikat a <strong>{{plate}}</strong> járművön.</p><p>Foglaljon időpontot most!</p>',
 '☀️ Nyári gumicsere szezon megnyílt! Foglalj most – online is! #nyárigumi #sommerreifen',
 '☀️ Tél véget ért! Nyári gumi csere 👉 bio-ban #nyárigumi',
 2),

('Olajcsere Emlékeztető', 'maintenance', '🔧', 'oil_10_12mo', 'auto', 335,
 'Kedves {{customer_name}}! 🔧 Az Ön {{plate}} járműve közeledik az olajcsere időpontjához. Foglaljon be most online! 👉 [LINK]',
 '🔧 Olajcsere esedékes – {{plate}}',
 '<p>Tisztelt {{customer_name}}!</p><p>Az Ön <strong>{{plate}}</strong> járműve közel 12 hónapja nem volt olajon. Javasoljuk az olajcsere elvégzését.</p>',
 '🔧 Ne felejts el olajat cserélni! Foglalj online időpontot. #olajcsere #szerviz #zürich',
 '🔧 Rendszeres olajcsere = hosszabb motortartam 💪 #autóápolás',
 3),

('MFK Emlékeztető', 'legal', '📋', 'mfk_60days', 'auto', -60,
 'Kedves {{customer_name}}! 📋 Az Ön {{plate}} járművének műszaki vizsgája hamarosan lejár. Foglaljon időpontot az MFK előkészítésre! 👉 [LINK]',
 '📋 MFK emlékeztető – {{plate}} – hamarosan lejár!',
 '<p>Tisztelt {{customer_name}}!</p><p>Felhívjuk figyelmét, hogy <strong>{{plate}}</strong> járműve műszaki vizsgája <strong>60 napon belül lejár</strong>.</p><p>Javasoljuk az MFK előkészítő vizsgálatot.</p>',
 '📋 Ne felejtse el megújítani műszaki vizsgáját! Segítünk az előkészítésben. #MFK #műszaki',
 '📋 MFK közeleg? Mi felkészítünk! 👉 bio #mfk #autó',
 4),

('Fékellenőrzés Kampány', 'safety', '🛑', 'brake_12mo', 'auto', 365,
 'Kedves {{customer_name}}! 🛑 Biztonság az első – az Ön {{plate}} járművének fékrendszere kb. 1 éve nem volt ellenőrizve. Foglaljon! 👉 [LINK]',
 '🛑 Fékellenőrzés – biztonsága fontos!',
 '<p>Tisztelt {{customer_name}}!</p><p>A biztonságos közlekedés érdekében javasoljuk <strong>{{plate}}</strong> fékrendszerének ellenőrzését.</p>',
 '🛑 BIZTONSÁG AZ ELSŐ! Fékrendszer ellenőrzés – foglalj most! #fékellenőrzés #biztonság',
 '🛑 Fékellenőrzés = biztonság. Foglalj időpontot! 👉 bio',
 5),

('Akkumulátor Ellenőrzés', 'seasonal', '🔋', 'pre_winter', 'seasonal', NULL,
 'Kedves {{customer_name}}! 🔋 Tél előtt érdemes ellenőrizni az akkumulátort – megelőzve a kellemetlen meglepetéseket! Foglaljon! 👉 [LINK]',
 '🔋 Akkumulátor ellenőrzés – tél előtt!',
 '<p>Tisztelt {{customer_name}}!</p><p>A hideg idő előtt javasoljuk <strong>{{plate}}</strong> akkumulátorának ellenőrzését. Kerülje el a kellemetlen reggeli meglepetéseket!</p>',
 '🔋 Tél előtt ellenőrizze akkumulátorát! Ingyenes akku teszt foglalással. #akkumulátor #tél',
 '🔋 Tél = gyenge akku? Ellenőrizzük! 👉 bio #battery #wintercheck',
 6),

('Klímaszerviz Kampány', 'seasonal', '❄️🌡️', 'spring_summer', 'seasonal', NULL,
 'Kedves {{customer_name}}! ❄️ Nyár közeleg – klímarendszere rendben van? Klimaszerviz és töltés elérhető az Autohaus Friedrichnél! 👉 [LINK]',
 '❄️ Klímaszerviz – nyár előtt!',
 '<p>Tisztelt {{customer_name}}!</p><p>A nyári hőség előtt javasoljuk a klímarendszer szervizét és töltését.</p>',
 '❄️🌡️ Klímaszervizt tervezel? Nálunk most elérhető! #klíma #klimaanlage #nyár',
 '❄️ Klíma nem hűt? Mi megoldjuk! 👉 bio #klima #nyár',
 7),

('Detailing Kampány', 'premium', '✨', 'detailing_6mo', 'auto', 180,
 'Kedves {{customer_name}}! ✨ Autója megérdemel egy alapos tisztítást! Részletes belső-külső tisztítás és polírozás elérhető. Foglaljon! 👉 [LINK]',
 '✨ Autóápolás – járműve megérdemli!',
 '<p>Tisztelt {{customer_name}}!</p><p>Kínálunk professzionális detailing szolgáltatást – belső-külső tisztítás, polírozás, üvegkerámia bevonat.</p>',
 '✨ Ragyogjon az autód! Professzionális detailing az Autohaus Friedrichnél. #detailing #autótisztítás',
 '✨ Az autód tükörfényes lehet! 👉 bio #detailing #autóápolás',
 8),

('Mobil Szerviz Kampány', 'mobile', '🚐', 'region_thun_bern', 'manual', NULL,
 'Kedves {{customer_name}}! 🚐 Mi jövünk Önhöz! Mobil szerviz a Thun / Bern / Solothurn régióban. Helyszíni olajcsere, gumicsere, hibakeresés. Foglaljon! 👉 [LINK]',
 '🚐 Mobil szerviz – mi jövünk Önhöz!',
 '<p>Tisztelt {{customer_name}}!</p><p>Nem kell eljönnie hozzánk – <strong>mi jövünk Önhöz!</strong></p><p>Mobil szerviz elérhető a Thun / Bern / Solothurn régióban.</p>',
 '🚐 MOBIL SZERVIZ! Nem kell sehová menned – mi jövünk! Thun, Bern, Solothurn régió. #mobilszerviz #hausbesuch',
 '🚐 Mi jövünk hozzád! Mobil autószerviz 👉 bio #mobilszerviz',
 9),

('Mobil Gumiszerviz Kampány', 'mobile', '🚐🔄', 'family_fleet', 'seasonal', NULL,
 'Kedves {{customer_name}}! 🚐 Mobil gumicsere a ház előtt! Időmegtakarítás az egész család számára. Foglaljon mobil helyszíni gumicserét! 👉 [LINK]',
 '🚐 Mobil gumicsere – a házhoz jövünk!',
 '<p>Tisztelt {{customer_name}}!</p><p>Kényelmes mobil gumicsere – <strong>mi jövünk Önhöz</strong>, nincs sor, nincs várakozás.</p>',
 '🚐 Mobil gumicsere! Jövünk a házhoz – a csere nálad zajlik! Tökéletes családok számára. #mobilgumi',
 '🚐 Gumicsere a háznál! 👉 bio #mobilgumi #kényelmes',
 10),

('Family Fleet Kampány', 'fleet', '👨‍👩‍👧‍👦', 'multi_car', 'manual', NULL,
 'Kedves {{customer_name}}! 👨‍👩‍👧‍👦 2+ autós Family Fleet ügyfeleinknek KÜLÖNLEGES KEDVEZMÉNYT kínálunk! Minden jármű egyszeri szervizén 10% Family Fleet discount. 👉 [LINK]',
 '👨‍👩‍👧‍👦 Family Fleet ajánlat – exkluzív kedvezmény!',
 '<p>Tisztelt {{customer_name}}!</p><p>Mivel több járművet bíz ránk, <strong>exkluzív Family Fleet kedvezményt</strong> kínálunk:</p><ul><li>10% kedvezmény minden szervizen</li><li>Prioritásos időpontfoglalás</li><li>Mobil szerviz opció</li></ul>',
 '👨‍👩‍👧‍👦 FAMILY FLEET PROGRAM! 2+ autó = exkluzív kedvezmény minden szervizre. #familyfleet #kedvezmény',
 '👨‍👩‍👧‍👦 Több autó = több kedvezmény! Family Fleet program 👉 bio',
 11),

('VIP Ügyfél Kampány', 'loyalty', '⭐', 'vip', 'manual', NULL,
 'Kedves {{customer_name}}! ⭐ VIP ügyfelünkként különleges ajánlattal keressük meg. Exkluzív szerviz csomag az Ön számára. Foglaljon VIP időpontot! 👉 [LINK]',
 '⭐ VIP ajánlat – kizárólag az Ön számára',
 '<p>Tisztelt {{customer_name}}!</p><p>Értékelt VIP ügyfelünkként <strong>exkluzív ajánlatot</strong> készítettünk az Ön számára:</p><ul><li>Ingyenes szerviz ellenőrzés</li><li>Prioritásos időpontfoglalás</li><li>Személyes szerviz tanácsadás</li></ul>',
 '⭐ VIP ügyfeleinknek különleges ajánlat! Köszönjük hűségüket! #vip #hűségesügyfél',
 '⭐ VIP bánásmód – mert megérdemled! 💎',
 12),

('Inaktív Ügyfél Visszahozó', 'retention', '🔄', 'inactive_12mo', 'auto', 365,
 'Kedves {{customer_name}}! 🔄 Hiányoznak! Régóta nem jártál nálunk – visszatérő ügyfeleknek 15% kedvezményt adunk az első szervizre. Foglaljon most! 👉 [LINK]',
 '🔄 Hiányozol – visszatérő kedvezmény vár!',
 '<p>Tisztelt {{customer_name}}!</p><p>Régóta nem jártál nálunk – <strong>15% visszatérő kedvezményt</strong> kínálunk az első szervizedre!</p><p>Várunk szeretettel!</p>',
 '🔄 Régi ügyfeleinket visszavárjuk! 15% visszatérő kedvezmény. #visszatérő #kedvezmény',
 '🔄 Régen láttalak! Gyere vissza, kedvezmény vár 😊 #comeback',
 13),

('Review Kampány', 'review', '⭐', 'recent_service_3d', 'auto', 3,
 'Kedves {{customer_name}}! Köszönjük, hogy minket választott! ⭐ Kérnénk 1 perc értékelését Google-on – sokat segít nekünk! 👉 [GOOGLE_LINK]',
 '⭐ Kérnénk értékelését – Autohaus Friedrich',
 '<p>Tisztelt {{customer_name}}!</p><p>Köszönjük látogatását! Kérnénk, értékelje tapasztalatait <a href="#">Google-on</a> – csupán 1 percet vesz igénybe és sokat segít!</p>',
 '⭐ Köszönjük értékeléseiteket! Minden visszajelzés segít jobbá válni. #review #google #5csillag',
 '⭐⭐⭐⭐⭐ Köszönjük az értékeléseket! 🙏 #review #autohaus',
 14),

('Ajánlási Program', 'referral', '🎁', 'all', 'manual', NULL,
 'Kedves {{customer_name}}! 🎁 Ajánlj egy ismerőst és mindketten nyertek! Ajánlott ügyfél = CHF 50 szerviz kredit Neked + 10% kedvezmény az ismerősnek. 👉 [LINK]',
 '🎁 Referral program – ajánlj és nyerj!',
 '<p>Tisztelt {{customer_name}}!</p><p>Ajánlj egy ismerőst az Autohaus Friedrichnek:</p><ul><li>🎁 CHF 50 szerviz kredit neked</li><li>🔧 10% kedvezmény az ismerősnek</li><li>💚 Ingyenes olajszint ellenőrzés</li></ul>',
 '🎁 REFERRAL PROGRAM! Ajánlj egy ismerőst és nyerj CHF 50 szerviz kreditet! #referral #ajánlás #nyerj',
 '🎁 Ajánlj és nyerj! CHF 50 kredit vár 💰 👉 bio #referral',
 15)

ON CONFLICT DO NOTHING;
