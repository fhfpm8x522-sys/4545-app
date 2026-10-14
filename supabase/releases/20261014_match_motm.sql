begin;
create table public.fan_motm_votes(match_id uuid not null references matches(id) on delete cascade,user_id uuid not null references profiles(id) on delete cascade,player_id uuid not null references players(id),updated_at timestamptz not null default now(),primary key(match_id,user_id));
alter table public.fan_motm_votes enable row level security;
create policy "own MOTM vote" on public.fan_motm_votes for select to authenticated using(user_id=auth.uid());
revoke all on public.fan_motm_votes from anon,authenticated;
grant select on public.fan_motm_votes to authenticated;
grant all on public.fan_motm_votes to service_role;
create function public.match_motm_candidates(p_match_id uuid) returns table(id uuid,name text,image_url text,votes bigint) language plpgsql security definer set search_path=public,pg_temp as $$begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 return query select p.id,coalesce(p.name_he,p.name)::text,p.image_url::text,(select count(*) from fan_motm_votes v where v.match_id=p_match_id and v.player_id=p.id) from players p where p.id::text in(select jsonb_array_elements_text(case when jsonb_typeof(f.facts->'lineup_home')='array' then f.facts->'lineup_home' else '[]'::jsonb end) from fan_guess_facts f where f.match_id=p_match_id union select jsonb_array_elements_text(case when jsonb_typeof(f.facts->'lineup_away')='array' then f.facts->'lineup_away' else '[]'::jsonb end) from fan_guess_facts f where f.match_id=p_match_id) or p.id in(select e.player_ref_id from match_events e where e.match_id=p_match_id and e.event_type in('goal','substitution') and e.player_ref_id is not null union select e.secondary_player_ref_id from match_events e where e.match_id=p_match_id and e.event_type in('goal','substitution') and e.secondary_player_ref_id is not null) or exists(select 1 from matches m join football_cache c on c.cache_key='/fixtures/'||coalesce(m.goal_fixture_id,m.goal_fixture_api_id)||'/lineups' cross join lateral jsonb_path_query(c.payload,'$.**.startingLineups[*]') as l(player) where m.id=p_match_id and (p.goal_player_id in(l.player->>'playerKey',l.player->>'playerId') or p.goal_api_id in(l.player->>'playerKey',l.player->>'playerId'))) order by 4 desc,2;
end$$;
create function public.vote_match_motm(p_match_id uuid,p_player_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$declare m matches;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into m from matches where matches.id=p_match_id;
 if m.id is null or m.status not in('live','finished') or m.kickoff>now() or m.kickoff+interval '48 hours'<=now() then raise exception 'Voting is closed';end if;
 if not exists(select 1 from public.match_motm_candidates(p_match_id) c where c.id=p_player_id) then raise exception 'Player participation not verified';end if;
 insert into fan_motm_votes(match_id,user_id,player_id) values(p_match_id,auth.uid(),p_player_id) on conflict(match_id,user_id) do update set player_id=excluded.player_id,updated_at=now();
end$$;
revoke all on function public.match_motm_candidates(uuid),public.vote_match_motm(uuid,uuid) from public,anon;
grant execute on function public.match_motm_candidates(uuid),public.vote_match_motm(uuid,uuid) to authenticated;
commit;
