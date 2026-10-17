-- Run as the SQL-editor database administrator after the 20261017 news releases.
-- All users, roles, memberships, clubs, articles and audit entries below are new
-- transaction-only fixtures. No existing user's account or permissions change.
-- Queue calls may touch existing article retry metadata; every change rolls back.
begin;
set local request.jwt.claim.role='service_role';
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select set_config('request.jwt.claim.sub','',true);

create temporary table news_publication_test_context as
select gen_random_uuid() owner_id,gen_random_uuid() reviewer_id,gen_random_uuid() viewer_id,
 gen_random_uuid() publisher_id,gen_random_uuid() club_id,gen_random_uuid() other_club_id,
 gen_random_uuid() review_role_id,gen_random_uuid() publish_role_id;
create temporary table news_publication_test_items(label text primary key,id uuid not null default gen_random_uuid());
insert into news_publication_test_items(label) values
 ('ready_pending'),('ready_approved'),('rejected'),('missing_text'),('missing_photo'),
 ('direct_update'),('manual_text'),('licensed_photo'),('repair_draft'),('out_of_scope');
create temporary table news_publication_test_results(check_name text primary key);
grant select on news_publication_test_context,news_publication_test_items to anon,authenticated,service_role;
grant select,insert on news_publication_test_results to anon,authenticated,service_role;

insert into public.clubs(id,slug,name_he,active)
select club_id,'rollback-news-'||club_id::text,'מועדון בדיקה זמני בלבד',false from news_publication_test_context
union all select other_club_id,'rollback-news-'||other_club_id::text,'מועדון בדיקה מחוץ להרשאה',false from news_publication_test_context;

insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select account_id,'authenticated','authenticated','rollback-news-'||account_id::text||'@example.invalid',
 '{"provider":"email","providers":["email"]}'::jsonb,
 jsonb_build_object('username','np_'||left(replace(account_id::text,'-',''),18),'display_name','Rollback news fixture'),now(),now()
from news_publication_test_context c cross join lateral
 (values(c.owner_id),(c.reviewer_id),(c.viewer_id),(c.publisher_id)) as accounts(account_id);
insert into public.profiles(id,username,display_name)
select account_id,'np_'||left(replace(account_id::text,'-',''),18),'Rollback news fixture'
from news_publication_test_context c cross join lateral
 (values(c.owner_id),(c.reviewer_id),(c.viewer_id),(c.publisher_id)) as accounts(account_id)
on conflict(id) do nothing;

insert into public.roles(id,key,name_he)
select review_role_id,'np_review_'||review_role_id::text,'Rollback review-only fixture' from news_publication_test_context
union all select publish_role_id,'np_publish_'||publish_role_id::text,'Rollback publish-only fixture' from news_publication_test_context;
insert into public.role_permissions(role_id,permission_id)
select c.review_role_id,p.id from news_publication_test_context c cross join public.permissions p where p.key in('admin.access','news.review')
union all select c.publish_role_id,p.id from news_publication_test_context c cross join public.permissions p where p.key in('admin.access','news.publish');
insert into public.staff_memberships(user_id,role_id)
select c.owner_id,r.id from news_publication_test_context c cross join public.roles r where r.key='owner'
union all select reviewer_id,review_role_id from news_publication_test_context
union all select publisher_id,publish_role_id from news_publication_test_context;
insert into public.staff_club_scopes(membership_id,club_id)
select m.id,c.club_id from news_publication_test_context c join public.staff_memberships m on m.user_id in(c.reviewer_id,c.publisher_id);

insert into public.news_items(id,club_id,title,summary,body,source_url,source_name,status,official,source_kind,
 ai_group_key,image_url,image_candidate_url,image_kind,image_credit,image_source_url,image_rights_verified,
 image_license,image_license_url,approved_by,created_by,created_at)
