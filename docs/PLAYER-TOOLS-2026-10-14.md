# Player pages and comparisons

Club squad cards now open a personal player page. The directory lets any fan compare two players from any of the 14 active clubs in the same selected season, independently of their favorite club. Player pages and the directory support private favorite-player tracking, calendar-date birthdays, season totals and goals/assists per 90 minutes. Missing or zero minutes never produce a fabricated ratio; a known zero goal total remains zero.

The authenticated `football-data` server endpoint supports `mode: player`, a database player ID and a validated consecutive-year season. It fetches the existing GOAL player statistics endpoint, reuses the server cache, preserves known stored statistics when the provider is unavailable and returns the cache timestamp. Provider credentials are stripped by property name and by actual configured secret values before any football payload reaches the client. Player identifiers such as `playerKey` remain intact.

New public-football table `player_shirt_history` records the initial observed current number and future number/club changes. It does not claim historical seasons or an actual assignment date before monitoring started. Backfilling earlier shirt numbers requires a reliable source. Authenticated users can read history; only the existing Owner permission or server role can write it. No Owner was granted automatically.

Validation: strict TypeScript, Pages build and 30 unit tests, including two player model tests and a public-payload credential filtering test. Existing Node tests and earlier private-data/RLS checks remain passing. Source backup: `backup/before-player-tools-2026-10-14`.
