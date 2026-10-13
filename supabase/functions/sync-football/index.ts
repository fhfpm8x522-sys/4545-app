import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOAL_BASE = "https://api.goal-api.com/v1";
const DEFAULT_SEASON = Deno.env.get("GOAL_SEASON") ?? "2026/2027";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOAL_KEY = Deno.env.get("GOAL_API_KEY") ?? "";
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
type J = Record<string, any>;

const TEAM_HE: Record<string,string> = {
  "Hapoel Be'er Sheva":"הפועל באר שבע","Hapoel Beer Sheva":"הפועל באר שבע","H. Beer Sheva":"הפועל באר שבע",
  "Maccabi Tel Aviv":"מכבי תל אביב","Maccabi Haifa":"מכבי חיפה","Beitar Jerusalem":"בית\"ר ירושלים","Beitar Jerusalem FC":"בית\"ר ירושלים",
  "Hapoel Tel Aviv":"הפועל תל אביב","Maccabi Netanya":"מכבי נתניה","Hapoel Haifa":"הפועל חיפה","Hapoel Jerusalem":"הפועל ירושלים",
  "Bnei Sakhnin":"בני סכנין","Hapoel Petah Tikva":"הפועל פתח תקווה","Ironi Kiryat Shmona":"עירוני קריית שמונה","Kiryat Shmona":"עירוני קריית שמונה","Ironi Tiberias":"עירוני טבריה"
};
const VERIFIED_PLAYER_HE: Record<string,string> = { "943993883":"אמיר גנאח" };

function text(v:any):string|null { if(v===null||v===undefined)return null; const x=String(v).trim(); return x||null; }
function integer(v:any):number|null { if(v===null||v===undefined||v==="")return null; const n=Number(v); return Number.isFinite(n)?Math.trunc(n):null; }
function bool(v:any):boolean { if(typeof v==="boolean")return v; if(typeof v==="number")return v!==0; return ["true","1","yes"].includes(String(v??"").toLowerCase()); }
function first(...vs:any[]){ for(const v of vs) if(v!==null&&v!==undefined&&v!=="") return v; return null; }
function rows(data:any):J[]{ if(Array.isArray(data))return data; for(const v of [data?.data,data?.results,data?.items,data?.fixtures,data?.players,data?.events,data?.cards,data?.substitutions]) if(Array.isArray(v))return v; return []; }
function safeDate(v:any):string|null { const s=text(v); if(!s)return null; if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s; const d=new Date(s); return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10); }
function errorObj(e:any){ if(e instanceof Error)return{message:e.message,stack:e.stack??null}; if(e&&typeof e==="object")return{message:e.message??"Unknown error",code:e.code??null,details:e.details??null,hint:e.hint??null,status:e.status??null,body:e.body??null}; return{message:String(e)}; }
function teamHe(v:any){ const s=text(v)??"קבוצה"; return TEAM_HE[s]??s; }
function competitionHe(v:any){ const s=text(v)??"כדורגל"; const l=s.toLowerCase(); if(l.includes("ligat")||l==="premier league")return"ליגת העל"; if(l.includes("state cup"))return"גביע המדינה"; if(l.includes("toto"))return"גביע הטוטו"; if(l.includes("europa league"))return"הליגה האירופית"; if(l.includes("champions league"))return"ליגת האלופות"; if(l.includes("conference league"))return"הקונפרנס ליג"; return s; }
function matchStatus(v:any,live:any){ if(bool(live))return"live"; const s=String(v??"").toLowerCase(); if(["ft","aet","pen"].includes(s)||s.includes("finished")||s.includes("full time"))return"finished"; if(["1h","2h","ht"].includes(s)||s.includes("live")||s.includes("half"))return"live"; if(s.includes("postpon"))return"postponed"; if(s.includes("cancel"))return"cancelled"; return"scheduled"; }

async function goal(path:string){ const r=await fetch(`${GOAL_BASE}${path}`,{headers:{Authorization:`Bearer ${GOAL_KEY}`,Accept:"application/json"}}); const body=await r.text(); if(!r.ok)throw{message:`GOAL ${r.status} ${path}`,status:r.status,body}; try{return JSON.parse(body)}catch{throw{message:`GOAL invalid JSON ${path}`,body}} }

