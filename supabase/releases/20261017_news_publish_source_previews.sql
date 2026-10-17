-- Additive release only. No historical migrations or destructive data resets.
begin;
create table if not exists public.news_publication_backups_20261017 as select id,to_jsonb(n) previous_row,now() backed_up_at from public.news_items n;
alter table public.news_publication_backups_20261017 enable row level security;
revoke all on public.news_publication_backups_20261017 from public,anon,authenticated;
grant select on public.news_publication_backups_20261017 to service_role;
alter table public.news_items drop constraint if exists news_items_image_kind_check;
alter table public.news_items add constraint news_items_image_kind_check check(image_kind in('context','brand','source','source_preview'));
alter table public.news_items add column if not exists image_checked_at timestamptz;
alter table public.news_items add column if not exists image_attempts int not null default 0;

create or replace function public.news_content_ready(p public.news_items) returns boolean language sql immutable set search_path=public,pg_temp as $$
 select length(trim(coalesce(p.title,'')))>=8 and (news_meaningful_text(p.body) or news_meaningful_text(p.summary))
 and coalesce(p.image_url,'') ~ '^https://' and coalesce(p.image_source_url,'') ~ '^https://'
 and length(trim(coalesce(p.image_credit,'')))>0 and (
 (p.image_kind='source_preview' and p.image_url=p.image_candidate_url and p.image_source_url=p.source_url and length(trim(coalesce(p.source_name,'')))>0)
 or (p.image_kind='source' and p.image_rights_verified and (length(trim(coalesce(p.image_license,'')))>0 or coalesce(p.image_license_url,'') ~ '^https://')));
$$;

create or replace function public.require_news_content() returns trigger language plpgsql set search_path=public,pg_temp as $$begin
 if new.status='published' and auth.role()='authenticated' and (not public.has_permission('news.publish') or not public.has_club_scope(new.club_id)) then raise exception 'אין הרשאת פרסום למועדון זה';end if;
 if new.status in('approved','published') and (tg_op='INSERT' or new.status is distinct from old.status or new.title is distinct from old.title or new.summary is distinct from old.summary or new.body is distinct from old.body or new.image_url is distinct from old.image_url or new.image_kind is distinct from old.image_kind or new.image_candidate_url is distinct from old.image_candidate_url or new.image_rights_verified is distinct from old.image_rights_verified or new.image_credit is distinct from old.image_credit or new.image_source_url is distinct from old.image_source_url or new.image_license is distinct from old.image_license or new.image_license_url is distinct from old.image_license_url) and news_content_ready(new) is not true then raise exception 'יש להשלים תוכן משמעותי ותמונת כתבה מהמקור או תמונה מורשית עם קרדיט לפני אישור ופרסום';end if;
 return new;
end$$;

create or replace function public.apply_news_source_preview(p_id uuid,p_content jsonb) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$declare item news_items;candidate text;credit text;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 candidate:=left(trim(coalesce(p_content->>'image_candidate_url','')),2000);
 if candidate !~ '^https://[^/@[:space:]]+\.[^/@[:space:]]+/' or candidate ~ '[[:space:]]' then return false;end if;
 select * into item from news_items where id=p_id for update;if not found then return false;end if;
 if item.source_url !~ '^https://' or trim(coalesce(item.source_name,''))='' then return false;end if;
 -- An editor's separately licensed source upload remains untouched.
 if item.image_kind='source' and item.image_rights_verified then return false;end if;
 credit:=left(coalesce(nullif(trim(p_content->>'image_attribution'),''),item.source_name),300);
 update news_items set image_candidate_url=candidate,image_url=candidate,image_kind='source_preview',image_source_url=item.source_url,image_credit=credit,image_license=null,image_license_url=null,image_rights_verified=false,image_checked_at=now() where id=p_id;
 return true;
end$$;

create or replace function public.claim_news_image_enrichment(p_limit int default 12) returns table(id uuid,source_url text) language plpgsql security definer set search_path=public,pg_temp as $$begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 return query with candidates as (select n.id from news_items n where n.ai_group_key like 'gdelt:%' and n.status in('pending','approved','published') and n.image_kind is distinct from 'source_preview' and not(coalesce(n.image_kind,'')='source' and n.image_rights_verified) and n.image_attempts<3 and (n.image_checked_at is null or n.image_checked_at<now()-interval '1 hour') order by case n.status when 'published' then 0 when 'approved' then 1 else 2 end,n.created_at desc limit greatest(1,least(p_limit,20)) for update skip locked), claimed as (update news_items n set image_attempts=n.image_attempts+1,image_checked_at=now() from candidates c where n.id=c.id returning n.id,n.source_url) select * from claimed;
end$$;

