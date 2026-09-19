-- ============================================================
--  World Bridge Academy
--  0022_kunlik_hisobot.sql · 19:40 kunlik hisobot — bazadan
--
--  Eski Apps Script boti har kuni 19:40 da "WBA Hisobot" guruhiga
--  Sheets'dan hisobot yuborardi. Endi Sheets yangilanmaydi — hisobot
--  bazadan tuziladi (/api/cron/kunlik, src/lib/kunlik-hisobot.ts).
--
--  Jadval Supabase pg_cron'da: har kuni 14:40 UTC = 19:40 Toshkent.
--  Vercel Hobby cron'i soat ichida istalgan daqiqada ishlaydi, aniq
--  vaqt kerak — shuning uchun bu yerda. pg_net saytni chaqiradi.
--
--  Kalit shart emas: sayt hisobotni kuniga bir marta va faqat
--  19:35–20:30 da yuboradi (route.ts). Shuning uchun bu faylda hech
--  qanday maxfiy qiymat yo'q (repo ochiq).
--
--  pg_cron / pg_net bo'lmagan bazada (lokal test Postgres) — jadval
--  qo'yilmaydi, xato ham bermaydi.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    raise notice 'pg_cron/pg_net yo''q — kunlik hisobot jadvali qo''yilmadi (lokal test).';
    return;
  end if;

  create extension if not exists pg_net with schema extensions;
  create extension if not exists pg_cron;

  -- Qayta yurgizilsa ikkilanmasin
  perform cron.unschedule(jobid) from cron.job where jobname = 'kunlik-hisobot';

  perform cron.schedule(
    'kunlik-hisobot',
    '40 14 * * *',
    $cmd$
      select net.http_post(
        url     := 'https://wba-phi.vercel.app/api/cron/kunlik',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body    := '{}'::jsonb
      )
    $cmd$
  );
end $$;
