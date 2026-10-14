begin;
create index if not exists attendance_user_summary on public.match_attendance(user_id);
create function public.fan_attendance_summary() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 with games as(select m.*,a.supported_club_id from match_attendance a join matches m on m.id=a.match_id where a.user_id=auth.uid()),
 graded as(select case when home_score=away_score then 'draw' when (supported_club_id=home_club_id and home_score>away_score) or (supported_club_id=away_club_id and away_score>home_score) then 'win' else 'loss' end outcome from games where status='finished' and home_score is not null and away_score is not null and supported_club_id in(home_club_id,away_club_id))
 select jsonb_build_object('attended',(select count(*) from games),'graded',(select count(*) from graded),'wins',(select count(*) from graded where outcome='win'),'draws',(select count(*) from graded where outcome='draw'),'losses',(select count(*) from graded where outcome='loss'));
$$;
revoke all on function public.fan_attendance_summary() from public,anon;
grant execute on function public.fan_attendance_summary() to authenticated;
commit;
