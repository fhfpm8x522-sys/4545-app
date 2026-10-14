import {supabase} from '@/integrations/supabase/client';
export async function photoWithoutMetadata(file:Blob):Promise<Blob>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10485760)throw Error('בחר תמונת JPG, PNG או WebP עד 10MB');
 const bitmap=await createImageBitmap(file);try{const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');if(!ctx)throw Error('Photo unavailable');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Photo unavailable')),'image/jpeg',0.88));}finally{bitmap.close();}
}
export async function submitPublicPhoto(file:Blob,context:{albumId?:string|undefined;stadiumId?:string|undefined;caption:string}){
 const image=await photoWithoutMetadata(file);
 const result=await supabase.rpc('request_public_photo',{p_album:context.albumId??null,p_stadium:context.stadiumId??null,p_caption:context.caption});if(result.error)throw result.error;
 const row=Array.isArray(result.data)?result.data[0]:result.data;const upload=await supabase.storage.from('fan-public-albums').upload(row.storage_path,image,{contentType:'image/jpeg',upsert:false});if(upload.error){await supabase.rpc('withdraw_public_photo',{p_id:row.id});throw upload.error;}return row;
}
export async function publicPhotoRows(filter:{stadiumId?:string;userId?:string;pending?:boolean}){
 let query=supabase.from('fan_public_photos').select('*').eq('status',filter.pending?'pending':'approved').order('created_at',{ascending:false}).limit(100);if(filter.stadiumId)query=query.eq('stadium_id',filter.stadiumId);if(filter.userId)query=query.eq('user_id',filter.userId);
 const r=await query;if(r.error)throw r.error;const names=r.data?.length?await supabase.rpc('get_public_profiles',{p_user_ids:[...new Set(r.data.map(p=>p.user_id))]}):{data:[]};const map=new Map((names.data??[]).map((p:any)=>[p.id,p]));return await Promise.all((r.data??[]).map(async p=>{const signed=await supabase.storage.from('fan-public-albums').createSignedUrl(p.storage_path,60);return {...p,url:signed.data?.signedUrl??null,author:map.get(p.user_id) as any};}));
}
