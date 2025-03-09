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
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
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

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
