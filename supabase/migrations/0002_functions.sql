-- ============================================================
--  World Bridge Academy
--  0002_functions.sql · RLS yordamchilari, view'lar, avtomatik ishlar
-- ============================================================

-- ------------------------------------------------------------
-- RLS yordamchi funksiyalari
-- ------------------------------------------------------------

create or replace function app_rol() returns user_role
language sql stable security definer set search_path = public as $$
  select rol from profiles where id = auth.uid() and holat = 'faol'
$$;

create or replace function app_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_rol() = 'admin', false)
$$;

-- admin yoki qabulxona
create or replace function app_is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_rol() in ('admin', 'qabulxona'), false)
$$;

create or replace function app_teacher_id() returns text
language sql stable security definer set search_path = public as $$
  select id from teachers where profile_id = auth.uid()
$$;

create or replace function app_student_id() returns text
language sql stable security definer set search_path = public as $$
  select id from students where profile_id = auth.uid()
$$;

-- Ustoz shu guruhga biriktirilganmi
create or replace function app_teaches_group(p_group text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from groups g
    where g.id = p_group and g.teacher_id = app_teacher_id()
  )
$$;

-- Ustoz shu o'quvchini o'qitadimi (bironta guruhida)
create or replace function app_teaches_student(p_student text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from enrollments e
    join groups g on g.id = e.group_id
    where e.student_id = p_student
      and e.holat <> 'tugagan'
      and g.teacher_id = app_teacher_id()
  )
$$;

-- ------------------------------------------------------------
-- auth.users → profiles
-- ------------------------------------------------------------

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, ism, telefon, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'ism', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'telefon',
    coalesce((new.raw_user_meta_data ->> 'rol')::user_role, 'oquvchi')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------
-- Audit — kim, qachon, nimani o'zgartirdi
-- ------------------------------------------------------------

create or replace function audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_id text;
begin
  v_id := case tg_op when 'DELETE' then (to_jsonb(old) ->> 'id') else (to_jsonb(new) ->> 'id') end;

  insert into audit_log (profile_id, amal, jadval, obyekt_id, eski, yangi)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    v_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('UPDATE', 'INSERT') then to_jsonb(new) end
  );

  return case tg_op when 'DELETE' then old else new end;
end;
$$;

create trigger payments_audit    after insert or update or delete on payments
  for each row execute function audit_trigger();
create trigger invoices_audit    after insert or update or delete on invoices
  for each row execute function audit_trigger();
create trigger enrollments_audit after insert or update or delete on enrollments
  for each row execute function audit_trigger();
create trigger groups_audit      after insert or update or delete on groups
  for each row execute function audit_trigger();
create trigger students_audit    after insert or update or delete on students
  for each row execute function audit_trigger();

-- To'lovni o'chirish taqiqlanadi — faqat bekor qilinadi
create or replace function block_payment_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'To''lovni o''chirib bo''lmaydi. bekor = true qiling — yozuv tarixda qoladi.';
end;
$$;

create trigger payments_no_delete before delete on payments
  for each row execute function block_payment_delete();

-- ------------------------------------------------------------
-- Davr yordamchilari
-- ------------------------------------------------------------

-- '2026-09' → 2026-09-01
create or replace function davr_boshi(p_davr text) returns date
language sql immutable as $$
  select to_date(p_davr || '-01', 'YYYY-MM-DD')
$$;

create or replace function davr_oxiri(p_davr text) returns date
language sql immutable as $$
  select (to_date(p_davr || '-01', 'YYYY-MM-DD') + interval '1 month - 1 day')::date
$$;

-- Yozilgan sanadan boshlab nechanchi oy (1 = birinchi oy)
create or replace function oy_raqami(p_boshlandi date, p_davr text) returns int
language sql immutable as $$
  select (extract(year from davr_boshi(p_davr))::int * 12 + extract(month from davr_boshi(p_davr))::int)
       - (extract(year from p_boshlandi)::int * 12 + extract(month from p_boshlandi)::int)
       + 1
$$;

-- ------------------------------------------------------------
-- Oylik hisob-fakturalar — har oyning 1-sanasida chaqiriladi
-- ------------------------------------------------------------

