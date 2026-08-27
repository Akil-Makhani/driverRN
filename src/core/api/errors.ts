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

  constructor(message?: string, prefix = '') {
    super(`${prefix}${message ?? ''}`);
    this.name = new.target.name;
    this.prefix = prefix;
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
  constructor(message?: string) {
    super(message, '');
  }
}
