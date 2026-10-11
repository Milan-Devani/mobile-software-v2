export const errorHandler = (err, req, res, next) => {
  console.error(`❌ [API Error] ${req.method} ${req.url}:`, err);

  const status = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.isOperational ? err.message : (status === 500 ? 'An unexpected server error occurred. Please try again later.' : err.message);

  res.status(status).json({
    success: false,
    message,
    code,
    errors: err.errors || [],
  });
};

export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST', errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
