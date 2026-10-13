# Deploy checklist

1. ודא ש־`.env` מכיל רק URL + publishable/anon key של Supabase.
2. הרץ את SQL 0014 ו־0015 אם עדיין לא הוחלו במסד.
3. ודא שב־`clubs` לפחות קבוצה אחת מכילה `goal_team_id` (בשלב הנוכחי הפועל באר שבע מחוברת ל־GOAL).
4. ב־Supabase Secrets הגדר `GOAL_API_KEY`.
5. Deploy ל־Edge Function `sync-football` והרץ Invoke פעם אחת.
6. בדוק שבתגובה יש `success: true`, מספר משחקים לעונה, שחקנים ואירועים.
7. Deploy ל־Web דרך Lovable או ספק hosting שתומך ב־Vite/TanStack Start.

## תוצאה צפויה לסנכרון באר שבע לפי בדיקות קודמות

המספרים יכולים להשתנות, אבל baseline שכבר ראינו היה בערך 317 fixtures מכל העונות, כ־40 בעונת 2026/2027 וכ־214 אירועי משחק עבור המשחקים שכבר שוחקו.
