import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
const url=Deno.env.get('SUPABASE_URL')!;const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;const goalKey=Deno.env.get('GOAL_API_KEY');
const db=createClient(url,key);const base='https://fhfpm8x522-sys.github.io/4545-app/';
const hosts=['fcm.googleapis.com','push.services.mozilla.com','push.apple.com','notify.windows.com'];
function validEndpoint(value:string){try{const u=new URL(value);return u.protocol==='https:'&&hosts.some(h=>u.hostname===h||u.hostname.endsWith('.'+h));}catch{return false;}}
async function goal(path:string){if(!goalKey)return null;const r=await fetch('https://api.goal-api.com/v1'+path,{headers:{Authorization:'Bearer '+goalKey},signal:AbortSignal.timeout(15000)});if(!r.ok)return null;return (await r.json()).data;}
function num(v:any){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
async function refreshLive(){
 const now=Date.now();const rows=await db.from('matches').select('*').not('goal_fixture_id','is',null).in('status',['scheduled','live']).gte('kickoff',new Date(now-4*3600000).toISOString()).lte('kickoff',new Date(now+90*60000).toISOString()).order('goal_updated_at',{ascending:true,nullsFirst:true}).limit(3);
 if(rows.error)throw rows.error;
 for(const m of rows.data??[]){
 const f=await goal(`/fixtures/${encodeURIComponent(m.goal_fixture_id)}`);if(!f)continue;
 const raw=String(f.matchStatus??f.status??'').toLowerCase();let status=m.status;
 if(/finished|full time|^ft$|after_pen|aet/.test(raw))status='finished';else if(/half|live|^\d+/.test(raw))status='live';else if(/postpon/.test(raw))status='postponed';else if(/cancel/.test(raw))status='cancelled';
 const patch:any={status,goal_updated_at:new Date().toISOString()};const h=num(f.homeTeamScore??f.homeScore),a=num(f.awayTeamScore??f.awayScore);if(h!==null)patch.home_score=h;if(a!==null)patch.away_score=a;const minute=num(f.matchElapsed??f.matchMinute);if(minute!==null)patch.minute=minute;
 const saved=await db.from('matches').update(patch).eq('id',m.id);if(saved.error)throw saved.error;
 if(status==='live'||status==='finished'){
 const events=await goal(`/fixtures/${encodeURIComponent(m.goal_fixture_id)}/events`);const goals=Array.isArray(events)?events.filter(e=>String(e.eventType??e.type??'').toLowerCase()==='goal'):events?.goals??events?.goalscorer??[];
 for(const e of goals){const minute=parseInt(String(e.minute??e.time??''));const side=String(e.teamSide??e.side??e.team??(e.homeScorer?'home':'away')).toLowerCase();const name=e.playerName??e.scorerName??e.homeScorer??e.awayScorer??null;
 if(typeof name!=='string'||!Number.isFinite(minute)||!['home','away'].includes(side))continue;
 const providerId=side==='home'?e.homeScorerId:e.awayScorerId;
 const providerAssist=side==='home'?e.homeAssistId:e.awayAssistId;
 const assistName=e.assistName??(side==='home'?e.homeAssist:e.awayAssist)??null;
 const lookup=async(pid:any)=>{if(!pid)return null;const p=await db.from('players').select('id,name_he,name').or(`goal_player_id.eq.${String(pid).replace(/[^a-zA-Z0-9_-]/g,'')},goal_api_id.eq.${String(pid).replace(/[^a-zA-Z0-9_-]/g,'')}`).limit(1).maybeSingle();return p.data;};
 const player=await lookup(providerId??e.playerId);const assist=await lookup(providerAssist??e.assistId);
 const eventId=JSON.stringify([m.goal_fixture_id,'goal',minute,side,player?.id??name,assist?.id??assistName]);
 const prior=await db.from('match_events').select('id').eq('match_id',m.id).eq('event_type','goal').eq('minute',minute).eq('team_side',side).eq('goal_event_id',eventId).limit(1);if(prior.data?.length)continue;
 const res=await db.from('match_events').upsert({match_id:m.id,event_type:'goal',minute,team_side:side,player_id:player?.id??null,player_name:player?.name_he??player?.name??name,secondary_player_id:assist?.id??null,secondary_player_name:assist?.name_he??assist?.name??assistName,goal_event_id:eventId},{onConflict:'goal_event_id',ignoreDuplicates:true});if(res.error)console.error('Live event save failed');
 }
 }
 if(status==='scheduled'||status==='live'){
 const lineups=await goal(`/fixtures/${encodeURIComponent(m.goal_fixture_id)}/lineups`);
 if(lineups&&(Array.isArray(lineups.startingLineups)&&lineups.startingLineups.length||lineups.home?.startingLineups?.length||lineups.away?.startingLineups?.length)){
 for(const club of [m.home_club_id,m.away_club_id])if(club)await db.rpc('notify_club_fans',{p_club:club,p_key:'lineups:'+m.id,p_title:'ההרכבים פורסמו',p_body:(m.home_name??'בית')+' — '+(m.away_name??'חוץ'),p_url:'/match/'+m.id,p_kind:'lineups'});
 }
 }
 }
}
Deno.serve(async request=>{
 if(request.method!=='POST')return new Response('Unauthorized',{status:401});
 const authorization=request.headers.get('authorization')??'';
 if(!authorization.startsWith('Bearer '))return new Response('Unauthorized',{status:401});
 // The database independently verifies the caller's service_role JWT.
 // This also supports an existing rotated JWT without weakening gateway verification.
 const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}});
 const setup=await caller.rpc('configure_push_dispatch',{p_service_role:authorization.slice(7)});
 if(setup.error)return new Response('Unauthorized',{status:401});
 try{
 const publicKey=Deno.env.get('VAPID_PUBLIC_KEY'),privateKey=Deno.env.get('VAPID_PRIVATE_KEY');if(!publicKey||!privateKey)return Response.json({error:'Push keys are not configured'},{status:503});
 webpush.setVapidDetails(base,publicKey,privateKey);
 await refreshLive();
 const reminders=await db.rpc('queue_match_reminders');if(reminders.error)throw Error('Reminder queue unavailable');
 const claimed=await db.rpc('claim_push_notifications',{p_limit:50});if(claimed.error)throw Error('Push queue unavailable');
 let sent=0,failed=0;
 for(const item of claimed.data??[]){const subs=await db.from('push_subscriptions').select('endpoint,subscription').eq('user_id',item.user_id);let delivered=false;
 for(const row of subs.data??[]){if(!validEndpoint(row.endpoint)){failed++;continue;}
 const route=typeof item.url==='string'&&/^\/(match|article)\/[a-zA-Z0-9-]+$/.test(item.url)?item.url.slice(1):'';
 try{await webpush.sendNotification(row.subscription,JSON.stringify({title:item.title,body:item.body??'',url:base+route,tag:item.event_key}),{TTL:300,timeout:10000});sent++;delivered=true;}catch(e){failed++;if([404,410].includes(e.statusCode))await db.from('push_subscriptions').delete().eq('endpoint',row.endpoint);}
 }
 if(delivered)await db.from('notification_inbox').update({push_sent_at:new Date().toISOString(),push_locked_at:null}).eq('id',item.id);
 }
 return Response.json({success:true,sent,failed});
 }catch{return Response.json({error:'Push dispatch failed'},{status:500});}
});
