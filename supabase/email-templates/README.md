# 45:45 Auth emails

Prepared templates; not enabled on the current Supabase Free/default-mail project. Enable only after connecting verified custom SMTP or upgrading to a plan that allows template editing. No credentials belong in this repository.

Confirmation subject: `עוד רגע ואתה בפנים — אימות אימייל | 45:45`
Recovery subject: `חוזרים למשחק — איפוס סיסמה | 45:45`

Templates link to the deployed `/confirm-email` page with a TokenHash fragment. The page requires an explicit click before verifyOtp, supports email/recovery only and never follows an arbitrary redirect. Existing default emails use the configured HTTPS Site URL; the static SPA accepts fragment sessions across browsers. SSR keeps PKCE.
