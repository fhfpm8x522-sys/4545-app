# 45:45 — חיים את הקבוצה

גרסת Web מלאה המבוססת על העיצוב של Club Centric Hub / Lovable ומחוברת לארכיטקטורת 45:45 הקיימת.

## מה מחובר בפועל

- Supabase Auth + onboarding בעברית ו־RTL.
- 10 המועדונים מתוך `clubs` — ללא hardcode לוגי של קבוצה אחת.
- Home בעיצוב Lovable עם המשחק הבא, שירי אוהדים, חדשות, סקר, מצב קבוצה והיסטוריה.
- Games + Match Center על טבלאות `matches` / `match_events` של 45:45.
- GOAL API דרך Edge Function בשם `sync-football`; המפתח נשמר רק ב־Supabase Secrets.
- Timeline של שערים / כרטיסים / חילופים, כולל קישורי שחקנים ותמונות כאשר קיימים.
- ניחושי תוצאה, "הייתי שם", Match Chat.
- Team: סקירה, סגל, נתונים, מועדון והיציע.
- News: מציג רק `published`; מערכת Admin שומרת AI/טיוטה כ־pending עד אישור אנושי.
- Club Chat + Community posts.
- Profile / Fan Card, סטטיסטיקת ניחושים, התראות והחלפת קבוצה דרך RPC עם cooldown של 30 יום.
- Admin: Clubs, News, Chants/Widget, Staff/Roles/Audit.
- Widget surface מציג רק `chants` אמיתיים שהוזנו ידנית.

## משתני סביבה של ה־Web

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

אין להכניס `SUPABASE_SERVICE_ROLE_KEY` או `GOAL_API_KEY` ל־Web.

## Supabase Edge Function

הקובץ נמצא ב:

`supabase/functions/sync-football/index.ts`

Secrets נדרשים בצד Supabase בלבד:

- `GOAL_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- אופציונלי: `GOAL_SEASON=2026/2027`

## SQL / migrations

אם מסד הנתונים שלך כבר מכיל את 0001–0013 שכבר בנינו, אל תריץ אותם מחדש ידנית. עבור החיבור החדש ל־Web יש לוודא במיוחד שהשינויים ב־`0014_web_profile_support.sql` וב־`0015_web_content_support.sql` קיימים.

הקבצים 0009–0013 נשמרו בריפו כדי שהקוד וה־DB יהיו מתועדים יחד. הם כתובים עם `IF NOT EXISTS` ככל האפשר.

## פיתוח מקומי

```bash
npm install
npm run dev
```

בדיקת build:

```bash
npm run build
```

## עיקרון ארכיטקטוני

ה־UI מגיע מהכיוון של Lovable, אבל מקור האמת הוא ה־Backend של 45:45:

- `favorite_club_id` בפרופיל
- `kickoff`, `round_name`, `home_logo_url`, `away_logo_url` במשחקים
- `chants` / `widget_schedule`
- `players` + `player_season_stats`
- `news_items` עם workflow של אישור אנושי
- Roles / Permissions / Scopes / Audit מהמערכת הקיימת

לא נוצר DB מקביל עם שמות שדות אחרים.

## Admin surfaces

- `/admin` — the redesigned React admin surface aligned with the Lovable UI.
- `/admin-full/` — preserved full legacy CMS for matches, players, polls, history, moderation, users/staff and audit while those modules are progressively ported into the React admin.

## Important when replacing an existing 45:45 project

Do **not** wipe the existing Supabase database. Migrations `0001`–`0013` document/reconstruct the existing backend history. On an already configured project, review migration history before applying anything; the new web-support migrations are `0014` and `0015`. Deploy `supabase/functions/sync-football/index.ts` with `GOAL_API_KEY` and the Supabase service role stored as server-side secrets only.
