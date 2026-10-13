export type Club = {
  id: string;
  slug: string;
  name_he: string;
  short_name_he: string | null;
  accent_color: string;
  crest_url: string | null;
  active: boolean;
  created_at?: string | null;
  city?: string | null;
  country?: string | null;
  league?: string | null;
  founded_year?: number | null;
  stadium?: string | null;
  stadium_capacity?: number | null;
  hero_image_url?: string | null;
  accent_foreground?: string | null;
  accent_secondary?: string | null;
  description?: string | null;
  sort_order?: number | null;
  goal_team_id?: string | null;
  goal_api_id?: string | null;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  birth_date: string | null;
  favorite_club_id: string | null;
  fan_since_year: number | null;
  last_club_change_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  content_prefs?: unknown;
  notification_prefs?: unknown;
  onboarding_completed?: boolean | null;
};

export type Match = {
  id: string;
  competition: string;
  round_name: string | null;
  home_club_id: string | null;
  away_club_id: string | null;
  home_name: string | null;
  away_name: string | null;
  kickoff: string;
  stadium: string | null;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled" | string;
  home_score: number | null;
  away_score: number | null;
  home_logo_url: string | null;
  away_logo_url: string | null;
  competition_logo_url: string | null;
  minute?: number | null;
  stats?: unknown;
  goal_fixture_id?: string | null;
  goal_fixture_api_id?: string | null;
  goal_home_team_id?: string | null;
  goal_away_team_id?: string | null;
  goal_league_id?: string | null;
  goal_league_year?: string | null;
  goal_stage?: string | null;
  goal_status?: string | null;
  goal_updated_at?: string | null;
};

export type Player = {
  id: string;
  club_id: string | null;
  name: string;
  number: number | null;
  position: string | null;
  nationality: string | null;
  birth_date: string | null;
  image_url: string | null;
  active: boolean | null;
  name_he?: string | null;
  goal_name?: string | null;
  goal_position?: string | null;
  goal_country?: string | null;
  goal_age?: number | null;
  shirt_number?: string | null;
  injured?: boolean | null;
  is_captain?: boolean | null;
};

export type PlayerStats = {
  player_id: string;
  season: string;
  appearances: number | null;
  goals: number | null;
  assists: number | null;
  minutes: number | null;
};

export type PublicProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  favorite_club_id: string | null;
};

export function clubName(club: Club | null | undefined) {
  return club?.name_he ?? "";
}

export function clubShortName(club: Club | null | undefined) {
  return club?.short_name_he || club?.name_he || "";
}

export function displayPlayerName(player: Partial<Player> | null | undefined, fallback?: string | null) {
  return player?.name_he || player?.name || player?.goal_name || fallback || "שחקן";
}

export function normalizePosition(value?: string | null) {
  const v = (value ?? "").toLowerCase();
  if (v.includes("goal")) return "goalkeeper";
  if (v.includes("def")) return "defender";
  if (v.includes("mid")) return "midfielder";
  if (v.includes("attack") || v.includes("forward") || v.includes("striker") || v.includes("wing")) return "forward";
  return v || "other";
}
