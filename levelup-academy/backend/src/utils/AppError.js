/**
 * Операционная ошибка с HTTP-статусом. errorHandler отдаёт её message клиенту;
 * все остальные ошибки маскируются как 500 Internal server error.
 */
export class AppError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
