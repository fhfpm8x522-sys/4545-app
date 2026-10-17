begin;
create table public.news_content_backups_20261017 as select id,to_jsonb(n) as previous_row,now() as backed_up_at from public.news_items n;
alter table public.news_content_backups_20261017 enable row level security;
revoke all on public.news_content_backups_20261017 from anon,authenticated;
grant select on public.news_content_backups_20261017 to service_role;
alter table public.news_items add column content_kind text not null default 'original' check(content_kind in('original','source_excerpt'));
alter table public.news_items add column source_excerpt text;
alter table public.news_items add column source_published_at timestamptz;
alter table public.news_items add column source_author text;
alter table public.news_items add column image_candidate_url text;
alter table public.news_items add column image_kind text check(image_kind in('context','brand','source'));
alter table public.news_items add column image_credit text;
alter table public.news_items add column image_source_url text;
alter table public.news_items add column image_license text;
alter table public.news_items add column image_license_url text;
alter table public.news_items add column image_rights_verified boolean not null default false;
alter table public.news_items add column content_checked_at timestamptz;
alter table public.news_items add column content_attempts int not null default 0;
update public.news_items set content_kind='source_excerpt' where ai_group_key like 'gdelt:%' and summary like 'ידיעה שנמצאה באיסוף%' and coalesce(trim(body),'')='';
create function public.news_is_workflow_text(p_text text) returns boolean language sql immutable set search_path=public,pg_temp as $$select trim(coalesce(p_text,''))='' or coalesce(p_text,'') ~ '^[[:space:]]*(ידיעה שנמצאה באיסוף חדשות|יש לבדוק את המקור לפני אישור|ממתין לאישור)'$$;
create function public.news_meaningful_text(p_text text) returns boolean language sql immutable set search_path=public,pg_temp as $$select length(trim(coalesce(p_text,'')))>=40 and coalesce(p_text,'') !~ '^[[:space:]]*(ידיעה שנמצאה באיסוף חדשות|יש לבדוק את המקור לפני אישור|ממתין לאישור)'$$;
create function public.news_content_ready(p public.news_items) returns boolean language sql immutable set search_path=public,pg_temp as $$select length(trim(coalesce(p.title,'')))>=8 and (news_meaningful_text(p.body) or news_meaningful_text(p.summary)) and coalesce(p.image_url,'') ~ '^https://' and p.image_rights_verified and length(trim(coalesce(p.image_credit,'')))>0 and coalesce(p.image_source_url,'') ~ '^https://' and (length(trim(coalesce(p.image_license,'')))>0 or coalesce(p.image_license_url,'') ~ '^https://')$$;
create function public.require_news_content() returns trigger language plpgsql set search_path=public,pg_temp as $$begin
 if new.status in('approved','published') and (tg_op='INSERT' or new.status is distinct from old.status or new.title is distinct from old.title or new.summary is distinct from old.summary or new.body is distinct from old.body or new.image_url is distinct from old.image_url or new.image_rights_verified is distinct from old.image_rights_verified or new.image_credit is distinct from old.image_credit or new.image_source_url is distinct from old.image_source_url or new.image_license is distinct from old.image_license or new.image_license_url is distinct from old.image_license_url) and news_content_ready(new) is not true then raise exception 'יש להשלים תוכן משמעותי ותמונה עם קרדיט והרשאה לפני אישור או פרסום';end if;return new;
