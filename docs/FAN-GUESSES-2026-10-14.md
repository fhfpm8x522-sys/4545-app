# Fan guesses

Match Center provides eight questions, confirmation before save, edits before the deadline, private choices, points and a season/club leaderboard. Existing score predictions remain visible and new exact-score answers also update the legacy predictions table.

Questions use regulation time, including added time: starting eleven (2 points per correct starter, maximum 22), first team (15), first scorer excluding own goals (20), halftime leader (15), goals over/under 2.5 (10), yellow cards over/under 5.5 (10), winner (10), exact score (25). Starting-eleven answers close one hour before kickoff or when the selected side's official starters appear; other answers close at kickoff. Rescheduling retains choices and the authoritative database deadline controls future edits.

`save_fan_guess` validates the authenticated profile, match deadline, choice, roster membership and eleven unique IDs. It discards client fields such as points/user ID. RLS permits only own-choice reads; clients cannot directly insert, update or delete choices or points. Only service-role settlement can set facts/points. The public leaderboard contains the same display fields already used for public profiles, never email or credentials.

`match-guesses` verifies the caller with Supabase Auth. Scheduled server requests independently prove server permissions using the existing private provider cache. Outcomes come from GOAL fixture, lineup, event and card endpoints, with bounded request timeouts and cache reuse. Complete regulation goal scores determine chronology; own goals count for the scoring team but not the first scorer. Unknown data stays pending. Previously verified facts survive a transient provider outage; newly supplied facts override them when the provider corrects outcomes.

New database release: `supabase/releases/20261014_fan_guesses.sql`. Applied once through the project dashboard; do not automatically replay old releases. The existing scheduler credential is reused inside Supabase Vault without reading or exporting its value. No production rows were reset.

Validation: Node model tests, strict TypeScript, Vite SSR and Pages builds. Database verification runs synthetic match/guess/cache rows in a transaction that ends with ROLLBACK. It checks own reads, other-user isolation, forbidden direct score writes, service-only settlement, rejected injected fields, invalid scores, duplicate lineups, legacy compatibility, points, kickoff closure, one-hour lineup closure and early lineup publication. No passwords/auth accounts are created by that verification.

Backup: `backup/before-fan-feature-release-2026-10-14` and a local Git bundle. A real user's choice is never submitted merely to test the UI.
