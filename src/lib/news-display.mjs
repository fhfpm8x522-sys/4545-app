// Render source material as plain text. Metadata and editorial workflow messages
// must never become executable markup or the public article's contents.
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };

function decode(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
    if (name[0] !== '#') return entities[name.toLowerCase()] ?? whole;
    const n = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return n >= 32 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '';
  });
}

function plainText(value) {
  if (typeof value !== 'string') return '';
  return decode(decode(value.slice(0, 100_000)))
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<(script|style|template|noscript|svg|iframe|object)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<\/?(?:p|div|br|li|h[1-6]|blockquote)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/[^\S\n]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function meaningfulNewsText(value) {
  const text = plainText(value);
  const normalized = text.replace(/[.!…\s]+$/gu, '').replace(/\s+/gu, ' ').trim();
  if (!normalized) return '';
  if (/^ידיעה שנמצאה באיסוף חדשות(?:[.!…\s]+יש לבדוק את המקור לפני אישור)?$/u.test(normalized)) return '';
  if (/^(?:(?:התוכן|הידיעה|הכתבה|התקציר)\s+)?(?:ממתין|ממתינה|בהמתנה)\s+(?:לבדיקה ו)?לאישור(?:\s+(?:מנהל|האדמין|עורך|פרסום))?$/u.test(normalized)) return '';
  if (/^(?:יש לבדוק את המקור לפני אישור|אין עדיין תוכן לכתבה|pending approval|awaiting approval|content pending review)$/iu.test(normalized)) return '';
  return text;
}

// This client-side check protects navigation and image rendering. Server fetches
// additionally need DNS and redirect validation; this is not an SSRF boundary.
export function safeNewsUrl(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw || /[\u0000-\u0020\u007f\\]/u.test(raw)) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
    if (!host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':') || host.includes('[')) return null;
    if (/(^|\.)(localhost|local|localdomain|internal|intranet|lan|home|test|invalid|onion)$/i.test(host)) return null;
    url.hostname = host;
    return url.href;
  } catch { return null; }
}

function validDate(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function sameText(a, b) {
  return a.replace(/\s+/gu, ' ').trim() === b.replace(/\s+/gu, ' ').trim();
}

export function newsPresentation(item = {}) {
  const summary = meaningfulNewsText(item.summary) || meaningfulNewsText(item.source_excerpt);
  const content = meaningfulNewsText(item.body);
  const sourceUrl = safeNewsUrl(item.source_url);
  const kind = item.content_kind === 'original' ? 'original' : item.content_kind === 'source_excerpt' ? 'source_excerpt' : 'legacy';
  return {
    summary,
    body: content && !sameText(content, summary) ? content : '',
    kind,
    sourceUrl,
    sourceName: meaningfulNewsText(item.source_name) || (sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./, '') : '45:45'),
    sourceDate: validDate(item.source_published_at),
    publishedDate: validDate(item.published_at),
    author: meaningfulNewsText(item.source_author),
  };
}

export function verifiedNewsImage(item = {}) {
  // Publisher-supplied link previews keep their source attribution. They are
  // distinct from licensed uploads and never imply ownership or a CC license.
  if (item.image_kind === 'source_preview') {
    const url = safeNewsUrl(item.image_url), candidate = safeNewsUrl(item.image_candidate_url);
    const sourceUrl = safeNewsUrl(item.source_url), imageSource = safeNewsUrl(item.image_source_url);
    const credit = meaningfulNewsText(item.image_credit) || meaningfulNewsText(item.source_name);
    return url && url === candidate && sourceUrl && sourceUrl === imageSource && credit
      ? { url, sourceUrl, credit, license: '', licenseUrl: null, kind: 'source_preview' } : null;
  }
  // Stadium photos belong in the stadium gallery, never as article covers.
  if (item.image_kind === 'context' || item.image_kind === 'brand') return null;
  if (item.image_rights_verified !== true) return null;
  const url = safeNewsUrl(item.image_url), sourceUrl = safeNewsUrl(item.image_source_url);
  const credit = meaningfulNewsText(item.image_credit);
  const license = meaningfulNewsText(item.image_license), licenseUrl = safeNewsUrl(item.image_license_url);
  if (!url || !sourceUrl || !credit || (!license && !licenseUrl)) return null;
  return { url, sourceUrl, credit, license, licenseUrl, kind: 'source' };
}
