-- ============================================================
--  World Bridge Academy
--  0024_kozgu_jadval.sql · baza → Sheets ko'zgusi (har 3 soatda)
--
--  Qaror (20.09): sayt asosiy manba, Sheets — faqat ko'rish va
--  to'liq ma'lumotni yuklab olish uchun ko'zgu. Yo'nalish bitta:
--  bazadan jadvalga (/api/cron/kozgu, src/lib/kozgu.ts).
--
--  Jadval pg_cron'da: har 3 soatda (07:00–22:00 Toshkent oralig'ida
--  ishlashi yetarli — 02,05,08,11,14,17 UTC).
--  pg_cron/pg_net yo'q bazada (lokal test) — jadval qo'yilmaydi.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    raise notice 'pg_cron/pg_net yo''q — ko''zgu jadvali qo''yilmadi (lokal test).';
    return;
  end if;

  create extension if not exists pg_net with schema extensions;
  create extension if not exists pg_cron;

  perform cron.unschedule(jobid) from cron.job where jobname = 'sheets-kozgu';

  perform cron.schedule(
    'sheets-kozgu',
    '0 2,5,8,11,14,17 * * *',
    $cmd$
      select net.http_post(
        url     := 'https://wba-phi.vercel.app/api/cron/kozgu',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body    := '{}'::jsonb
      )
    $cmd$
  );
end $$;
