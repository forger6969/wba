-- ============================================================
--  World Bridge Academy
--  0008_rol_xavfsizligi.sql · rolni o'zi yozib ololmasin
--
--  TESHIK EDI (0002_functions.sql:70):
--    rol raw_user_meta_data dan olinardi. Bu maydonni ro'yxatdan
--    o'tayotgan odamning O'ZI to'ldiradi:
--
--      supabase.auth.signUp({ email, password,
--                             options: { data: { rol: 'admin' } } })
--
--    anon kaliti esa brauzerda ochiq turadi. Ya'ni har kim o'zini
--    admin qilib ro'yxatdan o'tkazib, hamma to'lov va qarzni ko'ra
--    olardi — "huquq bazada" degan qoida bitta so'rov bilan buzilardi.
--
--  ENDI:
--    rol faqat raw_app_meta_data dan olinadi — uni faqat service_role
--    (server, admin skripti) yoza oladi. Foydalanuvchi o'zi hech narsa
--    qo'ysa ham, yangi hisob 'oquvchi' bo'lib ochiladi.
--    Ism va telefon user_meta_data dan olinaveradi — ular huquq bermaydi.
-- ============================================================

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_rol user_role := 'oquvchi';
begin
  begin
    v_rol := coalesce((new.raw_app_meta_data ->> 'rol')::user_role, 'oquvchi');
  exception when invalid_text_representation then
    v_rol := 'oquvchi';
  end;

  insert into profiles (id, ism, telefon, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'ism', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'telefon',
    v_rol
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function handle_new_user is
  'Rol FAQAT app_metadata dan (service_role yozadi). user_metadata dagi rol e''tiborsiz qoldiriladi.';
