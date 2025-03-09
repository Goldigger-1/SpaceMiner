const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verifyToken } = require('../middleware/auth');

/**
 * @route GET /api/profile
 * @desc Get user profile
 * @access Private
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        console.log(`Getting profile for user ID: ${req.user.id}`);
        
        // Get user profile
        const profile = await db.get(`
            SELECT up.*, u.username, u.telegram_id
            FROM user_profiles up
            JOIN users u ON up.user_id = u.id
            WHERE up.user_id = ?
        `, [req.user.id]);
        
        if (!profile) {
            console.error(`Profile not found for user ID: ${req.user.id}`);
            return res.status(404).json({ error: 'Profile not found' });
        }
        
        // Get user stats
        const stats = await db.get('SELECT * FROM user_stats WHERE user_id = ?', [req.user.id]);
        
        // Get active expedition if any
        const activeExpedition = await db.get(`
            SELECT e.*, p.name as planet_name, p.image as planet_image, p.rarity as planet_rarity
            FROM expeditions e
            JOIN planets p ON e.planet_id = p.id
            WHERE e.user_id = ? AND e.status = 'active'
            ORDER BY e.start_time DESC
            LIMIT 1
        `, [req.user.id]);
        
        // Get fortune wheel spins
        const spins = 3; // Default spins per day
        
        // Combine all data
        const userData = {
            id: profile.user_id,
            username: profile.username,
            telegram_id: profile.telegram_id,
            currency: profile.currency,
            premium_currency: profile.premium_currency,
            return_speed: profile.return_speed,
            storage_capacity: profile.storage_capacity,
            suit_autonomy: profile.suit_autonomy,
            drone_collection: profile.drone_collection,
            stats: stats || {
                total_expeditions: 0,
                successful_returns: 0,
                total_resources: 0
            },
            active_expedition: activeExpedition || null,
            spins: spins
        };
        
        console.log(`Successfully retrieved profile for user ID: ${req.user.id}`);
        res.json(userData);
    } catch (error) {
        console.error('Error getting profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route GET /api/profile/inventory
 * @desc Get user inventory
 * @access Private
 */
router.get('/inventory', verifyToken, async (req, res) => {
    try {
        const inventory = await db.all(`
            SELECT i.*, it.name, it.description, it.type, it.rarity, it.image
            FROM inventory i
            JOIN items it ON i.item_id = it.id
            WHERE i.user_id = ?
        `, [req.user.id]);
        
        res.json({ inventory });
    } catch (error) {
        console.error('Error getting inventory:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route GET /api/profile/expeditions
 * @desc Get user expeditions history
 * @access Private
 */
router.get('/expeditions', verifyToken, async (req, res) => {
    try {
        const expeditions = await db.all(`
            SELECT e.*, p.name as planet_name, p.image as planet_image, p.rarity as planet_rarity
            FROM expeditions e
            JOIN planets p ON e.planet_id = p.id
            WHERE e.user_id = ?
            ORDER BY e.start_time DESC
            LIMIT 20
        `, [req.user.id]);
        
        res.json({ expeditions });
    } catch (error) {
        console.error('Error getting expeditions:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @route PUT /api/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/', verifyToken, async (req, res) => {
    try {
        const { username } = req.body;
        
        if (username) {
            await db.run('UPDATE users SET username = ? WHERE id = ?', [username, req.user.id]);
        }
        
        // Get updated profile
        const profile = await db.get(`
            SELECT up.*, u.username, u.telegram_id
            FROM user_profiles up
            JOIN users u ON up.user_id = u.id
            WHERE up.user_id = ?
        `, [req.user.id]);
        
        res.json(profile);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
