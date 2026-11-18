// The app's error toasts, shown when an API call behind a screen fails. Two wordings exist:
// "Something went wrong. Please try again later." (the app's own) and the server's generic
// "The server encountered an internal error ..." (an unhandled 500 passed through).
import { Page, expect } from '@playwright/test';

export const errorToast = (page: Page) => page.getByText(/Something went wrong|server encountered an internal error/);

// Wait for the screen to finish loading (no spinners), then fail if it shows any error toast.
// `what` names the screen in the error.
export async function expectNoErrorToast(page: Page, what: string) {
  await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 60_000 }).catch(() => {});
  const toasts = errorToast(page);
  // Toasts can come a moment after the spinners stop
  await toasts.first().waitFor({ timeout: 3_000 }).catch(() => {});
  const texts = (await toasts.allInnerTexts()).map(t => t.trim());
  if (texts.length) throw new Error(`${what} shows ${texts.length} error toast(s): ${[...new Set(texts)].map(t => `"${t}"`).join(', ')}`);
}
