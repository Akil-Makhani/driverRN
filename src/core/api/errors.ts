/**
 * Port of lib/services/exception.dart.
 *
 * Dart threw AppException subclasses and every view model caught them with
 * `on UnauthorisedException catch`. Keeping real Error subclasses lets the
 * stores keep that same shape via `instanceof`, and `toString()` reproduces
 * the Dart "<prefix><message>" format the UI printed.
 */
export class AppException extends Error {
  readonly prefix: string;

  /**
   * The `data` field of the error envelope, when the server sent one. Most
   * endpoints answer a failure with prose alone and leave this undefined; the
   * registration endpoints put the deciding value here (which of Pending or
   * Approved a 409 conflict was), because the caller has to branch on it
   * rather than just print it.
   */
  readonly data?: unknown;

  /**
   * The HTTP status. UnauthorisedException covers 401/403/404/409 together,
   * and the login flow has to tell two of them apart: 404 means no account
   * yet, which sends the driver into registration, while 403 means a blocked
   * account, which must not.
   */
  readonly status?: number;

  constructor(message?: string, prefix = '', data?: unknown, status?: number) {
    super(`${prefix}${message ?? ''}`);
    this.name = new.target.name;
    this.prefix = prefix;
    this.data = data;
    this.status = status;
  }
}

/** Connectivity / 5xx / unexpected status. */
export class FetchDataException extends AppException {
  constructor(message?: string) {
    super(message, 'Error During Communication: ');
  }
}

/** 400. */
export class BadRequestException extends AppException {
  constructor(message?: string) {
    super(message, 'Invalid Request: ');
  }
}

/**
 * 401 / 403 / 404 / 409. Flutter grouped these and surfaced the server's
 * `message` with no prefix, because the text is shown to the driver as-is
 * (e.g. the invalid-OTP message).
 */
export class UnauthorisedException extends AppException {
  constructor(message?: string, data?: unknown, status?: number) {
    super(message, '', data, status);
  }
}
