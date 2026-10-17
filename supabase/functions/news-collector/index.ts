import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {clubSearches,relevantClubs,articleCandidate,normalTitle} from './model.mjs';
import {officialFeeds,feedArticles,recentArticle} from './feeds.mjs';
import {allowedArticleFetchUrl,extractArticleMetadata,sourcePreviewMetadata} from './content.mjs';
const url=Deno.env.get('SUPABASE_URL')!,db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');}
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const authorization=req.headers.get('authorization')??'';const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}});
 const allowed=await caller.rpc('authorize_news_collector');if(allowed.error||allowed.data!==true)return new Response('Unauthorized',{status:401});
 const repairOnly=(await req.json().catch(()=>({}))).repair===true;
 const lock=repairOnly?{data:null,error:null}:await db.rpc('claim_news_collection');if(lock.error)return Response.json({error:'Collector lock failed'},{status:500});if(!repairOnly&&!lock.data)return Response.json({skipped:true,reason:'Already running / checked this hour'});
 let found=0,inserted=0,duplicates=0,successfulSources=0,repaired=0,unavailable=0,imagesEnriched=0,imagesUnavailable=0,fatal=false;const failures:string[]=[];const perClub=new Map<string,number>(),processed=new Set<string>();
 try{
  const result=await db.from('clubs').select('id,slug,name_he').eq('active',true);if(result.error)throw Error('Club list unavailable');const clubs=result.data??[];
  const phrases=clubs.map(c=>(clubSearches[c.slug]??[]).find(s=>/^[a-z]/i.test(s))).filter(Boolean).map(s=>'"'+s+'"');
  const params=new URLSearchParams({query:'('+phrases.join(' OR ')+') (football OR soccer)',mode:'artlist',format:'json',maxrecords:'250',timespan:'7d',sort:'datedesc'});
  const sources=[...officialFeeds,...(repairOnly?[]:[{url:'https://api.gdeltproject.org/api/v2/doc/doc?'+params,kind:'gdelt',host:null,slug:null}])];
  const feeds=await Promise.all(sources.map(async source=>{try{
    const response=await fetch(source.url,{signal:AbortSignal.timeout(9000),redirect:'error'});if(!response.ok)throw Error('HTTP '+response.status);
    const text=await response.text();if(text.length>2000000)throw Error('Feed too large');
    if(source.kind==='gdelt'){const payload=JSON.parse(text);if(payload.articles!==undefined&&!Array.isArray(payload.articles))throw Error('Invalid feed');successfulSources++;return {source,articles:(payload.articles??[]).slice(0,250)};}
    const articles=feedArticles(source.kind==='wordpress'?JSON.parse(text):text,source.kind).filter(a=>recentArticle(a));successfulSources++;return {source,articles};
   }catch{failures.push(source.kind+': '+(source.host??'GDELT')+' unavailable');return {source,articles:[]};}}));
  const metadataByUrl=new Map<string,any>();for(const {source,articles} of feeds)for(const a of articles){const canonical=articleCandidate(a);if(canonical && (!source.host || new URL(canonical.source_url).hostname===source.host) && (canonical.source_excerpt || canonical.image_candidate_url))metadataByUrl.set(canonicalArticleKey(canonical.source_url),a);}
  const allowedHosts=['sports.walla.co.il','www.htafc.co.il','www.maccabi-tlv.co.il'],metadataRequests=new Map<string,Promise<any>>(),imageApplied=new Set<string>();
  async function metadataFor(row:any){
    const sourceUrl=allowedArticleFetchUrl(row.source_url,allowedHosts);if(!sourceUrl)return null;
    const key=canonicalArticleKey(sourceUrl),cached=metadataByUrl.get(key);if(cached?.image_candidate_url && cached?.source_excerpt)return cached;
    if(!metadataRequests.has(key))metadataRequests.set(key,(async()=>{
      try{const response=await fetch(sourceUrl,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{Accept:'text/html'}});if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))return cached??null;
       const html=await response.text();if(html.length>1000000)return cached??null;const extracted=extractArticleMetadata(html,sourceUrl);return extracted?{...cached,...extracted,source_excerpt:extracted.source_excerpt??cached?.source_excerpt,image_candidate_url:extracted.image_candidate_url??cached?.image_candidate_url}:cached??null;
      }catch{return cached??null;}
    })());
    return metadataRequests.get(key);
  }
  async function applySourcePreview(row:any,metadata:any){
    if(imageApplied.has(row.id))return;
    const preview=sourcePreviewMetadata(metadata,row.source_url);if(!preview){imagesUnavailable++;return;}
    const applied=await db.rpc('apply_news_source_preview',{p_id:row.id,p_content:preview});
    if(applied.error)throw Error('Source preview save failed');if(applied.data){imagesEnriched++;imageApplied.add(row.id);}else imagesUnavailable++;
  }
  for(const {source,articles} of repairOnly?[]:feeds){
    for(const a of articles){const candidate=articleCandidate(a);if(!candidate)continue;
    if(source.host&&new URL(candidate.source_url).hostname!==source.host)continue;
    const matched=source.slug?clubs.filter(c=>c.slug===source.slug):relevantClubs(candidate.title,clubs);
    for(const c of matched){
      const linkHash=await digest(candidate.source_url),titleHash=await digest(normalTitle(candidate.title)+'|'+candidate.source_name);const identity=c.id+':'+linkHash;
      if(processed.has(identity)||(perClub.get(c.id)??0)>=8)continue;processed.add(identity);perClub.set(c.id,(perClub.get(c.id)??0)+1);found++;
      const saved=await db.rpc('ingest_news_candidate',{p_club:c.id,p_candidate:candidate,p_link_hash:linkHash,p_title_hash:titleHash});if(saved.error)throw Error('Candidate save failed');if(saved.data)inserted++;else duplicates++;
    }}
  }
  const pending=await db.rpc('claim_news_enrichment',{p_limit:repairOnly?20:12});if(pending.error)throw Error('Content repair queue unavailable');
  const rows=pending.data??[];
  for(let start=0;start<rows.length;start+=4)await Promise.all(rows.slice(start,start+4).map(async row=>{
   try{const metadata=await metadataFor(row);
    if(metadata?.image_candidate_url)await applySourcePreview(row,metadata);
    if(!metadata?.source_excerpt){unavailable++;return;}
    const saved=await db.rpc('repair_news_content',{p_id:row.id,p_content:metadata});if(saved.error)throw Error('Content save failed');if(saved.data)repaired++;else unavailable++;
   }catch{unavailable++;}
  }));
  // Image repair is independent of editorial completeness. A manually written
  // summary must not prevent an old/missing image from receiving source metadata.
  const imageQueue=await db.rpc('claim_news_image_enrichment',{p_limit:repairOnly?20:12});
  if(imageQueue.error)throw Error('Image repair queue unavailable');
  const imageRows=(imageQueue.data??[]).filter((row:any)=>!imageApplied.has(row.id));
  for(let start=0;start<imageRows.length;start+=4)await Promise.all(imageRows.slice(start,start+4).map(async(row:any)=>{
    try{await applySourcePreview(row,await metadataFor(row));}catch{imagesUnavailable++;}
  }));
 }catch{fatal=true;failures.push('Club collection failed');}
 const status=failures.length?'partial':'success';if(lock.data)await db.from('news_collection_runs').update({finished_at:new Date().toISOString(),status,found,inserted,duplicates,error:failures.join('; ')||null}).eq('id',lock.data);
 return Response.json({status,found,inserted,duplicates,repaired,unavailable,imagesEnriched,imagesUnavailable,failedQueries:failures.length,successfulSources},{status:fatal?500:successfulSources?200:503});
});
function canonicalArticleKey(value:string){const candidate=articleCandidate({title:'metadata cache key',url:value});return (candidate?.source_url??value).replace(/%[0-9a-f]{2}/gi,part=>part.toUpperCase());}
