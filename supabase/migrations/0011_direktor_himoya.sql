-- ============================================================
--  World Bridge Academy
--  0011_direktor_himoya.sql · direktor rolini faqat direktor beradi
--
--  TESHIK EDI:
--    profiles_admin_all siyosati adminga BARCHA profillarni, shu
--    jumladan O'ZINIKINI ham yangilashga ruxsat beradi. Ya'ni admin
--    API orqali  update profiles set rol = 'direktor' where id = <o'zi>
--    qilib, to'lovni o'zi tasdiqlay olardi — 0006 dagi "tasdiq faqat
--    direktorda" (imzo o'rnida) qoidasi bitta so'rov bilan buzilardi.
--
--  ENDI:
--    rol 'direktor' ga O'TKAZILSA ham, 'direktor' dan OLINSA ham —
--    buni faqat direktor qila oladi. Server (auth.uid() bo'sh:
--    hisob ochish skripti, ko'chirish) cheklanmaydi.
--    Qo'shimcha: hech kim o'z rolini o'zgartira olmaydi.
-- ============================================================

create or replace function profiles_rol_himoya() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or new.rol is not distinct from old.rol then
    return new;
  end if;

  if new.id = auth.uid() then
    raise exception 'O''z rolingizni o''zgartirib bo''lmaydi.';
  end if;

  if (new.rol = 'direktor' or old.rol = 'direktor') and not app_is_direktor() then
    raise exception 'Direktor rolini faqat direktor bera oladi yoki olib qo''ya oladi.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_rol on profiles;
create trigger profiles_rol before update on profiles
  for each row execute function profiles_rol_himoya();
