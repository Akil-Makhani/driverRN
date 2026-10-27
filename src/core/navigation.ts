/**
 * Navigation across the signed-in / signed-out boundary.
 *
 * `router.replace` swaps only the top screen, so whatever was under it stays:
 * login → OTP → replace('/dashboard') leaves [login, dashboard], and the
 * hardware back button on the dashboard opens login again. Logging out from
 * profile had the mirror problem — [dashboard, login] — so back from login
 * walked a signed-out driver into the dashboard.
 *
 * Crossing that boundary therefore clears the stack first: the destination
 * becomes the only screen, and back from it closes the app.
 */
import { router, type Href } from 'expo-router';

export function resetTo(href: Href) {
  // Both calls go through expo-router's routing queue, which runs them in
  // order: pop to the root screen, then swap it for the destination.
  if (router.canDismiss()) router.dismissAll();
  router.replace(href);
}
