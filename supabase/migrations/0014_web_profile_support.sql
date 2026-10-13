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
update public.profiles set onboarding_completed=true
where username is not null and display_name is not null and favorite_club_id is not null;

create table if not exists public.username_history(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  old_username text,
  new_username text not null,
  changed_at timestamptz not null default now()
);
alter table public.username_history enable row level security;
drop policy if exists "username history own read" on public.username_history;
create policy "username history own read" on public.username_history for select to authenticated
using(user_id=auth.uid() or public.has_permission('users.view'));

create or replace function public.log_username_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.username is distinct from new.username and old.username is not null then
    insert into public.username_history(user_id,old_username,new_username)
    values(new.id,old.username,new.username);
  end if;
  return new;
end $$;
drop trigger if exists trg_username_history on public.profiles;
create trigger trg_username_history before update of username on public.profiles
for each row execute function public.log_username_change();

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
drop policy if exists "club change history own read" on public.club_change_history;
create policy "club change history own read" on public.club_change_history for select to authenticated
using(user_id=auth.uid() or public.has_permission('users.view'));
drop policy if exists "club change history own insert" on public.club_change_history;
create policy "club change history own insert" on public.club_change_history for insert to authenticated
with check(user_id=auth.uid() and is_initial=true and overridden_by is null);

-- Stop direct favorite-club cooldown bypass after an initial selection.
create or replace function public.guard_favorite_club_update()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.favorite_club_id is not null
     and old.favorite_club_id is distinct from new.favorite_club_id
     and coalesce(current_setting('app.allow_club_change',true),'0') <> '1' then
    raise exception 'FAVORITE_CLUB_CHANGE_REQUIRES_RPC';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_favorite_club_update on public.profiles;
create trigger trg_guard_favorite_club_update before update of favorite_club_id on public.profiles
for each row execute function public.guard_favorite_club_update();

create or replace function public.change_favorite_club(new_club_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare p public.profiles%rowtype;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if not exists(select 1 from public.clubs where id=new_club_id and active=true) then raise exception 'INVALID_CLUB'; end if;
  if p.favorite_club_id = new_club_id then return; end if;
  if p.last_club_change_at is not null and p.last_club_change_at > now()-interval '30 days' then
    raise exception 'CLUB_CHANGE_COOLDOWN' using detail=(p.last_club_change_at+interval '30 days')::text;
  end if;
  perform set_config('app.allow_club_change','1',true);
  update public.profiles set favorite_club_id=new_club_id,last_club_change_at=now(),updated_at=now() where id=auth.uid();
  insert into public.club_change_history(user_id,from_club_id,to_club_id,is_initial)
  values(auth.uid(),p.favorite_club_id,new_club_id,false);
  insert into public.audit_log(actor_id,action,entity_type,entity_id,club_id,before_data,after_data)
  values(auth.uid(),'favorite_club.changed','profile',auth.uid()::text,new_club_id,jsonb_build_object('favorite_club_id',p.favorite_club_id),jsonb_build_object('favorite_club_id',new_club_id));
end $$;
grant execute on function public.change_favorite_club(uuid) to authenticated;

create or replace function public.admin_override_favorite_club(p_user_id uuid,p_club_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare old_club uuid;
begin
  if not public.has_permission('owner.override') then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.clubs where id=p_club_id and active=true) then raise exception 'INVALID_CLUB'; end if;
  select favorite_club_id into old_club from public.profiles where id=p_user_id for update;
  perform set_config('app.allow_club_change','1',true);
  update public.profiles set favorite_club_id=p_club_id,last_club_change_at=now(),updated_at=now() where id=p_user_id;
  insert into public.club_change_history(user_id,from_club_id,to_club_id,is_initial,overridden_by)
  values(p_user_id,old_club,p_club_id,false,auth.uid());
  perform public.write_audit('favorite_club.override','profile',p_user_id::text,p_club_id,
    jsonb_build_object('favorite_club_id',old_club),jsonb_build_object('favorite_club_id',p_club_id));
end $$;
grant execute on function public.admin_override_favorite_club(uuid,uuid) to authenticated;
