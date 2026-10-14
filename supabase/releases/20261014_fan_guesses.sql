begin;
create table public.fan_guesses (
 match_id uuid not null references public.matches(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('lineup','first_team','first_scorer','halftime','goals','yellows','winner','exact_score')),
 choice jsonb not null, points int check(points between 0 and 25),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),settled_at timestamptz,
 primary key(match_id,user_id,kind)
);
create index fan_guesses_user on public.fan_guesses(user_id);
alter table public.fan_guesses enable row level security;
create policy "fan guesses own read" on public.fan_guesses for select to authenticated using(user_id=auth.uid());
revoke all on public.fan_guesses from anon,authenticated;
grant select on public.fan_guesses to authenticated;
grant all on public.fan_guesses to service_role;
create table public.fan_guess_facts(match_id uuid primary key references public.matches(id) on delete cascade,facts jsonb not null default '{}'::jsonb,checked_at timestamptz not null default now());
alter table public.fan_guess_facts enable row level security;
create policy "fan facts authenticated read" on public.fan_guess_facts for select to authenticated using(true);
revoke all on public.fan_guess_facts from anon,authenticated;
grant select on public.fan_guess_facts to authenticated;
grant all on public.fan_guess_facts to service_role;
create or replace function public.save_fan_guess(p_match_id uuid,p_kind text,p_choice jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.matches; uid uuid:=auth.uid(); payload jsonb; club uuid; count_valid int; official jsonb;
begin
 if uid is null or not exists(select 1 from profiles where id=uid) then raise exception 'Authentication required';end if;
 select * into m from matches where id=p_match_id for update;
 if not found or m.status<>'scheduled' or m.kickoff<=now() then raise exception 'Predictions closed';end if;
 if p_kind='lineup' then
  if now()>=m.kickoff-interval '1 hour' then raise exception 'Lineup predictions closed';end if;
  if p_choice->>'side' not in ('home','away') or p_choice->>'side' is null or jsonb_typeof(p_choice->'players') is distinct from 'array' then raise exception 'Invalid lineup';end if;
  if jsonb_array_length(p_choice->'players')<>11 then raise exception 'Choose eleven unique players';end if;
  club:=case when p_choice->>'side'='home' then m.home_club_id else m.away_club_id end;
  select count(distinct id) into count_valid from players where club_id=club and active and id::text in(select jsonb_array_elements_text(p_choice->'players'));
  if count_valid<>11 then raise exception 'Invalid roster players';end if;
  select c.payload into official from football_cache c where cache_key='/fixtures/'||coalesce(m.goal_fixture_id,m.goal_fixture_api_id)||'/lineups';
  if jsonb_array_length(coalesce(official->(p_choice->>'side')->'startingLineups','[]'::jsonb))>0 or exists(select 1 from fan_guess_facts where match_id=m.id and facts ? ('lineup_'||(p_choice->>'side'))) then raise exception 'Official lineup already published';end if;
  payload:=jsonb_build_object('side',p_choice->>'side','players',p_choice->'players');
 elsif p_kind='first_scorer' then
  if p_choice->>'value' is distinct from 'none' and not exists(select 1 from players where id::text=p_choice->>'value' and active and club_id in(m.home_club_id,m.away_club_id)) then raise exception 'Invalid scorer';end if;
  payload:=jsonb_build_object('value',p_choice->>'value');
 elsif p_kind='exact_score' then
  if coalesce(p_choice->>'home','') !~ '^[0-9]{1,2}$' or coalesce(p_choice->>'away','') !~ '^[0-9]{1,2}$' then raise exception 'Invalid score';end if;
  payload:=jsonb_build_object('home',(p_choice->>'home')::int,'away',(p_choice->>'away')::int);
 elsif p_kind in ('first_team','halftime','winner','goals','yellows') then
  if p_choice->>'value' is null or (p_kind in ('goals','yellows') and p_choice->>'value' not in ('over','under')) or (p_kind='first_team' and p_choice->>'value' not in ('home','away','none')) or (p_kind in ('halftime','winner') and p_choice->>'value' not in ('home','away','draw')) then raise exception 'Invalid choice';end if;
  payload:=jsonb_build_object('value',p_choice->>'value');
 else raise exception 'Unknown prediction';end if;
 insert into fan_guesses(match_id,user_id,kind,choice) values(m.id,uid,p_kind,payload) on conflict(match_id,user_id,kind) do update set choice=excluded.choice,updated_at=now(),points=null,settled_at=null;
 if p_kind='exact_score' then insert into predictions(match_id,user_id,home_score,away_score) values(m.id,uid,(payload->>'home')::int,(payload->>'away')::int) on conflict(match_id,user_id) do update set home_score=excluded.home_score,away_score=excluded.away_score;end if;
end$$;
revoke all on function public.save_fan_guess(uuid,text,jsonb) from public,anon;
grant execute on function public.save_fan_guess(uuid,text,jsonb) to authenticated;

create or replace function public.settle_fan_guess_facts(p_match_id uuid,p_facts jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare g public.fan_guesses; value_points int; actual jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 perform 1 from matches where id=p_match_id for update;
 insert into fan_guess_facts(match_id,facts) values(p_match_id,p_facts) on conflict(match_id) do update set facts=fan_guess_facts.facts||excluded.facts,checked_at=now();
 select facts into p_facts from fan_guess_facts where match_id=p_match_id;
 for g in select * from fan_guesses where match_id=p_match_id loop
  value_points:=null;
  if p_facts->>'void'='true' then value_points:=0;
  elsif g.kind='lineup' then
   actual:=p_facts->('lineup_'||(g.choice->>'side'));
   if jsonb_typeof(actual)='array' then select count(*)*2 into value_points from jsonb_array_elements_text(g.choice->'players') p(value) where actual ? p.value;end if;
  elsif p_facts ? g.kind then
   if g.kind='exact_score' then value_points:=case when g.choice=p_facts->g.kind then 25 else 0 end;
   else value_points:=case when g.choice->>'value'=p_facts->>g.kind then case g.kind when 'first_team' then 15 when 'first_scorer' then 20 when 'halftime' then 15 else 10 end else 0 end;end if;
  end if;
  update fan_guesses set points=value_points,settled_at=case when value_points is not null then now() end where match_id=g.match_id and user_id=g.user_id and kind=g.kind;
 end loop;
end$$;
revoke all on function public.settle_fan_guess_facts(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.settle_fan_guess_facts(uuid,jsonb) to service_role;
create or replace function public.fan_guess_leaderboard(p_club_id uuid default null,p_season text default null) returns table(user_id uuid,username text,display_name text,avatar_url text,total_points bigint,correct_guesses bigint,graded_guesses bigint,rank bigint)
language sql stable security definer set search_path=public,pg_temp as $$
 with scores as(select g.user_id,sum(g.points)::bigint total_points,count(*) filter(where g.points>0) correct_guesses,count(*) graded_guesses from fan_guesses g join matches m on m.id=g.match_id join profiles p on p.id=g.user_id where g.points is not null and (p_club_id is null or p.favorite_club_id=p_club_id) and (p_season is null or m.goal_league_year=p_season) group by g.user_id), ranked as(select *,dense_rank() over(order by total_points desc,correct_guesses desc) rank from scores)
 select r.user_id,p.username,p.display_name,p.avatar_url,r.total_points,r.correct_guesses,r.graded_guesses,r.rank from ranked r join profiles p on p.id=r.user_id order by r.rank,p.username limit 100;
$$;
revoke all on function public.fan_guess_leaderboard(uuid,text) from public,anon;
grant execute on function public.fan_guess_leaderboard(uuid,text) to authenticated;
create or replace function public.fan_guess_refresh_candidates() returns setof public.matches language sql security definer set search_path=public,pg_temp as $$
 select m.* from matches m left join fan_guess_facts f on f.match_id=m.id
 where exists(select 1 from fan_guesses g where g.match_id=m.id)
 and m.kickoff<now()+interval '2 hours' and m.kickoff>now()-interval '3 days'
 and (f.checked_at is null or f.checked_at<now()-interval '1 minute')
 order by f.checked_at nulls first,m.kickoff limit 6;
$$;
revoke all on function public.fan_guess_refresh_candidates() from public,anon,authenticated;
grant execute on function public.fan_guess_refresh_candidates() to service_role;
do $$begin
 if exists(select 1 from vault.secrets where name='4545_push_service_role') and not exists(select 1 from cron.job where jobname='4545-fan-guesses') then
  perform cron.schedule('4545-fan-guesses','* * * * *',$job$select net.http_post(url:='https://ohcopmgolzyfxwfqmpmx.supabase.co/functions/v1/match-guesses',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='4545_push_service_role')),body:='{"mode":"settle"}'::jsonb,timeout_milliseconds:=55000);$job$);
 end if;
end$$;
commit;
