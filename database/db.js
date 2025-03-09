const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Database file path
const dbPath = path.join(dbDir, 'spaceminer.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        throw err;
    }
    console.log(`Connected to SQLite database at ${dbPath}`);
});

/**
 * Run a query that doesn't return data
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} - Promise that resolves with the result
 */
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error('Database run error:', err.message, 'for query:', sql, 'with params:', params);
                reject(err);
                return;
            }
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

/**
 * Get a single row from the database
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} - Promise that resolves with the row
 */
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error('Database get error:', err.message, 'for query:', sql, 'with params:', params);
                reject(err);
                return;
            }
            resolve(row);
        });
    });
}

/**
 * Get all rows from the database
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} - Promise that resolves with the rows
 */
function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Database all error:', err.message, 'for query:', sql, 'with params:', params);
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

/**
 * Initialize the database schema
 * @returns {Promise} - Promise that resolves when initialization is complete
 */
async function initializeDatabase() {
    try {
        console.log('Initializing database...');
        
        // Enable foreign keys
        await run('PRAGMA foreign_keys = ON');
        
        // Create users table
        await run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                last_login INTEGER
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
                rarity INTEGER NOT NULL,
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
                start_time INTEGER NOT NULL,
                end_time INTEGER NOT NULL,
                status TEXT NOT NULL,
                resources_collected INTEGER,
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
                quantity INTEGER NOT NULL,
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
                rarity INTEGER NOT NULL,
                image TEXT
            )
        `);
        
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
