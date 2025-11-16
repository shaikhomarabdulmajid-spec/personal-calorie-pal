import express from 'express';
import { Op } from 'sequelize';
import auth from '../../../core/middleware/auth.js';
import Meal from '../models/Meal.model.js';
import User from '../../authentication/models/User.model.js';

const router = express.Router();

/**
 * @route   POST /meals/logMeal
 * @desc    Log a new meal for the authenticated user
 * @access  Private
 * 
 * Test example:
 * POST http://localhost:3000/meals/logMeal
 * Authorization: Bearer <your_jwt_token>
 * Content-Type: application/json
 * 
 * {
 *   "foods": [
 *     { "name": "banana", "calories": 105 },
 *     { "name": "apple", "calories": 95 }
 *   ],
 *   "totalCalories": 200,
 *   "mealType": "breakfast",
 *   "notes": "Morning fruit bowl"
 * }
 */
router.post('/logMeal', auth, async (req, res) => {
  try {
    const { foods, totalCalories, mealType, notes, consumedAt } = req.body;

    // Validation
    if (!foods || !Array.isArray(foods) || foods.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Foods array is required and must contain at least one item'
      });
    }

    // Validate each food item
    for (const food of foods) {
      if (!food.name || typeof food.calories !== 'number' || food.calories < 0) {
        return res.status(400).json({
          success: false,
          message: 'Each food item must have a valid name and non-negative calories'
        });
      }
    }

    // Calculate total calories if not provided
    const calculatedCalories = totalCalories || foods.reduce((sum, food) => sum + food.calories, 0);

    // Create new meal
    const meal = await Meal.create({
      userId: req.user.id,
      foods: foods.map(food => ({
        name: food.name.toLowerCase().trim(),
        calories: food.calories,
        nutrition: food.nutrition || {},
        servingSize: food.servingSize || { amount: 1, unit: 'piece' },
        confidence: food.confidence || 1.0
      })),
      totalCalories: calculatedCalories,
      mealType: mealType || 'other',
      notes: notes || '',
      consumedAt: consumedAt ? new Date(consumedAt) : new Date()
    });

    // Update user's lifetime calories
    const user = await User.findByPk(req.user.id);
    user.totalLifetimeCalories += calculatedCalories;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Meal logged successfully',
      meal: {
        id: meal.id,
        foods: meal.foods,
        totalCalories: meal.totalCalories,
        mealType: meal.mealType,
        notes: meal.notes,
        consumedAt: meal.consumedAt,
        recommendedSteps: meal.recommendedSteps
      },
      summary: {
        foodCount: foods.length,
        totalCalories: calculatedCalories,
        recommendedSteps: meal.recommendedSteps
      }
    });

  } catch (error) {
    console.error('Log meal error:', error);

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
      message: 'Server error logging meal'
    });
  }
});

/**
 * @route   GET /meals/progress
 * @desc    Get user's calorie tracking progress (today, weekly, total)
 * @access  Private
 * 
 * Test example:
 * GET http://localhost:3000/meals/progress
 * Authorization: Bearer <your_jwt_token>
 */
router.get('/progress', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Get today's calories
    const todayStats = await Meal.getDailyCalories(userId, now);
    
    // Get weekly calories
    const weeklyStats = await Meal.getWeeklyCalories(userId, now);

    // Get user's total lifetime calories
    const user = await User.findById(userId).select('totalLifetimeCalories dailyCalorieGoal');

    // Get recent meal history (last 10 meals)
    const mealHistory = await Meal.findAll({
      where: { userId: userId },
      order: [['consumedAt', 'DESC']],
      limit: 10,
      attributes: ['foods', 'totalCalories', 'mealType', 'consumedAt', 'recommendedSteps', 'notes']
    });

    // Calculate progress towards daily goal
    const dailyGoal = user.dailyCalorieGoal || 2000;
    const dailyProgress = {
      current: todayStats.totalCalories,
      goal: dailyGoal,
      percentage: Math.round((todayStats.totalCalories / dailyGoal) * 100),
      remaining: Math.max(0, dailyGoal - todayStats.totalCalories)
    };

    // Get weekly average
    const weeklyAverage = Math.round(weeklyStats.totalCalories / 7);

    res.json({
      success: true,
      data: {
        today: {
          calories: todayStats.totalCalories,
          meals: todayStats.mealCount,
          recommendedSteps: todayStats.totalSteps
        },
        weekly: {
          calories: weeklyStats.totalCalories,
          meals: weeklyStats.mealCount,
          recommendedSteps: weeklyStats.totalSteps,
          averageDaily: weeklyAverage
        },
        total: {
          lifetimeCalories: user.totalLifetimeCalories || 0
        },
        dailyProgress,
        recentMeals: mealHistory,
        summary: {
          totalMealsLogged: await Meal.countDocuments({ user: userId }),
          averageCaloriesPerMeal: mealHistory.length > 0 
            ? Math.round(mealHistory.reduce((sum, meal) => sum + meal.totalCalories, 0) / mealHistory.length)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting progress'
    });
  }
});

