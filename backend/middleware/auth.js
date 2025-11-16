import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * JWT Authentication Middleware
 * Protects routes by verifying JWT tokens
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