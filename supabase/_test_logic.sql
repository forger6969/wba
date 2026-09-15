-- Faqat LOKAL TEST. Bizneс-mantiq va RLS haqiqatan ishlayaptimi — tekshiradi.
\set ON_ERROR_STOP on
\pset pager off

-- ============================================================
--  1. Namuna ma'lumot
-- ============================================================

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@wba.uz'),
  ('22222222-2222-2222-2222-222222222222', 'kassa@wba.uz'),
  ('33333333-3333-3333-3333-333333333333', 'diana@wba.uz'),
  ('44444444-4444-4444-4444-444444444444', 'oquvchi@wba.uz'),
  ('55555555-5555-5555-5555-555555555555', 'komila@wba.uz');

update profiles set rol = 'admin',     ism = 'Jamshid'  where id = '11111111-1111-1111-1111-111111111111';
update profiles set rol = 'qabulxona', ism = 'Kassa'    where id = '22222222-2222-2222-2222-222222222222';
update profiles set rol = 'ustoz',     ism = 'Diana'    where id = '33333333-3333-3333-3333-333333333333';
update profiles set rol = 'oquvchi',   ism = 'Amirxan'  where id = '44444444-4444-4444-4444-444444444444';
update profiles set rol = 'ustoz',     ism = 'Komila'   where id = '55555555-5555-5555-5555-555555555555';

insert into teachers (id, profile_id, ism) values
  ('U01', '33333333-3333-3333-3333-333333333333', 'Diana'),
  ('U02', '55555555-5555-5555-5555-555555555555', 'Komila Bozorova');

insert into groups (id, nom, subject_id, teacher_id, boshlanish, tugash, kun_turi, oylik_narx) values
  ('N01', 'Beginner', 'ingliz-tili', 'U01', '08:30', '10:00', 'toq',  650000),
  ('N02', 'IELTS',    'ingliz-tili', 'U02', '16:30', '18:00', 'juft', 800000);

insert into students (id, profile_id, fish, qoshilgan_sana) values
  ('S001', '44444444-4444-4444-4444-444444444444', 'Anvarbekov Amirxan', '2026-09-01'),
  ('S002', null, 'Muslima G''ayratova', '2026-09-01'),
  ('S003', null, 'Mohinur Anvarova',   '2026-09-01');

-- S001: tanishuv oyi chegirmasi — 1 oyga 100 000
insert into enrollments (student_id, group_id, boshlandi, chegirma_summa, chegirma_oy, chegirma_sabab) values
  ('S001', 'N01', '2026-09-01', 100000, 1, 'Tanishuv oyi');
-- S002: chegirmasiz
insert into enrollments (student_id, group_id, boshlandi) values
  ('S002', 'N01', '2026-09-01');
-- S003: ikki guruhda — dublikat ism muammosining testi
insert into enrollments (student_id, group_id, boshlandi) values
  ('S003', 'N01', '2026-09-01'),
  ('S003', 'N02', '2026-09-01');

-- ============================================================
--  2. Hisob-fakturalar
-- ============================================================

\echo '--- create_monthly_invoices(2026-09) ---'
select create_monthly_invoices('2026-09') as yaratildi;

\echo '--- takroriy chaqiruv dublikat yaratmasligi kerak (0) ---'
select create_monthly_invoices('2026-09') as yaratildi;

\echo '--- sentabr hisoblari ---'
select e.student_id, e.group_id, i.summa, i.chegirma
from invoices i join enrollments e on e.id = i.enrollment_id
where i.davr = '2026-09' order by e.student_id, e.group_id;

\echo '--- oktabr: S001 chegirmasi tugagan bo''lishi kerak (650000) ---'
select create_monthly_invoices('2026-10');
select e.student_id, i.summa, i.chegirma
from invoices i join enrollments e on e.id = i.enrollment_id
where i.davr = '2026-10' and e.student_id = 'S001';

-- ============================================================
--  3. To'lovlar va qarz
-- ============================================================

insert into payments (student_id, enrollment_id, sana, davr, summa, usul, qabul_qildi)
select 'S001', e.id, '2026-09-05', '2026-09', 550000, 'naqd',
       '22222222-2222-2222-2222-222222222222'
from enrollments e where e.student_id = 'S001';

