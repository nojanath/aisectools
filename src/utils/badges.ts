export function getUpdateBadge(date: string): { text: string; color: string } {
  const today = new Date();
  const updatedDate = new Date(date);
  const diffDays = Math.floor((today.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));

  // Slightly stronger fills (/20) and rings (/30-/40) since the card surface is now
  // #0f1d33 (lifted) rather than near-pure-black, so badges need a touch more presence
  // to read at the same perceived weight.
  if (diffDays <= 7) return { text: 'Updated this week', color: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40' };
  if (diffDays <= 30) return { text: 'Updated last month', color: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30' };
  if (diffDays <= 365) return { text: 'Updated this year', color: 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30' };
  if (diffDays <= 730) return { text: 'Updated last year', color: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30' };
  if (diffDays <= 1095) return { text: 'Updated 2 years ago', color: 'bg-amber-700/20 text-amber-200 ring-1 ring-amber-700/40' };
  if (diffDays <= 1460) return { text: 'Updated 3 years ago', color: 'bg-rose-700/20 text-rose-300 ring-1 ring-rose-700/40' };
  if (diffDays <= 1825) return { text: 'Updated 4 years ago', color: 'bg-rose-800/25 text-rose-300 ring-1 ring-rose-800/50' };
  return { text: 'Updated 5+ years ago', color: 'bg-rose-900/30 text-rose-300 ring-1 ring-rose-900/60' };
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}
