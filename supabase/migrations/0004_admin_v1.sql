-- 45:45 Admin V1
insert into public.roles(key,name_he) values
('owner','Owner'),('super_admin','Super Admin'),('club_manager','מנהל מועדון'),
('news_editor','עורך חדשות'),('songs_editor','עורך שירי אוהדים'),
('content_editor','עורך תוכן'),('moderator','Moderator'),
('senior_moderator','Senior Moderator'),('community_manager','מנהל קהילה'),
('custom','Custom Role')
on conflict(key) do update set name_he=excluded.name_he;

insert into public.permissions(key,description) values
('admin.access','Access Admin'),('clubs.manage','Manage clubs'),
('matches.manage','Manage matches'),('players.manage','Manage players'),
('news.review','Review news'),('news.publish','Publish news'),
('polls.manage','Manage polls'),('chants.manage','Manage chants/widget'),
('community.moderate','Moderate community'),('users.view','View users'),
('staff.manage','Manage staff'),('roles.manage','Manage roles'),
('audit.view','View audit log'),('settings.manage','Manage app settings'),
('owner.override','Owner critical overrides')
on conflict(key) do update set description=excluded.description;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p where r.key='owner'
on conflict do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.key=any(array[
'admin.access','clubs.manage','matches.manage','players.manage','news.review','news.publish',
'polls.manage','chants.manage','community.moderate','users.view','staff.manage','audit.view'
]) where r.key='super_admin' on conflict do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.key=any(array[
'admin.access','matches.manage','players.manage','news.review','news.publish','polls.manage','chants.manage','community.moderate'
]) where r.key='club_manager' on conflict do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.key=any(array['admin.access','news.review','news.publish'])
where r.key='news_editor' on conflict do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.key=any(array['admin.access','chants.manage'])
where r.key='songs_editor' on conflict do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.key=any(array['admin.access','community.moderate'])
where r.key in ('moderator','senior_moderator','community_manager') on conflict do nothing;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.staff_memberships enable row level security;
alter table public.staff_club_scopes enable row level security;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.staff_memberships sm where sm.user_id=auth.uid() and sm.suspended_at is null);
$$;

