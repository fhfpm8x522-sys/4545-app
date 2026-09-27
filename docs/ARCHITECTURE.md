# 45:45 Architecture

## Product boundary
45:45 is the selected club's world: club home, matches, team, approved news, fan community and supporter identity. Club-specific data must be dynamic and scoped, not hardcoded into feature logic.

## Mobile
Flutter, Hebrew-first RTL. Feature folders own UI; repositories own Supabase data access; services own external/auth behavior. `.env` contains public client configuration only. Service-role keys must never ship in the app.

## Backend
Supabase/Postgres for Auth, relational data, RLS and realtime. Privileged operations must be server-side/RPC/Edge Function operations with permission checks and audit records.

## Identity
Email/Apple/Google authentication. `@username` is mandatory and unique. Birth date is private. Initial favorite-club selection is free; subsequent changes use a 30-day cooldown. Owner/admin override will be a privileged audited operation.

## Staff authorization
Users → Staff Memberships → Roles → Permissions → Club Scopes → Approval Levels → Public Badges → Audit Log. Public badges never grant permissions. UI hiding is convenience only; server-side enforcement is authoritative.

## News
No AI auto-publishing. Source ingestion → AI detection/summarization/deduplication → Pending queue → human Approve/Edit/Reject → Publish. Original source metadata is retained.

## Community
Club Chat is selected-club-only. Match Chat admits both fixture fanbases. AI moderation focuses on spam, scams, malicious links, ads, raids and suspicious behavior; temporary automated locks create reviewable moderation cases and are not confirmed violations.

## Widget
Home-screen widget contains only real supporter chant/song snippets curated by humans. AI must not generate chants. Rights/copyright review is required before protected lyrics are published.
