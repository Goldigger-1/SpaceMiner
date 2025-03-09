const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verifyToken } = require('../middleware/auth');

// Get fortune wheel rewards
router.get('/rewards', verifyToken, async (req, res) => {
  try {
    const rewards = await db.all('SELECT * FROM fortune_wheel_rewards ORDER BY probability DESC');
    
    res.json({ rewards });
  } catch (error) {
    console.error('Error getting fortune wheel rewards:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Spin the wheel
router.post('/spin', verifyToken, async (req, res) => {
  try {
    const { payment_type } = req.body;
    
    // Get user data
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has enough currency for the spin
    if (payment_type === 'premium') {
      const spinCost = 10; // Cost in premium currency
      
      if (user.premium_currency < spinCost) {
        return res.status(400).json({ error: 'Not enough premium currency' });
      }
      
      // Deduct premium currency
      await db.run('UPDATE users SET premium_currency = premium_currency - ? WHERE id = ?', [spinCost, req.user.id]);
    } else {
      // Real money payment
      // In a real implementation, this would be handled by a payment gateway
      console.log('Simulating real money payment for wheel spin');
    }
    
    // Get all rewards with their probabilities
    const rewards = await db.all('SELECT * FROM fortune_wheel_rewards');
    
    // Calculate total probability
    const totalProbability = rewards.reduce((sum, reward) => sum + reward.probability, 0);
    
    // Generate a random value between 0 and totalProbability
    const randomValue = Math.random() * totalProbability;
    
    // Select a reward based on probability
    let cumulativeProbability = 0;
    let selectedReward = null;
    
    for (const reward of rewards) {
      cumulativeProbability += reward.probability;
      if (randomValue <= cumulativeProbability) {
        selectedReward = reward;
        break;
      }
    }
    
    if (!selectedReward) {
      selectedReward = rewards[rewards.length - 1]; // Fallback to last reward
    }
    
    // Record the spin
    await db.run('INSERT INTO user_spins (user_id, reward_id, spin_date) VALUES (?, ?, ?)', [req.user.id, selectedReward.id, new Date().toISOString()]);
    
    // Process the reward
    let rewardMessage = '';
    
    switch (selectedReward.type) {
      case 'currency':
        // Add currency to user
        await db.run('UPDATE users SET currency = currency + ? WHERE id = ?', [selectedReward.value, req.user.id]);
        
        rewardMessage = `You won ${selectedReward.value} in-game currency!`;
        break;
        
      case 'premium_currency':
        // Add premium currency to user
        await db.run('UPDATE users SET premium_currency = premium_currency + ? WHERE id = ?', [selectedReward.value, req.user.id]);
        
        rewardMessage = `You won ${selectedReward.value} premium currency!`;
        break;
        
      case 'temporary_boost':
        // Add temporary boost to user
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 1); // 1 day boost
        
        // Determine boost type (speed or capacity)
        const boostType = selectedReward.description.toLowerCase().includes('speed') ? 'speed' : 'capacity';
        
        await db.run('INSERT INTO user_upgrades (user_id, item_id, purchase_date, expiry_date, active) VALUES (?, (SELECT id FROM shop_items WHERE type = ? AND subtype = ? LIMIT 1), ?, ?, 1)', [req.user.id, boostType, boostType, new Date().toISOString(), expiryDate.toISOString()]);
        
        rewardMessage = `You won a ${selectedReward.description}!`;
        break;
        
      default:
        rewardMessage = `You won: ${selectedReward.name}!`;
    }
    
    // Get updated user data
    const updatedUser = await db.get('SELECT currency, premium_currency FROM users WHERE id = ?', [req.user.id]);
    
    res.json({
      success: true,
      reward: selectedReward,
      message: rewardMessage,
      currency: updatedUser.currency,
      premium_currency: updatedUser.premium_currency
    });
  } catch (error) {
    console.error('Error spinning fortune wheel:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's spin history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const history = await db.all('SELECT us.spin_date, fwr.name, fwr.description, fwr.type, fwr.value, fwr.image_url FROM user_spins us JOIN fortune_wheel_rewards fwr ON us.reward_id = fwr.id WHERE us.user_id = ? ORDER BY us.spin_date DESC LIMIT 20', [req.user.id]);
    
    res.json({ history });
  } catch (error) {
    console.error('Error getting spin history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Purchase wheel spins
router.post('/purchase-spins', verifyToken, async (req, res) => {
  try {
    const { package_id } = req.body;
    
    // Define spin packages
    const packages = {
      'single': { spins: 1, price: 0.99 },
      'pack5': { spins: 5, price: 4.49 },
      'pack10': { spins: 10, price: 7.99 }
    };
    
    if (!package_id || !packages[package_id]) {
      return res.status(400).json({ error: 'Invalid package ID' });
    }
    
    const selectedPackage = packages[package_id];
    
    // In a real implementation, this would be handled by a payment gateway
    console.log(`Simulating purchase of ${selectedPackage.spins} spins for $${selectedPackage.price}`);
    
    // For this example, we'll just grant the spins
    // In a real app, you would verify the payment first
    
    // Add premium currency that can be used for spins
    const premiumCurrencyPerSpin = 10;
    const totalPremiumCurrency = selectedPackage.spins * premiumCurrencyPerSpin;
    
    await db.run('UPDATE users SET premium_currency = premium_currency + ? WHERE id = ?', [totalPremiumCurrency, req.user.id]);
    
    // Get updated user data
    const updatedUser = await db.get('SELECT premium_currency FROM users WHERE id = ?', [req.user.id]);
    
    res.json({
      success: true,
      message: `Successfully purchased ${selectedPackage.spins} wheel spins!`,
      spins: selectedPackage.spins,
      premium_currency: updatedUser.premium_currency
    });
  } catch (error) {
    console.error('Error purchasing spins:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
