const express = require('express');
const router = express.Router();
const { getAll, getOne, runQuery } = require('../database/db');
const { verifyToken } = require('../middleware/auth');

// Get user profile
router.get('/', verifyToken, async (req, res) => {
  try {
    // Get user data
    const user = await getOne(`
      SELECT id, telegram_id, username, currency, premium_currency, created_at
      FROM users
      WHERE id = ?
    `, [req.userId]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user stats
    const stats = {
      totalExpeditions: 0,
      successfulExpeditions: 0,
      failedExpeditions: 0,
      totalResourcesCollected: 0,
      totalValueCollected: 0,
      favoriteResource: null,
      favoritePlanet: null
    };
    
    // Get expedition stats
    const expeditionStats = await getOne(`
      SELECT 
        COUNT(*) as total_expeditions,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_expeditions,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_expeditions
      FROM expeditions
      WHERE user_id = ? AND status = 'completed'
    `, [req.userId]);
    
    if (expeditionStats) {
      stats.totalExpeditions = expeditionStats.total_expeditions;
      stats.successfulExpeditions = expeditionStats.successful_expeditions;
      stats.failedExpeditions = expeditionStats.failed_expeditions;
    }
    
    // Get resource stats
    const resourceStats = await getAll(`
      SELECT 
        r.id, r.name, r.image_url,
        SUM(ui.quantity) as total_collected
      FROM user_inventory ui
      JOIN resources r ON ui.resource_id = r.id
      WHERE ui.user_id = ?
      GROUP BY r.id
      ORDER BY total_collected DESC
    `, [req.userId]);
    
    if (resourceStats.length > 0) {
      stats.favoriteResource = resourceStats[0];
      stats.totalResourcesCollected = resourceStats.reduce((sum, r) => sum + r.total_collected, 0);
    }
    
    // Get total value collected
    const valueStats = await getOne(`
      SELECT 
        SUM(ui.quantity * r.base_value) as total_value
      FROM user_inventory ui
      JOIN resources r ON ui.resource_id = r.id
      WHERE ui.user_id = ?
    `, [req.userId]);
    
    if (valueStats) {
      stats.totalValueCollected = valueStats.total_value || 0;
    }
    
    // Get favorite planet
    const planetStats = await getOne(`
      SELECT 
        p.id, p.name, p.image_url,
        COUNT(*) as visit_count
      FROM expeditions e
      JOIN planets p ON e.planet_id = p.id
      WHERE e.user_id = ?
      GROUP BY p.id
      ORDER BY visit_count DESC
      LIMIT 1
    `, [req.userId]);
    
    if (planetStats) {
      stats.favoritePlanet = planetStats;
    }
    
    // Get user inventory
    const inventory = await getAll(`
      SELECT 
        ui.resource_id, ui.quantity,
        r.name, r.description, r.rarity, r.base_value, r.image_url
      FROM user_inventory ui
      JOIN resources r ON ui.resource_id = r.id
      WHERE ui.user_id = ?
      ORDER BY r.rarity DESC, r.name
    `, [req.userId]);
    
    // Get user upgrades
    const upgrades = await getAll(`
      SELECT 
        uu.id, uu.purchase_date, uu.expiry_date,
        si.name, si.description, si.type, si.subtype, si.boost_value, si.image_url
      FROM user_upgrades uu
      JOIN shop_items si ON uu.item_id = si.id
      WHERE uu.user_id = ? AND uu.active = 1
      ORDER BY uu.purchase_date DESC
    `, [req.userId]);
    
    // Get user ranking
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const ranking = await getOne(`
      SELECT 
        l.score,
        (SELECT COUNT(*) FROM leaderboard l2 WHERE l2.month = ? AND l2.year = ? AND l2.score > l.score) + 1 as rank
      FROM leaderboard l
      WHERE l.user_id = ? AND l.month = ? AND l.year = ?
    `, [currentMonth, currentYear, req.userId, currentMonth, currentYear]);
    
    res.json({
      user,
      stats,
      inventory,
      upgrades,
      currentRanking: ranking || { score: 0, rank: '-' }
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/', verifyToken, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (username) {
      await runQuery(`
        UPDATE users
        SET username = ?
        WHERE id = ?
      `, [username, req.userId]);
    }
    
    res.json({ 
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
