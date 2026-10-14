import { createFileRoute, Link } from '@tanstack/react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/app-shell';
import { QueryFeedback } from '@/components/query-feedback';
import { NewsKind } from '@/components/news-kind';
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
    {lead && <Link to="/article/$newsId" params={{ newsId: lead.id }} className="panel mb-4 block overflow-hidden">{lead.image_url && <img src={lead.image_url} alt="" className="aspect-video w-full object-cover" />}<div className="p-5"><NewsKind item={lead} /><h2 className="mt-1 text-xl font-black leading-snug">{lead.title}</h2>{lead.summary && <p className="mt-2 text-sm text-muted-foreground">{lead.summary}</p>}</div></Link>}
    <div className="space-y-2">{rest.map((n: any) => <Link key={n.id} to="/article/$newsId" params={{ newsId: n.id }} className="panel flex gap-3 p-3"><div className="size-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">{n.image_url && <img src={n.image_url} alt="" loading="lazy" className="size-full object-cover" />}</div><div className="min-w-0"><NewsKind item={n} /><p className="mt-1 line-clamp-2 text-sm font-semibold">{n.title}</p><p className="mt-1 text-[11px] text-muted-foreground">{n.source_name || '45:45'}</p></div></Link>)}</div>
    {!savedOnly && news.hasNextPage && <Button className="mt-4" variant="clubSoft" disabled={news.isFetchingNextPage} onClick={() => news.fetchNextPage()}>{news.isFetchingNextPage ? 'טוען…' : 'טען כתבות נוספות'}</Button>}
  </AppShell>;
}
