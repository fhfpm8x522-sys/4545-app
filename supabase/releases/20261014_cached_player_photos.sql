-- Reuse provider images already received; this performs no external HTTP/API request.
begin;
with cached as (
 select distinct c.cache_key,c.updated_at,r->>'playerId' as pid,r->>'playerKey' as api_id,r->>'playerImage' as image
 from public.football_cache c cross join lateral jsonb_path_query(c.payload,'$.** ? (@.playerImage.type() == "string")') r
 where c.cache_key like '/fixtures/%/lineups'
), candidates as (
 select distinct on (p.id) p.id,c.image,'https://api.goal-api.com/v1'||c.cache_key as source
 from public.players p join cached c on (p.goal_player_id=c.pid or p.goal_api_id=c.api_id)
 where coalesce(p.image_url,'')=''
 and (p.goal_player_id is null or c.pid is null or p.goal_player_id=c.pid)
 and (p.goal_api_id is null or c.api_id is null or p.goal_api_id=c.api_id)
 and c.image ~ '^https://media\.goal-api\.com/badges/players/[a-zA-Z0-9_./%+-]+\.(jpg|png|webp)$'
 order by p.id,c.updated_at desc
), changed as (
 update public.players p set image_url=c.image,image_source_url=c.source,image_credit='GOAL API · תמונת ספק' from candidates c where p.id=c.id returning p.id
) select count(*) as filled_from_existing_cache from changed;
commit;
