# Club Centric Hub

45:45 — חיים את הקבוצה.

מסמך אפיון מלא לבניית האפליקציה + Admin Panel

אני רוצה לבנות אפליקציית מובייל מלאה בשם 45:45, עבור iOS ו־Android, יחד עם מערכת Web Admin מלאה.

זה אינו Prototype או UI Demo בלבד. יש לבנות מוצר אמיתי, מודולרי וניתן להרחבה, עם Backend, Database, Authentication, הרשאות, API architecture, מערכת תוכן, קהילה, Widgets וממשק ניהול.

אין לבצע Hardcode של קבוצה, חדשות, שירים, שחקנים או תוכן אחר שאמור להיות מנוהל דרך Backend/Admin.

⸻

1. זהות המוצר

שם: 45:45

מוטו: חיים את הקבוצה.

הרעיון של השם הוא שני מחציות של 45 דקות.

45:45 אינה אמורה להיות עוד אפליקציית תוצאות כללית בסגנון 365Scores.

המטרה היא ליצור עבור האוהד את העולם הדיגיטלי של הקבוצה שלו.

ברגע שהמשתמש בוחר קבוצה, כמעט כל האפליקציה משתנה בהתאם אליה:

* צבעים
* סמל
* תמונות
* חדשות
* משחקים
* סגל
* סטטיסטיקות
* שירי אוהדים
* היסטוריה
* קהילה
* צ’אט
* התראות
* Widget
* סקרים
* Match Center

מבחינת אוהד הפועל באר שבע, 45:45 צריכה להרגיש כמו אפליקציית הפועל באר שבע.

מבחינת אוהד מכבי תל אביב, אותה אפליקציה צריכה להרגיש כמו עולם אחר לחלוטין המוקדש למכבי תל אביב.

⸻

2. עיצוב

Design language:

* Dark
* Premium
* Stadium atmosphere
* Football supporter culture
* Black / charcoal backgrounds
* White typography
* צבע Accent דינמי בהתאם לקבוצה
* Cards מעוגלים
* תמונות קהל ואצטדיון
* Glow עדין
* Scoreboard feeling
* ממשק מודרני מאוד
* Mobile-first
* RTL מלא בעברית

המיתוג הראשי של 45:45 נשאר ניטרלי.

הקבוצה משנה את ה־Accent והאווירה.

לדוגמה:

הפועל באר שבע → אדום
מכבי חיפה → ירוק
מכבי תל אביב → צהוב/כחול
בית”ר ירושלים → צהוב/שחור

⸻

3. קבוצות בגרסה הראשונה

בשלב הראשון האפליקציה תתמוך ב־10 מועדונים בלבד.

Initial seed:

1. הפועל באר שבע
2. מכבי תל אביב
3. מכבי חיפה
4. בית”ר ירושלים
5. הפועל תל אביב
6. מכבי נתניה
7. הפועל חיפה
8. הפועל ירושלים
9. בני סכנין
10. הפועל פתח תקווה

חשוב:

הרשימה אינה Hardcoded.

יש לבנות Clubs Database ומערכת Admin המאפשרת:

* Add Club
* Edit Club
* Disable Club
* Delete/Archive Club
* Logo
* Colors
* Stadium
* Country
* League
* Images
* Metadata

בעתיד אני רוצה להיות מסוגל להוסיף גם Real Madrid, Barcelona, Liverpool וכו’ בלי לבנות מחדש את האפליקציה.

⸻

4. מבנה ניווט ראשי

Bottom Navigation:

בית | משחקים | הקבוצה | חדשות | אני

בנוסף קיימת שכבת קהילה בשם:

היציע

וחדרי Match Chat בתוך משחקים.

⸻

5. הרשמה

מסך פתיחה עם:

45:45
“חיים את הקבוצה.”

אפשרויות:

* Continue with Apple
* Continue with Google
* Register with Email

וקישור:

“כבר יש לי חשבון — התחברות”

⸻

6. הרשמה באימייל

נדרשים:

* Email
* Password
* Confirm Password
* Email verification

