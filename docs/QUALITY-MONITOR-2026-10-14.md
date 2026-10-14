# Quality monitor

Owner-only server snapshot of database update times, stale live games, cache expiry, possible match/event duplicates and observed provider coverage by competition/season. No provider payloads, credentials, user contacts or private journals are returned. Findings are read-only and never delete or merge records. Coverage counts stored fixtures, timelines, explicit starting lineups and statistics; it is not a promise of supplier entitlement. Database update times are labelled separately from source age.

Three database checks passed inside BEGIN/ROLLBACK: Owner reads expected shape; a non-Owner cannot call; anonymous execution is revoked. Live monitoring is distinct from the still-pending sync failure alerts, correction queue, periodic backup/restore and weekly quality reports.
