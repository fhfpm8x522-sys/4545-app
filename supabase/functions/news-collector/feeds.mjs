export const officialFeeds=[
 {slug:'maccabi-tel-aviv',url:'https://www.maccabi-tlv.co.il/wp-json/wp/v2/posts?per_page=10&_fields=title,link,date_gmt',kind:'wordpress',host:'www.maccabi-tlv.co.il'},
 {slug:'hapoel-tel-aviv',url:'https://www.htafc.co.il/wp-json/wp/v2/posts?per_page=10&lang=he&_fields=title,link,date_gmt',kind:'wordpress',host:'www.htafc.co.il'},
 {url:'https://rss.walla.co.il/feed/156',kind:'rss',host:'sports.walla.co.il'},
];
export function textTitle(value){return String(value??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>=32&&c<=0x10ffff?String.fromCodePoint(c):'';}).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,s)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[s]).trim();}
export function feedArticles(raw,kind){
 if(kind==='wordpress'){if(!Array.isArray(raw))throw Error('Invalid WordPress feed');return raw.slice(0,10).map(r=>({title:textTitle(r.title?.rendered),url:r.link,date:r.date_gmt?r.date_gmt+'Z':null}));}
 if(typeof raw!=='string'||!/\<(rss|feed)\b/i.test(raw))throw Error('Invalid RSS feed');
 return [...raw.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0,100).map(([,r])=>{const value=k=>r.match(new RegExp('<'+k+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+k+'>','i'))?.[1];return {title:textTitle(value('title')),url:textTitle(value('link')),date:textTitle(value('pubDate'))||null};});
}
export function recentArticle(article,now=Date.now()){const d=Date.parse(article.date??'');return Number.isFinite(d)&&d>=now-7*86400000&&d<=now+3600000;}
