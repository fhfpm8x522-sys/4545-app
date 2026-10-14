import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/app-shell';
import { PlayerFace, PlayerRosterLink, usePlayerData } from '@/components/player-tools';
import { displayPlayerName, type Club, type Player } from '@/lib/app-types';
import { useProfile, useSession } from '@/lib/session';
import { per90, isRosterPlayer } from '@/lib/player-model.mjs';
import { Input } from '@/components/ui/input';
export const Route = createFileRoute('/players')({ head: () => ({ meta: [{ title: 'שחקנים והשוואה — 45:45' }] }), component: Players });
function Players() {
  const { user } = useSession(), { data: profile } = useProfile(user?.id);
  const [leftClub, setLeftClub] = useState(''), [rightClub, setRightClub] = useState(''), [left, setLeft] = useState(''), [right, setRight] = useState(''), [season, setSeason] = useState('2026/2027'), [search, setSearch] = useState('');
  const clubs = useQuery({ queryKey: ['clubs'], queryFn: async () => { const r = await supabase.from('clubs').select('*').eq('active', true).order('name_he'); if (r.error) throw r.error; return r.data as Club[]; } });
  const selectedLeft = leftClub || profile?.favorite_club_id || clubs.data?.[0]?.id || '', selectedRight = rightClub || clubs.data?.find(c => c.id !== selectedLeft)?.id || selectedLeft;
  const roster = (clubId: string) => ({ queryKey: ['player-directory', clubId], enabled: !!clubId, queryFn: async () => { const r = await supabase.from('players').select('*').eq('club_id', clubId).eq('active', true).order('name'); if (r.error) throw r.error; return (r.data as Player[]).filter(isRosterPlayer); } });
  const leftPlayers = useQuery(roster(selectedLeft)), rightPlayers = useQuery(roster(selectedRight));
  const a = usePlayerData(left || undefined, season), b = usePlayerData(right || undefined, season);
  const saved = useQuery({ queryKey: ['saved-items', user?.id, 'player'], enabled: !!user, queryFn: async () => { const ids = await supabase.from('fan_saved_items').select('entity_id').eq('user_id', user!.id).eq('kind', 'player'); if (ids.error) throw ids.error; if (!ids.data?.length) return [] as Player[]; const r = await supabase.from('players').select('*').in('id', ids.data.map(row => row.entity_id)); if (r.error) throw r.error; return r.data as Player[]; } });
  const fields: [string, string][] = [['הופעות', 'appearances'], ['שערים', 'goals'], ['בישולים', 'assists'], ['דקות', 'minutes'], ['שערים ל־90', 'goals90'], ['בישולים ל־90', 'assists90']];
  function value(stats: Record<string, number | null> | undefined, field: string) { if (!stats) return null; return field === 'goals90' ? per90(stats['goals'], stats['minutes']) : field === 'assists90' ? per90(stats['assists'], stats['minutes']) : stats[field]; }
  return <AppShell title="שחקנים והשוואה"><div className="space-y-4"><section className="panel club-gradient p-5"><h1 className="text-2xl font-black">כל השחקנים. כל הקבוצות.</h1><p className="mt-2 text-xs text-muted-foreground">משווים באותה עונה, גם בין קבוצות שאינך אוהד.</p></section>
    <section className="panel space-y-4 p-4"><label className="block text-xs">עונת ההשוואה<select value={season} onChange={e => setSeason(e.target.value)} className="mr-2 rounded-lg border border-border bg-background p-2">{['2026/2027', '2025/2026', '2024/2025'].map(s => <option key={s}>{s}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3">{[{ title: 'שחקן ראשון', club: selectedLeft, setClub: setLeftClub, id: left, setId: setLeft, rows: leftPlayers }, { title: 'שחקן שני', club: selectedRight, setClub: setRightClub, id: right, setId: setRight, rows: rightPlayers }].map(p => <div key={p.title} className="space-y-2"><label className="block text-xs">קבוצה — {p.title}<select value={p.club} onChange={e => { p.setClub(e.target.value); p.setId(''); }} className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-xs">{clubs.data?.map(c => <option key={c.id} value={c.id}>{c.name_he}</option>)}</select></label><label className="block text-xs">{p.title}<select value={p.id} onChange={e => p.setId(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-xs"><option value="">בחר שחקן…</option>{p.rows.data?.map(player => <option key={player.id} value={player.id}>{displayPlayerName(player)}</option>)}</select></label>{p.rows.isError && <p className="text-xs">הסגל לא נטען.</p>}</div>)}</div>
      {(a.isLoading || b.isLoading) && <p className="text-xs">טוען נתוני עונה…</p>}{(a.isError || b.isError) && <p className="text-xs text-muted-foreground">לא ניתן לטעון נתוני השוואה כרגע.</p>}
      {(a.data || b.data) && <><div className="grid grid-cols-2 gap-3">{a.data && <PlayerFace player={a.data.player} />}{b.data && <PlayerFace player={b.data.player} />}</div><div className="divide-y divide-border">{fields.map(([label, field]) => { const av = value(a.data?.stats, field), bv = value(b.data?.stats, field); return <div key={field} dir="ltr" className="grid grid-cols-[1fr_1.4fr_1fr] py-3 text-center text-sm"><b>{av == null ? '—' : Number.isInteger(av) ? av : av.toFixed(2)}</b><span dir="rtl" className="text-muted-foreground">{label}</span><b>{bv == null ? '—' : Number.isInteger(bv) ? bv : bv.toFixed(2)}</b></div>; })}</div><p className="text-[10px] text-muted-foreground">מקור: GOAL API · עונת {season}. נתונים חסרים אינם משמשים לחישוב יחס ל־90 דקות.</p></>}
    </section>
    {!!saved.data?.length && <section><h2 className="mb-2 font-bold">השחקנים שאני עוקב אחריהם</h2><div className="grid gap-2 sm:grid-cols-2">{saved.data.map(p => <PlayerRosterLink key={p.id} player={p} />)}</div></section>}
    <section><h2 className="mb-2 font-bold">סגל {clubs.data?.find(c => c.id === selectedLeft)?.name_he}</h2><Input aria-label="חיפוש שחקנים בסגל" value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש שחקן…" className="mb-3" /><div className="grid gap-2 sm:grid-cols-2">{leftPlayers.data?.filter(p => displayPlayerName(p).toLowerCase().includes(search.toLowerCase())).map(p => <PlayerRosterLink key={p.id} player={p} />)}</div></section>
  </div></AppShell>;
}
