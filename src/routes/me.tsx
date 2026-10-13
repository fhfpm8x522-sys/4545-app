import { oneRelation, assertResults } from "@/lib/runtime-utils.mjs";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { daysUntilClubChange, useProfile, useSession, type Club } from "@/lib/session";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/me")({ head: () => ({ meta: [{ title: "אני — 45:45" }] }), component: MePage });

function MePage() {
  const navigate = useNavigate(); const qc = useQueryClient(); const { user } = useSession(); const { data: profile } = useProfile(user?.id); const [picking, setPicking] = useState(false);
  const { data: stats } = useQuery({ queryKey: ["me-stats", user?.id], enabled: !!user, queryFn: async () => {
    const [preds, att] = await Promise.all([
      supabase.from("predictions").select("home_score,away_score,match:matches(status,home_score,away_score)").eq("user_id", user!.id),
      supabase.from("match_attendance").select("match_id", { count: "exact", head: true }).eq("user_id", user!.id),
    ]);
    assertResults(preds, att);
    const list = (preds.data ?? []).map(p => ({...p, match: oneRelation(p.match)})); const settled = list.filter((p) => p.match?.status === "finished");
    const exact = settled.filter((p) => p.home_score === p.match!.home_score && p.away_score === p.match!.away_score).length;
    const dir = settled.filter((p) => Math.sign(p.home_score - p.away_score) === Math.sign((p.match!.home_score ?? 0) - (p.match!.away_score ?? 0))).length;
    return { total: list.length, exact, dir, accuracy: settled.length ? Math.round((dir / settled.length) * 100) : 0, attended: att.count ?? 0 };
  }});
  const { data: clubs } = useQuery({ queryKey: ["clubs"], enabled: picking, queryFn: async () => ((await supabase.from("clubs").select("*").eq("active", true).order("name_he")).data ?? []) as Club[] });
  const daysLeft = daysUntilClubChange(profile); const prefs = useMemo(() => (profile?.notification_prefs && typeof profile.notification_prefs === "object" ? profile.notification_prefs as Record<string, boolean> : {}), [profile?.notification_prefs]);

  async function changeClub(clubId: string) {
    if (!user || !profile || clubId === profile.favorite_club_id) return;
    const { error } = await supabase.rpc("change_favorite_club", { new_club_id: clubId });
    if (error) { toast.error(error.message.includes("COOLDOWN") ? "אפשר להחליף קבוצה פעם ב־30 יום" : error.message); return; }
    toast.success("הקבוצה עודכנה"); setPicking(false); qc.invalidateQueries();
  }
  async function setNotification(key: string, value: boolean) {
    if (!user) return; const next = { ...prefs, [key]: value };
    const { error } = await supabase.from("profiles").update({ notification_prefs: next, updated_at: new Date().toISOString() }).eq("id", user.id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["profile", user.id] });
  }
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); }
  if (!profile) return <AppShell />;

  return <AppShell title="אני">
    <section className="panel club-gradient stadium-glow p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="display-title text-lg text-club">45:45 · FAN CARD</p><h1 className="mt-3 text-3xl font-black">{profile.display_name}</h1><p className="text-sm text-muted-foreground" dir="ltr">@{profile.username}</p></div>{profile.club?.crest_url && <img src={profile.club.crest_url} alt="" className="size-16 object-contain" />}</div>
      <p className="mt-3 text-lg font-bold">{profile.club?.name_he}</p>{profile.fan_since_year && <p className="text-sm text-muted-foreground">אוהד מאז {profile.fan_since_year}</p>}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center"><Stat label="ניחושים מדויקים" value={stats?.exact ?? 0} /><Stat label="משחקים" value={stats?.attended ?? 0} /><Stat label="דיוק" value={`${stats?.accuracy ?? 0}%`} /></div>
    </section>

    <section className="panel mt-4 divide-y divide-border p-2 text-sm"><Row label="סה״כ ניחושים" value={stats?.total ?? 0} /><Row label="ניחושים מדויקים" value={stats?.exact ?? 0} /><Row label="כיוון נכון" value={stats?.dir ?? 0} /></section>

    <section className="panel mt-4 p-5"><h2 className="font-bold">הקבוצה שלי</h2><p className="mt-1 text-sm text-muted-foreground">קבוצה נוכחית: {profile.club?.name_he}</p>{daysLeft > 0 ? <p className="mt-2 text-sm">ניתן לשנות שוב בעוד {daysLeft} ימים.</p> : <Button variant="clubSoft" className="mt-3" onClick={() => setPicking((p) => !p)}>החלפת קבוצה</Button>}
      {picking && <div className="mt-3 grid grid-cols-2 gap-2">{clubs?.map((c) => <button key={c.id} onClick={() => changeClub(c.id)} className="rounded-xl border border-border p-3 text-right text-sm">{c.name_he}</button>)}<p className="col-span-2 text-xs text-muted-foreground">לאחר ההחלפה תוכל להחליף שוב רק בעוד 30 יום.</p></div>}
    </section>

    <section className="panel mt-4 p-5"><h2 className="mb-3 font-bold">התראות</h2><Toggle label="התראות Push" checked={prefs["push_enabled"] ?? false} onChange={(v) => setNotification("push_enabled", v)} /><Toggle label="חדשות חשובות" checked={prefs["important_news"] ?? true} onChange={(v) => setNotification("important_news", v)} /><Toggle label="הודעות רשמיות" checked={prefs["official_news"] ?? true} onChange={(v) => setNotification("official_news", v)} /><Toggle label="התראות משחק" checked={prefs["match_alerts"] ?? true} onChange={(v) => setNotification("match_alerts", v)} /><Toggle label="שערים" checked={prefs["goals"] ?? true} onChange={(v) => setNotification("goals", v)} /><Toggle label="הרכבים" checked={prefs["lineups"] ?? true} onChange={(v) => setNotification("lineups", v)} /></section>
    <Button variant="ghost" size="xl" className="mt-4 text-destructive" onClick={signOut}>התנתקות</Button>
  </AppShell>;
}
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-background/40 p-2"><div className="display-title text-2xl">{value}</div><div className="text-[10px] text-muted-foreground">{label}</div></div>; }
function Row({ label, value }: { label: string; value: string | number }) { return <div className="flex justify-between p-3"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center justify-between border-t border-border py-3 first:border-0"><span className="text-sm">{label}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-[var(--club)]" /></label>; }
