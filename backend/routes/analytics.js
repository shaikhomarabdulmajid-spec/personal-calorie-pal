import express from 'express';
import auth from '../middleware/auth.js';
import Meal from '../models/Meal.js';
import User from '../models/User.js';
import { getAIRecipeSuggestions } from '../utils/aiSuggestions.js';


const router = express.Router();

/**
 * @route   GET /analytics/dashboard
 * @desc    Get comprehensive analytics for user dashboard
 * @access  Private
 */
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Get today's calories using the model method
    const todayCalories = await Meal.getDailyCalories(userId, now);
    
    // Get weekly calories
    const weeklyCalories = await Meal.getWeeklyCalories(userId, now);

    // Mock analytics data for now
    const analytics = {
      dailyTrend: [
        { date: now.toISOString().split('T')[0], totalCalories: todayCalories.totalCalories, mealCount: todayCalories.mealCount }
      ],
      topFoods: [
        { food: 'Apple', count: 5, totalCalories: 350 },
        { food: 'Banana', count: 3, totalCalories: 270 }
      ],
      mealTypeDistribution: [
        { mealType: 'breakfast', count: 2, avgCalories: 300 },
        { mealType: 'lunch', count: 2, avgCalories: 500 },
        { mealType: 'dinner', count: 2, avgCalories: 600 }
      ],
      stats: {
        totalCalories: todayCalories.totalCalories,
        totalMeals: todayCalories.mealCount,
        avgCaloriesPerMeal: todayCalories.mealCount > 0 ? Math.round(todayCalories.totalCalories / todayCalories.mealCount) : 0,
        avgCaloriesPerDay: weeklyCalories.mealCount > 0 ? Math.round(weeklyCalories.totalCalories / 7) : 0
      }
    };

    const user = await User.findByPk(userId);
    const recentMeals = await Meal.findAll({
      where: { userId },
      order: [['consumedAt', 'DESC']],
      limit: 5
    });

    // Get AI-powered recipe suggestions
    const aiSuggestions = await getAIRecipeSuggestions(user, recentMeals);

    res.status(200).json({
      success: true,
      analytics,
      aiSuggestions
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics data'
    });
  }
});

/**
 * @route   GET /analytics/weekly-summary
 * @desc    Get weekly summary of calorie intake
 * @access  Private
 */
router.get('/weekly-summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const week = parseInt(req.query.week) || 0;
    
    const now = new Date();
    const weeklyData = await Meal.getWeeklyCalories(userId, now);

    res.status(200).json({
      success: true,
      summary: {
        weekOffset: week,
        totalCalories: weeklyData.totalCalories,
        totalMeals: weeklyData.mealCount,
        totalSteps: weeklyData.totalSteps,
        avgCaloriesPerDay: Math.round(weeklyData.totalCalories / 7),
        dailyBreakdown: [
          { day: 'Monday', calories: Math.round(weeklyData.totalCalories / 7) },
          { day: 'Tuesday', calories: Math.round(weeklyData.totalCalories / 7) },
          { day: 'Wednesday', calories: Math.round(weeklyData.totalCalories / 7) },
          { day: 'Thursday', calories: Math.round(weeklyData.totalCalories / 7) },
          { day: 'Friday', calories: Math.round(weeklyData.totalCalories / 7) },
          { day: 'Saturday', calories: Math.round(weeklyData.totalCalories / 7) },
          { day: 'Sunday', calories: Math.round(weeklyData.totalCalories / 7) }
        ]
      }
    });

  } catch (error) {
    console.error('Weekly summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly summary'
    });
  }
});

export default router;