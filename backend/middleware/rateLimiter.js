import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes
 */
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => process.env.NODE_ENV === 'development', // Disable in development
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user ? req.user._id : req.ip;
  }
});

/**
 * Authentication rate limiter
 * Limits: 5 login/register attempts per 15 minutes
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per windowMs
  message: {
    success: false,
    message: 'Too many login/register attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development',
  // Store in memory (use Redis in production)
  store: undefined
});

/**
 * File upload rate limiter
 * Limits: 30 uploads per hour per user
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 uploads per hour
  message: {
    success: false,
    message: 'Upload limit exceeded. Maximum 30 uploads per hour. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development',
  keyGenerator: (req) => {
    return req.user ? req.user._id : req.ip;
  }
});

/**
 * Meal logging rate limiter
 * Limits: 50 meals per day per user
 */
export const mealLogLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 50, // 50 meals per day
  message: {
    success: false,
    message: 'Daily meal limit exceeded. Maximum 50 meals per day.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development',
  keyGenerator: (req) => {
    return req.user ? req.user._id : req.ip;
  }
});

/**
 * Strict rate limiter for sensitive operations
 * Limits: 10 requests per 10 minutes
 * Used for password changes, profile updates, etc.
 */
export const strictLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  message: {
    success: false,
    message: 'Too many requests for this sensitive operation. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development',
  keyGenerator: (req) => {
    return req.user ? req.user._id : req.ip;
  }
});

export default {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  mealLogLimiter,
  strictLimiter
};