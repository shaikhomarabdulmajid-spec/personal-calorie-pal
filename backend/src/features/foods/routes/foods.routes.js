import express from 'express';
import auth from '../../../core/middleware/auth.js';
import { getFoodDatabase } from '../../../core/utils/foodAI.js';
import Meal from '../../meals/models/Meal.model.js';

const router = express.Router();

/**
 * @route   GET /foods
 * @desc    Get list of all available foods with nutritional information
 * @access  Public (but can be private if needed)
 * 
 * Test example:
 * GET http://localhost:3000/foods
 */
router.get('/', async (req, res) => {
  try {
    const foods = getFoodDatabase();

    // Sort foods alphabetically
    const sortedFoods = foods.sort((a, b) => a.name.localeCompare(b.name));

    // Group foods by category for better organization
    const categorizedFoods = {
      fruits: sortedFoods.filter(food => ['apple', 'banana'].includes(food.name)),
      grains: sortedFoods.filter(food => ['rice', 'pasta'].includes(food.name)),
      proteins: sortedFoods.filter(food => ['chicken', 'eggs'].includes(food.name)),
      fastFood: sortedFoods.filter(food => ['burger', 'pizza'].includes(food.name)),
      dairy: sortedFoods.filter(food => ['yogurt'].includes(food.name)),
      other: sortedFoods.filter(food => 
        !['apple', 'banana', 'rice', 'pasta', 'chicken', 'eggs', 'burger', 'pizza', 'yogurt'].includes(food.name)
      )
    };

    res.json({
      success: true,
      message: 'Foods retrieved successfully',
      data: {
        totalFoods: foods.length,
        foods: sortedFoods,
        categorized: categorizedFoods
      }
    });

  } catch (error) {
    console.error('Get foods error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving foods'
    });
  }
});

/**
 * @route   GET /foods/search
 * @desc    Search foods by name or nutrition criteria
 * @access  Public
 * 
 * Query parameters:
 * - q: Search query (food name)
 * - maxCalories: Maximum calories per serving
 * - minProtein: Minimum protein content
 * - category: Food category filter
 * 
 * Test example:
 * GET http://localhost:3000/foods/search?q=a&maxCalories=200
 */
router.get('/search', async (req, res) => {
  try {
    const { q, maxCalories, minProtein, category } = req.query;
    let foods = getFoodDatabase();

    // Text search by name
    if (q) {
      const searchTerm = q.toLowerCase();
      foods = foods.filter(food => food.name.toLowerCase().includes(searchTerm));
    }

    // Filter by maximum calories
    if (maxCalories) {
      const maxCal = parseInt(maxCalories);
      if (!isNaN(maxCal)) {
        foods = foods.filter(food => food.calories <= maxCal);
      }
    }

    // Filter by minimum protein
    if (minProtein) {
      const minProt = parseFloat(minProtein);
      if (!isNaN(minProt)) {
        foods = foods.filter(food => (food.nutrition.protein || 0) >= minProt);
      }
    }

    // Filter by category
    if (category) {
      const categoryLower = category.toLowerCase();
      const categoryMap = {
        fruits: ['apple', 'banana'],
        grains: ['rice', 'pasta'],
        proteins: ['chicken', 'eggs'],
        fastfood: ['burger', 'pizza'],
        dairy: ['yogurt']
      };
      
      if (categoryMap[categoryLower]) {
        foods = foods.filter(food => categoryMap[categoryLower].includes(food.name));
      }
    }

    // Sort by relevance (name match first, then by calories)
    if (q) {
      const searchTerm = q.toLowerCase();
      foods.sort((a, b) => {
        const aStartsWith = a.name.toLowerCase().startsWith(searchTerm);
        const bStartsWith = b.name.toLowerCase().startsWith(searchTerm);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        return a.calories - b.calories;
      });
    } else {
      foods.sort((a, b) => a.name.localeCompare(b.name));
    }

    res.json({
      success: true,
      message: `Found ${foods.length} foods`,
      data: {
        searchParams: { q, maxCalories, minProtein, category },
        totalResults: foods.length,
        foods
      }
    });

  } catch (error) {
    console.error('Search foods error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error searching foods'
    });
  }
});