select i.id,case when i.label='out_of_scope' then c.other_club_id else c.club_id end,
 'כתבת בדיקה זמנית — '||i.label,
 case when i.label='missing_text' then 'ידיעה שנמצאה באיסוף חדשות. יש לבדוק את המקור לפני אישור.'
      when i.label='manual_text' then 'תקציר אישי קצר'
      when i.label='repair_draft' then null
      else 'תקציר בדיקה שמתאר את הכנות הקבוצה לקראת המשחק ואת העדכונים שנמסרו לאוהדים.' end,
 case when i.label='manual_text' then 'עריכה אישית קצרה' else null end,
 'https://www.htafc.co.il/rollback-only/'||i.id::text,'מקור בדיקה זמני',
 case when i.label='ready_approved' then 'approved'::public.content_status
      when i.label='rejected' then 'rejected'::public.content_status else 'pending'::public.content_status end,
 false,'report','gdelt:rollback-'||i.id::text,
 case when i.label not in('missing_photo','manual_text','repair_draft') then 'https://images.example.org/rollback/'||i.id::text||'.jpg' end,
 case when i.label not in('missing_photo','manual_text','repair_draft') then 'https://images.example.org/rollback/'||i.id::text||'.jpg' end,
 case when i.label='licensed_photo' then 'source' when i.label not in('missing_photo','manual_text','repair_draft') then 'source_preview' end,
 case when i.label not in('missing_photo','manual_text','repair_draft') then 'קרדיט לתמונת בדיקה בלבד' end,
 case when i.label not in('missing_photo','manual_text','repair_draft') then 'https://www.htafc.co.il/rollback-only/'||i.id::text end,
 i.label='licensed_photo',case when i.label='licensed_photo' then 'Explicit fixture permission' end,null,
 case when i.label='ready_approved' then c.reviewer_id end,c.owner_id,
 case when i.label='missing_photo' then now()+interval '1 year' else now() end
from news_publication_test_items i cross join news_publication_test_context c;

-- An anonymous caller cannot invoke the publication RPC at all.
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local request.jwt.claim.role='anon';
set local role anon;
do $$declare blocked boolean:=false;begin
 if auth.uid() is not null then raise exception 'Anonymous fixture unexpectedly has a user';end if;
 begin perform public.approve_and_publish_news((select id from news_publication_test_items where label='ready_pending'));
 exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Anonymous caller can publish';end if;
 insert into news_publication_test_results values('anonymous RPC denied');
end$$;
reset role;

-- An ordinary authenticated fan also cannot publish.
select set_config('request.jwt.claims',jsonb_build_object('sub',viewer_id,'role','authenticated')::text,true),
 set_config('request.jwt.claim.sub',viewer_id::text,true) from news_publication_test_context;
set local request.jwt.claim.role='authenticated';
set local role authenticated;
do $$declare blocked boolean:=false;begin
 begin perform public.approve_and_publish_news((select id from news_publication_test_items where label='ready_pending'));
 exception when raise_exception then if sqlerrm like '%אין הרשאת פרסום%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'Unprivileged user can publish';end if;
 insert into news_publication_test_results values('unprivileged authenticated RPC denied');
end$$;
reset role;

-- Review permission and club scope are insufficient for publication, even by a
-- direct update that otherwise passes the existing reviewer RLS policy.
select set_config('request.jwt.claims',jsonb_build_object('sub',reviewer_id,'role','authenticated')::text,true),
 set_config('request.jwt.claim.sub',reviewer_id::text,true) from news_publication_test_context;
set local request.jwt.claim.role='authenticated';
set local role authenticated;
do $$declare blocked boolean:=false;begin
 if not public.has_permission('news.review') or public.has_permission('news.publish') then raise exception 'Review-only fixture misconfigured';end if;
 if auth.role()<>'authenticated' then raise exception 'Direct-update test JWT role is wrong';end if;
 begin perform public.approve_and_publish_news((select id from news_publication_test_items where label='ready_pending'));
 exception when raise_exception then if sqlerrm like '%אין הרשאת פרסום%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'Reviewer can publish using RPC';end if;
 insert into news_publication_test_results values('reviewer RPC denied');
 blocked:=false;
 begin update public.news_items set status='published' where id=(select id from news_publication_test_items where label='direct_update');
 exception when raise_exception then if sqlerrm like '%אין הרשאת פרסום למועדון זה%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'Reviewer direct UPDATE did not invoke the publication permission guard';end if;
 insert into news_publication_test_results values('reviewer direct UPDATE denied by trigger');
 blocked:=false;
 begin perform public.apply_news_source_preview((select id from news_publication_test_items where label='manual_text'),'{"image_candidate_url":"https://images.example.org/forbidden.jpg"}'::jsonb);
 exception when insufficient_privilege then blocked:=true;end;
 if not blocked then raise exception 'Client can apply publisher metadata';end if;
 insert into news_publication_test_results values('source-preview RPC client execute denied');
end$$;
reset role;

-- The owner fixture publishes a complete pending article in one transaction.
select set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true),
 set_config('request.jwt.claim.sub',owner_id::text,true) from news_publication_test_context;
