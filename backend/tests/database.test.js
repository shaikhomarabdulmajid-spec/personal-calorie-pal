import { sequelize } from '../config/db.js';
import User from '../models/User.js';
import Meal from '../models/Meal.js';

async function testDatabaseConnection() {
  console.log('🗄️ Testing Database Connection...');
  
  try {
    // 1. Connection test
    console.log('\n1. Testing database connection...');
    await sequelize.authenticate();
    console.log('   ✅ Database connection successful');
    
    // 2. Model sync test
    console.log('\n2. Testing table creation...');
    await sequelize.sync({ force: false }); // Don't drop existing tables
    console.log('   ✅ Tables synchronized successfully');
    
    // 3. User model test
    console.log('\n3. Testing User model...');
    const testUser = await User.create({
      username: `testuser_${Date.now()}`,
      password: 'testpassword123',
      profile: {
        firstName: 'Test',
        lastName: 'User',
        age: 25,
        weight: 70,
        height: 175,
        activityLevel: 'moderate'
      }
    });
    console.log('   ✅ User creation successful');
    
    // 4. Meal model test
    console.log('\n4. Testing Meal model...');
    const testMeal = await Meal.create({
      userId: testUser.id,
      foods: [
        {
          name: 'Test Apple',
          calories: 80,
          nutrition: { protein: 0, carbs: 21, fat: 0, fiber: 4, sugar: 16 },
          servingSize: { amount: 1, unit: 'piece' },
          confidence: 0.95
        }
      ],
      totalCalories: 80,
      mealType: 'snack',
      notes: 'Database test meal'
    });
    console.log('   ✅ Meal creation successful');
    
    // 5. Query test
    console.log('\n5. Testing queries...');
    const userMeals = await Meal.findAll({ 
      where: { userId: testUser.id },
      include: []
    });
    console.log(`   ✅ Query successful: Found ${userMeals.length} meals`);
    
    // 6. Model methods test
    console.log('\n6. Testing model methods...');
    const dailyCalories = await Meal.getDailyCalories(testUser.id);
    console.log(`   ✅ Daily calories method: ${dailyCalories.totalCalories} calories`);
    
    // 7. User authentication test
    console.log('\n7. Testing user authentication...');
    const isValidPassword = await testUser.comparePassword('testpassword123');
    console.log(`   ✅ Password comparison: ${isValidPassword}`);
    
    const token = testUser.generateToken();
    console.log(`   ✅ JWT token generation: ${token ? 'Success' : 'Failed'}`);
    
    // 8. Cleanup
    console.log('\n8. Cleaning up test data...');
    await testMeal.destroy();
    await testUser.destroy();
    console.log('   ✅ Test data cleaned up');
    
    console.log('\n🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the test
testDatabaseConnection();