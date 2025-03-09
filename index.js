require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const { initializeDatabase } = require('./database/db');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'https://space-miner.mooo.com',
    'http://space-miner.mooo.com',
    'https://t.me',
    process.env.WEBAPP_URL,
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Telegram-Data']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  
  // Log request headers for authentication debugging
  if (req.originalUrl.includes('/api/')) {
    console.log(`Headers: ${JSON.stringify({
      authorization: req.headers.authorization ? 'Bearer [REDACTED]' : 'None',
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    })}`);
  }
  
  // Capture response
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - start;
    const contentLength = body ? body.length : 0;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms, ${contentLength} bytes)`);
    
    // Log error responses for debugging
    if (res.statusCode >= 400 && req.originalUrl.includes('/api/')) {
      try {
        const bodyObj = JSON.parse(body);
        console.error(`Error response: ${JSON.stringify(bodyObj)}`);
      } catch (e) {
        // If not JSON or parsing fails
        console.error(`Error response (non-JSON): ${body}`);
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
initializeDatabase();

// Initialize Telegram Bot
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Bot commands
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  // For Telegram Web App, URL must be HTTPS
  const webAppUrl = process.env.WEBAPP_URL;
  
  if (!webAppUrl || !webAppUrl.startsWith('https://')) {
    bot.sendMessage(chatId, 'Welcome to Space Miner! The game is currently being set up. Please try again later.');
    console.log('Error: WEBAPP_URL must be an HTTPS URL for Telegram Web App buttons.');
    return;
  }
  
  bot.sendMessage(chatId, 'Welcome to Space Miner! Click the button below to start your galactic exploration adventure.', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Launch Space Miner', web_app: { url: webAppUrl } }]
      ]
    }
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/planets', require('./routes/planets'));
app.use('/api/expeditions', require('./routes/expeditions'));
app.use('/api/shop', require('./routes/shop'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/fortune-wheel', require('./routes/fortuneWheel'));

// Error handling for missing routes
app.use('/api/*', (req, res) => {
  console.error(`API endpoint not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'endpoint_not_found',
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Serve the main app for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'server_error',
    message: 'An unexpected error occurred on the server'
  });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Web app URL: ${process.env.WEBAPP_URL || 'Not configured'}`);
  console.log(`JWT Secret configured: ${process.env.JWT_SECRET ? 'Yes' : 'No - Authentication will fail!'}`);
});
