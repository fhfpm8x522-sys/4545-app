import { useState } from 'react';
import { ArrowUpLeft } from 'lucide-react';
import { meaningfulNewsText, newsPresentation, verifiedNewsImage, type NewsDisplayItem } from '@/lib/news-display.mjs';
import { cn } from '@/lib/utils';

export function NewsImage({ item, compact = false, className }: { item: NewsDisplayItem; compact?: boolean; className?: string }) {
  const photo = verifiedNewsImage(item);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const visible = photo && failedUrl !== photo.url ? photo : null;
  if (!visible) return null;
  return <figure className={cn('min-w-0 overflow-hidden', className)}>
    <div className={cn('relative overflow-hidden bg-[#11151b]', compact ? 'size-full min-h-20' : 'aspect-video w-full')}>
      <a href={visible.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label="לתמונה בכתבה המקורית" className="block size-full"><img src={visible.url} alt={meaningfulNewsText(item.title)} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedUrl(visible.url)} className="size-full object-cover" /></a>
      {visible.kind === 'source_preview' && <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-[10px] text-white/90">תמונה מהכתבה במקור</span>}
    </div>
    {visible && !compact && <figcaption><NewsImageCredit item={item} /></figcaption>}
  </figure>;
}

export function NewsImageCredit({ item }: { item: NewsDisplayItem }) {
  const photo = verifiedNewsImage(item);
  return photo ? <div className="flex flex-wrap gap-x-2 gap-y-1 bg-surface-2 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
    <span>{photo.kind === 'source_preview' ? 'תמונת הכתבה:' : 'צילום:'} {photo.credit}</span>
    <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">מקור התמונה</a>
    {photo.licenseUrl ? <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{photo.license || 'רישיון התמונה'}</a> : <span>{photo.license}</span>}
  </div> : null;
}

function formattedDate(date: string) {
  return new Date(date).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
}

export function NewsSourceMeta({ item, compact = false }: { item: NewsDisplayItem; compact?: boolean }) {
  const p = newsPresentation(item);
  return <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground', compact ? 'text-[11px]' : 'text-xs leading-relaxed')}>
    <span dir="auto" className="max-w-full break-words">{p.sourceName}</span>
    {!compact && p.author && <span>· {p.author}</span>}
    {p.sourceDate ? <span>· פורסם במקור <time dateTime={p.sourceDate}>{formattedDate(p.sourceDate)}</time></span> : p.publishedDate ? <span>· פורסם ב־45:45 <time dateTime={p.publishedDate}>{formattedDate(p.publishedDate)}</time></span> : null}
    {!compact && p.sourceDate && p.publishedDate && <span className="basis-full">פורסם ב־45:45 <time dateTime={p.publishedDate}>{formattedDate(p.publishedDate)}</time></span>}
  </div>;
}

export function NewsContent({ item }: { item: NewsDisplayItem }) {
  const p = newsPresentation(item);
  return <div className="space-y-4">
    {(p.summary || p.body) && <p className="text-xs font-semibold text-club">{p.kind === 'source_excerpt' ? 'תקציר מהמקור' : p.kind === 'original' ? p.sourceUrl ? 'סיכום 45:45 על פי המקור' : 'כתבת 45:45' : 'פרטי הידיעה'}</p>}
    {p.summary && <p className="whitespace-pre-line text-lg font-medium leading-relaxed">{p.summary}</p>}
    {p.body && <div className="whitespace-pre-line break-words leading-8 text-foreground/90">{p.body}</div>}
    {!p.summary && !p.body && <p className="rounded-2xl border border-border bg-surface-2 p-4 text-sm leading-relaxed text-muted-foreground">תוכן הידיעה עדיין אינו זמין.{p.sourceUrl && ' אפשר לקרוא את הכתבה במקור.'}</p>}
    {p.sourceUrl && <a className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-club px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90" href={p.sourceUrl} target="_blank" rel="noopener noreferrer">לכתבה המלאה במקור <ArrowUpLeft className="size-4" aria-hidden="true" /></a>}
  </div>;
}
