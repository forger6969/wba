-- ============================================================
--  World Bridge Academy
--  0007_davomat.sql · davomat va WOBLR — bitta amalda saqlash
--
--  Ekranda ustoz ikki narsani bir vaqtda qo'yadi: kim kelgani va
--  kimga necha ball berilgani. Bular UCHTA jadvalga tegadi
--  (lessons, attendance, woblr), ya'ni ilovadan uchta so'rov
--  yuborilsa — yarim yozilib qolish ehtimoli bor. Shuning uchun
--  hammasi bitta funksiyada, bitta tranzaksiyada.
-- ============================================================

-- ------------------------------------------------------------
-- Ball darsga bog'langanda bitta o'quvchiga bitta yozuv
--
-- WOBLR jurnali "har yozuv — bitta amal" tamoyilida qurilgan, lekin
-- dars davomida ustoz "Saqlash" ni ikki marta bosishi mumkin. Shunda
-- ball ikkilanib ketardi. Dars ichidagi ball — YAKUNIY qiymat:
-- saqlanganda o'sha darsning ballari qaytadan yoziladi.
-- ------------------------------------------------------------

create or replace function davomat_saqla(
  p_group    text,
  p_sana     date,
  p_belgilar jsonb,                      -- {"S001": "keldi", "S002": "kelmadi"}
  p_ballar   jsonb default '{}'::jsonb,  -- {"S001": 2}  · 0 yoki yo'q — ball yo'q
  p_mavzu    text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_dars    uuid;
  v_ustoz   text;
  v_davomat int := 0;
  v_ball    int := 0;
begin
  -- Huquq shu yerda tekshiriladi: funksiya security definer, ya'ni
  -- RLS uni to'smaydi.
  if not (app_teaches_group(p_group) or app_is_admin()) then
    raise exception 'Bu guruhga davomat qo''yish huquqingiz yo''q.';
  end if;

  if p_sana > current_date then
    raise exception 'Kelasi kunga davomat qo''yib bo''lmaydi.';
  end if;

  insert into lessons (group_id, sana, mavzu, otkazildi)
  values (p_group, p_sana, p_mavzu, true)
  on conflict (group_id, sana) do update
    set otkazildi = true,
        mavzu = coalesce(excluded.mavzu, lessons.mavzu)
  returning id into v_dars;

  select teacher_id into v_ustoz from groups where id = p_group;

  -- ── Davomat ──
  -- Faqat shu guruhga biriktirilgan o'quvchilar. Ro'yxatga begona
  -- ID qo'shib yuborilsa — jim o'tkazib yuboriladi.
  insert into attendance (lesson_id, student_id, holat, belgiladi)
  select v_dars, kv.key, (kv.value #>> '{}')::attendance_status, auth.uid()
  from jsonb_each(coalesce(p_belgilar, '{}'::jsonb)) kv
  where exists (
    select 1 from enrollments e
    where e.student_id = kv.key
      and e.group_id = p_group
      and e.holat <> 'tugagan'
  )
  on conflict (lesson_id, student_id) do update
    set holat = excluded.holat,
        belgiladi = excluded.belgiladi,
        updated_at = now();

  get diagnostics v_davomat = row_count;

  -- ── WOBLR ──
  -- Avval shu darsning ballari olib tashlanadi, keyin yangisi
  -- yoziladi: qayta saqlansa ball ikkilanmaydi, 0 qo'yilsa o'chadi.
  delete from woblr where lesson_id = v_dars;

  insert into woblr (student_id, lesson_id, teacher_id, bergan_profile, ball, sabab)
  select kv.key, v_dars, v_ustoz, auth.uid(), (kv.value #>> '{}')::int, 'faollik'
  from jsonb_each(coalesce(p_ballar, '{}'::jsonb)) kv
  where coalesce((kv.value #>> '{}')::int, 0) <> 0
    and exists (
      select 1 from enrollments e
      where e.student_id = kv.key
        and e.group_id = p_group
        and e.holat <> 'tugagan'
    );

  get diagnostics v_ball = row_count;

  return jsonb_build_object(
    'dars_id',  v_dars,
    'davomat',  v_davomat,
    'ball',     v_ball
  );
end;
$$;

comment on function davomat_saqla is
  'Davomat va WOBLR bitta tranzaksiyada. Qayta saqlash xavfsiz: belgilar yangilanadi, ballar qayta yoziladi.';

-- ------------------------------------------------------------
-- Ustozning shu kundagi darslari
--
-- Kun turi qoidasi bir joyda tursin: ekranda ham, botda ham,
-- generate_lessons da ham bir xil bo'lishi kerak.
--   toq       1, 3, 5      juft      2, 4, 6
--   dam_olish 6, 7         har_kuni  1..6
-- Shanba (6) juft guruhga ham, dam olish guruhiga ham kiradi.
-- ------------------------------------------------------------

create or replace function dars_kunimi(p_kun day_type, p_sana date) returns boolean
language sql immutable as $$
  select case p_kun
           when 'toq'       then extract(isodow from p_sana) in (1, 3, 5)
           when 'juft'      then extract(isodow from p_sana) in (2, 4, 6)
           when 'dam_olish' then extract(isodow from p_sana) in (6, 7)
           when 'har_kuni'  then extract(isodow from p_sana) between 1 and 6
         end
$$;

create or replace view v_bugungi_darslar as
select
  g.id                                as group_id,
  g.nom,
  g.teacher_id,
  g.boshlanish,
  g.tugash,
  g.kun_turi,
  (current_date)                      as sana,
  l.id                                as lesson_id,
  coalesce(l.otkazildi, false)        as belgilangan,
  (select count(*) from enrollments e
     where e.group_id = g.id and e.holat <> 'tugagan') as oquvchilar
from groups g
left join lessons l on l.group_id = g.id and l.sana = current_date
where g.holat = 'faol'
  and dars_kunimi(g.kun_turi, current_date);

alter view v_bugungi_darslar set (security_invoker = on);

comment on view v_bugungi_darslar is
  'Bugun darsi bor faol guruhlar. RLS ustozga faqat o''zinikini ko''rsatadi.';
