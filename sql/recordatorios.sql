-- Remate · v3.9 · recordatorios automáticos al celular (lo corres tú, una sola vez).
-- Antes: 1) instala la función «recordatorios» (Edge Functions → Deploy a new function → Via Editor, nombre recordatorios,
--           pega supabase/functions/recordatorios/index.ts, Deploy) y en sus ajustes APAGA «Verify JWT».
--        2) Database → Extensions: activa pg_cron y pg_net (o deja que lo hagan las dos líneas de abajo).
-- Esto programa la función cada 15 minutos. Para apagarla: select cron.unschedule('remate-recordatorios');
-- La clave de abajo es la misma clave pública que ya está en config.js (no es secreta).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'remate-recordatorios';
select cron.schedule('remate-recordatorios', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://dvehbawawaibanvedkcm.supabase.co/functions/v1/recordatorios',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'sb_publishable_un8vlLwhL-IFeVkyRscseA_-pETY2Jy'),
    body := jsonb_build_object('source', 'cron'),
    timeout_milliseconds := 20000
  );
$$);

-- Para revisar que corre: select * from cron.job_run_details order by start_time desc limit 5;
