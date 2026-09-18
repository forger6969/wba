-- ============================================================
--  World Bridge Academy
--  0012_profil_email.sql · profilda email ham turadi
--
--  Email auth.users da yashaydi, unga esa faqat server kaliti
--  (service_role) qaraydi. Shuning uchun interfeys "kim qaysi email
--  bilan kiradi" degan oddiy savolga javob bera olmasdi: admin
--  o'quvchining parolini almashtirmoqchi bo'lsa, emailni qaytadan
--  yozishga to'g'ri kelardi.
--
--  Endi email profilga ko'chiriladi va RLS uni himoya qiladi:
--  profiles_select bo'yicha odam o'z profilini, admin — hammasini
--  ko'radi (0003_rls.sql).
-- ============================================================

alter table profiles add column if not exists email text;

-- Mavjud hisoblar uchun bir martalik to'ldirish
update profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id
   and p.email is distinct from u.email;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_rol user_role := 'oquvchi';
begin
  -- Rol faqat app_metadata dan — foydalanuvchi o'zi bera olmaydi (0008)
  begin
    v_rol := coalesce((new.raw_app_meta_data ->> 'rol')::user_role, 'oquvchi');
  exception when invalid_text_representation then
    v_rol := 'oquvchi';
  end;

  insert into profiles (id, ism, telefon, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'ism', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'telefon',
    new.email,
    v_rol
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on column profiles.email is
  'Kirish uchun email. auth.users dan ko''chiriladi — interfeys uni RLS bilan ko''rsata olsin.';
