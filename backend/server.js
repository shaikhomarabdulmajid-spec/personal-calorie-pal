
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Import routes
import authRoutes from './routes/auth.js';
import mealsRoutes from './routes/meals.js';
import foodsRoutes from './routes/foods.js';
import analyzeRoutes from './routes/analyze.js';
import analyticsRoutes from './routes/analytics.js';

// Import middleware
import { generalLimiter, authLimiter, uploadLimiter, mealLogLimiter } from './middleware/rateLimiter.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Connect to Database
connectDB();

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] // Replace with your frontend domain in production
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Parse JSON with increased limit for images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general rate limiting
app.use(generalLimiter);

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Personal Calorie Pal API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/auth', authLimiter, authRoutes);
app.use('/meals', mealLogLimiter, mealsRoutes);
app.use('/foods', foodsRoutes);
app.use('/analyze', uploadLimiter, analyzeRoutes);
app.use('/analytics', analyticsRoutes);

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Personal Calorie Pal API',
    version: '1.0.0',
    documentation: {
      endpoints: {
        authentication: {
          'POST /auth/register': 'Register a new user',
          'POST /auth/login': 'Login and get JWT token',
          'GET /auth/me': 'Get current user profile (requires auth)',
          'PUT /auth/profile': 'Update user profile (requires auth)'
        },
        foodAnalysis: {
          'POST /analyze': 'Upload image and analyze food content (requires auth)',
          'POST /analyze/url': 'Analyze food from image URL (requires auth)',
          'POST /analyze/batch': 'Analyze multiple images (requires auth)'
        },
        meals: {
          'POST /meals/logMeal': 'Log a new meal (requires auth)',
          'GET /meals/progress': 'Get calorie tracking progress (requires auth)',
          'GET /meals/history': 'Get meal history with pagination (requires auth)',
          'GET /meals/:id': 'Get specific meal (requires auth)',
          'PUT /meals/:id': 'Update meal (requires auth)',
          'DELETE /meals/:id': 'Delete meal (requires auth)'
        },
        foods: {
          'GET /foods': 'Get all available foods',
          'GET /foods/search': 'Search foods by criteria',
          'GET /foods/:name': 'Get specific food information',
          'GET /foods/popular/consumed': 'Get popular consumed foods (requires auth)',
          'GET /foods/recommendations/similar': 'Get food recommendations (requires auth)'
        },
        analytics: {
          'GET /analytics/dashboard': 'Get comprehensive dashboard analytics (requires auth)',
          'GET /analytics/recommendations': 'Get AI personalized recommendations (requires auth)',
          'GET /analytics/weekly-summary': 'Get weekly summary (requires auth)',
          'GET /analytics/goals': 'Get calorie goals (requires auth)',
          'PUT /analytics/goals': 'Update calorie goal (requires auth)'
        }
      },
      testExamples: {
        userRegistration: {
          url: 'POST /auth/register',
          body: {
            username: 'testuser',
            password: 'password123'
          }
        },
        userLogin: {
          url: 'POST /auth/login',
          body: {
            username: 'testuser',
            password: 'password123'
          }
        },
        imageAnalysis: {
          url: 'POST /analyze',
          headers: { Authorization: 'Bearer <your_jwt_token>' },
          body: 'multipart/form-data with "image" field'
        },
        logMeal: {
          url: 'POST /meals/logMeal',
          headers: { Authorization: 'Bearer <your_jwt_token>' },
          body: {
            foods: [
              { name: 'banana', calories: 105 },
              { name: 'apple', calories: 95 }
            ],
            totalCalories: 200,
            mealType: 'breakfast'
          }
        },
        getProgress: {
          url: 'GET /meals/progress',
          headers: { Authorization: 'Bearer <your_jwt_token>' }
        }
      }
    },
    contact: 'Personal Calorie Pal Team'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field. Use "image" or "images" field name'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // MongoDB errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: messages
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // Generic server error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /',
      'GET /health',
      'POST /auth/register',
      'POST /auth/login',
      'POST /analyze',
      'POST /meals/logMeal',
      'GET /meals/progress',
      'GET /foods'
    ]
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
🚀 Personal Calorie Pal API Server Started!
📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server: http://localhost:${PORT}
📖 API Docs: http://localhost:${PORT}/
🔍 Health Check: http://localhost:${PORT}/health

🔧 Available Endpoints:
   • Authentication: /auth/*
   • Food Analysis: /analyze
   • Meals: /meals/*
   • Foods Database: /foods/*

💡 Testing Tips:
   1. Register: POST /auth/register
   2. Login: POST /auth/login (get JWT token)
   3. Upload image: POST /analyze (with Authorization header)
   4. Log meal: POST /meals/logMeal
   5. Check progress: GET /meals/progress
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

export default app;