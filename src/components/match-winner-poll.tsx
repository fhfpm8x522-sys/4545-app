import {useState} from 'react';import {useQuery,useQueryClient} from '@tanstack/react-query';import {toast} from 'sonner';import {supabase} from '@/integrations/supabase/client';
export function MatchWinnerPoll({matchId,userId,homeName,awayName,open}:{matchId:string;userId?:string|undefined;homeName:string;awayName:string;open:boolean}) {
 const qc=useQueryClient();const [busy,setBusy]=useState(false);
 const {data,error}=useQuery({queryKey:['winner-poll',matchId,userId],refetchInterval:30000,queryFn:async()=>{
 const [totals,mine]=await Promise.all([supabase.rpc('match_winner_totals',{p_match_id:matchId}),userId?supabase.from('match_winner_votes').select('choice').eq('match_id',matchId).eq('user_id',userId).maybeSingle():Promise.resolve({data:null,error:null})]);if(totals.error||mine.error)throw totals.error||mine.error;return {totals:totals.data??[],mine:mine.data?.choice};}});
 const total=(data?.totals??[]).reduce((n:number,r:any)=>n+Number(r.votes),0);
 async function vote(choice:string){if(!userId||!open||busy)return;setBusy(true);try{const r=await supabase.from('match_winner_votes').upsert({match_id:matchId,user_id:userId,choice,updated_at:new Date().toISOString()});if(r.error)throw r.error;await qc.invalidateQueries({queryKey:['winner-poll',matchId]});}catch{toast.error('ההצבעה לא נשמרה. ייתכן שהמשחק כבר התחיל.');}finally{setBusy(false);}}
 return <section className="panel p-5"><h2 className="font-bold">מי תנצח?</h2><p className="mb-3 mt-1 text-xs text-muted-foreground">ניחוש אוהדים · {open?'אפשר לשנות עד תחילת המשחק':'ההצבעה נסגרה'} · {total} הצבעות</p>{error?<p className="text-sm text-muted-foreground">הסקר אינו זמין כרגע.</p>:<div className="grid grid-cols-3 gap-2">{[['home',homeName],['draw','תיקו'],['away',awayName]].map(([choice,name])=>{
 const votes=Number(data?.totals.find((r:any)=>r.choice===choice)?.votes??0);const pct=total?Math.round(votes/total*100):0;
 return <button key={choice} onClick={()=>vote(choice!)} disabled={!open||!userId||busy} className={`relative overflow-hidden rounded-xl border p-3 text-center text-xs ${data?.mine===choice?'border-club bg-club/15':'border-border'} disabled:opacity-75`}><span className="block font-bold">{name}</span><span className="mt-2 block text-lg font-bold">{pct}%</span>{data?.mine===choice&&<span className="text-club">הבחירה שלך ✓</span>}</button>;
 })}</div>}</section>;
}
