import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {submitPublicPhoto} from '@/lib/fan-photo';
const bucket = 'fan-match-albums';
export function PrivateMatchAlbum({ userId, matchId }: { userId: string; matchId: string }) {
  const qc = useQueryClient(), input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false), [caption, setCaption] = useState(''), [removeId, setRemoveId] = useState<string | null>(null),[publishId,setPublishId]=useState<string|null>(null);
  const query = useQuery({ queryKey: ['private-album', userId, matchId], staleTime: 300000, refetchInterval: 3000000, queryFn: async () => {
    const r = await supabase.from('fan_album_photos').select('*').eq('user_id', userId).eq('match_id', matchId).order('created_at'); if (r.error) throw r.error;
    return await Promise.all((r.data ?? []).map(async photo => { const signed = await supabase.storage.from(bucket).createSignedUrl(photo.storage_path, 3600); return { ...photo, url: signed.error ? null : signed.data?.signedUrl }; }));
  } });
  async function upload(file?: File) {
    if (!file || busy) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10485760) { toast.error('בחר תמונת JPG, PNG או WebP עד 10MB'); return; }
    setBusy(true); const id = crypto.randomUUID(), ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/${matchId}/${id}.${ext}`; let uploaded = false;
    try {
      const stored = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false }); if (stored.error) throw stored.error; uploaded = true;
      const saved = await supabase.from('fan_album_photos').insert({ id, user_id: userId, match_id: matchId, storage_path: path, caption: caption.trim().slice(0, 300) }); if (saved.error) throw saved.error;
      setCaption(''); await qc.invalidateQueries({ queryKey: ['private-album', userId, matchId] }); toast.success('התמונה נשמרה באלבום הפרטי');
    } catch { if (uploaded) await supabase.storage.from(bucket).remove([path]); toast.error('לא הצלחנו להוסיף את התמונה'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  async function publish() {const photo=query.data?.find(p=>p.id===publishId);if(!photo?.url||busy)return;setBusy(true);try{const response=await fetch(photo.url);if(!response.ok)throw Error('Photo unavailable');await submitPublicPhoto(await response.blob(),{albumId:photo.id,caption:photo.caption??''});setPublishId(null);toast.success('התמונה נשלחה לאישור לפרופיל הציבורי. המקור נשאר פרטי');await qc.invalidateQueries({queryKey:['public-photos']});}catch{toast.error('לא הצלחנו לשלוח לפרסום');}finally{setBusy(false);}}
  async function remove() {
    const photo = query.data?.find(p => p.id === removeId); if (!photo || busy) return; setBusy(true);
    try { const copies=await supabase.from('fan_public_photos').select('id').eq('user_id',userId).eq('album_photo_id',photo.id);if(copies.error)throw copies.error;for(const copy of copies.data??[]){const r=await supabase.rpc('withdraw_public_photo',{p_id:copy.id});if(r.error)throw r.error;}const stored = await supabase.storage.from(bucket).remove([photo.storage_path]); if (stored.error) throw stored.error; const r = await supabase.from('fan_album_photos').delete().eq('id', photo.id).eq('user_id', userId); if (r.error) throw r.error; setRemoveId(null); await qc.invalidateQueries({ queryKey: ['private-album', userId, matchId] }); }
    catch { toast.error('לא הצלחנו להסיר את התמונה'); } finally { setBusy(false); }
  }
  return <section className="panel space-y-3 p-4"><h2 className="font-bold">האלבום שלי ליום המשחק</h2><p className="text-xs text-muted-foreground">התמונות פרטיות כברירת מחדל. אפשר לבחור תמונה לפרסום בפרופיל לאחר אישור, או להשאיר אותה פרטית.</p>
    <div className="flex gap-2"><Input aria-label="כיתוב לתמונה" maxLength={300} value={caption} onChange={e => setCaption(e.target.value)} placeholder="כיתוב לתמונה (אופציונלי)" /><Button variant="clubSoft" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'מעלה…' : 'הוסף תמונה'}</Button></div>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => upload(e.target.files?.[0])} />
    {query.isError ? <button className="text-xs text-club" onClick={() => query.refetch()}>לא הצלחנו לטעון את האלבום — נסה שוב</button> : query.isLoading ? <p className="text-xs">טוען אלבום…</p> : !query.data?.length ? <p className="text-xs text-muted-foreground">עוד אין תמונות באלבום הזה.</p> : <div className="grid grid-cols-2 gap-3">{query.data.map(photo => <figure key={photo.id} className="overflow-hidden rounded-xl border border-border">{photo.url ? <img src={photo.url} alt={photo.caption || 'תמונה מהאלבום הפרטי'} className="aspect-square w-full object-cover" /> : <p className="p-3 text-xs">התמונה אינה זמינה.</p>}<figcaption className="p-2 text-xs">{photo.caption}<button className="mt-2 block text-club" disabled={busy||!photo.url} onClick={()=>setPublishId(photo.id)}>בחר לפרסום בפרופיל</button><button className="mt-2 block text-destructive" onClick={() => setRemoveId(photo.id)}>הסר תמונה</button></figcaption></figure>)}</div>}
    <Dialog open={!!publishId} onOpenChange={v=>{if(!v&&!busy)setPublishId(null)}}><DialogContent><DialogHeader><DialogTitle>לפרסם את התמונה בפרופיל?</DialogTitle><DialogDescription>לאחר אישור מנהל, כולם באפליקציה יוכלו לראות את התמונה והכיתוב. אני מאשר שיש לי הרשאה לפרסם אותה. פרטי המיקום המוטמעים יוסרו; המקור יישאר פרטי.</DialogDescription></DialogHeader><Button variant="club" disabled={busy} onClick={publish}>אני בוחר לפרסם</Button><Button variant="ghost" disabled={busy} onClick={()=>setPublishId(null)}>השאר פרטי</Button></DialogContent></Dialog>
    <Dialog open={!!removeId} onOpenChange={v => { if (!v && !busy) setRemoveId(null); }}><DialogContent><DialogHeader><DialogTitle>להסיר את התמונה מהאלבום?</DialogTitle><DialogDescription>המקור יוסר מהאלבום הפרטי. עותקים שנבחרו לפרסום יוחזרו לפרטי.</DialogDescription></DialogHeader><Button variant="destructive" disabled={busy} onClick={remove}>הסר מהאלבום</Button><Button variant="ghost" disabled={busy} onClick={() => setRemoveId(null)}>ביטול</Button></DialogContent></Dialog>
  </section>;
}
