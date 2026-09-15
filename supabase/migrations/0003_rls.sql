-- ============================================================
--  World Bridge Academy
--  0003_rls.sql · Row Level Security — huquq bazaning o'zida
--
--  Qoida: ilovada xato bo'lsa ham chegara buzilmaydi.
--  Matritsa: admin · qabulxona · ustoz · o'quvchi
-- ============================================================

-- ------------------------------------------------------------
-- Grantlar. Filtrlashni RLS qiladi, grant faqat eshikni ochadi.
-- ------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables    in schema public to authenticated;
grant usage,  select                 on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- Ommaviy sayt uchun — faqat kurslar katalogi
grant select on subjects, levels to anon;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- ------------------------------------------------------------
-- RLS'ni yoqamiz
-- ------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'subjects', 'levels', 'teachers', 'students', 'groups',
    'enrollments', 'lessons', 'attendance', 'woblr', 'woblr_rewards',
    'woblr_redemptions', 'invoices', 'payments', 'leads', 'audit_log', 'settings'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
  end loop;
end $$;

-- ============================================================
--  profiles
-- ============================================================

create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or app_is_admin());

create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and rol = app_rol());

create policy profiles_admin_all on profiles for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

-- ============================================================
--  subjects / levels — ommaviy sayt o'qiydi, admin yozadi
-- ============================================================

create policy subjects_read on subjects for select to anon, authenticated using (true);
create policy subjects_write on subjects for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

create policy levels_read on levels for select to anon, authenticated using (true);
create policy levels_write on levels for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

-- ============================================================
--  teachers — ism hamma joyda kerak, maosh faqat admin va o'ziga
-- ============================================================

create policy teachers_read on teachers for select to authenticated using (true);

create policy teachers_write on teachers for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

