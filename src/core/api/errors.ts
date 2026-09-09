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
   * The HTTP status behind this error, when there was a response at all.
   *
   * Dart discarded the status once it had picked an exception class, which was
   * fine while 401/403/404/409 all meant "show the server's message". It stops
   * being fine with a broadcast race: losing an offer is a 409 and must dismiss
   * the offer quietly, whereas a 401 on the same call means the session died
   * and the driver has to log in again. Same class, opposite handling.
   */
  readonly statusCode?: number;
  /** Machine-readable `code` from the error body, e.g. "JOB_ALREADY_TAKEN". */
  readonly code?: string;

  /**
   * The `data` field of the error envelope, when the server sent one. Most
   * endpoints answer a failure with prose alone and leave this undefined; the
   * registration endpoints put the deciding value here (which of Pending or
   * Approved a 409 conflict was), because the caller has to branch on it
   * rather than just print it.
   */
  readonly data?: unknown;

  constructor(
    message?: string,
    prefix = '',
    statusCode?: number,
    code?: string,
    data?: unknown,
  ) {
    super(`${prefix}${message ?? ''}`);
    this.name = new.target.name;
    this.prefix = prefix;
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
  }
}

/** Connectivity / 5xx / unexpected status. */
export class FetchDataException extends AppException {
  constructor(message?: string, statusCode?: number, code?: string) {
    super(message, 'Error During Communication: ', statusCode, code);
  }
}

/** 400. */
export class BadRequestException extends AppException {
  constructor(message?: string, statusCode?: number, code?: string) {
    super(message, 'Invalid Request: ', statusCode, code);
  }
}

/**
 * 401 / 403 / 404 / 409 / 410. Flutter grouped these and surfaced the server's
 * `message` with no prefix, because the text is shown to the driver as-is
 * (e.g. the invalid-OTP message). Read `statusCode` when the distinction
 * matters — see the note on AppException.
 */
export class UnauthorisedException extends AppException {
  constructor(
    message?: string,
    statusCode?: number,
    code?: string,
    data?: unknown,
  ) {
    super(message, '', statusCode, code, data);
  }
}
