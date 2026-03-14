export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "tani";
  if (mins < 60) return `${mins} min me pare`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ore me pare`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} dite me pare`;
  if (days < 30) return `${Math.floor(days / 7)} jave me pare`;
  return `${Math.floor(days / 30)} muaj me pare`;
}

export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(dateStr).toLocaleDateString("sq-AL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("sq-AL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
