import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useStaffMemberships } from "@/lib/session";
import { AdminContext } from "@/lib/admin";

export const Route = createFileRoute("/admin")({ head: () => ({ meta: [{ title: "ניהול — 45:45" }, { name:"robots",content:"noindex" }] }), component: AdminLayout });
const NAV = [
  { to:"/admin",label:"דשבורד",perm:null }, { to:"/admin/news",label:"חדשות ותור AI",perm:"news.review" }, { to:"/admin/songs",label:"שירים ווידג׳ט",perm:"chants.manage" }, { to:"/admin/clubs",label:"מועדונים",perm:"clubs.manage" }, { to:"/admin/staff",label:"צוות והרשאות",perm:"users.view" },
] as const;

function AdminLayout() {
  const navigate=useNavigate(); const { user,loading }=useSession(); const { data:memberships,isLoading }=useStaffMemberships(user?.id); const [clubId,setClubId]=useState<string|null>(null);
  const { data:rolePerms }=useQuery({ queryKey:["role-perms"], enabled:!!memberships?.length, queryFn:async()=> (await supabase.from("role_permissions").select("role_id,permission:permissions(key)")).data ?? [] });
  const { data:clubs }=useQuery({ queryKey:["admin-clubs"], enabled:!!memberships?.length, queryFn:async()=> (await supabase.from("clubs").select("id,name_he,active").order("name_he")).data ?? [] });
  useEffect(()=>{ if(loading||isLoading)return; if(!user||!memberships?.length)navigate({to:"/",replace:true}); },[loading,isLoading,user,memberships,navigate]);
  const ms=memberships??[]; const isOwner=ms.some((m)=>m.role?.key==="owner"||m.role?.key==="super_admin");
  const scopedClubs=useMemo(()=>{ if(isOwner)return clubs??[]; const ids=new Set(ms.flatMap((m)=>m.scopes?.map((s)=>s.club_id)??[])); return (clubs??[]).filter((c)=>ids.has(c.id)); },[clubs,ms,isOwner]);
  useEffect(()=>{ if(!clubId&&scopedClubs[0])setClubId(scopedClubs[0].id); },[clubId,scopedClubs]);
  const permissions=useMemo(()=>{ const set=new Set<string>(); for(const m of ms){ for(const rp of rolePerms??[]) if(rp.role_id===m.role_id&&rp.permission?.key)set.add(rp.permission.key); } return set; },[ms,rolePerms]);
  if(!user||!memberships?.length)return null; const can=(p:string)=>isOwner||permissions.has(p);
  return <AdminContext.Provider value={{userId:user.id,clubId,setClubId,memberships:ms,permissions,can}}><div className="min-h-screen bg-background"><header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur"><div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3"><Link to="/" className="display-title text-2xl text-club">45:45</Link><span className="text-xs text-muted-foreground">ADMIN</span><select className="mr-auto rounded-full border border-border bg-surface px-4 py-1.5 text-sm" value={clubId??""} onChange={(e)=>setClubId(e.target.value)}>{scopedClubs.map((c)=><option key={c.id} value={c.id}>{c.name_he}</option>)}</select></div><nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 hide-scrollbar">{NAV.filter((n)=>!n.perm||can(n.perm)).map((n)=><Link key={n.to} to={n.to} activeOptions={{exact:n.to==="/admin"}} className="shrink-0 rounded-full px-3 py-1.5 text-sm text-muted-foreground" activeProps={{className:"bg-club/15 text-club"}}>{n.label}</Link>)}</nav></header><main className="mx-auto max-w-6xl px-4 py-6">{clubId?<Outlet/>:<p className="text-muted-foreground">טוען…</p>}</main></div></AdminContext.Provider>;
}
