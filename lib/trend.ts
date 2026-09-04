export interface TrendPoint {
  day: string; // YYYY-MM-DD, UTC
  received: number;
  sent: number;
}

/** Aggregate rows as returned by the $group stage in adminGetEmailTrend. */
export interface TrendRow {
  day: string;
  folder: string;
  count: number;
}

/**
 * The UTC day keys for the `days`-long window ending on the day `now` falls in.
 * Everything is UTC so these line up with Mongo's $dateToString output.
 */
export function dayKeys(days: number, now: Date = new Date()): string[] {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: days }, (_, i) =>
    new Date(start - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10)
  );
}

/** Fill sparse per-day counts into a dense, zero-padded series. */
export function bucketTrend(rows: TrendRow[], days: number, now: Date = new Date()): TrendPoint[] {
  const byDay = new Map(dayKeys(days, now).map((day) => [day, { day, received: 0, sent: 0 }]));

  for (const row of rows) {
    const point = byDay.get(row.day);
    if (!point) continue; // outside the window
    if (row.folder === 'sent') point.sent += row.count;
    else point.received += row.count;
  }

  return [...byDay.values()];
}
