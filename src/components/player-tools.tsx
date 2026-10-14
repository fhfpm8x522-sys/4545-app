import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { displayPlayerName, normalizePosition, type Player } from '@/lib/app-types';
import { per90, birthdayLabel } from '@/lib/player-model.mjs';
import { Button } from '@/components/ui/button';

export function usePlayerData(id: string | undefined, season: string) {
  return useQuery({ queryKey: ['player-details', id, season], enabled: !!id, staleTime: 900000, retry: 1, queryFn: async () => {
    const r = await supabase.functions.invoke('football-data', { body: { mode: 'player', id, season } }); if (r.error || !r.data?.player) throw Error('נתוני השחקן אינם זמינים כרגע'); return r.data as { player: Player; stats: Record<string, number | null>; season: string; source: string; updatedAt: string | null; error: string | null };
  } });
}
export function SavedItemButton({ userId, kind, id, label }: { userId?: string | undefined; kind: 'player' | 'article' | 'match'; id: string; label: string }) {
  const qc = useQueryClient(), [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ['saved-item', userId, kind, id], enabled: !!userId, queryFn: async () => { const r = await supabase.from('fan_saved_items').select('entity_id').eq('user_id', userId!).eq('kind', kind).eq('entity_id', id).maybeSingle(); if (r.error) throw r.error; return !!r.data; } });
  async function toggle() { if (!userId || busy || q.isError) return; setBusy(true); try { const r = q.data ? await supabase.from('fan_saved_items').delete().eq('user_id', userId).eq('kind', kind).eq('entity_id', id) : await supabase.from('fan_saved_items').insert({ user_id: userId, kind, entity_id: id }); if (r.error) throw r.error; await qc.invalidateQueries({ queryKey: ['saved-item', userId, kind, id] }); await qc.invalidateQueries({ queryKey: ['saved-items', userId] }); } catch { toast.error('לא הצלחנו לעדכן את השמירה'); } finally { setBusy(false); } }
  return <Button size="sm" variant={q.data ? 'club' : 'clubSoft'} disabled={!userId || busy || q.isError || q.isLoading} onClick={toggle}>{q.data ? '★ נשמר — לחץ לביטול' : `☆ ${label}`}</Button>;
}
export function PlayerFace({ player }: { player: Player }) { return <div className="flex items-center gap-3">{player.image_url ? <img src={player.image_url} alt="" className="size-16 rounded-full object-cover" /> : <span className="grid size-16 place-items-center rounded-full bg-club/10 text-2xl font-bold">{player.shirt_number ?? player.number ?? '⚽'}</span>}<div className="min-w-0"><h2 className="truncate text-lg font-black">{displayPlayerName(player)}</h2><p className="text-xs text-muted-foreground">{({ goalkeeper: 'שוער', defender: 'הגנה', midfielder: 'קישור', forward: 'התקפה' } as Record<string, string>)[normalizePosition(player.goal_position || player.position)] ?? player.position}</p></div></div>; }
export function PlayerMetricRows({ stats }: { stats: Record<string, number | null> }) {
  const rows: [string, number | null | undefined][] = [['הופעות', stats['appearances']], ['שערים', stats['goals']], ['בישולים', stats['assists']], ['דקות', stats['minutes']], ['שערים ל־90 דקות', per90(stats['goals'], stats['minutes'])], ['בישולים ל־90 דקות', per90(stats['assists'], stats['minutes'])]];
  return <div className="divide-y divide-border">{rows.map(([label, value]) => <div key={label} className="flex justify-between py-3 text-sm"><span className="text-muted-foreground">{label}</span><strong>{value == null ? '—' : Number.isInteger(value) ? value : value.toFixed(2)}</strong></div>)}</div>;
}
export function PlayerRosterLink({ player }: { player: Player }) { return <Link to="/player/$playerId" params={{ playerId: player.id }} className="panel block p-3"><PlayerFace player={player} />{birthdayLabel(player.birth_date) && <p className="mt-2 text-[10px] text-muted-foreground">🎂 {birthdayLabel(player.birth_date)}</p>}</Link>; }
