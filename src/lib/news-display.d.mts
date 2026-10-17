export type NewsDisplayItem = {
  title?: unknown; summary?: unknown; body?: unknown; source_excerpt?: unknown;
  source_url?: unknown; source_name?: unknown; source_author?: unknown;
  source_published_at?: unknown; published_at?: unknown; content_kind?: unknown;
  image_url?: unknown; image_kind?: unknown; image_credit?: unknown;
  image_source_url?: unknown; image_license?: unknown; image_license_url?: unknown;
  image_rights_verified?: unknown; image_candidate_url?: unknown;
};
export function meaningfulNewsText(value: unknown): string;
export function safeNewsUrl(value: unknown): string | null;
export function newsPresentation(item?: NewsDisplayItem): {
  summary: string; body: string; kind: 'original' | 'source_excerpt' | 'legacy';
  sourceUrl: string | null; sourceName: string; sourceDate: string | null;
  publishedDate: string | null; author: string;
};
export function verifiedNewsImage(item?: NewsDisplayItem): {
  url: string; sourceUrl: string; credit: string; license: string;
  licenseUrl: string | null; kind: 'source' | 'source_preview';
} | null;
