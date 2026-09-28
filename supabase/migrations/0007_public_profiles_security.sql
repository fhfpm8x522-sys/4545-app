-- 45:45
-- 0007_public_profiles_security.sql
-- Fix public profile exposure created by 0006.

-- =========================================================
-- 1. Remove broad access to the private profiles table
-- =========================================================

drop policy if exists "profiles community read" on public.profiles;

-- =========================================================
-- 2. Remove the old view from 0006
-- =========================================================

drop view if exists public.public_profiles;

-- =========================================================
-- 3. Public profile RPC
--
-- Only these fields can leave the private profiles table:
-- id
-- username
-- display_name
-- avatar_url
-- favorite_club_id
-- =========================================================

create or replace function public.get_public_profiles(
  p_user_ids uuid[]
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  favorite_club_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.favorite_club_id
  from public.profiles p
  where p.id = any(p_user_ids);
$$;

-- Do not expose this RPC to anonymous visitors.
revoke all
on function public.get_public_profiles(uuid[])
from public;

revoke all
on function public.get_public_profiles(uuid[])
from anon;

grant execute
on function public.get_public_profiles(uuid[])
to authenticated;