create or replace function public.has_permission(permission_key text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(
  select 1 from public.staff_memberships sm
  join public.role_permissions rp on rp.role_id=sm.role_id
  join public.permissions p on p.id=rp.permission_id
  where sm.user_id=auth.uid() and sm.suspended_at is null and p.key=permission_key
 );
$$;

create or replace function public.has_club_scope(target_club uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(
  select 1 from public.staff_memberships sm join public.roles r on r.id=sm.role_id
  where sm.user_id=auth.uid() and sm.suspended_at is null and
   (r.key in ('owner','super_admin') or exists(
    select 1 from public.staff_club_scopes sc where sc.membership_id=sm.id and sc.club_id=target_club
   ))
 );
$$;

grant execute on function public.is_staff() to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.has_club_scope(uuid) to authenticated;

drop policy if exists "staff memberships own read" on public.staff_memberships;
create policy "staff memberships own read" on public.staff_memberships for select to authenticated
using(user_id=auth.uid() or public.has_permission('staff.manage'));

drop policy if exists "roles staff read" on public.roles;
create policy "roles staff read" on public.roles for select to authenticated using(public.is_staff());
drop policy if exists "permissions staff read" on public.permissions;
create policy "permissions staff read" on public.permissions for select to authenticated using(public.is_staff());
drop policy if exists "role permissions staff read" on public.role_permissions;
create policy "role permissions staff read" on public.role_permissions for select to authenticated using(public.is_staff());
drop policy if exists "staff scopes read" on public.staff_club_scopes;
create policy "staff scopes read" on public.staff_club_scopes for select to authenticated using(
 exists(select 1 from public.staff_memberships sm where sm.id=membership_id and (sm.user_id=auth.uid() or public.has_permission('staff.manage')))
);
drop policy if exists "audit staff read" on public.audit_log;
create policy "audit staff read" on public.audit_log for select to authenticated using(public.has_permission('audit.view'));

drop policy if exists "admin matches write" on public.matches;
create policy "admin matches write" on public.matches for all to authenticated
using(public.has_permission('matches.manage') and
 ((home_club_id is not null and public.has_club_scope(home_club_id)) or
  (away_club_id is not null and public.has_club_scope(away_club_id))))
with check(public.has_permission('matches.manage') and
 ((home_club_id is not null and public.has_club_scope(home_club_id)) or
  (away_club_id is not null and public.has_club_scope(away_club_id))));

drop policy if exists "admin players write" on public.players;
create policy "admin players write" on public.players for all to authenticated
using(public.has_permission('players.manage') and public.has_club_scope(club_id))
with check(public.has_permission('players.manage') and public.has_club_scope(club_id));

drop policy if exists "admin news read" on public.news_items;
create policy "admin news read" on public.news_items for select to authenticated
using(status='published' or (public.has_permission('news.review') and public.has_club_scope(club_id)));
drop policy if exists "admin news insert" on public.news_items;
create policy "admin news insert" on public.news_items for insert to authenticated
with check(public.has_permission('news.review') and public.has_club_scope(club_id));
drop policy if exists "admin news update" on public.news_items;
create policy "admin news update" on public.news_items for update to authenticated
using(public.has_permission('news.review') and public.has_club_scope(club_id))
with check(public.has_permission('news.review') and public.has_club_scope(club_id));

drop policy if exists "admin polls write" on public.polls;
create policy "admin polls write" on public.polls for all to authenticated
using(public.has_permission('polls.manage') and public.has_club_scope(club_id))
with check(public.has_permission('polls.manage') and public.has_club_scope(club_id));

drop policy if exists "admin chants write" on public.chants;
create policy "admin chants write" on public.chants for all to authenticated
using(public.has_permission('chants.manage') and public.has_club_scope(club_id))
with check(public.has_permission('chants.manage') and public.has_club_scope(club_id));

insert into public.staff_memberships(user_id,role_id,approval_level,public_badge)
select u.id,r.id,4,'45:45 OWNER'
from auth.users u join public.profiles pr on pr.id=u.id cross join public.roles r
where lower(u.email)=lower('bvurth666001@gmail.com') and r.key='owner'
on conflict(user_id,role_id) do update set approval_level=4,public_badge='45:45 OWNER',suspended_at=null;

create or replace function public.admin_me()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null then return null; end if;
 select jsonb_build_object(
  'user_id',pr.id,'username',pr.username,'display_name',pr.display_name,
  'role_key',r.key,'role_name',r.name_he,'approval_level',sm.approval_level,
  'public_badge',sm.public_badge,
  'permissions',coalesce((select jsonb_agg(distinct p.key) from public.role_permissions rp
    join public.permissions p on p.id=rp.permission_id where rp.role_id=sm.role_id),'[]'::jsonb)
 ) into result
 from public.profiles pr
 join public.staff_memberships sm on sm.user_id=pr.id and sm.suspended_at is null
 join public.roles r on r.id=sm.role_id
 where pr.id=auth.uid()
 order by case when r.key='owner' then 0 else 1 end limit 1;
 return result;
end $$;
grant execute on function public.admin_me() to authenticated;

create or replace function public.admin_dashboard_counts()
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not public.has_permission('admin.access') then raise exception 'forbidden'; end if;
 return jsonb_build_object(
  'pending_news',(select count(*) from public.news_items where status='pending' and (club_id is null or public.has_club_scope(club_id))),
  'upcoming_matches',(select count(*) from public.matches where kickoff>=now() and status='scheduled' and
   ((home_club_id is not null and public.has_club_scope(home_club_id)) or
    (away_club_id is not null and public.has_club_scope(away_club_id)))),
  'open_moderation',(select count(*) from public.moderation_cases where status='open' and (club_id is null or public.has_club_scope(club_id))),
  'clubs',(select count(*) from public.clubs where active=true)
 );
end $$;
grant execute on function public.admin_dashboard_counts() to authenticated;
