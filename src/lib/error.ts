export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

export const NotFound = (what: string, code: string) =>
  new AppError(404, code, `${what} not found`);

export const Forbidden = (message = "Forbidden") =>
  new AppError(403, "FORBIDDEN", message);

export const Unauthorized = (message = "Unauthorized") =>
  new AppError(401, "UNAUTHORIZED", message);

export const BadRequest = (code: string, message: string, details = {}) =>
  new AppError(400, code, message, details);

export const Conflict = (code: string, message: string) =>
  new AppError(409, code, message);