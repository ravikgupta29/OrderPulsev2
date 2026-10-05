/**
 * Single consistent error shape used across the API layer, mutations and
 * the error boundary. Every thrown/rejected error in the app should be
 * normalized into this shape via `toAppError`.
 */
export type AppErrorCode =
  | 'RULE_ERROR'
  | 'CONFLICT'
  | 'NETWORK'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'UNKNOWN';

export class AppError extends Error {
  code: AppErrorCode;
  details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError('UNKNOWN', error.message, error);
  }
  return new AppError('UNKNOWN', 'An unexpected error occurred.', error);
}
