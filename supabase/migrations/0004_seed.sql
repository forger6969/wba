-- ============================================================
--  World Bridge Academy
--  0004_seed.sql · yo'nalishlar, bosqichlar, markaz sozlamalari
--  Barcha ma'lumot markazning o'z sotuv skriptidan olingan.
-- ============================================================

insert into subjects (id, nom, qisqa_tavsif, yosh_chegarasi, tartib) values
  ('ingliz-tili',    'Ingliz tili',
   'Yetti bosqich: Starter''dan IELTS''gacha. Har bosqich o''z guruhida.',
   'bolalar va kattalar', 1),

  ('rus-tili',       'Rus tili',
   'Noldan, alifbodan boshlanadi. Avval o''qish va yozish, keyin gapirish.',
   'bolalar va kattalar', 2),

  ('arab-tili',      'Arab tili',
   'Harflarni tanishdan boshlab, matnni mustaqil o''qiy olishgacha.',
   'bolalar va kattalar', 3),

  ('matematika',     'Matematika',
   'Uch yo''nalish: maktab dasturi, Milliy sertifikat va DTM.',
   '5 yoshdan 11-sinfgacha', 4),

  ('pochemuchka',    'Pochemuchka',
   'Maktabga tayyorlov. O''yin shaklida: harf, son, diqqat va nutq.',
   '4–6 yosh', 5),

  ('ai-it',          'AI & IT',
   'Sun''iy intellekt, avtomatlashtirish, vibe-coding. Kompyuteri yo''qqa markaz beradi.',
   'yosh chegarasi yo''q', 6),

  ('web-dasturlash', 'Web dasturlash',
   'HTML, CSS va JavaScript. Birinchi darsdanoq o''z sahifangizni yasaysiz.',
   'yosh chegarasi yo''q', 7),

  ('scratch',        'Scratch',
   'O''yin va multfilm yaratish orqali dasturlash mantiqini tushunish.',
   '16 yoshgacha', 8)
on conflict (id) do nothing;

-- Ingliz tili — 7 bosqich
insert into levels (subject_id, nom, tartib) values
  ('ingliz-tili', 'Starter',           1),
  ('ingliz-tili', 'Beginner',          2),
  ('ingliz-tili', 'Elementary',        3),
  ('ingliz-tili', 'Pre-Intermediate',  4),
  ('ingliz-tili', 'Intermediate',      5),
  ('ingliz-tili', 'Pre-IELTS',         6),
  ('ingliz-tili', 'IELTS',             7)
on conflict (subject_id, nom) do nothing;

-- Matematika — 3 yo'nalish
insert into levels (subject_id, nom, tartib) values
  ('matematika', 'Maktab dasturi',     1),
  ('matematika', 'Milliy sertifikat',  2),
  ('matematika', 'DTM',                3)
on conflict (subject_id, nom) do nothing;

-- ------------------------------------------------------------
-- Markaz sozlamalari
-- ------------------------------------------------------------

insert into settings (kalit, qiymat, tavsif) values
  ('markaz.nom',        '"World Bridge Academy"'::jsonb,        'To''liq nom'),
  ('markaz.qisqa',      '"WBA"'::jsonb,                          'Qisqa nom'),
  ('markaz.telefon',    '"+998 99 009 90 05"'::jsonb,            'Asosiy raqam'),
  ('markaz.telegram',   '"https://t.me/WBA_LC"'::jsonb,          'Telegram kanal'),
  ('markaz.instagram',  '"https://instagram.com/wba_lc"'::jsonb, 'Instagram'),
  ('markaz.manzil',     '"Toshkent, N. Ibragimov ko''chasi, 4-uy"'::jsonb, 'Manzil'),
  ('markaz.moljal',
   '"Bahor to''yxonasidan 91–95 avtobus bilan konechka bekatiga qarab — o''ng qo''lda"'::jsonb,
   'Qanday topish'),
  ('markaz.tashkil_yili', '2018'::jsonb,                         'Faoliyat boshlangan yil'),

  ('narx.standart',      '650000'::jsonb,   'Standart oylik narx'),
  ('narx.tanishuv_oyi',  '550000'::jsonb,   'Birinchi oy narxi'),
  ('narx.uch_oylik',     '1650000'::jsonb,  '3 oy bittada to''lansa'),
  ('narx.tanishuv_chegirma', '100000'::jsonb,
   'Tanishuv oyi chegirmasi: 650 000 − 100 000 = 550 000'),

  ('guruh.maksimal',     '12'::jsonb,       'Standart guruhdagi eng ko''p o''quvchi'),
  ('dars.haftada',       '3'::jsonb,        'Haftadagi dars soni'),
  ('dars.davomiyligi',   '90'::jsonb,       'Bir dars, daqiqada'),

  ('sync.sheets_vaqti',  '"23:00"'::jsonb,  'Google Sheets har kuni shu vaqtda yangilanadi'),

  -- Ochiq savollar — javob kelganda to'ldiriladi
  ('woblr.max_ball_dars', 'null'::jsonb,
   'ANIQLANMAGAN: bir darsda ustoz bera oladigan eng ko''p ball'),
  ('maosh.qoida',         'null'::jsonb,
   'ANIQLANMAGAN: foiz / oquvchi_soni / fiks'),
  ('chegirma.kop_fan',    'null'::jsonb,
   'ANIQLANMAGAN: 2 va undan ortiq fanga yozilganda chegirma miqdori'),
  ('chegirma.birga_kelish', 'null'::jsonb,
   'ANIQLANMAGAN: aka-uka / do''st bilan kelganda chegirma miqdori')
on conflict (kalit) do nothing;