יש לבצע Validation מלא.

⸻

7. פרופיל ראשוני

המשתמש נדרש לבחור:

Display Name

ו־

@username — חובה

Username חייב להיות:

* ייחודי
* בעל בדיקת זמינות בזמן אמת
* ניתן לשימוש ב־mentions
* ניתן לחיפוש
* מוצג בצ’אטים/תגובות/פרופיל
* ניתן לחיפוש ב־Admin

אפשר להוסיף תמונת פרופיל או לדלג.

אם בעתיד משתמש משנה Username, ה־Admin צריך לשמור Username History.

⸻

8. תאריך לידה

יש לבקש תאריך לידה.

המידע פרטי ולא מוצג בפרופיל הציבורי.

יש לתכנן את המערכת כך שניתן יהיה להפעיל מדיניות גיל/קהילה בהתאם לדרישות החוק וחנויות האפליקציות.

⸻

9. בחירת קבוצה

מסך משמעותי:

איזו קבוצה אתה חי?

עם Grid של המועדונים + Search.

הבחירה קובעת את כל סביבת האפליקציה.

הבחירה הראשונית בזמן ההרשמה אינה נחשבת החלפת קבוצה.

⸻

10. החלפת קבוצה

לאחר הבחירה הראשונית:

ניתן להחליף את “הקבוצה שלי” רק פעם ב־30 יום.

יש להציג:

“קבוצה נוכחית”

ו־

“ניתן לשנות שוב בעוד X ימים.”

Owner/Admin בעל הרשאה מתאימה יכול לבצע:

Override Club Change Cooldown

או לשנות קבוצה עבור משתמש.

לאחר Override והחלפה חדשה מתחיל Cooldown חדש של 30 יום.

כל Override נכנס ל־Audit Log.

⸻

11. ממתי אתה אוהד?

שאלה אופציונלית:

ממתי אתה אוהד את הקבוצה?

בחירת שנה.

אפשר:

“לא זוכר / דלג”

המידע יכול להופיע בפרופיל:

“אוהד מאז 2010”

לפי הגדרות פרטיות.

⸻

12. העדפות תוכן

המשתמש יכול לבחור מה מעניין אותו:

* משחקים
* חדשות
* העברות
* פציעות
* הרכבים
* היציע

ניתן לשנות בהמשך.

⸻

13. Notifications onboarding

לפני בקשת Push Permission של מערכת ההפעלה, יש להציג מסך הסבר פנימי.

לאחר שהמשתמש לוחץ “הפעל התראות”, להפעיל את Permission Prompt של iOS/Android.

⸻

14. Welcome

לאחר ההרשמה:

מסך Welcome בצבעי הקבוצה.

לדוגמה:

“ברוך הבא ליציע, נהוראי.”

“הפועל באר שבע.”

“חדשות. משחקים. הקבוצה. הקהל.”

“חיים את הקבוצה.”

CTA:

יאללה, נכנסים

⸻

15. התחברות

Login באמצעות:

* Apple
* Google
* Email + Password

כולל:

* Forgot Password
* Account recovery
* Email verification state
* Secure sessions

⸻

16. HOME

Home הוא:

הקבוצה שלי עכשיו.

לא Global Football Feed.

בראש:

* 45:45
* Notifications
* Profile
* Club identity

Hero מרכזי:

המשחק הבא

כולל:

* קבוצות
* סמלים
* תחרות
* מחזור
* תאריך
* שעה
* אצטדיון
* Countdown
* CTA ל־Match Center

הכרטיס משתנה לפי מצב המשחק:

Pre-match → Next Match
Matchday → MATCHDAY
Live → Live Score
Post-match → Full Time

⸻

17. 45:45 עכשיו

כרטיס תוכן דינמי בתוך Home.

יכול להציג:

* עדכון
* News teaser
* Match information
* תוכן רלוונטי

אין לבלבל אותו עם Widget.

⸻

18. חדשות בבית

“מה חדש בקבוצה?”

מספר ידיעות מרכזיות בלבד.

כל ידיעה:

