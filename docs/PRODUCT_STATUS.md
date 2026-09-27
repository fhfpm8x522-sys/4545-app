# 45:45 — Product implementation map

Included in this handoff: Flutter app shell, auth/onboarding foundation, dynamic club model, Home, Games + Match Center, Team tabs + roster, News UI, club community surface, fan profile, Supabase schema for matches/events/players/stats/news approval/chants/widget schedule/polls/predictions/attendance/community/chat/moderation/history, staff roles/scopes/audit foundation, and an Admin Web shell.

## Production integrations still require credentials/services
The source is structured for the complete product, but a downloadable source archive cannot contain your private production credentials or third-party contracts. Before store release connect: Supabase project + Auth providers, football-data provider, news ingestion sources, push provider/APNs/FCM, image storage, AI moderation/summarization service, native iOS/Android widget targets, and App Store/Play signing.

## Non-negotiable product rules represented in schema/design
- News AI produces pending content only; a human approves publication.
- Favorite club changes use the 30-day server-side flow from migration 0002.
- Supporter chants are authored by humans; do not AI-generate them.
- Club community is club-scoped; Match Chat is fixture-scoped.
- AI moderation flags/temporarily limits meaningful abuse; humans confirm violations.
- Public staff badge is separate from permission and approval level.
- Important admin actions belong in audit_log.
