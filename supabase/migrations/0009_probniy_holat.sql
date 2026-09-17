-- ============================================================
--  World Bridge Academy
--  0009_probniy_holat.sql · probniyning "Kelmadi" holati
--
--  Botdagi Probniylar varag'ida to'rt holat bor (Y_Probniy.js:
--  PROB_HOLAT): Probniy · Doimiy · Kelmadi · Rad etdi.
--  Bazadagi lead_status da "kelmadi" yo'q edi — sinov darsiga
--  kelmagan bola "rad etdi" bilan aralashib ketardi, hisobotda esa
--  bular alohida sanaladi (BOT_Hisobot.js: _hisProbniy).
--
--  Moslik:  Probniy -> yangi · Doimiy -> yozildi
--           Kelmadi -> kelmadi · Rad etdi -> rad
--
--  Alohida fayl: enum qiymatini qo'shgan tranzaksiyada ishlatib
--  bo'lmaydi (0005 dagi sabab bilan bir xil).
-- ============================================================

alter type lead_status add value if not exists 'kelmadi';
