/**
 * Database Transaction Utilities
 * Handles concurrent operations and prevents race conditions
 */
import { sequelize } from '../config/db.js';
import User from '../../features/authentication/models/User.model.js';
import Meal from '../../features/meals/models/Meal.model.js';

/**
 * Thread-safe meal logging with atomic operations
 * Prevents race conditions when updating user's total calories
 */
export const logMealAtomic = async (userId, mealData) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Step 1: Create meal record within transaction
    const meal = await Meal.create({
      userId,
      ...mealData
    }, { transaction });

    // Step 2: Atomically update user's total calories
    await User.increment('totalLifetimeCalories', {
      by: mealData.totalCalories,
      where: { id: userId },
      transaction
    });

    // Step 3: Commit all changes atomically
    await transaction.commit();
    
    return meal;
  } catch (error) {
    // Rollback on any error
    await transaction.rollback();
    throw error;
  }
};

/**
 * Thread-safe user registration
 * Prevents duplicate username race conditions
 */
export const registerUserAtomic = async (userData) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Check for existing user within transaction
    const existingUser = await User.findOne({
      where: { username: userData.username },
      lock: true, // Row-level lock
      transaction
    });

    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Create user within transaction
    const user = await User.create(userData, { transaction });
    
    await transaction.commit();
    return user;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Optimistic locking for concurrent updates
 */
export const updateWithOptimisticLock = async (model, id, updates) => {
  const maxRetries = 3;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const instance = await model.findByPk(id);
      
      if (!instance) {
        throw new Error('Record not found');
      }
      
      // Store original version
      const originalVersion = instance.updatedAt;
      
      // Apply updates
      Object.assign(instance, updates);
      
      // Save with version check
      await instance.save({
        where: {
          id: id,
          updatedAt: originalVersion
        }
      });
      
      return instance;
    } catch (error) {
      if (error.name === 'SequelizeOptimisticLockError' && retries < maxRetries - 1) {
        retries++;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 100));
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Failed to update after maximum retries');
};