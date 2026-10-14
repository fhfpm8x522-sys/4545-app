begin;
-- A researched system entry must not falsely identify a user as its author.
alter table public.match_stadium_seating alter column updated_by drop not null;
alter table public.match_stadium_seating add column if not exists recorded_by text not null default 'user';
insert into public.match_stadium_seating(match_id,stadium_id,home_sectors,away_sectors,source_url,updated_by,recorded_by)
select m.id,s.id,'הקצאת מושבים לפי הכרטיס הרשמי של AZ; אין במאגר פירוט מאומת לכל בלוק.','לפי הודעת AZ מ־30.9.2026 אין כניסה לאוהדי חוץ למשחק הזה. אין יציע מוקצה לאוהדי באר שבע.',
'https://az.nl/inside-az/nieuws/2026/september/geen-uitsupporters-bij-europa-league-wedstrijd-van-az',null,'4545-public-source-research'
from public.matches m join public.stadiums s on s.provider_name=m.stadium
where m.id='d3031284-980d-4455-b02e-d1af485eb18d' and m.stadium='AFAS Stadion' and m.kickoff::date='2026-10-15'
on conflict(match_id) do nothing;
commit;
