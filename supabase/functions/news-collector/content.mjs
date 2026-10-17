// Extract source metadata only. Discovery of an image or a copyright notice does
// not grant permission to republish it. Callers must revalidate each redirect and
// reject private DNS resolutions at the connection layer before fetching URLs.
const MAX_INPUT = 1_000_000;
const entities = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ', ensp:' ', emsp:' ', thinsp:' ', ndash:'–', mdash:'—', hellip:'…', laquo:'«', raquo:'»', lsquo:'‘', rsquo:'’', ldquo:'“', rdquo:'”', copy:'©', reg:'®', bull:'•' };

function decodeEntities(value) {
  return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
    if (name[0] !== '#') return entities[name.toLowerCase()] ?? whole;
    const n = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2),16) : Number(name.slice(1));
    return n >= 32 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '';
  });
}

export function htmlText(value) {
  let text = String(value ?? '').slice(0, MAX_INPUT).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1');
  text = decodeEntities(decodeEntities(text));
  return text.replace(/<!--[^]*?-->/g,' ')
    .replace(/<(script|style|template|noscript|svg|iframe|object)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
    .replace(/<[^>]*>/g,' ')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b\u202a-\u202e\u2066-\u2069]/g,'')
    .replace(/\s+/gu,' ').trim();
}

// This is a quoted source excerpt, not an original editorial summary.
export function boundedExcerpt(value, options = {}) {
  const maxChars = Math.max(0,Math.min(2_000,Number(options.maxChars ?? 200) || 0));
  const maxWords = Math.max(0,Math.min(200,Number(options.maxWords ?? 25) || 0));
  const text = htmlText(value);
  if (!maxChars || !maxWords || !text) return '';
  const words = text.split(/\s+/u);
  let selected = words.slice(0,maxWords).join(' ');
  let clipped = words.length > maxWords;
  if (Array.from(selected).length > maxChars) {
    const chars = Array.from(selected).slice(0, Math.max(0,maxChars-1)).join('');
    const space = chars.lastIndexOf(' ');
    selected = space > 0 ? chars.slice(0,space) : chars;
    clipped = true;
  }
  if (clipped && selected) {
    while (Array.from(selected).length >= maxChars) selected = Array.from(selected).slice(0,-1).join('');
    return selected.trimEnd()+'…';
  }
  return selected;
}

export function publicHttpsUrl(value, base) {
  try {
    const raw = decodeEntities(String(value ?? '')).trim();
    if (!raw || /[\u0000-\u0020\u007f]/u.test(raw)) return null;
    const url = new URL(raw,base);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
    const host = url.hostname.toLowerCase().replace(/\.$/,'');
    // All IP literals are rejected, including alternate IPv4 encodings normalized by URL.
    if (!host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':') || host.includes('[')) return null;
    if (/(^|\.)(localhost|local|localdomain|internal|intranet|lan|home|test|invalid|example|onion)$/i.test(host)) return null;
    if (host === 'metadata.google.internal') return null;
    url.hostname = host;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    return url.href;
  } catch { return null; }
}

export function allowedArticleFetchUrl(value, allowedHosts) {
  const url = publicHttpsUrl(value);
  if (!url || !Array.isArray(allowedHosts)) return null;
  const host = new URL(url).hostname;
  return allowedHosts.some(allowed => typeof allowed === 'string' && allowed.toLowerCase().replace(/\.$/,'') === host) ? url : null;
}

function attrs(value) {
  const result = new Map();
  const matcher = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of value.matchAll(matcher)) result.set(match[1].toLowerCase(),decodeEntities(match[2] ?? match[3] ?? match[4] ?? ''));
  return result;
}

function tags(html, name) {
  const matcher = new RegExp('<'+name+'\\b((?:[^\"\'<>]|\"[^\"]*\"|\'[^\']*\')*)\\/?>','gi');
  return [...String(html).slice(0, MAX_INPUT).matchAll(matcher)].map(match => attrs(match[1]));
}

