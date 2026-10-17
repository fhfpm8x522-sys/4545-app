import test from 'node:test';
import assert from 'node:assert/strict';
import { meaningfulNewsText, safeNewsUrl, newsPresentation, verifiedNewsImage } from '../src/lib/news-display.mjs';

test('public news discards importer workflow placeholders and recovers the actual source excerpt', () => {
  for (const text of ['ידיעה שנמצאה באיסוף חדשות. יש לבדוק את המקור לפני אישור.', 'ממתין לאישור....', 'הכתבה ממתינה לאישור', 'pending approval']) assert.equal(meaningfulNewsText(text), '');
  assert.equal(newsPresentation({ summary: 'ממתין לאישור...', source_excerpt: 'האדומים יארחו הערב בבלומפילד את עירוני טבריה.' }).summary, 'האדומים יארחו הערב בבלומפילד את עירוני טבריה.');
  assert.equal(meaningfulNewsText('המועדון ממתין לאישור של ההתאחדות לקיום המשחק.'), 'המועדון ממתין לאישור של ההתאחדות לקיום המשחק.');
});

test('article text is plain text even when feed markup or encoded executable content is supplied', () => {
  assert.equal(meaningfulNewsText('<p>ניצחון &amp; חגיגה</p><script>alert(document.cookie)</script><img src=x onerror=alert(1)>'), 'ניצחון & חגיגה');
  assert.equal(meaningfulNewsText('&lt;script&gt;alert(1)&lt;/script&gt;<p>תקציר</p>'), 'תקציר');
  assert.equal(meaningfulNewsText({ value: 'malformed feed' }), '');
});

test('source URLs reject executable schemes, credentials, private hosts and alternate IP spellings', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,x', '//example.org/a', 'https://user:secret@example.org/a', 'https://127.0.0.1/a', 'https://2130706433/a', 'https://[::1]/a', 'https://localhost/a', 'https://metadata.google.internal/a', 'http://example.org/a', 'https://example.org\\@127.0.0.1/']) assert.equal(safeNewsUrl(url), null, url);
  assert.equal(safeNewsUrl('https://sports.walla.co.il/item/123'), 'https://sports.walla.co.il/item/123');
});

test('public images require a separate affirmative permission decision with attribution', () => {
  const photo = { image_url: 'https://upload.wikimedia.org/photo.jpg', image_source_url: 'https://commons.wikimedia.org/wiki/File:Photo.jpg', image_credit: 'צלם · CC BY-SA 4.0', image_license_url: 'https://creativecommons.org/licenses/by-sa/4.0/', image_kind: 'context' };
  assert.equal(verifiedNewsImage(photo), null);
  assert.equal(verifiedNewsImage({ ...photo, image_rights_verified: 'true' }), null);
  assert.equal(verifiedNewsImage({ ...photo, image_rights_verified: true, image_credit: '' }), null);
  assert.equal(verifiedNewsImage({ ...photo, image_rights_verified: true, image_source_url: 'javascript:alert(1)' }), null);
  assert.equal(verifiedNewsImage({ ...photo, image_rights_verified: true }).kind, 'context');
});

test('excerpt duplicates are rendered once and source date is not replaced by collection date', () => {
  const p = newsPresentation({ summary: 'תקציר אמיתי מהמקור', body: '<p>תקציר אמיתי מהמקור</p>', content_kind: 'source_excerpt', source_published_at: '2026-10-16T08:00:00Z', published_at: '2026-10-17T08:00:00Z' });
  assert.equal(p.body, '');
  assert.equal(p.kind, 'source_excerpt');
  assert.equal(p.sourceDate, '2026-10-16T08:00:00.000Z');
  assert.equal(p.publishedDate, '2026-10-17T08:00:00.000Z');
  assert.equal(newsPresentation({ body: 'תוכן עצמאי מלא.', content_kind: 'original' }).kind, 'original');
  assert.equal(newsPresentation({ body: 'תוכן ישן.' }).kind, 'legacy');
});
