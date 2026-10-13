# הפעלת Google ו־Apple ב־45:45

הקוד תומך בכניסה באמצעות שני הספקים. כרגע שניהם כבויים ב־Supabase, כי עדיין לא הוגדרו חשבונות המפתחים. כפתור כבוי מציג הסבר במקום לשלוח את המשתמש לכניסה שנכשלת.

## Google

1. התחבר ל־Google Cloud Console בחשבון שאתה מנהל ופתח פרויקט עבור האפליקציה.
2. הגדר מסך הסכמה OAuth: שם האפליקציה, כתובת תמיכה ומשתמשי בדיקה אם הפרויקט במצב בדיקה.
3. צור OAuth Client מסוג Web application.
4. Authorized JavaScript origin: `https://fhfpm8x522-sys.github.io`.
5. Authorized redirect URI: `https://ohcopmgolzyfxwfqmpmx.supabase.co/auth/v1/callback`.
6. ב־Supabase, Authentication → Sign In / Providers → Google, הזן את Client ID ואת Client Secret והפעל את הספק.
7. בדוק כניסה ויציאה עם משתמש בדיקה לפני פרסום מסך ההסכמה לקהל הרחב.

[הוראות רשמיות של Supabase ל־Google](https://supabase.com/docs/guides/auth/social-login/auth-google).

## Apple

נדרש חשבון Apple Developer עם אפשרות להגדיר Sign in with Apple. את ההרשמה, התשלום והסכמי החשבון צריך להשלים בעל החשבון.

1. הגדר App ID עם Sign in with Apple, ואז Services ID עבור כניסה באתר.
2. הגדר את דומיין ההחזרה של Supabase: `ohcopmgolzyfxwfqmpmx.supabase.co`; הוסף את דומיין האתר אם הגדרת Apple דורשת אותו.
3. Return URL: `https://ohcopmgolzyfxwfqmpmx.supabase.co/auth/v1/callback`.
4. צור מפתח Sign in with Apple והכן Client Secret לפי Team ID, Key ID ו־Services ID.
5. ב־Supabase → Authentication → Providers → Apple, הזן את Services ID ואת הסוד והפעל את הספק.
6. סוד הכניסה לאתר מחייב חידוש תקופתי, לכל היותר לאחר שישה חודשים. קבע אחריות לחידוש ובדיקה.

[הוראות רשמיות של Supabase ל־Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple).

## כתובות האתר ואבטחה

בדוק שב־Supabase URL Configuration כתובת האתר היא `https://fhfpm8x522-sys.github.io/4545-app/`, ושכתובות החזרה ואיפוס הסיסמה של האתר מאושרות. אין צורך לאשר דומיינים שאינם שלך.

שמור Client Secret וקובץ Apple `.p8` רק בהגדרות השרת המיועדות לכך. אל תעלה אותם ל־GitHub ואל תשלח אותם בצ׳אט. אין צורך להחליף קבצי אתר ידנית: אחרי הפעלת הספקים, האתר קורא את מצבם ומאפשר את הכפתורים.

## התראות

בפרופיל ניתן להפעיל Push ולאשר את בקשת הדפדפן. ב־iPhone נדרשת אפליקציית אתר המותקנת במסך הבית מ־Safari, במערכת שתומכת ב־Web Push. [הסבר WebKit](https://webkit.org/blog/13878/).
