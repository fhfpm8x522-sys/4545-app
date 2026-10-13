import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useProfile, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/news")({ head: () => ({ meta: [{ title: "חדשות — 45:45" }] }), component: NewsPage });
export const NEWS_CATEGORIES = [
  { key: "all", label: "הכל" }, { key: "official", label: "רשמי" }, { key: "transfers", label: "העברות" }, { key: "injuries", label: "פציעות" }, { key: "lineups", label: "הרכבים" }, { key: "interviews", label: "ראיונות" },
];

function NewsPage() {
  const { user } = useSession(); const { data: profile } = useProfile(user?.id); const clubId = profile?.favorite_club_id; const [cat, setCat] = useState("all");
  const { data: items } = useQuery({ queryKey: ["news", clubId], enabled: !!clubId, queryFn: async () => {
    const { data, error } = await supabase.from("news_items").select("*").eq("club_id", clubId!).eq("status", "published").order("published_at", { ascending: false }).limit(50); if (error) throw error; return data ?? [];
  }});
  const list = (items ?? []).filter((n) => cat === "all" || (cat === "official" ? n.official : n.category === cat)); const [lead, ...rest] = list;
  return <AppShell title="חדשות">
    <div className="mb-4 flex gap-2 overflow-x-auto hide-scrollbar">{NEWS_CATEGORIES.map((c) => <button key={c.key} onClick={() => setCat(c.key)} className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm", cat === c.key ? "border-club bg-club/15 text-club" : "border-border text-muted-foreground")}>{c.label}</button>)}</div>
    {!lead && <p className="panel p-4 text-sm text-muted-foreground">אין עדיין ידיעות בקטגוריה הזו.</p>}
    {lead && <Link to="/article/$newsId" params={{ newsId: lead.id }} className="panel mb-4 block overflow-hidden">{lead.image_url && <img src={lead.image_url} alt="" className="aspect-video w-full object-cover" />}<div className="p-5">{lead.official && <span className="text-[11px] font-bold text-club">הודעה רשמית</span>}<h2 className="mt-1 text-xl font-black leading-snug">{lead.title}</h2>{lead.summary && <p className="mt-2 text-sm text-muted-foreground">{lead.summary}</p>}</div></Link>}
    <div className="space-y-2">{rest.map((n) => <Link key={n.id} to="/article/$newsId" params={{ newsId: n.id }} className="panel flex gap-3 p-3"><div className="size-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">{n.image_url && <img src={n.image_url} alt="" loading="lazy" className="size-full object-cover" />}</div><div className="min-w-0">{n.official && <span className="text-[10px] font-bold text-club">הודעה רשמית</span>}<p className="line-clamp-2 text-sm font-semibold">{n.title}</p><p className="mt-1 text-[11px] text-muted-foreground">{n.source_name || "45:45"}</p></div></Link>)}</div>
  </AppShell>;
}
