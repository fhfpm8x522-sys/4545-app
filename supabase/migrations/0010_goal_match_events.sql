alter table public.match_events add column if not exists goal_event_id text;
alter table public.match_events add column if not exists team_side text;
alter table public.match_events add column if not exists player_id text;
alter table public.match_events add column if not exists secondary_player_name text;
alter table public.match_events add column if not exists secondary_player_id text;
alter table public.match_events add column if not exists score text;
alter table public.match_events add column if not exists period text;
alter table public.match_events add column if not exists raw_type text;
create index if not exists match_events_match_minute_idx on public.match_events(match_id,minute);
create index if not exists match_events_player_id_idx on public.match_events(player_id);

do $$ begin
  if not exists(select 1 from pg_constraint where conname='match_events_team_side_check') then
    alter table public.match_events add constraint match_events_team_side_check check(team_side is null or team_side in('home','away'));
  end if;
end $$;
