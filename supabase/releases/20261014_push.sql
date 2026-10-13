begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create table if not exists public.push_subscriptions(endpoint text primary key,user_id uuid not null references public.profiles(id) on delete cascade,subscription jsonb not null,created_at timestamptz not null default now());
alter table public.push_subscriptions enable row level security;
create policy "push own read" on public.push_subscriptions for select to authenticated using(user_id=auth.uid());
create policy "push own insert" on public.push_subscriptions for insert to authenticated with check(user_id=auth.uid());
create policy "push own update" on public.push_subscriptions for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "push own delete" on public.push_subscriptions for delete to authenticated using(user_id=auth.uid());
grant select,insert,update,delete on public.push_subscriptions to authenticated;
alter table public.notification_inbox add column if not exists push_sent_at timestamptz;
alter table public.notification_inbox add column if not exists push_locked_at timestamptz;
alter table public.notification_inbox add column if not exists push_attempts int not null default 0;
create index if not exists inbox_push_pending on public.notification_inbox(created_at) where push_sent_at is null;
create or replace function public.claim_push_notifications(p_limit int default 50) returns setof public.notification_inbox language sql security definer set search_path=public as $$
update notification_inbox n set push_locked_at=now(),push_attempts=n.push_attempts+1 where n.id in (
select i.id from notification_inbox i join profiles p on p.id=i.user_id
where i.push_sent_at is null and i.push_attempts<5 and i.created_at>now()-interval '24 hours' and (i.push_locked_at is null or i.push_locked_at<now()-interval '5 minutes')
and coalesce((p.notification_prefs->>'push_enabled')::boolean,false) and exists(select 1 from push_subscriptions s where s.user_id=i.user_id)
order by i.created_at limit least(p_limit,100) for update of i skip locked) returning n.*;
$$;
revoke all on function public.claim_push_notifications(int) from public,anon,authenticated;
grant execute on function public.claim_push_notifications(int) to service_role;
create or replace function public.configure_push_dispatch(p_service_role text) returns void language plpgsql security definer set search_path=public,vault,cron as $$begin
if auth.role()<>'service_role' then raise exception 'Forbidden';end if;
if not exists(select 1 from vault.secrets where name='4545_push_service_role') then perform vault.create_secret(p_service_role,'4545_push_service_role','Server-only Push scheduler credential');end if;
if not exists(select 1 from cron.job where jobname='4545-push-dispatch') then
perform cron.schedule('4545-push-dispatch','* * * * *',$job$
select net.http_post(url:='https://ohcopmgolzyfxwfqmpmx.supabase.co/functions/v1/push-dispatch',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='4545_push_service_role')),body:='{}'::jsonb,timeout_milliseconds:=55000);
$job$);end if;end$$;
revoke all on function public.configure_push_dispatch(text) from public,anon,authenticated;
grant execute on function public.configure_push_dispatch(text) to service_role;
grant execute on function public.notify_club_fans(uuid,text,text,text,text,text) to service_role;
create or replace function public.match_notification_trigger() returns trigger language plpgsql security definer set search_path=public as $$begin
if new.status in ('live','finished') and old.status is distinct from new.status then
perform notify_club_fans(new.home_club_id,new.status||':'||new.id,case when new.status='live' then 'המשחק התחיל' else 'המשחק הסתיים' end,coalesce(new.home_name,'בית')||' — '||coalesce(new.away_name,'חוץ')||' · '||coalesce(new.home_score::text,'—')||':'||coalesce(new.away_score::text,'—'),'/match/'||new.id,case when new.status='live' then 'match_alerts' else 'full_time' end);
perform notify_club_fans(new.away_club_id,new.status||':'||new.id,case when new.status='live' then 'המשחק התחיל' else 'המשחק הסתיים' end,coalesce(new.home_name,'בית')||' — '||coalesce(new.away_name,'חוץ')||' · '||coalesce(new.home_score::text,'—')||':'||coalesce(new.away_score::text,'—'),'/match/'||new.id,case when new.status='live' then 'match_alerts' else 'full_time' end);
end if;return new;end$$;
commit;
