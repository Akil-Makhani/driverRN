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
} as const;
