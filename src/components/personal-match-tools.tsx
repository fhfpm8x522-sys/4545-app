import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { matchCalendar, publicMatchCard } from '@/lib/fan-tools.mjs';
import type { Match, Profile } from '@/lib/app-types';
import { Button } from '@/components/ui/button';

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function shareMatchCard(match: Match) {
  const card = publicMatchCard(match), canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 620;
  const ctx = canvas.getContext('2d'); if (!ctx) throw Error('Canvas unavailable');
  const bg = ctx.createLinearGradient(0, 0, 1000, 620); bg.addColorStop(0, '#091426'); bg.addColorStop(1, '#350915'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 1000, 620);
  ctx.fillStyle = '#ff263e'; ctx.fillRect(0, 0, 1000, 10); ctx.strokeStyle = '#ffffff12'; ctx.lineWidth = 2; ctx.strokeRect(50, 110, 900, 410); ctx.beginPath(); ctx.arc(500, 315, 110, 0, Math.PI * 2); ctx.stroke();
  ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.fillStyle = '#ffffff'; ctx.font = 'italic bold 70px Arial'; ctx.fillText('45:45', 500, 91);
  ctx.fillStyle = '#c2cde0'; ctx.font = '24px Arial'; ctx.fillText(card.competition, 500, 154, 900);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 34px Arial'; ctx.fillText(card.home, 245, 264, 370); ctx.fillText(card.away, 755, 264, 370);
  ctx.direction = 'ltr'; ctx.font = 'bold 96px Arial'; ctx.fillText(card.score ?? 'VS', 500, 390, 850);
  ctx.direction = 'rtl'; ctx.font = '24px Arial'; ctx.fillStyle = '#c2cde0'; ctx.fillText(new Date(card.kickoff).toLocaleString('he-IL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }), 500, 455);
  ctx.fillStyle = '#ff263e'; ctx.font = 'bold 25px Arial'; ctx.fillText('הקבוצה. הקהל. הרגעים.', 500, 565);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(Error('Image unavailable')), 'image/png'));
  const file = new File([blob], `4545-match-${match.id}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'יום משחק — 45:45' }); else downloadBlob(blob, file.name);
}
export function PersonalMatchTools({ match, profile, userId }: { match: Match; profile?: Profile | null | undefined; userId?: string | undefined }) {
  const qc = useQueryClient(); const [busy, setBusy] = useState(false);
  const { data, error } = useQuery({ queryKey: ['match-tools', match.id, userId], enabled: !!userId, queryFn: async () => {
    const [alerts, diary] = await Promise.all([
      supabase.from('fan_match_alerts').select('*').eq('user_id', userId!).eq('match_id', match.id).maybeSingle(),
      supabase.from('fan_match_diary').select('watched_at').eq('user_id', userId!).eq('match_id', match.id).maybeSingle(),
    ]); if (alerts.error || diary.error) throw alerts.error || diary.error; return { alerts: alerts.data, diary: diary.data };
  } });
  const prefs = profile?.notification_prefs as Record<string, unknown> | null;
  const followsClub = !!profile?.favorite_club_id && [match.home_club_id, match.away_club_id].includes(profile.favorite_club_id);
  const enabled = data?.alerts?.enabled ?? (followsClub && prefs?.['selected_games_only'] !== true);
  async function saveAlerts(patch: { enabled?: boolean; reminder_hour?: boolean }) {
    if (!userId || busy) return; setBusy(true);
    try { const r = await supabase.from('fan_match_alerts').upsert({ user_id: userId, match_id: match.id, enabled, reminder_hour: data?.alerts?.reminder_hour ?? false, ...patch, updated_at: new Date().toISOString() }); if (r.error) throw r.error; await qc.invalidateQueries({ queryKey: ['match-tools', match.id] }); toast.success('העדפות המשחק נשמרו'); }
    catch { toast.error('לא הצלחנו לשמור את העדפות המשחק'); } finally { setBusy(false); }
  }
  async function watched() {
    if (!userId || busy) return; setBusy(true);
    try { const r = await supabase.rpc('save_fan_diary', { p_match_id: match.id, p_patch: { watched_at: data?.diary?.watched_at ? null : new Date().toISOString() } }); if (r.error) throw r.error; await qc.invalidateQueries({ queryKey: ['match-tools', match.id] }); await qc.invalidateQueries({ queryKey: ['fan-diary', userId] }); }
    catch { toast.error('לא הצלחנו לשמור את הסימון'); } finally { setBusy(false); }
  }
  return <section className="panel space-y-3 p-4"><div className="flex flex-wrap gap-2">
    <Button variant="clubSoft" onClick={() => { try { downloadBlob(new Blob([matchCalendar(match)], { type: 'text/calendar;charset=utf-8' }), `4545-match-${match.id}.ics`); } catch { toast.error('פרטי המשחק אינם זמינים ליומן'); } }}>📅 הוסף ליומן הטלפון</Button>
    <Button variant="clubSoft" onClick={() => shareMatchCard(match).catch(error => { if (error?.name !== 'AbortError') toast.error('לא הצלחנו ליצור תמונה לשיתוף'); })}>🎨 סיכום משחק לשיתוף</Button>
    {userId && <Button variant={data?.diary?.watched_at ? 'club' : 'ghost'} disabled={busy || !!error || !['live', 'finished'].includes(match.status)} onClick={watched}>{data?.diary?.watched_at ? 'נצפה ✓ — ביטול הסימון' : 'סמן שצפיתי במשחק'}</Button>}
  </div>{userId && !error && <div className="grid gap-2 text-sm sm:grid-cols-2">
    <label className="flex items-center gap-2"><input type="checkbox" disabled={busy} checked={enabled} onChange={e => saveAlerts({ enabled: e.target.checked })} className="size-4 accent-[var(--club)]" />התראות למשחק הזה</label>
    <label className="flex items-center gap-2"><input type="checkbox" disabled={busy || match.status !== 'scheduled' || Date.parse(match.kickoff) <= Date.now()} checked={data?.alerts?.reminder_hour ?? false} onChange={e => saveAlerts({ reminder_hour: e.target.checked })} className="size-4 accent-[var(--club)]" />תזכורת אישית שעה לפני</label>
  </div>}{error && <p className="text-xs text-muted-foreground">לא ניתן לטעון את ההעדפות האישיות כרגע.</p>}
    <p className="text-[11px] text-muted-foreground">התזכורת נשמרת בהתראות האישיות; לקבלת Push יש להפעיל אותו ב״אני״. קובץ היומן כולל תזכורת, ושינוי שעת משחק דורש הוספה מחדש ליומן.</p>
    <Link to="/diary" className="inline-block text-xs font-bold text-club">היומן והאלבום הפרטי שלי ←</Link>
  </section>;
}
