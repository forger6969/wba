-- ============================================================
--  World Bridge Academy
--  0023_telegram_token.sql · "Telegramga ulash" havolasi eskirmasin
--
--  XATO EDI (20.09, jonli sinovda topildi):
--    telegram_token_ol() har chaqirilganda shu odamning OLDINGI
--    tokenlarini o'chirardi. Tugma bir necha marta bosilsa, Telegram
--    (ayniqsa ochiq turgan Telegram Web) birinchi havoladagi tokenni
--    yuboraverardi — u esa allaqachon o'chirilgan: har safar "Havola
--    eskirgan". Bazada esa oxirgi token ishlatilmay qolardi.
--
--  ENDI:
--    Faqat muddati o'tgan yoki ishlatilgan tokenlar tozalanadi. Bir
--    odamning bir necha amal qiluvchi tokeni bo'lishi mumkin — har biri
--    baribir bir martalik va 15 daqiqalik (128 bit tasodif).
-- ============================================================

create or replace function telegram_token_ol() returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_token text := replace(gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null then
    raise exception 'Avval tizimga kiring.';
  end if;
  delete from telegram_token where amal_qiladi < now() or ishlatildi is not null;
  insert into telegram_token (token, profile_id) values (v_token, auth.uid());
  return v_token;
end;
$$;
