begin;
create table public.news_collection_runs(id uuid primary key default gen_random_uuid(),slot timestamptz not null unique,started_at timestamptz not null default now(),finished_at timestamptz,status text not null default 'running' check(status in('running','success','partial')),found int not null default 0,inserted int not null default 0,duplicates int not null default 0,error text);
create table public.news_import_keys(club_id uuid not null references public.clubs,link_hash text not null,title_hash text not null,news_id uuid references public.news_items on delete set null,created_at timestamptz not null default now(),primary key(club_id,link_hash),unique(club_id,title_hash));
alter table public.news_collection_runs enable row level security;
alter table public.news_import_keys enable row level security;
create policy "news collector owner read" on public.news_collection_runs for select to authenticated using(exists(select 1 from staff_memberships m join roles r on r.id=m.role_id where m.user_id=auth.uid() and m.suspended_at is null and r.key='owner'));
grant select on public.news_collection_runs to authenticated;
revoke all on public.news_import_keys from anon,authenticated;
create function public.authorize_news_collector() returns boolean language sql stable security definer set search_path=public,pg_temp as $$select auth.role()='service_role'$$;
revoke all on function public.authorize_news_collector() from public,anon;
grant execute on function public.authorize_news_collector() to authenticated,service_role;
create function public.claim_news_collection() returns uuid language plpgsql security definer set search_path=public,pg_temp as $$declare rid uuid;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 insert into news_collection_runs(slot) values(date_trunc('hour',now())) on conflict(slot) do nothing returning id into rid;return rid;
end$$;
create function public.ingest_news_candidate(p_club uuid,p_candidate jsonb,p_link_hash text,p_title_hash text) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$declare rid uuid;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 if p_link_hash !~ '^[a-f0-9]{64}$' or p_title_hash !~ '^[a-f0-9]{64}$' or length(p_candidate->>'title') not between 8 and 300 or coalesce(p_candidate->>'source_url','') !~ '^https?://' then raise exception 'Invalid candidate';end if;
 if not exists(select 1 from clubs where id=p_club and active) then raise exception 'Invalid club';end if;
 perform pg_advisory_xact_lock(hashtextextended('4545-news:'||p_club,0));
 if exists(select 1 from news_import_keys where club_id=p_club and (link_hash=p_link_hash or title_hash=p_title_hash)) then return false;end if;
 select id into rid from news_items where club_id=p_club and (source_url=p_candidate->>'source_url' or lower(trim(title))=lower(trim(p_candidate->>'title'))) limit 1;
 if rid is not null then insert into news_import_keys(club_id,link_hash,title_hash,news_id) values(p_club,p_link_hash,p_title_hash,rid);return false;end if;
 insert into news_items(club_id,title,summary,source_name,source_url,source_kind,category,official,status,ai_group_key)
 values(p_club,p_candidate->>'title','ידיעה שנמצאה באיסוף חדשות. יש לבדוק את המקור לפני אישור.',left(p_candidate->>'source_name',100),p_candidate->>'source_url','report','general',false,'pending','gdelt:'||p_link_hash) returning id into rid;
 insert into news_import_keys(club_id,link_hash,title_hash,news_id) values(p_club,p_link_hash,p_title_hash,rid);return true;
end$$;
revoke all on function public.claim_news_collection(),public.ingest_news_candidate(uuid,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.claim_news_collection(),public.ingest_news_candidate(uuid,jsonb,text,text) to service_role;
do $$begin
 if not exists(select 1 from vault.secrets where name='4545_push_service_role') then raise exception 'Existing scheduler credential missing';end if;
 if not exists(select 1 from cron.job where jobname='4545-news-hourly') then
 perform cron.schedule('4545-news-hourly','0 * * * *',$job$
 select net.http_post(url:='https://ohcopmgolzyfxwfqmpmx.supabase.co/functions/v1/news-collector',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='4545_push_service_role')),body:='{}'::jsonb,timeout_milliseconds:=55000);
 $job$);end if;
end$$;
commit;
