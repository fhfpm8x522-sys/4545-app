# Personal match tools

Match Center: one-hour personal reminder, per-match alert selection, phone calendar export with a one-hour alarm, watched marker and public match-card image sharing. Profile: timezone-aware quiet hours, notifications for selected games only, private diary/album entry point and paginated personal-data export.

Diary: attendance list, supported-club snapshot for reliable home/away win statistics, private attendance badges, last watched game, private memories and away-trip notes, saved equipment checklist, private photo album and a share card that excludes identity, attendance, private notes and photos. Attendance totals are computed in the database so they do not inherit the API page-size limit. Older attendance without a supported side can be assigned one by its owner.

Calendar: UTC timestamps, stable event UID, escaped and byte-folded iCalendar text. The exported file includes a one-hour alarm; later kickoff changes require reimporting the event. Match cards contain only public team/date/score/competition fields.

Privacy: own-row RLS on diaries, saved items, match alert preferences and photo metadata. The photo bucket is private, allows JPEG/PNG/WebP up to 10 MB, and uses folder ownership plus restrictive authenticated/anonymous boundaries to prevent unrelated broad storage policies from exposing private images. Signed URLs are temporary and are not exported. Photo removal requires explicit confirmation in the interface. A diary patch merges only supplied fields and does not erase existing notes when toggling the watched marker.

Notification preferences merge atomically. Unknown fields, invalid booleans/hours/timezones are rejected. Nighttime notifications remain in the inbox and get a suppression marker, never a false delivery timestamp or a backlog sent in the morning. Reminders are queued once per user/game during the one-hour window by the existing server dispatcher. Push still requires the user to enable notifications on a supported device.

Applied new releases: `20261014_personal_match_tools.sql`, `20261014_attendance_summary.sql`. Do not replay old releases automatically. Source backup branch: `backup/before-personal-tools-2026-10-14`.

Validation: unit tests for UTC/calendar escaping, supported-side results, private-field exclusion from shared cards and session-free/cross-account-safe exports; strict TypeScript and Vite builds. Thirteen database checks verified own reads, preserved notes, private photo metadata ownership, cross-account and anonymous isolation, denied cross-account writes, attendance results, invalid preferences, future watched markers, server-only reminder dispatch, one-time queuing and timezone-aware quiet suppression. The database verification ended with ROLLBACK; it uploaded no physical photos and sent no notifications.

Personal export includes profile/preferences and accessible own rows for predictions, attendance, guesses, selected-game alerts, diary, saved items, photo metadata and inbox. It omits session credentials and private push subscription secrets. Photo binaries are kept in the private album rather than included in the JSON export.
