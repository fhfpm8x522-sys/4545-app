import { createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StaffMembership } from "@/lib/session";

export type AdminCtx = {
  userId: string;
  clubId: string | null;
  setClubId: (id: string) => void;
  memberships: StaffMembership[];
  permissions: Set<string>;
  can: (perm: string) => boolean;
};
export const AdminContext = createContext<AdminCtx | null>(null);
export function useAdmin() { const ctx=useContext(AdminContext); if(!ctx) throw new Error("useAdmin outside admin"); return ctx; }

export async function audit(entry: { actorId:string; action:string; entityType:string; entityId?:string|null; clubId?:string|null; before?:unknown; after?:unknown }) {
  const { error } = await supabase.rpc("write_audit", {
    p_action: entry.action,
    p_entity_type: entry.entityType,
    p_entity_id: entry.entityId ?? "",
    p_club_id: entry.clubId ?? null,
    p_before: entry.before ?? null,
    p_after: entry.after ?? null,
  });
  if (error) console.warn("audit failed", error.message);
}
