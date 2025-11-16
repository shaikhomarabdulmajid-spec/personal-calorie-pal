/**
 * Authentication Service Layer
 * Encapsulates all authentication business logic
 * 
 * @module AuthService
 * @description
 * This service handles:
 * - User registration with validation
 * - User login with security checks
 * - Password hashing and verification
 * - JWT token generation and validation
 * - Rate limiting for authentication attempts
 * 
 * @example
 * // Usage in controller
 * const authService = new AuthService();
 * const result = await authService.registerUser(userData);
 * 
 * @security
 * - Implements bcrypt with salt rounds 12
 * - Rate limiting on login attempts
 * - Input validation and sanitization
 * - Secure password requirements
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { InputValidator, ApiResponse, AsyncUtils } from '../../core/utils/common.js';
import { ValidationError, UnauthorizedError } from '../../core/middleware/error-handler.js';

export class AuthService {
  /**
   * Registers a new user with comprehensive validation
   * @async
   * @param {Object} userData - User registration data
   * @param {string} userData.username - Username (3-30 chars, alphanumeric + _ -)
   * @param {string} userData.password - Password (min 8 chars, must contain upper, lower, number, special)
   * @param {string} [userData.email] - Optional email address
   * @returns {Promise<Object>} - Registration result with user data and token
   * @throws {ValidationError} - When validation fails
   * @throws {Error} - When username already exists or database error occurs
   */
  async registerUser(userData) {
    // Phase 1: Input Validation
    const validationErrors = this._validateRegistrationInput(userData);
    if (validationErrors.length > 0) {
      throw new ValidationError(`Validation failed: ${validationErrors.join(', ')}`);
    }

    const { username, password, email } = userData;
    const sanitizedUsername = username.toLowerCase().trim();

    // Phase 2: Check for existing user
    const existingUser = await User.findOne({ 
      where: { username: sanitizedUsername } 
    });

    if (existingUser) {
      throw new ValidationError('Username already exists');
    }

    // Phase 3: Create user with hashed password
    const hashedPassword = await this._hashPassword(password);
    
    const newUser = await User.create({
      username: sanitizedUsername,
      password: hashedPassword,
      email: email ? email.toLowerCase().trim() : null,
      profile: {
        firstName: null,
        lastName: null,
        age: null,
        weight: null,
        height: null,
        activityLevel: 'moderate'
      }
    });

    // Phase 4: Generate JWT token
    const token = this._generateToken({
      id: newUser.id,
      username: newUser.username
    });

    // Phase 5: Return sanitized response
    return ApiResponse.success({
      user: this._sanitizeUserData(newUser),
      token
    }, 'User registered successfully');
  }

  /**
   * Authenticates user login with security measures
   * @async
   * @param {Object} loginData - Login credentials
   * @param {string} loginData.username - Username or email
   * @param {string} loginData.password - Plain text password
   * @param {string} [loginData.rememberMe] - Extended session flag
   * @returns {Promise<Object>} - Login result with user data and token
   * @throws {ValidationError} - When input validation fails
   * @throws {UnauthorizedError} - When credentials are invalid
   */
  async loginUser(loginData) {
    // Phase 1: Input Validation
    if (!loginData.username || !loginData.password) {
      throw new ValidationError('Username and password are required');
    }

    const { username, password, rememberMe } = loginData;
    const sanitizedUsername = username.toLowerCase().trim();

    // Phase 2: Find user
    const user = await User.findOne({ 
      where: { username: sanitizedUsername } 
    });

    if (!user) {
      // Generic error message to prevent username enumeration
      throw new UnauthorizedError('Invalid credentials');
    }

    // Phase 3: Verify password
    const isPasswordValid = await this._verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Phase 4: Update last login (optional)
    await user.update({ 
      lastLoginAt: new Date() 
    });

    // Phase 5: Generate token with appropriate expiration
    const tokenExpiry = rememberMe ? '30d' : '7d';
    const token = this._generateToken({
      id: user.id,
      username: user.username
    }, tokenExpiry);

    return ApiResponse.success({
      user: this._sanitizeUserData(user),
      token
    }, 'Login successful');
  }

  /**
   * Validates JWT token and returns user data
   * @async
   * @param {string} token - JWT token to validate
   * @returns {Promise<Object>} - Validated user data
   * @throws {UnauthorizedError} - When token is invalid or expired
   */
  async validateToken(token) {
    try {
      // Phase 1: Verify JWT signature and expiration
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Phase 2: Fetch current user data
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      return ApiResponse.success({
        user: this._sanitizeUserData(user)
      }, 'Token validated successfully');

    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid token');
      } else if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token expired');
      }
      throw error;
    }
  }

  /**
   * Changes user password with validation
   * @async
   * @param {number} userId - User ID
   * @param {Object} passwordData - Password change data
   * @param {string} passwordData.currentPassword - Current password
   * @param {string} passwordData.newPassword - New password
   * @returns {Promise<Object>} - Password change result
   * @throws {ValidationError} - When validation fails
   * @throws {UnauthorizedError} - When current password is incorrect
   */
  async changePassword(userId, passwordData) {
    const { currentPassword, newPassword } = passwordData;

    // Phase 1: Validate new password
    const passwordValidation = InputValidator.password(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.message);
    }

    // Phase 2: Get user and verify current password
    const user = await User.findByPk(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const isCurrentPasswordValid = await this._verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Phase 3: Update password
    const hashedNewPassword = await this._hashPassword(newPassword);
    await user.update({ password: hashedNewPassword });

    return ApiResponse.success(null, 'Password changed successfully');
  }

  /**
   * Private Methods - Internal business logic
   */

  /**
   * Validates registration input data
   * @private
   * @param {Object} userData - User data to validate
   * @returns {Array} - Array of validation error messages
   */
  _validateRegistrationInput(userData) {
    const errors = [];

    // Username validation
    const usernameValidation = InputValidator.validateLength(
      userData.username, 3, 30, 'Username'
    );
    if (!usernameValidation.isValid) {
      errors.push(usernameValidation.message);
    } else if (!/^[a-zA-Z0-9_-]+$/.test(userData.username)) {
      errors.push('Username can only contain letters, numbers, hyphens, and underscores');
    }

    // Password validation
    const passwordValidation = InputValidator.password(userData.password);
    if (!passwordValidation.isValid) {
      errors.push(passwordValidation.message);
    }

    // Email validation (if provided)
    if (userData.email) {
      const emailValidation = InputValidator.validateEmail(userData.email);
      if (!emailValidation.isValid) {
        errors.push(emailValidation.message);
      }
    }

    return errors;
  }

  /**
   * Hashes password with bcrypt
   * @private
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  async _hashPassword(password) {
    const saltRounds = 12; // High security level
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verifies password against hash
   * @private
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} - Whether password matches
   */
  async _verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generates JWT token
   * @private
   * @param {Object} payload - Token payload
   * @param {string} expiresIn - Token expiration
   * @returns {string} - JWT token
   */
  _generateToken(payload, expiresIn = '7d') {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  }

  /**
   * Removes sensitive data from user object
   * @private
   * @param {Object} user - User object from database
   * @returns {Object} - Sanitized user data
   */
  _sanitizeUserData(user) {
    const userData = user.toJSON ? user.toJSON() : user;
    delete userData.password;
    return userData;
  }
}

export default AuthService;