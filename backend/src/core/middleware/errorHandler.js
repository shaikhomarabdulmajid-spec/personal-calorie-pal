/**
 * Secure Error Handling Middleware
 * Prevents information leakage through error messages
 */

/**
 * Security-aware error logger
 * Logs full errors server-side but sanitizes client responses
 */
export const secureErrorHandler = (err, req, res, next) => {
  // Log full error details server-side (never expose to client)
  console.error('Security Error Details:', {
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
    method: req.method,
    userId: req.user ? req.user.id : 'anonymous'
  });

  // Determine error type and create safe response
  let statusCode = 500;
  let clientMessage = 'Internal server error';
  
  // Map specific errors to safe client messages
  switch (err.name) {
    case 'ValidationError':
      statusCode = 400;
      clientMessage = 'Invalid input provided';
      break;
    case 'UnauthorizedError':
    case 'JsonWebTokenError':
    case 'TokenExpiredError':
      statusCode = 401;
      clientMessage = 'Authentication required';
      break;
    case 'ForbiddenError':
      statusCode = 403;
      clientMessage = 'Access denied';
      break;
    case 'NotFoundError':
      statusCode = 404;
      clientMessage = 'Resource not found';
      break;
    case 'TooManyRequestsError':
      statusCode = 429;
      clientMessage = 'Too many requests. Please try again later.';
      break;
    case 'MulterError':
      statusCode = 400;
      clientMessage = 'File upload error';
      break;
    default:
      // Never expose internal error details
      if (process.env.NODE_ENV === 'development') {
        clientMessage = err.message; // Only in dev mode
      }
  }

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    timestamp: new Date().toISOString(),
    // Never include stack traces in production
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.message 
    })
  });
};

/**
 * Async error wrapper
 * Automatically catches async errors and passes to error handler
 */
export const asyncErrorWrapper = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error classes for better error handling
 */
export class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Request timeout middleware
 * Prevents hanging requests
 */
export const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout'
        });
      }
    }, timeout);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    
    next();
  };
};