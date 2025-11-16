/**
 * AI-powered routes for intelligent calorie tracking features
 */

import express from 'express';
import { Op } from 'sequelize';
import auth from '../middleware/auth.js';
import aiService from '../utils/aiService.js';
import Meal from '../models/Meal.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * @route   POST /ai/recommendations
 * @desc    Get personalized meal recommendations based on user profile and history
 * @access  Private
 */
router.post('/recommendations', auth, async (req, res) => {
  try {
    const { preferences, mealType, targetCalories } = req.body;
    
    // Get user data
    const user = await User.findByPk(req.user.id);
    
    // Get recent meals for context
    const recentMeals = await Meal.findAll({
      where: { userId: req.user.id },
      order: [['consumedAt', 'DESC']],
      limit: 10,
      attributes: ['foods', 'totalCalories', 'mealType', 'consumedAt', 'notes']
    });

    // Calculate today's calories
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayStats = await Meal.getDailyCalories(req.user.id, new Date());
    user.todayCalories = todayStats.totalCalories;

    // Generate AI recommendations
    const recommendations = await aiService.generateMealRecommendations(
      user, 
      recentMeals,
      { ...preferences, mealType, targetCalories }
    );

    res.json({
      success: true,
      message: 'AI recommendations generated successfully',
      data: {
        recommendations: recommendations.recommendations,
        insights: recommendations.insights,
        userContext: {
          remainingCalories: user.dailyCalorieGoal - user.todayCalories,
          currentIntake: user.todayCalories,
          dailyGoal: user.dailyCalorieGoal
        }
      }
    });

  } catch (error) {
    console.error('AI recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI recommendations'
    });
  }
});

/**
 * @route   GET /ai/insights
 * @desc    Get AI-powered health and nutrition insights
 * @access  Private
 */
router.get('/insights', auth, async (req, res) => {
  try {
    const { period = 7 } = req.query; // Default to 7 days
    
    // Get user data
    const user = await User.findByPk(req.user.id);
    
    // Get meals from specified period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    
    const meals = await Meal.findAll({
      where: { 
        userId: req.user.id,
        consumedAt: {
          [Op.gte]: startDate
        }
      },
      order: [['consumedAt', 'DESC']],
      attributes: ['foods', 'totalCalories', 'mealType', 'consumedAt', 'notes']
    });

    // Generate AI insights
    const insights = await aiService.generateHealthInsights(user, meals);
    
    // Calculate nutrition trends
    const totalCalories = meals.reduce((sum, meal) => sum + meal.totalCalories, 0);
    const avgDailyCalories = totalCalories / period;
    const mealFrequency = meals.length / period;

    // Analyze meal types distribution
    const mealTypes = meals.reduce((acc, meal) => {
      acc[meal.mealType] = (acc[meal.mealType] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      message: 'AI insights generated successfully',
      data: {
        insights,
        trends: {
          avgDailyCalories: Math.round(avgDailyCalories),
          mealFrequency: Math.round(mealFrequency * 10) / 10,
          totalMeals: meals.length,
          mealTypeDistribution: mealTypes,
          period: `${period} days`
        },
        recommendations: insights.filter(i => i.type === 'tip' || i.type === 'info')
      }
    });

  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI insights'
    });
  }
});

/**
 * @route   POST /ai/analyze-nutrition
 * @desc    Analyze nutritional balance and provide AI feedback
 * @access  Private
 */
