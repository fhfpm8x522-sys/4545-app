drop index if exists public.match_events_goal_event_id_unique;
do $$ begin
  if not exists(select 1 from pg_constraint where conname='match_events_goal_event_id_key') then
    alter table public.match_events add constraint match_events_goal_event_id_key unique(goal_event_id);
  end if;
end $$;
