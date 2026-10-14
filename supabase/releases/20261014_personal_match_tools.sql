begin;
create table public.fan_match_alerts (
 user_id uuid not null references public.profiles(id) on delete cascade,
 match_id uuid not null references public.matches(id) on delete cascade,
 enabled boolean not null default true,reminder_hour boolean not null default false,
 updated_at timestamptz not null default now(),primary key(user_id,match_id)
);
create table public.fan_match_diary (
 user_id uuid not null references public.profiles(id) on delete cascade,
 match_id uuid not null references public.matches(id) on delete cascade,
 watched_at timestamptz,private_note text not null default '' check(length(private_note)<=5000),
 away_trip_note text not null default '' check(length(away_trip_note)<=2000),
 checklist jsonb not null default '[]'::jsonb check(jsonb_typeof(checklist)='array' and jsonb_array_length(checklist)<=64 and pg_column_size(checklist)<32768),
 checklist_items jsonb not null default '[]'::jsonb check(jsonb_typeof(checklist_items)='array' and jsonb_array_length(checklist_items)<=64 and pg_column_size(checklist_items)<32768),
 updated_at timestamptz not null default now(),primary key(user_id,match_id)
);
create table public.fan_saved_items (
 user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('player','article','match')),entity_id uuid not null,
 created_at timestamptz not null default now(),primary key(user_id,kind,entity_id)
);
create table public.fan_album_photos (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 match_id uuid not null references public.matches(id) on delete cascade,storage_path text not null unique,
 caption text not null default '' check(length(caption)<=300),created_at timestamptz not null default now(),
 check(storage_path like user_id::text||'/'||match_id::text||'/%')
);
do $$declare t text;begin
 foreach t in array array['fan_match_alerts','fan_match_diary','fan_saved_items','fan_album_photos'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy "own rows" on public.%I for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid())',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end$$;
