import type { Match, Profile } from './app-types';
export function matchCalendar(match: Match, createdAt?: string): string;
export function attendedResult(match: Match, supportedClubId: string | null | undefined): 'win' | 'draw' | 'loss' | null;
export function publicMatchCard(match: Match): {home: string; away: string; competition: string; kickoff: string; score: string | null};
export function personalSnapshot(user: {id: string; email?: string | undefined}, profile: Profile, records: Record<string, any[]>, createdAt?: string): object;
