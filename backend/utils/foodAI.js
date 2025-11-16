/**
 * Mock Food AI Detection Utility
 * Simulates ML-based food recognition from images
 * 
 * In production, this would integrate with:
 * - Google Vision API + Custom ML Model
 * - AWS Rekognition + Food Recognition Service  
 * - Custom TensorFlow/PyTorch model
 * - Clarifai Food API
 */

// Mock food database with realistic calorie counts
const FOOD_DATABASE = {
  // Fast Food
  burger: { 
    calories: 540, 
    nutrition: { protein: 25, carbs: 40, fat: 31, fiber: 3, sugar: 5 },
    servingSize: { amount: 1, unit: 'piece' }
  },
  pizza: { 
    calories: 285, 
    nutrition: { protein: 12, carbs: 36, fat: 10, fiber: 2, sugar: 4 },
    servingSize: { amount: 1, unit: 'slice' }
  },
  
  // Fruits
  apple: { 
    calories: 95, 
    nutrition: { protein: 0.5, carbs: 25, fat: 0.3, fiber: 4, sugar: 19 },
    servingSize: { amount: 1, unit: 'medium' }
  },
  banana: { 
    calories: 105, 
    nutrition: { protein: 1.3, carbs: 27, fat: 0.4, fiber: 3, sugar: 14 },
    servingSize: { amount: 1, unit: 'medium' }
  },
  
  // Grains & Protein
  rice: { 
    calories: 206, 
    nutrition: { protein: 4.3, carbs: 45, fat: 0.4, fiber: 0.6, sugar: 0.1 },
    servingSize: { amount: 1, unit: 'cup cooked' }
  },
  chicken: { 
    calories: 231, 
    nutrition: { protein: 43.5, carbs: 0, fat: 5, fiber: 0, sugar: 0 },
    servingSize: { amount: 100, unit: 'grams' }
  },
  pasta: { 
    calories: 220, 
    nutrition: { protein: 8, carbs: 44, fat: 1.1, fiber: 2.5, sugar: 1.5 },
    servingSize: { amount: 1, unit: 'cup cooked' }
  },

  // Additional foods for variety
  salad: {
    calories: 35,
    nutrition: { protein: 2.9, carbs: 6.8, fat: 0.2, fiber: 2.9, sugar: 3.3 },
    servingSize: { amount: 1, unit: 'cup' }
  },
  sandwich: {
    calories: 320,
    nutrition: { protein: 15, carbs: 35, fat: 12, fiber: 4, sugar: 6 },
    servingSize: { amount: 1, unit: 'piece' }
  },
  eggs: {
    calories: 155,
    nutrition: { protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1 },
    servingSize: { amount: 2, unit: 'large eggs' }
  },
  yogurt: {
    calories: 150,
    nutrition: { protein: 8, carbs: 17, fat: 8, fiber: 0, sugar: 16 },
    servingSize: { amount: 6, unit: 'oz container' }
  }
};

/**
 * Analyze image buffer and detect foods
 * @param {Buffer} imageBuffer - The image file buffer
 * @param {string} originalFilename - Original filename for logging
 * @returns {Promise<Array>} Array of detected foods with calories
 */
export const analyzeFood = async (imageBuffer, originalFilename = 'unknown') => {
  try {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Mock image analysis - in reality this would use computer vision
    const detectedFoods = mockFoodDetection(imageBuffer, originalFilename);

    // Add confidence scores and additional nutrition info
    const enrichedFoods = detectedFoods.map(food => {
      const foodData = FOOD_DATABASE[food.name];
      
      return {
        ...food,
        nutrition: foodData.nutrition,
        servingSize: foodData.servingSize,
        confidence: food.confidence || (0.7 + Math.random() * 0.25) // 70-95% confidence
      };
    });

    return {
      success: true,
      foods: enrichedFoods,
      totalCalories: enrichedFoods.reduce((sum, food) => sum + food.calories, 0),
      detectionMetadata: {
        processedAt: new Date().toISOString(),
        imageSize: imageBuffer.length,
        originalFilename,
        detectionConfidence: enrichedFoods.reduce((sum, food) => sum + food.confidence, 0) / enrichedFoods.length
      }
    };

  } catch (error) {
    console.error('Food analysis error:', error);
    throw new Error(`Failed to analyze food image: ${error.message}`);
  }
};

