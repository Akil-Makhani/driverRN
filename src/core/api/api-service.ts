/**
 * Port of lib/services/api_service.dart.
 *
 * The Dart class had five near-identical methods (get/post/put/patch/delete)
 * that differed only in verb and whether a body was encoded. Here one private
 * `request` does the work and the five verbs are thin wrappers, so the header
 * and error handling exist once.
 *
 * Response handling matches _handleResponse exactly:
 *   200/201 → parsed JSON
 *   400     → BadRequestException(raw body)
 *   401/403/404/409 → UnauthorisedException(server `message`)
 *   500/other → FetchDataException
 */
import { API_BASE_URL } from './endpoints';
import {
  BadRequestException,
  FetchDataException,
  UnauthorisedException,
} from './errors';
import { Preference } from '../storage/preference';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Flutter's http package has no default timeout, so a dead network hung the
 * spinner forever. 30s matches the customer app and fails loudly instead.
 */
const DEFAULT_TIMEOUT_MS = 30000;

async function request<T = any>(
  method: Method,
  url: string,
  body?: unknown,
): Promise<T> {
  const fullUrl = `${API_BASE_URL}${url}`;
  const token = Preference.getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const init: RequestInit = { method, headers, signal: controller.signal };
  if (body !== undefined && body !== null && method !== 'GET' && method !== 'DELETE') {
    init.body = JSON.stringify(body);
  }

  if (__DEV__) {
    console.log(`API ${method}: ${fullUrl}`);
    if (body) console.log('Request body:', body);
  }

  let response: Response;
  let text: string;
  try {
    response = await fetch(fullUrl, init);
    text = await response.text();
  } catch (e) {
    // Abort (timeout) and transport failures both land here. Dart surfaced
    // these by rethrowing the SocketException; the stores only need one type.
    const reason = (e as Error)?.name === 'AbortError' ? 'Request timed out' : 'No internet connection';
    throw new FetchDataException(reason);
  } finally {
    clearTimeout(timer);
  }

  if (__DEV__) console.log(`${url} → ${response.status} ${text}`);

  const parse = (): any => {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  switch (response.status) {
    case 200:
    case 201:
      return parse() as T;

    case 400:
      throw new BadRequestException(text);

    case 401:
    case 403:
    case 404:
    case 409: {
      const parsed = parse();
      const message =
        parsed && typeof parsed === 'object' && typeof parsed.message === 'string'
          ? parsed.message
          : text;
      throw new UnauthorisedException(message);
    }

    default:
      throw new FetchDataException(
        `Error occurred while Communication with Server with Status Code : ${response.status}`,
      );
  }
}

export const ApiService = {
  get: <T = any>(url: string) => request<T>('GET', url),
  post: <T = any>(url: string, body?: unknown) => request<T>('POST', url, body),
  put: <T = any>(url: string, body?: unknown) => request<T>('PUT', url, body),
  patch: <T = any>(url: string, body?: unknown) => request<T>('PATCH', url, body),
  delete: <T = any>(url: string) => request<T>('DELETE', url),
} as const;