async function fixturesForTeam(teamId:string){
  const byId=new Map<string,J>(); let pages=0; let repeatedPages=0; let previousFingerprint="";
  for(let page=1;page<=40;page++){
    const data=await goal(`/teams/${teamId}/fixtures?page=${page}`); const list=rows(data); pages=page; if(!list.length)break;
    const ids=list.map(f=>text(first(f.id,f.fixtureId,f.apiId))).filter(Boolean) as string[]; const fp=ids.slice(0,5).join("|")+":"+ids.slice(-5).join("|");
    if(fp&&fp===previousFingerprint){ repeatedPages++; break; } previousFingerprint=fp;
    const before=byId.size; for(const f of list){const id=text(first(f.id,f.fixtureId,f.apiId));if(id)byId.set(id,f);} if(byId.size===before&&page>1){repeatedPages++;break;}
    const totalPages=integer(first(data?.pagination?.totalPages,data?.pagination?.pages,data?.totalPages)); if(totalPages&&page>=totalPages)break;
    const next=first(data?.pagination?.next,data?.next); const hasNext=data?.pagination?.hasNext===true||data?.hasNext===true||!!next; if(totalPages===null&&!hasNext&&list.length===0)break;
  }
  return {fixtures:[...byId.values()],pages,repeatedPages};
}
async function roster(teamId:string){ return rows(await goal(`/teams/${teamId}/players`)); }

function homeId(f:J){return text(first(f.homeTeamId,f.home_team_id,f.home?.id,f.homeTeam?.id,f.teams?.home?.id));}
function awayId(f:J){return text(first(f.awayTeamId,f.away_team_id,f.away?.id,f.awayTeam?.id,f.teams?.away?.id));}
function homeApi(f:J){return text(first(f.homeTeamApiId,f.homeApiId,f.home?.apiId,f.homeTeam?.apiId,f.teams?.home?.apiId));}
function awayApi(f:J){return text(first(f.awayTeamApiId,f.awayApiId,f.away?.apiId,f.awayTeam?.apiId,f.teams?.away?.apiId));}
function homeName(f:J){return teamHe(first(f.homeName,f.homeTeamName,f.home?.name,f.homeTeam?.name,f.teams?.home?.name));}
function awayName(f:J){return teamHe(first(f.awayName,f.awayTeamName,f.away?.name,f.awayTeam?.name,f.teams?.away?.name));}
function homeBadge(f:J){return text(first(f.homeBadge,f.homeLogo,f.home?.badge,f.home?.logo,f.homeTeam?.badge,f.homeTeam?.logo,f.teams?.home?.badge,f.teams?.home?.logo));}
function awayBadge(f:J){return text(first(f.awayBadge,f.awayLogo,f.away?.badge,f.away?.logo,f.awayTeam?.badge,f.awayTeam?.logo,f.teams?.away?.badge,f.teams?.away?.logo));}
function leagueId(f:J){return text(first(f.leagueId,f.league?.id));}
function leagueYear(f:J){return text(first(f.leagueYear,f.league?.year));}
function leagueLogo(f:J){return text(first(f.leagueLogo,f.competitionLogo,f.league?.logo));}
function kickoff(f:J):string|null { const direct=text(first(f.kickoffUtc,f.kickoff,f.date)); if(direct){const d=new Date(direct);if(!Number.isNaN(d.getTime()))return d.toISOString();} const date=text(f.matchDate),time=text(f.matchTime); if(!date)return null; const d=new Date(time?`${date}T${time}`:`${date}T00:00:00`); return Number.isNaN(d.getTime())?null:d.toISOString(); }
function score(f:J){
  const home=[f.homeScore,f.home_score,f.scoreHome,f.homeGoals,f.goalsHome,f.home?.score,f.home?.goals,f.homeTeam?.score,f.homeTeam?.goals,f.teams?.home?.score,f.teams?.home?.goals,f.score?.home,f.score?.homeScore,f.scores?.home,f.result?.home];
  const away=[f.awayScore,f.away_score,f.scoreAway,f.awayGoals,f.goalsAway,f.away?.score,f.away?.goals,f.awayTeam?.score,f.awayTeam?.goals,f.teams?.away?.score,f.teams?.away?.goals,f.score?.away,f.score?.awayScore,f.scores?.away,f.result?.away];
  let h:null|number=null,a:null|number=null; for(const v of home){const n=integer(v);if(n!==null){h=n;break}} for(const v of away){const n=integer(v);if(n!==null){a=n;break}}
  for(const raw of [f.score,f.finalScore,f.scoreText,typeof f.result==="string"?f.result:null]){if(h!==null&&a!==null)break;if(typeof raw!=="string")continue;const m=raw.match(/(\d+)\s*[-:]\s*(\d+)/);if(m){h??=Number(m[1]);a??=Number(m[2]);}}
  return {home:h,away:a};
}

