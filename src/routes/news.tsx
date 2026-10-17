import { createFileRoute, Link } from '@tanstack/react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/app-shell';
import { QueryFeedback } from '@/components/query-feedback';
import { NewsKind } from '@/components/news-kind';
import { NewsImage, NewsImageCredit, NewsSourceMeta } from '@/components/news-content';
import { meaningfulNewsText, newsPresentation } from '@/lib/news-display.mjs';
import { useProfile, useSession } from '@/lib/session';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
export const Route = createFileRoute('/news')({ head: () => ({ meta: [{ title: 'חדשות — 45:45' }] }), component: NewsPage });
export const NEWS_CATEGORIES = [{ key: 'all', label: 'הכל' }, { key: 'official', label: 'רשמי' }, { key: 'transfers', label: 'העברות' }, { key: 'injuries', label: 'פציעות' }, { key: 'lineups', label: 'הרכבים' }, { key: 'interviews', label: 'ראיונות' }];
function NewsPage() {
  const { user } = useSession(), { data: profile } = useProfile(user?.id), clubId = profile?.favorite_club_id;
  const [cat, setCat] = useState('all'), [search, setSearch] = useState(''), [term, setTerm] = useState(''), [savedOnly, setSavedOnly] = useState(false);
  const news = useInfiniteQuery({ queryKey: ['news-search', clubId, term], enabled: !!clubId && !savedOnly, initialPageParam: 0, queryFn: async ({ pageParam }) => {
    const r = await supabase.rpc('search_club_news', { p_club_id: clubId, p_term: term, p_offset: pageParam, p_limit: 50 }); if (r.error) throw r.error; return r.data ?? [];
  }, getNextPageParam: (last, pages) => last.length === 50 ? pages.length * 50 : undefined });
  const saved = useQuery({ queryKey: ['saved-items', user?.id, 'article'], enabled: !!user && savedOnly, queryFn: async () => {
    const ids = await supabase.from('fan_saved_items').select('entity_id').eq('user_id', user!.id).eq('kind', 'article'); if (ids.error) throw ids.error; if (!ids.data?.length) return [];
    const r = await supabase.from('news_items').select('*').in('id', ids.data.map(row => row.entity_id)).eq('status', 'published').order('published_at', { ascending: false }); if (r.error) throw r.error; return r.data ?? [];
  } });
  const current = savedOnly ? saved : news, items = savedOnly ? saved.data ?? [] : news.data?.pages.flat() ?? [];
  const list = items.filter((n: any) => (cat === 'all' || (cat === 'official' ? n.official : n.category === cat)) && (!savedOnly || !term.trim() || `${n.title} ${n.summary ?? ''} ${n.body ?? ''}`.toLowerCase().includes(term.toLowerCase())));
  const [lead, ...rest] = list;
  return <AppShell title="חדשות"><form className="mb-3 flex gap-2" onSubmit={e => { e.preventDefault(); setTerm(search.trim()); }}><Input aria-label="חיפוש בכתבות" value={search} maxLength={200} onChange={e => setSearch(e.target.value)} placeholder="חיפוש בכותרת ובתוכן…" /><Button type="submit" variant="clubSoft">חפש</Button><Button type="button" variant={savedOnly ? 'club' : 'ghost'} onClick={() => setSavedOnly(!savedOnly)}>{savedOnly ? 'כל הכתבות' : '★ שמורות'}</Button></form>
    <div className="mb-4 flex gap-2 overflow-x-auto hide-scrollbar">{NEWS_CATEGORIES.map(c => <button key={c.key} onClick={() => setCat(c.key)} className={cn('shrink-0 rounded-full border px-4 py-1.5 text-sm', cat === c.key ? 'border-club bg-club/15 text-club' : 'border-border text-muted-foreground')}>{c.label}</button>)}</div>
    <QueryFeedback loading={current.isLoading} error={current.error} retry={current.refetch} />
    {!current.isLoading && !current.error && !lead && <p className="panel p-4 text-sm text-muted-foreground">{savedOnly ? 'אין כתבות שמורות שמתאימות לחיפוש.' : 'אין ידיעות שפורסמו שמתאימות לחיפוש.'}</p>}
    {lead && <article className="panel mb-4 overflow-hidden"><NewsImage item={lead} /><Link to="/article/$newsId" params={{ newsId: lead.id }} className="block p-5"><NewsKind item={lead} /><h2 className="mt-2 text-xl font-black leading-snug">{meaningfulNewsText(lead.title)}</h2>{newsPresentation(lead).summary && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{newsPresentation(lead).summary}</p>}<div className="mt-3"><NewsSourceMeta item={lead} compact /></div><span className="mt-3 inline-block text-xs font-bold text-club">לפתיחת הידיעה ←</span></Link></article>}
    <div className="space-y-3">{rest.map((n: any) => <article key={n.id} className="panel overflow-hidden"><div className="flex gap-3 p-3"><NewsImage item={n} compact className="size-24 shrink-0 rounded-xl" /><Link to="/article/$newsId" params={{ newsId: n.id }} className="min-w-0 flex-1"><NewsKind item={n} /><h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-relaxed">{meaningfulNewsText(n.title)}</h3>{newsPresentation(n).summary && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{newsPresentation(n).summary}</p>}<div className="mt-2"><NewsSourceMeta item={n} compact /></div></Link></div><NewsImageCredit item={n} /></article>)}</div>
    {!savedOnly && news.hasNextPage && <Button className="mt-4" variant="clubSoft" disabled={news.isFetchingNextPage} onClick={() => news.fetchNextPage()}>{news.isFetchingNextPage ? 'טוען…' : 'טען כתבות נוספות'}</Button>}
  </AppShell>;
}
