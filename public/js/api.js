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
            this.telegramInitData = window.Telegram?.WebApp?.initData || '';
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
            
            // Add authorization header if token exists
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.token ? `Bearer ${this.token}` : '',
                    'Telegram-Data': this.telegramInitData
                },
                credentials: 'include' // Include cookies for cross-origin requests
            };
            
            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                options.body = JSON.stringify(data);
            }
            
            // Add timeout to fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            options.signal = controller.signal;
            
            const response = await fetch(url, options);
            clearTimeout(timeoutId);
            
            // Handle authentication errors
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication failed. Please log in again.');
            }
            
            // Parse response
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const responseData = await response.json();
                
                if (!response.ok) {
                    const errorMessage = responseData.error || responseData.message || `API request failed with status ${response.status}`;
                    throw new Error(errorMessage);
                }
                
                return responseData;
            } else {
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || `API request failed with status ${response.status}`);
                }
                
                return { success: true };
            }
        } catch (error) {
            // Handle network errors with retry logic
            if (error.name === 'AbortError') {
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
     * @param {string} initData - Telegram init data
     */
    async authenticateTelegram(initData) {
        const result = await this.request('/auth/login', 'POST', { telegram_data: initData });
        if (result.token) {
            this.setToken(result.token);
        }
        return result;
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
        return this.request('/profile/inventory');
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
        return this.request(`/shop?category=${category}`);
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
