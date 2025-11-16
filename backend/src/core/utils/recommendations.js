import Meal from '../../features/meals/models/Meal.model.js';
import User from '../../features/authentication/models/User.model.js';

/**
 * AI Recommendations Engine
 * Generates personalized health and nutrition recommendations
 */

/**
 * Generate personalized recommendations based on user patterns
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of recommendations
 */
export const generateRecommendations = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const recommendations = [];

    // Get user's recent meals (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const meals = await Meal.find({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: -1 });

    if (meals.length === 0) {
      return [{
        id: 'start_logging',
        type: 'action',
        title: 'Start Logging Meals',
        message: 'Begin tracking your meals to get personalized recommendations.',
        priority: 'high',
        action: 'LOG_MEAL'
      }];
    }

    // Analyze eating patterns
    const patterns = analyzePatterns(meals);

    // Generate recommendations based on patterns
    if (patterns.eveningHeavier) {
      recommendations.push({
        id: 'evening_eating',
        type: 'timing',
        title: '🌙 Evening Eating Pattern',
        message: `You consume ${patterns.eveningPercentage}% of your daily calories after 6 PM. Try eating lighter meals in the evening for better sleep.`,
        priority: 'high',
        action: 'MEAL_TIMING'
      });
    }

    if (patterns.highSugarFoods.length > 0) {
      recommendations.push({
        id: 'high_sugar',
        type: 'nutrition',
        title: '🍬 Sugar Intake Alert',
        message: `You frequently eat ${patterns.highSugarFoods.join(', ')}. Consider healthier alternatives like fresh fruits.`,
        priority: 'high',
        action: 'REDUCE_SUGAR'
      });
    }

    if (patterns.lowProtein) {
      recommendations.push({
        id: 'low_protein',
        type: 'nutrition',
        title: '🥚 Increase Protein Intake',
        message: `Your average protein intake is ${patterns.avgProtein}g/day. Aim for ${user.profile?.weight ? Math.round(user.profile.weight * 1.6) : 100}g/day.`,
        priority: 'medium',
        action: 'ADD_PROTEIN'
      });
    }

    if (patterns.inconsistentMeals) {
      recommendations.push({
        id: 'meal_consistency',
        type: 'habit',
        title: '⏰ Establish Regular Meal Times',
        message: 'Your meal times are irregular. Try eating at consistent times for better metabolism.',
        priority: 'medium',
        action: 'MEAL_SCHEDULE'
      });
    }

    if (patterns.exceededGoal) {
      recommendations.push({
        id: 'calorie_goal',
        type: 'goal',
        title: '📊 Calorie Goal',
        message: `You exceeded your daily goal of ${user.dailyCalorieGoal} calories on ${patterns.daysExceeded} days. Consider portion control.`,
        priority: 'high',
        action: 'PORTION_CONTROL'
      });
    }

    if (patterns.weeklyTrending) {
      recommendations.push({
        id: 'weekly_trend',
        type: 'progress',
        title: `📈 ${patterns.weeklyTrending === 'up' ? 'Increasing' : 'Decreasing'} Intake`,
        message: `Your calorie intake is ${patterns.weeklyTrending === 'up' ? 'increasing' : 'decreasing'} week over week. ${patterns.weeklyTrending === 'up' ? 'Consider increasing physical activity.' : 'Great progress!'}`,
        priority: 'medium',
        action: 'TRACK_PROGRESS'
      });
    }

    // Add motivational recommendations
    if (meals.length >= 30) {
      recommendations.push({
        id: 'consistency_badge',
        type: 'achievement',
        title: '🏆 Great Consistency!',
        message: 'You\'ve logged meals for 30 days! Keep up the excellent tracking habit.',
        priority: 'low',
        action: 'ACHIEVEMENT'
      });
    }

    // Add hydration reminder
    recommendations.push({
      id: 'hydration',
      type: 'health',
      title: '💧 Stay Hydrated',
      message: 'Remember to drink 8 glasses of water (about 2 liters) daily for optimal health.',
      priority: 'low',
      action: 'HYDRATION'
    });

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;

  } catch (error) {
    console.error('Recommendation generation error:', error);
    return [];
  }
};

/**
 * Analyze user's eating patterns
 * @param {Array} meals - Array of meal documents
 * @returns {Object} Pattern analysis object
 */