/**
 * Mock food detection algorithm
 * Simulates computer vision detection based on image characteristics
 * @param {Buffer} imageBuffer - Image data
 * @param {string} filename - Filename for heuristics
 * @returns {Array} Detected foods
 */
const mockFoodDetection = (imageBuffer, filename) => {
  const foods = Object.keys(FOOD_DATABASE);
  const detectedFoods = [];

  // Simple heuristic based on filename (in real ML, this would be image analysis)
  const filenameLower = filename.toLowerCase();
  
  // Check if filename contains food names
  foods.forEach(food => {
    if (filenameLower.includes(food)) {
      detectedFoods.push({
        name: food,
        calories: FOOD_DATABASE[food].calories,
        confidence: 0.9 + Math.random() * 0.1 // High confidence for filename matches
      });
    }
  });

  // If no foods detected from filename, use mock detection
  if (detectedFoods.length === 0) {
    detectedFoods.push(...mockImageAnalysis(imageBuffer));
  }

  // Ensure we always detect at least one food
  if (detectedFoods.length === 0) {
    const randomFood = foods[Math.floor(Math.random() * foods.length)];
    detectedFoods.push({
      name: randomFood,
      calories: FOOD_DATABASE[randomFood].calories,
      confidence: 0.6 + Math.random() * 0.2
    });
  }

  return detectedFoods;
};

/**
 * Mock image analysis based on buffer characteristics
 * @param {Buffer} buffer - Image buffer
 * @returns {Array} Array of detected foods
 */
const mockImageAnalysis = (buffer) => {
  const foods = Object.keys(FOOD_DATABASE);
  const detectedFoods = [];
  
  // Use buffer size and content to pseudo-randomly select foods
  const bufferHash = buffer.length % foods.length;
  const numFoods = 1 + (buffer.length % 3); // 1-3 foods typically
  
  // Select foods based on buffer characteristics
  for (let i = 0; i < Math.min(numFoods, 3); i++) {
    const foodIndex = (bufferHash + i * 3) % foods.length;
    const foodName = foods[foodIndex];
    
    // Skip if already detected
    if (detectedFoods.some(f => f.name === foodName)) continue;
    
    detectedFoods.push({
      name: foodName,
      calories: FOOD_DATABASE[foodName].calories,
      confidence: 0.65 + Math.random() * 0.25 // 65-90% confidence
    });
  }

  return detectedFoods;
};

/**
 * Get list of all recognizable foods
 * @returns {Array} Array of food objects with nutrition data
 */
export const getFoodDatabase = () => {
  return Object.entries(FOOD_DATABASE).map(([name, data]) => ({
    name,
    ...data
  }));
};

/**
 * Calculate recommended steps based on calories
 * Rule of thumb: ~20 steps per calorie (walking at moderate pace)
 * @param {number} calories - Number of calories
 * @returns {number} Recommended steps
 */
export const calculateRecommendedSteps = (calories) => {
  // More realistic calculation: 200-300 steps per 100 calories
  const stepsPerCalorie = 0.025 + (Math.random() * 0.015); // 0.025-0.04 steps per calorie
  return Math.round(calories * stepsPerCalorie * 100); // Multiply by 100 for reasonable step counts
};

/**
 * Validate image file
 * @param {Object} file - Multer file object
 * @returns {Object} Validation result
 */
export const validateImageFile = (file) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5000000; // 5MB default

  if (!file) {
    return { isValid: false, error: 'No image file provided' };
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return { 
      isValid: false, 
      error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}` 
    };
  }

  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: `File too large. Maximum size: ${Math.round(maxSize / 1000000)}MB` 
    };
  }

  return { isValid: true };
};

export default {
  analyzeFood,
  getFoodDatabase,
  calculateRecommendedSteps,
  validateImageFile
};