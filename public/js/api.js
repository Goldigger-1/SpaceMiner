/**
 * Space Miner - API Interface
 * Handles all API requests to the backend
 */

class API {
    /**
     * Initialize the API interface
     */
    constructor() {
        this.baseUrl = CONFIG?.API?.BASE_URL || '/api';
        
        // Safely retrieve token from localStorage
        try {
            this.token = localStorage.getItem('token') || null;
        } catch (error) {
            console.error('Failed to retrieve token from localStorage:', error);
            this.token = null;
        }
        
        // Safely access Telegram WebApp data
        try {
            // First try to get from WebApp object
            this.telegramInitData = window.Telegram?.WebApp?.initData || '';
            
            // If not available, try to get from localStorage
            if (!this.telegramInitData) {
                this.telegramInitData = localStorage.getItem('telegramInitData') || '';
                console.log('Retrieved Telegram initData from localStorage');
            }
            
            if (this.telegramInitData) {
                console.log('Telegram initData available:', this.telegramInitData.substring(0, 50) + '...');
            } else {
                console.warn('No Telegram initData available');
            }
        } catch (error) {
            console.error('Failed to access Telegram WebApp data:', error);
            this.telegramInitData = '';
        }
        
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * Set the authentication token
     * @param {string} token - JWT token
     */
    setToken(token) {
        if (!token || typeof token !== 'string') {
            console.error('Invalid token provided to setToken');
            return;
        }
        this.token = token;
        try {
            localStorage.setItem('token', token);
        } catch (error) {
            console.error('Failed to save token to localStorage:', error);
        }
    }

    /**
     * Clear the authentication token
     */
    clearToken() {
        this.token = null;
        try {
            localStorage.removeItem('token');
        } catch (error) {
            console.error('Failed to remove token from localStorage:', error);
        }
    }

    /**
     * Check if user has a token (does not validate the token)
     * @returns {boolean} - True if a token exists
     */
    hasToken() {
        return !!this.token;
    }

    /**
     * Make a request to the API
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {object} data - Request data
     * @returns {Promise} - Promise with response data
     */
    async request(endpoint, method = 'GET', data = null) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            console.log(`API Request: ${method} ${url}`);
            
            // Add authorization header if token exists
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Include cookies for cross-origin requests
            };
            
