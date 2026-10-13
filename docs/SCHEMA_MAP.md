# Schema map — Lovable UI → 45:45 backend

הגרסה הזו אינה משתמשת בסכמה המקורית של הדמו של Lovable.

| UI concept | 45:45 backend |
|---|---|
| selected club | `profiles.favorite_club_id` |
| club display name | `clubs.name_he` |
| active club | `clubs.active` |
| match kickoff | `matches.kickoff` |
| round | `matches.round_name` |
| home / away crest | `matches.home_logo_url` / `away_logo_url` |
| fan songs | `chants` |
| widget slots | `widget_schedule` |
| player name / image | `players.name_he`, `players.name`, `players.image_url` |
| season player stats | `player_season_stats` |
| official news | `news_items.official` |
| active/published poll | `polls.status = published` |
| poll vote | `poll_votes.option_index` |
| club change | RPC `change_favorite_club` |
| safe public author info | RPC `get_public_profiles` |
| staff permissions | `roles`, `permissions`, `role_permissions`, `staff_memberships`, `staff_club_scopes` |
