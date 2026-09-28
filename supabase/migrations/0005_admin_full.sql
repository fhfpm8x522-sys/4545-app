
-- 45:45 FULL ADMIN CMS — 0005
-- Requires 0001-0004.

create table if not exists public.app_settings(
 key text primary key,
 value jsonb not null default '{}'::jsonb,
 updated_by uuid references public.profiles(id),
 updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;

-- Missing RLS switches for tables created in 0003.
alter table public.widget_schedule enable row level security;
alter table public.poll_votes enable row level security;
alter table public.predictions enable row level security;
alter table public.match_attendance enable row level security;
alter table public.match_events enable row level security;
alter table public.moderation_cases enable row level security;
alter table public.club_history enable row level security;

-- Extra admin permissions.
insert into public.permissions(key,description) values
('history.manage','Manage club history'),
('widget.manage','Manage widget schedule'),
('moderation.manage','Manage moderation cases')
on conflict(key) do update set description=excluded.description;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.key='owner' on conflict do nothing;

-- Generic audit helper.
create or replace function public.write_audit(
 p_action text,p_entity_type text,p_entity_id text,p_club_id uuid,p_before jsonb,p_after jsonb
) returns void language plpgsql security definer set search_path=public as $$
begin
 insert into public.audit_log(actor_id,action,entity_type,entity_id,club_id,before_data,after_data)
 values(auth.uid(),p_action,p_entity_type,p_entity_id,p_club_id,p_before,p_after);
end $$;
grant execute on function public.write_audit(text,text,text,uuid,jsonb,jsonb) to authenticated;

-- Club administration.
drop policy if exists "admin clubs all" on public.clubs;
create policy "admin clubs all" on public.clubs for all to authenticated
using(public.has_permission('clubs.manage')) with check(public.has_permission('clubs.manage'));

-- Match events.
drop policy if exists "match events public read" on public.match_events;
create policy "match events public read" on public.match_events for select using(true);
drop policy if exists "admin match events write" on public.match_events;
create policy "admin match events write" on public.match_events for all to authenticated
using(public.has_permission('matches.manage') and (club_id is null or public.has_club_scope(club_id)))
with check(public.has_permission('matches.manage') and (club_id is null or public.has_club_scope(club_id)));

-- Player stats.
drop policy if exists "admin stats write" on public.player_season_stats;
create policy "admin stats write" on public.player_season_stats for all to authenticated
using(public.has_permission('players.manage')) with check(public.has_permission('players.manage'));

-- Widget.
drop policy if exists "widget schedule public read" on public.widget_schedule;
create policy "widget schedule public read" on public.widget_schedule for select using(enabled=true);
drop policy if exists "admin widget schedule write" on public.widget_schedule;
create policy "admin widget schedule write" on public.widget_schedule for all to authenticated
using(public.has_permission('chants.manage') and public.has_club_scope(club_id))
with check(public.has_permission('chants.manage') and public.has_club_scope(club_id));

-- History.
drop policy if exists "history public read" on public.club_history;
create policy "history public read" on public.club_history for select using(true);
drop policy if exists "admin history write" on public.club_history;
create policy "admin history write" on public.club_history for all to authenticated
using(public.has_permission('history.manage') and public.has_club_scope(club_id))
with check(public.has_permission('history.manage') and public.has_club_scope(club_id));

-- Moderation.
drop policy if exists "moderation staff read" on public.moderation_cases;
create policy "moderation staff read" on public.moderation_cases for select to authenticated
using(public.has_permission('community.moderate') and (club_id is null or public.has_club_scope(club_id)));
drop policy if exists "moderation staff update" on public.moderation_cases;
create policy "moderation staff update" on public.moderation_cases for update to authenticated
using(public.has_permission('community.moderate') and (club_id is null or public.has_club_scope(club_id)))
with check(public.has_permission('community.moderate') and (club_id is null or public.has_club_scope(club_id)));

-- App settings.
drop policy if exists "settings staff read" on public.app_settings;
create policy "settings staff read" on public.app_settings for select to authenticated using(public.is_staff());
drop policy if exists "settings admin write" on public.app_settings;
create policy "settings admin write" on public.app_settings for all to authenticated
using(public.has_permission('settings.manage')) with check(public.has_permission('settings.manage'));

-- Owner-safe user/staff directory. Email is deliberately not exposed.
create or replace function public.admin_users()
returns table(user_id uuid,username text,display_name text,favorite_club_id uuid,created_at timestamptz,role_key text,role_name text,approval_level int,public_badge text,suspended_at timestamptz)
language sql stable security definer set search_path=public as $$
 select pr.id,pr.username,pr.display_name,pr.favorite_club_id,pr.created_at,
        r.key,r.name_he,sm.approval_level,sm.public_badge,sm.suspended_at
 from public.profiles pr
 left join public.staff_memberships sm on sm.user_id=pr.id
 left join public.roles r on r.id=sm.role_id
 where public.has_permission('users.view')
 order by pr.created_at desc;
$$;
grant execute on function public.admin_users() to authenticated;

-- Owner-only role assignment/removal. Prevent self removal and owner escalation by non-owner.
create or replace function public.admin_set_staff(
 p_user_id uuid,p_role_key text,p_approval_level int default 1,p_badge text default null,p_club_ids uuid[] default '{}'::uuid[]
) returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid; mid uuid; caller_owner boolean;
begin
 if not public.has_permission('staff.manage') then raise exception 'forbidden'; end if;
 select exists(select 1 from public.staff_memberships sm join public.roles r on r.id=sm.role_id
   where sm.user_id=auth.uid() and sm.suspended_at is null and r.key='owner') into caller_owner;
 if p_role_key='owner' and not caller_owner then raise exception 'owner only'; end if;
 select id into rid from public.roles where key=p_role_key;
 if rid is null then raise exception 'unknown role'; end if;
 insert into public.staff_memberships(user_id,role_id,approval_level,public_badge)
 values(p_user_id,rid,greatest(1,least(4,p_approval_level)),p_badge)
 on conflict(user_id,role_id) do update set approval_level=excluded.approval_level,public_badge=excluded.public_badge,suspended_at=null
 returning id into mid;
 delete from public.staff_club_scopes where membership_id=mid;
 if p_role_key not in ('owner','super_admin') then
   insert into public.staff_club_scopes(membership_id,club_id)
   select mid,x from unnest(p_club_ids) x on conflict do nothing;
 end if;
 perform public.write_audit('staff.set','staff_membership',mid::text,null,null,
   jsonb_build_object('user_id',p_user_id,'role',p_role_key,'level',p_approval_level,'badge',p_badge,'clubs',p_club_ids));
 return mid;
end $$;
grant execute on function public.admin_set_staff(uuid,text,int,text,uuid[]) to authenticated;

create or replace function public.admin_suspend_staff(p_membership_id uuid,p_suspend boolean)
returns void language plpgsql security definer set search_path=public as $$
declare target_user uuid; target_role text; caller_owner boolean;
begin
 if not public.has_permission('staff.manage') then raise exception 'forbidden'; end if;
 select sm.user_id,r.key into target_user,target_role from public.staff_memberships sm join public.roles r on r.id=sm.role_id where sm.id=p_membership_id;
 if target_user=auth.uid() then raise exception 'cannot suspend yourself'; end if;
 select exists(select 1 from public.staff_memberships sm join public.roles r on r.id=sm.role_id where sm.user_id=auth.uid() and sm.suspended_at is null and r.key='owner') into caller_owner;
 if target_role='owner' and not caller_owner then raise exception 'owner only'; end if;
 update public.staff_memberships set suspended_at=case when p_suspend then now() else null end where id=p_membership_id;
 perform public.write_audit(case when p_suspend then 'staff.suspend' else 'staff.restore' end,'staff_membership',p_membership_id::text,null,null,null);
end $$;
grant execute on function public.admin_suspend_staff(uuid,boolean) to authenticated;

-- Ensure owner has new permissions too.
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p where r.key='owner'
on conflict do nothing;
