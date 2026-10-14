begin;
create or replace function public.goal_notification_trigger() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$declare m public.matches;begin
 select * into m from matches where id=new.match_id;
 if new.event_type='goal' and m.status='live' and (coalesce(new.raw_type,'')||' '||coalesce(new.detail,'')) !~* 'cancel|disallow|annul|overturn|miss|saved|בוטל|נפסל|החמצ' then
 perform notify_club_fans(m.home_club_id,'goal:'||new.id,'שער במשחק!',coalesce(m.home_name,'בית')||' — '||coalesce(m.away_name,'חוץ'),'/match/'||m.id,'goals');
 perform notify_club_fans(m.away_club_id,'goal:'||new.id,'שער במשחק!',coalesce(m.home_name,'בית')||' — '||coalesce(m.away_name,'חוץ'),'/match/'||m.id,'goals');
 end if;return new;end$$;
commit;
