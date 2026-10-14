-- Re-enable background delivery after every production GOAL caller has a shared guard.
-- This does not remove the provider pause or change saved user preferences.
begin;
do $$declare j record;begin
for j in select jobid from cron.job where jobname in ('4545-push-dispatch','4545-fan-guesses') loop
 perform cron.alter_job(j.jobid,active=>true);
end loop;end$$;
commit;
select jsonb_build_object('provider',football_provider_status(),'jobs',(select jsonb_agg(jsonb_build_object('name',jobname,'active',active,'schedule',schedule)) from cron.job where jobname like '4545-%'),'hebrew',(select jsonb_build_object('verified',count(*) filter(where name_he_verified),'automatic',count(*) filter(where name_he_source='automatic-transliteration-v1'),'missing',count(*) filter(where coalesce(name_he,'') !~ '[א-ת]')) from players where active));
