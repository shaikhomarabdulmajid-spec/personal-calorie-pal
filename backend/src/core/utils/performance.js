/**
 * Database Query Optimization Utilities
 * Implements caching, indexing suggestions, and query performance improvements
 */
import { Op } from 'sequelize';
import { sequelize } from '../config/db.js';

/**
 * In-memory cache for frequently accessed data
 * In production, replace with Redis
 */
class SimpleCache {
  constructor(maxSize = 1000, ttl = 300000) { // 5 minutes default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key, value) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

const cache = new SimpleCache();

/**
 * Optimized user analytics with caching
 */
export const getCachedUserAnalytics = async (userId) => {
  const cacheKey = `analytics:${userId}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  // Optimized query with single database call
  const analytics = await sequelize.query(`
    SELECT 
      COUNT(*) as totalMeals,
      SUM(totalCalories) as totalCalories,
      AVG(totalCalories) as avgCaloriesPerMeal,
      DATE(consumedAt) as date,
      mealType,
      COUNT(*) as mealCount
    FROM meals 
    WHERE userId = :userId 
      AND consumedAt >= DATE('now', '-30 days')
    GROUP BY DATE(consumedAt), mealType
    ORDER BY date DESC
  `, {
    replacements: { userId },
    type: sequelize.QueryTypes.SELECT
  });

  cache.set(cacheKey, analytics);
  return analytics;
};

/**
 * Optimized meal history with pagination and indexing
 */
export const getOptimizedMealHistory = async (userId, options = {}) => {
  const {
    page = 1,
    limit = 20,
    startDate,
    endDate,
    mealType
  } = options;

  const cacheKey = `meals:${userId}:${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  // Build optimized query
  let whereClause = 'WHERE userId = :userId';
  const replacements = { userId };

  if (startDate) {
    whereClause += ' AND consumedAt >= :startDate';
    replacements.startDate = startDate;
  }
  
  if (endDate) {
    whereClause += ' AND consumedAt <= :endDate';
    replacements.endDate = endDate;
  }
  
  if (mealType) {
    whereClause += ' AND mealType = :mealType';
    replacements.mealType = mealType;
  }

  const offset = (page - 1) * limit;

  // Single optimized query for both data and count
  const [meals, totalCount] = await Promise.all([
    sequelize.query(`
      SELECT id, foods, totalCalories, mealType, consumedAt, recommendedSteps, notes
      FROM meals 
      ${whereClause}
      ORDER BY consumedAt DESC 
      LIMIT :limit OFFSET :offset
    `, {
      replacements: { ...replacements, limit, offset },
      type: sequelize.QueryTypes.SELECT
    }),
    
    sequelize.query(`
      SELECT COUNT(*) as count 
      FROM meals 
      ${whereClause}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    })
  ]);

  const result = {
    meals,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount[0].count / limit),
      totalItems: totalCount[0].count,
      itemsPerPage: limit
    }
  };

  cache.set(cacheKey, result);
  return result;
};

/**
 * Database indexing recommendations
 */
export const createPerformanceIndexes = async () => {
  try {
    // Index for user-based queries (most common)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_meals_user_consumed 
      ON meals(userId, consumedAt DESC);
    `);

    // Index for meal type filtering
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_meals_type_date 
      ON meals(mealType, consumedAt DESC);
    `);

    // Index for date range queries
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_meals_consumed_date 
      ON meals(consumedAt);
    `);

    // Index for user authentication
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username 
      ON users(username);
    `);

    console.log('Performance indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

/**
 * Background job to warm up cache
 */
export const warmUpCache = async () => {
  try {
    // Get most active users
    const activeUsers = await sequelize.query(`
      SELECT DISTINCT userId 
      FROM meals 
      WHERE consumedAt >= DATE('now', '-7 days')
      ORDER BY COUNT(*) DESC 
      LIMIT 100
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // Pre-load their analytics
    const promises = activeUsers.map(user => 
      getCachedUserAnalytics(user.userId).catch(err => 
        console.log(`Cache warm-up failed for user ${user.userId}:`, err.message)
      )
    );

    await Promise.all(promises);
    console.log(`Cache warmed up for ${activeUsers.length} users`);
  } catch (error) {
    console.error('Cache warm-up error:', error);
  }
};

/**
 * Query performance monitoring
 */
export const queryPerformanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (duration > 1000) { // Log slow queries (> 1 second)
      console.warn(`Slow query detected: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
};