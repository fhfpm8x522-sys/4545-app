import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { displayPlayerName, type Match, type Player } from '@/lib/app-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Choice = { value?: string; home?: number; away?: number; side?: string; players?: string[] };
type Guess = { kind: string; choice: Choice; points: number | null; settled_at: string | null };
const rules = [
  ['lineup', 'מי יפתח בהרכב?', 22], ['first_team', 'מי תכבוש ראשונה?', 15],
  ['first_scorer', 'מי יכבוש ראשון?', 20], ['halftime', 'מי תוביל במחצית?', 15],
  ['goals', 'מעל או מתחת ל־2.5 שערים?', 10], ['yellows', 'מעל או מתחת ל־5.5 צהובים?', 10],
  ['winner', 'מי תנצח?', 10], ['exact_score', 'מה תהיה התוצאה?', 25],
] as const;

export function FanGuesses({ match, userId, favoriteClubId }: { match: Match; userId?: string | undefined; favoriteClubId?: string | null | undefined }) {
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState<'guesses' | 'rank'>('guesses');
  const [rankClub, setRankClub] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [pending, setPending] = useState<{ kind: string; choice: Choice } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const kickoff = Date.parse(match.kickoff);
  const open = match.status === 'scheduled' && kickoff > now;
  const clubs = [match.home_club_id, match.away_club_id].filter((id): id is string => !!id);
  const query = useQuery({ queryKey: ['fan-guesses', match.id, userId], enabled: !!userId, refetchInterval: 30000, queryFn: async () => {
    const [mine, facts, history, players] = await Promise.all([
      supabase.from('fan_guesses').select('kind,choice,points,settled_at').eq('match_id', match.id).eq('user_id', userId!),
      supabase.from('fan_guess_facts').select('facts,checked_at').eq('match_id', match.id).maybeSingle(),
      supabase.from('fan_guesses').select('points').eq('user_id', userId!).not('points', 'is', null),
      clubs.length ? supabase.from('players').select('*').in('club_id', clubs).eq('active', true).order('name') : Promise.resolve({ data: [], error: null }),
    ]);
    if (mine.error || facts.error || history.error || players.error) throw mine.error || facts.error || history.error || players.error;
    return { mine: (mine.data ?? []) as Guess[], facts: facts.data?.facts ?? {}, checkedAt: facts.data?.checked_at,
      history: history.data ?? [], players: (players.data ?? []) as Player[] };
  } });
  // Refresh only canonical provider facts. Neither the browser nor another fan supplies outcomes or points.
  useQuery({ queryKey: ['fan-guess-refresh', match.id, userId], enabled: !!userId && !query.isError && (kickoff < now + 2 * 3600000), refetchInterval: 60000, retry: false, queryFn: async () => {
    const result = await supabase.functions.invoke('match-guesses', { body: { mode: 'match', match_id: match.id } });
    if (result.error) throw result.error;
    await qc.invalidateQueries({ queryKey: ['fan-guesses', match.id] });
    return result.data;
  } });
  const ranks = useQuery({ queryKey: ['fan-guess-ranks', rankClub ? favoriteClubId : null, match.goal_league_year], enabled: !!userId && tab === 'rank', refetchInterval: 60000, queryFn: async () => {
    const r = await supabase.rpc('fan_guess_leaderboard', { p_club_id: rankClub ? favoriteClubId : null, p_season: match.goal_league_year ?? null });
    if (r.error) throw r.error; return r.data as { user_id: string; username: string; display_name: string; avatar_url: string | null; total_points: number; correct_guesses: number; graded_guesses: number; rank: number }[];
  } });
  const mine = useMemo(() => new Map(query.data?.mine.map(g => [g.kind, g])), [query.data?.mine]);
  const matchPoints = (query.data?.mine ?? []).reduce((n, g) => n + (g.points ?? 0), 0);
  const history = query.data?.history ?? [];
  const names = useMemo(() => new Map(query.data?.players.map(p => [p.id, displayPlayerName(p, p.name)])), [query.data?.players]);
  function label(choice: Choice) {
    if (choice.players) return `${choice.side === 'home' ? match.home_name : match.away_name} · ${choice.players.length} שחקנים`;
    if (choice.home !== undefined) return `${match.home_name}: ${choice.home} · ${match.away_name}: ${choice.away}`;
    return ({ home: match.home_name, away: match.away_name, draw: 'תיקו', none: 'ללא שער', over: 'מעל', under: 'מתחת' } as Record<string, string | null>)[choice.value!] ?? names.get(choice.value!) ?? 'שחקן';
  }
  async function save() {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const r = await supabase.rpc('save_fan_guess', { p_match_id: match.id, p_kind: pending.kind, p_choice: pending.choice });
      if (r.error) throw r.error;
      toast.success('הניחוש נשמר. אפשר לעדכן עד מועד הסגירה.'); setPending(null); setActive(null);
      await Promise.all([qc.invalidateQueries({ queryKey: ['fan-guesses', match.id] }), qc.invalidateQueries({ queryKey: ['match', match.id] })]);
    } catch { toast.error('הניחוש לא נשמר. ייתכן שמועד הסגירה עבר או שההרכב הרשמי כבר פורסם.'); }
    finally { setBusy(false); }
  }
  return <section className="panel overflow-hidden">
    <div className="bg-club/10 p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-black">תחנת הניחושים ⚽</h2><span className="rounded-full bg-club px-3 py-1 text-xs font-bold text-club-foreground">נקודות אוהדים</span></div>
      <p className="mt-2 text-xs text-muted-foreground">{open ? `הניחושים נסגרים בעוד ${countdown(kickoff - now)}` : 'הניחושים סגורים למשחק זה'} · תוצאות בזמן הרגיל, כולל תוספת זמן.</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">{[['נקודות במשחק', matchPoints], ['נקודות בכל המשחקים', history.reduce((n, g) => n + Number(g.points), 0)], ['ניחושים עם ניקוד', history.filter(g => Number(g.points) > 0).length]].map(([title, value]) => <div key={title} className="rounded-xl bg-background p-3"><strong className="block text-xl">{value}</strong><span className="text-[10px] text-muted-foreground">{title}</span></div>)}</div>
    </div>
    {!userId ? <p className="p-5 text-sm text-muted-foreground">התחבר כדי לשמור ניחושים ולראות את הדירוג שלך.</p> : <div className="p-4">
      <div className="mb-4 flex gap-2"><Button variant={tab === 'guesses' ? 'club' : 'ghost'} onClick={() => setTab('guesses')}>הניחושים שלי</Button><Button variant={tab === 'rank' ? 'club' : 'ghost'} onClick={() => setTab('rank')}>דירוג אוהדים</Button></div>
      {query.isError ? <div className="text-sm text-muted-foreground">לא ניתן לטעון ניחושים כרגע. <button className="underline" onClick={() => query.refetch()}>נסה שוב</button></div> : query.isLoading ? <p className="text-sm">טוען ניחושים…</p> : tab === 'guesses' ? <>
        <div className="grid gap-3 sm:grid-cols-2">{rules.map(([kind, title, points]) => {
          const guess = mine.get(kind);
          const lineupPublished = kind === 'lineup' && !!query.data?.facts?.[`lineup_${guess?.choice.side ?? 'home'}`];
          const editable = open && (kind !== 'lineup' || (now < kickoff - 3600000 && !lineupPublished));
          return <div key={kind} className="rounded-xl border border-border p-4"><div className="flex justify-between gap-2"><h3 className="text-sm font-bold">{title}</h3><span className="shrink-0 text-xs text-club">עד {points} נק׳</span></div>
            <p className="my-3 min-h-5 text-xs text-muted-foreground">{guess ? label(guess.choice) : 'עדיין לא בחרת'}</p>
            {guess && <p className="mb-3 text-xs font-bold">{guess.points === null ? 'ממתין לנתוני ספק מאומתים' : `${guess.points} נקודות ✓`}</p>}
            {kind === 'lineup' && <p className="mb-3 text-[10px] text-muted-foreground">2 נקודות לכל פותח נכון. נסגר שעה לפני המשחק או עם פרסום ההרכב.</p>}
            {kind === 'first_scorer' && <p className="mb-3 text-[10px] text-muted-foreground">שערים עצמיים לא נספרים בשאלת הכובש.</p>}
            <Button className="w-full" variant="clubSoft" disabled={!editable} onClick={() => setActive(kind)}>{editable ? guess ? 'עדכון הבחירה' : 'בחירת ניחוש' : 'הבחירה נסגרה'}</Button>
          </div>;
        })}</div><p className="mt-4 text-[11px] text-muted-foreground">הניקוד מחושב בשרת מנתוני הספק. חוסר כיסוי יישאר בהמתנה. אין כסף או פרסים במערכת.</p>
      </> : <div>
        <div className="mb-3 flex gap-2"><Button size="sm" variant={!rankClub ? 'club' : 'ghost'} onClick={() => setRankClub(false)}>כל האוהדים</Button><Button size="sm" disabled={!favoriteClubId} variant={rankClub ? 'club' : 'ghost'} onClick={() => setRankClub(true)}>אוהדי הקבוצה שלי</Button></div>
        <p className="mb-3 text-xs text-muted-foreground">{match.goal_league_year ? `עונת ${match.goal_league_year}` : 'כל העונות'} · עד 100 אוהדים · שאלות שנוקדו בלבד</p>
        {ranks.isError ? <p className="text-sm">הדירוג אינו זמין כרגע.</p> : ranks.isLoading ? <p>טוען דירוג…</p> : !ranks.data?.length ? <p className="text-sm text-muted-foreground">הדירוג יתחיל להופיע אחרי ניקוד המשחקים.</p> : ranks.data.map(r => <div key={r.user_id} className={`flex items-center gap-3 border-b border-border py-3 ${r.user_id === userId ? 'bg-club/10' : ''}`}><strong className="w-7 text-center">{r.rank}</strong>{r.avatar_url && <img src={r.avatar_url} alt="" className="size-8 rounded-full object-cover" />}<div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{r.display_name || r.username}{r.user_id === userId ? ' · אתה' : ''}</p><p className="text-[10px] text-muted-foreground">{r.correct_guesses} ניחושים עם ניקוד מתוך {r.graded_guesses}</p></div><strong className="text-club">{r.total_points} נק׳</strong></div>)}
      </div>}
    </div>}
    <Dialog open={!!active} onOpenChange={v => { if (!v) setActive(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{rules.find(r => r[0] === active)?.[1]}</DialogTitle><DialogDescription>הבחירה תישמר רק לאחר האישור שלך. אפשר לשנות לפני הסגירה.</DialogDescription></DialogHeader>
      {active && <GuessPicker key={active} kind={active} match={match} players={query.data?.players ?? []} initial={mine.get(active)?.choice} select={choice => setPending({ kind: active, choice })} />}
    </DialogContent></Dialog>
    <Dialog open={!!pending} onOpenChange={v => { if (!v && !busy) setPending(null); }}><DialogContent><DialogHeader><DialogTitle>סגור על הניחוש שלך?</DialogTitle><DialogDescription>{pending ? label(pending.choice) : ''}</DialogDescription></DialogHeader><Button variant="club" disabled={busy} onClick={save}>{busy ? 'שומר…' : 'כן, שומרים את הניחוש'}</Button><Button variant="ghost" disabled={busy} onClick={() => setPending(null)}>חזרה לבחירה</Button></DialogContent></Dialog>
  </section>;
}

function GuessPicker({ kind, match, players, initial, select }: { kind: string; match: Match; players: Player[]; initial?: Choice | undefined; select: (choice: Choice) => void }) {
  const [side, setSide] = useState(initial?.side ?? 'home');
  const [selected, setSelected] = useState<string[]>(initial?.players ?? []);
  const [search, setSearch] = useState('');
  const [home, setHome] = useState(initial?.home?.toString() ?? ''); const [away, setAway] = useState(initial?.away?.toString() ?? '');
  const roster = players.filter(p => (kind !== 'lineup' || p.club_id === (side === 'home' ? match.home_club_id : match.away_club_id)) && displayPlayerName(p, p.name).toLowerCase().includes(search.toLowerCase()));
  if (kind === 'exact_score') return <><div dir="ltr" className="grid grid-cols-2 gap-3">{[[match.home_name, home, setHome], [match.away_name, away, setAway]].map(([name, value, setter], i) => <label key={i} className="text-center text-sm">{name as string}<Input aria-label={`שערים ${name}`} className="mt-2 text-center text-xl" inputMode="numeric" value={value as string} onChange={e => (setter as (v: string) => void)(e.target.value.replace(/\D/g, '').slice(0, 2))} /></label>)}</div><Button variant="club" disabled={home === '' || away === ''} onClick={() => select({ home: Number(home), away: Number(away) })}>אישור הבחירה</Button></>;
  if (kind === 'lineup' || kind === 'first_scorer') return <>
    {kind === 'lineup' && <><div className="flex gap-2">{[['home', match.home_name], ['away', match.away_name]].map(([value, name]) => <Button key={value} size="sm" variant={side === value ? 'club' : 'ghost'} onClick={() => { setSide(value!); setSelected([]); }}>{name}</Button>)}</div><p className="text-xs">בחרת {selected.length} מתוך 11 פותחים</p>{selected.length > 0 && <div className="grid grid-cols-3 gap-2 rounded-xl border-2 border-white/20 bg-green-900 p-3">{selected.map(id => { const p = players.find(p => p.id === id)!; return <button key={id} className="rounded-lg bg-black/20 p-2 text-[10px] text-white" onClick={() => setSelected(selected.filter(x => x !== id))}>{p.image_url && <img src={p.image_url} alt="" className="mx-auto mb-1 size-9 rounded-full object-cover" />}{displayPlayerName(p, p.name)} ×</button>; })}</div>}</>}
    <Input aria-label="חיפוש שחקן" placeholder="חפש שחקן…" value={search} onChange={e => setSearch(e.target.value)} />
    {kind === 'first_scorer' && <Button variant="clubSoft" onClick={() => select({ value: 'none' })}>ללא כובש (0:0 או שערים עצמיים בלבד)</Button>}
    {!roster.length && <p className="text-xs text-muted-foreground">לא נמצאו שחקנים. סגלים זמינים לפי כיסוי הספק.</p>}
    <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">{roster.map(p => <button key={p.id} disabled={kind === 'lineup' && selected.length >= 11 && !selected.includes(p.id)} className={`flex items-center gap-2 rounded-lg border p-2 text-right text-xs ${selected.includes(p.id) ? 'border-club bg-club/10' : 'border-border'}`} onClick={() => kind === 'lineup' ? setSelected(selected.includes(p.id) ? selected.filter(id => id !== p.id) : [...selected, p.id]) : select({ value: p.id })}>{p.image_url && <img src={p.image_url} alt="" className="size-9 rounded-full object-cover" />}<span><strong>{displayPlayerName(p, p.name)}</strong><span className="block text-[10px] text-muted-foreground">{p.shirt_number ?? p.number ?? ''} · {p.position ?? ''} · {p.club_id === match.home_club_id ? match.home_name : match.away_name}</span></span></button>)}</div>
    {kind === 'lineup' && <Button variant="club" disabled={selected.length !== 11} onClick={() => select({ side, players: selected })}>אישור 11 הפותחים</Button>}
  </>;
  const choices = kind === 'goals' || kind === 'yellows' ? [['over', 'מעל'], ['under', 'מתחת']] : [['home', match.home_name], [kind === 'first_team' ? 'none' : 'draw', kind === 'first_team' ? 'ללא שער' : 'תיקו'], ['away', match.away_name]];
  return <div className="grid gap-3">{choices.map(([value, title]) => <Button key={value} variant={initial?.value === value ? 'club' : 'clubSoft'} onClick={() => select({ value: value! })}>{title}</Button>)}</div>;
}
function countdown(ms: number) { const seconds = Math.max(0, Math.floor(ms / 1000)); const days = Math.floor(seconds / 86400); return `${days ? `${days} ימים · ` : ''}${String(Math.floor(seconds / 3600) % 24).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
