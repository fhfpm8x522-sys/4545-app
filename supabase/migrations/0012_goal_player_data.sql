-- Recovered 0012_goal_player_data.sql
alter table public.players add column if not exists goal_image_url text, add column if not exists shirt_number text, add column if not exists goal_position text, add column if not exists goal_country text, add column if not exists goal_age integer, add column if not exists injured boolean default false, add column if not exists is_captain boolean default false;
create index if not exists players_goal_name_idx on public.players(goal_name);
create index if not exists players_active_club_idx on public.players(club_id,active);