            // Only add Authorization header if we have a token and we're not trying to authenticate
            if (this.token && !endpoint.includes('/auth/login')) {
                options.headers['Authorization'] = `Bearer ${this.token}`;
                console.log(`Using token for request: ${this.token.substring(0, 20)}...`);
            } else if (!endpoint.includes('/auth/login')) {
                console.warn('No token available for request');
                
                // Try to retrieve token from localStorage again
                try {
                    const storedToken = localStorage.getItem('token');
                    if (storedToken && storedToken !== this.token) {
                        console.log('Retrieved token from localStorage');
                        this.token = storedToken;
                        options.headers['Authorization'] = `Bearer ${this.token}`;
                    } else {
                        // If no token is available and we're not authenticating, try to authenticate first
                        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
                            console.log('No token available, attempting to authenticate with Telegram first...');
                            try {
                                await this.authenticateTelegram();
                                // If authentication succeeds, update the headers with the new token
                                if (this.token) {
                                    options.headers['Authorization'] = `Bearer ${this.token}`;
                                    console.log('Authentication successful, proceeding with request');
                                }
                            } catch (authError) {
                                console.error('Pre-request authentication failed:', authError);
                                // Continue with the request anyway, it will likely fail with 401
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to retrieve token from localStorage:', error);
                }
            }
            
            // Add Telegram data if available
            if (this.telegramInitData) {
                options.headers['Telegram-Data'] = this.telegramInitData;
            }
            
            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                options.body = JSON.stringify(data);
            }
            
            console.log(`Request headers:`, JSON.stringify(options.headers));
            
            if (options.body) {
                console.log(`Request body:`, options.body.length > 1000 ? options.body.substring(0, 1000) + '...' : options.body);
            }
            
            // Add timeout to fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // Increased timeout to 20 seconds
            options.signal = controller.signal;
            
            const response = await fetch(url, options);
            clearTimeout(timeoutId);
            
            console.log(`Response status: ${response.status} ${response.statusText}`);
            
            // Handle authentication errors
            if (response.status === 401) {
                console.error('Authentication failed (401 Unauthorized)');
                
                // Only clear token if not trying to authenticate
                if (!endpoint.includes('/auth/login')) {
                    this.clearToken();
                    
                    // Try to re-authenticate with Telegram if available
                    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
                        console.log('Attempting to re-authenticate with Telegram...');
                        try {
                            await this.authenticateTelegram();
                            console.log('Re-authentication successful, retrying original request');
                            return this.request(endpoint, method, data);
                        } catch (authError) {
                            console.error('Re-authentication failed:', authError);
                            
                            // Instead of throwing an error, return a default response for inventory and shop
                            if (endpoint.includes('/profile/inventory')) {
                                console.log('Returning default inventory data');
                                return { inventory: [] };
                            } else if (endpoint.includes('/shop')) {
                                console.log('Returning default shop data');
                                return { items: [] };
                            } else if (endpoint.includes('/leaderboard')) {
                                console.log('Returning default leaderboard data');
                                return { leaderboard: [] };
                            } else if (endpoint.includes('/profile')) {
                                console.log('Returning default profile data');
                                return { 
                                    profile: { 
                                        currency: 0, 
                                        premium_currency: 0,
                                        return_speed: 1,
                                        storage_capacity: 100,
                                        suit_autonomy: 1,
                                        drone_collection: 0
                                    } 
                                };
                            }
                            
                            throw new Error('Authentication failed. Please refresh the page and try again.');
                        }
                    } else {
                        // Return default data for critical endpoints
                        if (endpoint.includes('/profile/inventory')) {
                            console.log('Returning default inventory data');
                            return { inventory: [] };
                        } else if (endpoint.includes('/shop')) {
                            console.log('Returning default shop data');
                            return { items: [] };
                        } else if (endpoint.includes('/leaderboard')) {
                            console.log('Returning default leaderboard data');
                            return { leaderboard: [] };
                        } else if (endpoint.includes('/profile')) {
                            console.log('Returning default profile data');
                            return { 
                                profile: { 
                                    currency: 0, 
                                    premium_currency: 0,
                                    return_speed: 1,
                                    storage_capacity: 100,
                                    suit_autonomy: 1,
                                    drone_collection: 0
                                } 
                            };
                        }
                        
                        throw new Error('Authentication failed. Please refresh the page and try again.');
                    }
                } else {
                    throw new Error('Authentication failed. Invalid credentials.');
                }
            } else if (response.status === 404) {
                // Special handling for 404 errors
                console.error(`API endpoint not found: ${url}`);
                
                // Return default data for critical endpoints
                if (endpoint.includes('/profile/inventory')) {
                    console.log('Endpoint not found, returning default inventory data');
                    return { inventory: [] };
                } else if (endpoint.includes('/shop')) {
                    console.log('Endpoint not found, returning default shop data');
                    return { items: [] };
                } else if (endpoint.includes('/leaderboard')) {
                    console.log('Endpoint not found, returning default leaderboard data');
                    return { leaderboard: [] };
                } else if (endpoint.includes('/profile')) {
                    console.log('Endpoint not found, returning default profile data');
                    return { 
                        profile: { 
                            currency: 0, 
                            premium_currency: 0,
                            return_speed: 1,
                            storage_capacity: 100,
                            suit_autonomy: 1,
                            drone_collection: 0
                        } 
                    };
                }
                
                throw new Error(`API endpoint not found: ${endpoint}`);
            }
            
            // Parse response
            const contentType = response.headers.get('content-type');
            let responseData;
            
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
                console.log(`Response data:`, responseData);
                
                if (!response.ok) {
                    const errorMessage = responseData.error || responseData.message || `API request failed with status ${response.status}`;
                    console.error(`API error: ${errorMessage}`);
                    
                    // Return default data for critical endpoints
                    if (endpoint.includes('/profile/inventory')) {
                        console.log('Error response, returning default inventory data');
                        return { inventory: [] };
                    } else if (endpoint.includes('/shop')) {
                        console.log('Error response, returning default shop data');
                        return { items: [] };
                    } else if (endpoint.includes('/leaderboard')) {
                        console.log('Error response, returning default leaderboard data');
                        return { leaderboard: [] };
                    } else if (endpoint.includes('/profile')) {
                        console.log('Error response, returning default profile data');
                        return { 
                            profile: { 
                                currency: 0, 
                                premium_currency: 0,
                                return_speed: 1,
                                storage_capacity: 100,
                                suit_autonomy: 1,
                                drone_collection: 0
                            } 
                        };
                    }
                    
                    throw new Error(errorMessage);
                }
                