* תמונה
* כותרת
* מקור
* זמן
* CTA

⸻

19. Poll

אפשר להציג Poll אינטראקטיבי:

* מי צריך לפתוח?
* איך ייגמר המשחק?
* איש המשחק?
* שאלות קהילה

⸻

20. היום במועדון

Historical moment רלוונטי לתאריך, אם קיים.

⸻

21. מצב הקבוצה

Quick status:

* מיקום
* נקודות
* Form
* מספר משחקים

⸻

22. משחקים

הטאב “משחקים” עוסק רק בקבוצה של המשתמש.

Sections:

* הבא
* לוח משחקים
* תוצאות

פילטרים:

* הכל
* ליגה
* גביע
* אירופה
* גביע הטוטו
* תחרויות רלוונטיות נוספות

⸻

23. Match Center — לפני משחק

כולל:

* Date
* Time
* Stadium
* Competition
* Round
* Countdown
* Positions
* Form
* Previous meetings
* Lineups כאשר זמינים
* Score prediction

המשתמש יכול לנחש תוצאה.

להציג Community Prediction:

Home Win / Draw / Away Win.

⸻

24. Match Center — LIVE

כולל:

* LIVE
* Minute
* Score
* Timeline

אירועים:

* Goals
* Cards
* Substitutions
* VAR/אירועים נוספים אם מקור הנתונים מאפשר

Stats לפי זמינות API:

* Possession
* Shots
* Shots on target
* Corners
* Fouls
* Offsides

⸻

25. Match Center — Post Match

כולל:

* FULL TIME
* Score
* Scorers
* Timeline
* Stats
* Lineups
* Fan Man of the Match

⸻

26. “הייתי במשחק”

משתמש יכול לסמן:

🏟️ הייתי שם

ומערכת הפרופיל בונה לאורך זמן:

* מספר משחקים
* ניצחונות שראה
* שערים שראה
* אצטדיונים
* Match history

⸻

27. הקבוצה

Hero:

* Crest
* Club Name
* Founding year
* Stadium
* Crowd image
* Club colors

Sections:

סקירה | סגל | נתונים | מועדון | היציע

⸻

28. סקירה

כולל:

* Position
* Points
* Season record
* Goal difference
* Last 5 form
* Season snapshot
* Top scorer
* Top assists
* Most minutes
* Next match

⸻

29. סגל

חלוקה:

* שוערים
* הגנה
* קישור
* התקפה

Player card:

* תמונה
* מספר
* שם
* עמדה

⸻

30. Player Profile

כולל:

* Name
* Number
* Position
* Nationality
* Age
* Appearances
* Goals
* Assists
* Minutes

נתונים נוספים רק אם קיימים ממקור אמין.

⸻

31. נתונים

Team statistics:

* Goals for
* Goals against
* Wins
* Draws
* Losses
* Home/Away
* Clean sheets
* Average goals

Leaderboards:

* Goals
* Assists
* Minutes
* Appearances

⸻

32. מועדון

כולל:

* Trophies
* Stadium
* Capacity
* History
* Timeline
* Major moments

⸻

33. חדשות

החדשות אינן Feed עיוור.

Sections:

* Story מרכזי
* 45:45 בקצרה
* Official Club News
* News Feed
* Transfers
* Injuries
* Lineups
* Interviews

⸻

34. AI News System

AI יכול:

* לאתר כתבות
* לסכם
* לזהות קבוצה
* לסווג
* לזהות כפילויות
* לאחד מספר דיווחים לאותו Story
* להציע כותרת
* להציע תקציר

אבל:

AI NEVER PUBLISHES AUTOMATICALLY.

כל תוכן שה־AI רוצה לפרסם נכנס ל:

Pending Approval Queue

רק איש צוות בעל הרשאה יכול לפרסם.

Workflow:

Source
→ AI detection
→ AI summary
→ Classification
→ Pending
→ Human Review
→ Approve/Edit/Reject
→ Publish

Statuses:

* Pending
* Approved
* Published
* Rejected
* Archived

⸻

35. 45:45 בקצרה

