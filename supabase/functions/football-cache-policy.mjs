export function providerCacheUsable(cached,ttl,now=Date.now()){
 if(!cached||Date.parse(cached.expires_at)<=now||!Number.isFinite(Date.parse(cached.expires_at)))return false;
 if(cached.payload?._4545_denied)return true;
 const age=now-Date.parse(cached.updated_at);return Number.isFinite(age)&&age>=0&&age<=ttl*1000;
}
export function matchProviderTtl(match,kind='fixture',now=Date.now()){
 if(match?.status==='finished')return 86400;
 if(match?.status==='live')return kind==='fixture'||kind==='events'?60:kind==='commentary'?180:180;
 const distance=Date.parse(match?.kickoff)-now;
 const starting=Number.isFinite(distance)&&distance<=15*60000&&distance>-4*3600000;
 if(kind==='fixture')return starting?60:600;
 if(kind==='lineups')return 300;
 return 600;
}
export function leagueProviderTtl(matches,now=Date.now()){
 return matches.some(m=>{const distance=Date.parse(m.kickoff)-now;return Number.isFinite(distance)&&distance<90*60000&&distance>-4*3600000&&['scheduled','live','finished'].includes(m.status);})?300:21600;
}
