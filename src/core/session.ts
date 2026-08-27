import { create } from 'zustand';

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
  updateSession: (user) => set({ user }),
  clearSession: () => set({ user: null }),
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
