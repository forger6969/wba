-- ============================================================
--  World Bridge Academy (forger fork)
--  0026_probniy_eslatma_jadval.sql · ertangi probniy eslatmasi (kunlik)
--
--  Har kuni 15:00 Toshkent (10:00 UTC) — ertaga sinov darsiga
--  yozilganlarga eslatma (/api/cron/probniy, 0025 bilan birga).
--  Manzil (host) — wbalc.uz, forger forkining domeni.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net') then
    raise notice 'pg_cron/pg_net yo''q — probniy eslatma jadvali qo''yilmadi (lokal test).';
    return;
  end if;

  create extension if not exists pg_net with schema extensions;
  create extension if not exists pg_cron;

  perform cron.unschedule(jobid) from cron.job where jobname = 'probniy-eslatma';

  perform cron.schedule(
    'probniy-eslatma',
    '0 10 * * *',
    $cmd$
      select net.http_post(
        url     := 'https://wbalc.uz/api/cron/probniy',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body    := '{}'::jsonb
      )
    $cmd$
  );
end $$;
