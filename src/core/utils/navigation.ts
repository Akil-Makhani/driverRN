import type { Href, useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/**
 * Makes `href` the only screen on the stack.
 *
 * A plain replace() swaps just the top screen, so after login the login page
 * stayed underneath the dashboard and the phone's back button returned to it;
 * after logout the dashboard stayed underneath the login page. Clearing the
 * stack first means back from here leaves the app instead.
 */
export function resetTo(router: Router, href: Href) {
  if (router.canDismiss()) router.dismissAll();
  router.replace(href);
}
