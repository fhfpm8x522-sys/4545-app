import { useEffect } from "react";

export type ClubAccent = {
  accent_color?: string | null;
  accent_foreground?: string | null;
  accent_secondary?: string | null;
};

function normalizeCssColor(value?: string | null) {
  if (!value) return undefined;
  return value.trim();
}

export function useClubAccent(club: ClubAccent | null | undefined) {
  useEffect(() => {
    const root = document.documentElement;
    const accent = normalizeCssColor(club?.accent_color);
    if (!accent) {
      root.style.removeProperty("--club");
      root.style.removeProperty("--club-foreground");
      root.style.removeProperty("--club-2");
      return;
    }
    root.style.setProperty("--club", accent);
    root.style.setProperty("--club-foreground", normalizeCssColor(club?.accent_foreground) ?? "#ffffff");
    root.style.setProperty("--club-2", normalizeCssColor(club?.accent_secondary) ?? accent);
  }, [club?.accent_color, club?.accent_foreground, club?.accent_secondary]);
}

export function clubAccentStyle(club: ClubAccent): React.CSSProperties {
  return {
    ["--club" as string]: normalizeCssColor(club.accent_color),
    ["--club-foreground" as string]: normalizeCssColor(club.accent_foreground) ?? "#ffffff",
    ["--club-2" as string]: normalizeCssColor(club.accent_secondary) ?? normalizeCssColor(club.accent_color),
  };
}
