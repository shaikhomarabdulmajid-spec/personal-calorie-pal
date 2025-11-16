import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  username: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Username is required' },
      len: { args: [3, 30], msg: 'Username must be between 3 and 30 characters' }
    }
  },
  
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Password is required' },
      len: { args: [6, 255], msg: 'Password must be at least 6 characters' }
    }
  },

  // Calorie tracking data
  totalLifetimeCalories: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },

  // Daily calorie goal (optional)
  dailyCalorieGoal: {
    type: DataTypes.INTEGER,
    defaultValue: 2000
  },

  // Profile information (stored as JSON)
  profile: {
    type: DataTypes.JSON,
    defaultValue: {
      firstName: null,
      lastName: null,
      age: null,
      weight: null, // in kg
      height: null, // in cm
      activityLevel: 'moderate'
    },
    validate: {
      isValidProfile(value) {
        if (value && value.activityLevel) {
          const validLevels = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
          if (!validLevels.includes(value.activityLevel)) {
            throw new Error('Invalid activity level');
          }
        }
      }
    }
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  tableName: 'users'
});

// Hash password before saving
User.beforeCreate(async (user) => {
  if (user.password) {
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

// Instance method to compare passwords
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate JWT token
User.prototype.generateToken = function() {
  return jwt.sign(
    { id: this.id, username: this.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Instance method to get user data without sensitive info
User.prototype.toJSON = function() {
  const user = { ...this.dataValues };
  delete user.password;
  return user;
};

export default User;