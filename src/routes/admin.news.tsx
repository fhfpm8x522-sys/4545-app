import {NewsCollectorStatus} from "@/components/news-collector-status";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {NewsKind} from "@/components/news-kind";
import {QueryFeedback} from "@/components/query-feedback";
import {createFileRoute} from "@tanstack/react-router";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {useEffect,useState} from "react";
import {toast} from "sonner";
import {supabase} from "@/integrations/supabase/client";
import {audit,useAdmin} from "@/lib/admin";
import {meaningfulNewsText,safeNewsUrl,verifiedNewsImage} from "@/lib/news-display.mjs";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";

export const Route=createFileRoute("/admin/news")({component:AdminNews});
const STATUSES=[{key:"pending",label:"ממתין"},{key:"approved",label:"מאושר"},{key:"published",label:"פורסם"},{key:"rejected",label:"נדחה"},{key:"archived",label:"ארכיון"}];
type Draft={title:string;id?:string;club_id?:string|null;status?:string;published_at?:string|null;approved_by?:string|null;summary?:string|null;body?:string|null;source_name?:string|null;source_url?:string|null;category?:string|null;source_kind?:string|null;official?:boolean;content_kind?:string|null;image_url?:string|null;image_candidate_url?:string|null;image_credit?:string|null;image_source_url?:string|null;image_license?:string|null;image_license_url?:string|null;image_rights_verified?:boolean;image_kind?:string|null;[key:string]:any};
const emptyDraft=():Draft=>({title:"",summary:"",body:"",source_name:"",source_url:"",category:"general",image_url:"",image_credit:"",image_source_url:"",image_license:"",image_license_url:"",image_rights_verified:false,image_kind:"source",official:false,source_kind:"report",content_kind:"original"});

function publicationIssues(item:Draft){
 const issues:string[]=[];
 if(meaningfulNewsText(item.title).length<8)issues.push("נדרשת כותרת ברורה של 8 תווים לפחות.");
 const summary=meaningfulNewsText(item.summary),body=meaningfulNewsText(item.body);
 if((item.summary?.trim()&&!summary)||(item.body?.trim()&&!body))issues.push("יש להחליף את טקסט ההמתנה או הבקרה בתוכן הכתבה.");
 if(Math.max(summary.length,body.length)<40)issues.push("נדרש תקציר או תוכן משמעותי של 40 תווים לפחות.");
 if(item.source_url&&!safeNewsUrl(item.source_url))issues.push("קישור המקור חייב להיות כתובת HTTPS ציבורית.");
 if(item.content_kind==="source_excerpt"&&(!safeNewsUrl(item.source_url)||!item.source_name?.trim()))issues.push("קטע מהמקור דורש שם מקור וקישור לכתבה המקורית.");
 if(!verifiedNewsImage(item))issues.push("נדרשת תמונה עם הרשאת פרסום מאושרת, קרדיט, קישור מקור ורישיון או קישור לרישיון.");
 return issues;
}

function draftPayload(value:Draft){
 return {
  title:value.title.trim(),summary:value.summary?.trim()||null,body:value.body?.trim()||null,
  source_name:value.source_name?.trim()||null,source_url:value.source_url?.trim()||null,category:value.category?.trim()||"general",
  source_kind:value.source_kind||"report",official:value.source_kind==="official",content_kind:value.content_kind==="source_excerpt"?"source_excerpt":"original",
  image_url:value.image_url?.trim()||null,image_credit:value.image_credit?.trim()||null,image_source_url:value.image_source_url?.trim()||null,
  image_license:value.image_license?.trim()||null,image_license_url:value.image_license_url?.trim()||null,
  image_rights_verified:value.image_rights_verified===true,image_kind:value.image_kind||"source",
 };
}

function draftUrlError(value:Draft){
 for(const [key,label] of [["source_url","קישור המקור"],["image_url","כתובת התמונה"],["image_source_url","מקור התמונה"],["image_license_url","קישור הרישיון"]] as const){
  if(value[key]?.trim()&&!safeNewsUrl(value[key]))return label+" חייב להיות כתובת HTTPS ציבורית.";
 }
 return null;
}

