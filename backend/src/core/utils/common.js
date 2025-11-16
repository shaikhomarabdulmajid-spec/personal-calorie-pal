/**
 * Common Utility Functions
 * Implements DRY principle by centralizing reusable functionality
 */

/**
 * API Response Utilities
 * Standardizes API response format across all endpoints
 */
export class ApiResponse {
  /**
   * Creates a successful response
   * @param {Object} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code (default: 200)
   * @returns {Object} - Formatted success response
   */
  static success(data = null, message = 'Success', statusCode = 200) {
    return {
      success: true,
      message,
      data,
      statusCode,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Creates an error response
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 400)
   * @param {Object} errors - Detailed error information
   * @returns {Object} - Formatted error response
   */
  static error(message = 'An error occurred', statusCode = 400, errors = null) {
    return {
      success: false,
      message,
      errors,
      statusCode,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Creates a paginated response
   * @param {Array} data - Array of items
   * @param {Object} pagination - Pagination metadata
   * @param {string} message - Response message
   * @returns {Object} - Formatted paginated response
   */
  static paginated(data, pagination, message = 'Data retrieved successfully') {
    return {
      success: true,
      message,
      data,
      pagination: {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        totalItems: pagination.totalItems,
        itemsPerPage: pagination.itemsPerPage,
        hasNextPage: pagination.currentPage < pagination.totalPages,
        hasPrevPage: pagination.currentPage > 1
      },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Input Validation Utilities
 * Centralized validation logic to ensure consistency
 */
export class InputValidator {
  /**
   * Validates email format
   * @param {string} email - Email to validate
   * @returns {Object} - Validation result
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    return {
      isValid,
      message: isValid ? null : 'Invalid email format'
    };
  }

  /**
   * Validates required fields
   * @param {Object} data - Data object to validate
   * @param {Array} requiredFields - Array of required field names
   * @returns {Object} - Validation result
   */
  static validateRequired(data, requiredFields) {
    const missing = requiredFields.filter(field => 
      !data[field] || (typeof data[field] === 'string' && data[field].trim() === '')
    );

    return {
      isValid: missing.length === 0,
      message: missing.length > 0 ? `Missing required fields: ${missing.join(', ')}` : null,
      missingFields: missing
    };
  }

  /**
   * Validates numeric range
   * @param {number} value - Value to validate
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {string} fieldName - Field name for error messages
   * @returns {Object} - Validation result
   */
  static validateRange(value, min, max, fieldName = 'Value') {
    const num = Number(value);
    const isValid = !isNaN(num) && num >= min && num <= max;
    
    return {
      isValid,
      message: isValid ? null : `${fieldName} must be between ${min} and ${max}`,
      value: isValid ? num : null
    };
  }

  /**
   * Validates string length
   * @param {string} str - String to validate
   * @param {number} minLength - Minimum length
   * @param {number} maxLength - Maximum length
   * @param {string} fieldName - Field name for error messages
   * @returns {Object} - Validation result
   */
  static validateLength(str, minLength, maxLength, fieldName = 'Field') {
    const length = str ? str.length : 0;
    const isValid = length >= minLength && length <= maxLength;
    
    return {
      isValid,
      message: isValid ? null : `${fieldName} must be between ${minLength} and ${maxLength} characters`,
      value: isValid ? str.trim() : null
    };
  }
}

/**
 * Date and Time Utilities
 * Common date operations used across the application
 */
export class DateUtils {
  /**
   * Gets the start of today in ISO format
   * @returns {string} - ISO date string for start of today
   */
  static getStartOfToday() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }

  /**
   * Gets the end of today in ISO format
   * @returns {string} - ISO date string for end of today
   */
  static getEndOfToday() {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return now.toISOString();
  }

  /**
   * Gets date range for the past N days
   * @param {number} days - Number of days to go back
   * @returns {Object} - Object with startDate and endDate
   */
  static getPastDaysRange(days) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  /**
   * Formats date for display
   * @param {Date|string} date - Date to format
   * @param {string} locale - Locale for formatting (default: 'en-US')
   * @returns {string} - Formatted date string
   */
  static formatDate(date, locale = 'en-US') {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Calculates time ago string
   * @param {Date|string} date - Date to calculate from
   * @returns {string} - Human readable time ago string
   */
  static timeAgo(date) {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return this.formatDate(date);
  }
}

/**
 * Data Transformation Utilities
 * Common data transformation operations
 */
export class DataTransformers {
  /**
   * Sanitizes user data for safe storage
   * @param {Object} userData - Raw user data
   * @returns {Object} - Sanitized user data
   */
  static sanitizeUserData(userData) {
    const sanitized = {};
    
    if (userData.username) {
      sanitized.username = userData.username.toLowerCase().trim();
    }
    
    if (userData.email) {
      sanitized.email = userData.email.toLowerCase().trim();
    }
    
    if (userData.password) {
      // Keep password as-is for hashing
      sanitized.password = userData.password;
    }
    
    return sanitized;
  }

  /**
   * Transforms meal data for API response
   * @param {Object} meal - Raw meal data from database
   * @returns {Object} - Transformed meal data
   */
  static transformMealData(meal) {
    return {
      id: meal.id,
      foods: meal.foods || [],
      totalCalories: meal.totalCalories || 0,
      mealType: meal.mealType || 'other',
      consumedAt: meal.consumedAt,
      recommendedSteps: meal.recommendedSteps || Math.round((meal.totalCalories || 0) * 20),
      notes: meal.notes || '',
      createdAt: meal.createdAt,
      formattedDate: DateUtils.formatDate(meal.consumedAt),
      timeAgo: DateUtils.timeAgo(meal.consumedAt)
    };
  }

  /**
   * Calculates nutrition summary from foods array
   * @param {Array} foods - Array of food items
   * @returns {Object} - Nutrition summary
   */
  static calculateNutritionSummary(foods) {
    const summary = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      foodCount: foods.length
    };

    foods.forEach(food => {
      summary.totalCalories += food.calories || 0;
      summary.totalProtein += food.nutrition?.protein || 0;
      summary.totalCarbs += food.nutrition?.carbs || 0;
      summary.totalFat += food.nutrition?.fat || 0;
    });

    return summary;
  }
}

/**
 * Async utilities for better error handling
 */
export class AsyncUtils {
  /**
   * Wraps async functions to handle errors gracefully
   * @param {Function} fn - Async function to wrap
   * @returns {Function} - Wrapped function
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Executes multiple async operations with timeout
   * @param {Array} promises - Array of promises
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise} - Promise that resolves/rejects with timeout
   */
  static async withTimeout(promises, timeoutMs = 5000) {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    );

    return Promise.race([
      Promise.all(promises),
      timeout
    ]);
  }

  /**
   * Retries async operation with exponential backoff
   * @param {Function} operation - Async operation to retry
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} baseDelay - Base delay in milliseconds
   * @returns {Promise} - Promise that resolves on success or rejects after max retries
   */
  static async retry(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}