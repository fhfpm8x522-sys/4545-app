begin;
set local request.jwt.claim.role='service_role';
update football_provider_limits set paused_until=null where provider='goal';
do $$declare before_count bigint;begin
 select count(*) into before_count from football_provider_requests;
 if not claim_goal_path('/__4545_test__/coalesce') then raise exception 'First path blocked unexpectedly';end if;
 if claim_goal_path('/__4545_test__/coalesce') then raise exception 'Duplicate path consumed quota';end if;
 if (select count(*) from football_provider_requests)<>before_count+1 then raise exception 'Quota counter mismatch';end if;
 if not claim_goal_path('/__4545_test__/different') then raise exception 'Distinct path incorrectly coalesced';end if;
 update football_provider_limits set paused_until=now()+interval '1 hour' where provider='goal';
 if claim_goal_path('/__4545_test__/paused') then raise exception 'Paused provider allowed a call';end if;
 if exists(select 1 from football_provider_leases where cache_key='/__4545_test__/paused') then raise exception 'Paused call created a lease';end if;
 if has_function_privilege('authenticated','public.claim_goal_path(text)','EXECUTE') or has_function_privilege('anon','public.claim_goal_path(text)','EXECUTE') then raise exception 'Client can consume provider quota';end if;
end$$;
select '5 request coalescing checks passed; changes rolled back' as result;
rollback;
select rolling_cap,paused_until,(select count(*) from football_provider_requests) as recorded_requests from football_provider_limits where provider='goal';