const imagePromises=new Map<string,Promise<string|null>>();
function cacheImage(bucket:string,pathBase:string,url:string|null){ if(!url)return Promise.resolve(null); if(url.includes("/storage/v1/object/public/"))return Promise.resolve(url); const key=`${bucket}:${pathBase}:${url}`; if(imagePromises.has(key))return imagePromises.get(key)!; const promise=(async()=>{try{const r=await fetch(url);if(!r.ok)return null;const type=r.headers.get("content-type")??"image/jpeg";const ext=type.includes("png")?"png":type.includes("webp")?"webp":"jpg";const path=`${pathBase}.${ext}`;const upload=await db.storage.from(bucket).upload(path,new Uint8Array(await r.arrayBuffer()),{upsert:true,contentType:type});if(upload.error)return null;return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;}catch{return null;}})(); imagePromises.set(key,promise); return promise; }

async function loadClubs(){ const r=await db.from("clubs").select("id,slug,name_he,short_name_he,goal_team_id,goal_api_id,active").eq("active",true).not("goal_team_id","is",null); if(r.error)throw r.error; return (r.data??[]) as J[]; }
function clubFor(clubs:J[],teamId:string|null,apiId:string|null){return clubs.find(c=>(teamId&&text(c.goal_team_id)===teamId)||(apiId&&text(c.goal_api_id)===apiId))??null;}

async function syncPlayerRows(players:J[],teamId:string,clubId:string|null,onlyApiIds:Set<string>|null){
  if(!players.length)return{fetched:0,saved:0,images:0};
  const apiIds=players.map(p=>text(p.apiId)).filter(Boolean) as string[];
  const existing=apiIds.length?(await db.from("players").select("id,goal_api_id,name_he,image_url").in("goal_api_id",apiIds)).data??[]:[];
  const existingByApi=new Map(existing.map((p:any)=>[text(p.goal_api_id),p])); let saved=0,images=0;
  const out:J[]=[];
  for(const p of players){ const apiId=text(p.apiId),providerId=text(p.id); if(onlyApiIds&&apiId&&!onlyApiIds.has(apiId))continue; if(onlyApiIds&&!apiId)continue; const ex=apiId?existingByApi.get(apiId):null; const rawImage=text(first(p.image,p.imageUrl,p.photo)); let image=text(ex?.image_url); if(!image&&rawImage){image=await cacheImage("player-images",`players/${apiId??providerId}`,rawImage);if(image)images++;}
    const verified=apiId?VERIFIED_PLAYER_HE[apiId]??null:null; const providerName=text(p.name)??"Unknown Player";
    out.push({club_id:clubId,name:verified??text(ex?.name_he)??providerName,number:integer(p.number),position:text(first(p.type,p.position)),nationality:text(p.country),birth_date:safeDate(p.birthdate),image_url:image,active:p.isActive===undefined?true:bool(p.isActive),name_he:text(ex?.name_he)??verified,goal_player_id:providerId,goal_api_id:apiId,goal_team_id:teamId,goal_name:providerName,goal_updated_at:new Date().toISOString(),goal_image_url:rawImage,shirt_number:text(p.number),goal_position:text(first(p.type,p.position)),goal_country:text(p.country),goal_age:integer(p.age),injured:bool(p.injured),is_captain:bool(p.isCaptain)});
  }
  for(const chunk of chunked(out,100)){ if(!chunk.length)continue; const r=await db.from("players").upsert(chunk,{onConflict:"goal_player_id"}); if(r.error)throw r.error; saved+=chunk.length; }
  return{fetched:players.length,saved,images};
}

function eventSide(e:J){const raw=first(e.teamSide,e.side,typeof e.team==="string"?e.team:null);const v=text(raw)?.toLowerCase();if(v==="home"||v==="away")return v;const homeMarker=first(e.homePlayer,e.homePlayerId,e.homeScorer,e.homeScorerId);const awayMarker=first(e.awayPlayer,e.awayPlayerId,e.awayScorer,e.awayScorerId);if(homeMarker)return"home";if(awayMarker)return"away";return null;}
function eventSideForMatch(e:J,match:J){const direct=eventSide(e);if(direct)return direct;const teamId=text(first(e.teamId,e.team_id,e.team?.id));const apiId=text(first(e.teamApiId,e.team?.apiId));if((teamId&&teamId===text(match.goal_home_team_id))||(apiId&&apiId===text(match.goal_home_team_id)))return"home";if((teamId&&teamId===text(match.goal_away_team_id))||(apiId&&apiId===text(match.goal_away_team_id)))return"away";return null;}
function splitPipe(v:any){return (text(v)??"").split("|").map(x=>x.trim()).filter(Boolean);}
function minute(e:J){return integer(first(e.minute,e.time,e.elapsed));}