set local request.jwt.claim.role='authenticated';
set local role authenticated;
do $$declare item public.news_items;repeated public.news_items;original_tid tid;blocked boolean;fixture_label text;begin
 item:=public.approve_and_publish_news((select id from news_publication_test_items where label='ready_pending'));
 if item.status<>'published' or item.approved_by is distinct from (select owner_id from news_publication_test_context) or item.published_at is null then raise exception 'Atomic owner publication did not set approval and publication fields';end if;
 if (select count(*) from public.audit_log where entity_type='news_items' and entity_id=item.id::text and action='news.approve_and_publish')<>1 then raise exception 'Publication did not produce exactly one audit entry';end if;
 insert into news_publication_test_results values('owner pending publication sets status approver timestamp and one audit');
 select n.ctid into original_tid from public.news_items n where n.id=item.id;
 repeated:=public.approve_and_publish_news(item.id);
 if repeated.published_at is distinct from item.published_at or repeated.approved_by is distinct from item.approved_by or (select n.ctid from public.news_items n where n.id=item.id) is distinct from original_tid then raise exception 'Repeated publication rewrote an already published article';end if;
 if (select count(*) from public.audit_log where entity_type='news_items' and entity_id=item.id::text and action='news.approve_and_publish')<>1 then raise exception 'Repeated publication duplicated audit';end if;
 insert into news_publication_test_results values('publication idempotent with unchanged row timestamp and audit count');
 blocked:=false;
 begin perform public.approve_and_publish_news((select id from news_publication_test_items where label='rejected'));
 exception when raise_exception then if sqlerrm like '%יש להחזיר את הכתבה לבדיקה%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'Rejected article was published';end if;
 insert into news_publication_test_results values('rejected article publication denied');
 for fixture_label in select unnest(array['missing_text','missing_photo']) loop
  blocked:=false;
  begin perform public.approve_and_publish_news((select id from news_publication_test_items i where i.label=fixture_label));
  exception when raise_exception then if sqlerrm like '%יש להשלים תוכן משמעותי%' then blocked:=true;else raise;end if;end;
  if not blocked then raise exception 'Incomplete article was published: %',fixture_label;end if;
  insert into news_publication_test_results values(fixture_label||' publication denied');
 end loop;
end$$;
reset role;

-- Publish-only staff may publish a reviewed article within their club, while
-- pending approval and a different club remain forbidden.
select set_config('request.jwt.claims',jsonb_build_object('sub',publisher_id,'role','authenticated')::text,true),
 set_config('request.jwt.claim.sub',publisher_id::text,true) from news_publication_test_context;
set local request.jwt.claim.role='authenticated';
set local role authenticated;
do $$declare item public.news_items;blocked boolean:=false;begin
 if not public.has_permission('news.publish') or public.has_permission('news.review') then raise exception 'Publish-only fixture misconfigured';end if;
 item:=public.approve_and_publish_news((select id from news_publication_test_items where label='ready_approved'));
 if item.status<>'published' or item.approved_by is distinct from (select reviewer_id from news_publication_test_context) then raise exception 'Reviewed publication lost the original approver';end if;
 insert into news_publication_test_results values('publish-only role publishes approved article preserving reviewer');
 begin perform public.approve_and_publish_news((select id from news_publication_test_items where label='direct_update'));
 exception when raise_exception then if sqlerrm like '%אין הרשאת אישור כתבה%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'Publish-only role approved a pending article';end if;
 insert into news_publication_test_results values('pending publication requires review permission');
 blocked:=false;
 begin perform public.approve_and_publish_news((select id from news_publication_test_items where label='out_of_scope'));
 exception when raise_exception then if sqlerrm like '%אין הרשאת פרסום למועדון זה%' then blocked:=true;else raise;end if;end;
 if not blocked then raise exception 'Publisher escaped club scope';end if;
 insert into news_publication_test_results values('publisher club scope enforced');
end$$;
reset role;

