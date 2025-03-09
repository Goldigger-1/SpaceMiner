const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verifyToken } = require('../middleware/auth');

// Get all planets
router.get('/', verifyToken, async (req, res) => {
  try {
    console.log('Getting all planets');
    const planets = await db.all('SELECT * FROM planets ORDER BY distance ASC');
    res.json({ planets });
  } catch (error) {
    console.error('Error getting planets:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific planet
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const planet = await db.get('SELECT * FROM planets WHERE id = ?', [req.params.id]);
    
    if (!planet) {
      return res.status(404).json({ error: 'Planet not found' });
    }
    
    // Get resources available on this planet
    const resources = await db.all(`
      SELECT r.*, pr.spawn_rate 
      FROM resources r
      JOIN planet_resources pr ON r.id = pr.resource_id
      WHERE pr.planet_id = ?
      ORDER BY r.rarity DESC
    `, [req.params.id]);
    
    res.json({ 
      planet,
      resources
    });
  } catch (error) {
    console.error('Error getting planet:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get planet danger events
router.get('/:id/dangers', verifyToken, async (req, res) => {
  try {
    const planet = await db.get('SELECT * FROM planets WHERE id = ?', [req.params.id]);
    
    if (!planet) {
      return res.status(404).json({ error: 'Planet not found' });
    }
    
    // Define danger events based on planet danger level
    const dangerTypes = [
      { type: 'temperature', name: 'Extreme Temperature', probability: planet.danger_level * 0.05 },
      { type: 'radiation', name: 'Radiation Spike', probability: planet.danger_level * 0.04 },
      { type: 'magnetic_storm', name: 'Magnetic Storm', probability: planet.danger_level * 0.03 },
      { type: 'landslide', name: 'Landslide', probability: planet.danger_level * 0.02 },
      { type: 'hostile_creature', name: 'Hostile Creature', probability: planet.danger_level * 0.01 }
    ];
    
    res.json({ dangers: dangerTypes });
  } catch (error) {
    console.error('Error getting planet dangers:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
