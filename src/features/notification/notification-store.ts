/** Replaces lib/screens/notification/view_model/notification_view_model.dart. */
import { create } from 'zustand';

import { NotificationRepository } from '@/core/services/notification-repository';
import type { NotificationDoc } from '@/types/notification';

const PER_PAGE = 10;

interface NotificationState {
  isLoading: boolean;
  currentPage: number;
  hasNextPage: boolean;
  notificationCount: number;
  notificationList: NotificationDoc[];

  /** Appends the next page; a no-op while loading or once exhausted. */
  getNotifications: () => Promise<void>;
  /** Discards the list so the next fetch starts from page 1. */
  reset: () => void;
  markClicked: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  getNotificationCount: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  isLoading: false,
  currentPage: 1,
  hasNextPage: true,
  notificationCount: 0,
  notificationList: [],

  async getNotifications() {
    const { isLoading, hasNextPage, currentPage } = get();
    if (isLoading || !hasNextPage) return;

    set({ isLoading: true });
    try {
      const response = await NotificationRepository.getNotification(
        currentPage,
        PER_PAGE,
      );
      const docs = response.data?.docs ?? [];
      if (docs.length === 0) {
        set({ hasNextPage: false });
      } else {
        set({
          notificationList: [...get().notificationList, ...docs],
          currentPage: currentPage + 1,
        });
      }
    } catch (e) {
      if (__DEV__) console.log('getNotifications failed:', e);
    }
    set({ isLoading: false });
  },

  reset: () => set({ notificationList: [], currentPage: 1, hasNextPage: true }),

  async markClicked(notificationId) {
    try {
      await NotificationRepository.notificationClick(notificationId);
      // Flip the flag locally rather than refetching page 1: Dart called
      // getNotifications() here, which appended a duplicate page on top of the
      // list it had already loaded.
      set({
        notificationList: get().notificationList.map((n) =>
          n.id === notificationId ? { ...n, hasClicked: true } : n,
        ),
      });
      await get().getNotificationCount();
    } catch (e) {
      if (__DEV__) console.log('markClicked failed:', e);
    }
  },

  async clearAll() {
    set({ isLoading: true });
    try {
      await NotificationRepository.clearedAllNotification();
      // Rebuild from page 1 — "clear all" marks every row read server-side, so
      // the cached pages are all stale.
      set({
        notificationList: [],
        currentPage: 1,
        hasNextPage: true,
        isLoading: false,
      });
      await get().getNotifications();
      await get().getNotificationCount();
      return;
    } catch (e) {
      if (__DEV__) console.log('clearAll failed:', e);
    }
    set({ isLoading: false });
  },

  async getNotificationCount() {
    try {
      const response = await NotificationRepository.notificationCount();
      set({ notificationCount: response.data ?? 0 });
    } catch (e) {
      if (__DEV__) console.log('getNotificationCount failed:', e);
    }
  },
}));
