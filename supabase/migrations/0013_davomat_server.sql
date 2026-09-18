-- ============================================================
--  World Bridge Academy
--  0013_davomat_server.sql · davomatni server ham yozsin
--
--  davomat_saqla() huquqni app_teaches_group / app_is_admin bilan
--  tekshiradi. Ikkalasi ham auth.uid() ga qaraydi, ya'ni SERVER
--  nomidan (service_role: Telegram bot, cron, ko'chirish) chaqirilganda
--  ikkisi ham false bo'lib, funksiya rad etardi.
--
--  Endi qoida boshqa definer funksiyalar bilan bir xil (0010:
--  yozilish_hisoblari): auth.uid() bo'sh bo'lsa — bu odam emas, tizim,
--  va tekshiruv o'tkazib yuboriladi. Odam nomidan kelsa hammasi
--  avvalgidek: faqat o'z guruhi yoki admin.
-- ============================================================

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
  if auth.uid() is not null and not (app_teaches_group(p_group) or app_is_admin()) then
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

  -- Dars ichidagi ball YAKUNIY qiymat: qayta saqlansa ikkilanmaydi
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
