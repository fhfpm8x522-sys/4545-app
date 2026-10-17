import test from 'node:test';
import assert from 'node:assert/strict';
import {htmlText,boundedExcerpt,publicHttpsUrl,allowedArticleFetchUrl,extractWordPressContent,extractRssContent,extractArticleMetadata,sourcePreviewMetadata} from '../supabase/functions/news-collector/content.mjs';

test('metadata text decodes Hebrew and entities but removes executable, invisible and styling content',()=>{
  assert.equal(htmlText('<style>.bad{}</style><p>&#x5de;&#x5db;&#x5d1;&#x5d9; &amp; הפועל</p><script>alert(1)</script><noscript>tracking</noscript>\u202eסיום'),'מכבי & הפועל סיום');
  assert.equal(htmlText('&lt;script&gt;evil()&lt;/script&gt; שלום'),'שלום');
});

test('a source excerpt stays within both its word and character limits without splitting Unicode',()=>{
  const long = Array.from({length:40},(_,n)=>'מילה'+n).join(' ');
  const excerpt = boundedExcerpt(long);
  assert.ok(excerpt.endsWith('…'));assert.ok(Array.from(excerpt).length<=200);assert.ok(excerpt.split(/\s+/u).length<=25);
  assert.equal(boundedExcerpt('⚽⚽⚽⚽',{maxChars:3}), '⚽⚽…');
  assert.equal(boundedExcerpt('Text',{maxChars:0}), '');
});

test('public links reject credentials, non-HTTPS, local networks and alternate IP encodings',()=>{
  for(const url of ['javascript:alert(1)','data:image/png,a','http://news.walla.co.il/a','https://127.0.0.1/a','https://2130706433/a','https://0x7f000001/a','https://[::1]/a','https://10.0.0.1/a','https://metadata.google.internal/a','https://admin.local/a','https://example.com@localhost/a','https://user:pw@www.htafc.co.il/a','https://www.htafc.co.il:8443/a']) assert.equal(publicHttpsUrl(url),null,url);
  assert.equal(publicHttpsUrl('/news/123?utm_source=x&b=2&a=1#top','https://www.htafc.co.il'), 'https://www.htafc.co.il/news/123?a=1&b=2');
});

test('article fetching requires an exact publisher allowlist, including on redirected locations',()=>{
  const allowed=['www.htafc.co.il'];
  assert.equal(allowedArticleFetchUrl('https://www.htafc.co.il/story',allowed),'https://www.htafc.co.il/story');
  for(const url of ['https://www.htafc.co.il.attacker.co/story','https://other.co.il/story','https://www.htafc.co.il@attacker.co/story']) assert.equal(allowedArticleFetchUrl(url,allowed),null);
  assert.equal(allowedArticleFetchUrl('https://www.htafc.co.il/story',undefined),null);
});

test('WordPress imports a real excerpt and embedded feature metadata without treating it as a republication license',()=>{
  const post={link:'https://www.htafc.co.il/story',title:{rendered:'מארחים &amp; מתכוננים'},date_gmt:'2026-10-17T06:00:00',excerpt:{rendered:'<p>הקבוצה ערכה אימון מסכם לקראת המשחק הקרוב. כל המידע לאוהדים לקראת המפגש.</p>'},content:{rendered:'<p>Full article content should stay at the publisher.</p>'},_embedded:{'wp:featuredmedia':[{source_url:'https://www.htafc.co.il/uploads/team.jpg',caption:{rendered:'צילום: מועדון הפועל'}}],author:[{name:'הפועל תל אביב'}]}};
  const a=extractWordPressContent(post);
  assert.match(a.summary,/הקבוצה ערכה אימון/);assert.ok(!a.summary.includes('ממתין'));
  assert.equal(a.source_published_at,'2026-10-17T06:00:00.000Z');assert.equal(a.source_author,'הפועל תל אביב');
  assert.equal(a.image_candidate_url,'https://www.htafc.co.il/uploads/team.jpg');assert.equal(a.image_source_url,post.link);
  assert.equal(a.image_attribution,'צילום: מועדון הפועל');assert.equal(a.image_rights,'unverified');assert.equal(a.image_url,null);assert.equal(a.body,null);
});

test('full content and republished image require separate, explicit permission decisions',()=>{
  const post={link:'https://www.htafc.co.il/123',title:{rendered:'עדכון לקראת המשחק'},content:{rendered:'<p>Approved full body.</p><script>bad()</script><img src="https://www.htafc.co.il/a.jpg">'}};
  const a=extractWordPressContent(post,{fullContentPermission:true,imagePermission:true,imageLicense:'Publisher permission'});
  assert.equal(a.body,'Approved full body.');assert.equal(a.image_url,'https://www.htafc.co.il/a.jpg');assert.equal(a.image_rights,'permission_supplied');assert.equal(a.image_license,'Publisher permission');
  const b=extractWordPressContent(post,{fullContentPermission:true});assert.equal(b.image_url,null);assert.equal(b.body,'Approved full body.');
});

