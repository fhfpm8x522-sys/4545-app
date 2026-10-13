import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Match } from "@/lib/app-types";

export type { Match } from "@/lib/app-types";

export function matchState(match: Match) {
  if (match.status === "live") return "live" as const;
  if (match.status === "finished") return "finished" as const;
  const diff = new Date(match.kickoff).getTime() - Date.now();
  if (diff < 12 * 3600000 && diff > 0) return "matchday" as const;
  return "upcoming" as const;
}

const LABELS = { live: "LIVE", finished: "FULL TIME", matchday: "MATCHDAY", upcoming: "המשחק הבא" };

function useCountdown(target: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    done: diff === 0,
  };
}

export function NextMatchCard({ match }: { match: Match }) {
  const state = matchState(match);
  const countdown = useCountdown(match.kickoff);
  const kickoff = new Date(match.kickoff);

  return (
    <Link to="/match/$matchId" params={{ matchId: match.id }} className="panel club-gradient stadium-glow block overflow-hidden p-5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 font-bold tracking-wide text-club">
          {state === "live" && <span className="size-2 animate-pulse rounded-full bg-live" />}
          {LABELS[state]}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {match.competition_logo_url && <img src={match.competition_logo_url} alt="" className="size-5 object-contain" />}
          {match.competition}{match.round_name ? ` · ${match.round_name}` : ""}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3" dir="ltr">
        <TeamSide name={match.home_name || "בית"} crest={match.home_logo_url} />
        <div className="text-center">
          {state === "upcoming" || state === "matchday" ? (
            <div className="display-title text-3xl">{kickoff.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</div>
          ) : (
            <div className="display-title text-4xl tabular-nums" dir="ltr">{match.home_score ?? "–"} : {match.away_score ?? "–"}</div>
          )}
          {state === "live" && <div className="text-xs font-bold text-live">{match.minute ? `${match.minute}׳` : "LIVE"}</div>}
        </div>
        <TeamSide name={match.away_name || "חוץ"} crest={match.away_logo_url} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">
          {kickoff.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "long" })}
          {match.stadium ? ` · ${match.stadium}` : ""}
        </span>
        {(state === "upcoming" || state === "matchday") && !countdown.done && (
          <span className="shrink-0 font-semibold tabular-nums text-foreground">
            {countdown.days > 0 && `${countdown.days} ימים `}
            {String(countdown.hours).padStart(2, "0")}:{String(countdown.minutes).padStart(2, "0")}:{String(countdown.seconds).padStart(2, "0")}
          </span>
        )}
      </div>
    </Link>
  );
}

function TeamSide({ name, crest }: { name: string; crest: string | null }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="grid size-12 place-items-center overflow-hidden rounded-full bg-surface-2">
        {crest ? <img src={crest} alt={name} className="size-full object-contain" /> : <span className="text-sm font-bold">{name.slice(0, 2)}</span>}
      </div>
      <span dir="auto" className="text-xs font-semibold leading-tight">{name}</span>
    </div>
  );
}