כאשר מספר מקורות מדברים על אותו Story, ניתן להציג Summary אחד עם:

“3 מקורות מדווחים”

ולקשר למקורות.

אין להציג שמועה כעובדה.

⸻

36. Official Content

הודעה רשמית של מועדון מקבלת Label ברור:

הודעה רשמית

ומקור.

⸻

37. “פספסת משהו?”

כאשר משתמש חוזר לאחר זמן:

Summary קצר:

“מאז שהיית כאן…”

עם האירועים המרכזיים שהתרחשו.

⸻

38. Widget

אחד הפיצ’רים המרכזיים ביותר.

ה־Widget מציג אך ורק שורות משירי אוהדים אמיתיים.

לא:

* חדשות
* תוצאות
* Facts
* משפטי מוטיבציה מומצאים
* Match updates

רק שירי אוהדים שהוזנו ידנית למערכת.

⸻

39. Widget לפי קבוצה

לכל קבוצה מאגר שירים נפרד.

אוהד באר שבע רואה רק שירי באר שבע.

אוהד מכבי תל אביב רואה רק שירי מכבי תל אביב.

וכן הלאה.

⸻

40. Widget Rotation

יעד:

החלפת משפט כל כ־3 שעות, בכפוף למגבלות Widget refresh של iOS/Android.

אין לחזור על אותו משפט פעמיים ברצף.

יש לתמוך ב־Rotation/Shuffle Queue.

⸻

41. Songs Admin

השירים נכתבים ידנית על ידי מנהלי 45:45.

AI לא יוצר שירי אוהדים.

Admin יכול:

* Add
* Edit
* Delete
* Disable
* Enable
* Assign Club
* Preview
* Schedule

⸻

42. Widget Scheduler

אפשרות לראות Schedule לפי קבוצה:

00:00 → Song Line
03:00 → Song Line
06:00 → Song Line
…

Admin יכול Override ידנית שורה לשעה מסוימת.

⸻

43. אני — Fan Profile

כולל:

* Avatar
* Display Name
* Username
* Club
* Fan since
* Streak
* Predictions
* Activity
* Widget settings
* Favorites
* Notifications
* Club settings
* App settings

⸻

44. Predictions

להציג:

* Total predictions
* Exact predictions
* Correct direction
* Accuracy

והיסטוריה.

⸻

45. Fan Activity

לדוגמה:

* Votes
* Predictions
* MOTM votes
* Trivia
* Matches attended

בעתיד ניתן להוסיף XP/Badges.

⸻

46. Fan Card

Digital Fan Card שניתן לשתף.

לדוגמה:

45:45
נהוראי
הפועל באר שבע
אוהד מאז 2010
4 ניחושים מדויקים
23 משחקים
Streak

⸻

47. היציע — קהילה

לכל קבוצה Community נפרדת.

היציע שלנו מיועד לאוהדי אותה קבוצה בלבד.

כולל:

* Club Chat
* Posts
* Comments
* Polls
* Hot discussions

⸻

48. Club Chat

Real-time chat.

כולל:

* Replies
* Reactions
* Mentions
* Report
* Staff badges
* Pinned staff messages

תמונות/GIF יכולים להיות Feature שניתן להפעיל בהמשך.

⸻

49. Match Chat

לכל משחק בין שתי קבוצות נתמכות נוצר חדר משותף לשני מחנות האוהדים.

לדוגמה:

הפועל באר שבע × מכבי חיפה

אוהדי שתי הקבוצות נמצאים יחד.

ליד כל משתמש ניתן לזהות את הקבוצה שלו באמצעות Crest/Color/Badge.

Header:

* Score
* Minute
* LIVE
* Number of users
* מספר אוהדים מכל צד

⸻

50. Match Chat Events

אירועי משחק יכולים להופיע כהודעות System:

* Goal
* Card
* Substitution
* Kickoff
* Half Time
* Full Time

⸻

51. Club Chat לעומת Match Chat

Club Chat: אוהדי הקבוצה בלבד.

Match Chat: שתי הקבוצות המשחקות.

