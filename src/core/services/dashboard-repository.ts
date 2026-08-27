/** Port of lib/repository/dashboard_repository.dart. */
import { ApiService } from '../api/api-service';
import { ApiUrls } from '../api/endpoints';
import { updateSessionDutyStatus } from '../session';
import type { CommonResponse } from '@/types/api';
import {
  type DutyStatusChangeResponse,
  parseDutyStatusChangeResponse,
} from '@/types/user';
import {
  type FileAttachmentModel,
  type PresignedUrlResponse,
  type ProductDifferenceRequest,
  type ProductResponse,
  type TripDetailsResponse,
  type TripIdModel,
  type TripListResponse,
  fileAttachmentToJson,
  parsePresignedUrlResponse,
  parseProductResponse,
  parseTripDetailsResponse,
  parseTripListResponse,
  productDifferenceRequestToJson,
} from '@/types/trip';

export const DashboardRepository = {
  async setDuty(dutyEnabled: boolean): Promise<DutyStatusChangeResponse> {
    const model = parseDutyStatusChangeResponse(
      await ApiService.put(ApiUrls.duty, { dutyStatus: dutyEnabled ? 'on' : 'off' }),
    );
    // Keep the session's dutyStatus in step so the app bar switch reflects the
    // server's answer rather than the optimistic tap.
    updateSessionDutyStatus(model.data?.dutyStatus);
    return model;
  },

  async getTrips(): Promise<TripListResponse> {
    return parseTripListResponse(await ApiService.get(ApiUrls.listTrips));
  },

  async getTripDetails(tripId: string): Promise<TripDetailsResponse> {
    return parseTripDetailsResponse(
      await ApiService.get(ApiUrls.tripDetails(tripId)),
    );
  },

  async statusChanged(tripId: string, status: string): Promise<TripDetailsResponse> {
    return parseTripDetailsResponse(
      await ApiService.patch(ApiUrls.tripStatus(tripId, status)),
    );
  },

  async updateTrip(
    tripId: string,
    difference: ProductDifferenceRequest,
  ): Promise<TripDetailsResponse> {
    return parseTripDetailsResponse(
      await ApiService.patch(
        ApiUrls.tripDetails(tripId),
        productDifferenceRequestToJson(difference),
      ),
    );
  },

  async getProduct(): Promise<ProductResponse> {
    return parseProductResponse(await ApiService.get(ApiUrls.getProduct));
  },

  async deliverAll(model: TripIdModel): Promise<TripDetailsResponse> {
    return parseTripDetailsResponse(
      await ApiService.patch(
        ApiUrls.deliverAll,
        model.tripIds ? { tripIds: model.tripIds } : {},
      ),
    );
  },

  async uploadSignedUrl(args: {
    fileName: string;
    contentType: string;
    documentType: string;
    tripId: string;
  }): Promise<PresignedUrlResponse> {
    return parsePresignedUrlResponse(
      await ApiService.post(ApiUrls.uploadUrl, {
        fileName: args.fileName,
        contentType: args.contentType,
        documentType: args.documentType,
        resourceId: args.tripId,
      }),
    );
  },

  async removeFromS3(path: string): Promise<CommonResponse> {
    // The key goes in the query string, so it must be encoded — a raw "/" in
    // the path is fine but spaces and "+" in a filename are not.
    return await ApiService.delete(
      `${ApiUrls.deleteDocument}${encodeURIComponent(path)}`,
    );
  },

  async inTransit(
    tripId: string,
    status: string,
    files: FileAttachmentModel,
  ): Promise<TripDetailsResponse> {
    return parseTripDetailsResponse(
      await ApiService.patch(
        ApiUrls.tripStatus(tripId, status),
        fileAttachmentToJson(files),
      ),
    );
  },
} as const;
