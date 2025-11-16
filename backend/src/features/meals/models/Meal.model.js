import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../../../core/config/db.js';

const Meal = sequelize.define('Meal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },

  // Store foods as JSON array
  foods: {
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'At least one food item is required' },
      isValidFoods(value) {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('A meal must contain at least one food item');
        }
        
        // Validate each food item structure
        value.forEach(food => {
          if (!food.name || typeof food.name !== 'string') {
            throw new Error('Food name is required');
          }
          if (!food.calories || food.calories < 0) {
            throw new Error('Calories are required and cannot be negative');
          }
        });
      }
    },
    defaultValue: []
  },

  totalCalories: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Total calories cannot be negative' }
    }
  },

  // Meal metadata
  mealType: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snack', 'other'),
    defaultValue: 'other'
  },

  // Image information (stored as JSON)
  image: {
    type: DataTypes.JSON,
    defaultValue: null
  },

  // Recommended steps based on calories
  recommendedSteps: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Recommended steps cannot be negative' }
    }
  },

  // Notes from user
  notes: {
    type: DataTypes.TEXT,
    validate: {
      len: { args: [0, 500], msg: 'Notes cannot exceed 500 characters' }
    }
  },

  // When the meal was consumed (can be different from createdAt)
  consumedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  tableName: 'meals',
  indexes: [
    {
      fields: ['userId', 'consumedAt']
    },
    {
      fields: ['userId', 'createdAt']
    }
  ]
});

// Indexes will be created automatically by Sequelize

// Instance method for calculating total nutrition
Meal.prototype.getTotalNutrition = function() {
  if (!this.foods || !Array.isArray(this.foods)) return { protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };
  
  return this.foods.reduce((total, food) => {
    const nutrition = food.nutrition || {};
    return {
      protein: total.protein + (nutrition.protein || 0),
      carbs: total.carbs + (nutrition.carbs || 0),
      fat: total.fat + (nutrition.fat || 0),
      fiber: total.fiber + (nutrition.fiber || 0),
      sugar: total.sugar + (nutrition.sugar || 0)
    };
  }, { protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 });
};

// Pre-save hook to calculate total calories
Meal.beforeCreate(async (meal) => {
  if (meal.foods && Array.isArray(meal.foods)) {
    meal.totalCalories = meal.foods.reduce((total, food) => total + (food.calories || 0), 0);
    meal.recommendedSteps = Math.round(meal.totalCalories * 0.05);
  }
});

Meal.beforeUpdate(async (meal) => {
  if (meal.changed('foods') && meal.foods && Array.isArray(meal.foods)) {
    meal.totalCalories = meal.foods.reduce((total, food) => total + (food.calories || 0), 0);
    meal.recommendedSteps = Math.round(meal.totalCalories * 0.05);
  }
});

// Static method to get user's daily calories
Meal.getDailyCalories = async function(userId, date = new Date()) {
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const result = await this.findAll({
    where: {
      userId: userId,
      consumedAt: {
        [Op.gte]: startOfDay,
        [Op.lt]: endOfDay
      }
    },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('totalCalories')), 'totalCalories'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'mealCount'],
      [sequelize.fn('SUM', sequelize.col('recommendedSteps')), 'totalSteps']
    ],
    raw: true
  });

  const data = result[0];
  return {
    totalCalories: parseInt(data.totalCalories) || 0,
    mealCount: parseInt(data.mealCount) || 0,
    totalSteps: parseInt(data.totalSteps) || 0
  };
};

// Static method to get weekly calories
Meal.getWeeklyCalories = async function(userId, date = new Date()) {
  const startOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

  const result = await this.findAll({
    where: {
      userId: userId,
      consumedAt: {
        [Op.gte]: startOfWeek,
        [Op.lt]: endOfWeek
      }
    },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('totalCalories')), 'totalCalories'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'mealCount'],
      [sequelize.fn('SUM', sequelize.col('recommendedSteps')), 'totalSteps']
    ],
    raw: true
  });

  const data = result[0];
  return {
    totalCalories: parseInt(data.totalCalories) || 0,
    mealCount: parseInt(data.mealCount) || 0,
    totalSteps: parseInt(data.totalSteps) || 0
  };
};

export default Meal;