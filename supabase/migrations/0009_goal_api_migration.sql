-- Recovered SQL from the live project; historical provider transition.
drop index if exists public.clubs_provider_team_id_unique;
drop index if exists public.matches_provider_id_unique;
drop index if exists public.matches_provider_home_team_idx;
drop index if exists public.matches_provider_away_team_idx;
drop index if exists public.matches_provider_league_idx;
alter table public.clubs drop column if exists provider_team_id;
alter table public.matches drop column if exists provider_home_team_id, drop column if exists provider_away_team_id, drop column if exists provider_league_id, drop column if exists provider_status, drop column if exists provider_updated_at, drop column if exists provider_id;
alter table public.clubs add column if not exists goal_team_id text, add column if not exists goal_api_id text;
create unique index if not exists clubs_goal_team_id_unique on public.clubs(goal_team_id) where goal_team_id is not null;
create unique index if not exists clubs_goal_api_id_unique on public.clubs(goal_api_id) where goal_api_id is not null;
alter table public.matches add column if not exists goal_fixture_id text, add column if not exists goal_fixture_api_id text, add column if not exists goal_home_team_id text, add column if not exists goal_away_team_id text, add column if not exists goal_league_id text, add column if not exists goal_league_year text, add column if not exists goal_stage text, add column if not exists goal_status text, add column if not exists goal_updated_at timestamptz;
create unique index if not exists matches_goal_fixture_id_unique on public.matches(goal_fixture_id) where goal_fixture_id is not null;
create unique index if not exists matches_goal_fixture_api_id_unique on public.matches(goal_fixture_api_id) where goal_fixture_api_id is not null;
create index if not exists matches_goal_home_team_idx on public.matches(goal_home_team_id);
create index if not exists matches_goal_away_team_idx on public.matches(goal_away_team_id);
create index if not exists matches_goal_league_idx on public.matches(goal_league_id);
alter table public.matches add column if not exists home_logo_url text, add column if not exists away_logo_url text, add column if not exists competition_logo_url text;
update public.clubs set goal_team_id='cmri8ziiqegzklb07hl0v66rk',goal_api_id='144',crest_url='https://media.goal-api.com/badges/144_hapoel-beer-sheva.jpg' where slug='hapoel-beer-sheva';
