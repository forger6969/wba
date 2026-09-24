-- ============================================================
--  World Bridge Academy (forger fork)
--  0027_ulash_ustma_ust_tuzatish.sql · 0025 dagi xato: ikki overload
--
--  0025 telegram_ula_qator() ga p_lead qo'shdi, lekin parametr soni
--  o'zgargani uchun `create or replace` ESKISINI ALMASHTIRMADI —
--  ikkinchi (eski, 7 argumentli) versiya sifatida qoldi. Natija:
--  chaqiruv "is not unique" yoki "does not exist" bilan yiqilardi
--  (jonli sinovda, 24.09, real foydalanuvchi bilan topildi).
--
--  Tuzatish: eski imzoni aniq o'chirish, faqat 8 argumentli (p_lead
--  bilan, default null) qoladi.
-- ============================================================

drop function if exists telegram_ula_qator(bigint, text, text, text, uuid, text, text);