/**
 * @route   GET /meals/history
 * @desc    Get user's meal history with pagination
 * @access  Private
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - startDate: Start date filter (ISO string)
 * - endDate: End date filter (ISO string)
 * - mealType: Filter by meal type
 * 
 * Test example:
 * GET http://localhost:3000/meals/history?page=1&limit=10&mealType=breakfast
 * Authorization: Bearer <your_jwt_token>
 */
router.get('/history', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      mealType
    } = req.query;

    // Validation
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // Build where clause
    const whereClause = { userId: req.user.id };

    // Date filters
    if (startDate || endDate) {
      whereClause.consumedAt = {};
      if (startDate) whereClause.consumedAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.consumedAt[Op.lte] = new Date(endDate);
    }

    // Meal type filter
    if (mealType) {
      whereClause.mealType = mealType;
    }

    // Execute query with pagination
    const meals = await Meal.findAll({
      where: whereClause,
      order: [['consumedAt', 'DESC']],
      offset: (pageNum - 1) * limitNum,
      limit: limitNum,
      attributes: ['id', 'foods', 'totalCalories', 'mealType', 'consumedAt', 'recommendedSteps', 'notes', 'createdAt']
    });

    // Get total count for pagination
    const totalMeals = await Meal.count({ where: whereClause });
    const totalPages = Math.ceil(totalMeals / limitNum);

    res.json({
      success: true,
      data: {
        meals,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalMeals,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        },
        filters: {
          startDate,
          endDate,
          mealType
        }
      }
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting meal history'
    });
  }
});

/**
 * @route   GET /meals/:id
 * @desc    Get specific meal by ID
 * @access  Private
 * 
 * Test example:
 * GET http://localhost:3000/meals/64a1b2c3d4e5f6789012345
 * Authorization: Bearer <your_jwt_token>
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const meal = await Meal.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id // Ensure user can only access their own meals
      }
    });

    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Meal not found'
      });
    }

    res.json({
      success: true,
      data: { meal }
    });

  } catch (error) {
    console.error('Get meal error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error getting meal'
    });
  }
});

/**
 * @route   PUT /meals/:id
 * @desc    Update a meal
 * @access  Private
 * 
 * Test example:
 * PUT http://localhost:3000/meals/64a1b2c3d4e5f6789012345
 * Authorization: Bearer <your_jwt_token>
 * Content-Type: application/json
 * 
 * {
 *   "notes": "Updated notes",
 *   "mealType": "lunch"
 * }
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { foods, mealType, notes, consumedAt } = req.body;

    const meal = await Meal.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Meal not found'
      });
    }

    // Store old calories for user total update
    const oldCalories = meal.totalCalories;

    // Update allowed fields
    if (foods && Array.isArray(foods) && foods.length > 0) {
      meal.foods = foods.map(food => ({
        name: food.name.toLowerCase().trim(),
        calories: food.calories,
        nutrition: food.nutrition || {},
        servingSize: food.servingSize || { amount: 1, unit: 'piece' },
        confidence: food.confidence || 1.0
      }));
    }

    if (mealType) meal.mealType = mealType;
    if (notes !== undefined) meal.notes = notes;
    if (consumedAt) meal.consumedAt = new Date(consumedAt);

    await meal.save();

    // Update user's lifetime calories if meal calories changed
    const caloriesDiff = meal.totalCalories - oldCalories;
    if (caloriesDiff !== 0) {
      const user = await User.findByPk(req.user.id);
      user.totalLifetimeCalories += caloriesDiff;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Meal updated successfully',
      data: { meal }
    });

  } catch (error) {
    console.error('Update meal error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal ID format'
      });
    }

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
      message: 'Server error updating meal'
    });
  }
});

/**
 * @route   DELETE /meals/:id
 * @desc    Delete a meal
 * @access  Private
 * 
 * Test example:
 * DELETE http://localhost:3000/meals/64a1b2c3d4e5f6789012345
 * Authorization: Bearer <your_jwt_token>
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const meal = await Meal.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!meal) {
      return res.status(404).json({
        success: false,
        message: 'Meal not found'
      });
    }

    // Update user's lifetime calories
    // Update user's lifetime calories
    const user = await User.findByPk(req.user.id);
    user.totalLifetimeCalories -= meal.totalCalories;
    await user.save();

    await meal.destroy();

    res.json({
      success: true,
      message: 'Meal deleted successfully',
      data: {
        deletedMeal: {
          id: meal.id,
          totalCalories: meal.totalCalories
        }
      }
    });

  } catch (error) {
    console.error('Delete meal error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error deleting meal'
    });
  }
});

export default router;