# GOAL sync

Recovered from the deployed function displayed as sync-football; the production endpoint slug is quick-service. Deployment is manual. The user approved deployment and staged live validation. No deployment happens from this branch CI.

Keep SUPABASE_SERVICE_ROLE_KEY and GOAL_API_KEY in Supabase secrets only. POST requires either the injected legacy service-role Authorization bearer or an exact match for an injected modern server secret in the apikey header. JWT gateway verification stays enabled; modern-key calls also send a valid legacy JWT in Authorization. Public keys are rejected. GOAL_SEASON overrides the default 2026/2027 season. No cron.job existed at reconciliation time.

Request bodies support {"preview":true,"phase":"fixtures"} for a read-only fixture preview. The default phase is all; fixtures, rosters and events can be run separately. Optional fixtureId restricts selected fixtures/events and the teams whose rosters are discovered. For bounded roster runs, pass teamId with phase rosters; only a team found in the selected season fixtures is accepted. The fixture preview includes homeTeamId and awayTeamId. Preview does not write to the database or storage. Review result counters: success is false when any phase reports failures.

Live read-only provider probes verified score fields, extra-time status, offset/hasMore pagination, player image/identity fields, card fault names and substitution player/name pairs. Node 22.13+ checks cover these mappings, pagination failures, request authorization and a read-only preview using provider/database doubles:

    node supabase/functions/sync-football/normalize_test.ts

Run staged live validation after deployment and approval; offline checks do not prove successful database writes or authenticated app flows. The affected tables were backed up before deployment preparation. Live fixture preview fetched 345 provider fixtures and selected 40 season fixtures; all 13 finished fixtures had scores. The fixture write phase updated all 40 without errors. Stable event identities reuse the newest existing semantic match, with direct UPDATE for the live GENERATED ALWAYS primary key. Existing historical duplicates are retained pending explicit cleanup approval. All 25 discovered team rosters completed without failures (1,087 player upserts; 25 images cached). The events stage checked 13 matches and upserted 219 events without failures.

Migrations 0008–0012 normalize dashboard SQL; 0013 records verified live upsert constraints. Do not replay these historical migrations blindly on the live database. Validate replay on an isolated database first.
