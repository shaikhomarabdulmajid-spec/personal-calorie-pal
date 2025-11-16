import express from 'express';
import multer from 'multer';
import auth from '../middleware/auth.js';
import aiService from '../utils/aiService.js';
import { analyzeFood, validateImageFile, calculateRecommendedSteps } from '../utils/foodAI.js';

const router = express.Router();

// Configure multer for image uploads (memory storage for analysis)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5000000, // 5MB default
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
    }
  }
});

/**
 * @route   POST /analyze
 * @desc    Upload image and analyze food content with AI
 * @access  Private
 * 
 * Test example using curl:
 * curl -X POST http://localhost:3000/analyze \
 *   -H "Authorization: Bearer <your_jwt_token>" \
 *   -F "image=@path/to/your/food_image.jpg"
 * 
 * Test example using Postman/Insomnia:
 * POST http://localhost:3000/analyze
 * Authorization: Bearer <your_jwt_token>
 * Content-Type: multipart/form-data
 * Body: form-data with key "image" and file value
 */
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    // Validate file upload
    const validation = validateImageFile(req.file);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    // Convert image to base64 for AI analysis
    const imageBase64 = req.file.buffer.toString('base64');
    
    // Analyze the image using AI service
    const analysisResult = await aiService.analyzeFoodFromImage(imageBase64);
    
    // Calculate recommended steps
    const recommendedSteps = calculateRecommendedSteps(analysisResult.totalCalories);

    // Prepare enhanced response with AI insights
    const response = {
      success: true,
      message: 'Image analyzed successfully with AI',
      data: {
        foods: analysisResult.foods,
        totalCalories: analysisResult.totalCalories,
        recommendedSteps,
        mealType: analysisResult.mealType,
        healthScore: analysisResult.healthScore,
        recommendations: analysisResult.recommendations,
        analysis: {
          detectedFoodCount: analysisResult.foods.length,
          averageConfidence: analysisResult.confidence,
          analysisMethod: analysisResult.analysisMethod,
          processedAt: new Date().toISOString()
        }
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Image analysis error:', error);

    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: `Upload error: ${error.message}`
      });
    }

    // Handle other errors
    res.status(500).json({
      success: false,
      message: 'Server error during image analysis',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /analyze/url
 * @desc    Analyze food from image URL (alternative method)
 * @access  Private
 * 
 * Test example:
 * POST http://localhost:3000/analyze/url
 * Authorization: Bearer <your_jwt_token>
 * Content-Type: application/json
 * 
 * {
 *   "imageUrl": "https://example.com/food-image.jpg"
 * }
 */
router.post('/url', auth, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    // Validate URL format
    let url;
    try {
      url = new URL(imageUrl);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format'
      });
    }

    // For this mock implementation, we'll simulate downloading and analyzing
    // In production, you would fetch the image from the URL
    const mockBuffer = Buffer.from(`mock-image-data-from-${url.hostname}`, 'utf8');
    
    // Analyze the mock image
    const analysisResult = await analyzeFood(mockBuffer, url.pathname.split('/').pop() || 'image');
    
    if (!analysisResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to analyze image from URL'
      });
    }

    // Calculate recommended steps
    const recommendedSteps = calculateRecommendedSteps(analysisResult.totalCalories);

    res.json({
      success: true,
      message: 'Image from URL analyzed successfully',
      data: {
        foods: analysisResult.foods,
        totalCalories: analysisResult.totalCalories,
        recommendedSteps,
        source: 'url',
        sourceUrl: imageUrl,
        analysis: {
          detectedFoodCount: analysisResult.foods.length,
          averageConfidence: analysisResult.detectionMetadata.detectionConfidence,
          processedAt: analysisResult.detectionMetadata.processedAt
        }
      }
    });

  } catch (error) {
    console.error('URL analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during URL image analysis',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /analyze/batch
 * @desc    Analyze multiple images at once
 * @access  Private
 * 
 * Test example using curl:
 * curl -X POST http://localhost:3000/analyze/batch \
 *   -H "Authorization: Bearer <your_jwt_token>" \
 *   -F "images=@image1.jpg" \
 *   -F "images=@image2.jpg"
 */
router.post('/batch', auth, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image file is required'
      });
    }

    if (req.files.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 images allowed per batch'
      });
    }

    // Analyze each image
    const analysisResults = [];
    let totalCalories = 0;
    let allFoods = [];

    for (const file of req.files) {
      // Validate each file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        analysisResults.push({
          filename: file.originalname,
          success: false,
          error: validation.error
        });
        continue;
      }

      try {
        // Analyze image
        const result = await analyzeFood(file.buffer, file.originalname);
        
        if (result.success) {
          totalCalories += result.totalCalories;
          allFoods.push(...result.foods);
          
          analysisResults.push({
            filename: file.originalname,
            success: true,
            foods: result.foods,
            calories: result.totalCalories
          });
        } else {
          analysisResults.push({
            filename: file.originalname,
            success: false,
            error: 'Analysis failed'
          });
        }
      } catch (error) {
        analysisResults.push({
          filename: file.originalname,
          success: false,
          error: error.message
        });
      }
    }

    // Calculate total recommended steps
    const recommendedSteps = calculateRecommendedSteps(totalCalories);

    res.json({
      success: true,
      message: `Batch analysis completed for ${req.files.length} images`,
      data: {
        batchSummary: {
          totalImages: req.files.length,
          successfulAnalyses: analysisResults.filter(r => r.success).length,
          totalFoodsDetected: allFoods.length,
          totalCalories,
          recommendedSteps
        },
        results: analysisResults,
        allDetectedFoods: allFoods
      }
    });

  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during batch analysis',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;