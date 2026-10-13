export function assertResults(...results) {
  for (const result of results) if (result?.error) throw result.error;
}

export function oneRelation(value) {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

export function appRedirectUrl(origin, base, path = '') {
  return new URL(String(base || '/').replace(/\/?$/, '/') + path.replace(/^\//, ''), origin).href;
}

export function nextMatch(matches, now = Date.now()) {
  return [...matches].filter(m => m.status === 'live' || (m.status === 'scheduled' && Date.parse(m.kickoff) >= now))
    .sort((a, b) => Number(b.status === 'live') - Number(a.status === 'live') || Date.parse(a.kickoff) - Date.parse(b.kickoff))[0] ?? null;
}

export function pickWidgetSlot(slots, today) {
  return slots.find(slot => slot.override_date === today) ?? slots.find(slot => !slot.override_date) ?? null;
}

export function publicClientKey(key) {
  if (!key || key.startsWith('sb_secret_')) throw new Error('A public Supabase client key is required');
  if (key.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role !== 'anon') throw new Error('Only anon JWT keys may be used in the browser');
    } catch { throw new Error('Only a publishable or anon Supabase key may be used in the browser'); }
  } else if (!key.startsWith('sb_publishable_')) throw new Error('A public Supabase client key is required');
  return key;
}
