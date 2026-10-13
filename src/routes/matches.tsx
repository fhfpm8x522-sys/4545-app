import { QueryFeedback } from "@/components/query-feedback";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { NextMatchCard, type Match } from "@/components/next-match-card";
import { useProfile, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { footballCompetitionBucket } from "@/lib/data";

export const Route = createFileRoute("/matches")({
  head: () => ({ meta: [{ title: "משחקים — 45:45" }] }),
  component: MatchesPage,
});

const FILTERS = [
  { key: "all", label: "הכל" }, { key: "league", label: "ליגה" }, { key: "cup", label: "גביע" }, { key: "europe", label: "אירופה" }, { key: "toto", label: "גביע הטוטו" },
];

function MatchesPage() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const clubId = profile?.favorite_club_id;
  const [filter, setFilter] = useState("all");
  const { data: rows, isLoading, error, refetch } = useQuery({
    queryKey: ["matches", clubId], enabled: !!clubId, refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("matches").select("*").or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`).order("kickoff");
      if (error) throw error;
      return (data ?? []) as Match[];
    },
  });

  const matches = useMemo(() => {
    const list = (rows ?? []).filter((m) => filter === "all" || footballCompetitionBucket(m.competition) === filter);
    const now = Date.now();
    return [...list].sort((a, b) => {
      const rank = (m: Match) => m.status === "live" ? 0 : (m.status !== "finished" && new Date(m.kickoff).getTime() >= now ? 1 : 2);
      const ra = rank(a), rb = rank(b); if (ra !== rb) return ra - rb;
      const ta = new Date(a.kickoff).getTime(), tb = new Date(b.kickoff).getTime();
      return ra === 2 ? tb - ta : ta - tb;
    });
  }, [rows, filter]);

  const upcoming = matches.filter((m) => m.status === "live" || (m.status !== "finished" && new Date(m.kickoff).getTime() >= Date.now()));
  const finished = matches.filter((m) => m.status === "finished" || (m.status !== "live" && new Date(m.kickoff).getTime() < Date.now()));

  if (isLoading || error) return <AppShell title="משחקים"><QueryFeedback loading={isLoading} error={error} retry={refetch} /></AppShell>;
  return <AppShell title="משחקים">
    <div className="mb-4 flex gap-2 overflow-x-auto hide-scrollbar">{FILTERS.map((f) => <button key={f.key} onClick={() => setFilter(f.key)} className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm", filter === f.key ? "border-club bg-club/15 text-club" : "border-border text-muted-foreground")}>{f.label}</button>)}</div>
    {upcoming[0] && <div className="mb-5"><NextMatchCard match={upcoming[0]} /></div>}
    <MatchList title="לוח משחקים" items={upcoming.slice(1)} empty="אין משחקים נוספים בלוח." />
    <div className="mt-6"><MatchList title="תוצאות" items={finished} empty="עדיין אין תוצאות." /></div>
  </AppShell>;
}

function MatchList({ title, items, empty }: { title: string; items: Match[]; empty: string }) {
  return <section><h2 className="mb-2 font-bold">{title}</h2>{!items.length ? <p className="panel p-4 text-sm text-muted-foreground">{empty}</p> : <div className="space-y-2">{items.map((m) => {
    const kickoff = new Date(m.kickoff); const done = m.status === "finished" || m.status === "live";
    return <Link key={m.id} to="/match/$matchId" params={{ matchId: m.id }} className="panel flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{m.home_name || "בית"} — {m.away_name || "חוץ"}</p><p className="text-xs text-muted-foreground">{m.competition} · {kickoff.toLocaleDateString("he-IL", { day: "numeric", month: "short" })}</p></div>
      <div className="display-title shrink-0 text-xl tabular-nums">{done ? `${m.home_score ?? "–"}:${m.away_score ?? "–"}` : kickoff.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</div>
    </Link>;
  })}</div>}</section>;
}
