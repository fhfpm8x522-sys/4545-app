import { assertResults } from "@/lib/runtime-utils.mjs";
import { QueryFeedback } from "@/components/query-feedback";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useProfile, useSession } from "@/lib/session";
import { displayPlayerName, normalizePosition, type Player, type PlayerStats } from "@/lib/app-types";
import { publicProfiles } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/club")({ head: () => ({ meta: [{ title: "הקבוצה — 45:45" }] }), component: ClubPage });
const TABS = [
  { key: "overview", label: "סקירה" }, { key: "squad", label: "סגל" }, { key: "stats", label: "נתונים" }, { key: "club", label: "מועדון" }, { key: "stand", label: "היציע" },
] as const;
const POSITIONS: [string, string][] = [["goalkeeper", "שוערים"], ["defender", "הגנה"], ["midfielder", "קישור"], ["forward", "התקפה"]];

function ClubPage() {
  const { user } = useSession(); const { data: profile } = useProfile(user?.id); const club = profile?.club; const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("overview");
  const { data, isLoading: dataLoading, error: dataError, refetch: retryData } = useQuery({ queryKey: ["club-page", club?.id], enabled: !!club?.id, queryFn: async () => {
    const playersRes = await supabase.from("players").select("*").eq("club_id", club!.id).eq("active", true).order("number");
    assertResults(playersRes);
    const players = (playersRes.data ?? []) as Player[]; const ids = players.map((p) => p.id);
    const [stats, standing, trophies, history, matches] = await Promise.all([
      ids.length ? supabase.from("player_season_stats").select("*").in("player_id", ids) : Promise.resolve({ data: [] }),
      supabase.from("club_standings").select("*").eq("club_id", club!.id).maybeSingle(),
      supabase.from("club_trophies").select("*").eq("club_id", club!.id).order("sort_order"),
      supabase.from("club_history").select("*").eq("club_id", club!.id).order("event_date", { ascending: false }).limit(50),
      supabase.from("matches").select("*").or(`home_club_id.eq.${club!.id},away_club_id.eq.${club!.id}`).eq("status", "finished"),
    ]);
    assertResults(stats, standing, trophies, history, matches);
    const statMap = new Map<string, PlayerStats>(); for (const s of (stats.data ?? []) as PlayerStats[]) { const current = statMap.get(s.player_id); if (!current || String(s.season) > String(current.season)) statMap.set(s.player_id, s); }
    return { players: players.map((p) => ({ ...p, season: statMap.get(p.id) })), standing: standing.data, trophies: trophies.data ?? [], history: history.data ?? [], matches: matches.data ?? [] };
  }});
  const derived = useMemo(() => deriveTeamStats(data?.matches ?? [], club?.id ?? ""), [data?.matches, club?.id]);
  if (!club) return <AppShell />;
  if (dataLoading || dataError) return <AppShell title="הקבוצה"><QueryFeedback loading={dataLoading} error={dataError} retry={retryData} /></AppShell>;
  const s = data?.standing; const players = data?.players ?? [];
  const top = (k: "goals" | "assists" | "minutes") => players.filter((p) => Number(p.season?.[k] ?? 0) > 0).sort((a, b) => Number(b.season?.[k] ?? 0) - Number(a.season?.[k] ?? 0))[0];


  return <AppShell title="הקבוצה">
    <section className="panel club-gradient stadium-glow overflow-hidden p-6" style={club.hero_image_url ? { backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.78),rgba(0,0,0,.35)),url(${club.hero_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
      <div className="flex items-center gap-4"><div className="grid size-16 place-items-center overflow-hidden rounded-2xl bg-club text-club-foreground">{club.crest_url ? <img src={club.crest_url} alt={club.name_he} className="size-full object-contain" /> : <span className="display-title text-2xl">{club.name_he.slice(0, 1)}</span>}</div><div><h1 className="text-2xl font-black">{club.name_he}</h1><p className="text-sm text-muted-foreground">{club.founded_year ? `נוסדה ${club.founded_year}` : ""}{club.founded_year && club.stadium ? " · " : ""}{club.stadium || ""}</p></div></div>
    </section>

    <div className="my-4 flex gap-2 overflow-x-auto hide-scrollbar">{TABS.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm", tab === t.key ? "border-club bg-club/15 text-club" : "border-border text-muted-foreground")}>{t.label}</button>)}</div>

    {tab === "overview" && <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">{[["מיקום", s?.position ?? "—"], ["נקודות", s?.points ?? "—"], ["הפרש", s?.goal_difference ?? derived.gf - derived.ga], ["ניצחונות", s?.wins ?? derived.wins], ["תיקו", s?.draws ?? derived.draws], ["הפסדים", s?.losses ?? derived.losses]].map(([l, v]) => <div key={String(l)} className="panel p-3 text-center"><div className="display-title text-2xl">{v}</div><div className="text-[11px] text-muted-foreground">{l}</div></div>)}</div>
      <div className="panel divide-y divide-border p-2 text-sm">{([ ["מלך השערים", top("goals"), "goals"], ["מלך הבישולים", top("assists"), "assists"], ["הכי הרבה דקות", top("minutes"), "minutes"] ] as const).map(([l,p,k]) => <div key={l} className="flex justify-between p-3"><span className="text-muted-foreground">{l}</span><span className="font-semibold">{p ? `${displayPlayerName(p)} · ${p.season?.[k] ?? 0}` : "—"}</span></div>)}</div>
    </div>}

    {tab === "squad" && <div className="space-y-5">{players.length === 0 && <p className="panel p-4 text-sm text-muted-foreground">הסגל עוד לא הוזן.</p>}{POSITIONS.map(([pos,label]) => { const group = players.filter((p) => normalizePosition(p.goal_position || p.position) === pos); if (!group.length) return null; return <div key={pos}><h3 className="mb-2 text-sm font-bold text-muted-foreground">{label}</h3><div className="grid grid-cols-2 gap-2">{group.map((p) => <div key={p.id} className="panel flex items-center gap-3 p-3">{p.image_url ? <img src={p.image_url} alt="" className="size-12 rounded-full object-cover" /> : <span className="display-title w-10 text-2xl text-club">{p.number ?? p.shirt_number ?? "—"}</span>}<div className="min-w-0"><p className="truncate text-sm font-semibold">{displayPlayerName(p)}</p><p className="text-[11px] text-muted-foreground">{p.season?.goals ?? 0} שערים · {p.season?.appearances ?? 0} הופעות</p>{p.injured && <p className="text-[10px] text-destructive">פצוע</p>}</div></div>)}</div></div>; })}</div>}

    {tab === "stats" && <div className="panel divide-y divide-border p-2 text-sm">{[["שערי זכות", s?.goals_for ?? derived.gf], ["שערי חובה", s?.goals_against ?? derived.ga], ["ניצחונות", s?.wins ?? derived.wins], ["תיקו", s?.draws ?? derived.draws], ["הפסדים", s?.losses ?? derived.losses], ["ממוצע שערים", (s?.played ?? derived.played) ? Number((Number(s?.goals_for ?? derived.gf) / Number(s?.played ?? derived.played)).toFixed(2)) : "—"]].map(([l,v]) => <div key={String(l)} className="flex justify-between p-3"><span className="text-muted-foreground">{l}</span><span className="font-semibold">{v ?? 0}</span></div>)}</div>}

    {tab === "club" && <div className="space-y-3"><div className="panel p-4 text-sm"><p><span className="text-muted-foreground">אצטדיון: </span>{club.stadium || "—"}</p>{club.stadium_capacity && <p><span className="text-muted-foreground">קיבולת: </span>{club.stadium_capacity.toLocaleString("he-IL")}</p>}{club.description && <p className="mt-2 text-muted-foreground">{club.description}</p>}</div>{data?.trophies.map((t) => <div key={t.id} className="panel flex justify-between p-4 text-sm"><span>🏆 {t.name}</span><span className="display-title text-xl text-club">{t.count}</span></div>)}{data?.history.map((m) => <div key={m.id} className="panel p-4 text-sm"><p className="font-semibold">{m.title}</p>{m.body && <p className="text-muted-foreground">{m.body}</p>}<p className="mt-2 text-[10px] text-muted-foreground">{m.event_date}</p></div>)}</div>}

    {tab === "stand" && <CommunityTab clubId={club.id} userId={user?.id} />}
  </AppShell>;
}

function deriveTeamStats(matches: Array<Record<string, unknown>>, clubId: string) {
  let wins=0,draws=0,losses=0,gf=0,ga=0; for (const m of matches) { const hs=Number(m["home_score"] ?? 0), as=Number(m["away_score"] ?? 0), home=m["home_club_id"]===clubId; const ours=home?hs:as, theirs=home?as:hs; gf+=ours; ga+=theirs; if(ours>theirs)wins++; else if(ours===theirs)draws++; else losses++; } return { wins,draws,losses,gf,ga,played:wins+draws+losses };
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
