import { assertResults } from "@/lib/runtime-utils.mjs";
import { QueryFeedback } from "@/components/query-feedback";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { NextMatchCard, matchState, type Match } from "@/components/next-match-card";
import { useSession } from "@/lib/session";
import { publicProfiles } from "@/lib/data";
import { displayPlayerName } from "@/lib/app-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/match/$matchId")({ head: () => ({ meta: [{ title: "Match Center — 45:45" }] }), component: MatchCenter });

function MatchCenter() {
  const { matchId } = Route.useParams(); const { user } = useSession(); const qc = useQueryClient();
  const [home, setHome] = useState(""); const [away, setAway] = useState(""); const [chatText, setChatText] = useState("");
  const { data, isLoading: dataLoading, error: dataError, refetch: retryData } = useQuery({ queryKey: ["match", matchId, user?.id], refetchInterval: 15000, queryFn: async () => {
    const [m, events, pred, att, chat] = await Promise.all([
      supabase.from("matches").select("*").eq("id", matchId).maybeSingle(),
      supabase.from("match_events").select(`*,player:players!match_events_player_ref_id_fkey(id,name,name_he,image_url,goal_name,goal_api_id),secondary_player:players!match_events_secondary_player_ref_id_fkey(id,name,name_he,image_url,goal_name,goal_api_id)`).eq("match_id", matchId).order("minute"),
      user ? supabase.from("predictions").select("*").eq("match_id", matchId).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      user ? supabase.from("match_attendance").select("match_id").eq("match_id", matchId).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("chat_messages").select("*").eq("match_id", matchId).is("removed_at", null).order("created_at", { ascending: false }).limit(150),
    ]);
    assertResults(m, events, pred, att, chat);
    const profiles = await publicProfiles((chat.data ?? []).map((x) => x.author_id));
    return { match: m.data as Match | null, events: events.data ?? [], prediction: pred.data, attended: !!att.data, chat: [...(chat.data ?? [])].reverse(), profiles };
  }});

  if (dataLoading || dataError) return <AppShell title="Match Center"><QueryFeedback loading={dataLoading} error={dataError} retry={retryData} /></AppShell>;
  if (!data?.match) return <AppShell title="Match Center"><p className="panel p-4 text-muted-foreground">המשחק לא נמצא.</p></AppShell>;
  const { match, events, prediction, attended } = data; const state = matchState(match); const stats = normalizeStats(match.stats);
  const canPredict = (state === "upcoming" || state === "matchday") && Date.parse(match.kickoff) > Date.now();

  async function savePrediction() {
    if (!user || !canPredict || home === "" || away === "") return;
    const { error } = await supabase.from("predictions").upsert({ user_id: user.id, match_id: matchId, home_score: Number(home), away_score: Number(away) }, { onConflict: "match_id,user_id" });
    if (error) toast.error(error.message); else { toast.success("הניחוש נשמר"); qc.invalidateQueries({ queryKey: ["match", matchId] }); }
  }
  async function toggleAttend() {
    if (!user) return;
    const result = attended ? await supabase.from("match_attendance").delete().eq("match_id", matchId).eq("user_id", user.id) : await supabase.from("match_attendance").insert({ match_id: matchId, user_id: user.id });
    if (result.error) toast.error(result.error.message); else qc.invalidateQueries({ queryKey: ["match", matchId] });
  }
  async function sendChat() {
    if (!user || !chatText.trim()) return;
    const { error } = await supabase.from("chat_messages").insert({ match_id: matchId, club_id: null, author_id: user.id, body: chatText.trim() });
    if (error) toast.error(error.message); else { setChatText(""); qc.invalidateQueries({ queryKey: ["match", matchId] }); }
  }

  return <AppShell title="Match Center"><div className="space-y-4">
    <NextMatchCard match={match} />
    {canPredict && <section className="panel p-5"><h2 className="font-bold">ניחוש תוצאה</h2>{prediction && <p className="mt-1 text-xs text-muted-foreground">הניחוש שלך: {prediction.home_score}:{prediction.away_score}</p>}<div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3"><ScoreInput label={match.home_name || "בית"} value={home} onChange={setHome} /><span className="pb-3 text-muted-foreground">:</span><ScoreInput label={match.away_name || "חוץ"} value={away} onChange={setAway} /></div><Button variant="club" size="xl" className="mt-3" disabled={!user || home === "" || away === ""} onClick={savePrediction}>שמור ניחוש</Button></section>}
    <Button variant={attended ? "club" : "clubSoft"} size="xl" onClick={toggleAttend}>🏟️ {attended ? "הייתי שם ✓" : "הייתי שם"}</Button>

    {(state === "live" || state === "finished") && <Timeline events={events} match={match} />}

    {Object.keys(stats).length > 0 && <section className="panel space-y-3 p-5"><h2 className="font-bold">סטטיסטיקה</h2>{Object.entries(stats).map(([label,[h,a]]) => { const total=h+a||1; return <div key={label} className="text-sm"><div className="flex justify-between"><span>{h}</span><span className="text-muted-foreground">{label}</span><span>{a}</span></div><div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted"><span className="bg-club" style={{ width: `${(h/total)*100}%` }} /></div></div>; })}</section>}

    <section><div className="mb-2 flex items-center justify-between"><h2 className="font-bold">MATCH CHAT</h2><span className="text-[10px] text-muted-foreground">שני מחנות האוהדים</span></div><div className="panel max-h-[420px] overflow-y-auto p-3">{data.chat.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">עוד אין הודעות. תהיה הראשון.</p>}{data.chat.map((m) => { const p=data.profiles.get(m.author_id); return <div key={m.id} className="border-b border-border py-2 last:border-0"><div className="flex items-center gap-2"><span className="text-[11px] font-bold text-club">{p?.display_name || p?.username || "אוהד"}</span>{p?.favorite_club_id && <span className="size-2 rounded-full bg-club/60" />}</div><p className="text-sm">{m.body}</p></div>; })}</div><div className="mt-2 flex gap-2"><Input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="כתוב הודעה..." onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }} /><Button variant="club" onClick={sendChat}>שלח</Button></div></section>
  </div></AppShell>;
}

function ScoreInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label className="text-center text-xs text-muted-foreground"><span className="mb-1 block truncate">{label}</span><Input className="text-center text-2xl font-black" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 2))} /></label>; }

function Timeline({ events, match }: { events: any[]; match: Match }) {
  if (!events.length) return <section className="panel p-5 text-center text-sm text-muted-foreground">אין עדיין אירועים למשחק.</section>;
  const sorted=[...events].sort((a,b)=>Number(b.minute??0)-Number(a.minute??0));
  return <section className="panel overflow-hidden"><div className="grid grid-cols-[1fr_58px_1fr] items-center border-b border-border p-3 text-xs font-bold"><TeamHead name={match.home_name || "בית"} logo={match.home_logo_url} /><span /><TeamHead name={match.away_name || "חוץ"} logo={match.away_logo_url} reverse /></div><div>{sorted.map((e) => <EventRow key={e.id} event={e} />)}</div></section>;
}
function TeamHead({ name, logo, reverse=false }: { name:string; logo:string|null; reverse?:boolean }) { return <div className={`flex items-center gap-2 ${reverse?"justify-end":""}`}>{reverse && <span className="truncate">{name}</span>}{logo ? <img src={logo} alt="" className="size-7 object-contain" /> : <span className="size-7 rounded-full bg-muted" />}{!reverse && <span className="truncate">{name}</span>}</div>; }
function EventRow({ event }: { event:any }) {
  const home=String(event.team_side||"").toLowerCase()==="home"; const type=String(event.event_type||"").toLowerCase();
  const primary=displayPlayerName(event.player, event.player_name); const secondary=displayPlayerName(event.secondary_player, event.secondary_player_name);
  const content=<div className={`flex items-center gap-2 ${home?"justify-end text-right":""}`}>
    {!home && <EventIcon type={type} />}{event.player?.image_url && <img src={event.player.image_url} alt="" className="size-8 rounded-full object-cover" />}<div className="min-w-0"><p className="truncate text-xs font-bold">{primary}</p>{type==="goal" && event.secondary_player_name && <p className="truncate text-[10px] text-muted-foreground">בישול: {secondary}</p>}{type==="substitution" && <p className="text-[10px]"><span className="text-destructive">↓ {primary}</span>{event.secondary_player_name && <><br/><span className="text-green-500">↑ {secondary}</span></>}</p>}{event.score && type==="goal" && <p className="text-[10px] text-muted-foreground" dir="ltr">{event.score}</p>}</div>{home && <EventIcon type={type} />}
  </div>;
  return <div className="grid min-h-16 grid-cols-[1fr_58px_1fr] items-center border-b border-border/70 px-2 last:border-0"><div>{home?content:null}</div><div className="relative flex h-full items-center justify-center"><span className="absolute inset-y-0 w-px bg-border"/><span className="relative rounded-full border border-border bg-background px-2 py-1 text-xs font-bold" dir="ltr">{Number(event.minute??0)}׳</span></div><div>{!home?content:null}</div></div>;
}
function EventIcon({ type }: { type:string }) { if(type.includes("goal"))return <span>⚽</span>; if(type==="yellow_card")return <span>🟨</span>; if(type==="red_card")return <span>🟥</span>; if(type==="substitution")return <span>🔁</span>; return <span>•</span>; }
function normalizeStats(raw: unknown): Record<string,[number,number]> { if(!raw||typeof raw!=="object"||Array.isArray(raw)) return {}; const out:Record<string,[number,number]>={}; for(const [k,v] of Object.entries(raw as Record<string,unknown>)){ if(Array.isArray(v)&&v.length>=2) out[k]=[Number(v[0])||0,Number(v[1])||0]; } return out; }
