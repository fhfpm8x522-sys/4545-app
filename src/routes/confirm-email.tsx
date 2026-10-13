import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseEmailConfirmation } from '@/lib/email-confirmation.mjs';
import { appRedirectUrl } from '@/lib/runtime-utils.mjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/confirm-email')({
  head: () => ({ meta: [{ title: 'אימות אימייל — 45:45' }, { name: 'referrer', content: 'no-referrer' }] }),
  component: ConfirmEmail,
});

function ConfirmEmail() {
  const navigate = useNavigate();
  const [proof] = useState(() => typeof window === 'undefined' ? null : parseEmailConfirmation(window.location.search, window.location.hash));
  const [status, setStatus] = useState<'ready' | 'busy' | 'error' | 'sent'>(proof ? 'ready' : 'error');
  const [email, setEmail] = useState('');
  const recovery = proof?.type === 'recovery';

  async function verify() {
    if (!proof || status === 'busy') return;
    setStatus('busy');
    // Explicit click protects one-use links from email scanners/prefetching.
    window.history.replaceState(null, '', window.location.pathname);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: proof.token_hash, type: proof.type as 'email' | 'recovery' });
      if (error || !data.session) { setStatus('error'); return; }
      await navigate({ to: recovery ? '/reset-password' : '/onboarding', replace: true });
    } catch { setStatus('error'); }
  }

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    setStatus('busy');
    try {
      const redirect = appRedirectUrl(window.location.origin, import.meta.env.BASE_URL, 'confirm-email');
      const result = recovery
        ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect })
        : await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirect } });
      setStatus(result.error ? 'error' : 'sent');
    } catch { setStatus('error'); }
  }

  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10" dir="rtl">
    <div className="panel space-y-5 p-6 text-center">
      <div className="display-title text-6xl text-club" dir="ltr">45:45</div>
      <p className="text-muted-foreground">חיים את הקבוצה.</p>
      <h1 className="text-xl font-bold">{recovery ? 'איפוס הסיסמה שלך' : 'אימות כתובת האימייל'}</h1>
      {(status === 'ready' || (status === 'busy' && proof)) && <>
        <p className="text-sm text-muted-foreground">{recovery ? 'לחץ להמשך ובחר סיסמה חדשה.' : 'עוד לחיצה אחת והחשבון שלך מוכן לבחירת הקבוצה.'}</p>
        <Button variant="club" size="xl" disabled={status === 'busy'} onClick={verify}>{status === 'busy' ? 'מאמתים…' : recovery ? 'המשך לאיפוס סיסמה' : 'אימות וכניסה'}</Button>
      </>}
      {status === 'error' && <>
        <p role="alert" className="text-sm text-muted-foreground">הקישור חסר, פג תוקף או כבר נוצל. אפשר להתחבר אם האימות הושלם, או לבקש מייל חדש.</p>
        <form onSubmit={resend} className="space-y-3 text-start">
          <Label htmlFor="resend-email">האימייל שלך</Label>
          <Input id="resend-email" type="email" dir="ltr" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
          <Button type="submit" variant="club" size="xl">שליחת קישור חדש</Button>
        </form>
      </>}
      {status === 'busy' && !proof && <p>שולחים…</p>}
      {status === 'sent' && <p role="status">אם הכתובת מתאימה לחשבון, יישלח אליה קישור חדש. בדוק גם בתיקיית הספאם.</p>}
      <Link to="/auth" className="inline-block text-sm text-club underline">חזרה להתחברות</Link>
    </div>
  </main>;
}
