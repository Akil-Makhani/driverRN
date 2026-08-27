/** Port of lib/repository/notification_repository.dart. */
import { ApiService } from '../api/api-service';
import { ApiUrls } from '../api/endpoints';
import type { CommonResponse } from '@/types/api';
import {
  type NotificationCountResponse,
  type NotificationResponse,
  parseNotificationCountResponse,
  parseNotificationResponse,
} from '@/types/notification';

export const NotificationRepository = {
  async getNotification(page: number, perPage: number): Promise<NotificationResponse> {
    return parseNotificationResponse(
      await ApiService.get(ApiUrls.notificationPage(page, perPage)),
    );
  },

  async notificationClick(notificationId: string): Promise<CommonResponse> {
    return await ApiService.patch(`${ApiUrls.notificationClick}${notificationId}`);
  },

  async clearedAllNotification(): Promise<CommonResponse> {
    return await ApiService.patch(ApiUrls.clearedAll);
  },

  async notificationCount(): Promise<NotificationCountResponse> {
    return parseNotificationCountResponse(
      await ApiService.get(ApiUrls.notificationCount),
    );
  },
} as const;