async function fetchRawEvents(fixtureId:string){ const [goals,cards,subs]=await Promise.all([goal(`/fixtures/${fixtureId}/events`),goal(`/fixtures/${fixtureId}/cards`),goal(`/fixtures/${fixtureId}/substitutions`)]); return {goals:rows(goals),cards:rows(cards),subs:rows(subs)}; }
function collectParticipantIds(raw:{goals:J[];cards:J[];subs:J[]}){const ids=new Set<string>();const add=(v:any)=>{const s=text(v);if(s)for(const part of splitPipe(s))ids.add(part)};for(const e of raw.goals){add(first(e.scorerId,e.playerId,e.homeScorerId,e.awayScorerId));add(first(e.assistId,e.homeAssistId,e.awayAssistId));}for(const e of raw.cards)add(first(e.playerId,e.homePlayerId,e.awayPlayerId));for(const e of raw.subs){add(first(e.playerId,e.playerIds));add(first(e.playerOutId,e.outPlayerId,e.outgoingPlayerId));add(first(e.playerInId,e.inPlayerId,e.incomingPlayerId));}return ids;}

async function playerMap(ids:Set<string>){ if(!ids.size)return new Map<string,J>(); const r=await db.from("players").select("id,name,name_he,goal_name,image_url,goal_api_id").in("goal_api_id",[...ids]); if(r.error)throw r.error; return new Map((r.data??[]).map((p:any)=>[text(p.goal_api_id)!,p])); }
function playerDisplay(map:Map<string,J>,id:string|null,fallback:any){const p=id?map.get(id):null;return text(p?.name_he)??text(p?.name)??text(p?.goal_name)??text(fallback);}
function eventClubId(match:J,side:string|null){if(side==="home")return match.home_club_id??null;if(side==="away")return match.away_club_id??null;return null;}

function buildEvents(match:J,raw:{goals:J[];cards:J[];subs:J[]},players:Map<string,J>){const out:J[]=[];const fixtureId=text(match.goal_fixture_id)!;
  for(const e of raw.goals){let side=eventSideForMatch(e,match);const scorerName=side==="away"?first(e.awayScorer,e.scorer,e.player,e.playerName):first(e.homeScorer,e.scorer,e.player,e.playerName);const scorerId=text(side==="away"?first(e.awayScorerId,e.scorerId,e.playerId):first(e.homeScorerId,e.scorerId,e.playerId));if(!scorerName&&!scorerId)continue;const assistName=side==="away"?first(e.awayAssist,e.assist):first(e.homeAssist,e.assist);const assistId=text(side==="away"?first(e.awayAssistId,e.assistId):first(e.homeAssistId,e.assistId));const p=scorerId?players.get(scorerId):null,a=assistId?players.get(assistId):null;out.push({match_id:match.id,minute:minute(e),event_type:"goal",club_id:eventClubId(match,side),player_name:playerDisplay(players,scorerId,scorerName),detail:null,goal_event_id:text(e.id)??`${fixtureId}:goal:${minute(e)}:${scorerId??scorerName}`,team_side:side,player_id:scorerId,secondary_player_name:playerDisplay(players,assistId,assistName),secondary_player_id:assistId,score:text(e.score),period:text(first(e.scoreInfoTime,e.period)),raw_type:text(first(e.type,e.eventType))??"goal",player_ref_id:p?.id??null,secondary_player_ref_id:a?.id??null});}
  for(const e of raw.cards){let side=eventSideForMatch(e,match);const name=first(e.player,e.playerName,side==="home"?e.homePlayer:e.awayPlayer);const id=text(first(e.playerId,side==="home"?e.homePlayerId:e.awayPlayerId));const p=id?players.get(id):null;const rawType=text(first(e.type,e.cardType,e.card))??"yellow";const eventType=rawType.toLowerCase().includes("red")?"red_card":"yellow_card";out.push({match_id:match.id,minute:minute(e),event_type:eventType,club_id:eventClubId(match,side),player_name:playerDisplay(players,id,name),detail:null,goal_event_id:text(e.id)??`${fixtureId}:${eventType}:${minute(e)}:${id??name}`,team_side:side,player_id:id,secondary_player_name:null,secondary_player_id:null,score:null,period:text(e.period),raw_type:rawType,player_ref_id:p?.id??null,secondary_player_ref_id:null});}
  for(const e of raw.subs){const side=eventSideForMatch(e,match);const names=splitPipe(first(e.player,e.players,e.playerName));const ids=splitPipe(first(e.playerId,e.playerIds));const outName=first(e.playerOut,e.outPlayer,e.outgoingPlayer,names[0]);const inName=first(e.playerIn,e.inPlayer,e.incomingPlayer,names[1]);const outId=text(first(e.playerOutId,e.outPlayerId,e.outgoingPlayerId,ids[0]));const inId=text(first(e.playerInId,e.inPlayerId,e.incomingPlayerId,ids[1]));const outP=outId?players.get(outId):null,inP=inId?players.get(inId):null;out.push({match_id:match.id,minute:minute(e),event_type:"substitution",club_id:eventClubId(match,side),player_name:playerDisplay(players,outId,outName),detail:null,goal_event_id:text(e.id)??`${fixtureId}:sub:${minute(e)}:${outId??outName}:${inId??inName}`,team_side:side,player_id:outId,secondary_player_name:playerDisplay(players,inId,inName),secondary_player_id:inId,score:null,period:text(e.period),raw_type:"substitution",player_ref_id:outP?.id??null,secondary_player_ref_id:inP?.id??null});}
  return out;
}

