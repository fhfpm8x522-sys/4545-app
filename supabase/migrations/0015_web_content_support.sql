-- Tables that enrich the Lovable UI without replacing existing 45:45 core tables.
create table if not exists public.club_standings(
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null unique references public.clubs(id) on delete cascade,
  season text,
  position int,
  points int,
  played int not null default 0,
  wins int not null default 0,
  draws int not null default 0,
  losses int not null default 0,
  goals_for int not null default 0,
  goals_against int not null default 0,
  goal_difference int generated always as (goals_for-goals_against) stored,
  clean_sheets int not null default 0,
  form text,
  updated_at timestamptz not null default now()
);
alter table public.club_standings enable row level security;
drop policy if exists "club standings public read" on public.club_standings;
create policy "club standings public read" on public.club_standings for select using(true);
drop policy if exists "club standings admin write" on public.club_standings;
create policy "club standings admin write" on public.club_standings for all to authenticated
using(public.has_permission('clubs.manage') and public.has_club_scope(club_id))
with check(public.has_permission('clubs.manage') and public.has_club_scope(club_id));

create table if not exists public.club_trophies(
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  count int not null default 1,
  years jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.club_trophies enable row level security;
drop policy if exists "club trophies public read" on public.club_trophies;
create policy "club trophies public read" on public.club_trophies for select using(true);
drop policy if exists "club trophies admin write" on public.club_trophies;
create policy "club trophies admin write" on public.club_trophies for all to authenticated
using(public.has_permission('clubs.manage') and public.has_club_scope(club_id))
with check(public.has_permission('clubs.manage') and public.has_club_scope(club_id));

alter table public.news_items add column if not exists body text;
alter table public.news_items add column if not exists original_title text;
alter table public.news_items add column if not exists sources jsonb not null default '[]'::jsonb;
alter table public.chants add column if not exists title text;
