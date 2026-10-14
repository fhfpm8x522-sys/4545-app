import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { personalSnapshot } from '@/lib/fan-tools.mjs';
import type { Profile } from '@/lib/app-types';
import { Button } from '@/components/ui/button';
import { downloadBlob } from '@/components/personal-match-tools';

export function QuietHours({ userId, prefs }: { userId: string; prefs: Record<string, unknown> }) {
  const qc = useQueryClient(), [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(prefs['quiet_enabled'] === true), [start, setStart] = useState(String(prefs['quiet_start'] ?? 22)), [end, setEnd] = useState(String(prefs['quiet_end'] ?? 8));
  const [selectedOnly, setSelectedOnly] = useState(prefs['selected_games_only'] === true);
  const [zone,setZone] = useState(typeof prefs['quiet_timezone'] === 'string' ? prefs['quiet_timezone'] : Intl.DateTimeFormat().resolvedOptions().timeZone);
  async function save() {
    if (busy) return; if(enabled&&start===end){toast.error('בחר שעת סיום שונה משעת ההתחלה');return;} setBusy(true);
    try { const r = await supabase.rpc('set_notification_preferences', { p_patch: { quiet_enabled: enabled, quiet_start: Number(start), quiet_end: Number(end), quiet_timezone: zone, selected_games_only: selectedOnly } }); if (r.error) throw r.error; await qc.invalidateQueries({ queryKey: ['profile', userId] }); toast.success('מצב שקט ובחירת משחקים נשמרו'); }
    catch { toast.error('לא הצלחנו לשמור את ההעדפות'); } finally { setBusy(false); }
  }
  return <section className="panel mt-4 space-y-3 p-5"><h2 className="font-bold">התראות בקצב שלך</h2>
    <label className="flex items-center justify-between text-sm">מצב שקט בלילה<input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="size-5 accent-[var(--club)]" /></label>
    <div className="grid grid-cols-2 gap-3">{[['משעה', start, setStart], ['עד שעה', end, setEnd]].map(([label, value, setter], i) => <label key={i} className="text-xs">{label as string}<select className="mt-2 w-full rounded-lg border border-border bg-background p-2" value={value as string} onChange={e => (setter as (v: string) => void)(e.target.value)}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></label>)}</div>
    <p className="text-[11px] text-muted-foreground">אזור זמן: {zone}. במצב שקט ההודעות נשמרות בתיבת ההתראות וה־Push לא נשלח; הן לא יישלחו שוב בבוקר.</p><button className="text-xs text-club underline" onClick={()=>setZone(Intl.DateTimeFormat().resolvedOptions().timeZone)}>התאם לשעון המכשיר</button>
    <label className="flex items-center justify-between gap-3 text-sm">התראות רק למשחקים שבחרתי<input type="checkbox" checked={selectedOnly} onChange={e => setSelectedOnly(e.target.checked)} className="size-5 accent-[var(--club)]" /></label>
    <p className="text-[11px] text-muted-foreground">בחר משחקים מסוימים ב־Match Center. תזכורת אישית אפשר להפעיל לכל משחק בנפרד.</p>
    <Button variant="clubSoft" disabled={busy} onClick={save}>{busy ? 'שומר…' : 'שמירת העדפות'}</Button>
  </section>;
}
export function ExportPersonalData({ user }: { user: { id: string; email?: string | undefined } }) {
  const [busy, setBusy] = useState(false);
  async function exportData() {
    if (busy) return; setBusy(true);
    try {
      const names = ['fan_public_photos', 'community_posts', 'chat_messages', 'poll_votes', 'match_winner_votes', 'club_change_history', 'fan_motm_votes', 'predictions', 'match_attendance', 'fan_guesses', 'fan_match_alerts', 'fan_match_diary', 'fan_saved_items', 'fan_album_photos', 'notification_inbox'];
      const order:Record<string,string[]>={fan_public_photos:['id'],community_posts:['id'],chat_messages:['id'],poll_votes:['poll_id'],match_winner_votes:['match_id'],club_change_history:['id'],fan_motm_votes:['match_id'],predictions:['match_id'],match_attendance:['match_id'],fan_guesses:['match_id','kind'],fan_match_alerts:['match_id'],fan_match_diary:['match_id'],fan_saved_items:['kind','entity_id'],fan_album_photos:['id'],notification_inbox:['id']};
      const records: Record<string, any[]> = {};
      for (const table of names) {
        const rows: any[] = [];
        for (let from = 0; ; from += 500) { let query=supabase.from(table).select('*').eq(['community_posts','chat_messages'].includes(table)?'author_id':'user_id',user.id);for(const column of order[table]??[])query=query.order(column);const r = await query.range(from, from + 499); if (r.error) throw r.error; rows.push(...r.data ?? []); if ((r.data?.length ?? 0) < 500) break; }
        records[table] = rows;
      }
      const latest=await supabase.from('profiles').select('*').eq('id',user.id).single();if(latest.error)throw latest.error;
      const snapshot = personalSnapshot(user, latest.data as Profile, records);
      downloadBlob(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' }), `4545-my-data-${new Date().toISOString().slice(0, 10)}.json`);
      toast.success('עותק המידע וההעדפות שלך מוכן');
    } catch { toast.error('הייצוא לא הושלם. לא הורד קובץ חלקי. נסה שוב.'); } finally { setBusy(false); }
  }
  return <section className="panel mt-4 p-5"><h2 className="font-bold">המידע שלי</h2><p className="my-2 text-xs text-muted-foreground">עותק הפרופיל, ההעדפות, הניחושים, הסימניות והיומן שלך. האלבום מיוצא כרשימת תמונות וכיתובים; קובצי התמונות נשארים באלבום הפרטי.</p><Button variant="clubSoft" disabled={busy} onClick={exportData}>{busy ? 'מכין עותק…' : 'הורדת עותק המידע שלי'}</Button></section>;
}
