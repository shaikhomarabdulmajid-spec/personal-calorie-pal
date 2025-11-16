import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// SQLite database configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_STORAGE || './database.sqlite',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

/**
 * Connect to SQLite database using Sequelize
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ SQLite database connected successfully');
    
    // Sync all models (create tables if they don't exist)
    await sequelize.sync();
    console.log('🔄 Database tables synchronized');
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await sequelize.close();
      console.log('🛑 SQLite connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️  Continuing without database - API will work with mock data');
  }
};

export { sequelize, Sequelize };
export default connectDB;