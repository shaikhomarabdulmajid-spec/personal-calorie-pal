/**
 * Enhanced Input Validation Middleware
 * Provides comprehensive validation and sanitization
 */
import validator from 'validator';
import rateLimit from 'express-rate-limit';

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req, res, next) => {
  // Sanitize all string inputs
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return validator.escape(value.trim());
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized = {};
      Object.keys(value).forEach(key => {
        sanitized[key] = sanitizeValue(value[key]);
      });
      return sanitized;
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  
  next();
};

/**
 * Advanced user input validation
 */
export const validateUserInput = {
  username: (username) => {
    if (!username || typeof username !== 'string') {
      return { isValid: false, message: 'Username is required' };
    }
    
    const sanitized = username.toLowerCase().trim();
    
    if (sanitized.length < 3 || sanitized.length > 30) {
      return { isValid: false, message: 'Username must be 3-30 characters' };
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
      return { isValid: false, message: 'Username can only contain letters, numbers, hyphens, and underscores' };
    }
    
    // Check for common attacks
    const dangerousPatterns = [
      /<script/i, /javascript:/i, /on\w+=/i, 
      /union.*select/i, /drop.*table/i, /'.*or.*1.*=/i
    ];
    
    if (dangerousPatterns.some(pattern => pattern.test(sanitized))) {
      return { isValid: false, message: 'Invalid characters detected' };
    }
    
    return { isValid: true, value: sanitized };
  },

  password: (password) => {
    if (!password || typeof password !== 'string') {
      return { isValid: false, message: 'Password is required' };
    }
    
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters' };
    }
    
    if (password.length > 128) {
      return { isValid: false, message: 'Password too long' };
    }
    
    // Check for strong password
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!(hasUpper && hasLower && hasNumber && hasSpecial)) {
      return { 
        isValid: false, 
        message: 'Password must contain uppercase, lowercase, number, and special character' 
      };
    }
    
    return { isValid: true, value: password };
  },

  foodName: (foodName) => {
    if (!foodName || typeof foodName !== 'string') {
      return { isValid: false, message: 'Food name is required' };
    }
    
    const sanitized = foodName.trim();
    
    if (sanitized.length < 1 || sanitized.length > 100) {
      return { isValid: false, message: 'Food name must be 1-100 characters' };
    }
    
    // Remove HTML tags and dangerous content
    const cleaned = sanitized.replace(/<[^>]*>/g, '');
    
    return { isValid: true, value: cleaned };
  },

  calories: (calories) => {
    const num = Number(calories);
    
    if (isNaN(num) || num < 0 || num > 10000) {
      return { isValid: false, message: 'Calories must be between 0 and 10000' };
    }
    
    return { isValid: true, value: Math.round(num) };
  }
};

/**
 * CSRF Protection Headers
 */
export const csrfProtection = (req, res, next) => {
  // Add CSRF token to response headers
  res.setHeader('X-CSRF-Token', generateCSRFToken());
  
  // Validate CSRF token for state-changing operations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    
    if (!token || !validateCSRFToken(token)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token'
      });
    }
  }
  
  next();
};

// Simple CSRF token implementation (use a proper library in production)
function generateCSRFToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

function validateCSRFToken(token) {
  // In production, validate against stored tokens
  return typeof token === 'string' && token.length === 64;
}

/**
 * Content Security Policy headers
 */
export const setSecurityHeaders = (req, res, next) => {
  // Prevent XSS attacks
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self';"
  );
  
  next();
};