begin;
alter policy "public photos visible or own" on public.fan_public_photos using(status='approved' or user_id=auth.uid() or (status='pending' and is_gallery_owner()));
alter policy "public album approved or own read" on storage.objects using(bucket_id='fan-public-albums' and exists(select 1 from fan_public_photos p where p.storage_path=name and (p.status='approved' or p.user_id=auth.uid() or (p.status='pending' and is_gallery_owner()))));
alter policy "public album storage boundary" on storage.objects using(bucket_id<>'fan-public-albums' or exists(select 1 from fan_public_photos p where p.storage_path=name and (p.status='approved' or p.user_id=auth.uid() or (p.status='pending' and is_gallery_owner()))));
commit;
