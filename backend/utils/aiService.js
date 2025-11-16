/**
 * AI Service for Food Analysis and Recommendations
 * 
 * This service provides AI-powered features including:
 * - Food recognition from images
 * - Nutritional analysis
 * - Meal recommendations
 * - Health insights
 */

import OpenAI from 'openai';
import axios from 'axios';

class AIService {
  constructor() {
    // Initialize OpenAI client if API key is available
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;

    // Food recognition model endpoint (using Clarifai Food Recognition)
    this.clarifaiApiKey = process.env.CLARIFAI_API_KEY;
    this.clarifaiModelUrl = 'https://api.clarifai.com/v2/models/food-item-recognition/versions/1d5fd481e0cf4826aa72ec3ff049e044/outputs';
  }

  /**
   * Analyze food from image using AI vision models
   * @param {string} imageBase64 - Base64 encoded image
   * @returns {Promise<Object>} - Detected food items with nutritional info
   */
  async analyzeFoodFromImage(imageBase64) {
    try {
      // Try OpenAI GPT-4 Vision first (if available)
      if (this.openai) {
        return await this.analyzeWithOpenAI(imageBase64);
      }

      // Fallback to Clarifai Food Recognition
      if (this.clarifaiApiKey) {
        return await this.analyzeWithClarifai(imageBase64);
      }

      // Fallback to mock analysis for demo purposes
      return this.mockFoodAnalysis();

    } catch (error) {
      console.error('AI food analysis error:', error);
      // Return mock data as fallback
      return this.mockFoodAnalysis();
    }
  }

