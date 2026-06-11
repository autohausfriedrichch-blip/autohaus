import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MARKETING_TEMPLATES = [
  {
    name: 'Téli Gumicsere Kampány', category: 'seasonal', icon: '❄️',
    target_segment: 'tire_5_6mo', trigger_type: 'seasonal', sort_order: 1,
    whatsapp_text: 'Kedves {{customer_name}}! 🧊 Közeleg a tél – ideje téli gumikat felszerelni! Foglaljon időpontot most és kapjon prioritásos helyet. 📞 Autohaus Friedrich',
    email_subject: '❄️ Téli gumicsere – foglaljon most!',
    email_body: '<p>Tisztelt {{customer_name}}!</p><p>A téli szezon közeleg. Az Ön <strong>{{plate}}</strong> járművére javasoljuk a téli gumicsere elvégzését.</p><p>Foglaljon időpontot online – prioritásos helyek korlátosan elérhetők!</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich</strong></p>',
    fb_post: '❄️ Téli gumicsere szezon! 🔧 Foglalj időpontot most – korlátolt férőhely! Autohaus Friedrich Zürich #teligumi #winterreifen #autohaus #zürich',
    ig_post: '❄️ Tél közeleg! Időpontfoglalás 👉 link a bio-ban #teligumi #zürich #winterreifen',
    google_post: 'Téli gumicsere most – korlátolt időpontok! Autohaus Friedrich Zürich. Online foglalás elérhető.',
  },
  {
    name: 'Nyári Gumicsere Kampány', category: 'seasonal', icon: '☀️',
    target_segment: 'tire_winter', trigger_type: 'seasonal', sort_order: 2,
    whatsapp_text: 'Kedves {{customer_name}}! ☀️ Tavasz van – ideje visszaváltani nyári gumikat! Foglaljon időpontot az Autohaus Friedrichnél. 📞',
    email_subject: '☀️ Nyári gumicsere – tavasz érkezett!',
    email_body: '<p>Tisztelt {{customer_name}}!</p><p>A tavasz megérkezett – itt az ideje visszaváltani nyári gumikat a <strong>{{plate}}</strong> járművön.</p><p>Foglaljon időpontot most!</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich</strong></p>',
    fb_post: '☀️ Nyári gumicsere szezon megnyílt! Foglalj most – online is! #nyárigumi #sommerreifen #zürich',
    ig_post: '☀️ Tél véget ért! Nyári gumi csere 👉 bio-ban #nyárigumi #frühling',
    google_post: 'Nyári gumicsere most – tavasz érkezett! Online foglalás az Autohaus Friedrichnél.',
  },
  {
    name: 'Olajcsere Emlékeztető', category: 'maintenance', icon: '🔧',
    target_segment: 'oil_10_12mo', trigger_type: 'auto', trigger_days: 335, sort_order: 3,
    whatsapp_text: 'Kedves {{customer_name}}! 🔧 Az Ön {{plate}} járműve közeledik az olajcsere időpontjához. Foglaljon be most online! Autohaus Friedrich 📞',
    email_subject: '🔧 Olajcsere esedékes – {{plate}}',
    email_body: '<p>Tisztelt {{customer_name}}!</p><p>Az Ön <strong>{{plate}}</strong> járműve közel 12 hónapja nem volt olajon. Javasoljuk az olajcsere elvégzését a motor hosszú élettartama érdekében.</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich</strong></p>',
    fb_post: '🔧 Ne felejts el olajat cserélni! Foglalj online időpontot. #olajcsere #szerviz #zürich #autó',
    ig_post: '🔧 Rendszeres olajcsere = hosszabb motortartam 💪 #autóápolás #motorolaj',
    google_post: 'Olajcsere gyorsan és megbízhatóan. Foglaljon időpontot online – Autohaus Friedrich Zürich.',
  },
  {
    name: 'MFK Emlékeztető', category: 'legal', icon: '📋',
    target_segment: 'mfk_60days', trigger_type: 'auto', trigger_days: -60, sort_order: 4,
    whatsapp_text: 'Kedves {{customer_name}}! 📋 Az Ön {{plate}} járművének műszaki vizsgája hamarosan lejár. Foglaljon időpontot az MFK előkészítésre! Autohaus Friedrich',
    email_subject: '📋 MFK emlékeztető – {{plate}} – hamarosan lejár!',
    email_body: '<p>Tisztelt {{customer_name}}!</p><p>Felhívjuk figyelmét, hogy <strong>{{plate}}</strong> járműve műszaki vizsgája <strong>60 napon belül lejár</strong>.</p><p>Javasoljuk az MFK előkészítő vizsgálatot – gondoskodjunk arról, hogy minden rendben legyen!</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich</strong></p>',
    fb_post: '📋 Ne felejtse el megújítani műszaki vizsgáját! Segítünk az előkészítésben. #MFK #műszaki #zürich',
    ig_post: '📋 MFK közeleg? Mi felkészítünk! 👉 bio #mfk #autóvizsga',
    google_post: 'MFK előkészítés és vizsga – Autohaus Friedrich. Ne hagyja az utolsó pillanatra!',
  },
  {
    name: 'Fékellenőrzés Kampány', category: 'safety', icon: '🛑',
    target_segment: 'brake_12mo', trigger_type: 'auto', trigger_days: 365, sort_order: 5,
    whatsapp_text: 'Kedves {{customer_name}}! 🛑 Biztonság az első – az Ön {{plate}} járművének fékrendszere kb. 1 éve nem volt ellenőrizve. Foglaljon! Autohaus Friedrich',
    email_subject: '🛑 Fékellenőrzés – biztonsága fontos!',
    email_body: '<p>Tisztelt {{customer_name}}!</p><p>A biztonságos közlekedés érdekében javasoljuk <strong>{{plate}}</strong> fékrendszerének szakszerű ellenőrzését.</p><p>Megbízható fékek = biztonságos utazás. 🛑</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich</strong></p>',
    fb_post: '🛑 BIZTONSÁG AZ ELSŐ! Fékrendszer ellenőrzés – foglalj most! #fékellenőrzés #biztonság #autohaus',
    ig_post: '🛑 Fékellenőrzés = biztonság. Foglalj időpontot! 👉 bio #brakes #autóbiztonság',
    google_post: 'Fékellenőrzés és fékjavítás – biztonsága a legfontosabb. Autohaus Friedrich Zürich.',
  },
  {
    name: 'Akkumulátor Ellenőrzés', category: 'seasonal', icon: '🔋',
    target_segment: 'pre_winter', trigger_type: 'seasonal', sort_order: 6,
    whatsapp_text: 'Kedves {{customer_name}}! 🔋 Tél előtt érdemes ellenőrizni az akkumulátort – megelőzve a kellemetlen meglepetéseket! Autohaus Friedrich',
    email_subject: '🔋 Akkumulátor ellenőrzés – tél előtt!',
    email_body: '<p>Tisztelt {{customer_name}}!</p><p>A hideg idő előtt javasoljuk <strong>{{plate}}</strong> akkumulátorának ellenőrzését.</p><p>Kerülje el a hideg reggeli meglepetéseket! Ingyenes akku teszt foglalással. 🔋</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich</strong></p>',
    fb_post: '🔋 Tél előtt ellenőrizze akkumulátorát! Ingyenes akku teszt foglalással. #akkumulátor #tél #autohaus',
    ig_post: '🔋 Tél = gyenge akku? Ellenőrizzük! 👉 bio #battery #wintercheck #zürich',
    google_post: 'Ingyenes akkumulátor teszt foglalással – ne maradjon le télen! Autohaus Friedrich.',
  },
  {
    name: 'Klímaszerviz Kampány', category: 'seasonal', icon: '❄️🌡️',
    target_segment: 'spring_summer', trigger_type: 'seasonal', sort_order: 7,
    whatsapp_text: 'Kedves {{customer_name}}! ❄️ Nyár közeleg – klímarendszere rendben van? Klímaszerviz és töltés elérhető az Autohaus Friedrichnél! Foglaljon!',
    email_subject: '❄️ Klímaszerviz – nyár előtt!',
    email_body: '<p>Tisztelt {{customer_name}}!</p><p>A nyári hőség előtt javasoljuk a klímarendszer szervizét és utántöltését.</p><p>Friss levegő az utazáshoz – foglaljon most! ❄️</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich</strong></p>',
    fb_post: '❄️🌡️ Klímaszervizt tervezel? Nálunk most elérhető! #klíma #klimaanlage #nyár #zürich',
    ig_post: '❄️ Klíma nem hűt? Mi megoldjuk! 👉 bio #klima #nyár #autohaus',
    google_post: 'Klímaszerviz és -töltés – legyen kellemes az autózás nyáron! Autohaus Friedrich Zürich.',
  },
  {
    name: 'Detailing Kampány', category: 'premium', icon: '✨',
    target_segment: 'detailing_6mo', trigger_type: 'auto', trigger_days: 180, sort_order: 8,
    whatsapp_text: 'Kedves {{customer_name}}! ✨ Autója megérdemel egy alapos tisztítást! Belső-külső detailing, polírozás, üvegkerámia bevonat. Foglaljon!',
    email_subject: '✨ Prémium autóápolás – járműve megérdemli!',
    email_body: '<p>Tisztelt {{customer_name}}!</p><p>Kínálunk professzionális detailing szolgáltatást:</p><ul><li>✨ Belső-külső alapos tisztítás</li><li>🪞 Polírozás</li><li>💎 Üvegkerámia bevonat</li></ul><p>Foglaljon időpontot most!</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich</strong></p>',
    fb_post: '✨ Ragyogjon az autód! Professzionális detailing az Autohaus Friedrichnél. #detailing #autótisztítás #zürich',
    ig_post: '✨ Az autód tükörfényes lehet! 👉 bio #detailing #autóápolás #shine',
    google_post: 'Professzionális autó detailing – polírozás, belső tisztítás, kerámia bevonat. Autohaus Friedrich.',
  },
  {
    name: 'Mobil Szerviz Kampány', category: 'mobile', icon: '🚐',
    target_segment: 'region_thun_bern', trigger_type: 'manual', sort_order: 9,
    whatsapp_text: 'Kedves {{customer_name}}! 🚐 Mi jövünk Önhöz! Mobil szerviz a Thun / Bern / Solothurn régióban. Helyszíni olajcsere, gumicsere, hibakeresés. Foglaljon!',
    email_subject: '🚐 Mobil szerviz – mi jövünk Önhöz!',
    email_body: '<p>Tisztelt {{customer_name}}!</p><p>Nem kell eljönnie hozzánk – <strong>mi jövünk Önhöz!</strong></p><p>Mobil szerviz elérhető a Thun / Bern / Solothurn régióban:</p><ul><li>🔧 Olajcsere helyszínen</li><li>🔄 Gumicsere</li><li>🔍 Hibakeresés</li></ul><p>Üdvözlettel,<br/><strong>Autohaus Friedrich</strong></p>',
    fb_post: '🚐 MOBIL SZERVIZ! Nem kell sehová menned – mi jövünk! Thun, Bern, Solothurn régió. #mobilszerviz #hausbesuch #autohaus',
    ig_post: '🚐 Mi jövünk hozzád! Mobil autószerviz 👉 bio #mobilszerviz #bern #thun',
    google_post: 'Mobil szerviz Thun, Bern, Solothurn régióban – kijövünk Önhöz! Autohaus Friedrich.',
  },
  {
    name: 'Mobil Gumiszerviz', category: 'mobile', icon: '🚐🔄',
    target_segment: 'family_fleet', trigger_type: 'seasonal', sort_order: 10,
    whatsapp_text: 'Kedves {{customer_name}}! 🚐 Mobil gumicsere a ház előtt! Időmegtakarítás az egész család számára. Foglaljon mobil helyszíni gumicserét!',
    email_subject: '🚐 Mobil gumicsere – a házhoz jövünk!',
    email_body: '<p>Tisztelt {{customer_name}}!</p><p>Kényelmes mobil gumicsere – <strong>mi jövünk Önhöz</strong>, nincs sor, nincs várakozás.</p><p>Tökéletes megoldás elfoglalt családok számára! 🚐</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich</strong></p>',
    fb_post: '🚐 Mobil gumicsere! Jövünk a házhoz – a csere nálad zajlik! Tökéletes családok számára. #mobilgumi #kényelmes',
    ig_post: '🚐 Gumicsere a háznál! 👉 bio #mobilgumi #kényelmes #family',
    google_post: 'Mobil gumicsere – kijövünk Önhöz! Kényelmes megoldás az egész familie számára.',
  },
  {
    name: 'Family Fleet Kampány', category: 'fleet', icon: '👨‍👩‍👧‍👦',
    target_segment: 'multi_car', trigger_type: 'manual', sort_order: 11,
    whatsapp_text: 'Kedves {{customer_name}}! 👨‍👩‍👧‍👦 2+ autós Family Fleet ügyfeleinknek KÜLÖNLEGES KEDVEZMÉNYT kínálunk! Minden jármű szervizén 10% Family Fleet discount.',
    email_subject: '👨‍👩‍👧‍👦 Family Fleet ajánlat – exkluzív kedvezmény!',
    email_body: '<p>Tisztelt {{customer_name}}!</p><p>Mivel több járművet bíz ránk, <strong>exkluzív Family Fleet kedvezményt</strong> kínálunk:</p><ul><li>💰 10% kedvezmény minden szervizen</li><li>⚡ Prioritásos időpontfoglalás</li><li>🚐 Mobil szerviz opció</li></ul><p>Üdvözlettel,<br/><strong>Autohaus Friedrich</strong></p>',
    fb_post: '👨‍👩‍👧‍👦 FAMILY FLEET PROGRAM! 2+ autó = exkluzív kedvezmény minden szervizre. #familyfleet #kedvezmény #zürich',
    ig_post: '👨‍👩‍👧‍👦 Több autó = több kedvezmény! Family Fleet program 👉 bio #familyfleet',
    google_post: 'Family Fleet program – 10% kedvezmény 2+ jármű esetén. Autohaus Friedrich Zürich.',
  },
  {
    name: 'VIP Ügyfél Kampány', category: 'loyalty', icon: '⭐',
    target_segment: 'vip', trigger_type: 'manual', sort_order: 12,
    whatsapp_text: 'Kedves {{customer_name}}! ⭐ VIP ügyfelünkként különleges ajánlattal keressük meg. Exkluzív szerviz csomag az Ön számára. Foglaljon VIP időpontot!',
    email_subject: '⭐ VIP ajánlat – kizárólag az Ön számára',
    email_body: '<p>Tisztelt {{customer_name}}!</p><p>Értékelt VIP ügyfelünkként <strong>exkluzív ajánlatot</strong> készítettünk az Ön számára:</p><ul><li>🎁 Ingyenes szerviz ellenőrzés</li><li>⚡ Prioritásos időpontfoglalás</li><li>👤 Személyes szerviz tanácsadás</li></ul><p>Üdvözlettel,<br/><strong>Autohaus Friedrich</strong></p>',
    fb_post: '⭐ VIP ügyfeleinknek különleges ajánlat! Köszönjük hűségüket! #vip #hűségesügyfél #autohaus',
    ig_post: '⭐ VIP bánásmód – mert megérdemled! 💎 #vip #luxury #autohaus',
    google_post: 'VIP szerviz program – prémium kiszolgálás értékelt ügyfeleinknek. Autohaus Friedrich.',
  },
  {
    name: 'Inaktív Ügyfél Visszahozó', category: 'retention', icon: '🔄',
    target_segment: 'inactive_12mo', trigger_type: 'auto', trigger_days: 365, sort_order: 13,
    whatsapp_text: 'Kedves {{customer_name}}! 🔄 Hiányoznak! Régóta nem jártál nálunk – visszatérő ügyfeleknek 15% kedvezményt adunk az első szervizre. Foglaljon most!',
    email_subject: '🔄 Hiányozol – visszatérő kedvezmény vár!',
    email_body: '<p>Tisztelt {{customer_name}}!</p><p>Régóta nem jártál nálunk – <strong>15% visszatérő kedvezményt</strong> kínálunk az első szervizedre!</p><p>Örömmel látunk újra! 🔄</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich</strong></p>',
    fb_post: '🔄 Régi ügyfeleinket visszavárjuk! 15% visszatérő kedvezmény. #visszatérő #kedvezmény #autohaus',
    ig_post: '🔄 Régen láttalak! Gyere vissza, kedvezmény vár 😊 #comeback #15percent',
    google_post: '15% visszatérő kedvezmény – örömmel látjuk újra! Autohaus Friedrich Zürich.',
  },
  {
    name: 'Review Kampány', category: 'review', icon: '⭐',
    target_segment: 'recent_service_3d', trigger_type: 'auto', trigger_days: 3, sort_order: 14,
    whatsapp_text: 'Kedves {{customer_name}}! Köszönjük, hogy minket választott! ⭐ Kérnénk 1 perc értékelését Google-on – sokat segít nekünk! 👉 g.page/autohausfriedrich',
    email_subject: '⭐ Kérnénk értékelését – Autohaus Friedrich',
    email_body: '<p>Tisztelt {{customer_name}}!</p><p>Köszönjük látogatását! Kérnénk, értékelje tapasztalatait Google-on – csupán 1 percet vesz igénybe és sokat segít nekünk!</p><p>⭐ <a href="https://g.page/r/review">Értékelés írása</a></p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich</strong></p>',
    fb_post: '⭐ Köszönjük értékeléseiteket! Minden visszajelzés segít jobbá válni. #review #google #5csillag',
    ig_post: '⭐⭐⭐⭐⭐ Köszönjük az értékeléseket! 🙏 #review #autohaus #zürich',
    google_post: 'Köszönjük látogatását! Kérnénk Google értékelését – ez sokat segít nekünk.',
  },
  {
    name: 'Ajánlási Program', category: 'referral', icon: '🎁',
    target_segment: 'all', trigger_type: 'manual', sort_order: 15,
    whatsapp_text: 'Kedves {{customer_name}}! 🎁 Ajánlj egy ismerőst és mindketten nyertek! Ajánlott ügyfél = CHF 50 szerviz kredit Neked + 10% kedvezmény az ismerősnek.',
    email_subject: '🎁 Referral program – ajánlj és nyerj!',
    email_body: '<p>Tisztelt {{customer_name}}!</p><p>Ajánlj egy ismerőst az Autohaus Friedrichnek:</p><ul><li>🎁 CHF 50 szerviz kredit neked</li><li>🔧 10% kedvezmény az ismerősnek</li><li>✅ Ingyenes olajszint ellenőrzés mindkettőnek</li></ul><p>Üdvözlettel,<br/><strong>Autohaus Friedrich</strong></p>',
    fb_post: '🎁 REFERRAL PROGRAM! Ajánlj egy ismerőst és nyerj CHF 50 szerviz kreditet! #referral #ajánlás #nyerj',
    ig_post: '🎁 Ajánlj és nyerj! CHF 50 kredit vár 💰 👉 bio #referral #zürich',
    google_post: 'Referral program – ajánlj egy ismerőst és nyerj CHF 50 szerviz kreditet!',
  },
]

