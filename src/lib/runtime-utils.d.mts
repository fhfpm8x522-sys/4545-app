export function assertResults(...results: Array<{error?: unknown; data?: unknown}>): void;
export function appRedirectUrl(origin: string, base: string, path?: string): string;
export function nextMatch<T extends {status: string; kickoff: string}>(matches: T[], now?: number): T | null;
export function pickWidgetSlot<T extends {override_date: string | null}>(slots: T[], today: string): T | null;
export function publicClientKey(key: string): string;
export function oneRelation<T>(value: T | T[] | null | undefined): T | null;
