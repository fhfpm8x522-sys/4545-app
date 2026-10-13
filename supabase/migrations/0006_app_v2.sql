-- 45:45 APP V2 security + interaction policies. Run after 0005.
-- Users may create content only as themselves and only in their selected club.
drop policy if exists "posts insert own club" on public.community_posts;
create policy "posts insert own club" on public.community_posts for insert to authenticated with check(
 author_id=auth.uid() and club_id=(select favorite_club_id from public.profiles where id=auth.uid())
);
drop policy if exists "chat insert allowed" on public.chat_messages;
create policy "chat insert allowed" on public.chat_messages for insert to authenticated with check(
 author_id=auth.uid() and (
  (club_id is not null and club_id=(select favorite_club_id from public.profiles where id=auth.uid()))
  or
  (match_id is not null and exists(select 1 from public.matches m join public.profiles p on p.id=auth.uid()
    where m.id=match_id and p.favorite_club_id in(m.home_club_id,m.away_club_id)))
 )
);
drop policy if exists "votes own" on public.poll_votes;
create policy "votes own" on public.poll_votes for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "predictions own" on public.predictions;
create policy "predictions own" on public.predictions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "attendance own" on public.match_attendance;
create policy "attendance own" on public.match_attendance for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

-- Public profile fields needed to render community author names; sensitive profile fields remain unavailable.
create or replace view public.public_profiles with (security_invoker=true) as
select id,username,display_name,avatar_url,favorite_club_id from public.profiles;
grant select on public.public_profiles to authenticated;

-- Allow authenticated users to resolve display names used by community joins.
drop policy if exists "profiles community read" on public.profiles;
create policy "profiles community read" on public.profiles for select to authenticated using(true);