\echo '--- balanslar (S001 sentabr to''lagan, oktabr qarz) ---'
select student_id, hisoblangan, chegirma, tolangan, qarz
from v_student_balance order by student_id;

\echo '--- qarzdorlar, eng kattadan ---'
select student_id, fish, qarz, guruhlar from v_qarzdorlar;

\echo '--- dashboard ---'
select oquvchilar, guruhlar, ustozlar, qarzdorlar, jami_qarz,
       tasdiqlanmagan_soni, tasdiqlanmagan_summa
from v_dashboard;

-- ============================================================
--  4. Darslar, davomat, WOBLR
-- ============================================================

\echo '--- generate_lessons: toq kun, 01–15 sentabr (du/chor/juma) ---'
select generate_lessons('N01', '2026-09-01', '2026-09-15') as darslar;

insert into attendance (lesson_id, student_id, holat, belgiladi)
select l.id, 'S001',
       case when extract(day from l.sana)::int % 3 = 0 then 'kelmadi' else 'keldi' end::attendance_status,
       '33333333-3333-3333-3333-333333333333'
from lessons l where l.group_id = 'N01';

insert into woblr (student_id, lesson_id, teacher_id, bergan_profile, ball, sabab)
select 'S001', l.id, 'U01', '33333333-3333-3333-3333-333333333333', 2, 'faollik'
from lessons l where l.group_id = 'N01' limit 3;

\echo '--- oylik davomat ---'
select student_id, davr, darslar, kelgan, foiz from v_attendance_monthly;

\echo '--- WOBLR balansi ---'
select student_id, jami_ball, sarflangan, balans from v_woblr_balance where jami_ball is not null or balans <> 0;

\echo '--- reyting ---'
select * from woblr_leaderboard();

-- ============================================================
--  5. To'lovni o'chirib bo'lmasligi
-- ============================================================

\echo '--- DELETE payments xato berishi KERAK ---'
do $$
begin
  delete from payments where student_id = 'S001';
  raise exception 'XATO: to''lov o''chirildi — trigger ishlamadi!';
exception
  when others then
    if sqlerrm like '%o''chirib bo''lmaydi%' then
      raise notice 'OK: to''lovni o''chirish to''sildi';
    else
      raise;
    end if;
end $$;

\echo '--- audit_log to''lganmi ---'
select jadval, amal, count(*) from audit_log group by jadval, amal order by jadval, amal;

-- ============================================================
--  6. RLS — har rol nimani ko'radi
-- ============================================================

\echo ''
\echo '=========== RLS: ADMIN ==========='
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select 'students' as jadval, count(*) from students
union all select 'payments', count(*) from payments
union all select 'audit_log', count(*) from audit_log
union all select 'invoices', count(*) from invoices;

\echo '=========== RLS: QABULXONA (audit_log = 0 bo''lishi kerak) ==========='
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select 'students' as jadval, count(*) from students
union all select 'payments', count(*) from payments
union all select 'audit_log', count(*) from audit_log
union all select 'invoices', count(*) from invoices;

\echo '--- qabulxona to''lovni tasdiqlay olmasligi kerak (0 qator) ---'
with u as (update payments set tasdiqlangan = true where student_id = 'S001' returning 1)
select count(*) as ozgargan from u;

\echo '=========== RLS: USTOZ Diana (N01) — 3 o''quvchi, 0 to''lov ==========='
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select 'students' as jadval, count(*) from students
union all select 'payments', count(*) from payments
union all select 'groups', count(*) from groups
union all select 'woblr', count(*) from woblr;

\echo '=========== RLS: USTOZ Komila (N02) — faqat S003 ==========='
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select id, fish from students order by id;

\echo '=========== RLS: O''QUVCHI S001 — faqat o''zi ==========='
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select 'students' as jadval, count(*) from students
union all select 'payments', count(*) from payments
union all select 'invoices', count(*) from invoices
union all select 'attendance', count(*) from attendance;

\echo '--- o''quvchi reytingni ko''ra oladi (funksiya orqali) ---'
select count(*) as reyting_qatorlari from woblr_leaderboard();

\echo '--- o''quvchi boshqa o''quvchini o''zgartira olmasligi kerak (0 qator) ---'
with u as (update students set fish = 'BUZILDI' where id = 'S002' returning 1)
select count(*) as ozgargan from u;

reset role;
\echo ''
\echo '=== TEST TUGADI ==='
