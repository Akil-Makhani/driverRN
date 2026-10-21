import { create } from 'zustand';

import { hasChosenLanguage, isLanguage, useLanguageStore } from '@/core/i18n/language';
import { Preference } from '@/core/storage/preference';
import type { AppUser } from '@/types/user';

/**
 * Port of lib/services/user_session.dart.
 *
 * Dart used a ChangeNotifier singleton reachable both as `UserSession()` from
 * repositories and via Provider from widgets. A Zustand store gives the same
 * two doors: `useSession(...)` in components, `useSession.getState()` outside
 * React — so the repository layer keeps writing to it directly, as before.
 */
interface SessionState {
  user: AppUser | null;
  isLoggedIn: () => boolean;
  updateSession: (user: AppUser | null) => void;
  clearSession: () => void;
}

export const useSession = create<SessionState>((set, get) => ({
  user: null,
  isLoggedIn: () => get().user != null,
  updateSession: (user) => {
    set({ user });
    Preference.setTestLocationAccess(user?.testLocationAccess === true);
    // The language picked on this phone wins: a driver who chose Gujarati
    // before logging in must not be switched to the admin's default the
    // moment the profile arrives. UserRepository pushes the phone's choice up
    // instead. The server's copy is only taken by a phone that has none.
    if (!hasChosenLanguage() && isLanguage(user?.language)) {
      useLanguageStore.getState().setLanguage(user.language);
    }
  },
  clearSession: () => {
    set({ user: null });
    Preference.setTestLocationAccess(false);
  },
}));

/**
 * Mirrors DashboardRepository.setDuty's write-back: after a duty toggle the
 * server echoes the user, and only `dutyStatus` is merged into the session so
 * the switch and any header bound to it re-render.
 */
export function updateSessionDutyStatus(dutyStatus?: string): void {
  if (dutyStatus == null) return;
  const { user, updateSession } = useSession.getState();
  if (user) updateSession({ ...user, dutyStatus });
}
