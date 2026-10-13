import {createFileRoute} from '@tanstack/react-router';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {toast} from 'sonner';
import {supabase} from '@/integrations/supabase/client';
import {useAdmin} from '@/lib/admin';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {QueryFeedback} from '@/components/query-feedback';
export const Route=createFileRoute('/admin/users')({component:AdminUsers});
type Account={id:string;email?:string|null;username?:string|null;display_name?:string|null;favorite_club_id?:string|null;email_confirmed_at?:string|null;created_at?:string;last_sign_in_at?:string|null};
const MESSAGES:Record<string,string>={OWNER_REQUIRED:'פעולה זו זמינה לבעל החשבון בלבד',PASSWORD_LENGTH:'הסיסמה צריכה להכיל 12–128 תווים',CLUB_CHANGE_FAILED:'החלפת הקבוצה לא הושלמה',AUDIT_UNAVAILABLE:'יומן הניהול אינו זמין; לא בוצע שינוי',AUTH_UPDATE_FAILED:'שינוי פרטי הכניסה נכשל'};
async function request(body:Record<string,unknown>){
 const r=await supabase.functions.invoke('admin-users',{body});
 if(r.error){let code='REQUEST_FAILED';try{code=(await (r.error as any).context.json()).error??code;}catch{}throw Error(MESSAGES[code]??'הפעולה לא הושלמה. נסה שוב.');}
 return r.data;
}
function AdminUsers(){
 const {memberships}=useAdmin();const qc=useQueryClient();
 const owner=memberships.some(m=>m.role?.key==='owner');
 const [page,setPage]=useState(1);const [search,setSearch]=useState('');
 const [selected,setSelected]=useState<Account|null>(null);
 const [action,setAction]=useState<'club'|'password'|'verify'>('club');
 const [clubId,setClubId]=useState('');const [password,setPassword]=useState('');
 const [confirmed,setConfirmed]=useState(false);const [busy,setBusy]=useState(false);
 const directory=useQuery({queryKey:['admin-users-directory',page,owner],queryFn:async()=>{
   if(owner)return await request({action:'list',page}) as {users:Account[];hasNext:boolean};
   const r=await supabase.rpc('admin_users');if(r.error)throw r.error;
   return {users:(r.data??[]).map((u:any)=>({...u,id:u.user_id})),hasNext:false};
 }});
 const clubs=useQuery({queryKey:['admin-users-clubs'],queryFn:async()=>{const r=await supabase.from('clubs').select('id,name_he').eq('active',true).order('name_he');if(r.error)throw r.error;return r.data??[];}});
 function choose(user:Account,next:typeof action){setSelected(user);setAction(next);setClubId(user.favorite_club_id??'');setPassword('');setConfirmed(false);}
 async function submit(){
   if(!selected||!confirmed||busy)return;setBusy(true);
   try{
     const result=await request({action,userId:selected.id,confirmed:true,...(action==='club'?{clubId}:action==='password'?{password}:{})});
     setPassword('');setSelected(null);
     await qc.invalidateQueries({queryKey:['admin-users-directory']});
     await qc.invalidateQueries({queryKey:['profile']});
     toast.success(result.auditComplete===false?'השינוי נשמר; רישום הבקשה ביומן קיים, אך רישום ההשלמה נכשל':'העדכון נשמר');
   }catch(e){toast.error(e instanceof Error?e.message:'העדכון נכשל');}finally{setBusy(false);}
 }
 const visible:Account[]=(directory.data?.users??[]).filter((u:Account)=>[u.email,u.username,u.display_name].some(v=>String(v??'').toLowerCase().includes(search.toLowerCase())));
 return <div className="space-y-4">
   <div><h1 className="text-xl font-bold">ניהול משתמשים</h1><p className="mt-1 text-sm text-muted-foreground">חיפוש משתמשים, אימות אימייל ידני, סיסמה חדשה והחלפת קבוצה. שינויי כניסה זמינים ל־Owner בלבד.</p></div>
   <Input aria-label="חיפוש משתמשים" placeholder="חיפוש לפי שם, שם משתמש או אימייל" value={search} onChange={e=>setSearch(e.target.value)}/>
   <QueryFeedback loading={directory.isLoading} error={directory.error} retry={directory.refetch}/>
   <div className="space-y-2">{visible.map(u=><article key={u.id} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
     <div className="min-w-0"><h2 className="font-semibold">{u.display_name||u.username||'משתמש ללא פרופיל'}</h2><p className="text-xs text-muted-foreground" dir="ltr">{u.email??(u.username?'@'+u.username:'')}</p><p className="mt-1 text-xs text-muted-foreground">{clubs.data?.find(c=>c.id===u.favorite_club_id)?.name_he??'טרם נבחרה קבוצה'}{owner&&` · ${u.email_confirmed_at?'אימייל מאומת':'ממתין לאימות'}`}</p></div>
     {owner&&<div className="flex flex-wrap gap-2"><Button size="sm" variant="clubSoft" onClick={()=>choose(u,'club')}>החלפת קבוצה</Button><Button size="sm" variant="outline" onClick={()=>choose(u,'password')}>סיסמה חדשה</Button><Button size="sm" variant="outline" disabled={!!u.email_confirmed_at||!u.email} onClick={()=>choose(u,'verify')}>אימות ידני</Button></div>}
   </article>)}</div>
   {!directory.isLoading&&!directory.error&&!visible.length&&<p className="panel p-4 text-sm">לא נמצאו משתמשים בעמוד זה.</p>}
   {owner&&<div className="flex items-center justify-between"><Button variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>הקודם</Button><span className="text-sm">עמוד {page} · עד 50 משתמשים בעמוד</span><Button variant="outline" disabled={!directory.data?.hasNext} onClick={()=>setPage(p=>p+1)}>הבא</Button></div>}
   {selected&&<div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 p-4"><section role="dialog" aria-modal="true" aria-labelledby="user-action-title" className="panel w-full max-w-lg space-y-4 bg-background p-5">
     <h2 id="user-action-title" className="font-bold">{action==='club'?'החלפת קבוצה':action==='password'?'הגדרת סיסמה חדשה':'אימות אימייל ידני'} — {selected.display_name||selected.username}</h2>
     {action==='club'?<label className="block space-y-2"><span>הקבוצה החדשה</span><select value={clubId} onChange={e=>setClubId(e.target.value)} className="min-h-11 w-full rounded-md border border-input bg-background px-3">{clubs.data?.map(c=><option key={c.id} value={c.id}>{c.name_he}</option>)}</select></label>:action==='password'?<label className="block space-y-2"><span>סיסמה חדשה, לפחות 12 תווים</span><Input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>:<p className="text-sm">פעולה זו תאשר את האימייל בלי קישור אימות. בצע אותה רק אחרי בדיקת זהות המשתמש.</p>}
     <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1 size-4"/><span>בדקתי את המשתמש ואני מאשר את השינוי. הפעולה תירשם ביומן הניהול.</span></label>
     <div className="flex gap-2"><Button variant="club" disabled={busy||!confirmed||(action==='password'&&password.length<12)||(action==='club'&&!clubId)} onClick={submit}>{busy?'שומר…':'אישור ושמירה'}</Button><Button variant="outline" disabled={busy} onClick={()=>{setPassword('');setSelected(null);}}>ביטול</Button></div>
   </section></div>}
 </div>;
}
