/** Port of lib/repository/trip_history_repository.dart. */
import { ApiService } from '../api/api-service';
import { ApiUrls } from '../api/endpoints';
import {
  type TripHistoryResponse,
  parseTripHistoryResponse,
} from '@/types/history';

export const TripHistoryRepository = {
  async tripHistory(page: number, perPage: number): Promise<TripHistoryResponse> {
    return parseTripHistoryResponse(
      await ApiService.get(ApiUrls.historyPage(page, perPage)),
    );
  },

  /**
   * Same shape as tripHistory, filtered to cancelled trips server-side.
   * Filtering here instead would break paging — a page of ten trips can hold
   * no cancelled ones at all and the list would look finished.
   */
  async cancelledTrips(page: number, perPage: number): Promise<TripHistoryResponse> {
    return parseTripHistoryResponse(
      await ApiService.get(ApiUrls.cancelledPage(page, perPage)),
    );
  },
} as const;
