const express = require('express');
const router = express.Router();
const { getAll } = require('../database/db');
const { verifyToken } = require('../middleware/auth');

// Main leaderboard route - redirects to monthly by default
router.get('/', verifyToken, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    if (period === 'month' || period === 'monthly') {
      const currentDate = new Date();
      const targetMonth = currentDate.getMonth() + 1;
      const targetYear = currentDate.getFullYear();
      
      const leaderboard = await getAll(`
        SELECT l.score, u.username, u.telegram_id
        FROM leaderboard l
        JOIN users u ON l.user_id = u.id
        WHERE l.month = ? AND l.year = ?
        ORDER BY l.score DESC
        LIMIT 100
      `, [targetMonth, targetYear]);
      
      // Get user's rank if they're on the leaderboard
      let userRank = null;
      for (let i = 0; i < leaderboard.length; i++) {
        if (leaderboard[i].telegram_id === req.telegram_id) {
          userRank = i + 1;
          break;
        }
      }
      
      return res.json({ 
        leaderboard,
        userRank,
        month: targetMonth,
        year: targetYear,
        period: 'month'
      });
    } else if (period === 'all-time' || period === 'global') {
      const leaderboard = await getAll(`
        SELECT SUM(l.score) as total_score, u.username, u.telegram_id
        FROM leaderboard l
        JOIN users u ON l.user_id = u.id
        GROUP BY l.user_id
        ORDER BY total_score DESC
        LIMIT 100
      `);
      
      // Get user's rank if they're on the leaderboard
      let userRank = null;
      for (let i = 0; i < leaderboard.length; i++) {
        if (leaderboard[i].telegram_id === req.telegram_id) {
          userRank = i + 1;
          break;
        }
      }
      
      return res.json({ 
        leaderboard,
        userRank,
        period: 'all-time'
      });
    } else {
      return res.status(400).json({ error: 'Invalid period parameter. Use "month" or "all-time".' });
    }
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get monthly leaderboard
router.get('/monthly', verifyToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Default to current month if not specified
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    
    const leaderboard = await getAll(`
      SELECT l.score, u.username, u.telegram_id
      FROM leaderboard l
      JOIN users u ON l.user_id = u.id
      WHERE l.month = ? AND l.year = ?
      ORDER BY l.score DESC
      LIMIT 100
    `, [targetMonth, targetYear]);
    
    // Get user's rank if they're on the leaderboard
    let userRank = null;
    for (let i = 0; i < leaderboard.length; i++) {
      if (leaderboard[i].telegram_id === req.telegram_id) {
        userRank = i + 1;
        break;
      }
    }
    
    res.json({ 
      leaderboard,
      userRank,
      month: targetMonth,
      year: targetYear
    });
  } catch (error) {
    console.error('Error getting monthly leaderboard:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get global leaderboard (all-time)
router.get('/global', verifyToken, async (req, res) => {
  try {
    const leaderboard = await getAll(`
      SELECT SUM(l.score) as total_score, u.username, u.telegram_id
      FROM leaderboard l
      JOIN users u ON l.user_id = u.id
      GROUP BY l.user_id
      ORDER BY total_score DESC
      LIMIT 100
    `);
    
    // Get user's rank if they're on the leaderboard
    let userRank = null;
    for (let i = 0; i < leaderboard.length; i++) {
      if (leaderboard[i].telegram_id === req.telegram_id) {
        userRank = i + 1;
        break;
      }
    }
    
    res.json({ 
      leaderboard,
      userRank
    });
  } catch (error) {
    console.error('Error getting global leaderboard:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's ranking history
router.get('/my-history', verifyToken, async (req, res) => {
  try {
    const rankings = await getAll(`
      SELECT l.month, l.year, l.score, 
        (SELECT COUNT(*) FROM leaderboard l2 WHERE l2.month = l.month AND l2.year = l.year AND l2.score > l.score) + 1 as rank
      FROM leaderboard l
      WHERE l.user_id = ?
      ORDER BY l.year DESC, l.month DESC
      LIMIT 12
    `, [req.userId]);
    
    res.json({ rankings });
  } catch (error) {
    console.error('Error getting user ranking history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