זה הבדל מרכזי במוצר.

⸻

52. Club hopping protection

כיוון ש־Club Chat סגור לקבוצה, יש למנוע משתמשים שמחליפים קבוצה כדי להטריל.

לכן:

* שינוי קבוצה פעם ב־30 יום
* בחירה ראשונית אינה נחשבת
* Admin Override אפשרי
* שמירת Club Change History
* אפשרות AI/מערכת לזהות התנהגות Raid חריגה

⸻

53. AI Community Gatekeeper

תפקיד ה־AI אינו לצנזר כל קללה של אוהדי כדורגל.

הדגש הוא על:

* Spam
* Irrelevant advertising
* Scam
* Suspicious links
* Repeated promotions
* Raids
* Club hopping abuse
* משתמשים שמנסים להסתנן לקהילות אחרות
* התנהגות חריגה

⸻

54. Links

ב־Club Chat:

Policy מחמיר יותר כלפי קישורי פרסום/Spam.

ב־Match Chat:

קישורים מותרים בצורה חופשית יותר, אך עדיין קיימת הגנה מפני:

* Malware
* Phishing
* Scam
* Spam

Staff יכולים לקבל Trusted status.

⸻

55. AI Temporary Enforcement

במקרה שהמערכת מזהה אירוע משמעותי:

* Remove message from public chat
* Preserve original message as evidence
* Temporarily disable writing when appropriate
* Create Moderation Case
* Push relevant Moderators

ה־AI משמש כשוטר זמני עד שאיש צוות מגיע.

⸻

56. Moderator Review

Moderator רואה:

* User
* Message
* Room
* Timestamp
* AI reason
* Context
* Previous moderation history

Actions:

* False Positive
* Restore access
* Restore message
* Warning
* Mute
* Temporary Ban
* Community Ban
* Escalate

⸻

57. Moderation History

בפרופיל Admin בלבד נשמרת היסטוריה.

יש להפריד בין:

AI Flag

לבין:

Moderator Confirmed Violation

False Positive אינו נחשב עבירה מאומתת.

⸻

58. Admin Panel

יש לבנות Web Admin מלא.

ה־Admin צריך לשלוט כמעט בכל תוכן באפליקציה ללא שינוי קוד.

Dashboard כולל Club Selector.

לדוגמה:

הפועל באר שבע ▼

לאחר הבחירה כל ה־Admin מתמקד באותה קבוצה.

⸻

59. Admin capabilities

ניהול:

* Clubs
* Players
* Matches
* News
* AI News Queue
* Songs
* Widget Schedule
* Polls
* Trivia
* History
* Trophies
* Stadiums
* Home content
* Push notifications
* Users
* Staff
* Roles
* Permissions
* Moderation
* Reports
* Community
* App configuration

⸻

60. User Management

Search:

* Username
* Display name
* Email
* User ID

User Admin Profile מציג:

* Basic account information
* Current club
* Club history
* Staff status
* Permissions
* Moderation history
* Activity
* Account status

⸻

61. Staff System

אין להשתמש במודל פשוט:

isAdmin = true

יש לבנות:

Users → Staff Membership → Roles → Permissions → Club Scopes → Approval Levels

⸻

62. Roles מוכנים

Default Roles:

* Owner
* Super Admin
* Club Manager
* News Editor
* Songs Editor
* Content Editor
* Moderator
* Senior Moderator
* Community Manager

בנוסף:

Custom Role

⸻

63. Permissions

הרשאות Granular.

לדוגמה News:

* View pending
* Edit
* Approve
* Reject
* Publish
* Delete
* Archive
* Push

Songs:

* View
* Add
* Edit
* Delete
* Schedule

Community:

* Delete message
* Mute
* Ban
* Review reports
* Pin
* Manage chat

וכו’.

⸻

64. Club Scope

כל הרשאה יכולה להיות מוגבלת למועדון.

לדוגמה:

User123:

Role: News Editor
Scope: הפועל באר שבע בלבד

הוא יכול לעבוד בחדשות באר שבע בלבד.

