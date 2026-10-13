import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "איפוס סיסמה — 45:45" },
      { name: "description", content: "בחירת סיסמה חדשה לחשבון 45:45 שלך." },
      { property: "og:title", content: "איפוס סיסמה — 45:45" },
      { property: "og:description", content: "בחירת סיסמה חדשה לחשבון 45:45 שלך." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }
    if (password !== confirm) {
      toast.error("הסיסמאות אינן תואמות");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("הסיסמה עודכנה");
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <form onSubmit={submit} className="panel space-y-4 p-6">
        <div className="display-title text-4xl text-club">45:45</div>
        <h1 className="text-lg font-bold">בחירת סיסמה חדשה</h1>
        <div className="space-y-1.5">
          <Label>סיסמה חדשה</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>אימות סיסמה</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <Button type="submit" variant="club" size="xl" disabled={busy}>
          עדכון סיסמה
        </Button>
      </form>
    </div>
  );
}