router.post('/analyze-nutrition', auth, async (req, res) => {
  try {
    const { foods, targetNutrition } = req.body;
    
    if (!foods || !Array.isArray(foods)) {
      return res.status(400).json({
        success: false,
        error: 'Foods array is required'
      });
    }

    // Calculate total nutrition
    const totalNutrition = foods.reduce((total, food) => {
      const nutrition = food.nutrition || {};
      return {
        calories: (total.calories || 0) + (food.calories || 0),
        protein: (total.protein || 0) + (nutrition.protein || 0),
        carbs: (total.carbs || 0) + (nutrition.carbs || 0),
        fat: (total.fat || 0) + (nutrition.fat || 0),
        fiber: (total.fiber || 0) + (nutrition.fiber || 0),
        sugar: (total.sugar || 0) + (nutrition.sugar || 0),
        sodium: (total.sodium || 0) + (nutrition.sodium || 0)
      };
    }, {});

    // Generate AI analysis
    const analysis = {
      nutritionalBalance: {
        proteinPercentage: Math.round((totalNutrition.protein * 4) / totalNutrition.calories * 100),
        carbsPercentage: Math.round((totalNutrition.carbs * 4) / totalNutrition.calories * 100),
        fatPercentage: Math.round((totalNutrition.fat * 9) / totalNutrition.calories * 100)
      },
      healthScore: aiService.calculateHealthScore(foods),
      recommendations: []
    };

    // Generate recommendations based on nutrition
    if (analysis.nutritionalBalance.proteinPercentage < 15) {
      analysis.recommendations.push('Consider adding more protein sources like lean meats, eggs, or legumes');
    }
    if (analysis.nutritionalBalance.fatPercentage > 35) {
      analysis.recommendations.push('Try to reduce high-fat foods and opt for healthier fat sources');
    }
    if (totalNutrition.fiber < 5) {
      analysis.recommendations.push('Add more fiber-rich foods like vegetables, fruits, and whole grains');
    }
    if (totalNutrition.sodium > 1000) {
      analysis.recommendations.push('Watch your sodium intake - try using herbs and spices instead of salt');
    }

    res.json({
      success: true,
      message: 'Nutrition analysis completed',
      data: {
        totalNutrition,
        analysis,
        recommendations: analysis.recommendations
      }
    });

  } catch (error) {
    console.error('Nutrition analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze nutrition'
    });
  }
});

/**
 * @route   POST /ai/smart-log
 * @desc    Smart meal logging with AI enhancement
 * @access  Private
 */
router.post('/smart-log', auth, async (req, res) => {
  try {
    const { description, mealType, time } = req.body;
    
    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Meal description is required'
      });
    }

    // Use AI to parse the meal description and estimate nutrition
    let aiAnalysis;
    
    if (aiService.openai) {
      const prompt = `
      Parse this meal description and provide nutritional information:
      "${description}"
      
      Return JSON format:
      {
        "foods": [
          {
            "name": "food name",
            "calories": estimated_calories,
            "servingSize": {"amount": 1, "unit": "serving"},
            "nutrition": {
              "protein": grams,
              "carbs": grams,
              "fat": grams,
              "fiber": grams,
              "sugar": grams,
              "sodium": mg
            }
          }
        ],
        "totalCalories": total_estimated_calories,
        "confidence": 0.8
      }
      `;

      try {
        const response = await aiService.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500
        });

        aiAnalysis = JSON.parse(response.choices[0].message.content);
      } catch (aiError) {
        console.error('OpenAI parsing error:', aiError);
      }
    }

    // Fallback to basic parsing if AI fails
    if (!aiAnalysis) {
      aiAnalysis = {
        foods: [{
          name: description,
          calories: 300, // Default estimate
          servingSize: { amount: 1, unit: 'serving' },
          nutrition: {
            protein: 15,
            carbs: 35,
            fat: 10,
            fiber: 3,
            sugar: 8,
            sodium: 400
          }
        }],
        totalCalories: 300,
        confidence: 0.5
      };
    }

    // Create the meal
    const consumedAt = time ? new Date(time) : new Date();
    
    const meal = await Meal.create({
      userId: req.user.id,
      foods: aiAnalysis.foods,
      totalCalories: aiAnalysis.totalCalories,
      mealType: mealType || aiService.determineMealType(aiAnalysis.foods),
      notes: `Smart-logged: ${description}`,
      consumedAt: consumedAt
    });

    // Update user's lifetime calories
    const user = await User.findByPk(req.user.id);
    user.totalLifetimeCalories += aiAnalysis.totalCalories;
    await user.save();

    res.json({
      success: true,
      message: 'Meal smart-logged successfully',
      data: {
        meal: {
          id: meal.id,
          foods: meal.foods,
          totalCalories: meal.totalCalories,
          mealType: meal.mealType,
          notes: meal.notes,
          consumedAt: meal.consumedAt
        },
        aiAnalysis: {
          confidence: aiAnalysis.confidence,
          method: aiService.openai ? 'openai-parsing' : 'fallback-parsing'
        }
      }
    });

  } catch (error) {
    console.error('Smart logging error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to smart-log meal'
    });
  }
});

export default router;