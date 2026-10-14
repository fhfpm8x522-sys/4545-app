begin;
create temporary table news_test_context as select (select id from public.profiles limit 1) uid,(select id from public.clubs where active limit 1) club,gen_random_uuid() pending_id,gen_random_uuid() published_id;
grant select on news_test_context to authenticated;
insert into public.news_items(id,club_id,title,body,status,official,source_kind,created_by) select pending_id,club,'rollback-only-news-search','rollback-only-news-search','pending',false,'report',uid from news_test_context;
insert into public.news_items(id,club_id,title,body,status,official,source_kind,created_by) select published_id,club,'rollback-only-news-search','rollback-only-news-search','published',true,'official',uid from news_test_context;
do $$begin
 if not exists(select 1 from news_items where id=(select published_id from news_test_context) and official and source_kind='official') then raise exception 'Official kind mismatch';end if;
 update news_items set source_kind='opinion' where id=(select pending_id from news_test_context);
 if not exists(select 1 from news_items where id=(select pending_id from news_test_context) and not official and source_kind='opinion') then raise exception 'Opinion kind mismatch';end if;
end$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true) from news_test_context;
set local role authenticated;
do $$declare c record;begin
 select * into c from news_test_context;
 if (select count(*) from public.search_club_news(c.club,'rollback-only-news-search'))<>1 then raise exception 'Search leaks unpublished content';end if;
 if exists(select 1 from public.search_club_news(c.club,'rollback-only-news-search') where id=c.pending_id) then raise exception 'Draft exposed';end if;
 insert into public.fan_saved_items(user_id,kind,entity_id) values(c.uid,'article',c.published_id);
 begin insert into public.fan_saved_items(user_id,kind,entity_id) values(c.uid,'article',c.pending_id);raise exception 'Draft bookmark accepted';exception when raise_exception then if sqlerrm<>'Item unavailable' then raise;end if;end;
 if exists(select 1 from public.search_club_news(c.club,chr(39)||' OR true --')) then raise exception 'Search term changed query semantics';end if;
end$$;
rollback;
select jsonb_build_object('passed',true,'rolled_back',true,'published_real_articles',false,'checks',jsonb_build_array('official/opinion consistency','published-only search','draft isolation','published bookmark','draft bookmark denied','literal search punctuation')) as result;
