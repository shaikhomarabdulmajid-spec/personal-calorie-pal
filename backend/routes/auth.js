import express from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 * 
 * Test example:
 * POST http://localhost:3000/auth/register
 * Content-Type: application/json
 * 
 * {
 *   "username": "testuser",
 *   "password": "password123"
 * }
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      where: { username: username.toLowerCase().trim() } 
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this username'
      });
    }

    // Create new user
    const user = await User.create({
      username: username.toLowerCase().trim(),
      password
    });

    // Generate JWT token
    const token = user.generateToken();

    // Remove password from response
    const userResponse = user.toJSON();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Registration error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

/**
 * @route   POST /auth/login
 * @desc    Login user and return JWT token
 * @access  Public
 * 
 * Test example:
 * POST http://localhost:3000/auth/login
 * Content-Type: application/json
 * 
 * {
 *   "username": "testuser",
 *   "password": "password123"
 * }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find user by username (case insensitive)
    const user = await User.findOne({ 
      where: { username: username.toLowerCase().trim() } 
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = user.generateToken();

    // Remove password from response
    const userResponse = user.toJSON();

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

/**
 * @route   GET /auth/me
 * @desc    Get current user profile
 * @access  Private
 * 
 * Test example:
 * GET http://localhost:3000/auth/me
 * Authorization: Bearer <your_jwt_token>
 */
router.get('/me', auth, async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting user profile'
    });
  }
});

/**
 * @route   PUT /auth/profile
 * @desc    Update user profile
 * @access  Private
 * 
 * Test example:
 * PUT http://localhost:3000/auth/profile
 * Authorization: Bearer <your_jwt_token>
 * Content-Type: application/json
 * 
 * {
 *   "profile": {
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "age": 25,
 *     "weight": 70,
 *     "height": 175,
 *     "activityLevel": "moderate"
 *   },
 *   "dailyCalorieGoal": 2200
 * }
 */
router.put('/profile', auth, async (req, res) => {
  try {
    const { profile, dailyCalorieGoal } = req.body;

    const user = await User.findById(req.user._id);
    
    // Update profile fields if provided
    if (profile) {
      user.profile = { ...user.profile, ...profile };
    }

    if (dailyCalorieGoal) {
      user.dailyCalorieGoal = dailyCalorieGoal;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
});

export default router;