function NewsFields({value,onChange,prefix}:{value:Draft;onChange:(next:Draft)=>void;prefix:string}){
 const update=(key:string,next:any)=>onChange({...value,[key]:next});
 const candidate=safeNewsUrl(value.image_candidate_url);
 const textClass="mt-1 w-full rounded-md border border-input bg-background p-3 text-base";
 return <div className="grid min-w-0 gap-4 sm:grid-cols-2">
  <label className="block min-w-0 text-sm sm:col-span-2" htmlFor={prefix+"-title"}>כותרת<Input id={prefix+"-title"} className="mt-1 text-base" value={value.title??""} onChange={e=>update("title",e.target.value)} /></label>
  <label className="block text-sm" htmlFor={prefix+"-source"}>שם המקור<Input id={prefix+"-source"} className="mt-1 text-base" value={value.source_name??""} onChange={e=>update("source_name",e.target.value)} /></label>
  <label className="block min-w-0 text-sm" htmlFor={prefix+"-url"}>קישור לכתבה המקורית<Input id={prefix+"-url"} dir="ltr" type="url" className="mt-1 text-base" value={value.source_url??""} onChange={e=>update("source_url",e.target.value)} /></label>
  <label className="block text-sm" htmlFor={prefix+"-category"}>קטגוריה<Input id={prefix+"-category"} className="mt-1 text-base" value={value.category??"general"} onChange={e=>update("category",e.target.value)} /></label>
  <label className="block text-sm" htmlFor={prefix+"-source-kind"}>אופי הכתבה<select id={prefix+"-source-kind"} value={value.source_kind??"report"} onChange={e=>onChange({...value,source_kind:e.target.value,official:e.target.value==="official"})} className={textClass}><option value="official">הודעה רשמית</option><option value="report">דיווח</option><option value="opinion">פרשנות</option></select></label>
  <label className="block text-sm sm:col-span-2" htmlFor={prefix+"-content-kind"}>אופן הצגת התוכן<select id={prefix+"-content-kind"} value={value.content_kind??"source_excerpt"} onChange={e=>update("content_kind",e.target.value)} className={textClass}><option value="original">תוכן מקורי של 45:45</option><option value="source_excerpt">קטע קצר מהמקור עם הפניה לכתבה</option></select></label>
  <label className="block text-sm sm:col-span-2" htmlFor={prefix+"-summary"}>תקציר אמיתי של הכתבה<textarea id={prefix+"-summary"} className={cn(textClass,"min-h-28")} value={value.summary??""} onChange={e=>update("summary",e.target.value)} /></label>
  <label className="block text-sm sm:col-span-2" htmlFor={prefix+"-body"}>תוכן הכתבה<textarea id={prefix+"-body"} className={cn(textClass,"min-h-44")} value={value.body??""} onChange={e=>update("body",e.target.value)} /></label>
  <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-2">כתוב תוכן מקורי משלך או קטע מקור קצר עם ייחוס. פרסום כתבה מלאה מחייב הרשאה מתאימה. הוראות לאדמין, כגון ״ממתין לאישור״, אינן תוכן לקוראים.</p>
  <div className="border-t border-border pt-4 sm:col-span-2"><h3 className="font-bold">תמונת הכתבה וקרדיט</h3>{candidate&&<p className="mt-2 text-sm text-muted-foreground"><a href={candidate} target="_blank" rel="noreferrer noopener" className="text-club underline">פתיחת התמונה שנמצאה אצל המקור</a> · זו הצעה לבדיקה; היא אינה מאשרת זכויות או מפרסמת את התמונה.</p>}</div>
  <label className="block min-w-0 text-sm sm:col-span-2" htmlFor={prefix+"-image"}>כתובת התמונה לפרסום<Input id={prefix+"-image"} type="url" dir="ltr" className="mt-1 text-base" value={value.image_url??""} onChange={e=>onChange({...value,image_url:e.target.value,image_kind:"source",image_rights_verified:false,image_credit:"",image_source_url:"",image_license:"",image_license_url:""})} /></label>
  <label className="block text-sm" htmlFor={prefix+"-credit"}>קרדיט לצלם או לבעל הזכויות<Input id={prefix+"-credit"} className="mt-1 text-base" value={value.image_credit??""} onChange={e=>update("image_credit",e.target.value)} /></label>
  <label className="block min-w-0 text-sm" htmlFor={prefix+"-image-source"}>קישור למקור התמונה<Input id={prefix+"-image-source"} type="url" dir="ltr" className="mt-1 text-base" value={value.image_source_url??""} onChange={e=>update("image_source_url",e.target.value)} /></label>
  <label className="block text-sm" htmlFor={prefix+"-license"}>רישיון או תיאור ההרשאה<Input id={prefix+"-license"} className="mt-1 text-base" placeholder="למשל: CC BY 4.0 או אישור מבעל הזכויות" value={value.image_license??""} onChange={e=>update("image_license",e.target.value)} /></label>
  <label className="block min-w-0 text-sm" htmlFor={prefix+"-license-url"}>קישור לרישיון או לאישור<Input id={prefix+"-license-url"} type="url" dir="ltr" className="mt-1 text-base" value={value.image_license_url??""} onChange={e=>update("image_license_url",e.target.value)} /></label>
  <label className="flex items-start gap-3 text-sm leading-relaxed sm:col-span-2" htmlFor={prefix+"-rights"}><input id={prefix+"-rights"} type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--club)]" checked={value.image_rights_verified===true} onChange={e=>update("image_rights_verified",e.target.checked)} /><span>יש לי הרשאה לפרסם את התמונה. בדקתי את הרישיון ואת תנאי הקרדיט. סימון זה אינו מעניק זכויות שאינן ברשותי.</span></label>
 </div>;
}

