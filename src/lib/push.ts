import {supabase} from '@/integrations/supabase/client';
export async function enablePush(userId:string){
 if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw new Error('הדפדפן אינו תומך ב־Push. באייפון יש להוסיף את האפליקציה למסך הבית מתוך Safari.');
 const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('הרשאת התראות לא ניתנה. אפשר לשנות אותה בהגדרות הדפדפן.');
 const {data,error}=await supabase.functions.invoke('football-data',{body:{mode:'push-config'}});if(error||!data?.publicKey)throw new Error('שירות Push טרם הוגדר בשרת');
 const registration=await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`,{scope:import.meta.env.BASE_URL});await navigator.serviceWorker.ready;
 const key=data.publicKey.replace(/-/g,'+').replace(/_/g,'/');const bytes=Uint8Array.from(atob(key),c=>c.charCodeAt(0));
 const subscription=await registration.pushManager.getSubscription()??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes.buffer as ArrayBuffer});
 const saved=await supabase.from('push_subscriptions').upsert({endpoint:subscription.endpoint,user_id:userId,subscription:subscription.toJSON()});if(saved.error)throw saved.error;
 return subscription;
}
export async function disablePush(){
 if(!('serviceWorker' in navigator))return;const registration=await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);const subscription=await registration?.pushManager.getSubscription();
 if(subscription){const result=await supabase.from('push_subscriptions').delete().eq('endpoint',subscription.endpoint);if(result.error)throw result.error;await subscription.unsubscribe();}
}
