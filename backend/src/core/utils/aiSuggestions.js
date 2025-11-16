import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates AI-powered recommendations based on meal history and user goals.
 * @param {object} user - The user object from Sequelize.
 * @param {Array} mealHistory - An array of recent meal objects.
 * @returns {Promise<Array<string>>} - A list of recommendation strings.
 */
export const getAIRecipeSuggestions = async (user, mealHistory) => {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not configured. Skipping AI recommendations.');
    return [
      'Configure your OpenAI API key to get personalized meal suggestions.',
      'Try to balance your macronutrients (protein, carbs, fat) for better energy levels.',
      'Staying hydrated is key! Drink plenty of water throughout the day.'
    ];
  }

  try {
    const recentMeals = mealHistory.slice(0, 5).map(meal => {
      const foodNames = meal.foods.map(f => f.name).join(', ');
      return `- ${meal.mealType}: ${foodNames} (${meal.totalCalories} calories)`;
    }).join('\n');

    const prompt = `
      You are a friendly and encouraging nutrition assistant. Based on the user's profile and recent meals, provide three concise, actionable, and creative recipe suggestions.
      The user wants to stay within their daily calorie goal.

      User Profile:
      - Daily Calorie Goal: ${user.dailyCalorieGoal} calories
      - Activity Level: ${user.profile.activityLevel || 'moderate'}

      Recent Meals (last 5):
      ${recentMeals || 'No recent meals logged.'}

      Generate three distinct and healthy recipe ideas that would complement their recent diet. For each suggestion, provide a very brief, one-sentence description of why it's a good choice.
      Format the output as a numbered list. Be creative and avoid generic advice.

      Example:
      1. Lemon Herb Baked Cod with Asparagus: A light, protein-packed dinner that's low in calories but high in flavor.
      2. Quinoa and Black Bean Salad: A fiber-rich lunch to keep you full and energized throughout the afternoon.
      3. Greek Yogurt with Berries and a sprinkle of Almonds: A perfect high-protein breakfast to kickstart your metabolism.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: prompt }],
      max_tokens: 200,
      n: 1,
      temperature: 0.7,
    });

    const suggestions = response.choices[0].message.content
      .trim()
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return suggestions.length > 0 ? suggestions : ['Could not generate AI suggestions at this time. Try eating a variety of colorful vegetables!'];

  } catch (error) {
    console.error('Error getting AI recipe suggestions:', error.message);
    return [
      'AI suggestions are currently unavailable. Focus on whole foods and mindful eating!',
      'A balanced diet includes a mix of proteins, carbs, and healthy fats.',
      'Consider adding a leafy green salad to your next meal for extra nutrients.'
    ];
  }
};