create function public.save_fan_diary(p_match_id uuid,p_patch jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if jsonb_typeof(p_patch) is distinct from 'object' then raise exception 'Invalid diary';end if;
 if p_patch->>'watched_at' is not null and not exists(select 1 from matches where id=p_match_id and status in ('live','finished') and kickoff<=now()) then raise exception 'Match not started';end if;
 insert into fan_match_diary(user_id,match_id,watched_at,private_note,away_trip_note,checklist,checklist_items)
 values(auth.uid(),p_match_id,(p_patch->>'watched_at')::timestamptz,coalesce(p_patch->>'private_note',''),coalesce(p_patch->>'away_trip_note',''),coalesce(p_patch->'checklist','[]'::jsonb),coalesce(p_patch->'checklist_items','[]'::jsonb))
 on conflict(user_id,match_id) do update set
 watched_at=case when p_patch ? 'watched_at' then excluded.watched_at else fan_match_diary.watched_at end,
 private_note=case when p_patch ? 'private_note' then excluded.private_note else fan_match_diary.private_note end,
 away_trip_note=case when p_patch ? 'away_trip_note' then excluded.away_trip_note else fan_match_diary.away_trip_note end,
 checklist=case when p_patch ? 'checklist' then excluded.checklist else fan_match_diary.checklist end,
 checklist_items=case when p_patch ? 'checklist_items' then excluded.checklist_items else fan_match_diary.checklist_items end,updated_at=now();
end$$;
revoke all on function public.save_fan_diary(uuid,jsonb) from public,anon;
grant execute on function public.save_fan_diary(uuid,jsonb) to authenticated;
create function public.fan_saved_reference_check() returns trigger language plpgsql set search_path=public,pg_temp as $$begin
 if (new.kind='player' and not exists(select 1 from players where id=new.entity_id)) or
 (new.kind='match' and not exists(select 1 from matches where id=new.entity_id)) or
 (new.kind='article' and not exists(select 1 from news_items where id=new.entity_id and status='published')) then raise exception 'Item unavailable';end if;
 return new;
end$$;
create trigger fan_saved_reference before insert or update on public.fan_saved_items for each row execute function public.fan_saved_reference_check();
alter table public.match_attendance add column if not exists supported_club_id uuid references public.clubs(id);
create function public.set_attendance_side(p_match_id uuid,p_club_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if p_club_id is not null and not exists(select 1 from matches where id=p_match_id and p_club_id in(home_club_id,away_club_id)) then raise exception 'Invalid participant';end if;
 update match_attendance set supported_club_id=p_club_id where user_id=auth.uid() and match_id=p_match_id;
end$$;
revoke all on function public.set_attendance_side(uuid,uuid) from public,anon;
grant execute on function public.set_attendance_side(uuid,uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('fan-match-albums','fan-match-albums',false,10485760,array['image/jpeg','image/png','image/webp']);
create policy "fan album private reads" on storage.objects for select to authenticated using(bucket_id='fan-match-albums' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "fan album private inserts" on storage.objects for insert to authenticated with check(bucket_id='fan-match-albums' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "fan album private updates" on storage.objects for update to authenticated using(bucket_id='fan-match-albums' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='fan-match-albums' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "fan album private deletes" on storage.objects for delete to authenticated using(bucket_id='fan-match-albums' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "fan album authenticated boundary" on storage.objects as restrictive for all to authenticated using(bucket_id<>'fan-match-albums' or (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id<>'fan-match-albums' or (storage.foldername(name))[1]=auth.uid()::text);
create policy "fan album anonymous boundary" on storage.objects as restrictive for all to anon using(bucket_id<>'fan-match-albums') with check(bucket_id<>'fan-match-albums');

create function public.fan_pref_bool(p_prefs jsonb,p_key text,p_default boolean default true) returns boolean language sql immutable as $$select case p_prefs->p_key when 'true'::jsonb then true when 'false'::jsonb then false else p_default end$$;
create function public.set_notification_preferences(p_patch jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare k text;v jsonb;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if jsonb_typeof(p_patch) is distinct from 'object' then raise exception 'Invalid preferences';end if;
 for k,v in select * from jsonb_each(p_patch) loop
  if k in ('push_enabled','in_app_enabled','important_news','official_news','match_alerts','full_time','goals','lineups','selected_games_only','quiet_enabled') then
   if jsonb_typeof(v)<>'boolean' then raise exception 'Invalid toggle';end if;
  elsif k in ('quiet_start','quiet_end') then
   if jsonb_typeof(v)<>'number' or (v#>>'{}') !~ '^[0-9]{1,2}$' or (v#>>'{}')::int>23 then raise exception 'Invalid hour';end if;
  elsif k='quiet_timezone' then
   if jsonb_typeof(v)<>'string' or not exists(select 1 from pg_timezone_names where name=(v#>>'{}')) then raise exception 'Invalid timezone';end if;
  else raise exception 'Unknown preference';end if;
 end loop;
 update profiles set notification_prefs=(case when jsonb_typeof(notification_prefs)='object' then notification_prefs else '{}'::jsonb end)||p_patch,updated_at=now() where id=auth.uid();
end$$;
revoke all on function public.set_notification_preferences(jsonb) from public,anon;
grant execute on function public.set_notification_preferences(jsonb) to authenticated;
create function public.fan_quiet_now(p_prefs jsonb,p_at timestamptz default now()) returns boolean language plpgsql stable set search_path=public,pg_temp as $$
declare zone text:=coalesce(p_prefs->>'quiet_timezone','Asia/Jerusalem');start_hour int:=22;end_hour int:=8;hour_now int;
begin
 if not fan_pref_bool(p_prefs,'quiet_enabled',false) then return false;end if;
 if not exists(select 1 from pg_timezone_names where name=zone) then zone:='Asia/Jerusalem';end if;
 if coalesce(p_prefs->>'quiet_start','') ~ '^[0-9]{1,2}$' then start_hour:=least(23,(p_prefs->>'quiet_start')::int);end if;
 if coalesce(p_prefs->>'quiet_end','') ~ '^[0-9]{1,2}$' then end_hour:=least(23,(p_prefs->>'quiet_end')::int);end if;
 hour_now:=extract(hour from p_at at time zone zone);
 return case when start_hour=end_hour then true when start_hour<end_hour then hour_now>=start_hour and hour_now<end_hour else hour_now>=start_hour or hour_now<end_hour end;
end$$;
alter table public.notification_inbox add column push_suppressed_at timestamptz;
alter table public.notification_inbox add column push_suppression_reason text;
create or replace function public.notify_club_fans(p_club uuid,p_key text,p_title text,p_body text,p_url text,p_kind text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare mid uuid;begin
 if p_url ~ '^/match/[a-f0-9-]{36}$' then mid:=substring(p_url from 8)::uuid;end if;
 insert into notification_inbox(user_id,event_key,title,body,url,kind,push_suppressed_at,push_suppression_reason)
 select p.id,p_key,p_title,p_body,p_url,p_kind,case when fan_quiet_now(p.notification_prefs) then now() end,case when fan_quiet_now(p.notification_prefs) then 'quiet_hours' end
 from profiles p left join fan_match_alerts a on a.user_id=p.id and a.match_id=mid
 where (p.favorite_club_id=p_club or (mid is not null and a.enabled))
 and fan_pref_bool(p.notification_prefs,'in_app_enabled') and fan_pref_bool(p.notification_prefs,p_kind)
 and (mid is null or coalesce(a.enabled,not fan_pref_bool(p.notification_prefs,'selected_games_only',false)))
 on conflict(user_id,event_key) do nothing;
end$$;
revoke all on function public.notify_club_fans(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.notify_club_fans(uuid,text,text,text,text,text) to service_role;
create function public.queue_match_reminders() returns int language plpgsql security definer set search_path=public,pg_temp as $$
declare n int;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 insert into notification_inbox(user_id,event_key,title,body,url,kind,push_suppressed_at,push_suppression_reason)
 select a.user_id,'reminder:'||m.id,'עוד שעה מתחילים ⚽',coalesce(m.home_name,'בית')||' — '||coalesce(m.away_name,'חוץ'),'/match/'||m.id,'reminder',case when fan_quiet_now(p.notification_prefs) then now() end,case when fan_quiet_now(p.notification_prefs) then 'quiet_hours' end
 from fan_match_alerts a join matches m on m.id=a.match_id join profiles p on p.id=a.user_id
 where a.reminder_hour and m.status='scheduled' and m.kickoff>now()+interval '55 minutes' and m.kickoff<=now()+interval '1 hour'
 and fan_pref_bool(p.notification_prefs,'in_app_enabled')
 on conflict(user_id,event_key) do nothing;
 get diagnostics n=row_count;return n;
end$$;
revoke all on function public.queue_match_reminders() from public,anon,authenticated;
grant execute on function public.queue_match_reminders() to service_role;
create or replace function public.claim_push_notifications(p_limit int default 50) returns setof public.notification_inbox language plpgsql security definer set search_path=public,pg_temp as $$begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 update notification_inbox i set push_suppressed_at=now(),push_suppression_reason='quiet_hours' from profiles p where i.user_id=p.id and i.push_sent_at is null and i.push_suppressed_at is null and fan_quiet_now(p.notification_prefs);
 return query update notification_inbox n set push_locked_at=now(),push_attempts=n.push_attempts+1 where n.id in (
 select i.id from notification_inbox i join profiles p on p.id=i.user_id
 where i.push_sent_at is null and i.push_suppressed_at is null and i.push_attempts<5 and i.created_at>now()-interval '24 hours'
 and (i.kind not in ('goals','lineups','match_alerts','full_time','reminder') or i.created_at>now()-interval '10 minutes')
 and (i.push_locked_at is null or i.push_locked_at<now()-interval '5 minutes')
 and fan_pref_bool(p.notification_prefs,'push_enabled',false) and exists(select 1 from push_subscriptions s where s.user_id=i.user_id)
 order by i.created_at limit greatest(0,least(p_limit,100)) for update of i skip locked) returning n.*;
end$$;
revoke all on function public.claim_push_notifications(int) from public,anon,authenticated;
grant execute on function public.claim_push_notifications(int) to service_role;
commit;