function dateIso(value, utc = false) {
  if (!value) return null;
  const text = String(value).trim();
  const normalized = utc && !/(Z|[+-]\d\d:\d\d)$/i.test(text) ? text+'Z' : text;
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function firstImage(html, base) {
  for (const tag of tags(html,'img')) {
    const url = publicHttpsUrl(tag.get('src') ?? tag.get('data-src'),base);
    if (url && !(Number(tag.get('width')) > 0 && Number(tag.get('width')) < 160) && !(Number(tag.get('height')) > 0 && Number(tag.get('height')) < 90)) return url;
  }
  return null;
}

function result(metadata, options) {
  const source_url = publicHttpsUrl(metadata.source_url);
  if (!source_url) return null;
  const source_excerpt = boundedExcerpt(metadata.description, options);
  const image_candidate_url = publicHttpsUrl(metadata.image,source_url);
  return {
    title: boundedExcerpt(metadata.title,{maxChars:300,maxWords:60}), source_url,
    source_name: htmlText(metadata.source_name) || new URL(source_url).hostname,
    source_published_at: dateIso(metadata.date), source_author: boundedExcerpt(metadata.author,{maxChars:120,maxWords:20}) || null,
    source_excerpt: source_excerpt || null, summary: source_excerpt || null,
    // Keep editorial text and permission decisions separate from discovered metadata.
    body: options.fullContentPermission === true ? htmlText(metadata.content).slice(0,50_000) || null : null,
    image_candidate_url, image_url: options.imagePermission === true ? image_candidate_url : null,
    image_source_url: image_candidate_url ? source_url : null,
    image_rights: image_candidate_url ? options.imagePermission === true ? 'permission_supplied' : 'unverified' : null,
    image_attribution: boundedExcerpt(metadata.image_attribution,{maxChars:200,maxWords:25}) || null,
    image_license: options.imagePermission === true && options.imageLicense ? htmlText(options.imageLicense).slice(0,100) : null,
    source_rights_notice: boundedExcerpt(metadata.rights,{maxChars:200,maxWords:25}) || null,
  };
}

export function extractWordPressContent(post, options = {}) {
  if (!post || typeof post !== 'object' || Array.isArray(post)) return null;
  const source_url = publicHttpsUrl(post.link);
  if (!source_url) return null;
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  const yoast = post.yoast_head_json ?? {};
  const content = post.content?.rendered ?? '';
  return result({
    source_url, title: post.title?.rendered, date: dateIso(post.date_gmt,true) ?? post.date,
    source_name: yoast.og_site_name, author: post._embedded?.author?.[0]?.name ?? yoast.author,
    description: htmlText(post.excerpt?.rendered) ? post.excerpt.rendered : yoast.description ?? content,
    content, image: media?.source_url ?? media?.media_details?.sizes?.large?.source_url ?? yoast.og_image?.[0]?.url ?? firstImage(content,source_url),
    image_attribution: media?.caption?.rendered ?? media?.description?.rendered,
    rights: post.copyright ?? media?.copyright,
  }, options);
}

function element(xml, name) {
  return String(xml).match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+name+'\\s*>','i'))?.[1] ?? '';
}

export function extractRssContent(xml, options = {}) {
  if (typeof xml !== 'string' || !/<(?:rss|feed)\b/i.test(xml)) throw Error('Invalid RSS/Atom feed');
  const feed = xml.slice(0,MAX_INPUT);
  const channelRights = element(feed.split(/<(?:item|entry)\b/i)[0],'copyright');
  return [...feed.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi)].slice(0,100).map(([,kind,item]) => {
    const alternate = tags(item,'link').find(a=>!a.get('rel') || a.get('rel') === 'alternate');
    const source_url = publicHttpsUrl(htmlText(element(item,'link')) || alternate?.get('href') || htmlText(element(item,'guid')));
    if (!source_url) return null;
    const content = element(item,'content:encoded') || element(item,'content');
    const description = element(item,'description') || element(item,'summary') || content;
    const media = [...tags(item,'media:content'),...tags(item,'media:thumbnail')].find(a=>publicHttpsUrl(a.get('url'),source_url));
    const enclosure = tags(item,'enclosure').find(a=>/^image\//i.test(a.get('type') ?? ''));
    return result({ source_url, title:element(item,'title'), description, content,
      date:htmlText(element(item,'pubDate') || element(item,'published') || element(item,'updated')),
      author:element(item,'dc:creator') || element(element(item,'author'),'name') || element(item,'author'),
      image:media?.get('url') ?? enclosure?.get('url') ?? firstImage(description || content,source_url),
      image_attribution:element(item,'media:credit'), rights:element(item,'copyright') || element(item,'rights') || channelRights,
    }, options);
  }).filter(Boolean);
}

