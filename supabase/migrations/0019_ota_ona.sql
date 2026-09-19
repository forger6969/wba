-- ============================================================
--  World Bridge Academy
--  0019_ota_ona.sql · ota-ona hisobi: bog'lanish + RLS
--
--  Ota-ona hisobi bitta o'quvchiga bog'lanadi (profiles.oquvchi_id) va
--  FAQAT o'sha farzandning ma'lumotini ko'radi — o'quvchining o'z
--  *_own_read siyosatlarining ko'zgusi, lekin auth.uid() emas, balki
--  bog'langan o'quvchi (app_farzand_id) bo'yicha. Yozish huquqi yo'q.
-- ============================================================

alter table profiles add column if not exists oquvchi_id text references students(id);
comment on column profiles.oquvchi_id is 'Ota-ona hisobi bog''langan o''quvchi (faqat rol=ota_ona uchun).';

-- Joriy foydalanuvchi (ota-ona) ning farzandi ID si
create or replace function app_farzand_id() returns text
language sql stable security definer set search_path = public as $$
  select oquvchi_id from profiles where id = auth.uid()
$$;
revoke execute on function app_farzand_id() from public, anon;
grant execute on function app_farzand_id() to authenticated, service_role;

-- ── Ota-ona faqat O'Z farzandini o'qiydi (SELECT) ──
create policy students_parent_read on students for select to authenticated
  using (id = app_farzand_id());

create policy enrollments_parent_read on enrollments for select to authenticated
  using (student_id = app_farzand_id());

create policy groups_parent_read on groups for select to authenticated
  using (exists (
    select 1 from enrollments e
    where e.group_id = groups.id and e.student_id = app_farzand_id() and e.holat <> 'tugagan'
  ));

create policy lessons_parent_read on lessons for select to authenticated
  using (exists (
    select 1 from enrollments e
    where e.group_id = lessons.group_id and e.student_id = app_farzand_id() and e.holat <> 'tugagan'
  ));

create policy attendance_parent_read on attendance for select to authenticated
  using (student_id = app_farzand_id());

create policy woblr_parent_read on woblr for select to authenticated
  using (student_id = app_farzand_id());

create policy payments_parent_read on payments for select to authenticated
  using (student_id = app_farzand_id());
