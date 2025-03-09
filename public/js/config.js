/**
 * Space Miner - Configuration File
 * Contains global configuration settings for the game
 */

const CONFIG = {
    // API endpoints
    API: {
        BASE_URL: '/api',
        AUTH: '/api/auth',
        PLANETS: '/api/planets',
        EXPEDITIONS: '/api/expeditions',
        SHOP: '/api/shop',
        LEADERBOARD: '/api/leaderboard',
        PROFILE: '/api/profile',
        FORTUNE_WHEEL: '/api/fortune-wheel'
    },
    
    // Game settings
    GAME: {
        // Expedition settings
        EXPEDITION: {
            MIN_COUNTDOWN_WARNING: 30, // seconds before countdown warning appears
            DANGER_CHECK_INTERVAL: 5000, // milliseconds between danger checks
            RESOURCE_COLLECTION_INTERVAL: 3000 // milliseconds between automatic resource collection
        },
        
        // Resource rarities
        RARITY: {
            COMMON: 1,
            UNCOMMON: 2,
            RARE: 3,
            EPIC: 4,
            LEGENDARY: 5
        },
        
        // Animation durations
        ANIMATIONS: {
            PLANET_ROTATION: 30000, // milliseconds for a full planet rotation
            LOADING_DURATION: 3000, // milliseconds for loading screen
            EXPEDITION_TRANSITION: 1000 // milliseconds for expedition transition
        }
    },
    
    // Default player settings
    PLAYER: {
        DEFAULT_RETURN_SPEED: 1,
        DEFAULT_STORAGE_CAPACITY: 100,
        DEFAULT_SUIT_AUTONOMY: 1,
        DEFAULT_DRONE_COLLECTION: 0
    },
    
    // Fortune wheel settings
    FORTUNE_WHEEL: {
        SEGMENTS: [
            { type: 'resource', value: 'gold', amount: 50, color: '#FFD700', probability: 0.2 },
            { type: 'resource', value: 'crystal', amount: 30, color: '#9370DB', probability: 0.2 },
            { type: 'resource', value: 'iron', amount: 100, color: '#A9A9A9', probability: 0.2 },
            { type: 'resource', value: 'uranium', amount: 20, color: '#32CD32', probability: 0.1 },
            { type: 'resource', value: 'water', amount: 80, color: '#1E90FF', probability: 0.2 },
            { type: 'currency', value: 'premium', amount: 10, color: '#FF6347', probability: 0.05 },
            { type: 'currency', value: 'regular', amount: 100, color: '#4682B4', probability: 0.1 },
            { type: 'item', value: 'fuel_tank', amount: 1, color: '#8A2BE2', probability: 0.05 }
        ],
        SPIN_DURATION: 5000, // milliseconds for wheel spin animation
        SPIN_COST: 10 // premium currency cost per spin
    }
};
