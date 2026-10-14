import {leagueTeamTotals} from '@/lib/league-tools.mjs';
import {publicClubSnapshot,savePublicSnapshot,getPublicStorage} from '@/lib/public-offline.mjs';
import {useFootballData} from "@/lib/football-query";
import {CompetitionTables} from "@/components/competition-tables";
import {standingsRows} from "@/lib/football-model.mjs";
import {footballCompetitionBucket} from "@/lib/data";
import { assertResults } from "@/lib/runtime-utils.mjs";
import { QueryFeedback } from "@/components/query-feedback";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useProfile, useSession } from "@/lib/session";
import { displayPlayerName, normalizePosition, type Player, type PlayerStats } from "@/lib/app-types";
import { publicProfiles } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TABS = [
  { key: "overview", label: "סקירה" }, { key: "squad", label: "סגל" }, { key: "stats", label: "נתונים" }, { key: "tables", label: "טבלאות מפעלים" }, { key: "club", label: "מועדון" }, { key: "stand", label: "היציע" },
] as const;
const POSITIONS: [string, string][] = [["goalkeeper", "שוערים"], ["defender", "הגנה"], ["midfielder", "קישור"], ["forward", "התקפה"]];

export function ClubPage({clubId}:{clubId?:string|undefined}={}) {
  const { user } = useSession(); const { data: profile } = useProfile(user?.id); const other=useQuery({queryKey:["other-club-page",clubId],enabled:!!clubId,queryFn:async()=>{const r=await supabase.from("clubs").select("*").eq("id",clubId!).eq("active",true).single();if(r.error)throw r.error;return r.data;}}); const club = clubId?other.data:profile?.club; const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("overview");
  const football=useFootballData("club",club?.id);
  const { data, isLoading: dataLoading, error: dataError, refetch: retryData } = useQuery({ queryKey: ["club-page", club?.id], enabled: !!club?.id, queryFn: async () => {
    const playersRes = await supabase.from("players").select("*").eq("club_id", club!.id).eq("active", true).order("number");
    assertResults(playersRes);
    const players = (playersRes.data ?? []) as Player[]; const ids = players.map((p) => p.id);
    const [stats, standing, trophies, history, matches] = await Promise.all([
      ids.length ? supabase.from("player_season_stats").select("*").in("player_id", ids).eq("season","2026/2027") : Promise.resolve({ data: [] }),
      supabase.from("club_standings").select("*").eq("club_id", club!.id).maybeSingle(),
      supabase.from("club_trophies").select("*").eq("club_id", club!.id).order("sort_order"),
      supabase.from("club_history").select("*").eq("club_id", club!.id).order("event_year", { ascending: false }).limit(50),
      supabase.from("matches").select("*").or(`home_club_id.eq.${club!.id},away_club_id.eq.${club!.id}`).eq("status", "finished"),
    ]);
    assertResults(stats, standing, trophies, history, matches);
    const statMap = new Map<string, PlayerStats>(); for (const s of (stats.data ?? []) as PlayerStats[]) { const current = statMap.get(s.player_id); if (!current || String(s.season) > String(current.season)) statMap.set(s.player_id, s); }
    return { players: players.map((p) => ({ ...p, season: statMap.get(p.id) })), standing: standing.data, trophies: trophies.data ?? [], history: history.data ?? [], matches: matches.data ?? [] };
  }});
  const derived = useMemo(() => leagueTeamTotals((data?.matches ?? []).filter(m=>footballCompetitionBucket(m.competition)==="league"), club?.id ?? ""), [data?.matches, club?.id]);
  useEffect(()=>{if(club&&football.data?.competitions)savePublicSnapshot(publicClubSnapshot(club,football.data.competitions.map((c:any)=>({id:c.id,name:c.name,rows:standingsRows(c.data)}))),getPublicStorage());},[club,football.data]);
  if (!club) return <AppShell />;
  if (dataLoading || dataError) return <AppShell title="הקבוצה"><QueryFeedback loading={dataLoading} error={dataError} retry={retryData} /></AppShell>;
  const competitions=football.data?.competitions??[];
  const domestic=competitions.find((c:any)=>footballCompetitionBucket(c.name)==="league");
  const teamIds=[club.goal_team_id,club.goal_api_id,football.data?.team?.id,football.data?.team?.apiId].filter(Boolean).map(String);
  const leagueRow=standingsRows(domestic?.data).find(r=>teamIds.includes(r.teamId));
  const s = leagueRow ? {position:leagueRow.position,points:leagueRow.points,played:leagueRow.played,wins:leagueRow.wins,draws:leagueRow.draws,losses:leagueRow.losses,goals_for:leagueRow.gf,goals_against:leagueRow.ga,goal_difference:leagueRow.gf!==null&&leagueRow.ga!==null?leagueRow.gf-leagueRow.ga:null} : (String(data?.standing?.season??'').replace('-','/')==='2026/2027'?data?.standing:null);
  const players = (data?.players ?? []).map(p=>{const liveStats=football.data?.playerStats?.find((s:any)=>s.player_id===p.id);return liveStats?{...p,season:{...p.season,...liveStats}}:p;});
  const currentGoals=s?.goals_for??derived?.gf,currentPlayed=s?.played??derived?.played;
  const goalsAverage=typeof currentGoals==='number'&&typeof currentPlayed==='number'&&currentPlayed>0?Number((currentGoals/currentPlayed).toFixed(2)):'—';
  const top = (k: "goals" | "assists" | "minutes") => players.filter((p) => Number(p.season?.[k] ?? 0) > 0).sort((a, b) => Number(b.season?.[k] ?? 0) - Number(a.season?.[k] ?? 0))[0];


  return <AppShell title="הקבוצה">
    <section className="panel club-gradient stadium-glow overflow-hidden p-6" style={club.hero_image_url ? { backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.78),rgba(0,0,0,.35)),url(${club.hero_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
      <div className="flex items-center gap-4"><div className="grid size-16 place-items-center overflow-hidden rounded-2xl bg-club text-club-foreground">{club.crest_url ? <img src={club.crest_url} alt={club.name_he} className="size-full object-contain" /> : <span className="display-title text-2xl">{club.name_he.slice(0, 1)}</span>}</div><div><h1 className="text-2xl font-black">{club.name_he}</h1><p className="text-sm text-muted-foreground">{club.founded_year ? `נוסדה ${club.founded_year}` : ""}{club.founded_year && club.stadium ? " · " : ""}{club.stadium || ""}</p></div></div>
    </section>

    <div className="my-4 flex gap-2 overflow-x-auto hide-scrollbar">{TABS.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm", tab === t.key ? "border-club bg-club/15 text-club" : "border-border text-muted-foreground")}>{t.label}</button>)}</div>

    <Link to="/players" className="mb-4 inline-block rounded-xl border border-club/30 bg-club/10 px-4 py-2 text-sm font-bold text-club">השוואת שחקנים מכל הקבוצות ←</Link>
    {football.isFetching && <p className="mb-3 text-xs text-muted-foreground">מעדכן דירוגים ונתוני שחקנים מהספק…</p>}
    {football.data?.stale&&<p className="mb-3 text-xs text-amber-400">מוצגים נתונים שמורים; מקור הנתונים מושהה או אינו זמין.</p>}
    {football.error && <p className="mb-3 text-xs text-muted-foreground">נתוני הספק אינם זמינים כרגע. נתונים קיימים נשמרים.</p>}
    {tab === "tables" && <CompetitionTables competitions={competitions} teamId={club.goal_team_id} />}
    {tab === "overview" && <div className="space-y-3"><p className="text-xs text-muted-foreground">סיכום הליגה לעונת 2026/27</p>
      <div className="grid grid-cols-3 gap-2">{[["מיקום", s?.position ?? "—"], ["נקודות", s?.points ?? "—"], ["הפרש", s?.goal_difference ?? (derived?derived.gf-derived.ga:'—')], ["ניצחונות", s?.wins ?? derived?.wins], ["תיקו", s?.draws ?? derived?.draws], ["הפסדים", s?.losses ?? derived?.losses]].map(([l, v]) => <div key={String(l)} className="panel p-3 text-center"><div className="display-title text-2xl">{v??"—"}</div><div className="text-[11px] text-muted-foreground">{l}</div></div>)}</div>
      <div className="panel divide-y divide-border p-2 text-sm">{([ ["מלך השערים", top("goals"), "goals"], ["מלך הבישולים", top("assists"), "assists"], ["הכי הרבה דקות", top("minutes"), "minutes"] ] as const).map(([l,p,k]) => <div key={l} className="flex justify-between p-3"><span className="text-muted-foreground">{l}</span><span className="font-semibold">{p ? `${displayPlayerName(p)} · ${p.season?.[k] ?? 0}` : "—"}</span></div>)}</div>
    </div>}

    {tab === "squad" && <div className="space-y-5">{players.length === 0 && <p className="panel p-4 text-sm text-muted-foreground">הסגל עוד לא הוזן.</p>}{POSITIONS.map(([pos,label]) => { const group = players.filter((p) => normalizePosition(p.goal_position || p.position) === pos); if (!group.length) return null; return <div key={pos}><h3 className="mb-2 text-sm font-bold text-muted-foreground">{label}</h3><div className="grid grid-cols-2 gap-2">{group.map((p) => <Link to="/player/$playerId" params={{playerId:p.id}} key={p.id} className="panel flex items-center gap-3 p-3">{p.image_url ? <img src={p.image_url} alt="" className="size-12 rounded-full object-cover" /> : <span className="display-title w-10 text-2xl text-club">{p.number ?? p.shirt_number ?? "—"}</span>}<div className="min-w-0"><p className="truncate text-sm font-semibold">{displayPlayerName(p)}</p><p className="text-[11px] text-muted-foreground">{p.season?.goals ?? "—"} שערים · {p.season?.appearances ?? "—"} הופעות</p>{p.injured && <p className="text-[10px] text-destructive">פצוע לפי הספק</p>}</div></Link>)}</div></div>; })}</div>}

    {tab === "stats" && <div className="panel divide-y divide-border p-2 text-sm">{[["שערי זכות", s?.goals_for ?? derived?.gf], ["שערי חובה", s?.goals_against ?? derived?.ga], ["ניצחונות", s?.wins ?? derived?.wins], ["תיקו", s?.draws ?? derived?.draws], ["הפסדים", s?.losses ?? derived?.losses], ["ממוצע שערים", goalsAverage]].map(([l,v]) => <div key={String(l)} className="flex justify-between p-3"><span className="text-muted-foreground">{l}</span><span className="font-semibold">{v ?? "—"}</span></div>)}</div>}

    {tab === "club" && <div className="space-y-3"><div className="panel p-4 text-sm"><p><span className="text-muted-foreground">אצטדיון: </span>{club.stadium || "—"}</p>{club.stadium_capacity && <p><span className="text-muted-foreground">קיבולת: </span>{club.stadium_capacity.toLocaleString("he-IL")}</p>}{(club.heritage_summary||club.description) && <p className="mt-2 text-muted-foreground">{club.heritage_summary||club.description}</p>}{club.history_source_url&&<a href={club.history_source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-club underline">מקור הסקירה ההיסטורית</a>}</div>{data?.trophies.map((t) => <div key={t.id} className="panel flex justify-between p-4 text-sm"><span>🏆 {t.name}</span><span className="display-title text-xl text-club">{t.count}</span>{t.source_url&&<a className="text-xs text-club underline" href={t.source_url} target="_blank" rel="noreferrer">מקור</a>}</div>)}{data?.history.map((m) => <div key={m.id} className="panel p-4 text-sm"><p className="font-semibold">{m.title}</p>{m.body && <p className="text-muted-foreground">{m.body}</p>}<p className="mt-2 text-[10px] text-muted-foreground">{m.event_year??m.event_date}</p>{m.source_url&&<a className="mt-2 inline-block text-xs text-club underline" href={m.source_url} target="_blank" rel="noreferrer">מקור</a>}</div>)}</div>}

    {tab === "stand" && <CommunityTab clubId={club.id} userId={user?.id} />}
  </AppShell>;
}

function CommunityTab({ clubId, userId }: { clubId: string; userId?: string | undefined }) {
  const qc = useQueryClient(); const [post, setPost] = useState(""); const [message, setMessage] = useState("");
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ["community", clubId], refetchInterval: 10000, queryFn: async () => {
    const [posts, chat] = await Promise.all([
      supabase.from("community_posts").select("*").eq("club_id", clubId).is("removed_at", null).order("created_at", { ascending: false }).limit(50),
      supabase.from("chat_messages").select("*").eq("club_id", clubId).is("match_id", null).is("removed_at", null).order("created_at", { ascending: false }).limit(100),
    ]);
    assertResults(posts, chat);
    const ids = [...(posts.data ?? []).map((x) => x.author_id), ...(chat.data ?? []).map((x) => x.author_id)]; const profiles = await publicProfiles(ids);
    return { posts: posts.data ?? [], chat: [...(chat.data ?? [])].reverse(), profiles };
  }});
  async function addPost() { if (!userId || !post.trim()) return; const { error } = await supabase.from("community_posts").insert({ club_id: clubId, author_id: userId, body: post.trim() }); if (error) toast.error(error.message); else { setPost(""); qc.invalidateQueries({ queryKey: ["community", clubId] }); } }
  async function addMessage() { if (!userId || !message.trim()) return; const { error } = await supabase.from("chat_messages").insert({ club_id: clubId, author_id: userId, body: message.trim() }); if (error) toast.error(error.message); else { setMessage(""); qc.invalidateQueries({ queryKey: ["community", clubId] }); } }
  if (error || isLoading) return <QueryFeedback error={error} loading={isLoading} retry={refetch} />;
  return <div className="space-y-5"><section><h2 className="mb-2 font-bold">היציע שלנו</h2><div className="panel p-4"><textarea value={post} onChange={(e) => setPost(e.target.value)} placeholder="מה קורה ביציע?" className="min-h-20 w-full resize-none bg-transparent text-sm outline-none" /><Button variant="club" size="sm" disabled={!post.trim()} onClick={addPost}>פרסום</Button></div><div className="mt-2 space-y-2">{data?.posts.map((p) => { const a=data.profiles.get(p.author_id); return <div key={p.id} className="panel p-4"><p className="text-xs font-bold text-club">{a?.display_name || a?.username || "אוהד"}</p><p className="mt-1 text-sm">{p.body}</p></div>; })}</div></section>
    <section><h2 className="mb-2 font-bold">Club Chat</h2><div className="panel max-h-96 overflow-y-auto p-3">{data?.chat.map((m) => { const a=data.profiles.get(m.author_id); return <div key={m.id} className="border-b border-border py-2 last:border-0"><p className="text-[11px] font-bold text-club">{a?.display_name || a?.username || "אוהד"}</p><p className="text-sm">{m.body}</p></div>; })}</div><div className="mt-2 flex gap-2"><Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="הודעה ליציע..." onKeyDown={(e) => { if (e.key === "Enter") addMessage(); }} /><Button variant="club" onClick={addMessage}>שלח</Button></div></section>
  </div>;
}
