-- Reviewed release supplement: additive schema only. Requires explicit production approval.
-- No legacy migrations, user-data reset, or existing function/trigger replacement.
begin;
-- Web UI/product fields used by the Lovable design port.
alter table public.clubs add column if not exists city text;
alter table public.clubs add column if not exists country text default 'ישראל';
alter table public.clubs add column if not exists league text;
alter table public.clubs add column if not exists founded_year int;
alter table public.clubs add column if not exists stadium text;
alter table public.clubs add column if not exists stadium_capacity int;
alter table public.clubs add column if not exists hero_image_url text;
alter table public.clubs add column if not exists accent_foreground text;
alter table public.clubs add column if not exists accent_secondary text;
alter table public.clubs add column if not exists description text;
alter table public.clubs add column if not exists sort_order int not null default 0;

alter table public.profiles add column if not exists content_prefs jsonb not null default '["matches","news"]'::jsonb;
alter table public.profiles add column if not exists notification_prefs jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
create table if not exists public.club_change_history(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  from_club_id uuid references public.clubs(id) on delete set null,
  to_club_id uuid references public.clubs(id) on delete set null,
  is_initial boolean not null default false,
  overridden_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);
alter table public.club_change_history enable row level security;
do $policy$ begin
if not exists(select 1 from pg_policies where schemaname='public' and tablename='club_change_history' and policyname='club change history own read') then
create policy "club change history own read" on public.club_change_history for select to authenticated
using(user_id=auth.uid() or public.has_permission('users.view'));
end if; end $policy$;

do $policy$ begin
if not exists(select 1 from pg_policies where schemaname='public' and tablename='club_change_history' and policyname='club change history own insert') then
create policy "club change history own insert" on public.club_change_history for insert to authenticated
with check(user_id=auth.uid() and is_initial=true and overridden_by is null);
end if; end $policy$;


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
do $policy$ begin
if not exists(select 1 from pg_policies where schemaname='public' and tablename='club_standings' and policyname='club standings public read') then
create policy "club standings public read" on public.club_standings for select using(true);
end if; end $policy$;

do $policy$ begin
if not exists(select 1 from pg_policies where schemaname='public' and tablename='club_standings' and policyname='club standings admin write') then
create policy "club standings admin write" on public.club_standings for all to authenticated
using(public.has_permission('clubs.manage') and public.has_club_scope(club_id))
with check(public.has_permission('clubs.manage') and public.has_club_scope(club_id));
end if; end $policy$;


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
do $policy$ begin
if not exists(select 1 from pg_policies where schemaname='public' and tablename='club_trophies' and policyname='club trophies public read') then
create policy "club trophies public read" on public.club_trophies for select using(true);
end if; end $policy$;

do $policy$ begin
if not exists(select 1 from pg_policies where schemaname='public' and tablename='club_trophies' and policyname='club trophies admin write') then
create policy "club trophies admin write" on public.club_trophies for all to authenticated
using(public.has_permission('clubs.manage') and public.has_club_scope(club_id))
with check(public.has_permission('clubs.manage') and public.has_club_scope(club_id));
end if; end $policy$;


alter table public.news_items add column if not exists body text;
alter table public.news_items add column if not exists original_title text;
alter table public.news_items add column if not exists sources jsonb not null default '[]'::jsonb;
alter table public.chants add column if not exists title text;

grant select on public.club_standings,public.club_trophies to anon,authenticated;
grant insert,update,delete on public.club_standings,public.club_trophies to authenticated;
grant select,insert on public.club_change_history to authenticated;
commit;
