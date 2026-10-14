begin;
alter table public.match_events add column if not exists source_clock text check(length(source_clock)<=24);
commit;
