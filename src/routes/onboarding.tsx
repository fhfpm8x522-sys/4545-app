import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession, type Club } from "@/lib/session";
import { clubAccentStyle, useClubAccent } from "@/lib/club-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "בניית הפרופיל — 45:45" }] }),
  component: Onboarding,
});

const CONTENT_TOPICS = [
  { key: "matches", label: "משחקים" },
  { key: "news", label: "חדשות" },
  { key: "transfers", label: "העברות" },
  { key: "injuries", label: "פציעות" },
  { key: "lineups", label: "הרכבים" },
  { key: "community", label: "היציע" },
];
const STEPS = ["profile", "birth", "club", "fan", "prefs", "notifications", "welcome"] as const;
type Step = (typeof STEPS)[number];

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useSession();
  const { data: profile } = useProfile(user?.id);
  const [step, setStep] = useState<Step>("profile");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [clubId, setClubId] = useState<string | null>(null);
  const [fanSince, setFanSince] = useState<number | null>(null);
  const [prefs, setPrefs] = useState<string[]>(["matches", "news"]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth", replace: true }); }, [loading, user, navigate]);
  useEffect(() => {
    if (!profile) return;
    if (profile.display_name && !displayName) setDisplayName(profile.display_name);
    if (profile.username && !username) setUsername(profile.username);
    if (profile.birth_date && !birthDate) setBirthDate(profile.birth_date);
    if (profile.favorite_club_id && !clubId) setClubId(profile.favorite_club_id);
    if (profile.fan_since_year && fanSince == null) setFanSince(profile.fan_since_year);
    if (Array.isArray(profile.content_prefs)) setPrefs(profile.content_prefs as string[]);
  }, [profile, displayName, username, birthDate, clubId, fanSince]);

  const { data: clubs } = useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clubs").select("*").eq("active", true).order("name_he");
      if (error) throw error;
      return (data ?? []) as Club[];
    },
  });

  const selectedClub = useMemo(() => clubs?.find((c) => c.id === clubId) ?? null, [clubs, clubId]);
  useClubAccent(selectedClub);

  const normalized = username.trim().replace(/^@/, "").toLowerCase();
  const usernameValid = /^[a-z0-9_.]{3,24}$/.test(normalized);
  const { data: available, isFetching: checking } = useQuery({
    queryKey: ["username-check", normalized, user?.id],
    enabled: usernameValid,
    queryFn: async () => {
      if (profile?.username?.toLowerCase() === normalized) return true;
      const { data, error } = await supabase.rpc("username_available", { candidate: normalized });
      if (error) throw error;
      return !!data;
    },
  });

  const filteredClubs = (clubs ?? []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim();
    return c.name_he.includes(q) || (c.city ?? "").includes(q);
  });

  async function finish(withNotifications: boolean) {
    if (!user || !clubId) return;
    if (busy || !usernameValid || !displayName.trim()) return;
    setBusy(true);
    const wasInitial = !profile?.favorite_club_id;
    const payload = {
      id: user.id,
      display_name: displayName.trim(),
      username: normalized,
      birth_date: birthDate || null,
      favorite_club_id: clubId,
      fan_since_year: fanSince,
      content_prefs: prefs,
      notification_prefs: {
        push_enabled: withNotifications,
        important_news: true,
        official_news: true,
        match_alerts: true,
        goals: true,
        lineups: true,
      },
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    if (error) {
      setBusy(false);
      toast.error(error.code === "23505" ? "שם המשתמש כבר תפוס — בחר כינוי אחר" : error.message);
      if (error.code === "23505") { setStep("profile"); await queryClient.invalidateQueries({ queryKey: ["username-check"] }); }
      return;
    }
    if (wasInitial) {
      await supabase.from("club_change_history").insert({ user_id: user.id, to_club_id: clubId, is_initial: true });
    }
    if (withNotifications && typeof Notification !== "undefined") {
      try { await Notification.requestPermission(); } catch { /* browser may not support prompt */ }
    }
    setBusy(false);
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    setStep("welcome");
  }

  const stepIndex = STEPS.indexOf(step);
  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 club-gradient opacity-50 blur-3xl" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <div className="mb-6 flex items-center gap-2">
          {STEPS.slice(0, 6).map((s, i) => <span key={s} className={cn("h-1 flex-1 rounded-full", i <= stepIndex ? "bg-club" : "bg-muted")} />)}
        </div>

        {step === "profile" && <div className="space-y-5">
          <Header title="איך נקרא לך?" sub="השם והכינוי שלך ביציע." />
          <div className="space-y-1.5"><Label>שם תצוגה</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="נהוראי" /></div>
          <div className="space-y-1.5">
            <Label>שם משתמש</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-muted-foreground">@</span>
              <Input dir="ltr" className="pr-8 text-right" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^A-Za-z0-9_.]/g, ""))} placeholder="nehorai45" />
              <span className="absolute inset-y-0 left-3 grid place-items-center">
                {checking && usernameValid && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                {!checking && usernameValid && available === true && <Check className="size-4 text-club" />}
                {!checking && usernameValid && available === false && <X className="size-4 text-destructive" />}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">3–24 תווים באנגלית, מספרים, נקודה או קו תחתון.</p>
          </div>
          <Button variant="club" size="xl" disabled={!displayName.trim() || !usernameValid || available !== true} onClick={() => setStep("birth")}>ממשיכים</Button>
        </div>}

        {step === "birth" && <div className="space-y-5"><Header title="מתי נולדת?" sub="המידע פרטי ולא מוצג בפרופיל הציבורי." /><Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /><Button variant="club" size="xl" disabled={!birthDate} onClick={() => setStep("club")}>ממשיכים</Button></div>}

        {step === "club" && <div className="flex flex-1 flex-col space-y-4">
          <Header title="איזו קבוצה אתה חי?" sub="הבחירה הזו מעצבת את כל האפליקציה." />
          <div className="relative"><Search className="absolute inset-y-0 right-3 my-auto size-4 text-muted-foreground" /><Input className="pr-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש קבוצה" /></div>
          <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto pb-4 hide-scrollbar">
            {filteredClubs.map((club) => <button key={club.id} onClick={() => setClubId(club.id)} style={clubAccentStyle(club)} className={cn("panel flex flex-col items-start gap-1 p-4 text-right", clubId === club.id ? "stadium-glow border-club/60" : "opacity-85")}>
              <div className="flex w-full items-center gap-2">{club.crest_url && <img src={club.crest_url} alt="" className="size-8 object-contain" />}<span className="h-1.5 w-8 rounded-full bg-club" /></div>
              <span className="mt-2 text-sm font-bold leading-tight">{club.name_he}</span><span className="text-xs text-muted-foreground">{club.city || club.league || "ישראל"}</span>
            </button>)}
          </div>
          <Button variant="club" size="xl" disabled={!clubId} onClick={() => setStep("fan")}>זו הקבוצה שלי</Button>
        </div>}

        {step === "fan" && <div className="space-y-5"><Header title="ממתי אתה אוהד?" sub="אפשר לדלג — תמיד אפשר להוסיף אחר כך." /><Input type="number" inputMode="numeric" min={1900} max={new Date().getFullYear()} value={fanSince ?? ""} onChange={(e) => setFanSince(e.target.value ? Number(e.target.value) : null)} placeholder="2010" /><Button variant="club" size="xl" onClick={() => setStep("prefs")}>ממשיכים</Button><button className="w-full text-sm text-muted-foreground" onClick={() => { setFanSince(null); setStep("prefs"); }}>לא זוכר / דלג</button></div>}

        {step === "prefs" && <div className="space-y-5"><Header title="מה מעניין אותך?" sub="נתאים את הבית שלך בהתאם." /><div className="flex flex-wrap gap-2">{CONTENT_TOPICS.map((topic) => { const on = prefs.includes(topic.key); return <button key={topic.key} onClick={() => setPrefs((p) => on ? p.filter((k) => k !== topic.key) : [...p, topic.key])} className={cn("rounded-full border px-4 py-2 text-sm font-medium", on ? "border-club bg-club/15 text-club" : "border-border text-muted-foreground")}>{topic.label}</button>; })}</div><Button variant="club" size="xl" onClick={() => setStep("notifications")}>ממשיכים</Button></div>}

        {step === "notifications" && <div className="space-y-5"><Header title="שלא תפספס כלום" sub="שערים, הרכבים, חדשות רשמיות והעברות — רק על הקבוצה שלך." /><ul className="panel space-y-3 p-5 text-sm"><li>⚽ שערים ותוצאות בזמן אמת</li><li>📰 חדשות רשמיות והעברות</li><li>🏟️ תזכורת לפני משחק</li></ul><Button variant="club" size="xl" disabled={busy} onClick={() => finish(true)}>הפעל התראות</Button><button className="w-full text-sm text-muted-foreground" disabled={busy} onClick={() => finish(false)}>אחר כך</button></div>}

        {step === "welcome" && <div className="flex flex-1 flex-col justify-center gap-4 text-center"><p className="display-title text-5xl text-club">ברוך הבא ליציע{displayName ? `, ${displayName}` : ""}.</p><p className="text-2xl font-bold">{selectedClub?.name_he}</p><p className="text-muted-foreground">חדשות. משחקים. הקבוצה. הקהל.</p><p className="text-lg font-semibold text-club">חיים את הקבוצה.</p><Button variant="club" size="xl" onClick={() => navigate({ to: "/" })}>יאללה, נכנסים</Button></div>}
      </div>
    </div>
  );
}

function Header({ title, sub }: { title: string; sub: string }) { return <div className="space-y-1"><h1 className="text-2xl font-black">{title}</h1><p className="text-sm text-muted-foreground">{sub}</p></div>; }
