// Firestore Timestamp | Date | number | ISO string | null → millis or null
export function toMillis(ts) {
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number') return ts;
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  const t = new Date(ts).getTime();
  return Number.isNaN(t) ? null : t;
}

// A null timestamp means the server time hasn't landed yet
export function timeAgo(ts, now = Date.now()) {
  const ms = toMillis(ts);
  if (ms == null) return 'Just now';
  const mins = Math.max(0, Math.floor((now - ms) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)} h ago`;
  return `${Math.floor(mins / 1440)} d ago`;
}
