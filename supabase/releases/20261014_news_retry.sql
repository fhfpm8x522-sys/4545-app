begin;
alter table public.news_collection_runs add column if not exists attempts integer not null default 1;
alter table public.news_collection_runs add column if not exists previous_errors jsonb not null default '[]';
create or replace function public.claim_news_collection() returns uuid language plpgsql security definer set search_path=public,pg_temp as $$declare rid uuid;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 insert into news_collection_runs(slot) values(date_trunc('hour',now()))
 on conflict(slot) do update set status='running',finished_at=null,attempts=news_collection_runs.attempts+1,
 previous_errors=news_collection_runs.previous_errors||jsonb_build_array(jsonb_build_object('finished_at',news_collection_runs.finished_at,'error',news_collection_runs.error)),error=null
 where news_collection_runs.status='partial' and news_collection_runs.inserted=0 and news_collection_runs.attempts<3 and news_collection_runs.finished_at<now()-interval '10 minutes'
 returning id into rid;return rid;
end$$;
commit;
