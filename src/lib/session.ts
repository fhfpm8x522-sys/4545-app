import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Club, Profile } from "@/lib/app-types";

export type { Club, Profile } from "@/lib/app-types";

export type StaffMembership = {
  id: string;
  user_id: string;
  role_id: string;
  approval_level: number;
  public_badge: string | null;
  suspended_at: string | null;
  role: { id: string; key: string; name_he: string } | null;
  scopes: Array<{ club_id: string }>;
};

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoading(false);
      if (["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) queryClient.invalidateQueries();
    });
    supabase.auth.getSession().then(async ({ data }) => {
      let next=data.session;
      if(next){
        const verified=await supabase.auth.getUser();
        if(verified.error&&[400,401,403,404].includes(Number(verified.error.status))){
          // A locally cached token must not keep a deleted/revoked account signed in.
          await supabase.auth.signOut({scope:'local'});
          queryClient.clear();
          next=null;
        }
      }
      if (!active) return;
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  return { session, user: session?.user ?? null, loading };
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: raw, error } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      if (error) throw error;
      if (!raw) return null;

      let club: Club | null = null;
      if (raw.favorite_club_id) {
        const result = await supabase.from("clubs").select("*").eq("id", raw.favorite_club_id).maybeSingle();
        if (result.error) throw result.error;
        club = (result.data as Club | null) ?? null;
      }
      return { ...(raw as Profile), club } as Profile & { club: Club | null };
    },
  });
}

export function useStaffMemberships(userId: string | undefined) {
  return useQuery({
    queryKey: ["staff", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_memberships")
        .select("id,user_id,role_id,approval_level,public_badge,suspended_at,role:roles(id,key,name_he),scopes:staff_club_scopes(club_id)")
        .eq("user_id", userId!)
        .is("suspended_at", null);
      if (error) throw error;
      return (data ?? []) as unknown as StaffMembership[];
    },
  });
}

export const CLUB_CHANGE_COOLDOWN_DAYS = 30;

export function daysUntilClubChange(profile: Profile | null | undefined) {
  if (!profile?.last_club_change_at) return 0;
  const last = new Date(profile.last_club_change_at).getTime();
  const elapsed = (Date.now() - last) / 86400000;
  return Math.max(0, Math.ceil(CLUB_CHANGE_COOLDOWN_DAYS - elapsed));
}
