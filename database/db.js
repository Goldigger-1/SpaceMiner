const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Database file path
const dbPath = path.join(dbDir, 'spaceminer.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log(`Connected to SQLite database at ${dbPath}`);
    }
});

// Run a query that doesn't return data
// @param {string} sql - SQL query
// @param {Array} params - Query parameters
// @returns {Promise} - Promise that resolves with the result
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error('Database run error:', err, 'for query:', sql, 'with params:', params);
                reject(err);
            } else {
                resolve({
                    lastID: this.lastID,
                    changes: this.changes
                });
            }
        });
    });
}

// Get a single row from the database
// @param {string} sql - SQL query
// @param {Array} params - Query parameters
// @returns {Promise} - Promise that resolves with the row
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error('Database get error:', err, 'for query:', sql, 'with params:', params);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Get all rows from the database
// @param {string} sql - SQL query
// @param {Array} params - Query parameters
// @returns {Promise} - Promise that resolves with the rows
function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Database all error:', err, 'for query:', sql, 'with params:', params);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Initialize the database schema
// @returns {Promise} - Promise that resolves when initialization is complete
async function initializeDatabase() {
    try {
        console.log('Initializing database...');
        
        // Create users table
        await run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id TEXT UNIQUE,
                username TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                currency INTEGER DEFAULT 1000,
                premium_currency INTEGER DEFAULT 10
            )
        `);
        
        // Create user_profiles table
        await run(`
            CREATE TABLE IF NOT EXISTS user_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                currency INTEGER DEFAULT 0,
                premium_currency INTEGER DEFAULT 0,
                return_speed REAL DEFAULT 1,
                storage_capacity INTEGER DEFAULT 100,
                suit_autonomy REAL DEFAULT 1,
                drone_collection REAL DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create user_stats table
        await run(`
            CREATE TABLE IF NOT EXISTS user_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                total_expeditions INTEGER DEFAULT 0,
                successful_returns INTEGER DEFAULT 0,
                total_resources INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create planets table
        await run(`
            CREATE TABLE IF NOT EXISTS planets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                distance INTEGER NOT NULL,
                rarity TEXT NOT NULL,
                image TEXT,
                resource_multiplier REAL DEFAULT 1
            )
        `);
        
        // Create expeditions table
        await run(`
            CREATE TABLE IF NOT EXISTS expeditions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                planet_id INTEGER NOT NULL,
                start_time TEXT NOT NULL,
                return_time TEXT NOT NULL,
                status TEXT NOT NULL,
                resources_collected INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (planet_id) REFERENCES planets(id) ON DELETE CASCADE
            )
        `);
        
        // Create inventory table
        await run(`
            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                item_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                UNIQUE(user_id, item_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create items table
        await run(`
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL,
                rarity TEXT NOT NULL,
                image TEXT,
                value INTEGER DEFAULT 0
            )
        `);
        
        // Create shop_items table
        await run(`
            CREATE TABLE IF NOT EXISTS shop_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL,
                subtype TEXT,
                price INTEGER NOT NULL,
                currency_type TEXT DEFAULT 'regular',
                boost_value REAL,
                image_url TEXT
            )
        `);
        
        // Create leaderboard table
        await run(`
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                score INTEGER NOT NULL DEFAULT 0,
                month INTEGER NOT NULL,
                year INTEGER NOT NULL,
                UNIQUE(user_id, month, year),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create wheel_prizes table
        await run(`
            CREATE TABLE IF NOT EXISTS wheel_prizes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL,
                amount INTEGER,
                item_id INTEGER,
                probability REAL NOT NULL,
                image_url TEXT
            )
        `);
        
        // Create wheel_spins table
        await run(`
            CREATE TABLE IF NOT EXISTS wheel_spins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                spin_date TEXT NOT NULL,
                remaining_spins INTEGER NOT NULL DEFAULT 3,
                UNIQUE(user_id, spin_date),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create fortune_wheel_rewards table (alias for wheel_prizes)
        await run(`
            CREATE TABLE IF NOT EXISTS fortune_wheel_rewards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL,
                value INTEGER,
                probability REAL NOT NULL,
                image_url TEXT
            )
        `);
        
        // Create user_spins table
        await run(`
            CREATE TABLE IF NOT EXISTS user_spins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                reward_id INTEGER NOT NULL,
                spin_date TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (reward_id) REFERENCES fortune_wheel_rewards(id) ON DELETE CASCADE
            )
        `);
        
        // Create user_upgrades table
        await run(`
            CREATE TABLE IF NOT EXISTS user_upgrades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                item_id INTEGER NOT NULL,
                purchase_date TEXT NOT NULL,
                expiry_date TEXT,
                active INTEGER DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE
            )
        `);
        
        // Insert default planets if none exist
        const planetsCount = await get('SELECT COUNT(*) as count FROM planets');
        if (planetsCount.count === 0) {
            // Use parameterized queries to avoid SQL syntax errors with apostrophes
            await run(`
                INSERT INTO planets (name, description, distance, rarity, image, resource_multiplier)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Moon', 'Earth\'s natural satellite', 100, 'common', '/images/planets/moon.png', 1]
            );
            
            await run(`
                INSERT INTO planets (name, description, distance, rarity, image, resource_multiplier)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Mars', 'The Red Planet', 250, 'common', '/images/planets/mars.png', 1.2]
            );
            
            await run(`
                INSERT INTO planets (name, description, distance, rarity, image, resource_multiplier)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Venus', 'The Morning Star', 300, 'uncommon', '/images/planets/venus.png', 1.5]
            );
            
            await run(`
                INSERT INTO planets (name, description, distance, rarity, image, resource_multiplier)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Jupiter', 'The Gas Giant', 500, 'rare', '/images/planets/jupiter.png', 2]
            );
            
            await run(`
                INSERT INTO planets (name, description, distance, rarity, image, resource_multiplier)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Saturn', 'The Ringed Planet', 600, 'rare', '/images/planets/saturn.png', 2.2]
            );
            
            await run(`
                INSERT INTO planets (name, description, distance, rarity, image, resource_multiplier)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Uranus', 'The Ice Giant', 800, 'epic', '/images/planets/uranus.png', 2.5]
            );
            
            await run(`
                INSERT INTO planets (name, description, distance, rarity, image, resource_multiplier)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Neptune', 'The Windy Planet', 900, 'epic', '/images/planets/neptune.png', 2.8]
            );
            
            await run(`
                INSERT INTO planets (name, description, distance, rarity, image, resource_multiplier)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Pluto', 'The Dwarf Planet', 1000, 'legendary', '/images/planets/pluto.png', 3]
            );
        }
        
        // Insert default wheel prizes if none exist
        const prizesCount = await get('SELECT COUNT(*) as count FROM wheel_prizes');
        if (prizesCount.count === 0) {
            await run(`
                INSERT INTO wheel_prizes (name, description, type, amount, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Small Currency', 'Win 100 currency', 'currency', 100, 0.3, '/images/prizes/currency_small.png']
            );
            
            await run(`
                INSERT INTO wheel_prizes (name, description, type, amount, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Medium Currency', 'Win 250 currency', 'currency', 250, 0.2, '/images/prizes/currency_medium.png']
            );
            
            await run(`
                INSERT INTO wheel_prizes (name, description, type, amount, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Large Currency', 'Win 500 currency', 'currency', 500, 0.1, '/images/prizes/currency_large.png']
            );
            
            await run(`
                INSERT INTO wheel_prizes (name, description, type, amount, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Small Premium', 'Win 5 premium currency', 'premium_currency', 5, 0.05, '/images/prizes/premium_small.png']
            );
            
            await run(`
                INSERT INTO wheel_prizes (name, description, type, amount, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Medium Premium', 'Win 10 premium currency', 'premium_currency', 10, 0.02, '/images/prizes/premium_medium.png']
            );
            
            await run(`
                INSERT INTO wheel_prizes (name, description, type, amount, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Large Premium', 'Win 20 premium currency', 'premium_currency', 20, 0.01, '/images/prizes/premium_large.png']
            );
            
            await run(`
                INSERT INTO wheel_prizes (name, description, type, amount, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Speed Boost', 'Temporary speed boost', 'boost', 1, 0.15, '/images/prizes/speed_boost.png']
            );
            
            await run(`
                INSERT INTO wheel_prizes (name, description, type, amount, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Capacity Boost', 'Temporary capacity boost', 'boost', 1, 0.15, '/images/prizes/capacity_boost.png']
            );
            
            await run(`
                INSERT INTO wheel_prizes (name, description, type, amount, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Nothing', 'Better luck next time!', 'nothing', 0, 0.02, '/images/prizes/nothing.png']
            );
        }
        
        // Insert default fortune wheel rewards if none exist
        const rewardsCount = await get('SELECT COUNT(*) as count FROM fortune_wheel_rewards');
        if (rewardsCount.count === 0) {
            await run(`
                INSERT INTO fortune_wheel_rewards (name, description, type, value, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Small Currency', 'Win 100 currency', 'currency', 100, 0.3, '/images/prizes/currency_small.png']
            );
            
            await run(`
                INSERT INTO fortune_wheel_rewards (name, description, type, value, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Medium Currency', 'Win 250 currency', 'currency', 250, 0.2, '/images/prizes/currency_medium.png']
            );
            
            await run(`
                INSERT INTO fortune_wheel_rewards (name, description, type, value, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Large Currency', 'Win 500 currency', 'currency', 500, 0.1, '/images/prizes/currency_large.png']
            );
            
            await run(`
                INSERT INTO fortune_wheel_rewards (name, description, type, value, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Small Premium', 'Win 5 premium currency', 'premium_currency', 5, 0.05, '/images/prizes/premium_small.png']
            );
            
            await run(`
                INSERT INTO fortune_wheel_rewards (name, description, type, value, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Medium Premium', 'Win 10 premium currency', 'premium_currency', 10, 0.02, '/images/prizes/premium_medium.png']
            );
            
            await run(`
                INSERT INTO fortune_wheel_rewards (name, description, type, value, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Large Premium', 'Win 20 premium currency', 'premium_currency', 20, 0.01, '/images/prizes/premium_large.png']
            );
            
            await run(`
                INSERT INTO fortune_wheel_rewards (name, description, type, value, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Speed Boost', 'Temporary speed boost', 'boost', 1, 0.15, '/images/prizes/speed_boost.png']
            );
            
            await run(`
                INSERT INTO fortune_wheel_rewards (name, description, type, value, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Capacity Boost', 'Temporary capacity boost', 'boost', 1, 0.15, '/images/prizes/capacity_boost.png']
            );
            
            await run(`
                INSERT INTO fortune_wheel_rewards (name, description, type, value, probability, image_url)
                VALUES (?, ?, ?, ?, ?, ?)`, 
                ['Nothing', 'Better luck next time!', 'nothing', 0, 0.02, '/images/prizes/nothing.png']
            );
        }
        
        // Insert default shop items if none exist
        const shopItemsCount = await get('SELECT COUNT(*) as count FROM shop_items');
        if (shopItemsCount.count === 0) {
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Basic Speed Upgrade', 'Increase return speed by 10%', 'spaceship', 'speed', 500, 'regular', 0.1, '/images/shop/speed_basic.png']
            );
            
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Advanced Speed Upgrade', 'Increase return speed by 25%', 'spaceship', 'speed', 1200, 'regular', 0.25, '/images/shop/speed_advanced.png']
            );
            
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Premium Speed Upgrade', 'Increase return speed by 50%', 'spaceship', 'speed', 50, 'premium', 0.5, '/images/shop/speed_premium.png']
            );
            
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Basic Capacity Upgrade', 'Increase storage capacity by 20%', 'spaceship', 'capacity', 600, 'regular', 0.2, '/images/shop/capacity_basic.png']
            );
            
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Advanced Capacity Upgrade', 'Increase storage capacity by 40%', 'spaceship', 'capacity', 1500, 'regular', 0.4, '/images/shop/capacity_advanced.png']
            );
            
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Premium Capacity Upgrade', 'Increase storage capacity by 75%', 'spaceship', 'capacity', 60, 'premium', 0.75, '/images/shop/capacity_premium.png']
            );
            
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Basic Suit Upgrade', 'Increase suit autonomy by 15%', 'suit', 'autonomy', 700, 'regular', 0.15, '/images/shop/suit_basic.png']
            );
            
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Advanced Suit Upgrade', 'Increase suit autonomy by 30%', 'suit', 'autonomy', 1800, 'regular', 0.3, '/images/shop/suit_advanced.png']
            );
            
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Premium Suit Upgrade', 'Increase suit autonomy by 60%', 'suit', 'autonomy', 70, 'premium', 0.6, '/images/shop/suit_premium.png']
            );
            
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Basic Drone', 'Adds automated resource collection', 'drone', 'collection', 2000, 'regular', 0.1, '/images/shop/drone_basic.png']
            );
            
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Advanced Drone', 'Improves automated resource collection', 'drone', 'collection', 4000, 'regular', 0.2, '/images/shop/drone_advanced.png']
            );
            
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Premium Drone', 'Maximizes automated resource collection', 'drone', 'collection', 100, 'premium', 0.4, '/images/shop/drone_premium.png']
            );
            
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Season Pass', 'Unlocks premium rewards for 30 days', 'season_pass', null, 200, 'premium', 30, '/images/shop/season_pass.png']
            );
            
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Small Premium Currency', 'Buy 50 premium currency', 'premium_currency', null, 4.99, 'real', 50, '/images/shop/premium_small.png']
            );
            
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Medium Premium Currency', 'Buy 120 premium currency', 'premium_currency', null, 9.99, 'real', 120, '/images/shop/premium_medium.png']
            );
            
            await run(`
                INSERT INTO shop_items (name, description, type, subtype, price, currency_type, boost_value, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                ['Large Premium Currency', 'Buy 300 premium currency', 'premium_currency', null, 19.99, 'real', 300, '/images/shop/premium_large.png']
            );
        }
        
        console.log('Database initialization complete');
        return true;
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// Close database connection on process exit
process.on('exit', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed');
        }
    });
});

module.exports = {
    run,
    get,
    all,
    initializeDatabase
};
