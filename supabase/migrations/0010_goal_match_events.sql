-- Recovered unnumbered event SQL; recorded here after the GOAL transition.
alter table public.match_events add column if not exists goal_event_id text, add column if not exists team_side text, add column if not exists player_id text, add column if not exists secondary_player_name text, add column if not exists secondary_player_id text, add column if not exists score text, add column if not exists period text, add column if not exists raw_type text;
alter table public.match_events drop constraint if exists match_events_team_side_check;
alter table public.match_events add constraint match_events_team_side_check check(team_side is null or team_side in ('home','away'));
create unique index if not exists match_events_goal_event_id_unique on public.match_events(goal_event_id) where goal_event_id is not null;
create index if not exists match_events_match_minute_idx on public.match_events(match_id,minute);