  /**
   * Analyze food using OpenAI GPT-4 Vision
   */
  async analyzeWithOpenAI(imageBase64) {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this food image and provide detailed nutritional information. Return a JSON response with the following structure:
              {
                "foods": [
                  {
                    "name": "food name",
                    "confidence": 0.95,
                    "calories": 120,
                    "servingSize": {"amount": 1, "unit": "piece"},
                    "nutrition": {
                      "protein": 3,
                      "carbs": 25,
                      "fat": 0.5,
                      "fiber": 3,
                      "sugar": 15,
                      "sodium": 2
                    }
                  }
                ],
                "totalCalories": 120,
                "mealType": "snack",
                "healthScore": 8.5,
                "recommendations": ["Add protein for better satiety", "Good source of fiber"]
              }`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      ...result,
      analysisMethod: 'openai-gpt4-vision',
      confidence: 0.9
    };
  }

  /**
   * Analyze food using Clarifai Food Recognition API
   */
  async analyzeWithClarifai(imageBase64) {
    const requestBody = {
      inputs: [{
        data: {
          image: {
            base64: imageBase64
          }
        }
      }]
    };

    const response = await axios.post(this.clarifaiModelUrl, requestBody, {
      headers: {
        'Authorization': `Key ${this.clarifaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const concepts = response.data.outputs[0].data.concepts;
    const detectedFoods = concepts.slice(0, 3).map(concept => ({
      name: concept.name,
      confidence: concept.value,
      calories: this.estimateCalories(concept.name),
      servingSize: { amount: 1, unit: 'serving' },
      nutrition: this.estimateNutrition(concept.name)
    }));

    return {
      foods: detectedFoods,
      totalCalories: detectedFoods.reduce((sum, food) => sum + food.calories, 0),
      mealType: this.determineMealType(detectedFoods),
      healthScore: this.calculateHealthScore(detectedFoods),
      analysisMethod: 'clarifai-food-recognition',
      confidence: Math.max(...detectedFoods.map(f => f.confidence))
    };
  }

  /**
   * Mock food analysis for demo/fallback purposes
   */
  mockFoodAnalysis() {
    const mockFoods = [
      {
        name: 'apple',
        confidence: 0.95,
        calories: 95,
        servingSize: { amount: 1, unit: 'medium' },
        nutrition: { protein: 0.5, carbs: 25, fat: 0.3, fiber: 4, sugar: 19, sodium: 2 }
      },
      {
        name: 'banana',
        confidence: 0.88,
        calories: 105,
        servingSize: { amount: 1, unit: 'medium' },
        nutrition: { protein: 1.3, carbs: 27, fat: 0.4, fiber: 3, sugar: 14, sodium: 1 }
      }
    ];

    const randomFood = mockFoods[Math.floor(Math.random() * mockFoods.length)];
    
    return {
      foods: [randomFood],
      totalCalories: randomFood.calories,
      mealType: 'snack',
      healthScore: 8.5,
      recommendations: [
        'Great source of fiber and vitamins',
        'Perfect healthy snack option',
        'Pairs well with protein for balanced nutrition'
      ],
      analysisMethod: 'mock-analysis',
      confidence: randomFood.confidence
    };
  }

  /**
   * Generate personalized meal recommendations based on user profile and history
   */
  async generateMealRecommendations(user, recentMeals = [], preferences = {}) {
    try {
      if (this.openai) {
        return await this.generateRecommendationsWithAI(user, recentMeals, preferences);
      }
      
      return this.generateBasicRecommendations(user, recentMeals);
    } catch (error) {
      console.error('Meal recommendations error:', error);
      return this.generateBasicRecommendations(user, recentMeals);
    }
  }

  /**
   * Generate AI-powered meal recommendations
   */
  async generateRecommendationsWithAI(user, recentMeals, preferences) {
    const prompt = `
    Generate 3 personalized meal recommendations for a user with the following profile:
    - Daily calorie goal: ${user.dailyCalorieGoal}
    - Current calories consumed today: ${user.todayCalories || 0}
    - Profile: ${JSON.stringify(user.profile)}
    - Recent meals: ${JSON.stringify(recentMeals.slice(0, 5))}
    - Dietary preferences: ${JSON.stringify(preferences)}

    Provide recommendations as JSON:
    {
      "recommendations": [
        {
          "name": "meal name",
          "description": "brief description",
          "calories": 350,
          "prepTime": "15 minutes",
          "ingredients": ["ingredient1", "ingredient2"],
          "nutrition": {"protein": 25, "carbs": 40, "fat": 12},
          "healthScore": 9.2,
          "reason": "why this meal is recommended for this user"
        }
      ],
      "insights": ["personalized insight 1", "insight 2"]
    }
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800
    });

    return JSON.parse(response.choices[0].message.content);
  }

  /**
   * Generate basic meal recommendations without AI
   */
  generateBasicRecommendations(user, recentMeals) {
    const remainingCalories = user.dailyCalorieGoal - (user.todayCalories || 0);
    const mealCalories = Math.max(300, Math.min(600, remainingCalories / 2));

    const recommendations = [
      {
        name: "Grilled Chicken Salad",
        description: "Fresh mixed greens with grilled chicken breast, cherry tomatoes, and light vinaigrette",
        calories: Math.round(mealCalories * 0.9),
        prepTime: "10 minutes",
        ingredients: ["chicken breast", "mixed greens", "cherry tomatoes", "vinaigrette"],
        nutrition: { protein: 35, carbs: 15, fat: 8 },
        healthScore: 9.0,
        reason: "High protein, low carb option perfect for your calorie goals"
      },
      {
        name: "Quinoa Buddha Bowl",
        description: "Nutrient-dense bowl with quinoa, roasted vegetables, and tahini dressing",
        calories: Math.round(mealCalories),
        prepTime: "20 minutes",
        ingredients: ["quinoa", "broccoli", "sweet potato", "chickpeas", "tahini"],
        nutrition: { protein: 18, carbs: 45, fat: 12 },
        healthScore: 8.8,
        reason: "Balanced macros with complete protein and fiber"
      },
      {
        name: "Salmon with Steamed Vegetables",
        description: "Omega-3 rich salmon with colorful steamed vegetables",
        calories: Math.round(mealCalories * 1.1),
        prepTime: "15 minutes",
        ingredients: ["salmon fillet", "broccoli", "carrots", "green beans"],
        nutrition: { protein: 30, carbs: 12, fat: 15 },
        healthScore: 9.5,
        reason: "Excellent source of healthy fats and lean protein"
      }
    ];

    return {
      recommendations: recommendations.slice(0, 2), // Return 2 recommendations
      insights: [
        `You have ${remainingCalories} calories remaining for today`,
        "Focus on lean proteins and vegetables for optimal nutrition",
        "Stay hydrated and consider timing your meals evenly"
      ]
    };
  }

  /**
   * Generate health insights based on user data and meal history
   */
  async generateHealthInsights(user, weeklyMeals) {
    const insights = [];
    
    // Calorie trend analysis
    const avgDailyCalories = this.calculateAverageCalories(weeklyMeals);
    if (avgDailyCalories > user.dailyCalorieGoal * 1.1) {
      insights.push({
        type: 'warning',
        title: 'Calorie Intake High',
        message: `Your average daily intake (${Math.round(avgDailyCalories)} cal) is above your goal. Consider smaller portions or more nutrient-dense foods.`,
        priority: 'high'
      });
    } else if (avgDailyCalories < user.dailyCalorieGoal * 0.8) {
      insights.push({
        type: 'info',
        title: 'Calorie Intake Low',
        message: `Your average intake (${Math.round(avgDailyCalories)} cal) might be too low. Ensure you're meeting your nutritional needs.`,
        priority: 'medium'
      });
    }

    // Meal frequency analysis
    const mealsPerDay = weeklyMeals.length / 7;
    if (mealsPerDay < 3) {
      insights.push({
        type: 'tip',
        title: 'Meal Frequency',
        message: 'Consider eating more regular meals throughout the day for better energy levels and metabolism.',
        priority: 'low'
      });
    }

    // Add positive reinforcement
    insights.push({
      type: 'success',
      title: 'Great Progress!',
      message: `You've logged ${weeklyMeals.length} meals this week. Consistent tracking leads to better results!`,
      priority: 'low'
    });

    return insights;
  }

  // Helper methods
  estimateCalories(foodName) {
    const calorieDatabase = {
      'apple': 95, 'banana': 105, 'chicken': 165, 'rice': 130,
      'bread': 80, 'egg': 70, 'milk': 60, 'cheese': 110
    };
    
    const lowercaseName = foodName.toLowerCase();
    for (const [key, calories] of Object.entries(calorieDatabase)) {
      if (lowercaseName.includes(key)) {
        return calories;
      }
    }
    return 100; // Default estimate
  }

  estimateNutrition(foodName) {
    return {
      protein: Math.round(Math.random() * 20 + 5),
      carbs: Math.round(Math.random() * 30 + 10),
      fat: Math.round(Math.random() * 15 + 2),
      fiber: Math.round(Math.random() * 8 + 1),
      sugar: Math.round(Math.random() * 20 + 2),
      sodium: Math.round(Math.random() * 500 + 50)
    };
  }

  determineMealType(foods) {
    const now = new Date().getHours();
    if (now < 10) return 'breakfast';
    if (now < 14) return 'lunch';
    if (now < 18) return 'snack';
    return 'dinner';
  }

  calculateHealthScore(foods) {
    // Simple health score calculation based on nutritional content
    let score = 7.0; // Base score
    
    foods.forEach(food => {
      if (food.nutrition) {
        if (food.nutrition.fiber > 3) score += 0.5;
        if (food.nutrition.protein > 10) score += 0.5;
        if (food.nutrition.sugar < 10) score += 0.3;
        if (food.nutrition.sodium < 300) score += 0.3;
      }
    });

    return Math.min(10, Math.max(1, score));
  }

  calculateAverageCalories(meals) {
    if (meals.length === 0) return 0;
    const totalCalories = meals.reduce((sum, meal) => sum + meal.totalCalories, 0);
    return totalCalories / 7; // Average per day over week
  }
}

export default new AIService();