create or replace function public.repair_news_content(p_id uuid,p_content jsonb) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$declare item news_items;excerpt text;candidate text;use_preview boolean;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Forbidden';end if;
 select * into item from news_items where id=p_id for update;if not found then return false;end if;
 if coalesce(item.ai_group_key,'') not like 'gdelt:%' or not news_is_workflow_text(item.body) or not news_is_workflow_text(item.summary) then return false;end if;
 excerpt:=left(trim(coalesce(p_content->>'source_excerpt','')),200);if not news_meaningful_text(excerpt) then return false;end if;
 candidate:=left(trim(coalesce(p_content->>'image_candidate_url','')),2000);
 use_preview:=candidate ~ '^https://[^/@[:space:]]+\.[^/@[:space:]]+/' and candidate !~ '[[:space:]]' and item.source_url ~ '^https://' and trim(coalesce(item.source_name,''))<>'' and not(coalesce(item.image_kind,'')='source' and item.image_rights_verified);
 -- Content and photo change together so publication validation never sees a
 -- half-repaired article. Preserve separately licensed editorial uploads.
 update news_items set summary=excerpt,body=null,source_excerpt=excerpt,content_kind='source_excerpt',source_published_at=coalesce((p_content->>'source_published_at')::timestamptz,source_published_at),source_author=left(p_content->>'source_author',100),content_checked_at=now(),
 image_candidate_url=case when use_preview then candidate else image_candidate_url end,image_url=case when use_preview then candidate else image_url end,image_kind=case when use_preview then 'source_preview' else image_kind end,image_source_url=case when use_preview then source_url else image_source_url end,image_credit=case when use_preview then left(coalesce(nullif(trim(p_content->>'image_attribution'),''),source_name),300) else image_credit end,image_license=case when use_preview then null else image_license end,image_license_url=case when use_preview then null else image_license_url end,image_rights_verified=case when use_preview then false else image_rights_verified end,image_checked_at=case when use_preview then now() else image_checked_at end where id=p_id;
 return true;
end$$;

create or replace function public.approve_and_publish_news(p_id uuid) returns public.news_items language plpgsql security definer set search_path=public,pg_temp as $$declare item news_items;published news_items;begin
 if auth.uid() is null or not public.has_permission('news.publish') then raise exception 'אין הרשאת פרסום';end if;
 select * into item from news_items where id=p_id for update;if not found then raise exception 'הכתבה לא נמצאה';end if;
 if not public.has_club_scope(item.club_id) then raise exception 'אין הרשאת פרסום למועדון זה';end if;
 if item.status='published' then return item;end if;
 if item.status not in('pending','approved') then raise exception 'יש להחזיר את הכתבה לבדיקה לפני פרסום';end if;
 if item.status='pending' and not public.has_permission('news.review') then raise exception 'אין הרשאת אישור כתבה';end if;
 if news_content_ready(item) is not true then raise exception 'יש להשלים תוכן משמעותי ותמונת כתבה מהמקור או תמונה מורשית עם קרדיט לפני אישור ופרסום';end if;
 update news_items set status='published',approved_by=coalesce(case when item.status='pending' then auth.uid() else item.approved_by end,auth.uid()),published_at=coalesce(item.published_at,now()) where id=p_id returning * into published;
 insert into audit_log(actor_id,action,entity_type,entity_id,club_id,before_data,after_data) values(auth.uid(),'news.approve_and_publish','news_items',p_id::text,item.club_id,to_jsonb(item),to_jsonb(published));
 return published;
end$$;
revoke all on function public.approve_and_publish_news(uuid) from public,anon;
grant execute on function public.approve_and_publish_news(uuid) to authenticated;
revoke all on function public.apply_news_source_preview(uuid,jsonb),public.claim_news_image_enrichment(int) from public,anon,authenticated;
grant execute on function public.apply_news_source_preview(uuid,jsonb),public.claim_news_image_enrichment(int) to service_role;
-- Reuse already collected publisher metadata, without changing editorial text/status.
set local request.jwt.claim.role='service_role';
select public.apply_news_source_preview(n.id,jsonb_build_object('image_candidate_url',n.image_candidate_url)) from public.news_items n where n.ai_group_key like 'gdelt:%' and coalesce(n.image_candidate_url,'') ~ '^https://' and n.image_kind in('context','brand');
select public.apply_news_source_preview('8927cbe3-6b2f-4d00-b9ac-bdc60bc3a764','{"image_candidate_url":"https://images.wcdn.co.il/f_auto,q_auto,w_1200,t_54/4/1/1/0/4110015-46.jpg","image_attribution":"רויטרס · באמצעות וואלה ספורט"}'::jsonb);
select public.apply_news_source_preview('08096893-e388-49ba-a050-90c5ca4ef01b','{"image_candidate_url":"https://www.htafc.co.il/wp-content/uploads/2026/10/hta-339.jpg","image_attribution":"האתר הרשמי של הפועל תל אביב"}'::jsonb);
commit;
