// Reading tables and values like a person does: each value under its column header, numbers and times as shown.
import { Locator } from '@playwright/test';

// One row of a table: col("Rows Moved") gives the text under that header.
// Header texts are matched by start, since some headers carry extra controls (e.g. "Data Moved GB MB").
export async function readRow(table: Locator, row: Locator) {
  const headers = (await table.getByRole('columnheader').allInnerTexts()).map(h => h.trim().replace(/\s+/g, ' '));
  const cells = (await row.getByRole('cell').allInnerTexts()).map(c => c.trim().replace(/\s+/g, ' '));
  return (name: string) => {
    const i = headers.findIndex(h => h.startsWith(name));
    if (i < 0) throw new Error(`Table has no "${name}" column: ${headers.join(', ')}`);
    return cells[i];
  };
}

// "1,234" -> 1234; "-" (shown for 0) -> 0
export const uiNumber = (text: string, what: string) => {
  if (text.trim() === '-') return 0;
  const digits = text.replace(/[^\d]/g, '');
  if (!digits) throw new Error(`${what} shows "${text}", not a number`);
  return Number(digits);
};

// "2026-11-16 01:40:22 PM" (connector page, dashboard), "2026-11-18, 06:28:49 am" (runs tab) or "2026-11-16 13:40:22"
// -> ms. Screens show the account's time zone; compare them with each other, not with the clock (except loosely).
export const uiTime = (text: string, what: string) => {
  const m = text.trim().match(/^(\d{4})-(\d{2})-(\d{2}),?[ T](\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) throw new Error(`${what} shows "${text}", not a time this check can read`);
  let h = Number(m[4]);
  if (m[7]) h = (h % 12) + (/pm/i.test(m[7]) ? 12 : 0);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), h, Number(m[5]), Number(m[6])).getTime();
};
