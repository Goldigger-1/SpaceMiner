// Authentication routes
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { verifyToken } = require('../middleware/auth');

/**
 * @route POST /api/auth/login
 * @desc Authenticate user with Telegram
 * @access Public
 */
router.post('/login', async (req, res) => {
    try {
        console.log('Login request received:', req.body);
        
        const { telegram_id, username, auth_date, initData } = req.body;
        
        if (!telegram_id) {
            console.error('Missing telegram_id in request body');
            return res.status(400).json({ error: 'Missing telegram_id' });
        }
        
        console.log(`Authenticating user with Telegram ID: ${telegram_id}`);
        
        // Check if user exists in database
        const user = await db.get('SELECT * FROM users WHERE telegram_id = ?', [telegram_id]);
        
        let userId;
        
        if (!user) {
            console.log(`User with Telegram ID ${telegram_id} not found, creating new user`);
            
            // Create new user
            const result = await db.run(
                'INSERT INTO users (telegram_id, username, created_at) VALUES (?, ?, ?)',
                [telegram_id, username || `user_${telegram_id}`, Date.now()]
            );
            
            // Get the user ID from the result
            if (result.lastID) {
                userId = result.lastID;
                console.log(`Created new user with ID: ${userId}`);
            } else {
                // Fallback to getting the user ID from the database
                console.warn('lastID not returned from insert, fetching user ID from database');
                const newUser = await db.get('SELECT id FROM users WHERE telegram_id = ?', [telegram_id]);
                if (newUser) {
                    userId = newUser.id;
                    console.log(`Retrieved user ID from database: ${userId}`);
                } else {
                    console.error('Failed to create or retrieve user');
                    return res.status(500).json({ error: 'Failed to create user' });
                }
            }
            
            // Initialize user profile
            await db.run(
                'INSERT INTO user_profiles (user_id, currency, premium_currency, return_speed, storage_capacity, suit_autonomy, drone_collection) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, 1000, 10, 1, 100, 1, 0]
            );
            
            // Initialize user stats
            await db.run(
                'INSERT INTO user_stats (user_id, total_expeditions, successful_returns, total_resources) VALUES (?, ?, ?, ?)',
                [userId, 0, 0, 0]
            );
            
            console.log(`Initialized profile and stats for user ${userId}`);
        } else {
            userId = user.id;
            console.log(`Found existing user with ID: ${userId}`);
            
            // Update username if provided
            if (username && username !== user.username) {
                await db.run('UPDATE users SET username = ? WHERE id = ?', [username, userId]);
                console.log(`Updated username for user ${userId} to ${username}`);
            }
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: userId, telegram_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        console.log(`Generated token for user ${userId}`);
        
        // Return token and user data
        return res.json({
            token,
            user: {
                id: userId,
                telegram_id,
                username: username || `user_${telegram_id}`
            }
        });
    } catch (error) {
        console.error('Error in /auth/login:', error);
        return res.status(500).json({ error: 'Server error during authentication' });
    }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
router.get('/me', verifyToken, async (req, res) => {
    try {
        // User data is already available in req.user from verifyToken middleware
        if (!req.user || !req.user.id) {
            console.error('No user data in request after token verification');
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const userId = req.user.id;
        console.log(`Getting user data for ID: ${userId}`);
        
        // Get user data
        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        
        if (!user) {
            console.error(`User with ID ${userId} not found`);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Return user data without sensitive information
        return res.json({
            id: user.id,
            telegram_id: user.telegram_id,
            username: user.username,
            created_at: user.created_at
        });
    } catch (error) {
        console.error('Error in /auth/me:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route GET /api/auth/ping
 * @desc Check if server is alive and token is valid
 * @access Private
 */
router.get('/ping', verifyToken, (req, res) => {
    return res.json({ message: 'Pong', timestamp: Date.now() });
});

/**
 * @route POST /api/auth/dev-login
 * @desc Login as a specific user (development only)
 * @access Public (but should be restricted in production)
 */
router.post('/dev-login', async (req, res) => {
    // Only allow in development environment
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: 'Not allowed in production' });
    }
    
    try {
        const { user_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ error: 'Missing user_id' });
        }
        
        // Get user
        const user = await db.get('SELECT * FROM users WHERE id = ?', [user_id]);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Generate token
        const token = jwt.sign(
            { id: user.id, telegram_id: user.telegram_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        return res.json({
            token,
            user: {
                id: user.id,
                telegram_id: user.telegram_id,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Error in /auth/dev-login:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
