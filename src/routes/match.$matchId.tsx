import {MatchTimeline} from '@/components/match-timeline';
import {MatchHistory} from '@/components/match-history';
import {MatchWinnerPoll} from "@/components/match-winner-poll";
import {FanGuesses} from "@/components/fan-guesses";
import {PersonalMatchTools} from "@/components/personal-match-tools";
import {MatchLivePanels} from "@/components/match-live-panels";
import {useFootballData} from "@/lib/football-query";
import { assertResults } from "@/lib/runtime-utils.mjs";
import { QueryFeedback } from "@/components/query-feedback";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { NextMatchCard, matchState, type Match } from "@/components/next-match-card";
import { useSession, useProfile } from "@/lib/session";
import { publicProfiles } from "@/lib/data";
import { displayPlayerName } from "@/lib/app-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/match/$matchId")({ head: () => ({ meta: [{ title: "Match Center — 45:45" }] }), component: MatchCenter });

function MatchCenter() {
  const { matchId } = Route.useParams(); const { user } = useSession(); const qc = useQueryClient();
  const {data:profile}=useProfile(user?.id);
  const [attendanceBusy,setAttendanceBusy]=useState(false);
  const liveDetails=useFootballData("match",matchId,true);
  const [chatText, setChatText] = useState("");
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

  async function toggleAttend() {
    if (!user || attendanceBusy) return;
    setAttendanceBusy(true);
    const supported = profile?.favorite_club_id && [match.home_club_id,match.away_club_id].includes(profile.favorite_club_id) ? profile.favorite_club_id : null;
    const result = attended ? await supabase.from("match_attendance").delete().eq("match_id", matchId).eq("user_id", user.id) : await supabase.from("match_attendance").insert({ match_id: matchId, user_id: user.id, supported_club_id:supported });
    if (result.error) toast.error(result.error.message); else { toast.success(attended ? "הסימון בוטל" : "סימנת שהיית במשחק"); qc.invalidateQueries({ queryKey: ["match", matchId] }); }
    setAttendanceBusy(false);
  }
  async function sendChat() {
    if (!user || !chatText.trim()) return;
    const { error } = await supabase.from("chat_messages").insert({ match_id: matchId, club_id: null, author_id: user.id, body: chatText.trim() });
    if (error) toast.error(error.message); else { setChatText(""); qc.invalidateQueries({ queryKey: ["match", matchId] }); }
  }

  return <AppShell title="Match Center"><div className="space-y-4">
    <NextMatchCard match={match} />
    <MatchHistory match={match} />
    <PersonalMatchTools match={match} userId={user?.id} profile={profile} />
    <MatchWinnerPoll matchId={matchId} userId={user?.id} homeName={match.home_name||"בית"} awayName={match.away_name||"חוץ"} open={canPredict} />
    <FanGuesses match={match} userId={user?.id} favoriteClubId={profile?.favorite_club_id} />
    {prediction && <p className="text-xs text-muted-foreground">ניחוש התוצאה השמור שלך: {match.home_name} {prediction.home_score} · {match.away_name} {prediction.away_score}</p>}
    <Button disabled={attendanceBusy||!user} variant={attended ? "club" : "clubSoft"} size="xl" onClick={toggleAttend}>🏟️ {attendanceBusy ? "שומר…" : attended ? "הייתי שם ✓ — לחץ לביטול" : "הייתי שם"}</Button>

    {liveDetails.isFetching && <p className="text-xs text-muted-foreground">מעדכן נתוני משחק…</p>}
    <MatchLivePanels data={liveDetails.data} homeName={match.home_name||"בית"} awayName={match.away_name||"חוץ"} />
    {(state === "live" || state === "finished") && <MatchTimeline events={events} match={match} />}

    {Object.keys(stats).length > 0 && <section className="panel space-y-3 p-5"><h2 className="font-bold">סטטיסטיקה</h2>{Object.entries(stats).map(([label,[h,a]]) => { const total=h+a||1; return <div key={label} className="text-sm"><div className="flex justify-between"><span>{h}</span><span className="text-muted-foreground">{label}</span><span>{a}</span></div><div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted"><span className="bg-club" style={{ width: `${(h/total)*100}%` }} /></div></div>; })}</section>}

    <section><div className="mb-2 flex items-center justify-between"><h2 className="font-bold">MATCH CHAT</h2><span className="text-[10px] text-muted-foreground">שני מחנות האוהדים</span></div><div className="panel max-h-[420px] overflow-y-auto p-3">{data.chat.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">עוד אין הודעות. תהיה הראשון.</p>}{data.chat.map((m) => { const p=data.profiles.get(m.author_id); return <div key={m.id} className="border-b border-border py-2 last:border-0"><div className="flex items-center gap-2"><span className="text-[11px] font-bold text-club">{p?.display_name || p?.username || "אוהד"}</span>{p?.favorite_club_id && <span className="size-2 rounded-full bg-club/60" />}</div><p className="text-sm">{m.body}</p></div>; })}</div><div className="mt-2 flex gap-2"><Input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="כתוב הודעה..." onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }} /><Button variant="club" onClick={sendChat}>שלח</Button></div></section>
  </div></AppShell>;
}

function normalizeStats(raw: unknown): Record<string,[number,number]> { if(!raw||typeof raw!=="object"||Array.isArray(raw)) return {}; const out:Record<string,[number,number]>={}; for(const [k,v] of Object.entries(raw as Record<string,unknown>)){ if(Array.isArray(v)&&v.length>=2) out[k]=[Number(v[0])||0,Number(v[1])||0]; } return out; }
