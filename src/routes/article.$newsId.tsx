import { NewsKind } from '@/components/news-kind';
import { SavedItemButton } from '@/components/player-tools';
import { NewsContent, NewsImage, NewsSourceMeta } from '@/components/news-content';
import { meaningfulNewsText, newsPresentation, safeNewsUrl } from '@/lib/news-display.mjs';
import { useSession } from '@/lib/session';
import { QueryFeedback } from '@/components/query-feedback';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/app-shell';

export const Route = createFileRoute('/article/$newsId')({ head: () => ({ meta: [{ title: 'ידיעה — 45:45' }] }), component: Article });
type Source = { name?: string; url?: string };

function Article() {
  const { newsId } = Route.useParams();
  const { user } = useSession();
  const { data: n, error, isLoading, refetch } = useQuery({
    queryKey: ['article', newsId],
    queryFn: async () => {
      const r = await supabase.from('news_items').select('*').eq('id', newsId).eq('status', 'published').maybeSingle();
      if (r.error) throw r.error;
      return r.data;
    },
  });
  if (isLoading || error) return <AppShell title="חדשות"><QueryFeedback loading={isLoading} error={error} retry={refetch} /></AppShell>;
  const sourceUrl = newsPresentation(n ?? {}).sourceUrl;
  const sources = (Array.isArray(n?.sources) ? n.sources as Source[] : []).flatMap(s => {
    const url = safeNewsUrl(s?.url);
    return url && url !== sourceUrl ? [{ name: meaningfulNewsText(s.name) || new URL(url).hostname, url }] : [];
  });
  return <AppShell title="חדשות">{!n ? <p className="text-muted-foreground">הידיעה לא נמצאה או טרם פורסמה.</p> : <article className="space-y-5 pb-4">
    <NewsImage item={n} className="rounded-2xl border border-border" />
    <div className="flex flex-wrap items-center gap-2"><NewsKind item={n} /><SavedItemButton kind="article" id={newsId} userId={user?.id} label="שמירת כתבה" /></div>
    <h1 className="break-words text-2xl font-black leading-tight sm:text-3xl">{meaningfulNewsText(n.title)}</h1>
    <NewsSourceMeta item={n} />
    <NewsContent item={n} />
    {sources.length > 0 && <aside className="panel p-4 text-sm"><h2 className="mb-2 font-bold">מקורות נוספים</h2><ul className="space-y-2">{sources.map((s, i) => <li key={i}><a className="break-words text-club underline underline-offset-4" href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a></li>)}</ul></aside>}
  </article>}</AppShell>;
}
