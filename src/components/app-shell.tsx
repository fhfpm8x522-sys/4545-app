import { NotificationsInbox } from "@/components/notifications-inbox";
import { QueryFeedback } from "@/components/query-feedback";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, CalendarDays, Home, Newspaper, Shield, User } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useClubAccent } from "@/lib/club-theme";
import { useProfile, useSession, useStaffMemberships } from "@/lib/session";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "בית", icon: Home },
  { to: "/matches", label: "משחקים", icon: CalendarDays },
  { to: "/club", label: "הקבוצה", icon: Shield },
  { to: "/news", label: "חדשות", icon: Newspaper },
  { to: "/me", label: "אני", icon: User },
] as const;

export function AppShell({
  children,
  title,
  showHeader = true,
}: {
  children?: ReactNode;
  title?: string;
  showHeader?: boolean;
}) {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const { data: profile, isLoading: profileLoading, error: profileError, refetch: retryProfile } = useProfile(user?.id);
  const { data: staff } = useStaffMemberships(user?.id);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useClubAccent(profile?.club ?? null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    if (!profileError && !profileLoading && (!profile || (profile.onboarding_completed === false && (!profile.display_name || !profile.username)) || !profile.favorite_club_id)) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [loading, user, profile, profileLoading, profileError, navigate]);

  if (loading || !user || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="display-title animate-pulse text-4xl text-club">45:45</span>
      </div>
    );
  }

  if (profileError) return <main className="mx-auto max-w-md p-6"><QueryFeedback error={profileError} retry={retryProfile} /><Link to="/offline" className="mt-4 block text-sm text-club underline">נתונים אחרונים שנשמרו במכשיר</Link></main>;

  return (
    <div className="min-h-screen bg-background pb-24">
      {showHeader && (
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
            <Link to="/" className="display-title text-2xl text-club">
              45:45
            </Link>
            {title && <span className="text-sm font-medium text-muted-foreground">{title}</span>}
            <div className="flex items-center gap-1">
              {(staff?.length ?? 0) > 0 && (
                <Link
                  to="/admin"
                  className="rounded-full border border-club/40 px-3 py-1 text-[11px] font-semibold text-club"
                >
                  ניהול
                </Link>
              )}
              <NotificationsInbox userId={user.id} />
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-2xl px-4 py-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-stretch justify-between px-2">
          {TABS.map((tab) => {
            const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-club" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "drop-shadow-[0_0_8px_var(--club)]")} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
