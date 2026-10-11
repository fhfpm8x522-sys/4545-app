# GOAL sync

Recovered from the deployed function displayed as sync-football. Its production endpoint slug is quick-service.

The corrected source is not deployed automatically. Verify the scheduler sends POST with the service-role Authorization bearer before deploying to quick-service. Keep SUPABASE_SERVICE_ROLE_KEY and GOAL_API_KEY in Supabase secrets only. GOAL_SEASON overrides the default 2026/2027 season.

Run normalization checks with Node 22+ using node normalize_test.ts. These checks do not replace validation against actual GOAL fixture, roster and event responses.

Migrations 0008–0012 normalize dashboard SQL; 0013 records verified live upsert constraints. Do not replay these migrations blindly on the live database.
