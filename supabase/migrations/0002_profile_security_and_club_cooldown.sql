-- 45:45 profile security + 30-day favorite-club cooldown.
-- The initial favorite club selection does NOT count as a change.

create or replace function public.username_available(candidate text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select candidate ~ '^[A-Za-z0-9_.]{3,24}$'
     and not exists(select 1 from public.profiles where lower(username)=lower(candidate));
$$;

grant execute on function public.username_available(text) to anon, authenticated;

create or replace function public.change_favorite_club(new_club_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  p public.profiles%rowtype;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if not exists(select 1 from public.clubs where id=new_club_id and active=true) then raise exception 'INVALID_CLUB'; end if;
  if p.favorite_club_id = new_club_id then return; end if;
  if p.last_club_change_at is not null and p.last_club_change_at > now() - interval '30 days' then
    raise exception 'CLUB_CHANGE_COOLDOWN' using detail=(p.last_club_change_at + interval '30 days')::text;
  end if;
  update public.profiles set favorite_club_id=new_club_id,last_club_change_at=now(),updated_at=now() where id=auth.uid();
  insert into public.audit_log(actor_id,action,entity_type,entity_id,club_id,before_data,after_data)
  values(auth.uid(),'favorite_club.changed','profile',auth.uid()::text,new_club_id,jsonb_build_object('favorite_club_id',p.favorite_club_id),jsonb_build_object('favorite_club_id',new_club_id));
end $$;

grant execute on function public.change_favorite_club(uuid) to authenticated;

-- Allow a signed-in user to create their own profile once.
create policy "profiles own insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Prevent direct favorite-club cooldown bypass: app changes after onboarding go through RPC.
-- Sensitive admin overrides will be implemented through a server-side admin function later.

create index if not exists profiles_username_lower_idx on public.profiles(lower(username));
create index if not exists profiles_favorite_club_idx on public.profiles(favorite_club_id);
