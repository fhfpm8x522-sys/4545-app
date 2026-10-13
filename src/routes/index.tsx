import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { NextMatchCard, type Match } from "@/components/next-match-card";
import { SongWidget } from "@/components/song-widget";
import { useProfile, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "45:45 — הקבוצה שלי עכשיו" }, { name: "description", content: "המשחק הבא, החדשות, הסקרים והיציע של הקבוצה שלך." }] }),
  component: Home,
});

function Home() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const club = profile?.club;
  const clubId = club?.id;

  const { data } = useQuery({
    queryKey: ["home", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const [next, news, poll, standing, history] = await Promise.all([
        supabase.from("matches").select("*").or(`home_club_id.eq.${clubId},away_club_id.eq.${clubId}`).in("status", ["scheduled", "live"]).order("kickoff").limit(1).maybeSingle(),
        supabase.from("news_items").select("id,title,image_url,source_name,published_at,official,summary,category").eq("club_id", clubId!).eq("status", "published").order("published_at", { ascending: false }).limit(4),
        supabase.from("polls").select("*").eq("club_id", clubId!).eq("status", "published").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("club_standings").select("*").eq("club_id", clubId!).maybeSingle(),
        supabase.from("club_history").select("*").eq("club_id", clubId!).order("event_date", { ascending: false }).limit(100),
      ]);
      const today = new Date();
      const moment = (history.data ?? []).find((m) => {
        const d = new Date(`${m.event_date}T12:00:00`);
        return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
      }) ?? null;
      return { next: next.data as Match | null, news: news.data ?? [], poll: poll.data, standing: standing.data, moment };
    },
  });

  return <AppShell>
    {club && <div className="mb-4 flex items-center gap-3">
      {club.crest_url ? <img src={club.crest_url} alt="" className="size-10 object-contain" /> : <span className="h-8 w-1.5 rounded-full bg-club" />}
      <div><p className="text-xs text-muted-foreground">הקבוצה שלי עכשיו</p><h1 className="text-xl font-black">{club.name_he}</h1></div>
    </div>}

    <div className="space-y-4">
      {data?.next ? <NextMatchCard match={data.next} /> : <div className="panel club-gradient p-6 text-center text-sm text-muted-foreground">עוד לא פורסם המשחק הבא.</div>}
      {clubId && club && <SongWidget clubId={clubId} clubName={club.short_name_he || club.name_he} />}

      {data?.news[0] && <section className="panel p-5">
        <p className="text-[11px] font-bold tracking-wide text-club">45:45 עכשיו</p>
        <Link to="/article/$newsId" params={{ newsId: data.news[0].id }} className="mt-2 block">
          <p className="text-lg font-bold leading-snug">{data.news[0].title}</p>
          {data.news[0].summary && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{data.news[0].summary}</p>}
        </Link>
      </section>}

      {data?.standing && <section className="grid grid-cols-4 gap-2">
        {[["מיקום", data.standing.position ?? "—"], ["נקודות", data.standing.points ?? "—"], ["משחקים", data.standing.played ?? "—"], ["כושר", data.standing.form || "—"]].map(([label, value]) => <div key={String(label)} className="panel p-3 text-center"><div className="display-title text-xl">{value}</div><div className="text-[11px] text-muted-foreground">{label}</div></div>)}
      </section>}

      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="font-bold">מה חדש בקבוצה?</h2><Link to="/news" className="text-xs text-club">לכל החדשות</Link></div>
        {data?.news.length ? <div className="space-y-2">{data.news.map((n) => <Link key={n.id} to="/article/$newsId" params={{ newsId: n.id }} className="panel flex gap-3 p-3">
          <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">{n.image_url && <img src={n.image_url} alt="" loading="lazy" className="size-full object-cover" />}</div>
          <div className="min-w-0">{n.official && <span className="text-[10px] font-bold text-club">הודעה רשמית</span>}<p className="line-clamp-2 text-sm font-semibold">{n.title}</p><p className="mt-1 text-[11px] text-muted-foreground">{n.source_name || "45:45"}{n.published_at && ` · ${new Date(n.published_at).toLocaleDateString("he-IL")}`}</p></div>
        </Link>)}</div> : <p className="panel p-4 text-sm text-muted-foreground">עדיין אין ידיעות שפורסמו.</p>}
      </section>

      {data?.poll && user && <PollCard poll={data.poll} userId={user.id} />}
      {data?.moment && <section className="panel p-5"><p className="text-[11px] font-bold tracking-wide text-club">היום במועדון</p><p className="mt-2 font-bold">{data.moment.title}</p>{data.moment.body && <p className="mt-1 text-sm text-muted-foreground">{data.moment.body}</p>}</section>}
    </div>
  </AppShell>;
}

type PollOption = { key: string; label: string; index: number };
function PollCard({ poll, userId }: { poll: { id: string; question: string; options: unknown }; userId: string }) {
  const qc = useQueryClient();
  const options: PollOption[] = (Array.isArray(poll.options) ? poll.options : []).map((o: unknown, index: number) => {
    if (typeof o === "string") return { key: String(index), label: o, index };
    const obj = (o ?? {}) as Record<string, unknown>;
    return { key: String(obj.key ?? index), label: String(obj.label ?? obj.text ?? `אפשרות ${index + 1}`), index };
  });
  const { data: votes } = useQuery({ queryKey: ["poll-votes", poll.id], queryFn: async () => (await supabase.from("poll_votes").select("user_id,option_index").eq("poll_id", poll.id)).data ?? [] });
  const mine = votes?.find((v) => v.user_id === userId)?.option_index;
  const total = votes?.length ?? 0;
  async function vote(index: number) {
    await supabase.from("poll_votes").upsert({ poll_id: poll.id, user_id: userId, option_index: index }, { onConflict: "poll_id,user_id" });
    qc.invalidateQueries({ queryKey: ["poll-votes", poll.id] });
  }
  return <section className="panel p-5"><p className="text-[11px] font-bold tracking-wide text-club">סקר</p><p className="mt-2 font-bold">{poll.question}</p><div className="mt-3 space-y-2">{options.map((o) => {
    const count = votes?.filter((v) => v.option_index === o.index).length ?? 0; const pct = total ? Math.round((count / total) * 100) : 0;
    return <button key={o.key} onClick={() => vote(o.index)} className={cn("relative w-full overflow-hidden rounded-xl border px-4 py-2.5 text-right text-sm", mine === o.index ? "border-club" : "border-border")}>
      {mine != null && <span className="absolute inset-y-0 right-0 bg-club/15" style={{ width: `${pct}%` }} />}<span className="relative flex justify-between"><span>{o.label}</span>{mine != null && <span className="text-muted-foreground">{pct}%</span>}</span>
    </button>;
  })}</div></section>;
}
