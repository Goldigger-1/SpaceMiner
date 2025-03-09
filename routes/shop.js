const express = require('express');
const router = express.Router();
const { getAll, getOne, runQuery } = require('../database/db');
const { verifyToken } = require('../middleware/auth');

// Get all shop items
router.get('/', verifyToken, async (req, res) => {
  try {
    const items = await getAll('SELECT * FROM shop_items ORDER BY type, price');
    
    // Group items by type
    const groupedItems = items.reduce((acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = [];
      }
      acc[item.type].push(item);
      return acc;
    }, {});
    
    res.json({ items: groupedItems });
  } catch (error) {
    console.error('Error getting shop items:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's purchased items
router.get('/my-items', verifyToken, async (req, res) => {
  try {
    const userItems = await getAll(`
      SELECT uu.*, si.name, si.description, si.type, si.subtype, si.boost_value, si.image_url
      FROM user_upgrades uu
      JOIN shop_items si ON uu.item_id = si.id
      WHERE uu.user_id = ? AND uu.active = 1
      ORDER BY uu.purchase_date DESC
    `, [req.userId]);
    
    res.json({ items: userItems });
  } catch (error) {
    console.error('Error getting user items:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Purchase an item
router.post('/purchase', verifyToken, async (req, res) => {
  try {
    const { item_id } = req.body;
    
    if (!item_id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    
    // Get item details
    const item = await getOne('SELECT * FROM shop_items WHERE id = ?', [item_id]);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Get user details
    const user = await getOne('SELECT * FROM users WHERE id = ?', [req.userId]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has enough currency
    if (item.currency_type === 'real') {
      // For real money purchases, we would integrate with a payment gateway
      // For this example, we'll simulate a successful purchase
      
      // In a real implementation, this would be handled by a payment gateway callback
      console.log(`Simulating real money purchase of ${item.price} for item ${item.name}`);
    } else if (item.currency_type === 'premium') {
      if (user.premium_currency < item.price) {
        return res.status(400).json({ error: 'Not enough premium currency' });
      }
      
      // Deduct premium currency
      await runQuery(`
        UPDATE users
        SET premium_currency = premium_currency - ?
        WHERE id = ?
      `, [item.price, req.userId]);
    } else {
      // Regular in-game currency
      if (user.currency < item.price) {
        return res.status(400).json({ error: 'Not enough currency' });
      }
      
      // Deduct currency
      await runQuery(`
        UPDATE users
        SET currency = currency - ?
        WHERE id = ?
      `, [item.price, req.userId]);
    }
    
    // Calculate expiry date for temporary items
    let expiryDate = null;
    if (item.type === 'season_pass') {
      // Season passes expire after a certain number of days
      const daysValid = item.boost_value; // boost_value contains days for season passes
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysValid);
    } else if (item.type === 'temporary_boost') {
      // Temporary boosts expire after 1 day
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 1);
    }
    
    // Add item to user's inventory
    const result = await runQuery(`
      INSERT INTO user_upgrades (user_id, item_id, purchase_date, expiry_date, active)
      VALUES (?, ?, ?, ?, 1)
    `, [req.userId, item_id, new Date().toISOString(), expiryDate ? expiryDate.toISOString() : null]);
    
    // Get updated user currency
    const updatedUser = await getOne('SELECT currency, premium_currency FROM users WHERE id = ?', [req.userId]);
    
    res.json({ 
      success: true,
      message: `Successfully purchased ${item.name}`,
      item,
      currency: updatedUser.currency,
      premium_currency: updatedUser.premium_currency
    });
  } catch (error) {
    console.error('Error purchasing item:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Simulate IAP verification (in a real app, this would connect to app store APIs)
router.post('/verify-purchase', verifyToken, async (req, res) => {
  try {
    const { receipt, product_id } = req.body;
    
    if (!receipt || !product_id) {
      return res.status(400).json({ error: 'Receipt and product ID are required' });
    }
    
    // In a real implementation, this would verify the receipt with Apple/Google
    // For this example, we'll simulate a successful verification
    
    // Get item details
    const item = await getOne('SELECT * FROM shop_items WHERE id = ?', [product_id]);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Add premium currency if this is a currency purchase
    if (item.type === 'premium_currency') {
      await runQuery(`
        UPDATE users
        SET premium_currency = premium_currency + ?
        WHERE id = ?
      `, [item.boost_value, req.userId]);
    } else {
      // Add item to user's inventory
      const expiryDate = item.type === 'season_pass' ? 
        new Date(Date.now() + (item.boost_value * 24 * 60 * 60 * 1000)) : null;
      
      await runQuery(`
        INSERT INTO user_upgrades (user_id, item_id, purchase_date, expiry_date, active)
        VALUES (?, ?, ?, ?, 1)
      `, [req.userId, product_id, new Date().toISOString(), expiryDate ? expiryDate.toISOString() : null]);
    }
    
    // Get updated user data
    const user = await getOne('SELECT currency, premium_currency FROM users WHERE id = ?', [req.userId]);
    
    res.json({ 
      success: true,
      message: 'Purchase verified successfully',
      item,
      currency: user.currency,
      premium_currency: user.premium_currency
    });
  } catch (error) {
    console.error('Error verifying purchase:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
