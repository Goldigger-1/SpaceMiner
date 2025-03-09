const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'spaceminer.db');
const db = new sqlite3.Database(dbPath);

function initializeDatabase() {
  console.log('Initializing database...');
  
  // Create tables
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE,
      username TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP,
      currency INTEGER DEFAULT 0,
      premium_currency INTEGER DEFAULT 0
    )`);

    // Planets table
    db.run(`CREATE TABLE IF NOT EXISTS planets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      difficulty INTEGER,
      base_time INTEGER,
      resource_multiplier REAL,
      danger_level INTEGER,
      image_url TEXT
    )`);

    // Resources table
    db.run(`CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      rarity INTEGER,
      base_value INTEGER,
      image_url TEXT
    )`);

    // Planet resources mapping
    db.run(`CREATE TABLE IF NOT EXISTS planet_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      planet_id INTEGER,
      resource_id INTEGER,
      spawn_rate REAL,
      FOREIGN KEY (planet_id) REFERENCES planets (id),
      FOREIGN KEY (resource_id) REFERENCES resources (id)
    )`);

    // User inventory
    db.run(`CREATE TABLE IF NOT EXISTS user_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      resource_id INTEGER,
      quantity INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (resource_id) REFERENCES resources (id)
    )`);

    // Expeditions
    db.run(`CREATE TABLE IF NOT EXISTS expeditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      planet_id INTEGER,
      start_time TIMESTAMP,
      end_time TIMESTAMP,
      status TEXT,
      success BOOLEAN,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (planet_id) REFERENCES planets (id)
    )`);

    // Expedition resources
    db.run(`CREATE TABLE IF NOT EXISTS expedition_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expedition_id INTEGER,
      resource_id INTEGER,
      quantity INTEGER,
      FOREIGN KEY (expedition_id) REFERENCES expeditions (id),
      FOREIGN KEY (resource_id) REFERENCES resources (id)
    )`);

    // Shop items
    db.run(`CREATE TABLE IF NOT EXISTS shop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      type TEXT,
      subtype TEXT,
      price REAL,
      currency_type TEXT,
      boost_value REAL,
      image_url TEXT
    )`);

    // User upgrades
    db.run(`CREATE TABLE IF NOT EXISTS user_upgrades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      item_id INTEGER,
      purchase_date TIMESTAMP,
      expiry_date TIMESTAMP,
      active BOOLEAN DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (item_id) REFERENCES shop_items (id)
    )`);

    // Fortune wheel rewards
    db.run(`CREATE TABLE IF NOT EXISTS fortune_wheel_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      type TEXT,
      value INTEGER,
      probability REAL,
      image_url TEXT
    )`);

    // User spins
    db.run(`CREATE TABLE IF NOT EXISTS user_spins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      reward_id INTEGER,
      spin_date TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (reward_id) REFERENCES fortune_wheel_rewards (id)
    )`);

    // Leaderboard
    db.run(`CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      score INTEGER,
      month INTEGER,
      year INTEGER,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Insert initial data
    insertInitialData();
  });
}

