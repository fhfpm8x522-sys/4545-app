alter table public.players alter column club_id drop not null;
alter table public.players add column if not exists name_he text;
alter table public.players add column if not exists goal_player_id text;
alter table public.players add column if not exists goal_api_id text;
alter table public.players add column if not exists goal_team_id text;
alter table public.players add column if not exists goal_name text;
alter table public.players add column if not exists goal_updated_at timestamptz;
create index if not exists players_goal_api_id_idx on public.players(goal_api_id);
create index if not exists players_goal_team_id_idx on public.players(goal_team_id);

do $$ begin
  if not exists(select 1 from pg_constraint where conname='players_goal_player_id_key') then
    alter table public.players add constraint players_goal_player_id_key unique(goal_player_id);
  end if;
end $$;

alter table public.match_events add column if not exists player_ref_id uuid references public.players(id) on delete set null;
alter table public.match_events add column if not exists secondary_player_ref_id uuid references public.players(id) on delete set null;
create index if not exists match_events_player_ref_idx on public.match_events(player_ref_id);
create index if not exists match_events_secondary_player_ref_idx on public.match_events(secondary_player_ref_id);
