// Central typed API error — carries HTTP status + machine-readable code
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(code: string, message: string, details?: unknown) {
    return new ApiError(400, code, message, details);
  }
  static unauthorized(code = 'AUTH_REQUIRED', message = 'Authentication required') {
    return new ApiError(401, code, message);
  }
  static forbidden(code = 'FORBIDDEN', message = 'You do not have access to this resource') {
    return new ApiError(403, code, message);
  }
  static notFound(code = 'NOT_FOUND', message = 'Resource not found') {
    return new ApiError(404, code, message);
  }
  static conflict(code: string, message: string, details?: unknown) {
    return new ApiError(409, code, message, details);
  }
  static unprocessable(code: string, message: string, details?: unknown) {
    return new ApiError(422, code, message, details);
  }
  static tooLarge(message = 'File exceeds the maximum allowed size') {
    return new ApiError(413, 'FILE_TOO_LARGE', message);
  }
  static tooMany(message = 'Too many requests — please slow down') {
    return new ApiError(429, 'RATE_LIMITED', message);
  }
  static internal(message = 'Internal server error') {
    return new ApiError(500, 'INTERNAL', message);
  }
}
