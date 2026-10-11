export function hasServerAuthorization(request: Request, legacyServiceKey: string, secretKeysJson: string | undefined): boolean {
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