                return responseData;
            } else {
                if (!response.ok) {
                    const text = await response.text();
                    console.error(`API error (non-JSON): ${text || response.status}`);
                    
                    // Return default data for critical endpoints
                    if (endpoint.includes('/profile/inventory')) {
                        console.log('Error response, returning default inventory data');
                        return { inventory: [] };
                    } else if (endpoint.includes('/shop')) {
                        console.log('Error response, returning default shop data');
                        return { items: [] };
                    } else if (endpoint.includes('/leaderboard')) {
                        console.log('Error response, returning default leaderboard data');
                        return { leaderboard: [] };
                    } else if (endpoint.includes('/profile')) {
                        console.log('Error response, returning default profile data');
                        return { 
                            profile: { 
                                currency: 0, 
                                premium_currency: 0,
                                return_speed: 1,
                                storage_capacity: 100,
                                suit_autonomy: 1,
                                drone_collection: 0
                            } 
                        };
                    }
                    
                    throw new Error(text || `API request failed with status ${response.status}`);
                }
                
                return { success: true };
            }
        } catch (error) {
            // Handle network errors with retry logic
            if (error.name === 'AbortError') {
                console.error('Request timed out');
                
                // Return default data for critical endpoints
                if (endpoint.includes('/profile/inventory')) {
                    console.log('Request timed out, returning default inventory data');
                    return { inventory: [] };
                } else if (endpoint.includes('/shop')) {
                    console.log('Request timed out, returning default shop data');
                    return { items: [] };
                } else if (endpoint.includes('/leaderboard')) {
                    console.log('Request timed out, returning default leaderboard data');
                    return { leaderboard: [] };
                } else if (endpoint.includes('/profile')) {
                    console.log('Request timed out, returning default profile data');
                    return { 
                        profile: { 
                            currency: 0, 
                            premium_currency: 0,
                            return_speed: 1,
                            storage_capacity: 100,
                            suit_autonomy: 1,
                            drone_collection: 0
                        } 
                    };
                }
                
                throw new Error('Request timed out. Please check your internet connection and try again.');
            }
            
            if (error.message === 'Failed to fetch' && this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`Retrying request (${this.retryCount}/${this.maxRetries})...`);
                
                // Exponential backoff
                const backoffTime = Math.pow(2, this.retryCount) * 1000;
                await new Promise(resolve => setTimeout(resolve, backoffTime));
                
                return this.request(endpoint, method, data);
            }
            
            // Reset retry count
            this.retryCount = 0;
            
            // Return default data for critical endpoints on final failure
            if (endpoint.includes('/profile/inventory')) {
                console.log('Request failed, returning default inventory data');
                return { inventory: [] };
            } else if (endpoint.includes('/shop')) {
                console.log('Request failed, returning default shop data');
                return { items: [] };
            } else if (endpoint.includes('/leaderboard')) {
                console.log('Request failed, returning default leaderboard data');
                return { leaderboard: [] };
            } else if (endpoint.includes('/profile')) {
                console.log('Request failed, returning default profile data');
                return { 
                    profile: { 
                        currency: 0, 
                        premium_currency: 0,
                        return_speed: 1,
                        storage_capacity: 100,
                        suit_autonomy: 1,
                        drone_collection: 0
                    } 
                };
            }
            
            throw error;
        }
    }

    /**
     * Authentication
     */
    async authenticate() {
        try {
            // First try to authenticate with stored token
            if (this.token) {
                try {
                    const result = await this.request('/auth/me');
                    return { token: this.token, ...result };
                } catch (error) {
                    console.log('Stored token invalid, trying Telegram auth');
                    this.clearToken();
                }
            }
            
            // Then try Telegram authentication
            if (this.telegramInitData) {
                try {
                    return await this.authenticateTelegram(this.telegramInitData);
                } catch (telegramError) {
                    console.error('Telegram authentication failed:', telegramError);
                    // Continue to next authentication method or throw error
                }
            }
            
            throw new Error('No authentication method available');
        } catch (error) {
            console.error('Authentication error:', error);
            throw error instanceof Error ? error : new Error(error.toString());
        }
    }

    /**
     * Authenticate with Telegram
     * @param {string} initData - Telegram init data (optional)
     */
    async authenticateTelegram(initData = null) {
        // Parse Telegram WebApp init data
        let telegramUser = {};
        
        try {
            if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
                const user = window.Telegram.WebApp.initDataUnsafe.user;
                console.log('Extracting Telegram user data:', user);
                
                telegramUser = {
                    telegram_id: user.id.toString(),
                    username: user.username || `user_${user.id}`,
                    auth_date: Math.floor(Date.now() / 1000),
                    initData: window.Telegram.WebApp.initData || initData // Use provided initData or from WebApp
                };
                
                // Store Telegram data for future requests
                this.telegramInitData = window.Telegram?.WebApp?.initData || initData || '';
                try {
                    localStorage.setItem('telegramInitData', this.telegramInitData);
                } catch (error) {
                    console.error('Failed to save Telegram initData to localStorage:', error);
                }
                
                console.log('Prepared user data for authentication:', telegramUser);
            } else {
                console.error('No Telegram WebApp user data available');
                throw new Error('No Telegram user data available');
            }
        } catch (error) {
            console.error('Failed to parse Telegram WebApp data:', error);
            throw error;
        }
        
        console.log('Sending authentication request to server');
        try {
            // Make sure we're not sending the token in this request since we're trying to authenticate
            const originalToken = this.token;
            this.token = null;
            
            const result = await this.request('/auth/login', 'POST', telegramUser);
            console.log('Authentication response:', result);
            
            if (result && result.token) {
                console.log('Setting token from authentication response');
                this.setToken(result.token);
                
                // Verify the token works by making a test request
                try {
                    await this.request('/auth/ping');
                    console.log('Token verification successful');
                } catch (verifyError) {
                    console.error('Token verification failed:', verifyError);
                    // If verification fails, restore the original token (if any)
                    if (originalToken) {
                        this.token = originalToken;
                    }
                    throw new Error('Token verification failed');
                }
                
                return result;
            } else {
                console.error('No token received from server');
                // If no token received, restore the original token (if any)
                if (originalToken) {
                    this.token = originalToken;
                }
                throw new Error('Authentication failed - no token received');
            }
        } catch (error) {
            console.error('Authentication request failed:', error);
            throw error;
        }
    }

    /**
     * Authenticate with token
     * @param {string} token - Authentication token
     */
    async authenticateWithToken(token) {
        this.setToken(token);
        return this.request('/auth/me');
    }

    /**
     * Developer login (for testing)
     * @param {string} userId - User ID
     */
    async devLogin(userId) {
        const result = await this.request('/auth/dev-login', 'POST', { user_id: userId });
        if (result.token) {
            this.setToken(result.token);
        }
        return result;
    }

    /**
     * Get all planets
     */
    async getPlanets() {
        return this.request('/planets');
    }

    /**
     * Get planet details
     * @param {number} planetId - Planet ID
     */
    async getPlanetDetails(planetId) {
        return this.request(`/planets/${planetId}`);
    }

    /**
     * Start an expedition
     * @param {number} planetId - Planet ID
     */
    async startExpedition(planetId) {
        return this.request('/expeditions/start', 'POST', { planet_id: planetId });
    }

    /**
     * Check for dangers during expedition
     */
    async checkDanger() {
        return this.request('/expeditions/check-danger', 'POST');
    }

    /**
     * Collect resource during expedition
     * @param {string} method - Collection method ('auto' or 'manual')
     */
    async collectResource(method) {
        return this.request('/expeditions/mine', 'POST', { method });
    }

    /**
     * Explore area during expedition
     */
    async exploreArea() {
        return this.request('/expeditions/explore', 'POST');
    }

    /**
     * Return to ship during expedition
     */
    async returnToShip() {
        return this.request('/expeditions/return', 'POST');
    }

    /**
     * Handle expedition time up
     */
    async expeditionTimeUp() {
        return this.request('/expeditions/time-up', 'POST');
    }

    /**
     * Get expedition history
     */
    async getExpeditionHistory() {
        return this.request('/profile/expedition-history');
    }

    /**
     * Perform an action during expedition
     * @param {number} expeditionId - Expedition ID
     * @param {string} action - Action type (mine, explore, return)
     */
    async expeditionAction(expeditionId, action) {
        return this.request('/expeditions/action', 'POST', { 
            expedition_id: expeditionId, 
            action 
        });
    }

    /**
     * End an expedition
     * @param {number} expeditionId - Expedition ID
     */
    async endExpedition(expeditionId) {
        return this.request(`/expeditions/${expeditionId}/end`, 'POST');
    }

    /**
     * Get user inventory
     */
    async getInventory() {
        try {
            console.log('Fetching inventory...');
            const response = await this.request('/profile/inventory');
            console.log('Inventory response:', response);
            
            // Check if the response has the expected structure
            if (response && response.inventory) {
                return response.inventory;
            } else {
                console.error('Invalid inventory response structure:', response);
                return [];
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
            throw error;
        }
    }

    /**
     * Sell inventory item
     * @param {number} itemId - Item ID
     * @param {number} quantity - Quantity to sell (default: all)
     */
    async sellItem(itemId, quantity = null) {
        return this.request('/profile/sell-item', 'POST', { 
            item_id: itemId,
            quantity: quantity
        });
    }

    /**
     * Get shop items
     * @param {string} category - Item category
     */
    async getShopItems(category) {
        try {
            console.log(`Fetching shop items for category: ${category}...`);
            const response = await this.request(`/shop?category=${category}`);
            console.log('Shop items response:', response);
            
            // Check if the response has the expected structure
            if (response && response.items) {
                // If items are grouped by type, return the items for the requested category
                if (response.items[category]) {
                    return response.items[category];
                } 
                // If all items are returned, filter by category
                else if (Array.isArray(response.items)) {
                    return response.items.filter(item => item.type === category);
                }
                // If items are grouped but category doesn't exist
                else if (typeof response.items === 'object') {
                    console.warn(`No items found for category: ${category}`);
                    return [];
                }
            }
            
            console.error('Invalid shop items response structure:', response);
            return [];
        } catch (error) {
            console.error(`Error fetching shop items for category ${category}:`, error);
            throw error;
        }
    }

    /**
     * Purchase an item
     * @param {number} itemId - Item ID
     * @param {number} quantity - Quantity to purchase (default: 1)
     */
    async purchaseItem(itemId, quantity = 1) {
        return this.request('/shop/purchase', 'POST', { 
            item_id: itemId,
            quantity: quantity
        });
    }

    /**
     * Get monthly leaderboard
     */
    async getMonthlyLeaderboard() {
        return this.request('/leaderboard?period=month');
    }

    /**
     * Get global leaderboard
     */
    async getGlobalLeaderboard() {
        return this.request('/leaderboard?period=all-time');
    }

    /**
     * Get user profile
     */
    async getProfile() {
        return this.request('/profile');
    }

    /**
     * Get fortune wheel rewards
     */
    async getFortuneWheelRewards() {
        return this.request('/fortune-wheel/rewards');
    }

    /**
     * Purchase spins for the fortune wheel
     * @param {string} packageId - Package ID (single, pack5, pack10)
     */
    async purchaseSpins(packageId) {
        return this.request('/fortune-wheel/purchase-spins', 'POST', { package_id: packageId });
    }

    /**
     * Spin the fortune wheel
     * @param {string} paymentType - Payment type ('premium' or 'real')
     */
    async spinFortuneWheel(paymentType = 'premium') {
        return this.request('/fortune-wheel/spin', 'POST', { payment_type: paymentType });
    }
    
    /**
     * Get user's current active upgrades
     */
    async getActiveUpgrades() {
        return this.request('/profile/upgrades');
    }
    
    /**
     * Check if server is reachable
     * @returns {Promise<boolean>} - True if server is reachable, false otherwise
     */
    async checkConnection() {
        try {
            // Use AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            // Use a simple endpoint that doesn't require authentication
            const response = await fetch(`${this.baseUrl}/planets/list`, {
                method: 'HEAD',
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            console.error('Connection check failed:', error);
            return false;
        }
    }

    /**
     * Check connection status
     * @returns {Promise<boolean>} - True if connected, false otherwise
     */
    async checkConnectionStatus() {
        try {
            await this.request('/auth/ping');
            return true;
        } catch (error) {
            console.error('Connection check failed:', error);
            return false;
        }
    }

    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>} - True if authenticated, false otherwise
     */
    async isAuthenticated() {
        try {
            if (!this.token) {
                return false;
            }
            
            // Try to get user profile to verify token is valid
            await this.request('/auth/me');
            return true;
        } catch (error) {
            console.log('Authentication check failed:', error);
            // Clear invalid token
            if (error.message.includes('Authentication failed') || 
                error.message.includes('401') || 
                error.message.includes('unauthorized')) {
                this.clearToken();
            }
            return false;
        }
    }
}

// Create global API instance
const api = new API();
