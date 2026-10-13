-- GOAL API provider identity and fixture fields.
alter table public.clubs add column if not exists goal_team_id text;
alter table public.clubs add column if not exists goal_api_id text;
create index if not exists clubs_goal_team_id_idx on public.clubs(goal_team_id);
create index if not exists clubs_goal_api_id_idx on public.clubs(goal_api_id);

alter table public.matches add column if not exists home_logo_url text;
alter table public.matches add column if not exists away_logo_url text;
alter table public.matches add column if not exists competition_logo_url text;
alter table public.matches add column if not exists goal_fixture_id text;
alter table public.matches add column if not exists goal_fixture_api_id text;
alter table public.matches add column if not exists goal_home_team_id text;
alter table public.matches add column if not exists goal_away_team_id text;
alter table public.matches add column if not exists goal_league_id text;
alter table public.matches add column if not exists goal_league_year text;
alter table public.matches add column if not exists goal_stage text;
alter table public.matches add column if not exists goal_status text;
alter table public.matches add column if not exists goal_updated_at timestamptz;
alter table public.matches add column if not exists minute int;
alter table public.matches add column if not exists stats jsonb not null default '{}'::jsonb;

create index if not exists matches_goal_home_team_idx on public.matches(goal_home_team_id);
create index if not exists matches_goal_away_team_idx on public.matches(goal_away_team_id);
create index if not exists matches_goal_league_idx on public.matches(goal_league_id,goal_league_year);

do $$ begin
  if not exists(select 1 from pg_constraint where conname='matches_goal_fixture_id_key') then
    alter table public.matches add constraint matches_goal_fixture_id_key unique(goal_fixture_id);
  end if;
exception when duplicate_table then null;
end $$;

insert into storage.buckets(id,name,public) values('team-logos','team-logos',true)
on conflict(id) do update set public=true;
