-- Reconciliation baseline, not a recovered historical filename.
-- Fixture DDL recovered from an unnumbered saved query.
-- Event DDL reconstructed from the verified live constraint.
drop index if exists public.matches_goal_fixture_id_unique;
alter table public.matches drop constraint if exists matches_goal_fixture_id_key;
alter table public.matches add constraint matches_goal_fixture_id_key unique(goal_fixture_id);
drop index if exists public.match_events_goal_event_id_unique;
alter table public.match_events drop constraint if exists match_events_goal_event_id_key;
alter table public.match_events add constraint match_events_goal_event_id_key unique(goal_event_id);
