import {providerCacheUsable,matchProviderTtl} from '../football-cache-policy.mjs';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {deriveGuessFacts} from './model.mjs';
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,goalKey=Deno.env.get('GOAL_API_KEY');
const db=createClient(url,key);
async function provider(path:string,ttl:number){
 const cached=await db.from('football_cache').select('*').eq('cache_key',path).maybeSingle();
 if(cached.error)throw Error('Cache unavailable');
 if(providerCacheUsable(cached.data,ttl)){if(cached.data.payload?._4545_denied)throw Error('Provider endpoint unavailable');return cached.data.payload;}
 if(!goalKey)throw Error('Provider unavailable');
 const budget=await db.rpc('claim_goal_path',{p_path:path});if(budget.error||budget.data!==true)throw Error('Provider request budget paused');
 const r=await fetch('https://api.goal-api.com/v1'+path,{headers:{Authorization:'Bearer '+goalKey},signal:AbortSignal.timeout(15000)});
 if(r.status===429)await db.rpc('pause_goal_requests',{p_seconds:86400});
 if(!r.ok){if([401,403,404].includes(r.status))await db.from('football_cache').upsert({cache_key:path,payload:{_4545_denied:r.status},expires_at:new Date(Date.now()+86400000).toISOString(),updated_at:new Date().toISOString()});throw Error('Provider HTTP '+r.status);}
 const raw=await r.json(),payload=raw.data??raw;
 const save=await db.from('football_cache').upsert({cache_key:path,payload,expires_at:new Date(Date.now()+ttl*1000).toISOString(),updated_at:new Date().toISOString()});if(save.error)throw Error('Cache write failed');return payload;
}
async function refresh(match:any){
 const recent=await db.from('fan_guess_facts').select('checked_at').eq('match_id',match.id).maybeSingle();
 const final=match.status==='finished',ttl=final?86400:match.status==='live'?60:600;
 if(recent.data&&Date.parse(recent.data.checked_at)>Date.now()-(final?6*3600000:45000))return {matchId:match.id,coverage:'cached',updatedAt:recent.data.checked_at};
 const id=match.goal_fixture_id||match.goal_fixture_api_id;if(!id||!/^[a-zA-Z0-9_-]+$/.test(id))return {matchId:match.id,coverage:'no_provider_id'};
 const [fixture,lineups,events,cards,players]=await Promise.all([
  provider(`/fixtures/${id}`,ttl).catch(()=>null),
  provider(`/fixtures/${id}/lineups`,ttl).catch(()=>null),
  provider(`/fixtures/${id}/events`,ttl).catch(()=>null),
  provider(`/fixtures/${id}/cards`,ttl).catch(()=>null),
  db.from('players').select('id,goal_player_id,goal_api_id').in('club_id',[match.home_club_id,match.away_club_id].filter(Boolean)),
 ]);
 if(players.error)throw Error('Roster unavailable');
 if(!fixture&&!lineups&&!events&&!cards)return {matchId:match.id,coverage:'provider_unavailable',updatedAt:recent.data?.checked_at??null};
 const rows=(raw:any,kind:string)=>Array.isArray(raw)?raw:Array.isArray(raw?.[kind])?raw[kind]:Array.isArray(raw?.data)?raw.data:null;
 const goalEvents=rows(events,'events')?.map((e:any)=>({...e,type:e.type??e.eventType??'goal'}));
 const cardEvents=rows(cards,'cards');
 const finished=['FINISHED','FT','AFTER EXTRA TIME','AET'].includes(String(fixture?.matchStatus??fixture?.status).toUpperCase());
 let scoringMatch=match;
 if(finished&&Date.parse(match.kickoff)<Date.now()&&['scheduled','live'].includes(match.status)){
  const update=await db.from('matches').update({status:'finished',goal_updated_at:new Date().toISOString()}).eq('id',match.id);
  if(update.error)throw Error('Match status update failed');scoringMatch={...match,status:'finished'};
 }
 const facts=deriveGuessFacts(scoringMatch,fixture?{...fixture,events:goalEvents,cards:cardEvents}:null,lineups,players.data??[]);
 const save=await db.rpc('settle_fan_guess_facts',{p_match_id:match.id,p_facts:facts});if(save.error)throw Error('Scoring unavailable');
 return {matchId:match.id,coverage:Object.keys(facts),updatedAt:new Date().toISOString()};
}
Deno.serve(async request=>{
 const origin=request.headers.get('origin')??'';
 const headers={'Access-Control-Allow-Origin':['https://fhfpm8x522-sys.github.io','http://localhost:5173','http://127.0.0.1:4173'].includes(origin)?origin:'https://fhfpm8x522-sys.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
 if(request.method==='OPTIONS')return new Response('ok',{headers});
 if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers});
 const token=request.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)return Response.json({error:'Authentication required'},{status:401,headers});
 const user=(await db.auth.getUser(token)).data.user;
 let server=false;if(!user){const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:'Bearer '+token}}});server=!(await caller.from('football_cache').select('cache_key').limit(1)).error;}
 if(!user&&!server)return Response.json({error:'Authentication required'},{status:401,headers});
 try{
  const body=await request.json();if(body.mode==='settle'){
   if(!server)return Response.json({error:'Forbidden'},{status:403,headers});
   const candidates=await db.rpc('fan_guess_refresh_candidates');if(candidates.error)throw Error('Scheduler unavailable');
   const rows=candidates.data??[],results=[];
   for(let i=0;i<rows.length;i+=2)results.push(...await Promise.all(rows.slice(i,i+2).map(refresh)));
   return Response.json({results},{headers});
  }
  if(body.mode!=='match'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.match_id??''))return Response.json({error:'Invalid request'},{status:400,headers});
  const match=await db.from('matches').select('*').eq('id',body.match_id).single();if(match.error)return Response.json({error:'Match not found'},{status:404,headers});
  return Response.json(await refresh(match.data),{headers});
 }catch{return Response.json({error:'Scoring data temporarily unavailable'},{status:502,headers});}
});