-- Eslatma: maosh_turi / maosh_qiymati ustunlari UI darajasida yashiriladi.
-- Ustun darajasidagi himoya kerak bo'lsa — alohida teacher_salaries jadvaliga
-- ajratiladi (Faza 3'da, maosh qoidasi kelishilgandan keyin).

-- ============================================================
--  students
-- ============================================================

create policy students_staff on students for all to authenticated
  using (app_is_staff()) with check (app_is_staff());

create policy students_teacher_read on students for select to authenticated
  using (app_rol() = 'ustoz' and app_teaches_student(id));

create policy students_own_read on students for select to authenticated
  using (profile_id = auth.uid());

-- ============================================================
--  groups
-- ============================================================

create policy groups_staff_read on groups for select to authenticated
  using (app_is_staff());

create policy groups_admin_write on groups for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

create policy groups_teacher_read on groups for select to authenticated
  using (teacher_id = app_teacher_id());

create policy groups_student_read on groups for select to authenticated
  using (exists (
    select 1 from enrollments e
    where e.group_id = groups.id
      and e.student_id = app_student_id()
      and e.holat <> 'tugagan'
  ));

-- ============================================================
--  enrollments
-- ============================================================

create policy enrollments_staff on enrollments for all to authenticated
  using (app_is_staff()) with check (app_is_staff());

create policy enrollments_teacher_read on enrollments for select to authenticated
  using (app_teaches_group(group_id));

create policy enrollments_own_read on enrollments for select to authenticated
  using (student_id = app_student_id());

-- ============================================================
--  lessons — ustoz o'z guruhida dars yaratadi va tahrirlaydi
-- ============================================================

create policy lessons_staff_read on lessons for select to authenticated
  using (app_is_staff());

create policy lessons_admin_write on lessons for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

create policy lessons_teacher_read on lessons for select to authenticated
  using (app_teaches_group(group_id));

create policy lessons_teacher_insert on lessons for insert to authenticated
  with check (app_teaches_group(group_id));

create policy lessons_teacher_update on lessons for update to authenticated
  using (app_teaches_group(group_id)) with check (app_teaches_group(group_id));

create policy lessons_student_read on lessons for select to authenticated
  using (exists (
    select 1 from enrollments e
    where e.group_id = lessons.group_id
      and e.student_id = app_student_id()
      and e.holat <> 'tugagan'
  ));

-- ============================================================
--  attendance — belgilash faqat o'z darsida
-- ============================================================

create policy attendance_staff_read on attendance for select to authenticated
  using (app_is_staff());

create policy attendance_admin_write on attendance for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

create policy attendance_teacher_read on attendance for select to authenticated
  using (exists (
    select 1 from lessons l
    where l.id = attendance.lesson_id and app_teaches_group(l.group_id)
  ));

create policy attendance_teacher_insert on attendance for insert to authenticated
  with check (exists (
    select 1 from lessons l
    where l.id = attendance.lesson_id and app_teaches_group(l.group_id)
  ));

create policy attendance_teacher_update on attendance for update to authenticated
  using (exists (
    select 1 from lessons l
    where l.id = attendance.lesson_id and app_teaches_group(l.group_id)
  ))
  with check (exists (
    select 1 from lessons l
    where l.id = attendance.lesson_id and app_teaches_group(l.group_id)
  ));

create policy attendance_own_read on attendance for select to authenticated
  using (student_id = app_student_id());

-- ============================================================
--  woblr — ustoz o'z o'quvchisiga beradi, o'chira olmaydi
-- ============================================================

create policy woblr_staff_read on woblr for select to authenticated
  using (app_is_staff());

create policy woblr_admin_write on woblr for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

create policy woblr_teacher_read on woblr for select to authenticated
  using (app_teaches_student(student_id));

create policy woblr_teacher_insert on woblr for insert to authenticated
  with check (
    app_rol() = 'ustoz'
    and app_teaches_student(student_id)
    and bergan_profile = auth.uid()
  );

create policy woblr_own_read on woblr for select to authenticated
  using (student_id = app_student_id());

-- Mukofotlar — hamma ko'radi, admin boshqaradi
create policy rewards_read on woblr_rewards for select to authenticated using (true);
create policy rewards_write on woblr_rewards for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

create policy redemptions_staff on woblr_redemptions for all to authenticated
  using (app_is_staff()) with check (app_is_staff());
create policy redemptions_own_read on woblr_redemptions for select to authenticated
  using (student_id = app_student_id());

-- ============================================================
--  invoices — ustoz pulni ko'rmaydi
-- ============================================================

create policy invoices_staff_read on invoices for select to authenticated
  using (app_is_staff());

create policy invoices_admin_write on invoices for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

create policy invoices_own_read on invoices for select to authenticated
  using (exists (
    select 1 from enrollments e
    where e.id = invoices.enrollment_id and e.student_id = app_student_id()
  ));

-- ============================================================
--  payments
--    qabulxona  — kiritadi va ko'radi
--    admin      — tasdiqlaydi va bekor qiladi
--    o'quvchi   — faqat o'z to'lovlari
--    DELETE     — hech kimda yo'q (trigger ham to'sadi)
-- ============================================================

create policy payments_staff_read on payments for select to authenticated
  using (app_is_staff());

create policy payments_staff_insert on payments for insert to authenticated
  with check (app_is_staff() and qabul_qildi = auth.uid() and not tasdiqlangan);

create policy payments_admin_update on payments for update to authenticated
  using (app_is_admin()) with check (app_is_admin());

create policy payments_own_read on payments for select to authenticated
  using (student_id = app_student_id());

-- ============================================================
--  leads — saytdagi forma server tomonida (service role) yoziladi
-- ============================================================

create policy leads_staff on leads for all to authenticated
  using (app_is_staff()) with check (app_is_staff());

-- ============================================================
--  audit_log — faqat admin o'qiydi, hech kim yozmaydi/o'chirmaydi
--  (yozuvni trigger security definer sifatida qo'yadi)
-- ============================================================

create policy audit_admin_read on audit_log for select to authenticated
  using (app_is_admin());

revoke insert, update, delete on audit_log from authenticated;

-- ============================================================
--  settings
-- ============================================================

create policy settings_read on settings for select to authenticated using (true);
create policy settings_admin_write on settings for all to authenticated
  using (app_is_admin()) with check (app_is_admin());
