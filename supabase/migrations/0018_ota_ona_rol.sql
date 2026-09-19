-- ============================================================
--  World Bridge Academy
--  0018_ota_ona_rol.sql · yangi rol — ota-ona
--
--  `alter type ... add value` ALOHIDA faylда bo'lishi kerak (qoida):
--  yangi enum qiymati ishlatilishidan OLDIN commit bo'lishi shart.
--  Shuning uchun bog'lanish, funksiya va RLS — 0019 da.
-- ============================================================

alter type user_role add value if not exists 'ota_ona';