export function extractArticleMetadata(html, sourceUrl, options = {}) {
  const source_url = publicHttpsUrl(sourceUrl);
  if (!source_url || typeof html !== 'string') return null;
  const metadata = new Map();
  for (const tag of tags(html,'meta')) {
    const key = (tag.get('property') ?? tag.get('name') ?? tag.get('itemprop') ?? '').toLowerCase();
    if (key && !metadata.has(key)) metadata.set(key,tag.get('content') ?? '');
  }
  const canonical = tags(html,'link').find(tag=>(tag.get('rel') ?? '').split(/\s+/).includes('canonical'));
  const canonicalUrl = publicHttpsUrl(canonical?.get('href'),source_url);
  const content = element(html,'article') || element(html,'main');
  const samePublisherCanonical = canonicalUrl && new URL(canonicalUrl).hostname === new URL(source_url).hostname ? canonicalUrl : source_url;
  const structured = articleStructuredMetadata(html,samePublisherCanonical);
  return result({
    source_url:samePublisherCanonical, title:metadata.get('og:title') || metadata.get('twitter:title') || structured.title || element(html,'title'),
    source_name:metadata.get('og:site_name') || structured.publisher, date:metadata.get('article:published_time') || metadata.get('datepublished') || structured.date,
    author:metadata.get('author') || metadata.get('article:author') || structured.author,
    description:metadata.get('og:description') || metadata.get('description') || metadata.get('twitter:description') || structured.description || content,
    content, image:metadata.get('og:image:secure_url') || metadata.get('og:image') || metadata.get('twitter:image') || structured.image || firstImage(content,source_url),
    image_attribution:metadata.get('image:credit') || structured.imageCredit, rights:metadata.get('copyright') || metadata.get('rights') || structured.rights,
  }, options);
}

// JSON-LD is publisher-supplied metadata, not executable JavaScript. Only the
// article node for this URL may supply a fallback; related/recommended stories
// and arbitrary embedded scripts must not replace the current story's photo.
function articleStructuredMetadata(html, sourceUrl) {
  const queue=[];
  for (const match of html.slice(0,MAX_INPUT).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if ((attrs(match[1]).get('type') ?? '').toLowerCase() !== 'application/ld+json' || match[2].length > 200_000) continue;
    try { queue.push(JSON.parse(match[2])); } catch { /* Malformed metadata is optional. */ }
    if(queue.length>=20)break;
  }
  let inspected=0;
  while(queue.length && inspected++<100) {
    const node=queue.shift();
    if(Array.isArray(node)){queue.push(...node.slice(0,30));continue;}
    if(!node || typeof node!=='object')continue;
    if(Array.isArray(node['@graph']))queue.push(...node['@graph'].slice(0,30));
    const types=Array.isArray(node['@type'])?node['@type']:[node['@type']];
    if(!types.some(type=>typeof type==='string' && /^(?:NewsArticle|Article|BlogPosting|ReportageNewsArticle)$/i.test(type)))continue;
    const identity=publicHttpsUrl(typeof node.mainEntityOfPage==='string'?node.mainEntityOfPage:node.mainEntityOfPage?.['@id'] ?? node.mainEntityOfPage?.url ?? node.url);
    if(identity && identity!==sourceUrl)continue;
    const rawImage=Array.isArray(node.image)?node.image[0]:node.image;
    const image=typeof rawImage==='string'?rawImage:rawImage?.url ?? rawImage?.contentUrl;
    const name=value=>typeof value==='string'?value:typeof value?.name==='string'?value.name:null;
    const author=Array.isArray(node.author)?node.author.map(name).filter(Boolean).join(' · '):name(node.author);
    return {title:node.headline ?? node.name,date:node.datePublished,description:node.description,publisher:name(node.publisher),author,
      image,imageCredit:name(rawImage?.creditText) ?? name(rawImage?.creator) ?? name(rawImage?.author) ?? name(rawImage?.copyrightHolder),rights:node.copyrightNotice};
  }
  return {};
}

// A linked preview references the image chosen by the publisher. It does not
// copy a file, import editorial text or imply a newly granted image license.
export function sourcePreviewMetadata(metadata, sourceUrl) {
  const source_url=publicHttpsUrl(sourceUrl ?? metadata?.source_url);
  const image_candidate_url=publicHttpsUrl(metadata?.image_candidate_url,source_url);
  if(!source_url || !image_candidate_url)return null;
  return {source_url,image_candidate_url,image_source_url:source_url,
    source_name:htmlText(metadata?.source_name) || new URL(source_url).hostname,
    image_attribution:boundedExcerpt(metadata?.image_attribution,{maxChars:200,maxWords:25}) || null,
    source_rights_notice:boundedExcerpt(metadata?.source_rights_notice,{maxChars:200,maxWords:25}) || null};
}
