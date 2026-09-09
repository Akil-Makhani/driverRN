/**
 * HTTP side of the broadcast dispatch flow.
 *
 * Accept and reject go over HTTP rather than the socket on purpose. The whole
 * feature turns on one question — did *I* get this order? — and a socket emit
 * is fire-and-forget: it gives no answer to await, no status to branch on, and
 * no way to tell "the server said no" from "the emit never arrived". A request
 * whose response *is* the verdict removes that ambiguity, and the atomic write
 * behind it is what actually settles the race.
 */
import { ApiService } from '../api/api-service';
import { ApiUrls } from '../api/endpoints';
import { AppException } from '../api/errors';
import type { CommonResponse } from '@/types/api';
import {
  type JobAcceptResponse,
  type JobOfferListResponse,
  type JobOutcome,
  parseJobAcceptResponse,
  parseJobOfferListResponse,
} from '@/types/job';
import type { LocationFix } from '@/types/location';

/**
 * The verdict on an accept, with the failure already classified.
 *
 * Returned rather than thrown because losing a race is a normal outcome, not
 * an error — every driver but one loses every offer. Making callers wrap it in
 * try/catch would put the common path in the exception handler.
 */
export type AcceptResult =
  | { won: true; tripId?: string }
  | { won: false; outcome: JobOutcome; message?: string };

/**
 * Maps a failed accept onto the reason the driver should be shown.
 *
 * Prefers the server's `code` and falls back to the HTTP status, so the app
 * behaves correctly against a server that sends only the status — and a new
 * code the app has not been taught yet degrades to the status rather than to
 * a wrong message.
 */
function classify(error: unknown): { outcome: JobOutcome; message?: string } {
  if (!(error instanceof AppException)) return { outcome: 'failed' };

  switch (error.code) {
    case 'JOB_ALREADY_TAKEN':
      return { outcome: 'taken' };
    case 'JOB_EXPIRED':
      return { outcome: 'expired' };
    case 'JOB_CANCELLED':
      return { outcome: 'cancelled' };
  }

  // 409 Conflict is the race itself: the row was already claimed.
  if (error.statusCode === 409) return { outcome: 'taken' };
  // 410 Gone: the offer window closed before the tap landed.
  if (error.statusCode === 410) return { outcome: 'expired' };
  // 404: the offer was withdrawn outright.
  if (error.statusCode === 404) return { outcome: 'cancelled' };

  return { outcome: 'failed', message: error.message };
}

export const JobRepository = {
  /**
   * Offers currently open to this driver.
   *
   * The socket is the fast path; this is how the app recovers from the gaps it
   * leaves — the driver was in a tunnel, the app was killed, duty was just
   * switched on, or an FCM wake-up arrived with no socket yet.
   */
  async getOpenJobs(): Promise<JobOfferListResponse> {
    return parseJobOfferListResponse(await ApiService.get(ApiUrls.openJobs));
  },

  /** Claims an offer. See AcceptResult for why losing is not thrown. */
  async accept(jobId: string): Promise<AcceptResult> {
    try {
      const response: JobAcceptResponse = parseJobAcceptResponse(
        await ApiService.post(ApiUrls.jobAccept(jobId)),
      );
      if (response.status === 'success') {
        return { won: true, tripId: response.data?.tripId };
      }
      // A 200 that is not "success" means the server declined in the envelope
      // rather than the status line. Treat it as a loss, not a crash.
      return { won: false, outcome: 'taken', message: response.message };
    } catch (e) {
      if (__DEV__) console.log('job accept failed:', e);
      return { won: false, ...classify(e) };
    }
  },

  /**
   * Declines an offer, so the server can stop offering it to this driver and
   * record the pass. Failure is swallowed: the offer is leaving the screen
   * either way, and it expires server-side regardless.
   */
  async reject(jobId: string): Promise<void> {
    try {
      await ApiService.post(ApiUrls.jobReject(jobId));
    } catch (e) {
      if (__DEV__) console.log('job reject failed:', e);
    }
  },

  /**
   * Fallback delivery for location fixes the socket could not carry. Batched,
   * because this runs on a tunnel-exit reconnect with a backlog to clear.
   */
  async pushLocations(fixes: LocationFix[]): Promise<CommonResponse> {
    return await ApiService.post(ApiUrls.locationPing, { fixes });
  },
} as const;
