begin;
set local request.jwt.claim.role='service_role';
select repair_news_content('172890b8-42d0-4273-a415-42a3725d9b56'::uuid,'{"source_excerpt":"האתר הרשמי של הפועל תל אביב פרסם חידון לקראת קריית שמונה. זהו שאלון אינטראקטיבי, שניתן לפתוח ולהשלים בקישור המקור.","source_published_at":"2026-10-10T12:58:00.000Z"}'::jsonb);
update news_items set summary='האתר הרשמי של הפועל תל אביב פרסם חידון לקראת קריית שמונה. זהו שאלון אינטראקטיבי, שניתן לפתוח ולהשלים בקישור המקור.',body=null,content_kind='original',source_name='הפועל תל אביב — האתר הרשמי',source_published_at='2026-10-10T12:58:00.000Z'::timestamptz where id='172890b8-42d0-4273-a415-42a3725d9b56'::uuid and source_url='https://www.htafc.co.il/%d7%97%d7%99%d7%93%d7%95%d7%9f-%d7%9c%d7%a7%d7%a8%d7%90%d7%aa-%d7%a7%d7%b4%d7%a9/';
commit;
