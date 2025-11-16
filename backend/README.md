# 🍎 Personal Calorie Pal - Backend API

AI-powered food recognition and calorie tracking application backend.

## ⚡ Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the server**
   ```bash
   npm start
   ```

3. **Test the API**
   ```bash
   .\test_api.ps1
   ```

## 🔧 Tech Stack
- **Node.js** with Express.js
- **SQLite** database with Sequelize ORM
- **JWT** authentication
- **Multer** for file uploads
- **bcryptjs** for password hashing

## 📝 API Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /analyze` - Analyze food image
- `POST /meals/logMeal` - Log a meal
- `GET /meals/progress` - Get user progress
- `GET /foods/search` - Search food database

## 🌐 Server Info
- **Port**: 3001
- **Health Check**: `GET /health`
- **API Documentation**: `GET /`

## 📁 Project Structure
```
backend/
├── config/          # Database configuration
├── middleware/      # Authentication & rate limiting
├── models/          # Database models (User, Meal)
├── routes/          # API route handlers
├── utils/           # Helper utilities
├── .env             # Environment variables
├── server.js        # Application entry point
└── test_api.ps1     # API testing script
```