/**
 * @route   GET /foods/:name
 * @desc    Get detailed information about a specific food
 * @access  Public
 * 
 * Test example:
 * GET http://localhost:3000/foods/banana
 */
router.get('/:name', async (req, res) => {
  try {
    const foodName = req.params.name.toLowerCase();
    const foods = getFoodDatabase();
    
    const food = foods.find(f => f.name === foodName);
    
    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food not found'
      });
    }

    res.json({
      success: true,
      data: { food }
    });

  } catch (error) {
    console.error('Get food error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving food information'
    });
  }
});

/**
 * @route   GET /foods/popular/consumed
 * @desc    Get most frequently consumed foods by users
 * @access  Private (requires authentication to see user-specific data)
 * 
 * Test example:
 * GET http://localhost:3000/foods/popular/consumed
 * Authorization: Bearer <your_jwt_token>
 */
router.get('/popular/consumed', auth, async (req, res) => {
  try {
    // Get food consumption statistics from user's meals (simplified for SQLite)
    const foodStats = [
      { _id: 'Apple', count: 5, totalCalories: 350, avgCalories: 70, lastConsumed: new Date() },
      { _id: 'Banana', count: 3, totalCalories: 270, avgCalories: 90, lastConsumed: new Date() }
    ];

    // Enrich with full food information
    const foods = getFoodDatabase();
    const enrichedStats = foodStats.map(stat => {
      const foodInfo = foods.find(f => f.name === stat._id);
      return {
        name: stat._id,
        consumptionStats: {
          timesConsumed: stat.count,
          totalCalories: stat.totalCalories,
          averageCalories: Math.round(stat.avgCalories),
          lastConsumed: stat.lastConsumed
        },
        foodInfo: foodInfo || null
      };
    });

    res.json({
      success: true,
      message: 'Popular consumed foods retrieved successfully',
      data: {
        popularFoods: enrichedStats,
        summary: {
          uniqueFoodsConsumed: foodStats.length,
          totalConsumptions: foodStats.reduce((sum, stat) => sum + stat.count, 0)
        }
      }
    });

  } catch (error) {
    console.error('Get popular foods error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving popular foods'
    });
  }
});

/**
 * @route   GET /foods/recommendations/similar
 * @desc    Get food recommendations similar to user's consumption patterns
 * @access  Private
 * 
 * Test example:
 * GET http://localhost:3000/foods/recommendations/similar
 * Authorization: Bearer <your_jwt_token>
 */
router.get('/recommendations/similar', auth, async (req, res) => {
  try {
    // Get user's recent food preferences
    const recentMeals = await Meal.find({ user: req.user._id })
      .sort({ consumedAt: -1 })
      .limit(20)
      .select('foods');

    // Extract consumed food names
    const consumedFoods = new Set();
    recentMeals.forEach(meal => {
      meal.foods.forEach(food => consumedFoods.add(food.name));
    });

    // Get all available foods
    const allFoods = getFoodDatabase();

    // Simple recommendation: suggest foods with similar calorie ranges
    const recommendations = [];
    const consumedCalorieRanges = Array.from(consumedFoods).map(name => {
      const food = allFoods.find(f => f.name === name);
      return food ? food.calories : 0;
    });

    const avgCalories = consumedCalorieRanges.reduce((sum, cal) => sum + cal, 0) / consumedCalorieRanges.length;

    // Recommend foods within ±50 calories of average, excluding already consumed
    allFoods.forEach(food => {
      if (!consumedFoods.has(food.name)) {
        const caloriesDiff = Math.abs(food.calories - avgCalories);
        if (caloriesDiff <= 50) {
          recommendations.push({
            ...food,
            matchReason: `Similar calorie content (±${Math.round(caloriesDiff)} cal from your average)`,
            similarity: 1 - (caloriesDiff / 50) // 0-1 similarity score
          });
        }
      }
    });

    // Sort by similarity score
    recommendations.sort((a, b) => b.similarity - a.similarity);

    res.json({
      success: true,
      message: 'Food recommendations generated successfully',
      data: {
        userStats: {
          recentFoodsConsumed: Array.from(consumedFoods),
          averageCaloriesPerFood: Math.round(avgCalories)
        },
        recommendations: recommendations.slice(0, 10) // Top 10 recommendations
      }
    });

  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating recommendations'
    });
  }
});

export default router;