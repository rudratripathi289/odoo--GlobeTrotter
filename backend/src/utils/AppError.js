/**
 * AppError — Custom operational error class.
 * Throw this from any service to return a structured JSON error response.
 *
 * Usage:
 *   throw new AppError(404, 'TRIP_NOT_FOUND', 'Trip not found.');
 *   throw new AppError(422, 'STOP_DATES_OUTSIDE_TRIP', 'Stop dates exceed trip range.', ['stopId-123']);
 */
export class AppError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
