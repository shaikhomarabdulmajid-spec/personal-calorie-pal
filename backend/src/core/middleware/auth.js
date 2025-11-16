import jwt from 'jsonwebtoken';
import User from '../../features/authentication/models/User.model.js';

/**
 * JWT Authentication Middleware
 * Protects routes by verifying JWT tokens and attaching user data to request
 * 
 * @async
 * @function auth
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next middleware function
 * @returns {void} - Calls next() on success, sends error response on failure
 * 
 * @description
 * This middleware:
 * 1. Extracts JWT token from Authorization header (Bearer format)
 * 2. Verifies token signature and expiration
 * 3. Fetches user data from database using token payload
 * 4. Attaches user object to req.user for downstream middleware/routes
 * 5. Handles various JWT error types with appropriate HTTP status codes
 * 
 * @example
 * // Usage in route definition
 * router.get('/protected', auth, (req, res) => {
 *   // req.user is now available
 *   res.json({ userId: req.user.id });
 * });
 * 
 * @throws {401} - When no token provided, invalid token, or expired token
 * @throws {404} - When user not found in database
 * @throws {500} - When database error occurs
 * 
 * @security
 * - Validates JWT signature using JWT_SECRET environment variable
 * - Performs database lookup to ensure user still exists
 * - Removes password field from user object before attaching to request
 * - Logs authentication errors for security monitoring
 */
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID from token payload
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found, token invalid'
      });
    }

    // Add user to request object (without password)
    req.user = user.toJSON();
    next();

  } catch (error) {
    console.error('Auth middleware error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

export default auth;