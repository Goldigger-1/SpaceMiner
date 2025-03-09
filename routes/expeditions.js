const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verifyToken } = require('../middleware/auth');

// Start a new expedition
router.post('/start', verifyToken, async (req, res) => {
  try {
    const { planet_id } = req.body;
    
    if (!planet_id) {
      return res.status(400).json({ error: 'Planet ID is required' });
    }
    
    // Check if planet exists
    const planet = await db.get('SELECT * FROM planets WHERE id = ?', [planet_id]);
    
    if (!planet) {
      return res.status(404).json({ error: 'Planet not found' });
    }
    
    // Check if user has active expedition
    const activeExpedition = await db.get(`
      SELECT * FROM expeditions 
      WHERE user_id = ? AND status = 'active'
    `, [req.user.id]);
    
    if (activeExpedition) {
      return res.status(400).json({ error: 'You already have an active expedition' });
    }
    
    // Get user upgrades to calculate expedition time
    const userUpgrades = await db.all(`
      SELECT si.type, si.subtype, si.boost_value 
      FROM user_upgrades uu
      JOIN shop_items si ON uu.item_id = si.id
      WHERE uu.user_id = ? AND uu.active = 1
    `, [req.user.id]);
    
    // Calculate expedition time based on planet and user upgrades
    let expeditionTime = planet.base_time;
    
    // Apply suit autonomy upgrades
    const suitUpgrade = userUpgrades.find(u => u.type === 'suit' && u.subtype === 'autonomy');
    if (suitUpgrade) {
      expeditionTime += expeditionTime * suitUpgrade.boost_value;
    }
    
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (expeditionTime * 1000)); // Convert seconds to milliseconds
    
    // Create new expedition
    const result = await db.run(`
      INSERT INTO expeditions (user_id, planet_id, start_time, end_time, status, success)
      VALUES (?, ?, ?, ?, 'active', 0)
    `, [req.user.id, planet_id, startTime.toISOString(), endTime.toISOString()]);
    
    const expedition = await db.get('SELECT * FROM expeditions WHERE id = ?', [result.lastID]);
    
    res.json({ 
      expedition,
      message: 'Expedition started successfully',
      countdown: expeditionTime
    });
  } catch (error) {
    console.error('Error starting expedition:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get active expedition
router.get('/active', verifyToken, async (req, res) => {
  try {
    const expedition = await db.get(`
      SELECT e.*, p.name as planet_name, p.image_url as planet_image, p.base_time
      FROM expeditions e
      JOIN planets p ON e.planet_id = p.id
      WHERE e.user_id = ? AND e.status = 'active'
    `, [req.user.id]);
    
    if (!expedition) {
      return res.status(404).json({ error: 'No active expedition found' });
    }
    
    // Calculate remaining time
    const now = new Date();
    const endTime = new Date(expedition.end_time);
    const remainingTime = Math.max(0, Math.floor((endTime - now) / 1000)); // in seconds
    
    res.json({ 
      expedition,
      remainingTime
    });
  } catch (error) {
    console.error('Error getting active expedition:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mine resources during expedition
router.post('/mine', verifyToken, async (req, res) => {
  try {
    const { method } = req.body;
    
    // Check if user has active expedition
    const expedition = await db.get(`
      SELECT e.*, p.resource_multiplier, p.danger_level
      FROM expeditions e
      JOIN planets p ON e.planet_id = p.id
      WHERE e.user_id = ? AND e.status = 'active'
    `, [req.user.id]);
    
    if (!expedition) {
      return res.status(404).json({ error: 'No active expedition found' });
    }
    
    // Check if expedition has ended
    const now = new Date();
    const endTime = new Date(expedition.end_time);
    
    if (now > endTime) {
      return res.status(400).json({ error: 'Expedition has ended. Return to your spaceship.' });
    }
    
    // Get available resources on the planet
    const planetResources = await db.all(`
      SELECT r.*, pr.spawn_rate 
      FROM resources r
      JOIN planet_resources pr ON r.id = pr.resource_id
      WHERE pr.planet_id = ?
    `, [expedition.planet_id]);
    
    if (planetResources.length === 0) {
      return res.status(404).json({ error: 'No resources available on this planet' });
    }
    
    // Get user upgrades
    const userUpgrades = await db.all(`
      SELECT si.type, si.subtype, si.boost_value 
      FROM user_upgrades uu
      JOIN shop_items si ON uu.item_id = si.id
      WHERE uu.user_id = ? AND uu.active = 1
    `, [req.user.id]);
    
    // Calculate drone collection bonus
    const droneUpgrade = userUpgrades.find(u => u.type === 'drone' && u.subtype === 'collection');
    const droneBonus = droneUpgrade ? droneUpgrade.boost_value : 0;
    
    // Simulate mining based on resource rarity and planet multiplier
    const minedResources = [];
    
    // Weighted random selection based on spawn rate
    const totalSpawnRate = planetResources.reduce((sum, resource) => sum + resource.spawn_rate, 0);
    const randomValue = Math.random() * totalSpawnRate;
    
    let cumulativeRate = 0;
    let selectedResource = null;
    
    for (const resource of planetResources) {
      cumulativeRate += resource.spawn_rate;
      if (randomValue <= cumulativeRate) {
        selectedResource = resource;
        break;
      }
    }
    
    if (selectedResource) {
      // Calculate quantity based on resource rarity and planet multiplier
      // Manual mining gets more resources than automatic collection
      const baseQuantity = method === 'manual' 
        ? Math.floor(Math.random() * 5) + 2 // 2-6 base quantity for manual mining
        : Math.floor(Math.random() * 3) + 1; // 1-3 base quantity for auto collection
      
      const rarityFactor = 1 / selectedResource.rarity; // Rarer resources are found in smaller quantities
      let quantity = Math.max(1, Math.floor(baseQuantity * rarityFactor * expedition.resource_multiplier));
      
      // Apply drone bonus
      if (droneBonus > 0) {
        const bonusQuantity = Math.floor(quantity * droneBonus);
        quantity += bonusQuantity;
      }
      
      // Add to mined resources
      minedResources.push({
        resource_id: selectedResource.id,
        name: selectedResource.name,
        quantity,
        value: selectedResource.base_value * quantity,
        rarity: selectedResource.rarity,
        image_url: selectedResource.image_url,
        description: selectedResource.description
      });
      
      // Save mined resources to expedition
      await db.run(`
        INSERT INTO expedition_resources (expedition_id, resource_id, quantity)
        VALUES (?, ?, ?)
      `, [expedition.id, selectedResource.id, quantity]);
    }
    
    // Check for random danger event
    const dangerProbability = expedition.danger_level * 0.05; // 5% chance per danger level
    const dangerOccurred = Math.random() < dangerProbability;
    
    let dangerEvent = null;
    
    if (dangerOccurred) {
      const dangerTypes = [
        { 
          type: 'temperature', 
          name: 'Extreme Temperature', 
          damage: 10 
        },
        { 
          type: 'radiation', 
          name: 'Radiation Spike', 
          damage: 15 
        },
        { 
          type: 'magnetic_storm', 
          name: 'Magnetic Storm', 
          damage: 20 
        },
        { 
          type: 'landslide', 
          name: 'Landslide', 
          damage: 25 
        },
        { 
          type: 'hostile_creature', 
          name: 'Hostile Creature', 
          damage: 30 
        }
      ];
      
      dangerEvent = dangerTypes[Math.floor(Math.random() * dangerTypes.length)];
    }
    
    res.json({ 
      minedResources,
      dangerEvent,
      message: minedResources.length > 0 
        ? `You mined ${minedResources[0].quantity} ${minedResources[0].name}` 
        : 'You didn\'t find any resources this time'
    });
  } catch (error) {
    console.error('Error mining resources:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Explore area during expedition
router.post('/explore', verifyToken, async (req, res) => {
  try {
    // Check if user has active expedition
    const expedition = await db.get(`
      SELECT e.*, p.resource_multiplier, p.danger_level
      FROM expeditions e
      JOIN planets p ON e.planet_id = p.id
      WHERE e.user_id = ? AND e.status = 'active'
    `, [req.user.id]);
    
    if (!expedition) {
      return res.status(404).json({ error: 'No active expedition found' });
    }
    
    // Check if expedition has ended
    const now = new Date();
    const endTime = new Date(expedition.end_time);
    
    if (now > endTime) {
      return res.status(400).json({ error: 'Expedition has ended. Return to your spaceship.' });
    }
    
    // Get available resources on the planet
    const planetResources = await db.all(`
      SELECT r.*, pr.spawn_rate 
      FROM resources r
      JOIN planet_resources pr ON r.id = pr.resource_id
      WHERE pr.planet_id = ?
    `, [expedition.planet_id]);
    
    if (planetResources.length === 0) {
      return res.status(404).json({ error: 'No resources available on this planet' });
    }
    
    // Get user upgrades
    const userUpgrades = await db.all(`
      SELECT si.type, si.subtype, si.boost_value 
      FROM user_upgrades uu
      JOIN shop_items si ON uu.item_id = si.id
      WHERE uu.user_id = ? AND uu.active = 1
    `, [req.user.id]);
    
    // Calculate drone collection bonus
    const droneUpgrade = userUpgrades.find(u => u.type === 'drone' && u.subtype === 'collection');
    const droneBonus = droneUpgrade ? droneUpgrade.boost_value : 0;
    
    // Determine number of resources to find (2-4)
    const resourceCount = Math.floor(Math.random() * 3) + 2; // 2-4 resources
    const foundResources = [];
    
    // Find multiple resources
    for (let i = 0; i < resourceCount; i++) {
      // Weighted random selection based on spawn rate
      const totalSpawnRate = planetResources.reduce((sum, resource) => sum + resource.spawn_rate, 0);
      const randomValue = Math.random() * totalSpawnRate;
      
      let cumulativeRate = 0;
      let selectedResource = null;
      
      for (const resource of planetResources) {
        cumulativeRate += resource.spawn_rate;
        if (randomValue <= cumulativeRate) {
          selectedResource = resource;
          break;
        }
      }
      
      if (selectedResource) {
        // Calculate quantity based on resource rarity and planet multiplier
        const baseQuantity = Math.floor(Math.random() * 3) + 1; // 1-3 base quantity
        const rarityFactor = 1 / selectedResource.rarity; // Rarer resources are found in smaller quantities
        let quantity = Math.max(1, Math.floor(baseQuantity * rarityFactor * expedition.resource_multiplier));
        
        // Apply drone bonus
        if (droneBonus > 0) {
          const bonusQuantity = Math.floor(quantity * droneBonus);
          quantity += bonusQuantity;
        }
        
        // Add to found resources
        foundResources.push({
          resource_id: selectedResource.id,
          name: selectedResource.name,
          quantity,
          value: selectedResource.base_value * quantity,
          rarity: selectedResource.rarity,
          image_url: selectedResource.image_url
        });
        
        // Save found resources to expedition
        await db.run(`
          INSERT INTO expedition_resources (expedition_id, resource_id, quantity)
          VALUES (?, ?, ?)
        `, [expedition.id, selectedResource.id, quantity]);
      }
    }
    
    res.json({ 
      resources: foundResources,
      message: `You explored the area and found ${foundResources.length} resources!`
    });
  } catch (error) {
    console.error('Error exploring area:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check for dangers during expedition
router.post('/check-danger', verifyToken, async (req, res) => {
  try {
    // Check if user has active expedition
    const expedition = await db.get(`
      SELECT e.*, p.danger_level
      FROM expeditions e
      JOIN planets p ON e.planet_id = p.id
      WHERE e.user_id = ? AND e.status = 'active'
    `, [req.user.id]);
    
    if (!expedition) {
      return res.status(404).json({ error: 'No active expedition found' });
    }
    
    // Check if expedition has ended
    const now = new Date();
    const endTime = new Date(expedition.end_time);
    
    if (now > endTime) {
      return res.status(400).json({ error: 'Expedition has ended. Return to your spaceship.' });
    }
    
    // Calculate danger probability based on planet danger level
    const dangerProbability = expedition.danger_level * 0.05; // 5% chance per danger level
    const dangerOccurred = Math.random() < dangerProbability;
    
    if (!dangerOccurred) {
      return res.json({ danger: null });
    }
    
    // Define possible dangers
    const dangers = [
      { 
        type: 'temperature', 
        name: 'Extreme Temperature', 
        description: 'The temperature has suddenly changed to dangerous levels!',
        effect: 'Your suit protection is decreasing faster.',
        icon: 'fa-thermometer-full'
      },
      { 
        type: 'radiation', 
        name: 'Radiation Spike', 
        description: 'A sudden spike in radiation levels detected!',
        effect: 'Your health is decreasing faster.',
        icon: 'fa-radiation'
      },
      { 
        type: 'magnetic_storm', 
        name: 'Magnetic Storm', 
        description: 'A powerful magnetic storm is affecting your equipment!',
        effect: 'Your mining efficiency is reduced.',
        icon: 'fa-bolt'
      },
      { 
        type: 'landslide', 
        name: 'Landslide', 
        description: 'The ground is unstable and rocks are falling!',
        effect: 'You need to move carefully, reducing your mining speed.',
        icon: 'fa-mountain'
      },
      { 
        type: 'hostile_creature', 
        name: 'Hostile Creature', 
        description: 'A dangerous alien creature is approaching!',
        effect: 'You need to be on alert, reducing your focus on mining.',
        icon: 'fa-spider'
      }
    ];
    
    // Select a random danger
    const danger = dangers[Math.floor(Math.random() * dangers.length)];
    
    res.json({ danger });
  } catch (error) {
    console.error('Error checking for dangers:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Handle expedition time up
router.post('/time-up', verifyToken, async (req, res) => {
  try {
    // Check if user has active expedition
    const expedition = await db.get(`
      SELECT e.*, p.name as planet_name
      FROM expeditions e
      JOIN planets p ON e.planet_id = p.id
      WHERE e.user_id = ? AND e.status = 'active'
    `, [req.user.id]);
    
    if (!expedition) {
      return res.status(404).json({ error: 'No active expedition found' });
    }
    
    // Check if expedition has actually ended
    const now = new Date();
    const endTime = new Date(expedition.end_time);
    
    if (now <= endTime) {
      return res.status(400).json({ error: 'Expedition has not ended yet' });
    }
    
    // Mark expedition as timed out
    await db.run(`
      UPDATE expeditions 
      SET status = 'timed_out', success = 0
      WHERE id = ?
    `, [expedition.id]);
    
    // Get user upgrades to check for insurance
    const userUpgrades = await db.all(`
      SELECT si.type, si.subtype, si.boost_value 
      FROM user_upgrades uu
      JOIN shop_items si ON uu.item_id = si.id
      WHERE uu.user_id = ? AND uu.active = 1
    `, [req.user.id]);
    
    // Check if user has insurance
    const insuranceUpgrade = userUpgrades.find(u => u.type === 'insurance' && u.subtype === 'recovery');
    const recoveryPercentage = insuranceUpgrade ? insuranceUpgrade.boost_value : 0;
    
    // Get collected resources
    const collectedResources = await db.all(`
      SELECT er.resource_id, er.quantity, r.name, r.base_value, r.image_url, r.rarity
      FROM expedition_resources er
      JOIN resources r ON er.resource_id = r.id
      WHERE er.expedition_id = ?
    `, [expedition.id]);
    
    // Process collected resources if insurance applies
    let totalValue = 0;
    
    if (recoveryPercentage > 0) {
      for (const resource of collectedResources) {
        // Apply recovery percentage
        const finalQuantity = Math.floor(resource.quantity * recoveryPercentage);
        
        if (finalQuantity > 0) {
          // Check if user already has this resource
          const existingInventory = await db.get(`
            SELECT * FROM user_inventory
            WHERE user_id = ? AND resource_id = ?
          `, [req.user.id, resource.resource_id]);
          
          if (existingInventory) {
            // Update existing inventory
            await db.run(`
              UPDATE user_inventory
              SET quantity = quantity + ?
              WHERE id = ?
            `, [finalQuantity, existingInventory.id]);
          } else {
            // Add to user inventory
            await db.run(`
              INSERT INTO user_inventory (user_id, resource_id, quantity)
              VALUES (?, ?, ?)
            `, [req.user.id, resource.resource_id, finalQuantity]);
          }
          
          // Add to total value
          totalValue += resource.base_value * finalQuantity;
          
          // Update resource quantity for response
          resource.original_quantity = resource.quantity;
          resource.quantity = finalQuantity;
        }
      }
      
      // Update user currency
      if (totalValue > 0) {
        await db.run(`
          UPDATE users
          SET currency = currency + ?
          WHERE id = ?
        `, [totalValue, req.user.id]);
      }
    }
    
    res.json({
      success: false,
      recoveryPercentage,
      resources: recoveryPercentage > 0 ? collectedResources : [],
      totalValue,
      message: recoveryPercentage > 0
        ? `Expedition timed out! You recovered ${Math.round(recoveryPercentage * 100)}% of your resources worth ${totalValue} currency thanks to your insurance.`
        : 'Expedition timed out! You lost all your resources.'
    });
  } catch (error) {
    console.error('Error handling expedition time up:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Return to spaceship and end expedition
router.post('/return', verifyToken, async (req, res) => {
  try {
    // Check if user has active expedition
    const expedition = await db.get(`
      SELECT e.*, p.name as planet_name
      FROM expeditions e
      JOIN planets p ON e.planet_id = p.id
      WHERE e.user_id = ? AND e.status = 'active'
    `, [req.user.id]);
    
    if (!expedition) {
      return res.status(404).json({ error: 'No active expedition found' });
    }
    
    // Check if expedition has ended
    const now = new Date();
    const endTime = new Date(expedition.end_time);
    const expeditionSuccess = now <= endTime;
    
    // Get user upgrades
    const userUpgrades = await db.all(`
      SELECT si.type, si.subtype, si.boost_value 
      FROM user_upgrades uu
      JOIN shop_items si ON uu.item_id = si.id
      WHERE uu.user_id = ? AND uu.active = 1
    `, [req.user.id]);
    
    // Get insurance recovery percentage if expedition failed
    let recoveryPercentage = 0;
    if (!expeditionSuccess) {
      const insuranceUpgrade = userUpgrades.find(u => u.type === 'insurance' && u.subtype === 'recovery');
      recoveryPercentage = insuranceUpgrade ? insuranceUpgrade.boost_value : 0;
    }
    
    // Get collected resources
    const collectedResources = await db.all(`
      SELECT er.resource_id, er.quantity, r.name, r.base_value, r.image_url
      FROM expedition_resources er
      JOIN resources r ON er.resource_id = r.id
      WHERE er.expedition_id = ?
    `, [expedition.id]);
    
    // Calculate total value
    let totalValue = 0;
    
    // Update expedition status
    await db.run(`
      UPDATE expeditions 
      SET status = 'completed', success = ?
      WHERE id = ?
    `, [expeditionSuccess ? 1 : 0, expedition.id]);
    
    // Process collected resources
    if (expeditionSuccess || recoveryPercentage > 0) {
      for (const resource of collectedResources) {
        // Apply recovery percentage if expedition failed
        let finalQuantity = resource.quantity;
        if (!expeditionSuccess) {
          finalQuantity = Math.floor(resource.quantity * recoveryPercentage);
        }
        
        if (finalQuantity > 0) {
          // Check if user already has this resource
          const existingInventory = await db.get(`
            SELECT * FROM user_inventory
            WHERE user_id = ? AND resource_id = ?
          `, [req.user.id, resource.resource_id]);
          
          if (existingInventory) {
            // Update existing inventory
            await db.run(`
              UPDATE user_inventory
              SET quantity = quantity + ?
              WHERE id = ?
            `, [finalQuantity, existingInventory.id]);
          } else {
            // Add to user inventory
            await db.run(`
              INSERT INTO user_inventory (user_id, resource_id, quantity)
              VALUES (?, ?, ?)
            `, [req.user.id, resource.resource_id, finalQuantity]);
          }
          
          // Add to total value
          totalValue += resource.base_value * finalQuantity;
        }
        
        // Update resource quantity if recovery was applied
        if (!expeditionSuccess && recoveryPercentage > 0) {
          resource.original_quantity = resource.quantity;
          resource.quantity = finalQuantity;
        }
      }
      
      // Update user currency
      await db.run(`
        UPDATE users
        SET currency = currency + ?
        WHERE id = ?
      `, [totalValue, req.user.id]);
      
      // Update leaderboard
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
      const year = currentDate.getFullYear();
      
      // Check if user already has a leaderboard entry for this month
      const leaderboardEntry = await db.get(`
        SELECT * FROM leaderboard
        WHERE user_id = ? AND month = ? AND year = ?
      `, [req.user.id, month, year]);
      
      if (leaderboardEntry) {
        // Update existing entry
        await db.run(`
          UPDATE leaderboard
          SET score = score + ?
          WHERE id = ?
        `, [totalValue, leaderboardEntry.id]);
      } else {
        // Create new entry
        await db.run(`
          INSERT INTO leaderboard (user_id, score, month, year)
          VALUES (?, ?, ?, ?)
        `, [req.user.id, totalValue, month, year]);
      }
    }
    
    res.json({
      success: expeditionSuccess,
      recoveryPercentage: !expeditionSuccess ? recoveryPercentage : null,
      resources: collectedResources,
      totalValue,
      message: expeditionSuccess 
        ? `Expedition completed successfully! You collected resources worth ${totalValue} currency.`
        : recoveryPercentage > 0
          ? `Expedition failed! You recovered ${Math.round(recoveryPercentage * 100)}% of your resources worth ${totalValue} currency.`
          : 'Expedition failed! You lost all your resources.'
    });
  } catch (error) {
    console.error('Error returning from expedition:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get expedition history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const expeditions = await db.all(`
      SELECT e.*, p.name as planet_name, p.image_url as planet_image
      FROM expeditions e
      JOIN planets p ON e.planet_id = p.id
      WHERE e.user_id = ? AND e.status = 'completed'
      ORDER BY e.end_time DESC
      LIMIT 10
    `, [req.user.id]);
    
    // Get resources for each expedition
    for (const expedition of expeditions) {
      expedition.resources = await db.all(`
        SELECT er.resource_id, er.quantity, r.name, r.base_value, r.image_url
        FROM expedition_resources er
        JOIN resources r ON er.resource_id = r.id
        WHERE er.expedition_id = ?
      `, [expedition.id]);
      
      // Calculate total value
      expedition.totalValue = expedition.resources.reduce(
        (sum, resource) => sum + (resource.base_value * resource.quantity), 
        0
      );
    }
    
    res.json({ expeditions });
  } catch (error) {
    console.error('Error getting expedition history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