User456:

Role: Content Manager
Scope: All Clubs

יכול לעבוד בכל הקבוצות.

⸻

65. Hidden unauthorized UI

Staff member לא צריך רק לקבל Error כאשר הוא לוחץ על משהו אסור.

Sections שאין לו הרשאה אליהם לא יוצגו בכלל ב־Admin.

Backend עדיין חייב לאכוף הרשאות באופן עצמאי.

⸻

66. Approval Levels

בנפרד מה־Role:

Level 1 — Contributor

יכול ליצור ולערוך Draft ולשלוח לאישור.

Level 2 — Editor

יכול לבדוק ולאשר עבודה בהתאם להרשאות.

Level 3 — Publisher

יכול לפרסם ישירות בתחום/קבוצות שהוגדרו.

Level 4 — Manager

יכול לנהל תחום וצוות בהתאם להרשאות שניתנו.

Owner

שליטה מלאה.

Role ו־Approval Level הם שני דברים נפרדים.

⸻

67. Public Staff Badges

Role יכול לקבל Public Badge.

לדוגמה:

* 45:45 OWNER
* מנהל באר שבע
* עורך חדשות
* Moderator

ה־Badge מופיע ליד שם המשתמש ב:

* Chat
* Match Chat
* Comments
* Posts
* Profile

אבל:

Public Badge ≠ Permission.

ניתן לתת Badge ללא הרשאת Admin ולהפך.

⸻

68. Edit Log / Audit Log

חובה.

כל שינוי משמעותי נשמר:

* מי ביצע
* מה ביצע
* מתי
* Club
* Object
* Before
* After

לדוגמה:

News title:

Before: X
After: Y

יש לתמוך ב־Version History ובמקומות המתאימים:

Restore Version

⸻

69. Soft Delete

תוכן חשוב לא נמחק מיד מה־Database.

להשתמש ב־Soft Delete כאשר מתאים ולאפשר Restore למורשים.

⸻

70. Staff Activity

Staff Profile ב־Admin:

* Role
* Approval Level
* Club scopes
* Public badge
* Number of actions
* Articles approved
* Pending items
* Rejected content
* Join date
* Activity history

⸻

71. Suspend Staff Access

אפשר להסיר/להשעות הרשאות צוות בלי למחוק או להשעות את חשבון המשתמש הרגיל.

לאחר Suspend:

המשתמש ממשיך להיות אוהד רגיל באפליקציה.

⸻

72. Permission escalation protection

Staff אינו יכול:

* להעלות לעצמו הרשאות
* ליצור לעצמו Scope חדש
* להעניק הרשאה גבוהה מזו שהוא מורשה להעניק

Owner-level capabilities מוגנות במיוחד.

⸻

73. Reports Queue

Admin/Moderators מקבלים:

* Reported message
* Reporter count
* Reason
* User
* Room
* Context
* History

חשוב:

Open Context

מציג מספר הודעות לפני ואחרי האירוע.

⸻

74. Moderator Notes

Moderators יכולים לכתוב Notes פנימיים על Case/User.

המשתמש הרגיל אינו רואה אותם.

⸻

75. Push System

Push notifications חייבות להיות Targetable.

לפי:

* Club
* Topic
* User preferences
* Match
* Staff/Moderation

Admin יכול לשלוח Push לקבוצה מסוימת בלבד.

⸻

76. News Notifications

המשתמש יכול לבחור:

* Important news
* Official news
* Transfers
* Injuries
* Lineups
* Match alerts

⸻

77. Admin Preview

ב־Admin:

Preview as Club

לדוגמה:

Preview as → הפועל באר שבע

ולהציג Preview של האפליקציה כפי שאוהד אותה קבוצה יראה אותה.

⸻

78. Architecture

יש לבנות מערכת Multi-Club אמיתית.

Core concept:

45:45 Engine → Clubs → Club-specific data/content

כמעט כל Entity רלוונטי צריך להיות משויך ל־club_id או לקשר מתאים.

אין לבנות אפליקציה נפרדת לכל קבוצה.