test('RSS uses publisher descriptions, media attribution and image enclosures; malformed/private items are dropped',()=>{
  const xml='<rss xmlns:media="http://search.yahoo.com/mrss/"><channel><copyright>All rights reserved</copyright><item><title><![CDATA[חדשות &amp; עדכונים]]></title><link>https://sports.walla.co.il/item/123</link><description><![CDATA[<p>הקבוצה השלימה את ההכנות למשחק ופרסמה את פרטי הסגל.</p>]]></description><pubDate>Sat, 17 Oct 2026 06:00:00 GMT</pubDate><media:content url="https://img.walla.co.il/team.jpg"/><media:credit>צלם המועדון</media:credit></item><item><title>עדכון שני</title><link>https://sports.walla.co.il/item/124</link><enclosure type="image/jpeg" url="https://img.walla.co.il/stadium.jpg"/><description>תקציר אמיתי</description></item><item><title>Unsafe</title><link>https://127.0.0.1/private</link></item></channel></rss>';
  const [a,b,...rest]=extractRssContent(xml);
  assert.equal(rest.length,0);assert.equal(a.title,'חדשות & עדכונים');assert.match(a.summary,/פרטי הסגל/);assert.equal(a.image_candidate_url,'https://img.walla.co.il/team.jpg');assert.equal(a.image_rights,'unverified');assert.equal(a.source_rights_notice,'All rights reserved');assert.equal(a.image_attribution,'צלם המועדון');assert.equal(b.image_candidate_url,'https://img.walla.co.il/stadium.jpg');
});

test('Atom links and media use the same safe extraction without resolving external entities',()=>{
  const [a]=extractRssContent('<!DOCTYPE feed [<!ENTITY secret SYSTEM "file:///private">]><feed><entry><title>עדכון הקבוצה</title><link href="https://news.club.co.il/a?utm_medium=rss" rel="alternate"/><summary>הקבוצה הודיעה על שעת המשחק &amp; זמני הפתיחה.</summary><updated>2026-10-17T06:00:00Z</updated><author><name>כתב הספורט</name></author></entry></feed>');
  assert.equal(a.source_url,'https://news.club.co.il/a');assert.equal(a.source_author,'כתב הספורט');assert.equal(a.image_candidate_url,null);assert.equal(a.body,null);
  assert.throws(()=>extractRssContent('<html>Error</html>'));
});

test('HTML metadata handles attribute order, quoted delimiters, relative images and safe canonical URLs',()=>{
  const a=extractArticleMetadata('<html><head><meta content="משחק הכדורגל &amp; האוהדים" property="og:title"><meta name="description" content="הקבוצה תארח מחר את היריבה. הכרטיסים והסגל פורסמו לקראת המשחק."><meta content="/uploads/team.jpg?utm_source=test" property="og:image"><meta property="article:published_time" content="2026-10-17T06:00:00Z"><link href="https://www.htafc.co.il/football/story?utm_source=one" rel="canonical"></head><body><article><p>Article lead.</p><script>doNotUse()</script></article></body></html>','https://www.htafc.co.il/football/story');
  assert.equal(a.title,'משחק הכדורגל & האוהדים');assert.match(a.summary,/הקבוצה תארח מחר/);assert.equal(a.source_url,'https://www.htafc.co.il/football/story');assert.equal(a.image_candidate_url,'https://www.htafc.co.il/uploads/team.jpg');assert.equal(a.image_url,null);assert.equal(a.body,null);
});

test('cross-publisher canonical poisoning and unsafe feature images cannot replace original attribution',()=>{
  const a=extractArticleMetadata('<link rel="canonical" href="https://attacker.co/fake"><meta property="og:title" content="עדכון"><meta property="og:image" content="https://10.0.0.1/private"><meta name="description" content="תקציר הכתבה">','https://www.htafc.co.il/real');
  assert.equal(a.source_url,'https://www.htafc.co.il/real');assert.equal(a.image_candidate_url,null);assert.equal(a.summary,'תקציר הכתבה');
  assert.equal(extractWordPressContent({link:'javascript:alert(1)'}),null);
});

test('publisher JSON-LD supplies missing article author/date/photo without taking a related story',()=>{
  const html='<script type="application/ld+json">{"@type":"NewsArticle","url":"https://sports.walla.co.il/item/other","image":"https://images.wcdn.co.il/wrong.jpg"}</script><script type="application/ld+json">{"@graph":[{"@type":"NewsArticle","mainEntityOfPage":{"@id":"https://sports.walla.co.il/item/123"},"headline":"הכנה למשחק","datePublished":"2026-10-16T07:47:00+03:00","author":{"name":"כתב הספורט"},"image":{"url":"https://images.wcdn.co.il/actual.jpg","creator":{"name":"צלם המקור"}},"description":"הסגל פורסם לקראת משחק החוץ."}]}</script>';
  const a=extractArticleMetadata(html,'https://sports.walla.co.il/item/123');
  assert.equal(a.source_published_at,'2026-10-16T04:47:00.000Z');assert.equal(a.source_author,'כתב הספורט');
  assert.equal(a.image_candidate_url,'https://images.wcdn.co.il/actual.jpg');assert.equal(a.image_attribution,'צלם המקור');
  assert.equal(a.image_url,null);assert.equal(a.image_rights,'unverified');
});

test('image-only preview metadata preserves provenance without carrying editorial text or rights claims',()=>{
  const p=sourcePreviewMetadata({source_url:'https://www.htafc.co.il/story',source_name:'#HTA',image_candidate_url:'https://www.htafc.co.il/uploads/actual.jpg',image_attribution:'צלם המקור',body:'Do not overwrite the edited article',summary:'Do not replace the summary',image_rights_verified:true,image_license:'Invented license'},'https://www.htafc.co.il/story');
  assert.equal(p.image_candidate_url,'https://www.htafc.co.il/uploads/actual.jpg');assert.equal(p.image_source_url,'https://www.htafc.co.il/story');assert.equal(p.image_attribution,'צלם המקור');
  for(const key of ['body','summary','image_rights_verified','image_license','image_url'])assert.equal(Object.hasOwn(p,key),false,key);
  assert.equal(sourcePreviewMetadata({source_url:'https://www.htafc.co.il/story'}),null);
  assert.equal(sourcePreviewMetadata({source_url:'https://www.htafc.co.il/story',image_candidate_url:'https://127.0.0.1/private'}),null);
});
