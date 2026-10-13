-- 45:45 — safe public community profile lookup.
drop policy if exists "profiles community read" on public.profiles;
drop view if exists public.public_profiles;

create or replace function public.get_public_profiles(p_user_ids uuid[])
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  favorite_club_id uuid
)
language sql stable security definer set search_path = public
as $$
  select p.id,p.username,p.display_name,p.avatar_url,p.favorite_club_id
  from public.profiles p
  where p.id = any(p_user_ids);
$$;

revoke all on function public.get_public_profiles(uuid[]) from public;
revoke all on function public.get_public_profiles(uuid[]) from anon;
grant execute on function public.get_public_profiles(uuid[]) to authenticated;
