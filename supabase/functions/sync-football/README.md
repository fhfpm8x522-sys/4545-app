# GOAL sync

Recovered from the deployed function displayed as sync-football; the production endpoint slug is quick-service. Deployment is manual and currently awaiting explicit user approval. No deployment happens from this branch CI.

Keep SUPABASE_SERVICE_ROLE_KEY and GOAL_API_KEY in Supabase secrets only. POST requires the service-role Authorization bearer. GOAL_SEASON overrides the default 2026/2027 season. No cron.job existed at reconciliation time.

Request bodies support {"preview":true,"phase":"fixtures"} for a read-only fixture preview. The default phase is all; fixtures, rosters and events can be run separately. Optional fixtureId restricts selected fixtures/events and the teams whose rosters are discovered. Preview does not write to the database or storage. Review result counters: success is false when any phase reports failures.

Live read-only provider probes verified score fields, extra-time status, offset/hasMore pagination, player image/identity fields, card fault names and substitution player/name pairs. Node 22.13+ checks cover these mappings, pagination failures, request authorization and a read-only preview using provider/database doubles:

    node supabase/functions/sync-football/normalize_test.ts

Run staged live validation after deployment and approval; offline checks do not prove successful database writes or authenticated app flows. The affected tables were backed up before deployment preparation.

Migrations 0008–0012 normalize dashboard SQL; 0013 records verified live upsert constraints. Do not replay these historical migrations blindly on the live database. Validate replay on an isolated database first.