function insertInitialData() {
  // Check if planets already exist
  db.get("SELECT COUNT(*) as count FROM planets", (err, row) => {
    if (err) {
      console.error("Error checking planets:", err);
      return;
    }
    
    if (row.count === 0) {
      // Insert planets
      const planets = [
        {
          name: "Crystallis",
          description: "A distant planet covered in rare crystal formations with extreme temperature fluctuations.",
          difficulty: 3,
          base_time: 120, // seconds
          resource_multiplier: 2.5,
          danger_level: 4,
          image_url: "/assets/planets/crystallis.png"
        },
        {
          name: "Ferrum",
          description: "A nearby planet rich in iron and other common metals with moderate conditions.",
          difficulty: 1,
          base_time: 180,
          resource_multiplier: 1.0,
          danger_level: 1,
          image_url: "/assets/planets/ferrum.png"
        },
        {
          name: "Radion",
          description: "A distant planet with high radiation levels but abundant rare elements.",
          difficulty: 4,
          base_time: 90,
          resource_multiplier: 3.0,
          danger_level: 5,
          image_url: "/assets/planets/radion.png"
        },
        {
          name: "Aquaris",
          description: "A nearby water world with underwater caves containing valuable resources.",
          difficulty: 2,
          base_time: 150,
          resource_multiplier: 1.5,
          danger_level: 2,
          image_url: "/assets/planets/aquaris.png"
        }
      ];

      planets.forEach(planet => {
        db.run(
          `INSERT INTO planets (name, description, difficulty, base_time, resource_multiplier, danger_level, image_url) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [planet.name, planet.description, planet.difficulty, planet.base_time, 
           planet.resource_multiplier, planet.danger_level, planet.image_url]
        );
      });
      
      console.log("Initial planets inserted");
    }
  });

  // Check if resources already exist
  db.get("SELECT COUNT(*) as count FROM resources", (err, row) => {
    if (err) {
      console.error("Error checking resources:", err);
      return;
    }
    
    if (row.count === 0) {
      // Insert resources
      const resources = [
        {
          name: "Iron Ore",
          description: "Common metal found on most planets.",
          rarity: 1,
          base_value: 10,
          image_url: "/assets/resources/iron_ore.png"
        },
        {
          name: "Copper Ore",
          description: "Common conductive metal.",
          rarity: 1,
          base_value: 15,
          image_url: "/assets/resources/copper_ore.png"
        },
        {
          name: "Platinum Crystal",
          description: "Rare crystalline form of platinum with unique properties.",
          rarity: 3,
          base_value: 75,
          image_url: "/assets/resources/platinum_crystal.png"
        },
        {
          name: "Quantum Shard",
          description: "Extremely rare crystal with quantum properties.",
          rarity: 5,
          base_value: 200,
          image_url: "/assets/resources/quantum_shard.png"
        },
        {
          name: "Ancient Artifact",
          description: "Mysterious artifact from an ancient alien civilization.",
          rarity: 5,
          base_value: 500,
          image_url: "/assets/resources/ancient_artifact.png"
        }
      ];

      resources.forEach(resource => {
        db.run(
          `INSERT INTO resources (name, description, rarity, base_value, image_url) 
           VALUES (?, ?, ?, ?, ?)`,
          [resource.name, resource.description, resource.rarity, resource.base_value, resource.image_url]
        );
      });
      
      console.log("Initial resources inserted");
    }
  });

  // Check if shop items already exist
  db.get("SELECT COUNT(*) as count FROM shop_items", (err, row) => {
    if (err) {
      console.error("Error checking shop items:", err);
      return;
    }
    
    if (row.count === 0) {
      // Insert shop items
      const shopItems = [
        // Spaceship upgrades
        {
          name: "Basic Speed Upgrade",
          description: "Increases return speed by 10%",
          type: "spaceship",
          subtype: "speed",
          price: 4.99,
          currency_type: "real",
          boost_value: 0.1,
          image_url: "/assets/shop/basic_speed.png"
        },
        {
          name: "Advanced Speed Upgrade",
          description: "Increases return speed by 25%",
          type: "spaceship",
          subtype: "speed",
          price: 9.99,
          currency_type: "real",
          boost_value: 0.25,
          image_url: "/assets/shop/advanced_speed.png"
        },
        {
          name: "Basic Capacity Upgrade",
          description: "Increases storage capacity by 10%",
          type: "spaceship",
          subtype: "capacity",
          price: 4.99,
          currency_type: "real",
          boost_value: 0.1,
          image_url: "/assets/shop/basic_capacity.png"
        },
        
        // Suits
        {
          name: "Basic Suit",
          description: "Extends autonomy by 10%",
          type: "suit",
          subtype: "autonomy",
          price: 2.99,
          currency_type: "real",
          boost_value: 0.1,
          image_url: "/assets/shop/basic_suit.png"
        },
        {
          name: "Advanced Suit",
          description: "Extends autonomy by 25%",
          type: "suit",
          subtype: "autonomy",
          price: 5.99,
          currency_type: "real",
          boost_value: 0.25,
          image_url: "/assets/shop/advanced_suit.png"
        },
        
        // Drones
        {
          name: "Basic Drone",
          description: "Automatically collects 10% additional resources",
          type: "drone",
          subtype: "collection",
          price: 3.99,
          currency_type: "real",
          boost_value: 0.1,
          image_url: "/assets/shop/basic_drone.png"
        },
        {
          name: "Advanced Drone",
          description: "Automatically collects 25% additional resources",
          type: "drone",
          subtype: "collection",
          price: 7.99,
          currency_type: "real",
          boost_value: 0.25,
          image_url: "/assets/shop/advanced_drone.png"
        },
        
        // Insurance
        {
          name: "Basic Insurance",
          description: "Recover 25% of lost loot in case of failure",
          type: "insurance",
          subtype: "recovery",
          price: 1.99,
          currency_type: "real",
          boost_value: 0.25,
          image_url: "/assets/shop/basic_insurance.png"
        },
        {
          name: "Advanced Insurance",
          description: "Recover 50% of lost loot in case of failure",
          type: "insurance",
          subtype: "recovery",
          price: 3.99,
          currency_type: "real",
          boost_value: 0.5,
          image_url: "/assets/shop/advanced_insurance.png"
        },
        
        // Season passes
        {
          name: "Monthly Pass",
          description: "One month of exclusive rewards and missions",
          type: "season_pass",
          subtype: "monthly",
          price: 9.99,
          currency_type: "real",
          boost_value: 30, // days
          image_url: "/assets/shop/monthly_pass.png"
        },
        {
          name: "Quarterly Pass",
          description: "Three months of exclusive rewards and missions",
          type: "season_pass",
          subtype: "quarterly",
          price: 24.99,
          currency_type: "real",
          boost_value: 90, // days
          image_url: "/assets/shop/quarterly_pass.png"
        }
      ];

      shopItems.forEach(item => {
        db.run(
          `INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.name, item.description, item.type, item.subtype, item.price, 
           item.currency_type, item.boost_value, item.image_url]
        );
      });
      
      console.log("Initial shop items inserted");
    }
  });

  // Check if fortune wheel rewards already exist
  db.get("SELECT COUNT(*) as count FROM fortune_wheel_rewards", (err, row) => {
    if (err) {
      console.error("Error checking fortune wheel rewards:", err);
      return;
    }
    
    if (row.count === 0) {
      // Insert fortune wheel rewards
      const rewards = [
        {
          name: "Small Currency Pack",
          description: "100 in-game currency",
          type: "currency",
          value: 100,
          probability: 0.3,
          image_url: "/assets/wheel/small_currency.png"
        },
        {
          name: "Medium Currency Pack",
          description: "250 in-game currency",
          type: "currency",
          value: 250,
          probability: 0.15,
          image_url: "/assets/wheel/medium_currency.png"
        },
        {
          name: "Large Currency Pack",
          description: "500 in-game currency",
          type: "currency",
          value: 500,
          probability: 0.05,
          image_url: "/assets/wheel/large_currency.png"
        },
        {
          name: "Temporary Speed Boost",
          description: "15% speed boost for 1 day",
          type: "temporary_boost",
          value: 15,
          probability: 0.2,
          image_url: "/assets/wheel/temp_speed.png"
        },
        {
          name: "Temporary Capacity Boost",
          description: "15% capacity boost for 1 day",
          type: "temporary_boost",
          value: 15,
          probability: 0.2,
          image_url: "/assets/wheel/temp_capacity.png"
        },
        {
          name: "Premium Currency",
          description: "10 premium currency",
          type: "premium_currency",
          value: 10,
          probability: 0.1,
          image_url: "/assets/wheel/premium_currency.png"
        }
      ];

      rewards.forEach(reward => {
        db.run(
          `INSERT INTO fortune_wheel_rewards (name, description, type, value, probability, image_url) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [reward.name, reward.description, reward.type, reward.value, reward.probability, reward.image_url]
        );
      });
      
      console.log("Initial fortune wheel rewards inserted");
    }
  });
}

// Helper functions for database operations
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getOne(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function getAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

module.exports = {
  db,
  initializeDatabase,
  runQuery,
  getOne,
  getAll
};
