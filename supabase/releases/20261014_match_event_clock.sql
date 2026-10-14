-- Add explicit provider stoppage time without interpreting old totals.
begin;
alter table public.match_events add column if not exists minute_base numeric,add column if not exists added_minute numeric;
commit;
