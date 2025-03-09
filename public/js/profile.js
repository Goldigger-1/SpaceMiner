/**
 * Space Miner - Profile Module
 * Handles profile-related functionality
 */

class Profile {
    constructor() {
        this.expeditionHistory = document.getElementById('expedition-history');
        this.profileUsername = document.getElementById('profile-username');
        this.profileImage = document.getElementById('profile-image');
        this.totalExpeditions = document.getElementById('total-expeditions');
        this.successfulReturns = document.getElementById('successful-returns');
        this.totalResources = document.getElementById('total-resources');
    }

    /**
     * Initialize profile module
     * @returns {Promise} - Promise that resolves when initialization is complete
     */
    async init() {
        try {
            console.log('Initializing profile module...');
            // Load profile data
            await this.loadProfile();
            console.log('Profile module initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing profile module:', error);
            // Don't throw here, just log the error
            // This allows the game to continue loading even if profile fails
            return false;
        }
    }

    /**
     * Load profile data
     */
    async loadProfile() {
        try {
            ui.showLoadingScreen();
            
            console.log('Loading profile data...');
            const profile = await api.getProfile();
            console.log('Profile data received:', profile);
            
            if (!profile) {
                console.warn('Empty profile data received');
                ui.hideLoadingScreen();
                return;
            }
            
            this.updateProfileDisplay(profile);
            
            // Load expedition history
            try {
                await this.loadExpeditionHistory();
            } catch (historyError) {
                console.error('Failed to load expedition history:', historyError);
                // Continue even if history loading fails
            }
            
            ui.hideLoadingScreen();
        } catch (error) {
            ui.hideLoadingScreen();
            console.error('Error loading profile:', error);
            ui.showError('Failed to load profile data');
            throw error; // Re-throw to be caught by init()
        }
    }

    /**
     * Update profile display
     * @param {object} profile - Profile data
     */
    updateProfileDisplay(profile) {
        if (this.profileUsername) {
            this.profileUsername.textContent = profile.username;
        }
        
        if (this.profileImage && profile.avatar_url) {
            this.profileImage.src = profile.avatar_url;
        }
        
        if (this.totalExpeditions) {
            this.totalExpeditions.textContent = profile.stats.total_expeditions;
        }
        
        if (this.successfulReturns) {
            this.successfulReturns.textContent = profile.stats.successful_returns;
        }
        
        if (this.totalResources) {
            this.totalResources.textContent = profile.stats.total_resources;
        }
    }

    /**
     * Load expedition history
     */
    async loadExpeditionHistory() {
        if (!this.expeditionHistory) return;
        
        try {
            const history = await api.getExpeditionHistory();
            
            this.expeditionHistory.innerHTML = '';
            
            if (!history.expeditions || history.expeditions.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'empty-history';
                emptyMessage.textContent = 'No expedition history yet. Start your first expedition!';
                
                this.expeditionHistory.appendChild(emptyMessage);
                return;
            }
            
            history.expeditions.forEach(expedition => {
                const historyItem = this.createHistoryItem(expedition);
                this.expeditionHistory.appendChild(historyItem);
            });
        } catch (error) {
            console.error('Error loading expedition history:', error);
            this.expeditionHistory.innerHTML = '<div class="error-message">Failed to load expedition history</div>';
        }
    }

    /**
     * Create history item element
     * @param {object} expedition - Expedition data
     * @returns {HTMLElement} History item element
     */
    createHistoryItem(expedition) {
        const historyItem = document.createElement('div');
        historyItem.className = `history-item ${expedition.success ? 'success' : 'failure'}`;
        
        const date = new Date(expedition.end_time);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        
        historyItem.innerHTML = `
            <div class="history-icon">
                <i class="fas ${expedition.success ? 'fa-check-circle' : 'fa-times-circle'}"></i>
            </div>
            <div class="history-info">
                <div class="history-title">
                    ${expedition.planet_name} Expedition
                    <span class="history-status">${expedition.success ? 'Success' : 'Failed'}</span>
                </div>
                <div class="history-date">${formattedDate}</div>
                <div class="history-resources">
                    <span>Resources: </span>
                    <span>${expedition.resources_collected || 0}</span>
                </div>
            </div>
        `;
        
        return historyItem;
    }
}

// Create global profile instance
const profile = new Profile();
