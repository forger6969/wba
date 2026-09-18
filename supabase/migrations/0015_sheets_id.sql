-- ============================================================
-- 0015 — Sheets qatorining o'z ID'si
--
-- Qatnashuv (Q001), Tolovlar (T0001) va Probniylar (P001) qatorlarining
-- ID'si bazada saqlanadi. Ikki sababi bor:
--
--   1. Ko'chirishni qayta yurgizish xavfsiz bo'ladi — yozuv shu ID bo'yicha
--      yangilanadi, ikkinchi nusxa paydo bo'lmaydi (to'lov o'chirilmagani
--      uchun ikkilangan to'lov tushumni buzardi).
--   2. Sheets ⇄ baza ikki tomonlama bog'lash qaysi qator qaysi yozuv
--      ekanini shu ID orqali biladi.
--
-- O'quvchi, guruh va ustozda bu kerak emas: ularning ID'si (S001, G01,
-- U01) bazada ham asosiy kalit.
--
-- CRM'da yaratilgan yozuvda sheets_id bo'sh (null) — unique null'larni
-- bir-biridan farqli deb hisoblaydi, ya'ni ular to'qnashmaydi.
-- ============================================================

alter table enrollments add column if not exists sheets_id text unique;
alter table payments    add column if not exists sheets_id text unique;
alter table leads       add column if not exists sheets_id text unique;

comment on column enrollments.sheets_id is 'Qatnashuv varag''idagi ID (Q001). CRM''da yaratilganda bo''sh.';
comment on column payments.sheets_id    is 'Tolovlar varag''idagi ID (T0001). CRM''da yaratilganda bo''sh.';
comment on column leads.sheets_id       is 'Probniylar varag''idagi ID (P001). CRM''da yaratilganda bo''sh.';
