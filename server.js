import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. CORE LOGGING & CONFIG ---
const logger = pino({
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

const CONFIG = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'high-security-fallback-2026',
  ALLOWED_ORIGINS: [process.env.ALLOWED_ORIGIN, 'http://localhost:3000', 'http://localhost:3001'].filter(Boolean),
  OPENAI_KEY: process.env.OPENAI_API_KEY
};

// --- 2. DATABASE SYSTEM (REPOSITORY PATTERN) ---
const db = new Database('nutrition.db');
db.pragma('journal_mode = WAL');

// Initial Schema & Indexing for Performance
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        calories INTEGER NOT NULL,
        insight TEXT,
        score INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_meals_user ON meals(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`);

const Repo = {
  User: {
    create: (username, hash) => db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hash),
    findByUsername: (name) => db.prepare('SELECT * FROM users WHERE username = ?').get(name)
  },
  Meal: {
    create: (userId, data) => db.prepare('INSERT INTO meals (user_id, name, calories, insight, score) VALUES (?, ?, ?, ?, ?)').run(userId, data.name, data.calories, data.insight, data.score),
    getByUser: (userId) => db.prepare('SELECT * FROM meals WHERE user_id = ? ORDER BY created_at DESC').all(userId)
  },
  Job: {
    upsert: (id, userId, status, result = null) => db.prepare('INSERT OR REPLACE INTO jobs (id, user_id, status, result) VALUES (?, ?, ?, ?)').run(id, userId, status, result ? JSON.stringify(result) : null),
    updateStatus: (id, status) => db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(status, id)
  }
};

// --- 3. BUSINESS SERVICES ---
const openai = new OpenAI({ apiKey: CONFIG.OPENAI_KEY });

const AIService = {
  async processImage(jobId, userId, buffer, io) {
    try {
      Repo.Job.updateStatus(jobId, 'processing');
      io.to(`u_${userId}`).emit('job:update', { jobId, status: 'processing' });

      let result;
      if (!CONFIG.OPENAI_KEY) {
        await new Promise(r => setTimeout(r, 1500));
        result = { name: "Simulated Nutritious Meal", calories: 420, insight: "Development fallback: High protein density detection.", score: 10 };
      } else {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: "Identify food. Return JSON ONLY: { \"name\": string, \"calories\": number, \"insight\": string, \"score\": number (-15 to 15) }" },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${buffer.toString('base64')}` } }
            ]
          }],
          response_format: { type: "json_object" }
        });
        result = JSON.parse(response.choices[0].message.content);
      }

      const info = Repo.Meal.create(userId, result);
      Repo.Job.upsert(jobId, userId, 'completed', result);
      io.to(`u_${userId}`).emit('job:update', {
        jobId, status: 'completed',
        result: { ...result, id: info.lastInsertRowid, created_at: new Date().toISOString() }
      });
    } catch (error) {
      logger.error({ jobId, userId, err: error.message }, 'AI Service Failure');
      Repo.Job.updateStatus(jobId, 'failed');
      io.to(`u_${userId}`).emit('job:update', { jobId, status: 'failed', error: 'Analysis failed' });
    }
  }
};

// --- 4. APP & MIDDLEWARE ---
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.set('trust proxy', 1); // Proxy transparency

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.socket.io"],
      "connect-src": ["'self'", "ws:", "wss:", "http:", "https:"]
    },
  },
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes' }
});

app.use('/api/', limiter);

app.use(cors({ origin: (origin, cb) => !origin || CONFIG.ALLOWED_ORIGINS.includes(origin) ? cb(null, true) : cb(new Error('CORS Violation')) }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Standard Response Envelope
const Result = {
  ok: (res, data, code = 200) => res.status(code).json({ success: true, data }),
  fail: (res, msg, code = 400) => res.status(code).json({ success: false, error: msg })
};

// Request Logging
app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path, ip: req.ip }, 'Inbound Request');
  next();
});

// Validation Middleware
const Validate = (schema) => (req, res, next) => {
  try {
    schema.parse({ ...req.body, ...req.query, ...req.params });
    next();
  } catch (e) { Result.fail(res, e.errors[0].message, 400); }
};

const AuthGuard = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return Result.fail(res, 'Authentication required', 401);
  jwt.verify(token, CONFIG.JWT_SECRET, (err, user) => {
    if (err) return Result.fail(res, 'Session expired', 403);
    req.user = user;
    next();
  });
};

// --- 5. CONTROLLERS / ROUTES ---

const Schemas = {
  auth: z.object({ username: z.string().min(3).max(20), password: z.string().min(6) }),
  search: z.object({ q: z.string().min(1).max(50) })
};

app.get('/health', (req, res) => Result.ok(res, { status: 'UP', timestamp: new Date().toISOString() }));

app.post('/api/v1/auth/register', Validate(Schemas.auth), async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 12);
    Repo.User.create(req.body.username, hash);
    Result.ok(res, null, 201);
  } catch (e) { Result.fail(res, 'Username already exists', 409); }
});

app.post('/api/v1/auth/login', Validate(Schemas.auth), async (req, res) => {
  try {
    const user = Repo.User.findByUsername(req.body.username);
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) return Result.fail(res, 'Invalid credentials', 401);

    const token = jwt.sign({ id: user.id, username: user.username }, CONFIG.JWT_SECRET, { expiresIn: '7d' });
    Result.ok(res, { token, user: { id: user.id, username: user.username } });
  } catch (e) {
    logger.error(e);
    Result.fail(res, 'Login processing error', 500);
  }
});

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/v1/analyze', AuthGuard, upload.single('image'), (req, res) => {
  if (!req.file) return Result.fail(res, 'No document uploaded', 400);
  const jobId = uuidv4();
  Repo.Job.upsert(jobId, req.user.id, 'pending');
  AIService.processImage(jobId, req.user.id, req.file.buffer, io);
  res.status(202).json({ success: true, jobId });
});

app.get('/api/v1/meals', AuthGuard, (req, res) => Result.ok(res, Repo.Meal.getByUser(req.user.id)));

app.get('/api/v1/foods/search', AuthGuard, Validate(Schemas.search), (req, res) => {
  // Placeholder: In a real system, this would hit a Nutrition API (Edamam/Nutritionix)
  const mockDb = [
    { name: 'Avocado Toast', calories: 350 },
    { name: 'Quinoa Salad', calories: 280 },
    { name: 'Protein Shake', calories: 150 },
    { name: 'Greek Yogurt', calories: 120 },
    { name: 'Chicken Breast', calories: 165 }
  ];
  const results = mockDb.filter(f => f.name.toLowerCase().includes(req.query.q.toLowerCase()));
  Result.ok(res, results);
});

// --- 6. SOCKET.IO & SIGNAL HANDLING ---
io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(`u_${userId}`));
});

const shutdown = () => {
  logger.info('Graceful shutdown initiated...');
  httpServer.close(() => {
    db.close();
    logger.info('Resources released. Shutdown complete.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

httpServer.listen(CONFIG.PORT, () => logger.info(`🚀 CalCatcher Elite Node online on Port ${CONFIG.PORT}`));
