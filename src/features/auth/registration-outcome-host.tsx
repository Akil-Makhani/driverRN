/**
 * The one place the registration popup is rendered, and the one place its
 * buttons decide anything.
 *
 * Every screen in the flow used to render its own copy of the dialog off the
 * same store field. Four copies of one popup is three too many: while the app
 * moved between two of those screens both were mounted for a moment, so the
 * driver saw a second card behind the first, and each copy was free to drift —
 * one offering a button another did not. Mounted once at the root, neither can
 * happen: there is a single popup with a single set of actions, and it survives
 * navigation rather than being handed between screens.
 *
 * Each outcome has exactly one thing to do, which is why nothing here is
 * passed in from a screen:
 *   approved    → open the app, trading the device secret for a session
 *   rejected    → back to login; registering again starts there
 *   hasAccount  → back to login, where the account they already have is used
 *   required    → the registration they have not started yet
 *   exists      → nothing: the form behind it is what needs correcting
 */
import { useRouter } from 'expo-router';

import { RegistrationStatusDialog } from '@/components/registration-status-dialog';
import { useSession } from '@/core/session';
import { useAuthStore } from '@/features/auth/auth-store';
import { useRegistrationStore } from '@/features/auth/registration-store';
import { useDashboardStore } from '@/features/dashboard/dashboard-store';

export function RegistrationOutcomeHost() {
  const router = useRouter();
  const outcome = useRegistrationStore((s) => s.outcome);
  // Being mounted at the root means being mounted on the dashboard too, and a
  // driver already inside the app has nothing to learn from a registration
  // popup — a stray decision push would otherwise cover their trips, and its
  // button would carry them out to login.
  const isSignedIn = useSession((s) => s.user != null);

  const dismiss = () => useRegistrationStore.getState().dismissOutcome();

  const goToLogin = () => {
    dismiss();
    useRegistrationStore.getState().clearPending();
    router.replace('/(auth)/login');
  };

  /**
   * Approval opens the app itself: the secret this phone sent with the
   * registration is traded for a session, so being approved lands the driver
   * on the dashboard instead of at a login screen asking them to prove — with
   * a second OTP — the number they proved to register.
   *
   * Login is the fallback, not the plan: a phone that did not submit this
   * registration has no secret to trade, and nothing about being approved
   * stops them logging in the ordinary way.
   */
  const enterApp = async () => {
    dismiss();
    const mobile = useRegistrationStore.getState().pendingMobile ?? '';

    if (await useAuthStore.getState().claimApprovedSession(mobile)) {
      useDashboardStore.getState().syncDutyFromSession();
      router.replace('/dashboard');
      return;
    }

    goToLogin();
  };

  const onDismiss = () => {
    switch (outcome?.kind) {
      case 'approved':
        void enterApp();
        return;
      case 'rejected':
      case 'hasAccount':
        goToLogin();
        return;
      default:
        // 'exists' and 'required' both leave the driver where they are: one on
        // a form with a number to correct, the other on login with a REGISTER
        // NOW button they may not have wanted to press.
        dismiss();
    }
  };

  return (
    <RegistrationStatusDialog
      outcome={isSignedIn ? null : outcome}
      onDismiss={onDismiss}
      onGoToLogin={goToLogin}
      onRegister={() => {
        dismiss();
        router.push('/(auth)/register-mobile');
      }}
    />
  );
}