-- Restore the service JWT explicitly before any metadata or queue operation.
set local request.jwt.claim.role='service_role';
select set_config('request.jwt.claims','{"role":"service_role"}',true),set_config('request.jwt.claim.sub','',true);
do $$declare before_row public.news_items;after_row public.news_items;candidate jsonb;queue_id uuid;claimed uuid[];batch int;begin
 if has_function_privilege('anon','public.apply_news_source_preview(uuid,jsonb)','EXECUTE') or has_function_privilege('authenticated','public.claim_news_image_enrichment(int)','EXECUTE') then raise exception 'Private enrichment execute grant exposed';end if;
 select * into before_row from public.news_items where id=(select id from news_publication_test_items where label='manual_text');
 candidate:=jsonb_build_object('image_candidate_url','https://images.example.org/new-preview.jpg','image_attribution','צילום מקור בדיקה');
 if not public.apply_news_source_preview(before_row.id,candidate) then raise exception 'Service could not apply discovered preview';end if;
 select * into after_row from public.news_items where id=before_row.id;
 if after_row.summary is distinct from before_row.summary or after_row.body is distinct from before_row.body or after_row.title is distinct from before_row.title or after_row.status is distinct from before_row.status or after_row.source_url is distinct from before_row.source_url then raise exception 'Applying photo metadata overwrote manual text status or source';end if;
 if after_row.image_kind is distinct from 'source_preview' or after_row.image_url is distinct from candidate->>'image_candidate_url' or after_row.image_source_url is distinct from before_row.source_url or after_row.image_rights_verified or after_row.image_license is not null or after_row.image_license_url is not null then raise exception 'Source preview incorrectly claimed ownership or a license';end if;
 insert into news_publication_test_results values('service preview preserves manual text status and attribution without invented license');
 select * into before_row from public.news_items where id=(select id from news_publication_test_items where label='ready_pending');
 if not public.apply_news_source_preview(before_row.id,candidate) then raise exception 'Service could not refresh a published source preview';end if;
 select * into after_row from public.news_items where id=before_row.id;
 if after_row.status<>'published' or after_row.summary is distinct from before_row.summary or after_row.body is distinct from before_row.body or after_row.title is distinct from before_row.title or after_row.published_at is distinct from before_row.published_at or after_row.approved_by is distinct from before_row.approved_by then raise exception 'Photo refresh changed published editorial content or publication fields';end if;
 insert into news_publication_test_results values('published preview refresh preserves editorial and publication fields');
 select * into before_row from public.news_items where id=(select id from news_publication_test_items where label='licensed_photo');
 if public.apply_news_source_preview(before_row.id,candidate) then raise exception 'Separately licensed editor photo was replaced';end if;
 if (select to_jsonb(n) from public.news_items n where n.id=before_row.id) is distinct from to_jsonb(before_row) then raise exception 'Licensed editor photo metadata changed';end if;
 insert into news_publication_test_results values('separately licensed editor photo preserved');
 select * into before_row from public.news_items where id=(select id from news_publication_test_items where label='repair_draft');
 candidate:=candidate||jsonb_build_object('source_excerpt','תקציר מקור לבדיקת תיקון המתאר את ההכנות למשחק ואת המידע הרשמי שפורסם לאוהדים.');
 -- Keep the mutation and follow-up read in separate statements: a scalar
 -- subquery in the same IF can be an InitPlan evaluated before the repair call.
 if public.repair_news_content(before_row.id,candidate) is not true then raise exception 'Draft repair with a source preview was not applied';end if;
 if (select public.news_content_ready(n) from public.news_items n where n.id=before_row.id) is not true then raise exception 'Draft repair with a source preview did not become ready';end if;
 if (select status from public.news_items where id=before_row.id)<>'pending' then raise exception 'Repair auto-published a draft';end if;
 insert into news_publication_test_results values('pending text and preview repair becomes ready without publication');
 select id into queue_id from news_publication_test_items where label='missing_photo';
 for batch in 1..3 loop
  select array_agg(q.id) into claimed from public.claim_news_image_enrichment(20) q;
  exit when queue_id=any(coalesce(claimed,array[]::uuid[]));
 end loop;
 if not queue_id=any(coalesce(claimed,array[]::uuid[])) then raise exception 'Ready-text missing-photo fixture not claimed within three bounded queue batches';end if;
 if not exists(select 1 from public.news_items where id=queue_id and image_attempts=1 and image_checked_at is not null and image_url is null and status='pending' and public.news_meaningful_text(summary)) then raise exception 'Photo queue changed editorial fields or failed to reserve missing image';end if;
 insert into news_publication_test_results values('photo queue claims meaningful-content article with missing image');
 if exists(select 1 from public.notification_inbox where user_id not in(select owner_id from news_publication_test_context union all select reviewer_id from news_publication_test_context union all select viewer_id from news_publication_test_context union all select publisher_id from news_publication_test_context) and event_key in(select 'news:'||id::text from news_publication_test_items)) then raise exception 'Fixture publication notified a real user';end if;
 insert into news_publication_test_results values('fixture publications never notify real users');
end$$;

select jsonb_build_object('passed',true,'checks',(select jsonb_agg(check_name order by check_name) from news_publication_test_results),'check_count',(select count(*) from news_publication_test_results),'ends_in_rollback',true,'published_real_articles',false,'real_user_changes',false,'external_requests',0) as result;
rollback;
