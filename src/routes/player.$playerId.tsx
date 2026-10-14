import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { QueryFeedback } from '@/components/query-feedback';
import { PlayerFace, PlayerMetricRows, SavedItemButton, usePlayerData } from '@/components/player-tools';
import { useSession } from '@/lib/session';
import { birthdayLabel } from '@/lib/player-model.mjs';
import { supabase } from '@/integrations/supabase/client';
export const Route = createFileRoute('/player/$playerId')({ head: () => ({ meta: [{ title: 'כרטיס שחקן — 45:45' }] }), component: PlayerPage });
function PlayerPage() {
  const { playerId } = Route.useParams(), { user } = useSession(); const [season, setSeason] = useState('2026/2027');
  const q = usePlayerData(playerId, season);
  const history = useQuery({ queryKey: ['shirt-history', playerId], queryFn: async () => { const r = await supabase.from('player_shirt_history').select('*,club:clubs(name_he)').eq('player_id', playerId).order('observed_at', { ascending: false }).limit(100); if (r.error) throw r.error; return r.data ?? []; } });
  const club = useQuery({ queryKey: ['player-club', q.data?.player.club_id], enabled: !!q.data?.player.club_id, queryFn: async () => { const r = await supabase.from('clubs').select('name_he').eq('id', q.data!.player.club_id!).maybeSingle(); if (r.error) throw r.error; return r.data; } });
  return <AppShell title="כרטיס שחקן"><div className="space-y-4"><QueryFeedback loading={q.isLoading} error={q.error} retry={q.refetch} />{q.data && <>
    <section className="panel club-gradient p-5"><PlayerFace player={q.data.player} /><p className="mt-3 text-sm">{club.data?.name_he}</p><div className="mt-4 flex flex-wrap gap-2"><SavedItemButton kind="player" id={playerId} userId={user?.id} label="מעקב אחרי השחקן" /><Link to="/players" className="rounded-lg border border-border px-3 py-2 text-xs">השוואת שחקנים מכל הקבוצות</Link></div></section>
    <section className="panel p-5"><h2 className="mb-3 font-bold">נתוני עונה</h2><label className="text-xs">עונה<select className="mr-3 rounded-lg border border-border bg-background p-2" value={season} onChange={e => setSeason(e.target.value)}>{['2026/2027', '2025/2026', '2024/2025'].map(s => <option key={s}>{s}</option>)}</select></label><PlayerMetricRows stats={q.data.stats} /><p className="mt-2 text-[10px] text-muted-foreground">מקור: {q.data.source}{q.data.updatedAt ? ` · נמשכו ${new Date(q.data.updatedAt).toLocaleString('he-IL')}` : ''}. נתון חסר אינו מחושב כאפס.</p>{q.data.error && <p className="mt-2 text-xs text-muted-foreground">הספק אינו זמין כרגע; מוצגים נתונים שמורים ככל שישנם.</p>}</section>
    <section className="panel p-5"><h2 className="mb-3 font-bold">על השחקן</h2>{birthdayLabel(q.data.player.birth_date) && <p className="text-sm">🎂 יום הולדת: {birthdayLabel(q.data.player.birth_date)}</p>}{q.data.player.nationality && <p className="mt-2 text-sm">לאום: {q.data.player.nationality}</p>}{q.data.player.is_captain && <p className="mt-2 text-sm">קפטן לפי נתוני GOAL. סגנים יוצגו כאשר יש מקור מאומת.</p>}</section>
    <section className="panel p-5"><h2 className="mb-2 font-bold">היסטוריית מספרי חולצה</h2><p className="mb-3 text-[10px] text-muted-foreground">תיעוד המספרים שנצפו באפליקציה החל מהפעלת המעקב; תאריך התיעוד אינו בהכרח תחילת לבישת המספר.</p>{history.isError ? <p className="text-xs">ההיסטוריה אינה זמינה כרגע.</p> : !history.data?.length ? <p className="text-xs text-muted-foreground">עדיין אין תיעוד.</p> : history.data.map(row => <div key={row.id} className="flex justify-between gap-2 border-t border-border py-3 text-xs"><span><b className="text-lg text-club">{row.shirt_number}</b> · {row.club?.name_he ?? ''}</span><span>{new Date(row.observed_at).toLocaleDateString('he-IL')}{row.source_url && <a className="mr-2 text-club underline" href={row.source_url} target="_blank" rel="noreferrer">מקור</a>}</span></div>)}</section>
  </>}</div></AppShell>;
}