const EMAIL_TEMPLATES = [
  {
    name: 'Árajánlat küldése', category: 'quote',
    subject: 'Árajánlat – {{plate}} – Autohaus Friedrich',
    body_html: '<p>Tisztelt {{customer_name}}!</p><p>Mellékelten küldjük az Ön <strong>{{plate}}</strong> rendszámú járművére vonatkozó árajánlatunkat.</p><p>Az ajánlat <strong>14 napig</strong> érvényes.</p><p>Kérdés esetén szívesen állunk rendelkezésre.<br/>📞 +41 00 000 00 00 | 🌐 autohaus-friedrich.ch</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich csapata</strong></p>',
  },
  {
    name: 'Számla küldése', category: 'invoice',
    subject: 'Számla – {{invoice_number}} – {{plate}} – Autohaus Friedrich',
    body_html: '<p>Tisztelt {{customer_name}}!</p><p>Mellékelten küldjük a elvégzett munkákról szóló számlát (<strong>{{plate}}</strong>).</p><p>Összeg: <strong>CHF {{amount}}</strong> | Fizetési határidő: <strong>{{due_date}}</strong></p><p>Köszönjük bizalmát! Várjuk ismét!</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich csapata</strong></p>',
  },
  {
    name: 'Jármű elkészült értesítő', category: 'workorder',
    subject: 'Járműve elkészült – {{plate}} – átvehető!',
    body_html: '<p>Tisztelt {{customer_name}}!</p><p>Örömmel értesítjük, hogy <strong>{{plate}}</strong> rendszámú járműve elkészült és átvehető.</p><p>🕐 Nyitvatartásunk: Hétfő–Péntek 8:00–17:00 | Szombat 9:00–13:00</p><p>📍 Autohaus Friedrich, Zürich</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich csapata</strong></p>',
  },
  {
    name: 'Google Review kérés', category: 'review',
    subject: 'Kérnénk értékelését – Autohaus Friedrich',
    body_html: '<p>Tisztelt {{customer_name}}!</p><p>Köszönjük, hogy az Autohaus Friedrichet választotta!</p><p>Kérnénk, értékelje tapasztalatait Google-on – csupán 1 percet vesz igénybe és sokat segít nekünk a fejlődésben:</p><p>⭐ <a href="https://g.page/r/review" style="color:#C9A84C;font-weight:bold;">Értékelés írása Google-on</a></p><p>Köszönjük előre is!</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich csapata</strong></p>',
  },
  {
    name: 'Szerviz emlékeztető', category: 'reminder',
    subject: 'Szerviz emlékeztető – {{plate}} – esedékes',
    body_html: '<p>Tisztelt {{customer_name}}!</p><p>Emlékeztetjük, hogy <strong>{{plate}}</strong> rendszámú járműve esedékes szervizre.</p><p>📅 Foglaljon időpontot online: <a href="#" style="color:#C9A84C;">autohaus-friedrich.ch</a></p><p>📞 Vagy hívjon minket: +41 00 000 00 00</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich csapata</strong></p>',
  },
  {
    name: 'Köszönjük látogatását', category: 'followup',
    subject: 'Köszönjük látogatását! – Autohaus Friedrich',
    body_html: '<p>Tisztelt {{customer_name}}!</p><p>Köszönjük, hogy felkereste műhelyünket! Reméljük elégedett az elvégzett munkával.</p><p>🚗 Kellemes vezetést kívánunk!</p><p>Ha bármilyen kérdése van, ne habozzon felvenni velünk a kapcsolatot.<br/>📞 +41 00 000 00 00</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich csapata</strong></p>',
  },
  {
    name: 'Fizetési emlékeztető', category: 'payment',
    subject: 'Fizetési emlékeztető – Számla #{{invoice_number}}',
    body_html: '<p>Tisztelt {{customer_name}}!</p><p>Emlékeztetjük, hogy <strong>#{{invoice_number}}</strong> számú számlánk még rendezetlen.</p><table style="margin:12px 0;border-collapse:collapse;"><tr><td style="padding:4px 12px 4px 0;color:#666;">Összeg:</td><td style="font-weight:bold;">CHF {{amount}}</td></tr><tr><td style="padding:4px 12px 4px 0;color:#666;">Határidő:</td><td style="font-weight:bold;color:#e53e3e;">{{due_date}}</td></tr></table><p>Kérdés esetén szívesen segítünk.</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich csapata</strong></p>',
  },
  {
    name: 'Garanciális javítás visszaigazolás', category: 'warranty',
    subject: 'Garancia visszaigazolás – {{plate}}',
    body_html: '<p>Tisztelt {{customer_name}}!</p><p>Visszaigazoljuk, hogy <strong>{{plate}}</strong> járművére elvégzett javítást garanciálisan rögzítettük.</p><p>⚡ Garanciaidő: <strong>12 hónap / 20 000 km</strong></p><p>Ha bármilyen probléma merül fel, haladéktalanul jelezze nekünk.</p><p>Üdvözlettel,<br/><strong>Autohaus Friedrich csapata</strong></p>',
  },
]

export async function GET() {
  try {
    const supabase = await createClient()

    // Upsert marketing templates
    const { error: mErr, count: mCount } = await supabase
      .from('marketing_templates')
      .upsert(MARKETING_TEMPLATES, { onConflict: 'name', ignoreDuplicates: false })
      .select('id')

    if (mErr) {
      return NextResponse.json({ error: `Marketing templates: ${mErr.message}` }, { status: 500 })
    }

    // Upsert email templates
    const { error: eErr, count: eCount } = await supabase
      .from('email_templates')
      .upsert(EMAIL_TEMPLATES, { onConflict: 'name', ignoreDuplicates: false })
      .select('id')

    if (eErr) {
      return NextResponse.json({ error: `Email templates: ${eErr.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      marketing_templates: MARKETING_TEMPLATES.length,
      email_templates: EMAIL_TEMPLATES.length,
      message: `✅ ${MARKETING_TEMPLATES.length} marketing sablon + ${EMAIL_TEMPLATES.length} email sablon feltöltve!`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
