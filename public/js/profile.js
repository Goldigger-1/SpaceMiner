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
     */
    init() {
        // Load profile data
        this.loadProfile();
    }

    /**
     * Load profile data
     */
    async loadProfile() {
        try {
            ui.showLoadingScreen();
            
            const profile = await api.getProfile();
            this.updateProfileDisplay(profile);
            
            // Load expedition history
            await this.loadExpeditionHistory();
            
            ui.hideLoadingScreen();
        } catch (error) {
            ui.hideLoadingScreen();
            console.error('Error loading profile:', error);
            ui.showError('Failed to load profile data');
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
