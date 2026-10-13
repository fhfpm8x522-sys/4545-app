begin;
create table if not exists public.football_cache(cache_key text primary key,payload jsonb not null,expires_at timestamptz not null,updated_at timestamptz not null default now());
alter table public.football_cache enable row level security;
revoke all on public.football_cache from anon,authenticated;
create table if not exists public.match_winner_votes(match_id uuid references public.matches(id) on delete cascade,user_id uuid references public.profiles(id) on delete cascade,choice text not null check(choice in ('home','draw','away')),updated_at timestamptz not null default now(),primary key(match_id,user_id));
alter table public.match_winner_votes enable row level security;
create policy "winner own read" on public.match_winner_votes for select to authenticated using(user_id=auth.uid());
create policy "winner own insert before kickoff" on public.match_winner_votes for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.matches m where m.id=match_id and m.kickoff>now() and m.status='scheduled'));
create policy "winner own update before kickoff" on public.match_winner_votes for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and exists(select 1 from public.matches m where m.id=match_id and m.kickoff>now() and m.status='scheduled'));
grant select,insert,update on public.match_winner_votes to authenticated;
create or replace function public.match_winner_totals(p_match_id uuid) returns table(choice text,votes bigint) language sql stable security definer set search_path=public as $$select choice,count(*) from public.match_winner_votes where match_id=p_match_id group by choice$$;
revoke all on function public.match_winner_totals(uuid) from public,anon;
grant execute on function public.match_winner_totals(uuid) to authenticated;
create table if not exists public.notification_inbox(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,event_key text not null,title text not null,body text,url text,kind text not null,read_at timestamptz,created_at timestamptz not null default now(),unique(user_id,event_key));
alter table public.notification_inbox enable row level security;
create policy "inbox own read" on public.notification_inbox for select to authenticated using(user_id=auth.uid());
create policy "inbox own update" on public.notification_inbox for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select on public.notification_inbox to authenticated;
grant update(read_at) on public.notification_inbox to authenticated;
create or replace function public.notify_club_fans(p_club uuid,p_key text,p_title text,p_body text,p_url text,p_kind text) returns void language sql security definer set search_path=public as $$
insert into notification_inbox(user_id,event_key,title,body,url,kind)
select id,p_key,p_title,p_body,p_url,p_kind from profiles where favorite_club_id=p_club and coalesce((notification_prefs->>'in_app_enabled')::boolean,true) and coalesce((notification_prefs->>p_kind)::boolean,true)
on conflict(user_id,event_key) do nothing;
$$;
revoke all on function public.notify_club_fans(uuid,text,text,text,text,text) from public,anon,authenticated;
create or replace function public.goal_notification_trigger() returns trigger language plpgsql security definer set search_path=public as $$declare m public.matches;begin
select * into m from matches where id=new.match_id;
if new.event_type='goal' and m.status='live' then
perform notify_club_fans(m.home_club_id,'goal:'||new.id,'שער במשחק!',coalesce(m.home_name,'בית')||' — '||coalesce(m.away_name,'חוץ'),'/match/'||m.id,'goals');
perform notify_club_fans(m.away_club_id,'goal:'||new.id,'שער במשחק!',coalesce(m.home_name,'בית')||' — '||coalesce(m.away_name,'חוץ'),'/match/'||m.id,'goals');
end if;return new;end$$;
create trigger trg_goal_notification after insert on public.match_events for each row execute function public.goal_notification_trigger();
create or replace function public.news_notification_trigger() returns trigger language plpgsql security definer set search_path=public as $$begin
if new.status='published' and old.status is distinct from new.status then perform notify_club_fans(new.club_id,'news:'||new.id,new.title,coalesce(new.summary,''),'/article/'||new.id,case when new.official then 'official_news' else 'important_news' end);end if;return new;end$$;
create trigger trg_news_notification after update of status on public.news_items for each row execute function public.news_notification_trigger();
create or replace function public.match_notification_trigger() returns trigger language plpgsql security definer set search_path=public as $$begin
if new.status='live' and old.status is distinct from new.status then
perform notify_club_fans(new.home_club_id,'start:'||new.id,'המשחק התחיל',coalesce(new.home_name,'בית')||' — '||coalesce(new.away_name,'חוץ'),'/match/'||new.id,'match_alerts');
perform notify_club_fans(new.away_club_id,'start:'||new.id,'המשחק התחיל',coalesce(new.home_name,'בית')||' — '||coalesce(new.away_name,'חוץ'),'/match/'||new.id,'match_alerts');
end if;return new;end$$;
create trigger trg_match_notification after update of status on public.matches for each row execute function public.match_notification_trigger();
commit;
