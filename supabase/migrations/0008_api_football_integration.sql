-- Recovered from the project SQL editor; superseded by 0009.
alter table public.clubs add column if not exists provider_team_id bigint;
create unique index if not exists clubs_provider_team_id_unique on public.clubs(provider_team_id) where provider_team_id is not null;
alter table public.matches add column if not exists home_logo_url text, add column if not exists away_logo_url text, add column if not exists provider_home_team_id bigint, add column if not exists provider_away_team_id bigint, add column if not exists competition_logo_url text, add column if not exists provider_league_id bigint, add column if not exists provider_status text, add column if not exists provider_updated_at timestamptz;
create unique index if not exists matches_provider_id_unique on public.matches(provider_id) where provider_id is not null;
create index if not exists matches_provider_home_team_idx on public.matches(provider_home_team_id);
create index if not exists matches_provider_away_team_idx on public.matches(provider_away_team_id);
create index if not exists matches_kickoff_idx on public.matches(kickoff);
create index if not exists matches_provider_league_idx on public.matches(provider_league_id);
