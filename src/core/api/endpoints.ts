/** 1:1 port of lib/services/api_urls.dart. */

// Dev:  https://api.dev.bstm.in/v2
// UAT:  https://api.uat.bstm.in/v2
// Production (active, matches the Flutter build):
export const API_BASE_URL = 'https://api.bstm.in/v2';

export const DOWNLOAD_IMAGE_BASE_URL = 'https://dcaut6thq5oko.cloudfront.net/';

/**
 * Absolute URL for a server-supplied attachment path. The API returns bare
 * keys ("<tripId>/invoice/x.jpg"), but guard against already-absolute values
 * so we never produce ".../https://...".
 */
export function downloadUrl(path?: string | null): string {
  if (!path) return '';
  const lower = path.toLowerCase();
  const isAbsolute = lower.startsWith('http://') || lower.startsWith('https://');
  return isAbsolute ? path : `${DOWNLOAD_IMAGE_BASE_URL}${path}`;
}

export const ApiUrls = {
  sendOTP: '/driver/account/send-login-otp',
  verifyOTP: '/driver/account/verify-otp-login',
  logout: '/driver/account/logout',
  deleteAccount: '/driver/account/delete-account',
  profile: '/driver/account/profile',
  duty: '/driver/duty',
  listTrips: '/driver/trips',
  history: '/driver/trips/history/',
  getNotification: '/driver/notifications/',
  notificationCount: '/driver/notifications/count',
  notificationClick: '/driver/notifications/clicked/',
  clearedAll: '/driver/notifications/clear-all',
  deliverAll: '/driver/trips/delivered-all',
  uploadUrl: '/driver/documents/upload-url',
  deleteDocument: '/driver/documents?fileKey=',
  getProduct: '/driver/trips/products/all',

  // Path builders for the endpoints Flutter interpolated at the call site.
  tripDetails: (tripId: string) => `/driver/trips/${tripId}`,
  tripStatus: (tripId: string, status: string) =>
    `/driver/trips/${tripId}/${status}`,
  notificationPage: (page: number, perPage: number) =>
    `/driver/notifications/${page}/${perPage}`,
  historyPage: (page: number, perPage: number) =>
    `/driver/trips/history/${page}/${perPage}`,
} as const;