function chunked<T>(a:T[],size:number){const out:T[][]=[];for(let i=0;i<a.length;i+=size)out.push(a.slice(i,i+size));return out;}
async function mapLimit<T,R>(items:T[],limit:number,fn:(x:T)=>Promise<R>){const out:R[]=[];for(let i=0;i<items.length;i+=limit){out.push(...await Promise.all(items.slice(i,i+limit).map(fn)));}return out;}

Deno.serve(async(req)=>{
  const started=Date.now();
  try{
    if(req.method==="OPTIONS")return new Response("ok",{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type"}});
    if(!SUPABASE_URL||!SERVICE_KEY||!GOAL_KEY)throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / GOAL_API_KEY");
    let season=DEFAULT_SEASON; try{const body=await req.json();if(text(body?.season))season=text(body.season)!;}catch{/* no body */}
    const clubs=await loadClubs(); if(!clubs.length)throw new Error("No active clubs with goal_team_id");
    const fixtureMap=new Map<string,J>();const clubResults:J[]=[];let totalFetched=0,totalPages=0;
    for(const club of clubs){const teamId=text(club.goal_team_id)!;const result=await fixturesForTeam(teamId);totalFetched+=result.fixtures.length;totalPages+=result.pages;const seasonRows=result.fixtures.filter(f=>leagueYear(f)===season);for(const f of seasonRows){const id=text(first(f.id,f.fixtureId,f.apiId));if(id)fixtureMap.set(id,f);}clubResults.push({club:club.name_he,goalTeamId:teamId,fetched:result.fixtures.length,pages:result.pages,seasonFixtures:seasonRows.length});}
    const fixtures=[...fixtureMap.values()];

    // Cache club rosters first; this covers the selected/internal clubs completely.
    let playersSaved=0,playerImages=0;for(const club of clubs){const teamId=text(club.goal_team_id)!;const r=await syncPlayerRows(await roster(teamId),teamId,club.id,null);playersSaved+=r.saved;playerImages+=r.images;}

    const matchRows:J[]=[];const scoreSamples:J[]=[];
    await mapLimit(fixtures,5,async f=>{const id=text(first(f.id,f.fixtureId,f.apiId));const hId=homeId(f),aId=awayId(f),hApi=homeApi(f),aApi=awayApi(f);const hClub=clubFor(clubs,hId,hApi),aClub=clubFor(clubs,aId,aApi);const sc=score(f);const rawStatus=first(f.matchStatus,f.status);const ko=kickoff(f);if(!id||!ko)return;
      const [hLogo,aLogo,cLogo]=await Promise.all([cacheImage("team-logos",`teams/${hId??hApi??id+"-h"}`,homeBadge(f)),cacheImage("team-logos",`teams/${aId??aApi??id+"-a"}`,awayBadge(f)),cacheImage("team-logos",`competitions/${leagueId(f)??id}`,leagueLogo(f))]);
      const row={competition:competitionHe(first(f.leagueName,f.competition,f.league?.name)),round_name:text(first(f.round,f.roundName,f.stage)),home_club_id:hClub?.id??null,away_club_id:aClub?.id??null,home_name:hClub?.name_he??homeName(f),away_name:aClub?.name_he??awayName(f),kickoff:ko,stadium:text(first(f.stadium,f.venue?.name)),status:matchStatus(rawStatus,f.live),home_score:sc.home,away_score:sc.away,home_logo_url:hLogo,away_logo_url:aLogo,competition_logo_url:cLogo,minute:integer(first(f.minute,f.liveMinute,f.elapsed)),goal_fixture_id:id,goal_fixture_api_id:text(f.apiId),goal_home_team_id:hId,goal_away_team_id:aId,goal_league_id:leagueId(f),goal_league_year:leagueYear(f),goal_stage:text(f.stage),goal_status:text(rawStatus),goal_updated_at:text(f.updatedAt)??new Date().toISOString()}; matchRows.push(row); if(row.status==="finished"&&scoreSamples.length<4)scoreSamples.push({fixture:id,home:row.home_name,away:row.away_name,score:[sc.home,sc.away],raw:{homeScore:f.homeScore,awayScore:f.awayScore,score:f.score,result:f.result}});
    });
    for(const chunk of chunked(matchRows,100)){const r=await db.from("matches").upsert(chunk,{onConflict:"goal_fixture_id"});if(r.error)throw r.error;}

    const fixtureIds=matchRows.map(r=>r.goal_fixture_id);const matchesRes=fixtureIds.length?await db.from("matches").select("id,goal_fixture_id,goal_home_team_id,goal_away_team_id,home_club_id,away_club_id,kickoff,status").in("goal_fixture_id",fixtureIds):{data:[],error:null};if(matchesRes.error)throw matchesRes.error;const past=(matchesRes.data??[]).filter((m:any)=>m.status==="live"||new Date(m.kickoff).getTime()<=Date.now());
    const rawByFixture=new Map<string,{goals:J[];cards:J[];subs:J[]}>();const participantIds=new Set<string>();
    const eventFetch=await mapLimit(past,4,async(m:any)=>{try{const raw=await fetchRawEvents(m.goal_fixture_id);rawByFixture.set(m.goal_fixture_id,raw);for(const id of collectParticipantIds(raw))participantIds.add(id);return{ok:true}}catch(e){return{ok:false,error:errorObj(e),fixture:m.goal_fixture_id}}});

    // Fetch opponent rosters only when event participants are still missing.
    let pmap=await playerMap(participantIds);const missing=new Set([...participantIds].filter(id=>!pmap.has(id)));const opponentTeamIds=new Set<string>();if(missing.size){for(const m of past){if(m.goal_home_team_id&&!clubFor(clubs,m.goal_home_team_id,null))opponentTeamIds.add(m.goal_home_team_id);if(m.goal_away_team_id&&!clubFor(clubs,m.goal_away_team_id,null))opponentTeamIds.add(m.goal_away_team_id);}}
    for(const teamId of opponentTeamIds){if(!missing.size)break;try{const list=await roster(teamId);const r=await syncPlayerRows(list,teamId,null,missing);playersSaved+=r.saved;playerImages+=r.images;for(const p of list){const id=text(p.apiId);if(id)missing.delete(id);}}catch{/* one opponent should not stop the sync */}}
    pmap=await playerMap(participantIds);

    let eventsSaved=0;const eventErrors:J[]=[];for(const m of past){const raw=rawByFixture.get(m.goal_fixture_id);if(!raw)continue;try{const eventRows=buildEvents(m,raw,pmap);for(const chunk of chunked(eventRows,100)){if(!chunk.length)continue;const r=await db.from("match_events").upsert(chunk,{onConflict:"goal_event_id"});if(r.error)throw r.error;eventsSaved+=chunk.length;}}catch(e){eventErrors.push({fixture:m.goal_fixture_id,error:errorObj(e)});}}

    return new Response(JSON.stringify({success:true,season,clubs:clubs.length,fixturesFetched:totalFetched,pagesFetched:totalPages,fixturesForSeason:fixtures.length,matchesSaved:matchRows.length,playersSaved,playerImages,eventMatchesChecked:past.length,eventRowsSaved:eventsSaved,eventFetchFailures:eventFetch.filter((x:any)=>!x.ok),eventSaveFailures:eventErrors,scoreSamples,clubResults,durationMs:Date.now()-started},null,2),{status:200,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){console.error("SYNC FATAL",errorObj(e));return new Response(JSON.stringify({success:false,error:errorObj(e)},null,2),{status:500,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});}
});
