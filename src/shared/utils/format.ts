export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(iso: string, now: number = Date.now()): string {
  const date = new Date(iso).getTime();
  if (Number.isNaN(date)) return iso;
  const diffMs = now - date;
  const diffSec = Math.round(diffMs / 1000);
  if (Math.abs(diffSec) < 60) return 'just now';
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  return `${diffHr}h ago`;
}

export function isSlaBreached(slaDueAt: string, now: number = Date.now()): boolean {
  return new Date(slaDueAt).getTime() < now;
}

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
