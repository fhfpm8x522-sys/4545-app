import { supabase } from "@/integrations/supabase/client";
import type { PublicProfile } from "@/lib/app-types";

export async function publicProfiles(ids: Array<string | null | undefined>) {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (!unique.length) return new Map<string, PublicProfile>();

  const { data, error } = await supabase.rpc("get_public_profiles", {
    p_user_ids: unique,
  });
  if (error) throw error;

  return new Map<string, PublicProfile>(
    ((data ?? []) as PublicProfile[]).map((profile) => [profile.id, profile]),
  );
}

export function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function footballCompetitionBucket(value?: string | null) {
  const v = (value ?? "").toLowerCase();
  if (v.includes("toto")) return "toto";
  if (v.includes("cup") || v.includes("גביע")) return "cup";
  if (
    v.includes("europa") ||
    v.includes("conference") ||
    v.includes("champions") ||
    v.includes("אירופ") ||
    v.includes("קונפרנס") ||
    v.includes("אלופות")
  ) return "europe";
  return "league";
}
