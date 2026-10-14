const escapeCalendar = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const utc = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function foldLine(line) {
  let rows = [], row = '', bytes = 0;
  for (const char of line) { const count = new TextEncoder().encode(char).length; if (bytes + count > 74) { rows.push(row); row = ' '; bytes = 1; } row += char; bytes += count; }
  rows.push(row); return rows.join('\r\n');
}
export function matchCalendar(match, createdAt = new Date().toISOString()) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(match.id) || !Number.isFinite(Date.parse(match.kickoff))) throw Error('Invalid match');
  const summary = `${match.home_name ?? 'בית'} — ${match.away_name ?? 'חוץ'}`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//45:45//Match Calendar//HE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${match.id}@fhfpm8x522-sys.github.io`, `DTSTAMP:${utc(createdAt)}`, `DTSTART:${utc(match.kickoff)}`, `DTEND:${utc(Date.parse(match.kickoff) + 2 * 3600000)}`,
    `SUMMARY:${escapeCalendar(summary)}`, `LOCATION:${escapeCalendar(match.stadium)}`, `DESCRIPTION:${escapeCalendar(`${match.competition ?? ''}\nשעת המשחק עשויה להתעדכן. משך ביומן: כשעתיים.`)}`,
    `URL:https://fhfpm8x522-sys.github.io/4545-app/match/${match.id}`, 'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${escapeCalendar(`עוד שעה: ${summary}`)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
export function attendedResult(match, supportedClubId) {
  if (match.status !== 'finished' || typeof match.home_score !== 'number' || typeof match.away_score !== 'number' || !supportedClubId) return null;
  const side = supportedClubId === match.home_club_id ? 'home' : supportedClubId === match.away_club_id ? 'away' : null;
  if (!side) return null;
  const diff = (match.home_score - match.away_score) * (side === 'home' ? 1 : -1);
  return diff > 0 ? 'win' : diff < 0 ? 'loss' : 'draw';
}
export function publicMatchCard(match) {
  return { home: match.home_name ?? 'בית', away: match.away_name ?? 'חוץ', competition: match.competition ?? '', kickoff: match.kickoff,
    score: ['finished', 'live'].includes(match.status) && typeof match.home_score === 'number' && typeof match.away_score === 'number' ? `${match.home_score} : ${match.away_score}` : null };
}
export function personalSnapshot(user, profile, records, createdAt = new Date().toISOString()) {
  if (!user?.id || profile?.id !== user.id) throw Error('Wrong account');
  for (const rows of Object.values(records)) for (const row of rows) if ((row.user_id !== undefined && row.user_id !== user.id) || (row.author_id !== undefined && row.author_id !== user.id)) throw Error('Cross-account data rejected');
  const allowed = ['id', 'username', 'display_name', 'avatar_url', 'birth_date', 'favorite_club_id', 'fan_since_year', 'last_club_change_at', 'content_prefs', 'notification_prefs', 'created_at', 'updated_at'];
  return { format: '4545-personal-data-v1', exported_at: createdAt, account: { id: user.id, email: user.email ?? null },
    profile: Object.fromEntries(allowed.filter(key => Object.hasOwn(profile, key)).map(key => [key, profile[key]])), records };
}
