begin;
create or replace function public.admin_override_favorite_club(p_user_id uuid,p_club_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare old_club uuid;
begin
 if not public.has_permission('owner.override') then raise exception 'Forbidden';end if;
 if not exists(select 1 from public.clubs where id=p_club_id and active=true) then raise exception 'INVALID_CLUB';end if;
 select favorite_club_id into old_club from public.profiles where id=p_user_id for update;
 if not found then raise exception 'USER_NOT_FOUND';end if;
 if old_club is not distinct from p_club_id then return;end if;
 perform set_config('app.allow_club_change','1',true);
 update public.profiles set favorite_club_id=p_club_id,last_club_change_at=now(),updated_at=now() where id=p_user_id;
 insert into public.club_change_history(user_id,from_club_id,to_club_id,is_initial,overridden_by) values(p_user_id,old_club,p_club_id,false,auth.uid());
 perform public.write_audit('favorite_club.override','profile',p_user_id::text,p_club_id,jsonb_build_object('favorite_club_id',old_club),jsonb_build_object('favorite_club_id',p_club_id));
end $$;
revoke all on function public.admin_override_favorite_club(uuid,uuid) from public,anon;
grant execute on function public.admin_override_favorite_club(uuid,uuid) to authenticated;
commit;
