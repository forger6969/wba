-- ============================================================
--  World Bridge Academy
--  0005_direktor_rol.sql · yangi enum qiymatlari
--
--  NEGA ALOHIDA FAYL:
--  Postgres'da enum'ga qo'shilgan qiymatni O'SHA TRANZAKSIYADA
--  ishlatib bo'lmaydi ("unsafe use of new value of enum type").
--  Migratsiya fayli esa bitta tranzaksiyada bajariladi. Shuning
--  uchun qiymatlar shu yerda qo'shiladi, ishlatilishi — 0006 da.
-- ============================================================

-- ------------------------------------------------------------
-- direktor — to'lovni tasdiqlaydi (qog'ozdagi imzo o'rnida)
--
-- Ishlayotgan tizimda rollar boshqacha: Z_Rollar.js da admin,
-- direktor va ustoz bor, qabulxona esa yo'q. Tasdiq faqat
-- direktorda: T_Tasdiq.js "Tasdiq" ustunini himoyalab qo'yadi va
-- admin ham bosa olmaydi.
-- ------------------------------------------------------------

alter type user_role add value if not exists 'direktor';

-- ------------------------------------------------------------
-- dam_olish — shanba va yakshanba o'qiydigan guruhlar
--
-- Shanba IKKALA turga kiradi: juft guruh ham, dam olish guruhi
-- ham o'sha kuni o'qiydi. Shuning uchun bu alohida tur, jurnali
-- ham alohida varaqda (Q_Jurnal.js: V_JDAM).
-- ------------------------------------------------------------

alter type day_type add value if not exists 'dam_olish';
