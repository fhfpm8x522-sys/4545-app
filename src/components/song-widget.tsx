import { useQuery } from "@tanstack/react-query";
import { Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const SLOT_HOURS = 3;
export function currentSlotHour(date = new Date()) { return Math.floor(date.getHours() / SLOT_HOURS) * SLOT_HOURS; }

export function SongWidget({ clubId, clubName }: { clubId: string; clubName: string }) {
  const slotHour = currentSlotHour();
  const { data } = useQuery({
    queryKey: ["widget-line", clubId, slotHour],
    queryFn: async () => {
      const hhmm = `${String(slotHour).padStart(2, "0")}:00:00`;
      const { data: slot } = await supabase
        .from("widget_schedule")
        .select("chant_id,enabled,override_date")
        .eq("club_id", clubId)
        .eq("slot_time", hhmm)
        .eq("enabled", true)
        .maybeSingle();

      if (slot?.chant_id) {
        const { data: chant } = await supabase.from("chants").select("id,line,title,enabled").eq("id", slot.chant_id).eq("enabled", true).maybeSingle();
        if (chant) return chant;
      }

      const { data: chants } = await supabase
        .from("chants")
        .select("id,line,title")
        .eq("club_id", clubId)
        .eq("enabled", true)
        .order("sort_order");
      if (!chants?.length) return null;
      const slotIndex = Math.floor(Date.now() / (SLOT_HOURS * 3600000));
      return chants[slotIndex % chants.length];
    },
  });

  if (!data) return null;
  return (
    <div className="panel relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -left-8 -top-8 size-32 rounded-full bg-club/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-club"><Quote className="size-4" /> WIDGET · {clubName}</div>
        <p className="mt-3 text-lg font-black leading-relaxed">{data.line}</p>
        {data.title && <p className="mt-2 text-xs text-muted-foreground">{data.title}</p>}
        <p className="mt-3 text-[10px] text-muted-foreground">שירי אוהדים אמיתיים בלבד · מתחלף בערך כל 3 שעות</p>
      </div>
    </div>
  );
}
