type J = Record<string, any>;

export function s(v: any): string | null {
  if (v === null || v === undefined) return null;
  const x = String(v).trim();
  return x.length ? x : null;
}

export function n(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "number" && typeof v !== "string") return null;
  if (typeof v === "string" && !/^[+-]?\d+(?:\.\d+)?$/.test(v.trim())) return null;
  const x = Number(v);
  return Number.isFinite(x) ? Math.trunc(x) : null;
}

export function b(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const x = String(v ?? "").toLowerCase().trim();
  return x === "true" || x === "1" || x === "yes";
}

export function pick(...values: any[]): any {
  for (const v of values) {
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return null;
}

export function arr(data: any): J[] {
  if (Array.isArray(data)) return data;

  for (const v of [
    data?.data,
    data?.results,
    data?.items,
    data?.fixtures,
    data?.players,
    data?.events,
    data?.cards,
    data?.substitutions,
  ]) {
    if (Array.isArray(v)) return v;
  }

  return [];
}


export function status(v: any, live: any) {
  const x = String(v ?? "").toLowerCase().trim();

  if (
    x === "ft" ||
    x === "aet" ||
    x === "after_et" ||
    x === "after_pen" ||
    x === "after_penalties" ||
    x === "pen" ||
    x.includes("finished") ||
    x.includes("full time")
  ) {
    return "finished";
  }

  if (x.includes("postpon")) return "postponed";
  if (x.includes("cancel")) return "cancelled";
  if (b(live)) return "live";

  if (
    x === "1h" ||
    x === "2h" ||
    x === "ht" ||
    x.includes("live") ||
    x.includes("half")
  ) {
    return "live";
  }

  if (x.includes("postpon")) return "postponed";
  if (x.includes("cancel")) return "cancelled";

  return "scheduled";
}


export function fixtureScore(f: J) {
  const homeCandidates = [
    f.homeTeamScore,
    f.homeScore,
    f.home_score,
    f.scoreHome,
    f.homeGoals,
    f.goalsHome,
    f.home?.score,
    f.home?.goals,
    f.homeTeam?.score,
    f.homeTeam?.goals,
    f.teams?.home?.score,
    f.teams?.home?.goals,
    f.score?.home,
    f.score?.homeScore,
    f.scores?.home,
    f.result?.home,
    f.homeTeamFtScore,
  ];

  const awayCandidates = [
    f.awayTeamScore,
    f.awayScore,
    f.away_score,
    f.scoreAway,
    f.awayGoals,
    f.goalsAway,
    f.away?.score,
    f.away?.goals,
    f.awayTeam?.score,
    f.awayTeam?.goals,
    f.teams?.away?.score,
    f.teams?.away?.goals,
    f.score?.away,
    f.score?.awayScore,
    f.scores?.away,
    f.result?.away,
    f.awayTeamFtScore,
  ];

  let home: number | null = null;
  let away: number | null = null;

  for (const v of homeCandidates) {
    const x = n(v);
    if (x !== null) {
      home = x;
      break;
    }
  }

  for (const v of awayCandidates) {
    const x = n(v);
    if (x !== null) {
      away = x;
      break;
    }
  }

  // String fallback: "1 - 0", "1:0", etc.
  for (const raw of [
    f.score,
    f.finalScore,
    f.scoreText,
    typeof f.result === "string" ? f.result : null,
  ]) {
    if (home !== null && away !== null) break;
    if (typeof raw !== "string") continue;

    const m = raw.match(/(\d+)\s*[-:]\s*(\d+)/);

    if (m) {
      home ??= Number(m[1]);
      away ??= Number(m[2]);
    }
  }

  return { home, away };
}


export function preserveKnown(existing: J | null, incoming: J): J {
  const result = {...incoming};
  if (!existing) return result;
  for (const key of ["name_he", "image_url", "goal_image_url", "home_logo_url", "away_logo_url", "competition_logo_url", "home_score", "away_score", "number", "position", "nationality", "birth_date", "shirt_number", "goal_position", "goal_country", "goal_age", "injured", "is_captain"]) {
    const value = existing[key];
    if ((result[key] === null || result[key] === undefined) && value !== null && value !== undefined) result[key] = value;
  }
  return result;
}

export function uniqueEvents(rows: J[]): J[] {
  const byId = new Map<string, J>();
  for (const row of rows) if (row.goal_event_id) byId.set(row.goal_event_id, row);
  return [...byId.values()];
}

export async function collectFixtures(fetchPage: (offset: number, limit: number) => Promise<any>): Promise<J[]> {
  const unique = new Map<string, J>();
  let offset = 0;
  const limit = 50;
  for (let page = 0; page < 30; page++) {
    const data = await fetchPage(offset, limit);
    const rows = arr(data);
    const before = unique.size;
    for (const fixture of rows) {
      const id = s(pick(fixture.id, fixture.fixtureId, fixture.apiId));
      if (!id) throw new Error("Fixture is missing its provider ID");
      unique.set(id, fixture);
    }
    const pagination = data?.pagination;
    const total = n(pagination?.total);
    const more = pagination?.hasMore;
    if (more === false || (total !== null && offset + rows.length >= total) || (more !== true && total === null && rows.length < limit)) return [...unique.values()];
    if (!rows.length || unique.size === before) throw new Error("GOAL fixture pagination did not advance");
    offset += rows.length;
  }
  throw new Error("GOAL fixture pagination exceeded its safety limit");
}

export function substitutionPlayers(sub: J) {
  const names = s(pick(sub.substitution, sub.player, sub.players, sub.playerName))?.split("|").map(x=>x.trim()) ?? [];
  const ids = s(pick(sub.substitutionPlayerId, sub.playerId, sub.playerIds))?.split("|").map(x=>x.trim()) ?? [];
  return {outName:pick(sub.playerOut,sub.outPlayer,sub.outgoingPlayer,names[0]),inName:pick(sub.playerIn,sub.inPlayer,sub.incomingPlayer,names[1]),outId:s(pick(sub.playerOutId,sub.outPlayerId,sub.outgoingPlayerId,ids[0])),inId:s(pick(sub.playerInId,sub.inPlayerId,sub.incomingPlayerId,ids[1]))};
}

export function eventMinute(event: J): number | null {
  const raw = pick(event.minute, event.time, event.elapsed);
  const direct = n(raw);
  if (direct !== null && direct >= 0) return direct;
  const added = typeof raw === "string" ? raw.match(/^(\d+)\s*\+\s*(\d+)$/) : null;
  if (added) return Number(added[1])+Number(added[2]);
  const fallback = n(event.timeNum);
  return fallback !== null && fallback >= 0 ? fallback : null;
}

export function stableEventId(fixtureId: string, event: J): string {
  return JSON.stringify([fixtureId,event.event_type,event.minute,event.team_side,event.player_id ?? event.player_name ?? null,event.secondary_player_id ?? event.secondary_player_name ?? null]);
}
