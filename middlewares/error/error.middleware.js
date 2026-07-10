const messageStatusMap = [
  [/not found/i, 404],
  [/already exists|duplicate/i, 409],
  [/invalid|required|must be|not available|full|overlap|after/i, 400],
  [/forbidden|denied/i, 403],
  [/login required|session invalid|password/i, 401]
];

export const globalErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Duplicate field value entered';
  }

  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = err.errors?.[0]?.message || 'Validation failed';
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session invalid';
  }

  if (!err.statusCode && !err.status) {
    const mapped = messageStatusMap.find(([pattern]) => pattern.test(message));
    if (mapped) statusCode = mapped[1];
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