end$$;
create trigger news_content_before_publication before insert or update on public.news_items for each row execute function public.require_news_content();
create function public.news_context_image(p_club uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce((select jsonb_build_object('image_url',s.exterior_image_url,'image_kind','context','image_credit',s.image_credit,'image_source_url',s.image_source_url,'image_license',s.image_license_url,'image_license_url',s.image_license_url,'image_rights_verified',true) from stadiums s join clubs c on c.id=p_club and c.stadium=s.provider_name where s.exterior_image_url is not null and s.image_credit is not null and s.image_source_url is not null and s.image_license_url is not null limit 1),jsonb_build_object('image_url','https://fhfpm8x522-sys.github.io/4545-app/email-stadium-4545.png','image_kind','brand','image_credit','45:45 · תמונת מותג שהועלתה בידי בעל האתר','image_source_url','https://fhfpm8x522-sys.github.io/4545-app/','image_license','חומר מותג שנמסר לפרויקט 45:45','image_rights_verified',true));
$$;
create function public.repair_news_content(p_id uuid,p_content jsonb) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$declare item news_items;pic jsonb;excerpt text;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 select * into item from news_items where id=p_id for update;if not found then return false;end if;
 if coalesce(item.ai_group_key,'') not like 'gdelt:%' or not news_is_workflow_text(item.body) or not news_is_workflow_text(item.summary) then return false;end if;
 excerpt:=left(trim(coalesce(p_content->>'source_excerpt','')),200);
 if not news_meaningful_text(excerpt) then return false;end if;
 pic:=case when item.image_rights_verified then jsonb_build_object('image_url',item.image_url,'image_kind',item.image_kind,'image_credit',item.image_credit,'image_source_url',item.image_source_url,'image_license',item.image_license,'image_license_url',item.image_license_url) else news_context_image(item.club_id) end;
 update news_items set summary=excerpt,body=excerpt,source_excerpt=excerpt,content_kind='source_excerpt',source_published_at=coalesce((p_content->>'source_published_at')::timestamptz,source_published_at),source_author=left(p_content->>'source_author',100),image_candidate_url=case when p_content->>'image_candidate_url' ~ '^https://' then left(p_content->>'image_candidate_url',2000) else image_candidate_url end,image_url=pic->>'image_url',image_kind=pic->>'image_kind',image_credit=pic->>'image_credit',image_source_url=pic->>'image_source_url',image_license=pic->>'image_license',image_license_url=pic->>'image_license_url',image_rights_verified=true,content_checked_at=now() where id=p_id;
 return true;
end$$;
create function public.claim_news_enrichment(p_limit int default 12) returns table(id uuid,source_url text) language plpgsql security definer set search_path=public,pg_temp as $$begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 return query with candidates as (select n.id from news_items n where n.ai_group_key like 'gdelt:%' and n.status in('pending','approved','published') and (news_is_workflow_text(n.body) and news_is_workflow_text(n.summary)) and n.content_attempts<3 and (n.content_checked_at is null or n.content_checked_at<now()-interval '1 hour') order by case n.status when 'published' then 0 when 'approved' then 1 else 2 end,n.created_at desc limit greatest(1,least(p_limit,20)) for update skip locked), claimed as (update news_items n set content_attempts=n.content_attempts+1,content_checked_at=now() from candidates c where n.id=c.id returning n.id,n.source_url) select * from claimed;
end$$;
create or replace function public.ingest_news_candidate(p_club uuid,p_candidate jsonb,p_link_hash text,p_title_hash text) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$declare rid uuid;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 if p_link_hash !~ '^[a-f0-9]{64}$' or p_title_hash !~ '^[a-f0-9]{64}$' or length(p_candidate->>'title') not between 8 and 300 or coalesce(p_candidate->>'source_url','') !~ '^https?://' then raise exception 'Invalid candidate';end if;
 if not exists(select 1 from clubs where id=p_club and active) then raise exception 'Invalid club';end if;
 perform pg_advisory_xact_lock(hashtextextended('4545-news:'||p_club,0));
 select news_id into rid from news_import_keys where club_id=p_club and (link_hash=p_link_hash or title_hash=p_title_hash) limit 1;
 if found then if rid is not null then perform repair_news_content(rid,p_candidate);end if;return false;end if;
 select id into rid from news_items where club_id=p_club and (source_url=p_candidate->>'source_url' or lower(trim(title))=lower(trim(p_candidate->>'title'))) limit 1;
 if rid is not null then insert into news_import_keys(club_id,link_hash,title_hash,news_id) values(p_club,p_link_hash,p_title_hash,rid);perform repair_news_content(rid,p_candidate);return false;end if;
 insert into news_items(club_id,title,summary,source_name,source_url,source_kind,category,official,status,ai_group_key,content_kind) values(p_club,p_candidate->>'title',null,left(p_candidate->>'source_name',100),p_candidate->>'source_url','report','general',false,'pending','gdelt:'||p_link_hash,'source_excerpt') returning id into rid;
 perform repair_news_content(rid,p_candidate);
 insert into news_import_keys(club_id,link_hash,title_hash,news_id) values(p_club,p_link_hash,p_title_hash,rid);return true;
end$$;
revoke all on function public.news_context_image(uuid),public.repair_news_content(uuid,jsonb),public.claim_news_enrichment(int) from public,anon,authenticated;
grant execute on function public.news_context_image(uuid),public.repair_news_content(uuid,jsonb),public.claim_news_enrichment(int) to service_role;
commit;
