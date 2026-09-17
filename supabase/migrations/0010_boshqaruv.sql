-- ============================================================
--  World Bridge Academy
--  0010_boshqaruv.sql · boshqaruv paneli amallari
--
--  Bir nechta jadvalga tegadigan har amal — bitta funksiya, bitta
--  tranzaksiya. Ilovadan ketma-ket so'rov yuborilsa, o'rtada xato
--  chiqqanda o'quvchi bor-u guruhi yo'q holat qolardi.
--
--  Hammasi security definer, shuning uchun huquqni HAR BIRI o'zi
--  tekshiradi (app_is_staff / app_is_admin).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Toshkent sanasi
--
-- Baza UTC da yuradi. current_date 00:00–05:00 oralig'ida (Toshkentda)
-- hali KECHAGI kunni qaytaradi: tunda ochilgan "bugungi darslar"
-- ro'yxati kechagi bo'lib, bugungi sanaga davomat esa "kelasi kun"
-- deb rad etilardi.
-- ------------------------------------------------------------

create or replace function bugun_toshkent() returns date
language sql stable as $$
  select (now() at time zone 'Asia/Tashkent')::date
$$;

create or replace view v_bugungi_darslar as
select
  g.id                                as group_id,
  g.nom,
  g.teacher_id,
  g.boshlanish,
  g.tugash,
  g.kun_turi,
  bugun_toshkent()                    as sana,
  l.id                                as lesson_id,
  coalesce(l.otkazildi, false)        as belgilangan,
  (select count(*) from enrollments e
     where e.group_id = g.id and e.holat <> 'tugagan') as oquvchilar
from groups g
left join lessons l on l.group_id = g.id and l.sana = bugun_toshkent()
where g.holat = 'faol'
  and dars_kunimi(g.kun_turi, bugun_toshkent());

alter view v_bugungi_darslar set (security_invoker = on);