const analyzePatterns = (meals) => {
  const patterns = {
    eveningHeavier: false,
    eveningPercentage: 0,
    highSugarFoods: [],
    lowProtein: false,
    avgProtein: 0,
    inconsistentMeals: false,
    exceededGoal: false,
    daysExceeded: 0,
    weeklyTrending: null,
    mealCount: meals.length
  };

  if (meals.length === 0) return patterns;

  // Analyze timing
  const timeDistribution = {};
  meals.forEach(meal => {
    const hour = new Date(meal.createdAt).getHours();
    const timeSlot = hour >= 18 ? 'evening' : hour >= 12 ? 'afternoon' : 'morning';
    timeDistribution[timeSlot] = (timeDistribution[timeSlot] || 0) + meal.totalCalories;
  });

  const totalCalories = meals.reduce((sum, m) => sum + m.totalCalories, 0);
  patterns.eveningPercentage = Math.round((timeDistribution.evening || 0) / totalCalories * 100);
  patterns.eveningHeavier = patterns.eveningPercentage > 40;

  // Analyze food types
  const foodFrequency = {};
  const sugarFoods = ['pizza', 'burger', 'candy', 'soda', 'dessert'];
  
  meals.forEach(meal => {
    meal.foods.forEach(food => {
      foodFrequency[food.name] = (foodFrequency[food.name] || 0) + 1;
      if (sugarFoods.some(sugar => food.name.toLowerCase().includes(sugar))) {
        if (!patterns.highSugarFoods.includes(food.name)) {
          patterns.highSugarFoods.push(food.name);
        }
      }
    });
  });

  // Analyze protein
  const totalProtein = meals.reduce((sum, meal) => {
    return sum + (meal.foods.reduce((foodSum, food) => {
      return foodSum + (food.nutrition?.protein || 0);
    }, 0));
  }, 0);
  
  patterns.avgProtein = Math.round(totalProtein / Math.max(meals.length, 1));
  patterns.lowProtein = patterns.avgProtein < 50;

  // Check meal consistency
  const mealTimes = meals.map(m => new Date(m.createdAt).getHours());
  const avgMealTime = mealTimes.reduce((a, b) => a + b) / mealTimes.length;
  const mealTimeVariance = Math.sqrt(
    mealTimes.reduce((sum, time) => sum + Math.pow(time - avgMealTime, 2), 0) / mealTimes.length
  );
  patterns.inconsistentMeals = mealTimeVariance > 5; // High variance = inconsistent

  // Check goal exceedances
  patterns.daysExceeded = meals.filter(m => m.totalCalories > 2000).length;
  patterns.exceededGoal = patterns.daysExceeded >= 5;

  // Analyze weekly trend
  if (meals.length >= 7) {
    const thisWeek = meals.slice(0, 7).reduce((sum, m) => sum + m.totalCalories, 0) / 7;
    const lastWeek = meals.length >= 14 
      ? meals.slice(7, 14).reduce((sum, m) => sum + m.totalCalories, 0) / 7 
      : thisWeek;
    
    if (thisWeek > lastWeek * 1.05) patterns.weeklyTrending = 'up';
    else if (thisWeek < lastWeek * 0.95) patterns.weeklyTrending = 'down';
  }

  return patterns;
};

/**
 * Get food alternatives based on nutritional goals
 * @param {string} foodName - Current food name
 * @param {string} goal - Goal type (reduce_sugar, reduce_calories, increase_protein)
 * @returns {Array} Array of alternative foods
 */
export const getFoodAlternatives = (foodName, goal) => {
  const alternatives = {
    burger: { reduce_calories: 'grilled_chicken_breast', reduce_sugar: 'salad', increase_protein: 'lean_ground_turkey' },
    pizza: { reduce_calories: 'whole_wheat_pizza', reduce_sugar: 'vegetable_pizza', increase_protein: 'chicken_pizza' },
    soda: { reduce_calories: 'water', reduce_sugar: 'unsweetened_tea', increase_protein: 'protein_shake' },
    candy: { reduce_calories: 'dark_chocolate', reduce_sugar: 'fresh_fruit', increase_protein: 'almonds' },
    banana: { reduce_calories: 'apple', reduce_sugar: 'berries', increase_protein: 'greek_yogurt' }
  };

  return alternatives[foodName.toLowerCase()]?.[goal] || null;
};

/**
 * Calculate personalized daily calorie goal
 * @param {Object} user - User document with profile
 * @returns {number} Recommended daily calorie goal
 */
export const calculateDailyGoal = (user) => {
  const { weight, height, age, activityLevel, profile } = user;
  
  if (!weight || !height || !age) return 2000; // Default

  // Harris-Benedict equation for BMR
  const bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);

  // Activity multipliers
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  const multiplier = activityMultipliers[activityLevel] || 1.55;
  return Math.round(bmr * multiplier);
};

export default {
  generateRecommendations,
  getFoodAlternatives,
  calculateDailyGoal
};