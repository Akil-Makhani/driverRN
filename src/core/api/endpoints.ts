/** 1:1 port of lib/services/api_urls.dart. */

// Dev:  https://api.dev.bstm.in/v2
// UAT:  https://api.uat.bstm.in/v2
// Prod: https://api.bstm.in/v2
//
// Point at a local bst-api by setting EXPO_PUBLIC_API_URL in .env — on the
// Android emulator use http://10.0.2.2:3000/v2, since localhost there is the
// emulated device itself, not the host machine.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://api.bstm.in/v2';

/**
 * Socket.IO origin for the live dispatch channel (job offers, race results,
 * location streaming).
 *
 * Deliberately the bare origin, not `API_BASE_URL`: Socket.IO appends its own
 * `/socket.io/` path, and the `/v2` REST prefix is not part of it. Defaulting
 * off `API_BASE_URL` keeps a local `.env` override working with one variable —
 * point `EXPO_PUBLIC_API_URL` at your machine and the socket follows.
 */
export const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ?? API_BASE_URL.replace(/\/v2\/?$/, '');

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
  /** Re-registers this device's push token; see UserRepository.registerFcmToken. */
  fcmToken: '/driver/account/fcm-token',
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
  logLocation: '/driver/locations',

  // Pre-account registration. These four are the only endpoints that carry no
  // Authorization header — a driver applying for an account has no token yet,
  // which is the whole point of the flow.
  // The OTP pair is separate from sendOTP/verifyOTP above: those refuse a
  // number with no account, which is every driver who is about to register.
  registerSendOtp: '/driver/registration/send-otp',
  registerVerifyOtp: '/driver/registration/verify-otp',
  register: '/driver/registration',
  lookupVehicle: '/driver/registration/lookup/vehicle',
  lookupLicence: '/driver/registration/lookup/driver',

  // ── Broadcast dispatch ─────────────────────────────────────
  // Offers reach the app over the socket; these exist so a driver who was
  // offline, backgrounded, or mid-reconnect still sees what is open, and so
  // accept/reject go over HTTP where the response is the authoritative
  // won/lost answer rather than a fire-and-forget emit.
  openJobs: '/driver/jobs/open',
  jobAccept: (jobId: string) => `/driver/jobs/${jobId}/accept`,
  jobReject: (jobId: string) => `/driver/jobs/${jobId}/reject`,
  /** Batched location fixes, the fallback path when the socket is down. */
  locationPing: '/driver/location',

  // Path builders for the endpoints Flutter interpolated at the call site.
  registrationStatus: (mobileNo: string) =>
    `/driver/registration/status?mobileNo=${encodeURIComponent(mobileNo)}`,
  tripDetails: (tripId: string) => `/driver/trips/${tripId}`,
  tripStatus: (tripId: string, status: string) =>
    `/driver/trips/${tripId}/${status}`,
  notificationPage: (page: number, perPage: number) =>
    `/driver/notifications/${page}/${perPage}`,
  historyPage: (page: number, perPage: number) =>
    `/driver/trips/history/${page}/${perPage}`,
  /** Trips this driver cancelled — the Cancelled Trips screen. */
  cancelledPage: (page: number, perPage: number) =>
    `/driver/trips/cancelled/${page}/${perPage}`,
} as const;
