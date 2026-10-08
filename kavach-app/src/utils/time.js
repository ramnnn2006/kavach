// Firestore-era timestamps are gone; Supabase returns ISO strings. Still accept Date/number.
export function toMillis(ts) {
  if (!ts) return null;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number') return ts;
  const t = new Date(ts).getTime();
  return Number.isNaN(t) ? null : t;
}

/** "Just now" / "4 min ago" … — pass `t` from useT() for translated output. */
export function timeAgo(ts, now = Date.now(), t) {
  const ms = toMillis(ts);
  const tr = (key, n) => (t ? t(`common.${key}`, { n }) : { justNow: 'Just now', minAgo: `${n} min ago`, hAgo: `${n} h ago`, dAgo: `${n} d ago` }[key]);
  if (ms == null) return tr('justNow');
  const mins = Math.max(0, Math.floor((now - ms) / 60000));
  if (mins < 1) return tr('justNow');
  if (mins < 60) return tr('minAgo', mins);
  if (mins < 1440) return tr('hAgo', Math.floor(mins / 60));
  return tr('dAgo', Math.floor(mins / 1440));
}

/** Minutes between two timestamps (null if either missing). */
export function minutesBetween(a, b) {
  const x = toMillis(a); const y = toMillis(b);
  if (x == null || y == null) return null;
  return Math.max(0, Math.round((y - x) / 60000));
}

/** "14:05" in the user's locale. */
export function clock(ts, lang = 'en') {
  const ms = toMillis(ts);
  if (ms == null) return '';
  return new Date(ms).toLocaleTimeString(lang === 'ta' ? 'ta-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' });
}

/** "8 Oct, 14:05" */
export function dateTime(ts, lang = 'en') {
  const ms = toMillis(ts);
  if (ms == null) return '';
  return new Date(ms).toLocaleString(lang === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
