# 45:45 Auth emails

Confirmation and recovery templates are configured in the production Supabase project. Custom SMTP is connected to Brevo; delivery must be verified after any SMTP credential change. Never commit credentials.

Confirmation subject: עוד רגע ואתה בפנים — אימות אימייל | 45:45
Recovery subject: חוזרים למשחק — איפוס סיסמה | 45:45

Templates link to the deployed /confirm-email page with a TokenHash fragment. The page requires an explicit click before verifyOtp, supports email/recovery only and never follows arbitrary redirects. Static Pages supports email links opened in another browser. SSR retains PKCE.

Public logo: /email-logo.png; image alt text also displays the 45:45 brand when images are blocked.
