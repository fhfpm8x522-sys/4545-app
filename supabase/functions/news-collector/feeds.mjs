import {extractWordPressContent,extractRssContent} from './content.mjs';
export const officialFeeds=[
 {slug:'maccabi-tel-aviv',url:'https://www.maccabi-tlv.co.il/wp-json/wp/v2/posts?per_page=10&_embed=wp:featuredmedia,author',kind:'wordpress',host:'www.maccabi-tlv.co.il'},
 {slug:'hapoel-tel-aviv',url:'https://www.htafc.co.il/wp-json/wp/v2/posts?per_page=10&lang=he&_embed=wp:featuredmedia,author',kind:'wordpress',host:'www.htafc.co.il'},
 {url:'https://rss.walla.co.il/feed/156',kind:'rss',host:'sports.walla.co.il'},
];
export function textTitle(value){return String(value??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>=32&&c<=0x10ffff?String.fromCodePoint(c):'';}).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,s)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[s]).trim();}
export function feedArticles(raw,kind){
 const metadata=kind==='wordpress'?(Array.isArray(raw)?raw.slice(0,10).map(r=>extractWordPressContent(r)).filter(Boolean):null):extractRssContent(raw);
 if(!metadata)throw Error('Invalid WordPress feed');
 return metadata.map(m=>({...m,url:m.source_url,date:m.source_published_at}));
}
export function recentArticle(article,now=Date.now()){const d=Date.parse(article.date??'');return Number.isFinite(d)&&d>=now-7*86400000&&d<=now+3600000;}
