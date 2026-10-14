export const clubSearches={
 'hapoel-beer-sheva':['Hapoel Beer Sheva',"Hapoel Be'er Sheva",'Hapoel Beersheba','הפועל באר שבע','הפועל ב״ש'],
 'maccabi-tel-aviv':['Maccabi Tel Aviv','מכבי תל אביב','מכבי ת״א'],
 'maccabi-haifa':['Maccabi Haifa','מכבי חיפה'], 'beitar-jerusalem':['Beitar Jerusalem','ביתר ירושלים','בית״ר ירושלים'],
 'hapoel-tel-aviv':['Hapoel Tel Aviv','הפועל תל אביב','הפועל ת״א'], 'hapoel-haifa':['Hapoel Haifa','הפועל חיפה'],
 'hapoel-jerusalem':['Hapoel Jerusalem','הפועל ירושלים'], 'hapoel-petah-tikva':['Hapoel Petah Tikva','הפועל פתח תקווה','הפועל פתח תקוה'],
 'maccabi-petah-tikva':['Maccabi Petah Tikva','מכבי פתח תקווה','מכבי פתח תקוה'], 'maccabi-netanya':['Maccabi Netanya','מכבי נתניה'],
 'bnei-sakhnin':['Bnei Sakhnin','בני סכנין'], 'ironi-tiberias':['Ironi Tiberias','עירוני טבריה'],
 'ironi-kiryat-shmona':['Kiryat Shmona','קריית שמונה','קרית שמונה'], 'hapoel-ramat-gan':['Hapoel Ramat Gan','הפועל רמת גן'],
};
export function canonicalArticleUrl(value){try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null;u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(k))u.searchParams.delete(k);u.searchParams.sort();return u.href;}catch{return null;}}
export function normalTitle(value){return String(value??'').normalize('NFKC').toLowerCase().replace(/[\u200e\u200f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
export function relevantClubs(title,clubs){const text=' '+normalTitle(title)+' ';if(/basketball|כדורסל/i.test(title))return [];return clubs.filter(c=>(clubSearches[c.slug]??[c.name_he]).some(alias=>{const n=normalTitle(alias);return /[א-ת]/.test(n)?new RegExp('(?:^|\\s)[בכלמה]?'+n+'(?:\\s|$)','u').test(text):text.includes(' '+n+' ');}));}
export function articleCandidate(a){const source_url=canonicalArticleUrl(a.url),title=String(a.title??'').trim().slice(0,300);if(!source_url||title.length<8)return null;return {title,source_url,source_name:new URL(source_url).hostname,source_kind:'report',status:'pending',category:'general',summary:'ידיעה שנמצאה באיסוף חדשות. יש לבדוק את המקור לפני אישור.',body:null,image_url:null,official:false};}
