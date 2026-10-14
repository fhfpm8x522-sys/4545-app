begin;
create or replace function public.set_notification_preferences(p_patch jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare k text;v jsonb;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if jsonb_typeof(p_patch) is distinct from 'object' then raise exception 'Invalid preferences';end if;
 for k,v in select * from jsonb_each(p_patch) loop
  if k in ('push_enabled','in_app_enabled','important_news','official_news','match_alerts','full_time','goals','var_alerts','lineups','selected_games_only','quiet_enabled') then
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

create or replace function public.claim_push_notifications(p_limit int default 50) returns setof public.notification_inbox language plpgsql security definer set search_path=public,pg_temp as $$begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 update notification_inbox i set push_suppressed_at=now(),push_suppression_reason='quiet_hours' from profiles p where i.user_id=p.id and i.push_sent_at is null and i.push_suppressed_at is null and fan_quiet_now(p.notification_prefs);
 return query update notification_inbox n set push_locked_at=now(),push_attempts=n.push_attempts+1 where n.id in (
 select i.id from notification_inbox i join profiles p on p.id=i.user_id
 where i.push_sent_at is null and i.push_suppressed_at is null and i.push_attempts<5 and i.created_at>now()-interval '24 hours'
 and (i.kind not in ('goals','var_alerts','lineups','match_alerts','full_time','reminder') or i.created_at>now()-interval '10 minutes')
 and (i.push_locked_at is null or i.push_locked_at<now()-interval '5 minutes')
 and fan_pref_bool(p.notification_prefs,'push_enabled',false) and exists(select 1 from push_subscriptions s where s.user_id=i.user_id)
 order by i.created_at limit greatest(0,least(p_limit,100)) for update of i skip locked) returning n.*;
end$$;
revoke all on function public.claim_push_notifications(int) from public,anon,authenticated;
grant execute on function public.claim_push_notifications(int) to service_role;

create or replace function public.var_notification_trigger() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.matches; fingerprint text; begin
 if new.event_type<>'var' and coalesce(new.raw_type,'') !~* 'var|video.?review' then return new;end if;
 if tg_op='UPDATE' and (new.detail,new.raw_type) is not distinct from (old.detail,old.raw_type) then return new;end if;
 select * into m from matches where id=new.match_id;
 if m.status<>'live' then return new;end if;
 fingerprint:='var:'||new.id||':'||md5(coalesce(new.detail,'')||coalesce(new.raw_type,''));
 perform notify_club_fans(m.home_club_id,fingerprint,'בדיקת / החלטת VAR',coalesce(m.home_name,'בית')||' — '||coalesce(m.away_name,'חוץ')||' · '||coalesce(new.detail,'עודכן אירוע VAR'),'/match/'||m.id,'var_alerts');
 perform notify_club_fans(m.away_club_id,fingerprint,'בדיקת / החלטת VAR',coalesce(m.home_name,'בית')||' — '||coalesce(m.away_name,'חוץ')||' · '||coalesce(new.detail,'עודכן אירוע VAR'),'/match/'||m.id,'var_alerts');
 return new;end$$;
create trigger trg_var_notification after insert or update of detail,raw_type on public.match_events for each row execute function public.var_notification_trigger();
commit;
