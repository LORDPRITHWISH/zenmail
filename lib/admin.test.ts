// Run with: npx tsx lib/admin.test.ts
import assert from 'node:assert/strict';
import { toCSV } from './csv';
import { bucketTrend, dayKeys } from './trend';

// ── csv ───────────────────────────────────────────────────────────────────────

// Plain values pass through; rows are CRLF-separated.
assert.equal(toCSV(['a', 'b'], [['1', '2']]), 'a,b\r\n1,2');

// Commas, quotes and newlines force quoting; inner quotes double up.
assert.equal(toCSV(['s'], [['a,b']]), 's\r\n"a,b"');
assert.equal(toCSV(['s'], [['say "hi"']]), 's\r\n"say ""hi"""');
assert.equal(toCSV(['s'], [['line1\nline2']]), 's\r\n"line1\nline2"');

// null/undefined become empty, numbers stringify, 0 is not blanked.
assert.equal(toCSV(['a', 'b', 'c'], [[null, undefined, 0]]), 'a,b,c\r\n,,0');

// A formula-looking subject is neutralised before it reaches a spreadsheet.
assert.equal(toCSV(['s'], [['=1+1']]), "s\r\n'=1+1");
assert.equal(toCSV(['s'], [['@SUM(A1)']]), "s\r\n'@SUM(A1)");
// Neutralising must not defeat quoting when both apply.
assert.equal(toCSV(['s'], [['=a,b']]), 's\r\n"\'=a,b"');

// ── trend ─────────────────────────────────────────────────────────────────────

const now = new Date('2026-08-29T15:30:00Z');

// The window ends on today and is `days` long, oldest first.
assert.deepEqual(dayKeys(3, now), ['2026-08-27', '2026-08-28', '2026-08-29']);

// Late-UTC-day timestamps still bucket into today, not tomorrow.
assert.equal(dayKeys(1, new Date('2026-08-29T23:59:59Z'))[0], '2026-08-29');

// Missing days are zero-filled rather than dropped.
const series = bucketTrend(
  [
    { day: '2026-08-27', folder: 'inbox', count: 4 },
    { day: '2026-08-29', folder: 'sent', count: 7 },
  ],
  3,
  now
);
assert.deepEqual(series, [
  { day: '2026-08-27', received: 4, sent: 0 },
  { day: '2026-08-28', received: 0, sent: 0 },
  { day: '2026-08-29', received: 0, sent: 7 },
]);

// Rows outside the window are ignored, not folded into an edge day.
assert.deepEqual(
  bucketTrend([{ day: '2026-01-01', folder: 'inbox', count: 99 }], 3, now).map((p) => p.received),
  [0, 0, 0]
);

// Non-sent folders all count as received, accumulating rather than overwriting.
const merged = bucketTrend(
  [
    { day: '2026-08-29', folder: 'inbox', count: 2 },
    { day: '2026-08-29', folder: 'archive', count: 3 },
  ],
  1,
  now
);
assert.equal(merged[0].received, 5);

console.log('✓ admin csv + trend ok');
