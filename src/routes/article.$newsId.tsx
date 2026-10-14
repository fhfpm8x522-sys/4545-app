import {NewsKind} from '@/components/news-kind';
import {SavedItemButton} from '@/components/player-tools';
import {useSession} from '@/lib/session';
import { QueryFeedback } from "@/components/query-feedback";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/article/$newsId")({ head: () => ({ meta: [{ title: "ידיעה — 45:45" }] }), component: Article });
type Source = { name?: string; url?: string };
function Article() {
  const { newsId } = Route.useParams(); const {user}=useSession();
  const { data: n, error, isLoading, refetch } = useQuery({ queryKey: ["article", newsId], queryFn: async () => { const r=await supabase.from("news_items").select("*").eq("id", newsId).eq("status", "published").maybeSingle(); if(r.error) throw r.error; return r.data; } });
  if (isLoading || error) return <AppShell title="חדשות"><QueryFeedback loading={isLoading} error={error} retry={refetch} /></AppShell>;
  const sources = Array.isArray(n?.sources) ? (n.sources as Source[]) : [];
  return <AppShell title="חדשות">{!n ? <p className="text-muted-foreground">הידיעה לא נמצאה או טרם פורסמה.</p> : <article className="space-y-4">
    {n.image_url && <img src={n.image_url} alt="" className="aspect-video w-full rounded-2xl object-cover" />}
    <div className="flex flex-wrap items-center gap-2"><NewsKind item={n}/><SavedItemButton kind="article" id={newsId} userId={user?.id} label="שמירת כתבה"/></div>
    <h1 className="text-2xl font-black leading-tight">{n.title}</h1>
    <p className="text-xs text-muted-foreground">{n.source_name || "45:45"}{n.published_at && ` · ${new Date(n.published_at).toLocaleString("he-IL")}`}</p>
    {n.summary && <p className="text-lg font-medium">{n.summary}</p>}{n.body && <div className="whitespace-pre-line leading-relaxed text-foreground/90">{n.body}</div>}
    {(n.source_url || sources.length > 0) && <div className="panel p-4 text-sm"><p className="mb-2 font-bold">מקורות</p><ul className="space-y-1">{n.source_url && <li><a className="text-club underline" href={n.source_url} target="_blank" rel="noreferrer">{n.source_name || n.source_url}</a></li>}{sources.map((s, i) => s.url ? <li key={i}><a className="text-club underline" href={s.url} target="_blank" rel="noreferrer">{s.name || s.url}</a></li> : null)}</ul></div>}
  </article>}</AppShell>;
}
