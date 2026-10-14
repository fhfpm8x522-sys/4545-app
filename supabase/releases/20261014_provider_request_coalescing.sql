begin;
create table public.football_provider_leases(cache_key text primary key,expires_at timestamptz not null);
alter table public.football_provider_leases enable row level security;
revoke all on public.football_provider_leases from anon,authenticated;
create function public.claim_goal_path(p_path text) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 if p_path is null or length(p_path)>500 or p_path !~ '^/' then raise exception 'Invalid path';end if;
 perform pg_advisory_xact_lock(hashtextextended('4545-goal-path:'||p_path,0));
 if exists(select 1 from football_provider_leases where cache_key=p_path and expires_at>now()) then return false;end if;
 if not claim_goal_request() then return false;end if;
 insert into football_provider_leases(cache_key,expires_at) values(p_path,now()+interval '30 seconds') on conflict(cache_key) do update set expires_at=excluded.expires_at;
 return true;
end$$;
revoke all on function public.claim_goal_path(text) from public,anon,authenticated;
grant execute on function public.claim_goal_path(text) to service_role;
create or replace function public.fan_guess_refresh_candidates() returns setof public.matches language sql security definer set search_path=public,pg_temp as $$
 select m.* from matches m left join fan_guess_facts f on f.match_id=m.id
 where exists(select 1 from fan_guesses g where g.match_id=m.id)
 and m.kickoff<now()+interval '2 hours' and m.kickoff>now()-interval '3 days'
 and (f.checked_at is null or f.checked_at<now()-case when m.status='finished' then interval '6 hours' else interval '1 minute' end)
 order by f.checked_at nulls first,m.kickoff limit 6;
$$;
commit;
