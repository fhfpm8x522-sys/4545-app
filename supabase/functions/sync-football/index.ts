import {s,n,b,pick,arr,status,fixtureScore,preserveKnown,uniqueEvents,collectFixtures,substitutionPlayers} from "./normalize.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOAL_BASE = "https://api.goal-api.com/v1";
const SEASON = Deno.env.get("GOAL_SEASON") ?? "2026/2027";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOAL_KEY = Deno.env.get("GOAL_API_KEY") ?? "";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

type J = Record<string, any>;

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
  return arr(await goal(`/teams/${teamId}/players`));
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
  return n(pick(x.minute, x.time, x.elapsed));
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

  const save = await db
    .from("match_events")
    .upsert(uniqueEvents(output), {
      onConflict: "goal_event_id",
    });

  if (save.error) throw save.error;

  return output.length;
}

// ============================================================
// MAIN
// ============================================================

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!SERVICE_KEY || request.headers.get("Authorization") !== "Bearer " + SERVICE_KEY) return new Response("Unauthorized", { status: 401 });
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
    const clubs = await loadClubs();

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
    if (preview) return Response.json({success:true,preview:true,phase,season:SEASON,fixturesFetched:totalFetched,fixturesForSeason:fixtures.length,fixtures:fixtures.map(f=>({id:s(pick(f.id,f.fixtureId,f.apiId)),kickoff:fixtureKickoff(f),status:status(pick(f.matchStatus,f.status),pick(f.matchLive,f.live)),...fixtureScore(f)}))});

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
        const c = findClub(clubs, h, homeApi(f));

        teams.set(h, {
          clubId: c?.id ?? null,
          name: homeName(f),
        });
      }

      if (a) {
        const c = findClub(clubs, a, awayApi(f));

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

    for (const [teamId, info] of (phase === "all" || phase === "rosters" ? teams : new Map())) {
      try {
        const r = await syncRoster(teamId, info.clubId);

        rosterFetched += r.fetched;
        rosterSaved += r.saved;
        rosterFailedPlayers += r.failed;
        rosterImages += r.images;
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
        const row = await buildMatch(f, clubs);

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

    const matchesQuery = await db
      .from("matches")
      .select("id,goal_fixture_id,kickoff,status")
      .not("goal_fixture_id", "is", null)
      .lte("kickoff", new Date().toISOString())
      .order("kickoff", { ascending: false });

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
            teamsChecked: teams.size,
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