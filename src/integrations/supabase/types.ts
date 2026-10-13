/**
 * 45:45 database types are intentionally not generated into this handoff.
 * The project uses the existing production schema and untyped Supabase clients
 * so a stale generated Lovable schema cannot silently redefine the backend.
 *
 * Regenerate this file from the production project later with:
 *   supabase gen types typescript --project-id ohcopmgolzyfxwfqmpmx
 */
export type Database = Record<string, never>;
