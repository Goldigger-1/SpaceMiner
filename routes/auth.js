const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getOne, runQuery } = require('../database/db');
const { verifyToken } = require('../middleware/auth');

// Telegram authentication middleware
const authenticateTelegram = async (req, res, next) => {
  try {
    const { telegram_id, username, auth_date, hash } = req.body;
    
    // In a real implementation, you would verify the hash with Telegram's data
    // For simplicity, we're just checking if the telegram_id exists
    if (!telegram_id) {
      return res.status(401).json({ error: 'Invalid authentication data' });
    }
    
    // Check if user exists
    let user = await getOne('SELECT * FROM users WHERE telegram_id = ?', [telegram_id]);
    
    // If user doesn't exist, create a new one
    if (!user) {
      const result = await runQuery(
        'INSERT INTO users (telegram_id, username, last_login) VALUES (?, ?, ?)',
        [telegram_id, username, new Date().toISOString()]
      );
      
      user = await getOne('SELECT * FROM users WHERE id = ?', [result.id]);
    } else {
      // Update last login
      await runQuery(
        'UPDATE users SET last_login = ? WHERE id = ?',
        [new Date().toISOString(), user.id]
      );
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, telegram_id: user.telegram_id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Server error during authentication' });
  }
};

// Login/Register route
router.post('/login', authenticateTelegram, (req, res) => {
  res.json({
    token: req.token,
    user: {
      id: req.user.id,
      telegram_id: req.user.telegram_id,
      username: req.user.username,
      currency: req.user.currency,
      premium_currency: req.user.premium_currency
    }
  });
});

// Middleware to verify JWT token
// const verifyToken = (req, res, next) => {
//   const token = req.headers.authorization?.split(' ')[1];
//   
//   if (!token) {
//     return res.status(401).json({ error: 'No token provided' });
//   }
//   
//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
//     req.userId = decoded.id;
//     next();
//   } catch (error) {
//     console.error('Token verification error:', error);
//     res.status(401).json({ error: 'Invalid token' });
//   }
// };

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await getOne('SELECT id, telegram_id, username, currency, premium_currency FROM users WHERE id = ?', [req.userId]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
