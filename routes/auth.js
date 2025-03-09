const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getOne, runQuery } = require('../database/db');
const { verifyToken } = require('../middleware/auth');

// Telegram authentication middleware
const authenticateTelegram = async (req, res, next) => {
  try {
    console.log('Telegram authentication request received:', req.body);
    const { telegram_id, username, auth_date, initData } = req.body;
    
    // Log the received initData if available
    if (initData) {
      console.log(`Received Telegram initData: ${initData.substring(0, 50)}...`);
    } else {
      console.log('No Telegram initData received in request');
    }
    
    // Validate required fields
    if (!telegram_id) {
      console.error('Missing telegram_id in authentication request');
      return res.status(401).json({ error: 'Invalid authentication data: telegram_id is required' });
    }
    
    console.log(`Processing authentication for Telegram user ${telegram_id} (${username || 'unnamed'})`);
    
    // Check if user exists
    let user = null;
    try {
      user = await getOne('SELECT * FROM users WHERE telegram_id = ?', [telegram_id]);
      console.log('User query result:', user);
    } catch (dbError) {
      console.error('Error querying for existing user:', dbError);
      return res.status(500).json({ error: 'Database error while checking for existing user' });
    }
    
    // If user doesn't exist, create a new one
    if (!user) {
      console.log(`Creating new user for Telegram ID: ${telegram_id}`);
      try {
        // First create the user
        const insertQuery = 'INSERT INTO users (telegram_id, username, last_login) VALUES (?, ?, ?)';
        const insertParams = [telegram_id, username || `user_${telegram_id}`, new Date().toISOString()];
        console.log('Executing insert query:', insertQuery, 'with params:', insertParams);
        
        const result = await runQuery(insertQuery, insertParams);
        
        console.log('Insert result:', result);
        
        if (!result) {
          console.error('Failed to create user: No result returned');
          return res.status(500).json({ error: 'Failed to create user account' });
        }
        
        if (result.lastID === undefined) {
          console.error('Failed to create user: No lastID returned');
          // Try to get the user by telegram_id instead
          console.log('Trying to get user by telegram_id instead');
          user = await getOne('SELECT * FROM users WHERE telegram_id = ?', [telegram_id]);
          
          if (!user) {
            console.error('Could not find user after insertion attempt');
            return res.status(500).json({ error: 'Failed to create and retrieve user account' });
          }
          
          console.log('Found user by telegram_id after insertion:', user);
        } else {
          // Get the newly created user
          console.log(`Retrieving newly created user with ID: ${result.lastID}`);
          user = await getOne('SELECT * FROM users WHERE id = ?', [result.lastID]);
          
          if (!user) {
            console.error(`Failed to retrieve newly created user with ID: ${result.lastID}`);
            // Try to get the user by telegram_id instead
            console.log('Trying to get user by telegram_id instead');
            user = await getOne('SELECT * FROM users WHERE telegram_id = ?', [telegram_id]);
            
            if (!user) {
              console.error('Could not find user after insertion attempt');
              return res.status(500).json({ error: 'Failed to retrieve user account' });
            }
            
            console.log('Found user by telegram_id after insertion:', user);
          }
        }
        
        console.log(`New user created:`, user);
      } catch (dbError) {
        console.error('Database error while creating user:', dbError);
        return res.status(500).json({ error: 'Database error while creating user' });
      }
    } else {
      // Update user information and last login
      console.log(`Updating existing user: ${user.id} (Telegram ID: ${telegram_id})`);
      try {
        await runQuery(
          'UPDATE users SET username = ?, last_login = ? WHERE id = ?',
          [
            username || user.username || `user_${telegram_id}`, 
            new Date().toISOString(), 
            user.id
          ]
        );
        
        // Refresh user data after update
        user = await getOne('SELECT * FROM users WHERE id = ?', [user.id]);
        
        if (!user) {
          console.error(`Failed to retrieve updated user with ID: ${user.id}`);
          return res.status(500).json({ error: 'Failed to retrieve updated user account' });
        }
        
        console.log('User updated successfully:', user);
      } catch (dbError) {
        console.error('Database error while updating user:', dbError);
        return res.status(500).json({ error: 'Database error while updating user' });
      }
    }
    
    // Verify user object is valid before generating token
    if (!user) {
      console.error('User object is null after processing');
      return res.status(500).json({ error: 'Failed to process user account' });
    }
    
    if (!user.id) {
      console.error('User object has no id:', user);
      return res.status(500).json({ error: 'Invalid user data: missing id' });
    }
    
    if (!user.telegram_id) {
      console.error('User object has no telegram_id:', user);
      return res.status(500).json({ error: 'Invalid user data: missing telegram_id' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, telegram_id: user.telegram_id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    console.log(`Authentication successful for user ID: ${user.id}, token generated`);
    
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
