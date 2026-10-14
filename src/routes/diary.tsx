import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { QueryFeedback } from '@/components/query-feedback';
import { PrivateMatchAlbum } from '@/components/private-match-album';
import { shareMatchCard } from '@/components/personal-match-tools';
import { useSession, useProfile } from '@/lib/session';
import { attendedResult } from '@/lib/fan-tools.mjs';
import { oneRelation } from '@/lib/runtime-utils.mjs';
import type { Match } from '@/lib/app-types';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/diary')({ head: () => ({ meta: [{ title: 'יומן האוהד — 45:45' }] }), component: Diary });
type Entry = { match_id: string; watched_at: string | null; private_note: string; away_trip_note: string; checklist: string[]; checklist_items: string[]; match: Match | null };
function Diary() {
  const { user } = useSession(), { data: profile } = useProfile(user?.id); const [selected, setSelected] = useState('');
  const q = useQuery({ queryKey: ['fan-diary', user?.id, profile?.favorite_club_id], enabled: !!user, queryFn: async () => {
    let matches = supabase.from('matches').select('*').order('kickoff', { ascending: false }).limit(150);
    if (profile?.favorite_club_id) matches = matches.or(`home_club_id.eq.${profile.favorite_club_id},away_club_id.eq.${profile.favorite_club_id}`);
    const [diary, attendance, fixtures, summary] = await Promise.all([
      supabase.from('fan_match_diary').select('*,match:matches(*)').eq('user_id', user!.id).order('updated_at', { ascending: false }),
      supabase.from('match_attendance').select('match_id,supported_club_id,match:matches(*)').eq('user_id', user!.id), matches,supabase.rpc('fan_attendance_summary'),
    ]); if (diary.error || attendance.error || fixtures.error || summary.error) throw diary.error || attendance.error || fixtures.error || summary.error;
    return { diary: (diary.data ?? []).map(row => ({ ...row, match: oneRelation(row.match) })) as Entry[], attendance: (attendance.data ?? []).map(row => ({ ...row, match: oneRelation(row.match) as Match | null })), fixtures: (fixtures.data ?? []) as Match[],summary:summary.data as {attended:number;graded:number;wins:number;draws:number;losses:number} };
  } });
  const entries = q.data?.diary ?? [], attendance = q.data?.attendance ?? [];
  const last = useMemo(() => entries.filter(e => e.watched_at).sort((a, b) => Date.parse(b.watched_at!) - Date.parse(a.watched_at!))[0], [entries]);
  const graded = q.data?.summary?.graded ?? 0,wins=q.data?.summary?.wins??0,totalAttended=q.data?.summary?.attended??0;
  const fixtures = useMemo(() => Array.from(new Map([...q.data?.fixtures ?? [], ...entries.flatMap(e => e.match ? [e.match] : []), ...attendance.flatMap(a => a.match ? [a.match] : [])].map(m => [m.id, m])).values()), [q.data]);
  const match = fixtures.find(m => m.id === selected), entry = entries.find(e => e.match_id === selected), attended = attendance.find(a => a.match_id === selected);
  if (!user) return <AppShell title="יומן האוהד"><p className="panel p-4">התחבר כדי לפתוח את היומן הפרטי שלך.</p></AppShell>;
  return <AppShell title="יומן האוהד"><div className="space-y-4">
    <section className="panel club-gradient p-5"><h1 className="text-2xl font-black">המשחקים שנשארים איתי</h1><p className="mt-2 text-xs text-muted-foreground">יומן אישי, זיכרונות ונסיעות חוץ. המידע כאן פרטי לחשבון שלך.</p><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div><b className="block text-2xl">{totalAttended}</b><span className="text-[10px]">משחקים שבהם נכחתי</span></div><div><b className="block text-2xl">{wins}</b><span className="text-[10px]">ניצחונות בנוכחותי</span></div><div><b className="block text-2xl">{graded ? `${Math.round(wins / graded * 100)}%` : '—'}</b><span className="text-[10px]">אחוז ניצחונות</span></div></div><p className="mt-3 text-[10px] text-muted-foreground">האחוז מחושב למשחקים שהסתיימו ויש להם קבוצה נתמכת ותוצאה מאומתת.</p>{totalAttended > 0 && <span className="mt-3 inline-block rounded-full bg-club/15 px-3 py-1 text-xs font-bold text-club">🏟️ {totalAttended >= 20 ? 'היציע הוא הבית' : totalAttended >= 5 ? 'אוהד קבוע' : 'חלק מהיציע'}</span>}</section>
    <QueryFeedback loading={q.isLoading} error={q.error} retry={q.refetch} />
    {last?.match && <section className="panel p-4"><h2 className="text-sm font-bold">המשחק האחרון שסימנתי כנצפה</h2><button className="mt-2 text-sm text-club" onClick={() => setSelected(last.match_id)}>{last.match.home_name} — {last.match.away_name}</button><p className="text-[10px] text-muted-foreground">סומן {new Date(last.watched_at!).toLocaleString('he-IL')}</p></section>}
    {!q.isLoading && !q.error && <><label className="block text-sm font-bold">בחירת משחק ליומן<select value={selected} onChange={e => setSelected(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm"><option value="">בחר משחק…</option>{fixtures.map(m => <option key={m.id} value={m.id}>{m.home_name || 'בית'} — {m.away_name || 'חוץ'} · {new Date(m.kickoff).toLocaleDateString('he-IL')}</option>)}</select></label>
      {match && <><PrivateMatchEditor key={match.id} userId={user.id} match={match} entry={entry} attended={!!attended} supportedClubId={attended?.supported_club_id ?? null} /><PrivateMatchAlbum userId={user.id} matchId={match.id} /></>}
      <section className="panel p-4"><h2 className="mb-3 font-bold">המשחקים שבהם הייתי</h2>{!attendance.length ? <p className="text-xs text-muted-foreground">סמן ״הייתי שם״ ב־Match Center והמשחק יופיע כאן.</p> : attendance.map(a => a.match && <button key={a.match_id} className="flex w-full items-center justify-between gap-2 border-t border-border py-3 text-right text-xs" onClick={() => setSelected(a.match_id)}><span>{a.match.home_name} — {a.match.away_name}<span className="mt-1 block text-muted-foreground">{new Date(a.match.kickoff).toLocaleDateString('he-IL')}</span></span><span>{({ win: 'ניצחון', draw: 'תיקו', loss: 'הפסד' } as Record<string, string>)[attendedResult(a.match, a.supported_club_id) ?? ''] ?? 'ללא תוצאה אישית'}</span></button>)}</section>
    </>}
  </div></AppShell>;
}
function PrivateMatchEditor({ userId, match, entry, attended, supportedClubId }: { userId: string; match: Match; entry?: Entry | undefined; attended: boolean; supportedClubId: string | null }) {
  const qc = useQueryClient(); const [note, setNote] = useState(entry?.private_note ?? ''), [trip, setTrip] = useState(entry?.away_trip_note ?? '');
  const [busy, setBusy] = useState(false), [side, setSide] = useState(supportedClubId ?? '');
  async function save() {
    if (busy) return; setBusy(true);
    try { const r = await supabase.rpc('save_fan_diary', { p_match_id: match.id, p_patch: { private_note: note, away_trip_note: trip } }); if (r.error) throw r.error;
      if (attended) { const supported = await supabase.rpc('set_attendance_side', { p_match_id: match.id, p_club_id: side || null }); if (supported.error) throw supported.error; }
      await qc.invalidateQueries({ queryKey: ['fan-diary', userId] }); toast.success('היומן הפרטי נשמר');
    } catch { toast.error('לא הצלחנו לשמור את היומן'); } finally { setBusy(false); }
  }
  return <section className="panel space-y-4 p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-bold">{match.home_name} — {match.away_name}</h2><Button size="sm" variant="clubSoft" onClick={() => shareMatchCard(match).catch(e => { if (e?.name !== 'AbortError') toast.error('לא ניתן ליצור כרטיס כרגע'); })}>כרטיס זיכרון לשיתוף</Button></div>
    {attended && <label className="block text-xs">הקבוצה שעודדתי במשחק<select value={side} onChange={e => setSide(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background p-2"><option value="">צופה ניטרלי / לא מוגדר</option>{match.home_club_id && <option value={match.home_club_id}>{match.home_name}</option>}{match.away_club_id && <option value={match.away_club_id}>{match.away_name}</option>}</select></label>}
    <label className="block text-sm">הזיכרון הפרטי שלי<textarea maxLength={5000} value={note} onChange={e => setNote(e.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-border bg-background p-3" placeholder="מה ארצה לזכור מהמשחק הזה?" /></label>
    <label className="block text-sm">יומן נסיעת חוץ<textarea maxLength={2000} value={trip} onChange={e => setTrip(e.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-border bg-background p-3" placeholder="תכנון וזיכרונות מהנסיעה — רק בשבילי" /></label>
    <Button variant="club" disabled={busy} onClick={save}>{busy ? 'שומר…' : 'שמירת היומן הפרטי'}</Button><p className="text-[10px] text-muted-foreground">כרטיס השיתוף כולל פרטי משחק ציבוריים בלבד. ההערות, הנסיעה והתמונות נשארות ביומן.</p>
  </section>;
}
