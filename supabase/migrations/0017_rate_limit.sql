-- ============================================================
--  World Bridge Academy
--  0017_rate_limit.sql · ommaviy formaga so'rov cheklovi
--
--  MUAMMO:
--    /ariza formasi service_role bilan `leads` ga yozadi (anon
--    foydalanuvchi, RLS'siz). Yagona himoya — asal tuzoq (honeypot),
--    uni oddiy skript bir so'rovda aylanib o'tadi. Ya'ni bir daqiqada
--    minglab soxta ariza yozib, jadvalni to'ldirib tashlash mumkin.
--
--  YECHIM:
--    Serverless'da jarayon xotirasi ishlamaydi (har chaqiruv boshqa
--    instansiya). Shuning uchun hisoblagich BAZADA turadi. Qat'iy
--    oyna (fixed window): har (bucket, kalit) uchun oynadagi so'rov
--    soni sanaladi; chegaradan oshsa — rad.
--
--    Kalit sifatida IP'ning xeshi ishlatiladi (xom IP saqlanmaydi).
--    Funksiyani faqat server (service_role) chaqiradi.
-- ============================================================

create table if not exists app_rate_limits (
  bucket text        not null,
  kalit  text        not null,
  oyna   timestamptz not null,
  soni   int         not null default 0,
  primary key (bucket, kalit)
);

alter table app_rate_limits enable row level security;
-- Hech kimga to'g'ridan-to'g'ri ochilmaydi: faqat definer funksiya orqali.
revoke all on app_rate_limits from anon, authenticated;

-- ------------------------------------------------------------
-- rate_limit_hit — bitta urinishni sanaydi.
--   true  → ruxsat (chegara ichida)
--   false → rad (chegaradan oshdi)
-- ------------------------------------------------------------
create or replace function rate_limit_hit(
  p_bucket   text,
  p_kalit    text,
  p_limit    int,
  p_oyna_sek int
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_oyna timestamptz;
  v_soni int;
begin
  -- Joriy oynaning boshi: now() ni p_oyna_sek chegarasiga tushiramiz
  v_oyna := to_timestamp(floor(extract(epoch from now()) / p_oyna_sek) * p_oyna_sek);

  insert into app_rate_limits (bucket, kalit, oyna, soni)
  values (p_bucket, p_kalit, v_oyna, 1)
  on conflict (bucket, kalit) do update
    set soni = case when app_rate_limits.oyna = v_oyna
                    then app_rate_limits.soni + 1
                    else 1 end,
        oyna = v_oyna
  returning soni into v_soni;

  return v_soni <= p_limit;
end;
$$;

-- Faqat server (service_role). anon/public/authenticated chaqira olmaydi.
revoke execute on function rate_limit_hit(text, text, int, int) from public, anon, authenticated;
grant  execute on function rate_limit_hit(text, text, int, int) to service_role;
