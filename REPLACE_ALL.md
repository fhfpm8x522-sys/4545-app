# החלפה מלאה — 45:45

החבילה הזאת היא בסיס ה־45:45 החדש: העיצוב והמבנה של `club-centric-hub` עם חוזה הנתונים והפיצ'רים של 45:45.

## מה מחליפים

אפשר להחליף את כל קבצי פרויקט ה־Web בקבצים שבתיקייה הזאת.

## מה לא מוחקים

- לא מוחקים את פרויקט Supabase הקיים ולא מאפסים את הדאטה.
- לא מכניסים `GOAL_API_KEY` או `SUPABASE_SERVICE_ROLE_KEY` לקוד הלקוח.
- אם migrations `0001`–`0013` כבר רצו בפרויקט, לא מריצים אותן מחדש בצורה עיוורת. בודקים היסטוריית migrations לפני הרצה; התוספות החדשות של חבילת ה־Web הן `0014` ו־`0015`.

## Backend

Edge Function מלאה נמצאת כאן:
`supabase/functions/sync-football/index.ts`

היא מצפה ל־server-side secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOAL_API_KEY`
- `GOAL_SEASON` אופציונלי (ברירת מחדל `2026/2027`)

## Admin

- `/admin` — Admin החדש בעיצוב החדש.
- `/admin-full/` — ה־CMS המלא הישן שנשמר כגיבוי בזמן שמעבירים את כל מודולי הניהול ל־React החדש.
