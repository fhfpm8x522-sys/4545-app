import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export function useFootballData(mode:'club'|'match',id:string|undefined,live=false) {
 return useQuery({queryKey:['football-data',mode,id],enabled:!!id,staleTime:mode==='club'?900000:30000,refetchInterval:live?30000:false,retry:1,queryFn:async()=>{
  const {data,error}=await supabase.functions.invoke('football-data',{body:{mode,id}});
  if(error)throw new Error('שירות נתוני הכדורגל אינו זמין כרגע');if(data?.error)throw new Error(data.error);return data as any;
 }});
}
