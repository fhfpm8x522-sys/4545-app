import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {parseAction,auditDetails} from './actions.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
Deno.serve(async request=>{
 const origin=request.headers.get('origin')??'';
 const headers={'Access-Control-Allow-Origin':['https://fhfpm8x522-sys.github.io','http://127.0.0.1:5173'].includes(origin)?origin:'https://fhfpm8x522-sys.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
 const respond=(body:unknown,status=200)=>Response.json(body,{status,headers});
 if(request.method==='OPTIONS')return new Response('ok',{headers});
 if(request.method!=='POST')return respond({error:'METHOD_NOT_ALLOWED'},405);
 const authorization=request.headers.get('authorization')??'';
 const token=authorization.replace(/^Bearer /i,'');
 const actor=(await db.auth.getUser(token)).data.user;
 if(!actor)return respond({error:'AUTH_REQUIRED'},401);
 const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}});
 const permission=await caller.rpc('has_permission',{permission_key:'owner.override'});
 if(permission.error||permission.data!==true)return respond({error:'OWNER_REQUIRED'},403);
 try{
   const input=parseAction(await request.json());
   if(input.action==='list'){
     const auth=await db.auth.admin.listUsers({page:input.page,perPage:50});
     if(auth.error)throw Error('DIRECTORY_UNAVAILABLE');
     const ids=auth.data.users.map(u=>u.id);
     const profiles=ids.length?await db.from('profiles').select('id,username,display_name,favorite_club_id').in('id',ids):{data:[],error:null};
     if(profiles.error)throw Error('DIRECTORY_UNAVAILABLE');
     const rows=auth.data.users.map(u=>({id:u.id,email:u.email??null,email_confirmed_at:u.email_confirmed_at??null,last_sign_in_at:u.last_sign_in_at??null,created_at:u.created_at,...profiles.data?.find(p=>p.id===u.id)}));
     return respond({users:rows,page:input.page,hasNext:rows.length===50});
   }
   if(input.action==='club'){
     const result=await caller.rpc('admin_override_favorite_club',{p_user_id:input.userId,p_club_id:input.clubId});
     if(result.error)throw Error('CLUB_CHANGE_FAILED');
     return respond({success:true});
   }
   const target=await db.auth.admin.getUserById(input.userId);
   if(target.error||!target.data.user)return respond({error:'USER_NOT_FOUND'},404);
   // Audit the request before changing authentication. Passwords are never logged.
   const audit=await caller.rpc('write_audit',{p_action:'user.'+input.action,p_entity_type:'auth_user',p_entity_id:input.userId,p_club_id:null,p_before:null,p_after:auditDetails(input,'requested')});
   if(audit.error)throw Error('AUDIT_UNAVAILABLE');
   const changed=await db.auth.admin.updateUserById(input.userId,input.action==='verify'?{email_confirm:true}:{password:input.password});
   if(changed.error)throw Error('AUTH_UPDATE_FAILED');
   const done=await caller.rpc('write_audit',{p_action:'user.'+input.action+'.completed',p_entity_type:'auth_user',p_entity_id:input.userId,p_club_id:null,p_before:null,p_after:auditDetails(input,'completed')});
   return respond({success:true,auditComplete:!done.error});
 }catch(error){return respond({error:error instanceof Error?error.message:'REQUEST_FAILED'},400);}
});