create or replace function create_monthly_invoices(
  p_davr text default to_char(current_date, 'YYYY-MM')
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  with yangi as (
    insert into invoices (enrollment_id, davr, summa, chegirma)
    select
      e.id,
      p_davr,
      greatest(g.oylik_narx - chegirma.qiymat, 0),
      chegirma.qiymat
    from enrollments e
    join groups g on g.id = e.group_id
    cross join lateral (
      select case
               when e.chegirma_oy > 0
                and oy_raqami(e.boshlandi, p_davr) between 1 and e.chegirma_oy
               then e.chegirma_summa
               else 0
             end as qiymat
    ) chegirma
    where e.holat = 'faol'
      and g.holat = 'faol'
      and e.boshlandi <= davr_oxiri(p_davr)
      and (e.tugadi is null or e.tugadi >= davr_boshi(p_davr))
    on conflict (enrollment_id, davr) do nothing
    returning 1
  )
  select count(*) into v_count from yangi;

  return v_count;
end;
$$;

comment on function create_monthly_invoices is
  'Har oyning 1-sanasida ishlaydi. Takroriy chaqirilsa dublikat yaratmaydi.';

-- ------------------------------------------------------------
-- Dars jadvalini generatsiya qilish
--   toq  = dushanba, chorshanba, juma   (1, 3, 5)
--   juft = seshanba, payshanba, shanba  (2, 4, 6)
-- ------------------------------------------------------------

create or replace function generate_lessons(
  p_group text,
  p_from  date,
  p_to    date
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_kun   day_type;
  v_count int;
begin
  select kun_turi into v_kun from groups where id = p_group and holat = 'faol';
  if v_kun is null then
    return 0;
  end if;

  with kunlar as (
    select d::date as sana
    from generate_series(p_from, p_to, interval '1 day') d
    where case v_kun
            when 'toq'      then extract(isodow from d) in (1, 3, 5)
            when 'juft'     then extract(isodow from d) in (2, 4, 6)
            when 'har_kuni' then extract(isodow from d) between 1 and 6
          end
  ), yangi as (
    insert into lessons (group_id, sana)
    select p_group, sana from kunlar
    on conflict (group_id, sana) do nothing
    returning 1
  )
  select count(*) into v_count from yangi;

  return v_count;
end;
$$;

-- ============================================================
--  VIEW'LAR — barcha hisob-kitob shu yerda, ilovada emas
-- ============================================================

-- Enrollment kesimida: hisoblangan, to'langan, qarz
create or replace view v_enrollment_balance as
select
  e.id                                       as enrollment_id,
  e.student_id,
  e.group_id,
  coalesce(inv.hisoblangan, 0)               as hisoblangan,
  coalesce(inv.chegirma, 0)                  as chegirma,
  coalesce(pay.tolangan, 0)                  as tolangan,
  coalesce(pay.tasdiqlangan, 0)              as tasdiqlangan,
  coalesce(inv.hisoblangan, 0) - coalesce(pay.tolangan, 0) as qarz
from enrollments e
left join lateral (
  select sum(i.summa) as hisoblangan, sum(i.chegirma) as chegirma
  from invoices i
  where i.enrollment_id = e.id and i.holat <> 'bekor'
) inv on true
left join lateral (
  select
    sum(p.summa)                                        as tolangan,
    sum(p.summa) filter (where p.tasdiqlangan)          as tasdiqlangan
  from payments p
  where p.enrollment_id = e.id and not p.bekor
) pay on true;

-- O'quvchi kesimida
create or replace view v_student_balance as
select
  s.id                                        as student_id,
  s.fish,
  s.holat,
  coalesce(sum(b.hisoblangan), 0)             as hisoblangan,
  coalesce(sum(b.chegirma), 0)                as chegirma,
  coalesce(sum(b.tolangan), 0)                as tolangan,
  coalesce(sum(b.tasdiqlangan), 0)            as tasdiqlangan,
  coalesce(sum(b.qarz), 0)                    as qarz
from students s
left join v_enrollment_balance b on b.student_id = s.id
group by s.id, s.fish, s.holat;

-- WOBLR balansi = berilgan ballar − mukofotga sarflangan
create or replace view v_woblr_balance as
select
  s.id                                                   as student_id,
  s.fish,
  coalesce(w.jami, 0)                                    as jami_ball,
  coalesce(r.sarflangan, 0)                              as sarflangan,
  coalesce(w.jami, 0) - coalesce(r.sarflangan, 0)        as balans,
  w.oxirgi
from students s
left join lateral (
  select sum(ball) as jami, max(created_at) as oxirgi
  from woblr where student_id = s.id
) w on true
left join lateral (
  select sum(ball) as sarflangan
  from woblr_redemptions where student_id = s.id
) r on true;

-- Oylik davomat
create or replace view v_attendance_monthly as
select
  a.student_id,
  to_char(l.sana, 'YYYY-MM')                              as davr,
  l.group_id,
  count(*)                                                as darslar,
  count(*) filter (where a.holat in ('keldi', 'kechikdi')) as kelgan,
  round(
    100.0 * count(*) filter (where a.holat in ('keldi', 'kechikdi'))
    / nullif(count(*), 0)
  )::int                                                  as foiz
from attendance a
join lessons l on l.id = a.lesson_id
group by a.student_id, to_char(l.sana, 'YYYY-MM'), l.group_id;

-- Guruh statistikasi
create or replace view v_group_stats as
select
  g.id                                        as group_id,
  g.nom,
  g.teacher_id,
  g.oylik_narx,
  count(e.id) filter (where e.holat = 'faol')  as oquvchilar,
  coalesce(sum(b.tolangan), 0)                 as tushum,
  coalesce(sum(b.qarz), 0)                     as qarz
from groups g
left join enrollments e on e.group_id = g.id
left join v_enrollment_balance b on b.enrollment_id = e.id
group by g.id, g.nom, g.teacher_id, g.oylik_narx;

-- Ustoz statistikasi
create or replace view v_teacher_stats as
select
  t.id                                         as teacher_id,
  t.ism,
  t.holat,
  count(distinct g.id) filter (where g.holat = 'faol')       as guruhlar,
  coalesce(sum(s.oquvchilar), 0)                             as oquvchilar,
  coalesce(sum(s.tushum), 0)                                 as tushum,
  coalesce(sum(s.qarz), 0)                                   as qarz
from teachers t
left join groups g on g.teacher_id = t.id
left join v_group_stats s on s.group_id = g.id
group by t.id, t.ism, t.holat;

-- Qarzdorlar — eng kattadan
create or replace view v_qarzdorlar as
select
  b.student_id,
  b.fish,
  b.qarz,
  s.ota_tel,
  s.ona_tel,
  s.shaxsiy_tel,
  string_agg(g.nom, ' + ' order by g.nom) as guruhlar
from v_student_balance b
join students s on s.id = b.student_id
left join enrollments e on e.student_id = b.student_id and e.holat = 'faol'
left join groups g on g.id = e.group_id
where b.qarz > 0 and b.holat = 'faol'
group by b.student_id, b.fish, b.qarz, s.ota_tel, s.ona_tel, s.shaxsiy_tel
order by b.qarz desc;

-- Dashboard — bitta qator
create or replace view v_dashboard as
select
  (select count(*) from students where holat = 'faol')                            as oquvchilar,
  (select count(*) from groups   where holat = 'faol')                            as guruhlar,
  (select count(*) from teachers where holat = 'faol')                            as ustozlar,
  (select count(*) from v_qarzdorlar)                                             as qarzdorlar,
  (select coalesce(sum(qarz), 0) from v_qarzdorlar)                               as jami_qarz,
  (select coalesce(sum(summa), 0) from payments
     where not bekor and davr = to_char(current_date, 'YYYY-MM'))                 as joriy_oy_tushumi,
  (select count(*) from payments
     where not bekor and davr = to_char(current_date, 'YYYY-MM'))                 as joriy_oy_tolovlari,
  (select coalesce(sum(chegirma), 0) from invoices
     where holat <> 'bekor' and davr = to_char(current_date, 'YYYY-MM'))          as chegirma,
  (select count(*) from payments where not bekor and not tasdiqlangan)            as tasdiqlanmagan_soni,
  (select coalesce(sum(summa), 0) from payments
     where not bekor and not tasdiqlangan)                                        as tasdiqlanmagan_summa;

-- Oylik tushum — grafik uchun
create or replace view v_monthly_income as
select
  davr,
  sum(summa)                              as tushum,
  count(*)                                as tolovlar,
  sum(summa) filter (where tasdiqlangan)  as tasdiqlangan
from payments
where not bekor
group by davr
order by davr;

-- ------------------------------------------------------------
-- View'lar RLS'ga bo'ysunsin (Postgres'da view standart holatda
-- egasining huquqi bilan ishlaydi — bu RLS'ni chetlab o'tardi)
-- ------------------------------------------------------------

do $$
declare v text;
begin
  foreach v in array array[
    'v_enrollment_balance', 'v_student_balance', 'v_woblr_balance',
    'v_attendance_monthly', 'v_group_stats', 'v_teacher_stats',
    'v_qarzdorlar', 'v_dashboard', 'v_monthly_income'
  ] loop
    execute format('alter view %I set (security_invoker = on)', v);
  end loop;
end $$;

-- ------------------------------------------------------------
-- Reyting — o'quvchi butun guruh ballarini ko'rishi kerak,
-- lekin boshqa hech narsasini emas. Shuning uchun alohida funksiya.
-- ------------------------------------------------------------

create or replace function woblr_leaderboard(
  p_group text default null,
  p_davr  text default null
) returns table (orin bigint, student_id text, fish text, ball bigint)
language sql stable security definer set search_path = public as $$
  with jamlanma as (
    select
      w.student_id,
      s.fish,
      sum(w.ball)::bigint as ball
    from woblr w
    join students s on s.id = w.student_id and s.holat = 'faol'
    where (p_davr is null or to_char(w.created_at, 'YYYY-MM') = p_davr)
      and (
        p_group is null
        or exists (
          select 1 from enrollments e
          where e.student_id = w.student_id
            and e.group_id = p_group
            and e.holat <> 'tugagan'
        )
      )
    group by w.student_id, s.fish
  )
  select
    row_number() over (order by ball desc, fish) as orin,
    student_id, fish, ball
  from jamlanma
  order by ball desc, fish
$$;

comment on function woblr_leaderboard is
  'Reyting uchun. Faqat ism va ball qaytaradi — telefon, qarz, davomat chiqmaydi.';
