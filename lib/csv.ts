export type CsvValue = string | number | null | undefined;

/**
 * Minimal RFC-4180 CSV builder. Enough for admin exports, no dependency.
 */
export function toCSV(headers: string[], rows: CsvValue[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

function csvCell(value: CsvValue): string {
  const s = value == null ? '' : String(value);
  // Spreadsheets evaluate a cell starting with these as a formula, so a crafted
  // subject line becomes code on open. Prefix it to keep it inert text.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
