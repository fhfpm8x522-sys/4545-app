alter table public.players add column if not exists goal_image_url text;
alter table public.players add column if not exists shirt_number text;
alter table public.players add column if not exists goal_position text;
alter table public.players add column if not exists goal_country text;
alter table public.players add column if not exists goal_age int;
alter table public.players add column if not exists injured boolean not null default false;
alter table public.players add column if not exists is_captain boolean not null default false;
create index if not exists players_goal_position_idx on public.players(goal_position);
insert into storage.buckets(id,name,public) values('player-images','player-images',true)
on conflict(id) do update set public=true;