function Readiness({item}:{item:Draft}){
 const issues=publicationIssues(item);
 return issues.length?<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><p className="font-bold">עדיין חסר לפני אישור ופרסום:</p><ul className="mt-2 list-inside list-disc space-y-1">{issues.map(issue=><li key={issue}>{issue}</li>)}</ul></div>:<p className="rounded-xl border border-green-500/30 p-3 text-sm">התוכן והתמונה מוכנים לבדיקת העורך. פרסום יבוצע רק לאחר אישור ידני.</p>;
}

function AdminNews(){
 const {clubId,userId,can}=useAdmin(),qc=useQueryClient();
 const [status,setStatus]=useState("pending"),[preview,setPreview]=useState<Draft|null>(null),[editing,setEditing]=useState<Draft|null>(null),[draft,setDraft]=useState<Draft>(emptyDraft),[saving,setSaving]=useState(false);
 const {data:items,error,isLoading,refetch}=useQuery({queryKey:["admin-news",clubId,status],enabled:!!clubId,queryFn:async()=>{const r=await supabase.from("news_items").select("*").eq("club_id",clubId!).eq("status",status).order("created_at",{ascending:false});if(r.error)throw r.error;return r.data??[];}});
 useEffect(()=>{setEditing(null);setPreview(null);setDraft(emptyDraft());},[clubId]);
 async function patch(item:Draft,next:Partial<Draft>){
  if(saving)return false;
  if(next.status==="published"&&(item.status!=="approved"||!can("news.publish"))){toast.error("יש לאשר את הידיעה לפני פרסום");return false;}
  if(next.status!=="published"&&!can("news.review")){toast.error("נדרשת הרשאת עריכת חדשות");return false;}
  if(next.status==="approved"||next.status==="published"){const issues=publicationIssues({...item,...next});if(issues.length){toast.error(issues[0]);return false;}}
  setSaving(true);
  try{
   const payload={...next};if(payload.status==="published"&&!item.published_at)payload.published_at=new Date().toISOString();
   if(payload.status==="approved"||payload.status==="published")payload.approved_by=userId;
   const {error}=await supabase.from("news_items").update(payload).eq("id",item.id);if(error)throw error;
   await audit({actorId:userId,action:"news."+(payload.status??"update"),entityType:"news_items",entityId:item.id??null,clubId:item.club_id??clubId,before:item,after:payload});
   await qc.invalidateQueries({queryKey:["admin-news"]});toast.success(payload.status==="pending"?"הטיוטה נשמרה ונשלחה לבדיקה":"הידיעה עודכנה");return true;
  }catch(error:any){toast.error(error.message||"לא הצלחנו לשמור את הידיעה");return false;}finally{setSaving(false);}
 }
 async function create(){
  if(saving||!can("news.review")||!clubId||!draft.title.trim())return;
  const invalid=draftUrlError(draft);if(invalid){toast.error(invalid);return;}
  setSaving(true);
  try{
   const payload=draftPayload(draft);
   const {data,error}=await supabase.from("news_items").insert({...payload,club_id:clubId,status:"pending",created_by:userId,approved_by:null}).select("id").single();if(error)throw error;
   await audit({actorId:userId,action:"news.create",entityType:"news_items",entityId:data.id,clubId,after:payload});
   setDraft(emptyDraft());await qc.invalidateQueries({queryKey:["admin-news"]});toast.success("נוצרה טיוטה לבדיקה");
  }catch(error:any){toast.error(error.message||"לא הצלחנו ליצור את הטיוטה");}finally{setSaving(false);}
 }
 async function saveEditing(){
  if(!editing)return;
  const invalid=draftUrlError(editing);if(invalid){toast.error(invalid);return;}
  const original=items?.find((n:any)=>n.id===editing.id);if(!original){toast.error("הידיעה השתנתה. רענן את הרשימה ונסה שוב");return;}
  if(await patch(original,{...draftPayload(editing),status:"pending",approved_by:null}))setEditing(null);
 }
 const previewImage=preview?verifiedNewsImage(preview):null;
 return <div className="space-y-5">
  <NewsCollectorStatus/><QueryFeedback loading={isLoading} error={error} retry={refetch}/>
  <div className="flex gap-2 overflow-x-auto hide-scrollbar">{STATUSES.map(s=><button key={s.key} onClick={()=>setStatus(s.key)} className={cn("rounded-full border px-3 py-1 text-sm",status===s.key?"border-club text-club":"border-border text-muted-foreground")}>{s.label}</button>)}</div>
  <p className="text-xs leading-relaxed text-muted-foreground">האיסוף האוטומטי יוצר טיוטות בלבד. העורך בודק את התוכן, המקור וזכויות התמונה לפני אישור ופרסום.</p>
  {can("news.review")&&<details className="panel p-4"><summary className="cursor-pointer font-bold">יצירת כתבה חדשה</summary><div className="mt-5 space-y-4"><NewsFields value={draft} onChange={setDraft} prefix="create-news"/><Readiness item={draft}/><div className="flex flex-wrap gap-2"><Button type="button" variant="ghost" onClick={()=>setPreview(draft)}>תצוגה מקדימה</Button><Button type="button" variant="club" disabled={saving||!clubId||!draft.title.trim()} onClick={create}>{saving?"שומר…":"יצירת טיוטה לאישור"}</Button></div></div></details>}
  <section className="space-y-3">
   {items?.length===0&&<p className="panel p-4 text-sm text-muted-foreground">אין פריטים בסטטוס שנבחר.</p>}
   {items?.map((n:any)=>{const issues=publicationIssues(n),summary=meaningfulNewsText(n.summary);return <article key={n.id} className="panel p-4">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-bold">{n.title}</h2><span className="text-xs text-muted-foreground">{n.category} · {n.source_name||"45:45"}</span></div>{n.official&&<span className="shrink-0 text-xs font-bold text-club">רשמי</span>}</div>
    {safeNewsUrl(n.source_url)&&<a href={safeNewsUrl(n.source_url)!} target="_blank" rel="noreferrer noopener" className="mt-2 inline-block text-xs text-club underline">בדיקת הכתבה במקור</a>}
    {summary?<p className="mt-2 text-sm text-muted-foreground">{summary}</p>:<p className="mt-2 text-sm text-amber-400">חסר תקציר לקוראים. טקסט ההמתנה אינו מוצג ככתבה.</p>}
    {(status==="pending"||status==="approved")&&issues.length>0&&<div className="mt-3"><Readiness item={n}/></div>}
    <div className="mt-3 flex flex-wrap gap-2">
     <Button type="button" size="sm" variant="ghost" onClick={()=>setPreview(n)}>תצוגה מקדימה</Button>
     {can("news.review")&&<Button type="button" size="sm" variant="ghost" disabled={saving} onClick={()=>setEditing({...n,content_kind:n.content_kind??(n.source_name&&n.source_name!=="45:45"?"source_excerpt":"original")})}>עריכת כתבה</Button>}
     {status==="pending"&&can("news.review")&&<Button type="button" size="sm" variant="clubSoft" disabled={saving||issues.length>0} onClick={()=>patch(n,{status:"approved"})}>אישור</Button>}
     {status==="approved"&&can("news.publish")&&<Button type="button" size="sm" variant="club" disabled={saving||issues.length>0} onClick={()=>patch(n,{status:"published"})}>פרסום</Button>}
     {status!=="rejected"&&can("news.review")&&<Button type="button" size="sm" variant="ghost" disabled={saving} onClick={()=>patch(n,{status:"rejected"})}>דחייה</Button>}
     {status!=="archived"&&can("news.review")&&<Button type="button" size="sm" variant="ghost" disabled={saving} onClick={()=>patch(n,{status:"archived"})}>ארכיון</Button>}
    </div>
   </article>;})}
  </section>
  <Dialog open={!!preview} onOpenChange={open=>{if(!open)setPreview(null)}}>
   <DialogContent className="max-h-[85dvh] w-[94vw] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0">
    <DialogHeader className="px-6 pb-4 pt-6 pr-12 text-right sm:text-right"><DialogTitle>תצוגה לפני אישור</DialogTitle><DialogDescription>תצוגה זו אינה מפרסמת דבר. רק תמונה עם פרטי זכויות מאושרים תוצג לקוראים.</DialogDescription></DialogHeader>
    <div className="min-h-0 overflow-y-auto overscroll-contain px-6 pb-6">{preview&&<article className="space-y-4">
     {previewImage&&<figure><img src={previewImage.url} alt={previewImage.kind==="brand"?"תמונת שער של 45:45":""} className="aspect-video w-full rounded-xl object-cover" referrerPolicy="no-referrer"/><figcaption className="mt-2 text-xs text-muted-foreground">{previewImage.kind==="brand"?"תמונת שער של 45:45 · ":""}{previewImage.credit}{previewImage.license?" · "+previewImage.license:""}</figcaption></figure>}
     <NewsKind item={{source_kind:preview.source_kind??"report",official:preview.official===true}}/><h2 className="text-xl font-black">{preview.title||"כותרת הידיעה"}</h2>
     {meaningfulNewsText(preview.summary)&&<p className="text-sm font-bold leading-relaxed">{meaningfulNewsText(preview.summary)}</p>}
     {meaningfulNewsText(preview.body)&&<p className="whitespace-pre-line text-sm leading-relaxed">{meaningfulNewsText(preview.body)}</p>}
     {preview.content_kind==="source_excerpt"&&<p className="text-xs text-muted-foreground">קטע קצר מהמקור. הכתבה המלאה זמינה באתר המקור.</p>}
     <p className="text-xs text-muted-foreground">{preview.source_name||"45:45"}</p>
     {safeNewsUrl(preview.source_url)&&<a href={safeNewsUrl(preview.source_url)!} target="_blank" rel="noreferrer noopener" className="inline-block text-sm text-club underline">לכתבה המקורית</a>}
     <Readiness item={preview}/>
    </article>}</div>
    <div className="border-t border-border p-4"><Button type="button" variant="ghost" onClick={()=>setPreview(null)}>סגירה</Button></div>
   </DialogContent>
  </Dialog>
  <Dialog open={!!editing} onOpenChange={open=>{if(!open&&!saving)setEditing(null)}}>
   <DialogContent className="max-h-[85dvh] w-[94vw] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0">
    <DialogHeader className="px-6 pb-4 pt-6 pr-12 text-right sm:text-right"><DialogTitle>עריכת כתבה</DialogTitle><DialogDescription>השמירה מחזירה את הכתבה לתור האישור. התוכן ופרטי התמונה נשמרים יחד.</DialogDescription></DialogHeader>
    <div className="min-h-0 overflow-y-auto overscroll-contain px-6 pb-6">{editing&&<div className="space-y-4"><NewsFields value={editing} onChange={setEditing} prefix="edit-news"/><Readiness item={editing}/></div>}</div>
    <div className="flex flex-wrap gap-2 border-t border-border bg-background p-4"><Button type="button" variant="club" disabled={saving||!editing?.title?.trim()} onClick={saveEditing}>{saving?"שומר…":"שמירת טיוטה לאישור"}</Button><Button type="button" variant="ghost" disabled={saving} onClick={()=>setEditing(null)}>ביטול</Button></div>
   </DialogContent>
  </Dialog>
 </div>;
}