create or replace function davomat_saqla(
  p_group    text,
  p_sana     date,
  p_belgilar jsonb,
  p_ballar   jsonb default '{}'::jsonb,
  p_mavzu    text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_dars    uuid;
  v_ustoz   text;
  v_davomat int := 0;
  v_ball    int := 0;
begin
  if not (app_teaches_group(p_group) or app_is_admin()) then
    raise exception 'Bu guruhga davomat qo''yish huquqingiz yo''q.';
  end if;

  if p_sana > bugun_toshkent() then
    raise exception 'Kelasi kunga davomat qo''yib bo''lmaydi.';
  end if;

  insert into lessons (group_id, sana, mavzu, otkazildi)
  values (p_group, p_sana, p_mavzu, true)
  on conflict (group_id, sana) do update
    set otkazildi = true,
        mavzu = coalesce(excluded.mavzu, lessons.mavzu)
  returning id into v_dars;

  select teacher_id into v_ustoz from groups where id = p_group;

  insert into attendance (lesson_id, student_id, holat, belgiladi)
  select v_dars, kv.key, (kv.value #>> '{}')::attendance_status, auth.uid()
  from jsonb_each(coalesce(p_belgilar, '{}'::jsonb)) kv
  where exists (
    select 1 from enrollments e
    where e.student_id = kv.key and e.group_id = p_group and e.holat <> 'tugagan'
  )
  on conflict (lesson_id, student_id) do update
    set holat = excluded.holat, belgiladi = excluded.belgiladi, updated_at = now();
  get diagnostics v_davomat = row_count;

  delete from woblr where lesson_id = v_dars;

  insert into woblr (student_id, lesson_id, teacher_id, bergan_profile, ball, sabab)
  select kv.key, v_dars, v_ustoz, auth.uid(), (kv.value #>> '{}')::int, 'faollik'
  from jsonb_each(coalesce(p_ballar, '{}'::jsonb)) kv
  where coalesce((kv.value #>> '{}')::int, 0) <> 0
    and exists (
      select 1 from enrollments e
      where e.student_id = kv.key and e.group_id = p_group and e.holat <> 'tugagan'
    );
  get diagnostics v_ball = row_count;

  return jsonb_build_object('dars_id', v_dars, 'davomat', v_davomat, 'ball', v_ball);
end;
$$;

-- ------------------------------------------------------------
-- 2. Keyingi ID — S078, N19 ...
--
-- Sheets'da ID = ROW()-1 edi va qator o'chirilsa hamma havola
-- siljirdi. Bu yerda ID bir marta beriladi va o'zgarmaydi.
-- Qulf: bir vaqtda ikki admin qo'shsa ham bir xil ID chiqmasin.
-- ------------------------------------------------------------

create or replace function keyingi_id(p_jadval text, p_prefiks text, p_uzunlik int default 3)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_max int;
begin
  if p_jadval not in ('students', 'groups', 'teachers') then
    raise exception 'Noma''lum jadval: %', p_jadval;
  end if;
  if p_prefiks !~ '^[A-Z]{1,3}$' then
    raise exception 'Prefiks faqat katta harflar: %', p_prefiks;
  end if;

  perform pg_advisory_xact_lock(hashtext('keyingi_id:' || p_jadval));

  execute format(
    'select coalesce(max(substring(id from %s)::int), 0) from %I where id ~ %L',
    length(p_prefiks) + 1, p_jadval, '^' || p_prefiks || '[0-9]+$'
  ) into v_max;

  return p_prefiks || lpad((v_max + 1)::text, p_uzunlik, '0');
end;
$$;

-- ------------------------------------------------------------
-- 3. Yozilishning hisob-fakturalari
--
-- create_monthly_invoices() faqat JORIY oy uchun yozadi. O'quvchi
-- o'tgan sanadan (masalan 1-sentabrdan) biriktirilsa, o'sha oylar
-- ham hisoblanishi kerak — aks holda qarz kam chiqadi.
-- ------------------------------------------------------------

create or replace function yozilish_hisoblari(p_enrollment uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  if auth.uid() is not null and not app_is_staff() then
    raise exception 'Hisob-faktura yaratish huquqingiz yo''q.';
  end if;

  with y as (
    select e.id, e.boshlandi, e.tugadi, e.chegirma_summa, e.chegirma_oy,
           e.chegirma2_summa, e.chegirma2_oy, g.oylik_narx
    from enrollments e join groups g on g.id = e.group_id
    where e.id = p_enrollment
  ),
  oylar as (
    select y.*, to_char(d, 'YYYY-MM') as davr
    from y
    cross join generate_series(
      date_trunc('month', y.boshlandi::timestamp),
      date_trunc('month', coalesce(least(y.tugadi, bugun_toshkent()), bugun_toshkent())::timestamp),
      interval '1 month'
    ) d
  ),
  yangi as (
    insert into invoices (enrollment_id, davr, summa, chegirma)
    select o.id, o.davr,
           greatest(o.oylik_narx - least(c.qiymat, o.oylik_narx), 0),
           least(c.qiymat, o.oylik_narx)
    from oylar o
    cross join lateral (
      select chegirma_oyda(oy_raqami(o.boshlandi, o.davr),
                           o.chegirma_summa, o.chegirma_oy,
                           o.chegirma2_summa, o.chegirma2_oy) as qiymat
    ) c
    on conflict (enrollment_id, davr) do nothing
    returning 1
  )
  select count(*) into v_count from yangi;

  return v_count;
end;
$$;

-- ------------------------------------------------------------
-- 4. Guruhga biriktirish / guruhdan chiqarish
--
-- Botdagi /biriktir bilan bir xil. Chegirma Qatnashuvdagi kabi
-- ikki bosqichli: "necha oy" bo'sh qolsa — muddatsiz.
-- ------------------------------------------------------------

create or replace function guruhga_biriktir(
  p_student   text,
  p_group     text,
  p_boshlandi date default null,
  p_chegirma  jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id    uuid;
  v_c1    numeric := coalesce(nullif(p_chegirma ->> 'chegirma_summa', '')::numeric, 0);
  v_c2    numeric := coalesce(nullif(p_chegirma ->> 'chegirma2_summa', '')::numeric, 0);
begin
  if not app_is_staff() then
    raise exception 'Guruhga biriktirish huquqingiz yo''q.';
  end if;

  if exists (
    select 1 from enrollments
    where student_id = p_student and group_id = p_group and holat <> 'tugagan'
  ) then
    raise exception 'Bu o''quvchi shu guruhda allaqachon o''qiyapti.';
  end if;

  insert into enrollments (
    student_id, group_id, boshlandi,
    chegirma_summa, chegirma_oy, chegirma2_summa, chegirma2_oy, chegirma_sabab
  ) values (
    p_student, p_group, coalesce(p_boshlandi, bugun_toshkent()),
    v_c1,
    case when v_c1 > 0 then nullif(p_chegirma ->> 'chegirma_oy', '')::int else 0 end,
    v_c2,
    case when v_c2 > 0 then nullif(p_chegirma ->> 'chegirma2_oy', '')::int else 0 end,
    nullif(p_chegirma ->> 'chegirma_sabab', '')
  )
  returning id into v_id;

  perform yozilish_hisoblari(v_id);
  return v_id;
end;
$$;

create or replace function guruhdan_chiqar(p_enrollment uuid, p_sana date default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_sana date := coalesce(p_sana, bugun_toshkent());
begin
  if not app_is_staff() then
    raise exception 'Guruhdan chiqarish huquqingiz yo''q.';
  end if;

  update enrollments
     set tugadi = v_sana, holat = 'tugagan'
   where id = p_enrollment and holat <> 'tugagan';

  if not found then
    raise exception 'Yozilish topilmadi yoki allaqachon yopilgan.';
  end if;

  -- Chiqqan oydan keyingi hisob-fakturalar kerak emas
  delete from invoices
   where enrollment_id = p_enrollment
     and davr > to_char(v_sana, 'YYYY-MM');
end;
$$;

-- ------------------------------------------------------------
-- 5. O'quvchi qo'shish — kerak bo'lsa darhol guruhga ham
-- ------------------------------------------------------------

create or replace function oquvchi_qosh(p jsonb)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_id text;
begin
  if not app_is_staff() then
    raise exception 'O''quvchi qo''shish huquqingiz yo''q.';
  end if;
  if coalesce(trim(p ->> 'fish'), '') = '' then
    raise exception 'Ism familya kiritilmagan.';
  end if;

  v_id := keyingi_id('students', 'S', 3);

  insert into students (id, fish, tugilgan_sana, ota_tel, ona_tel, shaxsiy_tel, izoh, qoshilgan_sana)
  values (
    v_id,
    trim(p ->> 'fish'),
    nullif(p ->> 'tugilgan_sana', '')::date,
    nullif(p ->> 'ota_tel', ''),
    nullif(p ->> 'ona_tel', ''),
    nullif(p ->> 'shaxsiy_tel', ''),
    nullif(p ->> 'izoh', ''),
    bugun_toshkent()
  );

  if coalesce(p ->> 'group_id', '') <> '' then
    perform guruhga_biriktir(v_id, p ->> 'group_id', nullif(p ->> 'boshlandi', '')::date, p);
  end if;

  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- 6. Probniylar
--
-- Botdagi Probniylar varag'i: sinov darsiga kelgan bola, guruhi,
-- sinov kuni. "Doimiy" qilinsa — O'quvchilar + Qatnashuvga o'tadi
-- (Y_Probniy.js: _probOtkaz). Guruh tanlanmagan bo'lsa o'tkazilmaydi.
-- ------------------------------------------------------------

alter table leads add column if not exists group_id      text references groups (id) on delete set null;
alter table leads add column if not exists tugilgan_sana date;
alter table leads add column if not exists sinov_sana    date;

comment on column leads.sinov_sana is 'Sinov darsi kuni. Bo''sh — hali kelishilmagan.';

create or replace function probniy_doimiy(p_lead uuid, p_boshlandi date default null)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_lead leads%rowtype;
  v_id   text;
begin
  if not app_is_staff() then
    raise exception 'Probniyni o''quvchi qilish huquqingiz yo''q.';
  end if;

  select * into v_lead from leads where id = p_lead for update;
  if not found then
    raise exception 'Probniy topilmadi.';
  end if;
  if v_lead.student_id is not null then
    raise exception 'Bu probniy allaqachon o''quvchi qilingan (%).', v_lead.student_id;
  end if;
  if v_lead.group_id is null then
    raise exception 'Guruh tanlanmagan — avval guruhni belgilang.';
  end if;

  v_id := oquvchi_qosh(jsonb_build_object(
    'fish',          v_lead.ism,
    'shaxsiy_tel',   v_lead.telefon,
    'tugilgan_sana', v_lead.tugilgan_sana,
    'group_id',      v_lead.group_id,
    'boshlandi',     coalesce(p_boshlandi, bugun_toshkent()),
    'izoh',          nullif(concat_ws(' · ', 'Probniydan', v_lead.izoh), 'Probniydan')
  ));

  update leads set holat = 'yozildi', student_id = v_id where id = p_lead;
  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- 7. Hisobot — sana oralig'i
--
-- Botdagi "📈 Hisobot" bilan bir xil tarkib (BOT_Hisobot.js:
-- hisobotMatn): tushum, davomat, DAVOMAT QILINMAGAN darslar,
-- probniylar. Hisob bazada — sahifa faqat ko'rsatadi.
-- security invoker: RLS amal qiladi (pulni faqat xodim ko'radi).
-- ------------------------------------------------------------

create or replace function tushum_hisobot(p_dan date, p_gacha date)
returns jsonb
language sql stable security invoker set search_path = public as $$
  with t as (
    select p.sana, p.summa, p.usul, p.student_id, p.tasdiqlangan,
           coalesce(tc.ism, '—') as ustoz,
           coalesce(s.nom, '—')  as yonalish
    from payments p
    left join enrollments e on e.id = p.enrollment_id
    left join groups g      on g.id = e.group_id
    left join teachers tc   on tc.id = g.teacher_id
    left join subjects s    on s.id = g.subject_id
    where not p.bekor and p.sana between p_dan and p_gacha
  ),
  d as (
    select a.holat::text as holat
    from attendance a join lessons l on l.id = a.lesson_id
    where l.sana between p_dan and p_gacha
  ),
  kutilgan as (
    select g.id as group_id, g.nom, coalesce(tc.ism, '—') as ustoz, k.sana::date as sana
    from groups g
    left join teachers tc on tc.id = g.teacher_id
    cross join generate_series(p_dan::timestamp, least(p_gacha, bugun_toshkent())::timestamp, interval '1 day') k(sana)
    where g.holat = 'faol'
      and dars_kunimi(g.kun_turi, k.sana::date)
      and exists (
        select 1 from enrollments e
        where e.group_id = g.id and e.boshlandi <= k.sana::date
          and (e.tugadi is null or e.tugadi >= k.sana::date)
      )
  ),
  -- Dars "qilingan" — o'tkazildi deb belgilangan YOKI kamida bitta
  -- davomat belgisi bor (belgi qo'yilgan darsni qilinmagan deyish xato)
  qilinmagan as (
    select k.* from kutilgan k
    where not exists (
      select 1 from lessons l
      where l.group_id = k.group_id and l.sana = k.sana
        and (l.otkazildi or exists (select 1 from attendance a where a.lesson_id = l.id))
    )
  ),
  pr as (
    select holat::text as holat
    from leads
    where (created_at at time zone 'Asia/Tashkent')::date between p_dan and p_gacha
  )
  select jsonb_build_object(
    'tushum',          (select coalesce(sum(summa), 0) from t),
    'soni',            (select count(*) from t),
    'odam',            (select count(distinct student_id) from t),
    'tasdiqlanmagan',  (select coalesce(sum(summa), 0) from t where not tasdiqlangan),
    'usul', coalesce((
      select jsonb_agg(x order by x.summa desc)
      from (select coalesce(usul::text, 'aniqlanmagan') as nom, sum(summa) as summa, count(*) as soni
            from t group by 1) x), '[]'::jsonb),
    'ustoz', coalesce((
      select jsonb_agg(x order by x.summa desc)
      from (select ustoz as nom, sum(summa) as summa, count(*) as soni from t group by 1) x), '[]'::jsonb),
    'yonalish', coalesce((
      select jsonb_agg(x order by x.summa desc)
      from (select yonalish as nom, sum(summa) as summa, count(*) as soni from t group by 1) x), '[]'::jsonb),
    'kunlar', coalesce((
      select jsonb_agg(x order by x.sana)
      from (select sana, sum(summa) as summa, count(*) as soni from t group by sana) x), '[]'::jsonb),
    'davomat', jsonb_build_object(
      'belgilar', (select count(*) from d),
      'kelgan',   (select count(*) from d where holat in ('keldi', 'kechikdi')),
      'kelmadi',  (select count(*) from d where holat = 'kelmadi'),
      'sababli',  (select count(*) from d where holat = 'sababli')
    ),
    'darslar', jsonb_build_object(
      'kutilgan',   (select count(*) from kutilgan),
      'qilinmagan', (select count(*) from qilinmagan)
    ),
    'qilinmagan', coalesce((
      select jsonb_agg(x)
      from (select ustoz, nom, sana from qilinmagan order by ustoz, sana limit 80) x), '[]'::jsonb),
    'probniy', jsonb_build_object(
      'jami',       (select count(*) from pr),
      'kutilmoqda', (select count(*) from pr where holat in ('yangi', 'qongiroq', 'keldi')),
      'yozildi',    (select count(*) from pr where holat = 'yozildi'),
      'kelmadi',    (select count(*) from pr where holat = 'kelmadi'),
      'rad',        (select count(*) from pr where holat = 'rad')
    )
  )
$$;

comment on function tushum_hisobot is
  'Sana oralig''i hisoboti: tushum, davomat, qilinmagan darslar, probniylar. RLS amal qiladi.';

-- ------------------------------------------------------------
-- 8. Oylik hisob-faktura — har kuni o'zi (pg_cron bo'lsa)
--
-- Funksiya takroriy chaqirilsa dublikat yaratmaydi, shuning uchun
-- kuniga bir marta yuritish xavfsiz: oy boshida yangi oy ochiladi,
-- oy o'rtasida qo'shilgan yozilish ham ertasi kuni hisoblanadi.
-- pg_cron bo'lmagan joyda (lokal test) jim o'tkazib yuboriladi.
-- ------------------------------------------------------------

do $$
begin
  begin
    create extension if not exists pg_cron;
    perform cron.schedule(
      'oylik-hisob-faktura',
      '5 0 * * *',                       -- 05:05 Toshkent vaqti
      'select public.create_monthly_invoices()'
    );
  exception when others then
    raise notice 'pg_cron yo''q — hisob-faktura qo''lda: select create_monthly_invoices();';
  end;
end $$;
