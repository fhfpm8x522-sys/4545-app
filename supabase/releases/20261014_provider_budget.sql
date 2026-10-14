begin;
create table public.football_provider_limits(provider text primary key,rolling_cap int not null check(rolling_cap between 1 and 1000),paused_until timestamptz,reason text,updated_at timestamptz not null default now());
insert into public.football_provider_limits(provider,rolling_cap,paused_until,reason) values('goal',750,now()+interval '24 hours','User reported daily 1000-request quota exhausted');
create table public.football_provider_requests(id bigint generated always as identity primary key,provider text not null references public.football_provider_limits,sent_at timestamptz not null default now());
create index on public.football_provider_requests(provider,sent_at);
alter table public.football_provider_limits enable row level security;
alter table public.football_provider_requests enable row level security;
revoke all on public.football_provider_limits,public.football_provider_requests from anon,authenticated;
create function public.claim_goal_request() returns boolean language plpgsql security definer set search_path=public,pg_temp as $$declare config football_provider_limits;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 perform pg_advisory_xact_lock(hashtextextended('4545-goal-budget',0));
 select * into config from football_provider_limits where provider='goal';
 if not found or config.paused_until>now() then return false;end if;
 if (select count(*) from football_provider_requests where provider='goal' and sent_at>now()-interval '24 hours')>=config.rolling_cap then return false;end if;
 if (select count(*) from football_provider_requests where provider='goal' and sent_at>now()-interval '1 minute')>=15 then return false;end if;
 insert into football_provider_requests(provider) values('goal');return true;
end$$;
create function public.pause_goal_requests(p_seconds int default 86400) returns void language plpgsql security definer set search_path=public,pg_temp as $$begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 update football_provider_limits set paused_until=greatest(coalesce(paused_until,now()),now()+make_interval(secs=>greatest(60,least(p_seconds,86400)))),reason='Provider rate/quota response',updated_at=now() where provider='goal';
end$$;
revoke all on function public.claim_goal_request(),public.pause_goal_requests(int) from public,anon,authenticated;
grant execute on function public.claim_goal_request(),public.pause_goal_requests(int) to service_role;
-- Temporarily stop only the polling jobs while every caller gets the shared limiter.
do $$declare j record;begin for j in select jobid from cron.job where active and command ~ 'functions/v1/(push-dispatch|match-guesses|quick-service|sync-football)' loop perform cron.alter_job(j.jobid,active:=false);end loop;end$$;
commit;
select jobid,jobname,active from cron.job where command ~ 'functions/v1/(push-dispatch|match-guesses|quick-service|sync-football)';
