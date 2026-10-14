import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {publicFootballPayload} from './privacy.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const goalKey=Deno.env.get('GOAL_API_KEY');
const db=createClient(url,serviceKey);
const season=(Deno.env.get('GOAL_SEASON')||'2026/2027').replace('/','-');
const validId=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
const unwrap=(value:any)=>value?.data ?? value;
const array=(v:any):any[]=>Array.isArray(v)?v: ['items','results','statistics','players','standings','table','rows','groups'].map(k=>v?.[k]).find(Array.isArray)??[];
function number(...vs:any[]){for(const v of vs){if(v===null||v===undefined||v==='')continue;const n=Number(v);if(Number.isFinite(n))return n;}return null;}
async function goal(path:string,ttl:number){
 const cached=await db.from('football_cache').select('payload,expires_at').eq('cache_key',path).maybeSingle();
 if(cached.error)throw Error('Data cache is not configured');
 if(cached.data&&Date.parse(cached.data.expires_at)>Date.now())return cached.data.payload;
 if(!goalKey)throw Error('GOAL API is not configured');
 const response=await fetch('https://api.goal-api.com/v1'+path,{headers:{Authorization:'Bearer '+goalKey},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('GOAL API HTTP '+response.status);
 const payload=unwrap(await response.json());
 const save=await db.from('football_cache').upsert({cache_key:path,payload:payload??{},expires_at:new Date(Date.now()+ttl*1000).toISOString(),updated_at:new Date().toISOString()});
 if(save.error)throw Error('Failed to save provider cache');
 return payload;
}
async function safe(path:string,ttl:number){try{return {data:await goal(path,ttl),error:null};}catch(e){return {data:null,error:e instanceof Error?e.message:'Provider unavailable'};}}
function totals(raw:any){
 let rows=array(raw);if(!rows.length)rows=[raw?.performance??raw?.summary??raw?.totals??raw?.statistics??raw];
 const fields={goals:['goals','totalGoals','playerGoals'],assists:['assists','totalAssists','playerAssists'],minutes:['minutes','minutesPlayed','playerMinutes'],appearances:['appearances','matchPlayed','matchesPlayed','playerMatchPlayed']};
 const out:any={};for(const [key,aliases] of Object.entries(fields)){const values=rows.map(r=>number(...aliases.map(a=>r?.[a]),r?.[key]?.total));out[key]=values.some(v=>v!==null)?values.reduce((a,b)=>a+(b??0),0):null;}
 if(out.minutes===0&&out.appearances>0)out.minutes=null;
 return out;
}
async function clubData(id:string){
 const club=await db.from('clubs').select('*').eq('id',id).eq('active',true).single();if(club.error)throw Error('Club not found');
 const teamId=club.data.goal_team_id||club.data.goal_api_id;if(!validId(teamId))throw Error('Club provider ID is missing');
 const [team,teamStats,matches,players]=await Promise.all([
 safe(`/teams/${teamId}`,86400),safe(`/teams/${teamId}/statistics?season=${season}`,3600),
 db.from('matches').select('goal_league_id,competition,goal_league_year').or(`home_club_id.eq.${id},away_club_id.eq.${id}`),
 db.from('players').select('*').eq('club_id',id).eq('active',true),
 ]);
 if(matches.error||players.error)throw Error('Failed to load club records');
 const competitions=[...new Map((matches.data??[]).filter(m=>validId(m.goal_league_id)).map(m=>[m.goal_league_id,{id:m.goal_league_id,name:m.competition}])).values()];
 const tables=await Promise.all(competitions.map(async c=>({...c,...await safe(`/leagues/${c.id}/standings?season=${season}`,900)})));
 const playerStats:any[]=[];const failures:string[]=[];
 const roster=players.data??[];
 // Bound concurrency, cache player requests for six hours and never replace unknown data with zero.
 for(let i=0;i<roster.length;i+=4){await Promise.all(roster.slice(i,i+4).map(async p=>{
 const pid=p.goal_player_id||p.goal_api_id;if(!validId(pid))return;
 const result=await safe(`/players/${pid}/statistics?season=${season}`,21600);
 if(result.error){failures.push(result.error);return;}
 const stat=totals(result.data);playerStats.push({player_id:p.id,name:p.name_he||p.name,...stat});
 if(Object.values(stat).some(v=>v!==null)){
 const row:any={player_id:p.id,season:season.replace('-','/')};for(const [k,v] of Object.entries(stat))if(v!==null)row[k]=v;
 const existing=await db.from('player_season_stats').select('*').eq('player_id',p.id).eq('season',row.season).maybeSingle();
 const save=existing.data?await db.from('player_season_stats').update(row).eq('id',existing.data.id):await db.from('player_season_stats').insert(row);
 if(save.error)failures.push('Failed to save player statistics');
 }
 }));}
 return {club:club.data,team:team.data,teamStats:teamStats.data,competitions:tables,playerStats,errors:[team.error,teamStats.error,...failures].filter(Boolean),updatedAt:new Date().toISOString()};
}
async function matchData(id:string){
 const match=await db.from('matches').select('*').eq('id',id).single();if(match.error)throw Error('Match not found');
 const pid=match.data.goal_fixture_id||match.data.goal_fixture_api_id;if(!validId(pid))return {errors:['This match has no provider ID'],lineups:null,statistics:null,commentary:null,news:null};
 const live=match.data.status==='live';const ttl=live?30:300;
 const [fixture,lineups,statistics,commentary,news]=await Promise.all([
 safe(`/fixtures/${pid}`,ttl),safe(`/fixtures/${pid}/lineups`,live?30:300),safe(`/fixtures/${pid}/statistics`,ttl),safe(`/fixtures/${pid}/commentary`,ttl),safe(`/news/match/${pid}`,180),
 ]);
 const f=fixture.data;const hs=number(f?.homeTeamScore,f?.homeScore),as=number(f?.awayTeamScore,f?.awayScore);
 if(hs!==null&&as!==null)await db.from('matches').update({home_score:hs,away_score:as,goal_updated_at:new Date().toISOString()}).eq('id',id);
 return {fixture:f,lineups:lineups.data,statistics:statistics.data,commentary:commentary.data,news:news.data,coverage:{lineups:lineups.error,statistics:statistics.error,commentary:commentary.error,news:news.error},errors:[fixture.error,lineups.error,statistics.error,commentary.error,news.error].filter(Boolean),updatedAt:new Date().toISOString()};
}
async function playerData(id:string,selectedSeason:string){
 const player=await db.from('players').select('*').eq('id',id).single();if(player.error)throw Error('Player not found');
 const stored=await db.from('player_season_stats').select('*').eq('player_id',id).eq('season',selectedSeason.replace('-','/')).maybeSingle();
 if(stored.error)throw Error('Player statistics unavailable');
 const pid=player.data.goal_player_id||player.data.goal_api_id;
 const result=validId(pid)?await safe(`/players/${pid}/statistics?season=${selectedSeason}`,21600):{data:null,error:'Provider player ID missing'};
 const current=totals(result.data),known=Object.fromEntries(Object.entries(current).filter(([,v])=>v!==null));
 const stats={...stored.data,...known};
 if(Object.keys(known).length){const row={player_id:id,season:selectedSeason.replace('-','/'),...known};const saved=stored.data?await db.from('player_season_stats').update(row).eq('id',stored.data.id):await db.from('player_season_stats').insert(row);if(saved.error)throw Error('Player statistics save failed');}
 const cached=validId(pid)?await db.from('football_cache').select('updated_at').eq('cache_key',`/players/${pid}/statistics?season=${selectedSeason}`).maybeSingle():{data:null};
 return {player:player.data,stats,season:selectedSeason.replace('-','/'),source:'GOAL API',updatedAt:cached.data?.updated_at??null,error:result.error};
}
Deno.serve(async request=>{
 const origin=request.headers.get('origin')??'';const allowed=['https://fhfpm8x522-sys.github.io','http://127.0.0.1:4173','http://localhost:5173'];
 const headers={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:'https://fhfpm8x522-sys.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
 if(request.method==='OPTIONS')return new Response('ok',{headers});
 if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers});
 const token=request.headers.get('authorization')?.replace(/^Bearer /i,'');
 if(!token)return Response.json({error:'Authentication required'},{status:401,headers});
 let user:any=(await db.auth.getUser(token)).data.user;
 if(!user){
 const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:'Bearer '+token}}});
 // This server-only table has no client grants or policies; a successful read
 // independently validates an existing service_role credential in Postgres.
 const privileged=await caller.from('football_cache').select('cache_key').limit(1);
 user=!privileged.error;
 }
 if(!user)return Response.json({error:'Authentication required'},{status:401,headers});
 try{const {mode,id,season:requestedSeason}=await request.json();if(mode==='push-config')return Response.json({publicKey:Deno.env.get('VAPID_PUBLIC_KEY')??null},{headers});if(!validId(id)||!['club','match','player'].includes(mode))return Response.json({error:'Invalid request'},{status:400,headers});
 const selectedSeason=requestedSeason?String(requestedSeason).replace('/','-'):season;
 if(!/^20\d{2}-20\d{2}$/.test(selectedSeason)||Number(selectedSeason.slice(5))-Number(selectedSeason.slice(0,4))!==1)return Response.json({error:'Invalid season'},{status:400,headers});
 const payload=mode==='club'?await clubData(id):mode==='player'?await playerData(id,selectedSeason):await matchData(id);
 return Response.json(publicFootballPayload(payload,[serviceKey,goalKey]),{headers});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Football data unavailable'},{status:502,headers});}
});