אותו Engine מספק חוויה שונה לחלוטין לפי Club Context.

⸻

79. Backend

נדרש Backend אמיתי עבור:

* Authentication
* Users
* Clubs
* Content
* News
* AI queue
* Matches
* Players
* Statistics
* Predictions
* Polls
* Community
* Chat
* Moderation
* Staff
* Permissions
* Audit logs
* Push
* Widget content

יש להשתמש ב־Realtime infrastructure עבור Chat/Match Chat.

⸻

80. Security

חובה:

* Server-side authorization
* Secure authentication
* Rate limiting
* Anti-spam
* Input validation
* Secure session/token handling
* Permission validation
* Audit logging
* Protection against privilege escalation
* Safe file uploads
* API secrets never exposed to client

⸻

81. Football Data

Fixtures, scores, standings, lineups וסטטיסטיקות צריכים להגיע ממקור/API דינמי.

יש לבנות abstraction layer כך שניתן יהיה להחליף Football Data Provider בעתיד בלי לבנות מחדש את האפליקציה.

Admin יכול לבצע Manual Correction במקרה הצורך.

⸻

82. News Sources

גם מערכת החדשות צריכה להשתמש ב־Source abstraction.

אין לקשור את כל המערכת לספק אחד.

כל ידיעה שומרת:

* Source
* Source URL
* Original title
* AI summary
* Club
* Category
* Status
* Created time
* Approved by
* Published time

⸻

83. Widget Technology

יש לתמוך ב־iOS Widget וב־Android Widget.

יש לתכנן מראש את מגבלות הרענון של מערכות ההפעלה.

יעד המוצר הוא שינוי שורה בערך כל 3 שעות, אך אין להבטיח Background refresh שאינו אפשרי בפלטפורמה.

⸻

84. RTL

האפליקציה בגרסה הראשונה היא Hebrew-first.

כל UI חייב להיות RTL אמיתי:

* Navigation
* Alignment
* Cards
* Icons
* Forms
* Chat
* Admin content fields

אין לבצע רק Mirror חלקי.

⸻

85. Performance

האפליקציה צריכה להרגיש מהירה.

יש להשתמש ב:

* Pagination
* Image caching
* Lazy loading
* Realtime subscriptions רק היכן שנדרש
* Optimistic UI במקומות מתאימים
* Offline/cache בסיסי לתוכן שכבר נטען

⸻

86. חשוב במיוחד

אין להחזיר לי אפליקציה שהיא רק אוסף מסכי Mockup עם נתונים מזויפים.

אני רוצה שהארכיטקטורה תאפשר מוצר Production אמיתי.

אם שירות חיצוני עדיין לא נבחר, יש לבנות Interface/Service abstraction ולהשתמש זמנית ב־Mock Provider, כך שניתן יהיה לחבר API אמיתי לאחר מכן.

⸻

87. סדר עדיפויות

Core V1:

1. Authentication + onboarding
2. Multi-club architecture
3. Home
4. Matches + Match Center
5. Club
6. News + AI approval workflow
7. Fan-song Widget
8. Profile
9. Community
10. Match Chat
11. Admin
12. Staff permissions
13. Approval levels
14. Audit/Edit Log
15. Moderation + AI Gatekeeper
16. Push notifications

⸻

88. עיקרון המוצר

בכל החלטת UX יש לזכור:

45:45 היא לא אפליקציה שבה המשתמש עוקב אחרי עולם הכדורגל.

45:45 היא המקום שבו האוהד חי את הקבוצה שלו.

משתמש שבחר הפועל באר שבע צריך להרגיש שהוא נכנס לעולם של הפועל באר שבע.

משתמש שבחר מכבי חיפה צריך לקבל עולם של מכבי חיפה.

המערכת המשותפת נמצאת מאחורי הקלעים.

החוויה מקדימה היא:

הקבוצה שלי. המשחקים שלי. החדשות שלי. היציע שלי.

45:45

חיים את הקבוצה.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://club-centric-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9d1b1137-525e-48e6-9ff3-de2a65876918).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
