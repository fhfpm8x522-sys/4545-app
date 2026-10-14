begin;
create function public.football_provider_status() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$select jsonb_build_object('provider','GOAL','paused',coalesce(l.paused_until>now(),false) or (select count(*) from football_provider_requests r where r.provider='goal' and r.sent_at>now()-interval '24 hours')>=l.rolling_cap,'paused_until',l.paused_until) from football_provider_limits l where l.provider='goal'$$;
revoke all on function public.football_provider_status() from public;
grant execute on function public.football_provider_status() to anon,authenticated,service_role;
create function public.admin_provider_budget() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$begin
 if not exists(select 1 from staff_memberships m join roles r on r.id=m.role_id where m.user_id=auth.uid() and m.suspended_at is null and r.key='owner') then raise exception 'Forbidden';end if;
 return (select jsonb_build_object('provider','GOAL','rolling_cap',l.rolling_cap,'paused_until',l.paused_until,'reason',l.reason,'used_24h',(select count(*) from football_provider_requests where provider='goal' and sent_at>now()-interval '24 hours')) from football_provider_limits l where l.provider='goal');
end$$;
revoke all on function public.admin_provider_budget() from public,anon;
grant execute on function public.admin_provider_budget() to authenticated;
commit;
