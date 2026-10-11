-- Recovered 0011_players_goal_identity.sql
alter table public.players add column if not exists name_he text, add column if not exists goal_player_id text, add column if not exists goal_api_id text, add column if not exists goal_team_id text, add column if not exists goal_name text, add column if not exists goal_updated_at timestamptz;
alter table public.players drop constraint if exists players_goal_player_id_key;
alter table public.players add constraint players_goal_player_id_key unique(goal_player_id);
create index if not exists players_goal_api_id_idx on public.players(goal_api_id);
create index if not exists players_goal_team_id_idx on public.players(goal_team_id);
alter table public.match_events add column if not exists player_ref_id uuid references public.players(id) on delete set null;
alter table public.match_events add column if not exists secondary_player_ref_id uuid references public.players(id) on delete set null;
create index if not exists match_events_player_ref_idx on public.match_events(player_ref_id);
create index if not exists match_events_secondary_player_ref_idx on public.match_events(secondary_player_ref_id);
