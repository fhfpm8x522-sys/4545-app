import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {clubSearches,relevantClubs,articleCandidate,normalTitle} from './model.mjs';
import {officialFeeds,feedArticles,recentArticle} from './feeds.mjs';
const url=Deno.env.get('SUPABASE_URL')!,db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');}
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const authorization=req.headers.get('authorization')??'';const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}});
 const allowed=await caller.rpc('authorize_news_collector');if(allowed.error||allowed.data!==true)return new Response('Unauthorized',{status:401});
 const lock=await db.rpc('claim_news_collection');if(lock.error)return Response.json({error:'Collector lock failed'},{status:500});if(!lock.data)return Response.json({skipped:true,reason:'Already running / checked this hour'});
 let found=0,inserted=0,duplicates=0,successfulSources=0,fatal=false;const failures:string[]=[];const perClub=new Map<string,number>(),processed=new Set<string>();
 try{
  const result=await db.from('clubs').select('id,slug,name_he').eq('active',true);if(result.error)throw Error('Club list unavailable');const clubs=result.data??[];
  const phrases=clubs.map(c=>(clubSearches[c.slug]??[]).find(s=>/^[a-z]/i.test(s))).filter(Boolean).map(s=>'"'+s+'"');
  const params=new URLSearchParams({query:'('+phrases.join(' OR ')+') (football OR soccer)',mode:'artlist',format:'json',maxrecords:'250',timespan:'7d',sort:'datedesc'});
  const sources=[...officialFeeds,{url:'https://api.gdeltproject.org/api/v2/doc/doc?'+params,kind:'gdelt',host:null,slug:null}];
  const feeds=await Promise.all(sources.map(async source=>{try{
    const response=await fetch(source.url,{signal:AbortSignal.timeout(9000)});if(!response.ok)throw Error('HTTP '+response.status);
    const text=await response.text();if(text.length>2000000)throw Error('Feed too large');
    if(source.kind==='gdelt'){const payload=JSON.parse(text);if(payload.articles!==undefined&&!Array.isArray(payload.articles))throw Error('Invalid feed');successfulSources++;return {source,articles:(payload.articles??[]).slice(0,250)};}
    const articles=feedArticles(source.kind==='wordpress'?JSON.parse(text):text,source.kind).filter(a=>recentArticle(a));successfulSources++;return {source,articles};
   }catch{failures.push(source.kind+': '+(source.host??'GDELT')+' unavailable');return {source,articles:[]};}}));
  for(const {source,articles} of feeds){
    for(const a of articles){const candidate=articleCandidate(a);if(!candidate)continue;
    if(source.host&&new URL(candidate.source_url).hostname!==source.host)continue;
    const matched=source.slug?clubs.filter(c=>c.slug===source.slug):relevantClubs(candidate.title,clubs);
    for(const c of matched){
      const linkHash=await digest(candidate.source_url),titleHash=await digest(normalTitle(candidate.title)+'|'+candidate.source_name);const identity=c.id+':'+linkHash;
      if(processed.has(identity)||(perClub.get(c.id)??0)>=8)continue;processed.add(identity);perClub.set(c.id,(perClub.get(c.id)??0)+1);found++;
      const saved=await db.rpc('ingest_news_candidate',{p_club:c.id,p_candidate:candidate,p_link_hash:linkHash,p_title_hash:titleHash});if(saved.error)throw Error('Candidate save failed');if(saved.data)inserted++;else duplicates++;
    }}
  }
 }catch{fatal=true;failures.push('Club collection failed');}
 const status=failures.length?'partial':'success';await db.from('news_collection_runs').update({finished_at:new Date().toISOString(),status,found,inserted,duplicates,error:failures.join('; ')||null}).eq('id',lock.data);
 return Response.json({status,found,inserted,duplicates,failedQueries:failures.length,successfulSources},{status:fatal?500:successfulSources?200:503});
});
