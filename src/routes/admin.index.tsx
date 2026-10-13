import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/lib/admin";

export const Route = createFileRoute("/admin/")({ component: Dashboard });
function Dashboard(){ const {clubId,can}=useAdmin(); const {data}=useQuery({queryKey:["admin-dash",clubId],queryFn:async()=>{
  const [pending,published,chants,users,log]=await Promise.all([
    supabase.from("news_items").select("id",{count:"exact",head:true}).eq("club_id",clubId!).eq("status","pending"),
    supabase.from("news_items").select("id",{count:"exact",head:true}).eq("club_id",clubId!).eq("status","published"),
    supabase.from("chants").select("id",{count:"exact",head:true}).eq("club_id",clubId!).eq("enabled",true),
    can("users.view")?supabase.rpc("admin_users"):Promise.resolve({data:[]}),
    can("audit.view")?supabase.from("audit_log").select("*").eq("club_id",clubId!).order("created_at",{ascending:false}).limit(15):Promise.resolve({data:[]}),
  ]);
  const fans=Array.isArray(users.data)?users.data.filter((u:any)=>u.favorite_club_id===clubId).length:0;
  return {pending:pending.count??0,published:published.count??0,chants:chants.count??0,fans,log:log.data??[]};
 }});
 return <div className="space-y-6"><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["ממתין לאישור",data?.pending],["ידיעות שפורסמו",data?.published],["שורות שירים",data?.chants],["אוהדים",data?.fans]].map(([l,v])=><div key={String(l)} className="panel p-4"><div className="display-title text-3xl text-club">{v??0}</div><div className="text-xs text-muted-foreground">{l}</div></div>)}</div>{can("audit.view")&&<section className="panel p-4"><h2 className="mb-3 font-bold">יומן פעולות</h2>{data?.log.length?<ul className="divide-y divide-border text-sm">{data.log.map((l:any)=><li key={l.id} className="flex justify-between gap-3 py-2"><span>{l.action} · {l.entity_type}</span><span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("he-IL")}</span></li>)}</ul>:<p className="text-sm text-muted-foreground">אין פעולות עדיין.</p>}</section>}</div>;
}
