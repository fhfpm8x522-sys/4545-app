type J = Record<string, any>;

function s(v: any): string | null {
  if (v === null || v === undefined) return null;
  const x = String(v).trim();
  return x.length ? x : null;
}

function n(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "number" && typeof v !== "string") return null;
  if (typeof v === "string" && !/^[+-]?\d+(?:\.\d+)?$/.test(v.trim())) return null;
  const x = Number(v);
  return Number.isFinite(x) ? Math.trunc(x) : null;
}

function b(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const x = String(v ?? "").toLowerCase().trim();
  return x === "true" || x === "1" || x === "yes";
}

function pick(...values: any[]): any {
  for (const v of values) {
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return null;
}

function arr(data: any): J[] {
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


function status(v: any, live: any) {
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


function fixtureScore(f: J) {
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


function preserveKnown(existing: J | null, incoming: J): J {
  const result = {...incoming};
  if (!existing) return result;
  for (const key of ["name_he", "image_url", "goal_image_url", "home_logo_url", "away_logo_url", "competition_logo_url", "home_score", "away_score", "number", "position", "nationality", "birth_date", "shirt_number", "goal_position", "goal_country", "goal_age", "injured", "is_captain"]) {
    const value = existing[key];
    if ((result[key] === null || result[key] === undefined) && value !== null && value !== undefined) result[key] = value;
  }
  return result;
}

function uniqueEvents(rows: J[]): J[] {
  const byId = new Map<string, J>();
  for (const row of rows) if (row.goal_event_id) byId.set(row.goal_event_id, row);
  return [...byId.values()];
}

async function collectFixtures(fetchPage: (offset: number, limit: number) => Promise<any>): Promise<J[]> {
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

function substitutionPlayers(sub: J) {
  const names = s(pick(sub.substitution, sub.player, sub.players, sub.playerName))?.split("|").map(x=>x.trim()) ?? [];
  const ids = s(pick(sub.substitutionPlayerId, sub.playerId, sub.playerIds))?.split("|").map(x=>x.trim()) ?? [];
  return {outName:pick(sub.playerOut,sub.outPlayer,sub.outgoingPlayer,names[0]),inName:pick(sub.playerIn,sub.inPlayer,sub.incomingPlayer,names[1]),outId:s(pick(sub.playerOutId,sub.outPlayerId,sub.outgoingPlayerId,ids[0])),inId:s(pick(sub.playerInId,sub.inPlayerId,sub.incomingPlayerId,ids[1]))};
}

function eventMinute(event: J): number | null {
  const raw = pick(event.minute, event.time, event.elapsed);
  const direct = n(raw);
  if (direct !== null && direct >= 0) return direct;
  const added = typeof raw === "string" ? raw.match(/^(\d+)\s*\+\s*(\d+)$/) : null;
  if (added) return Number(added[1])+Number(added[2]);
  const fallback = n(event.timeNum);
  return fallback !== null && fallback >= 0 ? fallback : null;
}

function stableEventId(fixtureId: string, event: J): string {
  return JSON.stringify([fixtureId,event.event_type,event.minute,event.team_side,event.player_id ?? event.player_name ?? null,event.secondary_player_id ?? event.secondary_player_name ?? null]);
}

function hasServerAuthorization(request: Request, legacyServiceKey: string, secretKeysJson: string | undefined): boolean {
  if (legacyServiceKey && request.headers.get("Authorization") === "Bearer " + legacyServiceKey) return true;
  // Modern Supabase secret keys have the same server privileges; compare only
  // against keys injected by this project, never trust a decoded JWT role.
  const apiKey = request.headers.get("apikey");
  if (!apiKey || !apiKey.startsWith("sb_secret_")) return false;
  try {
    const keys = JSON.parse(secretKeysJson ?? "{}");
    return keys && typeof keys === "object" && !Array.isArray(keys) && Object.values(keys).some(key => typeof key === "string" && key.length > 0 && key === apiKey);
  } catch { return false; }
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOAL_BASE = "https://api.goal-api.com/v1";
const SEASON = Deno.env.get("GOAL_SEASON") ?? "2026/2027";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOAL_KEY = Deno.env.get("GOAL_API_KEY") ?? "";

const db = createClient(SUPABASE_URL, SERVICE_KEY);


const TEAM_HE: Record<string, string> = {
  "Hapoel Be'er Sheva": "הפועל באר שבע",
  "Hapoel Beer Sheva": "הפועל באר שבע",
  "H. Beer Sheva": "הפועל באר שבע",
  "Maccabi Tel Aviv": "מכבי תל אביב",
  "Maccabi Haifa": "מכבי חיפה",
  "Beitar Jerusalem": 'בית"ר ירושלים',
  "Beitar Jerusalem FC": 'בית"ר ירושלים',
  "Hapoel Tel Aviv": "הפועל תל אביב",
  "Maccabi Netanya": "מכבי נתניה",
  "Hapoel Haifa": "הפועל חיפה",
  "Hapoel Jerusalem": "הפועל ירושלים",
  "Bnei Sakhnin": "בני סכנין",
  "Sakhnin": "בני סכנין",
  "Netanya": "מכבי נתניה",
  "Maccabi Petah Tikva": "מכבי פתח תקווה",
  "Hap. Ramat Gan": "הפועל רמת גן",
  "Hapoel Petah Tikva": "הפועל פתח תקווה",
  "Ironi Kiryat Shmona": "עירוני קריית שמונה",
  "Kiryat Shmona": "עירוני קריית שמונה",
  "Ironi Tiberias": "עירוני טבריה",
};

const PLAYER_HE: Record<string, string> = {
  "943993883": "אמיר גנאח",
};

function err(e: any) {
  if (e instanceof Error) {
    return {
      message: e.message,
      stack: e.stack ?? null,
    };
  }

  if (e && typeof e === "object") {
    return {
      message: e.message ?? "Unknown error",
      code: e.code ?? null,
      details: e.details ?? null,
      hint: e.hint ?? null,
      status: e.status ?? null,
    };
  }

  return { message: String(e) };
}

function teamHe(v: any) {
  const x = s(v) ?? "Unknown";
  return TEAM_HE[x] ?? x;
}

function competitionHe(v: any) {
  const x = s(v) ?? "Football";
  const l = x.toLowerCase();

  if (l.includes("ligat")) return "ליגת העל";
  if (l === "premier league") return "ליגת העל";
  if (l.includes("state cup")) return "גביע המדינה";
  if (l.includes("toto")) return "גביע הטוטו";
  if (l.includes("europa league")) return "הליגה האירופית";
  if (l.includes("champions league")) return "ליגת האלופות";
  if (l.includes("conference league")) return "הקונפרנס ליג";

  return x;
}

// ============================================================
// GOAL
// ============================================================

async function goal(path: string) {
  const r = await fetch(`${GOAL_BASE}${path}`, {
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: `Bearer ${GOAL_KEY}`,
      Accept: "application/json",
    },
  });

  const text = await r.text();

  if (!r.ok) {
    throw {
      message: `GOAL request failed: ${path}`,
      status: r.status,
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    throw {
      message: `GOAL returned invalid JSON: ${path}`,
    };
  }
}

async function fixturesForTeam(teamId: string) {
  return collectFixtures((offset, limit) => goal(`/teams/${teamId}/fixtures?limit=${limit}&offset=${offset}`));
}

async function playersForTeam(teamId: string) {
  return collectFixtures((offset,limit)=>goal(`/teams/${teamId}/players?limit=${limit}&offset=${offset}`));
}

// ============================================================
// FIXTURE EXTRACTION
// ============================================================

function homeId(f: J) {
  return s(
    pick(
      f.homeTeamId,
      f.home_team_id,
      f.home?.id,
      f.homeTeam?.id,
      f.teams?.home?.id,
    ),
  );
}

function awayId(f: J) {
  return s(
    pick(
      f.awayTeamId,
      f.away_team_id,
      f.away?.id,
      f.awayTeam?.id,
      f.teams?.away?.id,
    ),
  );
}

function homeApi(f: J) {
  return s(
    pick(
      f.homeTeamApiId,
      f.homeApiId,
      f.home?.apiId,
      f.homeTeam?.apiId,
      f.teams?.home?.apiId,
    ),
  );
}

function awayApi(f: J) {
  return s(
    pick(
      f.awayTeamApiId,
      f.awayApiId,
      f.away?.apiId,
      f.awayTeam?.apiId,
      f.teams?.away?.apiId,
    ),
  );
}

function homeName(f: J) {
  return teamHe(
    pick(
      f.homeName,
      f.homeTeamName,
      f.home?.name,
      f.homeTeam?.name,
      f.teams?.home?.name,
    ),
  );
}

function awayName(f: J) {
  return teamHe(
    pick(
      f.awayName,
      f.awayTeamName,
      f.away?.name,
      f.awayTeam?.name,
      f.teams?.away?.name,
    ),
  );
}

function homeBadge(f: J) {
  return s(
    pick(
      f.homeBadge,
      f.homeLogo,
      f.home?.badge,
      f.home?.logo,
      f.homeTeam?.badge,
      f.homeTeam?.logo,
      f.teams?.home?.badge,
      f.teams?.home?.logo,
    ),
  );
}

function awayBadge(f: J) {
  return s(
    pick(
      f.awayBadge,
      f.awayLogo,
      f.away?.badge,
      f.away?.logo,
      f.awayTeam?.badge,
      f.awayTeam?.logo,
      f.teams?.away?.badge,
      f.teams?.away?.logo,
    ),
  );
}

function fixtureLeagueId(f: J) {
  return s(pick(f.leagueId, f.league?.id));
}

function fixtureYear(f: J) {
  return s(pick(f.leagueYear, f.league?.year));
}

function fixtureLeagueLogo(f: J) {
  return s(pick(f.leagueLogo, f.competitionLogo, f.league?.logo));
}

function fixtureKickoff(f: J): string | null {
  const direct = s(pick(f.kickoffUtc, f.kickoff, f.date));

  if (direct) {
    const d = new Date(direct);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  const date = s(f.matchDate);
  const time = s(f.matchTime);

  if (!date) return null;

  const d = new Date(time ? `${date}T${time}` : `${date}T00:00:00`);

  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ============================================================
// SCORE
// ============================================================

// ============================================================
// STORAGE
// ============================================================

async function cacheImage(
  bucket: string,
  pathBase: string,
  url: string | null,
) {
  if (!url) return null;

  if (url.includes("/storage/v1/object/public/")) {
    return url;
  }

  try {
    if (new URL(url).protocol !== "https:") return null;
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!r.ok) return null;

    const type = r.headers.get("content-type") ?? "";
    if (!/^image\/(jpeg|png|webp)(;|$)/i.test(type)) return null;
    if (Number(r.headers.get("content-length") ?? 0) > 10 * 1024 * 1024) return null;

    let ext = "jpg";
    if (type.includes("png")) ext = "png";
    if (type.includes("webp")) ext = "webp";

    const bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes.byteLength > 10 * 1024 * 1024) return null;
    const path = `${pathBase}.${ext}`;

    const upload = await db.storage
      .from(bucket)
      .upload(path, bytes, {
        upsert: true,
        contentType: type,
      });

    if (upload.error) {
      console.error("storage", err(upload.error));
      return null;
    }

    return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error("image", err(e));
    return null;
  }
}

// ============================================================
// CLUBS
// ============================================================

async function loadClubs() {
  const result = await db
    .from("clubs")
    .select(
      "id,slug,name_he,short_name_he,goal_team_id,goal_api_id,active",
    )
    .eq("active", true)
    .not("goal_team_id", "is", null);

  if (result.error) throw result.error;

  return (result.data ?? []) as J[];
}

function findClub(
  clubs: J[],
  goalTeamId: string | null,
  goalApiId: string | null,
) {
  return (
    clubs.find((c) => {
      if (goalTeamId && s(c.goal_team_id) === goalTeamId) return true;
      if (goalApiId && s(c.goal_api_id) === goalApiId) return true;
      return false;
    }) ?? null
  );
}

// ============================================================
// PLAYERS
// ============================================================

async function findExistingPlayer(
  goalPlayerId: string | null,
  goalApiId: string | null,
) {
  if (goalPlayerId) {
    const q = await db
      .from("players")
      .select("*")
      .eq("goal_player_id", goalPlayerId)
      .limit(1);

    if (q.error) throw q.error;
    if (q.data && q.data.length) {
      return q.data[0] as J;
    }
  }

  if (goalApiId) {
    const q = await db
      .from("players")
      .select("*")
      .eq("goal_api_id", goalApiId)
      .limit(1);

    if (q.error) throw q.error;
    if (q.data && q.data.length) {
      return q.data[0] as J;
    }
  }

  return null;
}

async function syncRoster(
  goalTeamId: string,
  internalClubId: string | null,
) {
  const roster = await playersForTeam(goalTeamId);

  let saved = 0;
  let images = 0;
  let failed = 0;

  for (const p of roster) {
    try {
      const playerId = s(p.id);
      const apiId = s(p.apiId);

      if (!playerId && !apiId) continue;

      const providerName = s(p.name) ?? "Unknown Player";

      const existing = await findExistingPlayer(playerId, apiId);

      const hebrew =
        s(existing?.name_he) ??
        (apiId ? PLAYER_HE[apiId] ?? null : null);

      const rawImage = s(pick(p.image, p.imageUrl, p.photo));

      let publicImage = s(existing?.image_url);

      if (!publicImage && rawImage) {
        publicImage = await cacheImage(
          "player-images",
          `players/${apiId ?? playerId}`,
          rawImage,
        );

        if (publicImage) images++;
      }

      const row: J = {
        club_id: internalClubId,
        name: hebrew ?? providerName,
        number: n(p.number),
        position: s(pick(p.type, p.position)),
        nationality: s(p.country),
        birth_date: s(p.birthdate),
        image_url: publicImage,
        active: p.isActive === undefined ? true : b(p.isActive),

        name_he: hebrew,
        goal_player_id: playerId,
        goal_api_id: apiId,
        goal_team_id: goalTeamId,
        goal_name: providerName,
        goal_updated_at: new Date().toISOString(),
        goal_image_url: rawImage,
        shirt_number: s(p.number),
        goal_position: s(pick(p.type, p.position)),
        goal_country: s(p.country),
        goal_age: n(p.age),
        injured: p.injured === undefined ? existing?.injured ?? false : b(p.injured),
        is_captain: p.isCaptain === undefined ? existing?.is_captain ?? false : b(p.isCaptain),
      };

      if (existing?.id) {
        const update = await db
          .from("players")
          .update(preserveKnown(existing, row))
          .eq("id", existing.id);

        if (update.error) {
          failed++;
          console.error("player update", err(update.error));
          continue;
        }
      } else {
        const insert = await db.from("players").insert(row);

        if (insert.error) {
          failed++;
          console.error("player insert", err(insert.error));
          continue;
        }
      }

      saved++;
    } catch (e) {
      failed++;
      console.error("player exception", err(e));
    }
  }

  return {
    fetched: roster.length,
    saved,
    failed,
    images,
  };
}

// ============================================================
// MATCHES
// ============================================================

async function buildMatch(f: J, clubs: J[]) {
  const fixtureId = s(pick(f.id, f.fixtureId, f.apiId));

  if (!fixtureId) return null;

  const hId = homeId(f);
  const aId = awayId(f);
  const hApi = homeApi(f);
  const aApi = awayApi(f);

  const hClub = findClub(clubs, hId, hApi);
  const aClub = findClub(clubs, aId, aApi);

  const score = fixtureScore(f);

  const hLogo = await cacheImage(
    "team-logos",
    `teams/${hId ?? hApi ?? fixtureId + "-h"}`,
    homeBadge(f),
  );

  const aLogo = await cacheImage(
    "team-logos",
    `teams/${aId ?? aApi ?? fixtureId + "-a"}`,
    awayBadge(f),
  );

  const lId = fixtureLeagueId(f);

  const competitionLogo = await cacheImage(
    "team-logos",
    `competitions/${lId ?? fixtureId}`,
    fixtureLeagueLogo(f),
  );

  const rawStatus = pick(f.matchStatus, f.status);

  return {
    competition: competitionHe(
      pick(f.leagueName, f.competition, f.league?.name),
    ),

    round_name: s(pick(f.round, f.roundName, f.stage)),

    home_club_id: hClub?.id ?? null,
    away_club_id: aClub?.id ?? null,

    home_name: homeName(f),
    away_name: awayName(f),

    kickoff: fixtureKickoff(f),

    stadium: s(pick(f.matchStadium, f.stadium, f.venue?.name)),

    status: status(rawStatus, pick(f.matchLive, f.live)),

    home_score: score.home,
    away_score: score.away,

    home_logo_url: hLogo,
    away_logo_url: aLogo,
    competition_logo_url: competitionLogo,

    goal_fixture_id: fixtureId,
    goal_fixture_api_id: s(f.apiId),

    goal_home_team_id: hId,
    goal_away_team_id: aId,

    goal_league_id: lId,
    goal_league_year: fixtureYear(f),

    goal_stage: s(f.stage),
    goal_status: s(rawStatus),

    goal_updated_at:
      s(f.updatedAt) ?? new Date().toISOString(),
  };
}

// ============================================================
// EVENT PLAYERS
// ============================================================

async function playerByApi(apiId: string | null) {
  if (!apiId) return null;

  const q = await db
    .from("players")
    .select("id,name,name_he,goal_name,image_url,goal_api_id")
    .eq("goal_api_id", apiId)
    .limit(1);

  if (q.error) throw q.error;
  if (!q.data?.length) return null;

  return q.data[0] as J;
}

function playerDisplay(player: J | null, fallback: any) {
  return (
    s(player?.name_he) ??
    s(player?.name) ??
    s(player?.goal_name) ??
    s(fallback)
  );
}

function minute(x: J) {
  return eventMinute(x);
}

function eventSide(x: J): "home" | "away" | null {
  const v = s(pick(x.team, x.teamSide, x.side))?.toLowerCase();

  if (v === "home") return "home";
  if (v === "away") return "away";

  return null;
}

// ============================================================
// EVENTS
// ============================================================

async function syncMatchEvents(match: J) {
  const fixtureId = s(match.goal_fixture_id);

  if (!fixtureId) return 0;

  const [eData, cData, subData] = await Promise.all([
    goal(`/fixtures/${fixtureId}/events`),
    goal(`/fixtures/${fixtureId}/cards`),
    goal(`/fixtures/${fixtureId}/substitutions`),
  ]);

  const events = arr(eData);
  const cards = arr(cData);
  const subs = arr(subData);

  const output: J[] = [];

  // GOALS
  for (const e of events) {
    let side = eventSide(e);

    if (!side) {
      if (s(e.homeScorer) || s(e.homeScorerId)) side = "home";
      else if (s(e.awayScorer) || s(e.awayScorerId)) side = "away";
    }

    const scorerName =
      side === "away"
        ? pick(e.awayScorer, e.scorer, e.player)
        : pick(e.homeScorer, e.scorer, e.player);

    const scorerId = s(
      side === "away"
        ? pick(e.awayScorerId, e.scorerId, e.playerId)
        : pick(e.homeScorerId, e.scorerId, e.playerId),
    );

    if (!scorerName && !scorerId) continue;

    const assistName =
      side === "away"
        ? pick(e.awayAssist, e.assist)
        : pick(e.homeAssist, e.assist);

    const assistId = s(
      side === "away"
        ? pick(e.awayAssistId, e.assistId)
        : pick(e.homeAssistId, e.assistId),
    );

    const scorer = await playerByApi(scorerId);
    const assist = await playerByApi(assistId);

    const eventId =
      s(e.id) ??
      `${fixtureId}:goal:${minute(e)}:${scorerId ?? scorerName}`;

    output.push({
      match_id: match.id,
      minute: minute(e),
      event_type: "goal",
      club_id: null,

      player_name: playerDisplay(scorer, scorerName),
      detail: null,

      goal_event_id: eventId,
      team_side: side,

      player_id: scorerId,

      secondary_player_name: playerDisplay(assist, assistName),
      secondary_player_id: assistId,

      score: s(e.score),
      period: s(pick(e.scoreInfoTime, e.period)),
      raw_type: s(pick(e.type, e.eventType)) ?? "goal",

      player_ref_id: scorer?.id ?? null,
      secondary_player_ref_id: assist?.id ?? null,
    });
  }

  // CARDS
  for (const c of cards) {
    let side = eventSide(c);

    if (!side) {
      if (s(c.homeFault) || s(c.homePlayer) || s(c.homePlayerId)) side = "home";
      else if (s(c.awayFault) || s(c.awayPlayer) || s(c.awayPlayerId)) side = "away";
    }

    const name = pick(
      c.player,
      c.playerName,
      side === "home" ? pick(c.homeFault, c.homePlayer) : pick(c.awayFault, c.awayPlayer),
    );

    const apiId = s(
      pick(
        c.playerId,
        side === "home" ? c.homePlayerId : c.awayPlayerId,
      ),
    );

    const player = await playerByApi(apiId);

    const raw = s(pick(c.type, c.cardType, c.card)) ?? "yellow";

    const type = raw.toLowerCase().includes("red")
      ? "red_card"
      : "yellow_card";

    const eventId =
      s(c.id) ??
      `${fixtureId}:${type}:${minute(c)}:${apiId ?? name}`;

    output.push({
      match_id: match.id,
      minute: minute(c),
      event_type: type,
      club_id: null,

      player_name: playerDisplay(player, name),
      detail: null,

      goal_event_id: eventId,
      team_side: side,

      player_id: apiId,

      secondary_player_name: null,
      secondary_player_id: null,

      score: null,
      period: s(pick(c.scoreInfoTime, c.period)),
      raw_type: raw,

      player_ref_id: player?.id ?? null,
      secondary_player_ref_id: null,
    });
  }

  // SUBSTITUTIONS
  for (const sub of subs) {
    let side = eventSide(sub);

    const {outName, inName, outId, inId} = substitutionPlayers(sub);

    const outPlayer = await playerByApi(outId);
    const inPlayer = await playerByApi(inId);

    const eventId =
      s(sub.id) ??
      `${fixtureId}:sub:${minute(sub)}:${outId ?? outName}:${inId ?? inName}`;

    output.push({
      match_id: match.id,
      minute: minute(sub),
      event_type: "substitution",
      club_id: null,

      // OUT ↓
      player_name: playerDisplay(outPlayer, outName),
      player_id: outId,
      player_ref_id: outPlayer?.id ?? null,

      // IN ↑
      secondary_player_name: playerDisplay(inPlayer, inName),
      secondary_player_id: inId,
      secondary_player_ref_id: inPlayer?.id ?? null,

      detail: null,
      goal_event_id: eventId,
      team_side: side,

      score: null,
      period: s(sub.period),
      raw_type: "substitution",
    });
  }

  if (!output.length) return 0;

  // Provider event IDs can change after a refresh. Reuse the newest matching
  // row and a stable identity so repeated syncs do not append the same event.
  const existing = await db.from("match_events").select("*").eq("match_id", match.id);
  if (existing.error) throw existing.error;
  const byIdentity = new Map<string, J>();
  for (const row of existing.data ?? []) {
    const identity = stableEventId(fixtureId, row);
    const previous = byIdentity.get(identity);
    if (!previous || Number(row.id) > Number(previous.id)) byIdentity.set(identity, row);
  }
  const normalized = uniqueEvents(output.map(row => ({...row, goal_event_id: stableEventId(fixtureId, row)})));
  // The live id column is GENERATED ALWAYS: update existing rows directly,
  // never include an explicit id in an INSERT/UPSERT payload.
  for (let offset = 0; offset < normalized.length; offset += 8) {
    const saves = await Promise.all(normalized.slice(offset, offset + 8).map(row => {
      const previous = byIdentity.get(row.goal_event_id);
      return previous
        ? db.from("match_events").update(row).eq("id", previous.id)
        : db.from("match_events").upsert(row, {onConflict: "goal_event_id"});
    }));
    for (const save of saves) if (save.error) throw save.error;
  }

  return output.length;
}

// ============================================================
// MAIN
// ============================================================

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!hasServerAuthorization(request, SERVICE_KEY, Deno.env.get("SUPABASE_SECRET_KEYS"))) {
    const authorization=request.headers.get('authorization')??'';
    if(!authorization.startsWith('Bearer '))return new Response('Unauthorized',{status:401});
    const caller=createClient(SUPABASE_URL,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}});
    const privileged=await caller.from('football_cache').select('cache_key').limit(1);
    if(privileged.error)return new Response('Unauthorized',{status:401});
  }
  const started = Date.now();

  try {
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL missing");
    if (!SERVICE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
    if (!GOAL_KEY) throw new Error("GOAL_API_KEY missing");

    let options: J = {};
    const body = await request.text();
    if (body.trim()) {
      try { options = JSON.parse(body); } catch { return Response.json({error:"Invalid JSON body"},{status:400}); }
    }
    if (!options || typeof options !== "object" || Array.isArray(options) || (options.preview !== undefined && typeof options.preview !== "boolean")) return Response.json({error:"Invalid sync options"},{status:400});
    const phase = s(options.phase) ?? "all";
    if (!["all", "fixtures", "rosters", "events"].includes(phase)) return Response.json({error:"Invalid sync phase"},{status:400});
    const preview = options.preview === true;
    const selectedTeamId = s(options.teamId);
    const allClubs = await loadClubs();
    const clubs = allClubs.filter(c=>!selectedTeamId||c.goal_team_id===selectedTeamId);

    if (!clubs.length) {
      throw new Error("No connected active clubs");
    }

    // --------------------------------------------------------
    // FIXTURES
    // --------------------------------------------------------

    const fixtureMap = new Map<string, J>();
    const clubResults: J[] = [];

    let totalFetched = 0;

    for (const club of clubs) {
      const goalTeamId = s(club.goal_team_id);
      if (!goalTeamId) continue;

      const all = await fixturesForTeam(goalTeamId);

      totalFetched += all.length;

      const seasonRows = all.filter(
        (f) => fixtureYear(f) === SEASON,
      );

      for (const f of seasonRows) {
        const id = s(pick(f.id, f.fixtureId, f.apiId));
        if (id) fixtureMap.set(id, f);
      }

      clubResults.push({
        club: club.name_he,
        goalTeamId,
        fetched: all.length,
        seasonFixtures: seasonRows.length,
      });
    }

    const fixtureIdFilter = s(options.fixtureId);
    const fixtures = [...fixtureMap.values()].filter(f => !fixtureIdFilter || s(pick(f.id,f.fixtureId,f.apiId)) === fixtureIdFilter);
    if (preview) return Response.json({success:true,preview:true,phase,season:SEASON,fixturesFetched:totalFetched,fixturesForSeason:fixtures.length,fixtures:fixtures.map(f=>({id:s(pick(f.id,f.fixtureId,f.apiId)),kickoff:fixtureKickoff(f),status:status(pick(f.matchStatus,f.status),pick(f.matchLive,f.live)),homeTeamId:homeId(f),awayTeamId:awayId(f),...fixtureScore(f)}))});

    // --------------------------------------------------------
    // DISCOVER ALL TEAMS
    // --------------------------------------------------------

    const teams = new Map<
      string,
      {
        clubId: string | null;
        name: string;
      }
    >();

    for (const f of fixtures) {
      const h = homeId(f);
      const a = awayId(f);

      if (h) {
        const c = findClub(allClubs, h, homeApi(f));

        teams.set(h, {
          clubId: c?.id ?? null,
          name: homeName(f),
        });
      }

      if (a) {
        const c = findClub(allClubs, a, awayApi(f));

        teams.set(a, {
          clubId: c?.id ?? null,
          name: awayName(f),
        });
      }
    }

    // --------------------------------------------------------
    // ROSTERS
    // --------------------------------------------------------

    let rosterFetched = 0;
    let rosterSaved = 0;
    let rosterFailedPlayers = 0;
    let rosterImages = 0;
    let rosterTeamFailures = 0;

    const rosterErrors: J[] = [];
    const rosterTeamResults: J[] = [];
    let rosterTeamsChecked = 0;
    const rosterTeams = new Map([...teams].filter(([id]) => !selectedTeamId || id === selectedTeamId));
    if (phase === "rosters" && selectedTeamId && !rosterTeams.size) return Response.json({error:"Team is not part of the selected season fixtures"},{status:400});

    for (const [teamId, info] of (phase === "all" || phase === "rosters" ? rosterTeams : new Map())) {
      rosterTeamsChecked++;
      try {
        const r = await syncRoster(teamId, info.clubId);

        rosterFetched += r.fetched;
        rosterSaved += r.saved;
        rosterFailedPlayers += r.failed;
        rosterImages += r.images;
        rosterTeamResults.push({teamId,team:info.name,...r});
      } catch (e) {
        rosterTeamFailures++;

        rosterErrors.push({
          teamId,
          team: info.name,
          error: err(e),
        });
      }
    }

    // --------------------------------------------------------
    // MATCHES
    // --------------------------------------------------------

    let matchesSaved = 0;
    const matchErrors: J[] = [];

    for (const f of (phase === "all" || phase === "fixtures" ? fixtures : [])) {
      try {
        const row = await buildMatch(f, allClubs);

        if (!row) continue;

        // kickoff is NOT NULL in your DB.
        if (!row.kickoff) {
          matchErrors.push({
            fixture: row.goal_fixture_id,
            error: { message: "Missing kickoff" },
          });
          continue;
        }

        const existing = await db.from("matches").select("*").eq("goal_fixture_id", row.goal_fixture_id).maybeSingle();
        if (existing.error) throw existing.error;
        const save = await db
          .from("matches")
          .upsert(preserveKnown(existing.data, row), {
            onConflict: "goal_fixture_id",
          });

        if (save.error) {
          matchErrors.push({
            fixture: row.goal_fixture_id,
            error: err(save.error),
          });
          continue;
        }

        matchesSaved++;
      } catch (e) {
        matchErrors.push({
          fixture: s(pick(f.id, f.fixtureId, f.apiId)),
          error: err(e),
        });
      }
    }

    // --------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------

    let eventQuery = db
      .from("matches")
      .select("id,goal_fixture_id,kickoff,status")
      .not("goal_fixture_id", "is", null)
      .lte("kickoff", new Date().toISOString())
      .order("kickoff", { ascending: false });
    if(selectedTeamId&&clubs[0])eventQuery=eventQuery.or(`home_club_id.eq.${clubs[0].id},away_club_id.eq.${clubs[0].id}`);
    if(options.eventsLimit!==undefined)eventQuery=eventQuery.limit(Math.max(1,Math.min(10,Math.floor(Number(options.eventsLimit)||3))));
    const matchesQuery=await eventQuery;

    if (matchesQuery.error) {
      throw matchesQuery.error;
    }

    let eventsChecked = 0;
    let eventsSaved = 0;
    let eventsFailed = 0;

    const eventErrors: J[] = [];

    for (const match of (phase === "all" || phase === "events" ? matchesQuery.data ?? [] : [])) {
      if (fixtureIdFilter && match.goal_fixture_id !== fixtureIdFilter) continue;
      eventsChecked++;

      try {
        eventsSaved += await syncMatchEvents(match);
      } catch (e) {
        eventsFailed++;

        eventErrors.push({
          fixture: match.goal_fixture_id,
          error: err(e),
        });
      }
    }

    return new Response(
      JSON.stringify(
        {
          success: matchErrors.length === 0 && rosterTeamFailures === 0 && rosterFailedPlayers === 0 && eventsFailed === 0,
          phase,
          season: SEASON,

          clubs: clubs.length,

          fixturesFetched: totalFetched,
          fixturesForSeason: fixtures.length,
          teamsDiscovered: teams.size,

          matches: {
            insertedOrUpdated: matchesSaved,
            failed: matchErrors.length,
            errors: matchErrors,
          },

          players: {
            teamsChecked: rosterTeamsChecked,
            teams: rosterTeamResults,
            teamFailures: rosterTeamFailures,
            fetched: rosterFetched,
            insertedOrUpdated: rosterSaved,
            failedPlayers: rosterFailedPlayers,
            imagesCached: rosterImages,
            errors: rosterErrors,
          },

          matchEvents: {
            matchesChecked: eventsChecked,
            insertedOrUpdated: eventsSaved,
            failedMatches: eventsFailed,
            errors: eventErrors,
          },

          clubResults,

          durationMs: Date.now() - started,
        },
        null,
        2,
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (e) {
    console.error("SYNC FATAL", err(e));

    return new Response(
      JSON.stringify(
        {
          success: false,
          error: err(e),
        },
        null,
        2,
      ),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
});
