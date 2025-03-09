/**
 * Space Miner - UI Interface
 * Handles all UI interactions and animations
 */

class UI {
    /**
     * Initialize the UI interface
     */
    constructor() {
        // Initialize Telegram WebApp
        this.tg = window.Telegram?.WebApp;
        if (this.tg) {
            this.tg.expand();
            this.tg.enableClosingConfirmation();
        }

        // DOM elements - Tabs
        this.tabs = {
            home: document.getElementById('home-tab'),
            expedition: document.getElementById('expedition-tab'),
            inventory: document.getElementById('inventory-tab'),
            shop: document.getElementById('shop-tab'),
            ranking: document.getElementById('ranking-tab'),
            profile: document.getElementById('profile-tab'),
            fortuneWheel: document.getElementById('fortune-wheel-tab')
        };

        // DOM elements - Navigation
        this.navButtons = document.querySelectorAll('.nav-btn');
        
        // DOM elements - Loading screen
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingFact = document.getElementById('loading-fact');
        this.progressBar = document.querySelector('.progress-bar');
        
        // DOM elements - Home tab
        this.spaceshipImage = document.getElementById('spaceship-image');
        this.returnSpeedEl = document.getElementById('return-speed');
        this.storageCapacityEl = document.getElementById('storage-capacity');
        this.suitAutonomyEl = document.getElementById('suit-autonomy');
        this.droneStatusEl = document.getElementById('drone-status');
        this.regularCurrencyEl = document.getElementById('regular-currency');
        this.premiumCurrencyEl = document.getElementById('premium-currency');
        
        // DOM elements - Expedition tab
        this.planetsList = document.getElementById('planets-list');
        this.activeExpedition = document.getElementById('active-expedition');
        this.expeditionPlanetName = document.getElementById('expedition-planet-name');
        this.countdownMinutes = document.getElementById('countdown-minutes');
        this.countdownSeconds = document.getElementById('countdown-seconds');
        this.countdownWarning = document.getElementById('countdown-warning');
        this.mineBtn = document.getElementById('mine-btn');
        this.exploreBtn = document.getElementById('explore-btn');
        this.returnBtn = document.getElementById('return-btn');
        this.expeditionResourcesList = document.getElementById('expedition-resources-list');
        this.dangerAlerts = document.getElementById('danger-alerts');
        
        // DOM elements - Inventory tab
        this.inventoryGrid = document.getElementById('inventory-grid');
        this.inventoryFilters = document.querySelectorAll('.filter-btn');
        
        // DOM elements - Shop tab
        this.shopItems = document.getElementById('shop-items');
        this.shopCategories = document.querySelectorAll('.category-btn');
        
        // DOM elements - Ranking tab
        this.rankingList = document.getElementById('ranking-list');
        this.rankingTabBtns = document.querySelectorAll('.ranking-tab-btn');
        this.monthlyTimeRemaining = document.getElementById('monthly-time-remaining');
        
        // DOM elements - Profile tab
        this.profileImage = document.getElementById('profile-image');
        this.profileUsername = document.getElementById('profile-username');
        this.totalExpeditions = document.getElementById('total-expeditions');
        this.successfulReturns = document.getElementById('successful-returns');
        this.totalResources = document.getElementById('total-resources');
        this.expeditionHistory = document.getElementById('expedition-history');
        
        // DOM elements - Fortune Wheel tab
        this.fortuneWheelCanvas = document.getElementById('wheel-spinner');
        this.spinBtn = document.getElementById('spin-button');
        this.buySpinsBtn = document.getElementById('buy-spins-btn');
        this.spinsRemaining = document.getElementById('spins-remaining');
        
        // DOM elements - Modals
        this.planetDetailsModal = document.getElementById('planet-details-modal');
        this.expeditionResultModal = document.getElementById('expedition-result-modal');
        this.purchaseModal = document.getElementById('purchase-modal');
        this.rewardModal = document.getElementById('reward-modal');
        
        // Game state
        this.currentTab = 'home';
        this.currentExpedition = null;
        this.countdownInterval = null;
        this.dangerCheckInterval = null;
        this.resourceCollectionInterval = null;
        this.planets = [];
        this.inventory = [];
        this.currentPlanet = null;
        this.expeditionResources = [];
        this.fortuneWheelRewards = [];
        this.spins = 0;
        this.expeditionCompleteNotified = false;
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Remove init call from constructor to avoid race conditions
        // The init method will be called explicitly from main.js
    }

    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Tab navigation
        document.querySelectorAll('[data-tab]').forEach(tabBtn => {
            tabBtn.addEventListener('click', () => {
                const tabId = tabBtn.getAttribute('data-tab');
                // Extract the tab name from the tab ID (remove '-tab' suffix)
                const tabName = tabId.replace('-tab', '');
                this.showTab(tabName);
            });
        });
        
        // Start expedition button
        const startExpeditionBtn = document.getElementById('start-expedition-btn');
        if (startExpeditionBtn) {
            startExpeditionBtn.addEventListener('click', () => {
                const planetId = startExpeditionBtn.getAttribute('data-planet-id');
                if (planetId) {
                    expedition.startExpedition(planetId);
                } else {
                    this.showError('No planet selected for expedition');
                }
            });
        }
        
        // Close modal buttons
        document.querySelectorAll('.close-modal').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                const modal = closeBtn.closest('.modal');
                if (modal) {
                    this.hideModal(modal);
                }
            });
        });
        
        // Shop item buttons
        document.querySelectorAll('.shop-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.getAttribute('data-item-id');
                if (itemId) {
                    this.showPurchaseConfirmation(itemId);
                }
            });
        });
        
        // Upgrade buttons
        document.querySelectorAll('.upgrade-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const upgradeType = btn.getAttribute('data-upgrade-type');
                if (upgradeType) {
                    this.showUpgradeConfirmation(upgradeType);
                }
            });
        });
        
        // Settings form
        const settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }
        
        // Notification settings
        const notificationToggle = document.getElementById('notification-toggle');
        if (notificationToggle) {
            notificationToggle.addEventListener('change', () => {
                this.toggleNotifications(notificationToggle.checked);
            });
        }
        
        // Sound settings
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('change', () => {
                this.toggleSound(soundToggle.checked);
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.showLogoutConfirmation();
            });
        }
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape key to close modals
            if (e.key === 'Escape') {
                const visibleModals = document.querySelectorAll('.modal:not(.hidden)');
                if (visibleModals.length > 0) {
                    visibleModals.forEach(modal => this.hideModal(modal));
                }
            }
            
            // Tab navigation shortcuts (1-5)
            if (e.key >= '1' && e.key <= '5' && e.altKey) {
                const tabIndex = parseInt(e.key) - 1;
                const tabNames = ['home', 'expedition', 'shop', 'profile', 'settings'];
                if (tabIndex >= 0 && tabIndex < tabNames.length) {
                    this.showTab(tabNames[tabIndex]);
                }
            }
        });
        
        // Window resize event
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Handle back button
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.tab) {
                this.showTab(e.state.tab, false);
            }
        });
        
        console.log('Event listeners initialized');
    }

    /**
     * Initialize the game
     */
    async init() {
        try {
            console.log('Initializing UI...');
            
            // Check if user is already authenticated
            if (api.hasToken()) {
                console.log('User already authenticated, loading user data...');
                try {
                    // Load user data
                    await this.loadUserData();
                    console.log('User data loaded successfully');
                } catch (error) {
                    console.error('Error loading user data:', error);
                    this.showError('Failed to load user data: ' + error.message);
                    
                    // If we get an authentication error, clear the token
                    if (error.message.includes('Authentication failed') || 
                        error.message.includes('401') || 
                        error.message.includes('unauthorized')) {
                        console.log('Authentication error detected, clearing token');
                        api.clearToken();
                    }
                }
            } else {
                console.log('User not authenticated, checking for Telegram WebApp');
                // Check for Telegram WebApp authentication
                if (window.Telegram && window.Telegram.WebApp) {
                    // Telegram WebApp authentication will be handled in main.js
                    console.log('Telegram WebApp detected, authentication will be handled in main.js');
                } else {
                    console.log('No authentication method detected');
                    // Web browser authentication will be handled in main.js
                }
            }
            
            // Load planets
            try {
                await this.loadPlanets();
                console.log('Planets loaded successfully');
            } catch (error) {
                console.error('Error loading planets:', error);
                this.showError('Failed to load planets: ' + error.message);
            }
            
            // Initialize fortune wheel
            try {
                this.initFortuneWheel();
                console.log('Fortune wheel initialized successfully');
            } catch (error) {
                console.error('Error initializing fortune wheel:', error);
                // Non-critical error, just log it
            }
            
            // Show home tab
            this.showTab('home');
            
            console.log('UI initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing UI:', error);
            this.showError('Failed to initialize UI: ' + error.message);
            return false;
        }
    }

    /**
     * Show a specific tab
     * @param {string} tabName - Tab name to show
     */
    showTab(tabName) {
        // Hide all tabs
        Object.values(this.tabs).forEach(tab => {
            if (tab) tab.classList.add('hidden');
        });
        
        // Show selected tab
        if (this.tabs[tabName]) {
            this.tabs[tabName].classList.remove('hidden');
            this.currentTab = tabName;
            
            // Update tab-specific content
            switch (tabName) {
                case 'expedition':
                    this.loadPlanets();
                    break;
                case 'inventory':
                    this.loadInventory();
                    break;
                case 'shop':
                    this.loadShopItems('spaceship');
                    break;
                case 'ranking':
                    this.loadLeaderboard('month');
                    break;
                case 'profile':
                    this.loadProfile();
                    break;
                case 'fortuneWheel':
                    this.loadFortuneWheelRewards();
                    break;
            }
        }
        
        // Update navigation buttons
        this.navButtons.forEach(button => {
            const buttonTabId = button.getAttribute('data-tab');
            const buttonTabName = buttonTabId.replace('-tab', '');
            if (buttonTabName === tabName) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        this.loadingScreen.classList.remove('hidden');
        this.updateLoadingFact();
        
        // Animate progress bar
        this.progressBar.style.width = '0%';
        setTimeout(() => {
            this.progressBar.style.width = '100%';
        }, 100);
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        console.log('Hiding loading screen');
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('hidden');
        } else {
            console.error('Loading screen element not found');
        }
    }

    /**
     * Update loading fact with random space fact
     */
    updateLoadingFact() {
        const facts = [
            "The universe is estimated to be 13.8 billion years old.",
            "There are more stars in the universe than grains of sand on Earth.",
            "Some asteroids contain precious metals worth trillions of dollars.",
            "The largest known diamond in the universe is a star called Lucy.",
            "Space mining could become a trillion-dollar industry by 2040.",
            "The first space mining mission is planned for the 2020s.",
            "Some planets experience diamond rain due to high pressure.",
            "The most valuable asteroids contain platinum group metals.",
            "The Moon contains large deposits of Helium-3, a potential fuel source.",
            "Mars has vast iron oxide deposits, giving it its red color."
        ];
        
        this.loadingFact.textContent = facts[Math.floor(Math.random() * facts.length)];
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        console.error(message);
        
        // Show error toast
        this.showToast(message, 'error');
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        console.log(message);
        
        // Show success toast
        this.showToast(message, 'success');
    }

    /**
     * Show warning message
     * @param {string} message - Warning message
     */
    showWarning(message) {
        console.warn(message);
        
        // Show warning toast
        this.showToast(message, 'warning', 5000);
    }

    /**
     * Show info message
     * @param {string} message - Info message
     */
    showInfo(message) {
        console.log(message);
        
        // Show info toast
        this.showToast(message, 'info');
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (info, success, error, warning)
     * @param {number} duration - Duration in milliseconds
     */
    showToast(message, type = 'info', duration = 3000) {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
            
            // Add CSS for toast container if not already in stylesheet
            const style = document.createElement('style');
            style.textContent = `
                .toast-container {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 10px;
                }
                .toast {
                    padding: 12px 16px;
                    border-radius: 8px;
                    color: white;
                    font-size: 14px;
                    max-width: 300px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    animation: toast-in 0.3s ease-out, toast-out 0.3s ease-in forwards;
                    animation-delay: 0s, calc(var(--duration) - 300ms);
                    opacity: 0;
                    transform: translateY(20px);
                }
                .toast.info {
                    background-color: #3498db;
                }
                .toast.success {
                    background-color: #2ecc71;
                }
                .toast.error {
                    background-color: #e74c3c;
                }
                .toast.warning {
                    background-color: #f39c12;
                }
                @keyframes toast-in {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes toast-out {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.style.setProperty('--duration', `${duration}ms`);
        
        // Add toast to container
        toastContainer.appendChild(toast);
        
        // Remove toast after duration
        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);
    }

    /**
     * Load user data
     */
    async loadUserData() {
        try {
            console.log('Loading user data...');
            const profile = await api.getProfile();
            console.log('Profile data received:', profile);
            
            if (!profile) {
                console.error('Empty profile data received');
                throw new Error('Failed to load profile data');
            }
            
            // Update currency display
            if (profile.currency !== undefined) {
                this.regularCurrencyEl.textContent = profile.currency;
            } else {
                console.warn('Currency data missing from profile');
            }
            
            if (profile.premium_currency !== undefined) {
                this.premiumCurrencyEl.textContent = profile.premium_currency;
            } else {
                console.warn('Premium currency data missing from profile');
            }
            
            // Update spaceship stats
            if (profile.return_speed !== undefined) {
                this.returnSpeedEl.textContent = `${profile.return_speed}x`;
            }
            
            if (profile.storage_capacity !== undefined) {
                this.storageCapacityEl.textContent = `${profile.storage_capacity} units`;
            }
            
            if (profile.suit_autonomy !== undefined) {
                this.suitAutonomyEl.textContent = profile.suit_autonomy > 1 ? 
                    `+${Math.round((profile.suit_autonomy - 1) * 100)}%` : 'Standard';
            }
            
            if (profile.drone_collection !== undefined) {
                this.droneStatusEl.textContent = profile.drone_collection > 0 ? 
                    `Active (+${Math.round(profile.drone_collection * 100)}%)` : 'Not Active';
            }
            
            // Check for active expedition
            if (profile.active_expedition) {
                console.log('Active expedition found:', profile.active_expedition);
                this.currentExpedition = profile.active_expedition;
                this.startCountdown();
                this.showActiveExpedition();
            } else {
                console.log('No active expedition found');
            }
            
            // Update profile tab
            if (profile.username) {
                this.profileUsername.textContent = profile.username;
            }
            
            // Update stats if available
            if (profile.stats) {
                if (this.totalExpeditions && profile.stats.total_expeditions !== undefined) {
                    this.totalExpeditions.textContent = profile.stats.total_expeditions;
                }
                
                if (this.successfulReturns && profile.stats.successful_returns !== undefined) {
                    this.successfulReturns.textContent = profile.stats.successful_returns;
                }
                
                if (this.totalResources && profile.stats.total_resources !== undefined) {
                    this.totalResources.textContent = profile.stats.total_resources;
                }
            } else {
                console.warn('Stats data missing from profile');
            }
            
            // Update fortune wheel spins
            this.spins = profile.spins || 0;
            if (this.spinsRemaining) {
                this.spinsRemaining.textContent = this.spins;
            }
            
            console.log('User data loaded successfully');
            return profile;
        } catch (error) {
            console.error('Error loading user data:', error);
            // Don't show error to user here, let the caller handle it
            throw error;
        }
    }

    /**
     * Initialize fortune wheel
     */
    async initFortuneWheel() {
        if (!this.fortuneWheelCanvas) return;
        
        // Set canvas dimensions first
        this.fortuneWheelCanvas.width = 300;
        this.fortuneWheelCanvas.height = 300;
        
        // Then get the context and set other properties
        this.wheelCtx = this.fortuneWheelCanvas.getContext('2d');
        this.wheelRadius = this.fortuneWheelCanvas.width / 2;
        this.wheelCenterX = this.wheelRadius;
        this.wheelCenterY = this.wheelRadius;
        this.wheelSegments = CONFIG.FORTUNE_WHEEL.SEGMENTS;
        this.isSpinning = false;
        
        try {
            // Load fortune wheel rewards from API
            const response = await api.getFortuneWheelRewards();
            if (response && response.rewards) {
                this.fortuneWheelRewards = response.rewards;
                this.spins = response.spins || 0;
                
                if (this.spinsRemaining) {
                    this.spinsRemaining.textContent = this.spins;
                }
            }
            
            // Draw initial wheel
            this.drawWheel();
            
            // Add event listener to spin button
            if (this.spinBtn) {
                this.spinBtn.addEventListener('click', () => this.spinWheel());
            }
            
            // Add event listener to buy spins button
            if (this.buySpinsBtn) {
                this.buySpinsBtn.addEventListener('click', () => this.showBuySpinsModal());
            }
        } catch (error) {
            console.error('Error initializing fortune wheel:', error);
        }
    }
    
    /**
     * Draw the fortune wheel
     */
    drawWheel() {
        if (!this.wheelCtx || !this.fortuneWheelRewards || this.fortuneWheelRewards.length === 0) return;
        
        const ctx = this.wheelCtx;
        const radius = this.wheelRadius;
        const centerX = this.wheelCenterX;
        const centerY = this.wheelCenterY;
        const segmentCount = this.fortuneWheelRewards.length;
        const segmentAngle = (2 * Math.PI) / segmentCount;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.fortuneWheelCanvas.width, this.fortuneWheelCanvas.height);
        
        // Draw wheel segments
        for (let i = 0; i < segmentCount; i++) {
            const startAngle = i * segmentAngle;
            const endAngle = (i + 1) * segmentAngle;
            
            // Get reward rarity for color
            const reward = this.fortuneWheelRewards[i];
            let segmentColor = '#4a6fa5';
            
            if (reward && reward.rarity) {
                switch (reward.rarity) {
                    case CONFIG.GAME.RARITY.COMMON:
                        segmentColor = i % 2 === 0 ? '#4a6fa5' : '#2c3e50';
                        break;
                    case CONFIG.GAME.RARITY.UNCOMMON:
                        segmentColor = i % 2 === 0 ? '#27ae60' : '#1e8449';
                        break;
                    case CONFIG.GAME.RARITY.RARE:
                        segmentColor = i % 2 === 0 ? '#3498db' : '#2980b9';
                        break;
                    case CONFIG.GAME.RARITY.EPIC:
                        segmentColor = i % 2 === 0 ? '#9b59b6' : '#8e44ad';
                        break;
                    case CONFIG.GAME.RARITY.LEGENDARY:
                        segmentColor = i % 2 === 0 ? '#f39c12' : '#d35400';
                        break;
                    default:
                        segmentColor = i % 2 === 0 ? '#4a6fa5' : '#2c3e50';
                }
            } else {
                segmentColor = i % 2 === 0 ? '#4a6fa5' : '#2c3e50';
            }
            
            // Draw segment
            ctx.fillStyle = segmentColor;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fill();
            
            // Draw segment border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.stroke();
            
            // Draw reward text if available
            if (reward) {
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(startAngle + segmentAngle / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Arial';
                
                // Truncate long names
                let displayName = reward.name;
                if (displayName.length > 10) {
                    displayName = displayName.substring(0, 8) + '...';
                }
                
                ctx.fillText(displayName, radius - 20, 5);
                ctx.restore();
            }
        }
        
        // Draw center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
        ctx.fillStyle = '#e74c3c';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw pointer
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius - 10);
        ctx.lineTo(centerX - 10, centerY - radius + 10);
        ctx.lineTo(centerX + 10, centerY - radius + 10);
        ctx.closePath();
        ctx.fillStyle = '#e74c3c';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    /**
     * Spin the fortune wheel
     */
    async spinWheel() {
        if (this.isSpinning || this.spins <= 0) return;
        
        try {
            this.isSpinning = true;
            
            // Disable spin button
            if (this.spinBtn) {
                this.spinBtn.disabled = true;
            }
            
            // Get spin result from server
            const result = await api.spinFortuneWheel();
            
            // Animation variables
            const spinDuration = CONFIG.FORTUNE_WHEEL.SPIN_DURATION;
            const startTime = Date.now();
            const startAngle = 0;
            const spinAngle = 1440 + (result.segment_index * (360 / this.fortuneWheelRewards.length)); // Multiple full rotations + landing segment
            
            // Animation function
            const animate = () => {
                const elapsedTime = Date.now() - startTime;
                const progress = Math.min(elapsedTime / spinDuration, 1);
                
                // Easing function for slowing down
                const easeOut = (t) => 1 - Math.pow(1 - t, 3);
                const easedProgress = easeOut(progress);
                
                // Calculate current angle
                const currentAngle = startAngle + (spinAngle * easedProgress);
                
                // Rotate wheel
                this.wheelCtx.clearRect(0, 0, this.fortuneWheelCanvas.width, this.fortuneWheelCanvas.height);
                this.wheelCtx.save();
                this.wheelCtx.translate(this.wheelCenterX, this.wheelCenterY);
                this.wheelCtx.rotate(currentAngle * Math.PI / 180);
                this.wheelCtx.translate(-this.wheelCenterX, -this.wheelCenterY);
                this.drawWheel();
                this.wheelCtx.restore();
                
                // Continue animation or finish
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.isSpinning = false;
                    
                    // Update spins count
                    this.spins--;
                    if (this.spinsRemaining) {
                        this.spinsRemaining.textContent = this.spins;
                    }
                    
                    // Enable spin button
                    if (this.spinBtn) {
                        this.spinBtn.disabled = false;
                    }
                    
                    // Show reward
                    this.showRewardModal(result.reward);
                }
            };
            
            // Start animation
            animate();
        } catch (error) {
            console.error('Error spinning wheel:', error);
            this.showError('Failed to spin the wheel');
            this.isSpinning = false;
            
            // Enable spin button
            if (this.spinBtn) {
                this.spinBtn.disabled = false;
            }
        }
    }
    
    /**
     * Show reward modal
     * @param {object} reward - Reward object
     */
    showRewardModal(reward) {
        const rewardTitle = document.getElementById('reward-title');
        const rewardDescription = document.getElementById('reward-description');
        const rewardImage = document.getElementById('reward-image');
        
        if (rewardTitle) rewardTitle.textContent = reward.name;
        if (rewardDescription) rewardDescription.textContent = reward.description;
        if (rewardImage) rewardImage.src = reward.image_url || 'assets/items/default-reward.png';
        
        this.showModal(this.rewardModal);
    }
    
    /**
     * Show buy spins modal
     */
    showBuySpinsModal() {
        const buySpinsModal = document.getElementById('buy-spins-modal');
        if (!buySpinsModal) return;
        
        // Set up package buttons
        const singleSpinBtn = document.getElementById('single-spin-btn');
        const pack5SpinsBtn = document.getElementById('pack5-spins-btn');
        const pack10SpinsBtn = document.getElementById('pack10-spins-btn');
        
        if (singleSpinBtn) {
            singleSpinBtn.onclick = () => this.purchaseSpins('single');
        }
        
        if (pack5SpinsBtn) {
            pack5SpinsBtn.onclick = () => this.purchaseSpins('pack5');
        }
        
        if (pack10SpinsBtn) {
            pack10SpinsBtn.onclick = () => this.purchaseSpins('pack10');
        }
        
        this.showModal(buySpinsModal);
    }
    
    /**
     * Purchase spins
     * @param {string} packageId - Package ID (single, pack5, pack10)
     */
    async purchaseSpins(packageId) {
        try {
            this.showLoadingScreen();
            
            const result = await api.purchaseSpins(packageId);
            
            // Update spins count
            this.spins = result.premium_currency / 10; // Assuming 10 premium currency per spin
            
            if (this.spinsRemaining) {
                this.spinsRemaining.textContent = this.spins;
            }
            
            // Update premium currency display
            if (this.premiumCurrencyEl) {
                this.premiumCurrencyEl.textContent = result.premium_currency;
            }
            
            this.hideLoadingScreen();
            this.hideModal(document.getElementById('buy-spins-modal'));
            this.showSuccess(`Successfully purchased ${packageId === 'single' ? '1 spin' : packageId === 'pack5' ? '5 spins' : '10 spins'}`);
        } catch (error) {
            this.hideLoadingScreen();
            console.error('Error purchasing spins:', error);
            this.showError('Failed to purchase spins');
        }
    }

    /**
     * Load inventory items (delegates to inventory module)
     */
    loadInventory() {
        if (inventory && typeof inventory.loadInventory === 'function') {
            inventory.loadInventory();
        } else {
            console.error('Inventory module not initialized or loadInventory method not found');
            this.showError('Failed to load inventory');
        }
    }

    /**
     * Load shop items (delegates to shop module)
     * @param {string} category - Shop category to load
     */
    loadShopItems(category) {
        if (shop && typeof shop.loadShopItems === 'function') {
            shop.loadShopItems(category);
        } else {
            console.error('Shop module not initialized or loadShopItems method not found');
            this.showError('Failed to load shop items');
        }
    }

    /**
     * Load leaderboard (delegates to ranking module)
     * @param {string} period - Leaderboard period to load
     */
    loadLeaderboard(period) {
        if (ranking && typeof ranking.loadLeaderboard === 'function') {
            ranking.loadLeaderboard(period);
        } else {
            console.error('Ranking module not initialized or loadLeaderboard method not found');
            this.showError('Failed to load leaderboard');
        }
    }

    /**
     * Load profile (delegates to profile module)
     */
    loadProfile() {
        if (profile && typeof profile.loadProfile === 'function') {
            profile.loadProfile();
        } else {
            console.error('Profile module not initialized or loadProfile method not found');
            this.showError('Failed to load profile');
        }
    }

    /**
     * Load fortune wheel rewards (delegates to fortune-wheel module)
     */
    loadFortuneWheelRewards() {
        if (fortuneWheel && typeof fortuneWheel.loadFortuneWheelRewards === 'function') {
            fortuneWheel.loadFortuneWheelRewards();
        } else {
            console.error('Fortune wheel module not initialized or loadFortuneWheelRewards method not found');
            this.showError('Failed to load fortune wheel rewards');
        }
    }

    /**
     * Show a modal
     * @param {HTMLElement} modal - Modal element to show
     */
    showModal(modal) {
        if (!modal) {
            console.error('Modal element not found');
            return;
        }
        
        // Get or create modal overlay
        let modalOverlay = document.getElementById('modal-overlay');
        if (!modalOverlay) {
            modalOverlay = document.createElement('div');
            modalOverlay.id = 'modal-overlay';
            modalOverlay.className = 'modal-overlay';
            document.body.appendChild(modalOverlay);
            
            // Add click event to close modals when clicking outside
            modalOverlay.addEventListener('click', (event) => {
                if (event.target === modalOverlay) {
                    const visibleModals = document.querySelectorAll('.modal:not(.hidden)');
                    visibleModals.forEach(modal => this.hideModal(modal));
                }
            });
        }
        
        // Show overlay
        modalOverlay.classList.remove('hidden');
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Add animation class if not present
        if (!modal.classList.contains('fade-in') && 
            !modal.classList.contains('slide-in') && 
            !modal.classList.contains('zoom-in')) {
            modal.classList.add('fade-in');
        }
        
        // Prevent body scrolling
        document.body.classList.add('modal-open');
        
        // Log modal shown
        console.log(`Modal shown: ${modal.id}`);
        
        // Focus first input or button if present
        setTimeout(() => {
            const firstInput = modal.querySelector('input, button');
            if (firstInput) firstInput.focus();
        }, 100);
    }
    
    /**
     * Hide a modal
     * @param {HTMLElement} modal - Modal element to hide
     */
    hideModal(modal) {
        if (!modal) {
            console.error('Modal element not found');
            return;
        }
        
        // Add exit animation class
        modal.classList.add('fade-out');
        
        // Hide modal after animation completes
        setTimeout(() => {
            modal.classList.remove('fade-in', 'slide-in', 'zoom-in', 'fade-out');
            modal.classList.add('hidden');
            
            // Check if any other modals are visible
            const visibleModals = document.querySelectorAll('.modal:not(.hidden)');
            if (visibleModals.length === 0) {
                // Hide overlay if no other modals are visible
                const modalOverlay = document.getElementById('modal-overlay');
                if (modalOverlay) {
                    modalOverlay.classList.add('hidden');
                }
                
                // Allow body scrolling again
                document.body.classList.remove('modal-open');
            }
            
            // Log modal hidden
            console.log(`Modal hidden: ${modal.id}`);
        }, 300); // Match this with CSS animation duration
    }

    /**
     * Show planet details
     * @param {number} planetId - Planet ID
     */
    async showPlanetDetails(planetId) {
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Get planet details from API
            const response = await api.getPlanetDetails(planetId);
            
            if (!response || !response.planet) {
                throw new Error('Invalid planet data received');
            }
            
            const planet = response.planet;
            this.currentPlanet = planet;
            
            // Update modal content
            const planetDetailsModal = document.getElementById('planet-details-modal');
            if (!planetDetailsModal) {
                throw new Error('Planet details modal not found');
            }
            
            const planetName = planetDetailsModal.querySelector('.planet-name');
            const planetDescription = planetDetailsModal.querySelector('.planet-description');
            const planetImage = planetDetailsModal.querySelector('.planet-image img');
            const difficultyValue = planetDetailsModal.querySelector('.difficulty-value');
            const dangerValue = planetDetailsModal.querySelector('.danger-value');
            const timeValue = planetDetailsModal.querySelector('.time-value');
            const resourcesValue = planetDetailsModal.querySelector('.resources-value');
            const resourcesList = planetDetailsModal.querySelector('.resources-list');
            const startExpeditionBtn = planetDetailsModal.querySelector('#start-expedition-btn');
            
            if (planetName) planetName.textContent = planet.name;
            if (planetDescription) planetDescription.textContent = planet.description;
            if (planetImage) planetImage.src = planet.image_url || 'assets/planets/default-planet.png';
            
            // Set difficulty stars
            if (difficultyValue) {
                let difficultyStars = '';
                for (let i = 0; i < 5; i++) {
                    if (i < planet.difficulty) {
                        difficultyStars += '<i class="fas fa-star"></i>';
                    } else {
                        difficultyStars += '<i class="far fa-star"></i>';
                    }
                }
                difficultyValue.innerHTML = difficultyStars;
            }
            
            // Set danger level indicator
            if (dangerValue) {
                let dangerLevel = '';
                for (let i = 0; i < 5; i++) {
                    if (i < planet.danger_level) {
                        dangerLevel += '<i class="fas fa-exclamation-triangle danger-icon"></i>';
                    } else {
                        dangerLevel += '<i class="far fa-exclamation-triangle"></i>';
                    }
                }
                dangerValue.innerHTML = dangerLevel;
            }
            
            // Set time value
            if (timeValue) {
                const minutes = Math.floor(planet.base_time / 60);
                const seconds = planet.base_time % 60;
                timeValue.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            // Set resources multiplier
            if (resourcesValue) {
                resourcesValue.textContent = `${planet.resource_multiplier}x`;
            }
            
            // Set resources list
            if (resourcesList && planet.resources && Array.isArray(planet.resources)) {
                resourcesList.innerHTML = '';
                
                planet.resources.forEach(resource => {
                    const resourceItem = document.createElement('div');
                    resourceItem.className = 'resource-item';
                    
                    // Set rarity class
                    let rarityClass = '';
                    switch (resource.rarity) {
                        case 1:
                            rarityClass = 'common';
                            break;
                        case 2:
                            rarityClass = 'uncommon';
                            break;
                        case 3:
                            rarityClass = 'rare';
                            break;
                        case 4:
                            rarityClass = 'epic';
                            break;
                        case 5:
                            rarityClass = 'legendary';
                            break;
                        default:
                            rarityClass = 'common';
                    }
                    
                    resourceItem.innerHTML = `
                        <div class="resource-icon ${rarityClass}">
                            <img src="${resource.image_url || 'assets/resources/default.png'}" alt="${resource.name}">
                        </div>
                        <div class="resource-info">
                            <div class="resource-name">${resource.name}</div>
                            <div class="resource-rarity ${rarityClass}">${this.getRarityText(resource.rarity)}</div>
                        </div>
                        <div class="resource-chance">${Math.round(resource.spawn_rate * 100)}%</div>
                    `;
                    
                    resourcesList.appendChild(resourceItem);
                });
                
                // If no resources found
                if (planet.resources.length === 0) {
                    resourcesList.innerHTML = '<div class="empty-state">No resources available on this planet</div>';
                }
            }
            
            // Set start expedition button
            if (startExpeditionBtn) {
                startExpeditionBtn.setAttribute('data-planet-id', planet.id);
            }
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            // Show modal
            this.showModal(planetDetailsModal);
        } catch (error) {
            console.error('Error showing planet details:', error);
            this.showError('Failed to load planet details');
            this.hideLoadingScreen();
        }
    }
    
    /**
     * Get rarity text from rarity level
     * @param {number} rarity - Rarity level (1-5)
     * @returns {string} - Rarity text
     */
    getRarityText(rarity) {
        switch (rarity) {
            case 1:
                return 'Common';
            case 2:
                return 'Uncommon';
            case 3:
                return 'Rare';
            case 4:
                return 'Epic';
            case 5:
                return 'Legendary';
            default:
                return 'Unknown';
        }
    }

    /**
     * Load planets data
     */
    async loadPlanets() {
        try {
            console.log('Loading planets data...');
            const response = await api.getPlanets();
            
            if (!response || !response.planets) {
                console.error('Invalid planets data received:', response);
                throw new Error('Failed to load planets data');
            }
            
            this.planets = response.planets;
            console.log(`Loaded ${this.planets.length} planets`);
            
            // Update planets list UI if we're on the expedition tab
            if (this.currentTab === 'expedition' && this.planetsList) {
                // Clear existing planets
                this.planetsList.innerHTML = '';
                
                // Add planets to the list
                this.planets.forEach(planet => {
                    const planetCard = document.createElement('div');
                    planetCard.className = 'planet-card';
                    planetCard.setAttribute('data-planet-id', planet.id);
                    
                    // Set rarity class
                    planetCard.classList.add(`rarity-${planet.rarity}`);
                    
                    planetCard.innerHTML = `
                        <div class="planet-image">
                            <img src="img/planets/${planet.image || 'default.png'}" alt="${planet.name}">
                        </div>
                        <div class="planet-info">
                            <h3>${planet.name}</h3>
                            <p class="planet-rarity">${this.getRarityText(planet.rarity)}</p>
                            <p class="planet-distance">${planet.distance} light years</p>
                            <p class="planet-description">${planet.description || 'No description available'}</p>
                        </div>
                        <div class="planet-actions">
                            <button class="action-button view-planet-btn" data-planet-id="${planet.id}">View Details</button>
                            <button class="action-button start-expedition-btn" data-planet-id="${planet.id}">Start Expedition</button>
                        </div>
                    `;
                    
                    this.planetsList.appendChild(planetCard);
                    
                    // Add event listeners
                    const viewPlanetBtn = planetCard.querySelector('.view-planet-btn');
                    if (viewPlanetBtn) {
                        viewPlanetBtn.addEventListener('click', () => {
                            this.showPlanetDetails(planet.id);
                        });
                    }
                    
                    const startExpeditionBtn = planetCard.querySelector('.start-expedition-btn');
                    if (startExpeditionBtn) {
                        startExpeditionBtn.addEventListener('click', () => {
                            expedition.startExpedition(planet.id);
                        });
                    }
                });
            }
            
            return this.planets;
        } catch (error) {
            console.error('Error loading planets:', error);
            // Don't show error to user here, let the caller handle it
            throw error;
        }
    }

    /**
     * Start countdown timer for active expedition
     */
    startCountdown() {
        if (!this.currentExpedition) return;
        
        // Clear existing interval if any
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        // Get time remaining element
        const expeditionTab = this.tabs['expedition'];
        const timeRemainingEl = expeditionTab?.querySelector('.active-expedition .time-remaining');
        const progressBarEl = expeditionTab?.querySelector('.active-expedition .progress-bar');
        
        if (!timeRemainingEl) return;
        
        // Update countdown immediately
        this.updateCountdown(timeRemainingEl, progressBarEl);
        
        // Set interval to update countdown every second
        this.countdownInterval = setInterval(() => {
            this.updateCountdown(timeRemainingEl, progressBarEl);
        }, 1000);
    }
    
    /**
     * Update countdown display
     * @param {HTMLElement} timeRemainingEl - Time remaining element
     * @param {HTMLElement} progressBarEl - Progress bar element
     */
    updateCountdown(timeRemainingEl, progressBarEl) {
        if (!this.currentExpedition || !timeRemainingEl) return;
        
        // Calculate time remaining
        const now = Math.floor(Date.now() / 1000);
        const endTime = this.currentExpedition.start_time + this.currentExpedition.total_time;
        const timeRemaining = Math.max(0, endTime - now);
        
        // Update progress bar if available
        if (progressBarEl) {
            const totalTime = this.currentExpedition.total_time;
            const elapsedTime = Math.max(0, Math.min(totalTime, now - this.currentExpedition.start_time));
            const progress = (elapsedTime / totalTime) * 100;
            progressBarEl.style.width = `${progress}%`;
        }
        
        // Check if expedition is complete
        if (timeRemaining <= 0) {
            // Clear interval
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
            
            // Update display
            timeRemainingEl.textContent = 'Complete!';
            timeRemainingEl.classList.add('complete');
            
            // Show completion notification if not already shown
            if (!this.expeditionCompleteNotified) {
                this.expeditionCompleteNotified = true;
                this.showExpeditionComplete();
            }
            
            return;
        }
        
        // Format time remaining
        const hours = Math.floor(timeRemaining / 3600);
        const minutes = Math.floor((timeRemaining % 3600) / 60);
        const seconds = timeRemaining % 60;
        
        // Update display
        if (hours > 0) {
            timeRemainingEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
        } else {
            timeRemainingEl.textContent = `${minutes}m ${seconds}s`;
        }
    }
    
    /**
     * Show expedition complete notification
     */
    showExpeditionComplete() {
        // Show toast notification
        this.showSuccess('Expedition complete! Your astronaut has returned safely.');
        
        // Show expedition complete modal
        const expeditionCompleteModal = document.getElementById('expedition-complete-modal');
        if (!expeditionCompleteModal) return;
        
        // Update modal content with expedition results
        const planetNameEl = expeditionCompleteModal.querySelector('.planet-name');
        const resourcesCollectedEl = expeditionCompleteModal.querySelector('.resources-collected');
        const resourcesListEl = expeditionCompleteModal.querySelector('.resources-list');
        const claimRewardsBtn = expeditionCompleteModal.querySelector('#claim-rewards-btn');
        
        if (planetNameEl) planetNameEl.textContent = this.currentExpedition.planet_name;
        if (resourcesCollectedEl) resourcesCollectedEl.textContent = this.currentExpedition.resources_collected || 0;
        
        // Set up resources list
        if (resourcesListEl && this.currentExpedition.resources) {
            resourcesListEl.innerHTML = '';
            
            this.currentExpedition.resources.forEach(resource => {
                const resourceItem = document.createElement('div');
                resourceItem.className = 'resource-item';
                
                // Set rarity class
                let rarityClass = '';
                switch (resource.rarity) {
                    case 1:
                        rarityClass = 'common';
                        break;
                    case 2:
                        rarityClass = 'uncommon';
                        break;
                    case 3:
                        rarityClass = 'rare';
                        break;
                    case 4:
                        rarityClass = 'epic';
                        break;
                    case 5:
                        rarityClass = 'legendary';
                        break;
                    default:
                        rarityClass = 'common';
                }
                
                resourceItem.innerHTML = `
                    <div class="resource-icon ${rarityClass}">
                        <img src="${resource.image_url || 'assets/resources/default.png'}" alt="${resource.name}">
                    </div>
                    <div class="resource-info">
                        <div class="resource-name">${resource.name}</div>
                        <div class="resource-rarity ${rarityClass}">${this.getRarityText(resource.rarity)}</div>
                    </div>
                    <div class="resource-quantity">${resource.quantity}</div>
                `;
                
                resourcesListEl.appendChild(resourceItem);
            });
            
            // If no resources found
            if (this.currentExpedition.resources.length === 0) {
                resourcesListEl.innerHTML = '<div class="empty-state">No resources collected</div>';
            }
        }
        
        // Set up claim rewards button
        if (claimRewardsBtn) {
            claimRewardsBtn.onclick = () => this.claimExpeditionRewards();
        }
        
        this.showModal(expeditionCompleteModal);
    }
    
    /**
     * Claim expedition rewards
     */
    async claimExpeditionRewards() {
        try {
            this.showLoadingScreen();
            
            const result = await expedition.claimRewards();
            
            // Reset current expedition
            this.currentExpedition = null;
            this.expeditionCompleteNotified = false;
            
            // Hide active expedition and show expedition content
            const expeditionTab = this.tabs['expedition'];
            const expeditionContent = expeditionTab.querySelector('.expedition-content');
            const activeExpeditionEl = expeditionTab.querySelector('.active-expedition');
            
            if (expeditionContent && activeExpeditionEl) {
                expeditionContent.classList.remove('hidden');
                activeExpeditionEl.classList.add('hidden');
            }
            
            this.hideLoadingScreen();
            this.hideModal(document.getElementById('expedition-complete-modal'));
            this.showSuccess('Rewards claimed successfully!');
            
            // Reload user data to update resources
            await this.loadUserData();
        } catch (error) {
            console.error('Error claiming rewards:', error);
            this.hideLoadingScreen();
            this.showError('Failed to claim rewards');
        }
    }

    /**
     * Show active expedition
     */
    showActiveExpedition() {
        if (!this.currentExpedition) return;
        
        // Get expedition elements
        const expeditionTab = this.tabs['expedition'];
        const expeditionContent = expeditionTab.querySelector('.expedition-content');
        const activeExpeditionEl = expeditionTab.querySelector('.active-expedition');
        
        if (!expeditionContent || !activeExpeditionEl) return;
        
        // Hide expedition content and show active expedition
        expeditionContent.classList.add('hidden');
        activeExpeditionEl.classList.remove('hidden');
        
        // Update expedition info
        const planetNameEl = activeExpeditionEl.querySelector('.planet-name');
        const timeRemainingEl = activeExpeditionEl.querySelector('.time-remaining');
        const progressBarEl = activeExpeditionEl.querySelector('.progress-bar');
        const resourcesCollectedEl = activeExpeditionEl.querySelector('.resources-collected');
        const resourcesListEl = activeExpeditionEl.querySelector('.resources-list');
        const abortExpeditionBtn = activeExpeditionEl.querySelector('#abort-expedition-btn');
        const returnEarlyBtn = activeExpeditionEl.querySelector('#return-early-btn');
        
        if (planetNameEl) planetNameEl.textContent = this.currentExpedition.planet_name;
        
        // Set up countdown
        if (timeRemainingEl) {
            this.updateCountdown(timeRemainingEl, progressBarEl);
        }
        
        // Set up progress bar
        if (progressBarEl) {
            const totalTime = this.currentExpedition.total_time;
            const elapsedTime = Math.max(0, Math.min(totalTime, Date.now() / 1000 - this.currentExpedition.start_time));
            const progress = (elapsedTime / totalTime) * 100;
            progressBarEl.style.width = `${progress}%`;
        }
        
        // Set up resources collected
        if (resourcesCollectedEl) {
            resourcesCollectedEl.textContent = this.currentExpedition.resources_collected || 0;
        }
        
        // Set up resources list
        if (resourcesListEl && this.currentExpedition.resources) {
            resourcesListEl.innerHTML = '';
            
            this.currentExpedition.resources.forEach(resource => {
                const resourceItem = document.createElement('div');
                resourceItem.className = 'resource-item';
                
                // Set rarity class
                let rarityClass = '';
                switch (resource.rarity) {
                    case 1:
                        rarityClass = 'common';
                        break;
                    case 2:
                        rarityClass = 'uncommon';
                        break;
                    case 3:
                        rarityClass = 'rare';
                        break;
                    case 4:
                        rarityClass = 'epic';
                        break;
                    case 5:
                        rarityClass = 'legendary';
                        break;
                    default:
                        rarityClass = 'common';
                }
                
                resourceItem.innerHTML = `
                    <div class="resource-icon ${rarityClass}">
                        <img src="${resource.image_url || 'assets/resources/default.png'}" alt="${resource.name}">
                    </div>
                    <div class="resource-info">
                        <div class="resource-name">${resource.name}</div>
                        <div class="resource-rarity ${rarityClass}">${this.getRarityText(resource.rarity)}</div>
                    </div>
                    <div class="resource-quantity">${resource.quantity}</div>
                `;
                
                resourcesListEl.appendChild(resourceItem);
            });
            
            // If no resources found
            if (this.currentExpedition.resources.length === 0) {
                resourcesListEl.innerHTML = '<div class="empty-state">No resources collected yet</div>';
            }
        }
        
        // Set up abort expedition button
        if (abortExpeditionBtn) {
            abortExpeditionBtn.onclick = () => this.showAbortExpeditionConfirmation();
        }
        
        // Set up return early button
        if (returnEarlyBtn) {
            returnEarlyBtn.onclick = () => this.showReturnEarlyConfirmation();
        }
    }
    
    /**
     * Show abort expedition confirmation
     */
    showAbortExpeditionConfirmation() {
        const confirmationModal = document.getElementById('abort-confirmation-modal');
        if (!confirmationModal) return;
        
        const confirmBtn = confirmationModal.querySelector('#confirm-abort-btn');
        if (confirmBtn) {
            confirmBtn.onclick = () => this.abortExpedition();
        }
        
        this.showModal(confirmationModal);
    }
    
    /**
     * Abort expedition
     */
    async abortExpedition() {
        try {
            this.showLoadingScreen();
            
            await expedition.abortExpedition();
            
            // Reset current expedition
            this.currentExpedition = null;
            
            // Hide active expedition and show expedition content
            const expeditionTab = this.tabs['expedition'];
            const expeditionContent = expeditionTab.querySelector('.expedition-content');
            const activeExpeditionEl = expeditionTab.querySelector('.active-expedition');
            
            if (expeditionContent && activeExpeditionEl) {
                expeditionContent.classList.remove('hidden');
                activeExpeditionEl.classList.add('hidden');
            }
            
            this.hideLoadingScreen();
            this.hideModal(document.getElementById('abort-confirmation-modal'));
            this.showSuccess('Expedition aborted successfully');
        } catch (error) {
            console.error('Error aborting expedition:', error);
            this.hideLoadingScreen();
            this.showError('Failed to abort expedition');
        }
    }
    
    /**
     * Show return early confirmation
     */
    showReturnEarlyConfirmation() {
        const confirmationModal = document.getElementById('return-early-confirmation-modal');
        if (!confirmationModal) return;
        
        const confirmBtn = confirmationModal.querySelector('#confirm-return-early-btn');
        if (confirmBtn) {
            confirmBtn.onclick = () => this.returnEarly();
        }
        
        this.showModal(confirmationModal);
    }
    
    /**
     * Return early from expedition
     */
    async returnEarly() {
        try {
            this.showLoadingScreen();
            
            await expedition.returnEarly();
            
            // Reset current expedition
            this.currentExpedition = null;
            
            // Hide active expedition and show expedition content
            const expeditionTab = this.tabs['expedition'];
            const expeditionContent = expeditionTab.querySelector('.expedition-content');
            const activeExpeditionEl = expeditionTab.querySelector('.active-expedition');
            
            if (expeditionContent && activeExpeditionEl) {
                expeditionContent.classList.remove('hidden');
                activeExpeditionEl.classList.add('hidden');
            }
            
            this.hideLoadingScreen();
            this.hideModal(document.getElementById('return-early-confirmation-modal'));
            this.showSuccess('Returning from expedition early');
            
            // Reload user data to update resources
            await this.loadUserData();
        } catch (error) {
            console.error('Error returning early:', error);
            this.hideLoadingScreen();
            this.showError('Failed to return early from expedition');
        }
    }

    /**
     * Show purchase confirmation
     * @param {string} itemId - Item ID
     */
    async showPurchaseConfirmation(itemId) {
        try {
            // Get item details
            const item = await api.getItemDetails(itemId);
            
            if (!item) {
                throw new Error('Item not found');
            }
            
            // Update modal content
            const purchaseModal = document.getElementById('purchase-confirmation-modal');
            if (!purchaseModal) return;
            
            const itemNameEl = purchaseModal.querySelector('.item-name');
            const itemDescriptionEl = purchaseModal.querySelector('.item-description');
            const itemImageEl = purchaseModal.querySelector('.item-image');
            const itemPriceEl = purchaseModal.querySelector('.item-price');
            const confirmPurchaseBtn = purchaseModal.querySelector('#confirm-purchase-btn');
            
            if (itemNameEl) itemNameEl.textContent = item.name;
            if (itemDescriptionEl) itemDescriptionEl.textContent = item.description;
            if (itemImageEl) itemImageEl.src = item.image_url || 'assets/items/default.png';
            if (itemPriceEl) {
                if (item.premium) {
                    itemPriceEl.innerHTML = `<i class="fas fa-gem"></i> ${item.price}`;
                } else {
                    itemPriceEl.innerHTML = `<i class="fas fa-coins"></i> ${item.price}`;
                }
            }
            
            // Set confirm button
            if (confirmPurchaseBtn) {
                confirmPurchaseBtn.setAttribute('data-item-id', itemId);
                confirmPurchaseBtn.onclick = () => this.purchaseItem(itemId);
            }
            
            // Show modal
            this.showModal(purchaseModal);
        } catch (error) {
            console.error('Error showing purchase confirmation:', error);
            this.showError('Failed to load item details');
        }
    }
    
    /**
     * Purchase item
     * @param {string} itemId - Item ID
     */
    async purchaseItem(itemId) {
        try {
            this.showLoadingScreen();
            
            const result = await api.purchaseItem(itemId);
            
            // Update currency display
            if (result.premium_currency !== undefined) {
                this.premiumCurrencyEl.textContent = result.premium_currency;
            }
            
            if (result.currency !== undefined) {
                this.regularCurrencyEl.textContent = result.currency;
            }
            
            this.hideLoadingScreen();
            this.hideModal(document.getElementById('purchase-confirmation-modal'));
            this.showSuccess(`Successfully purchased ${result.item_name}`);
            
            // Reload user data to update stats
            await this.loadUserData();
        } catch (error) {
            console.error('Error purchasing item:', error);
            this.hideLoadingScreen();
            this.showError(error.message || 'Failed to purchase item');
        }
    }
    
    /**
     * Show upgrade confirmation
     * @param {string} upgradeType - Upgrade type
     */
    async showUpgradeConfirmation(upgradeType) {
        try {
            // Get upgrade details
            const upgrade = await api.getUpgradeDetails(upgradeType);
            
            if (!upgrade) {
                throw new Error('Upgrade not found');
            }
            
            // Update modal content
            const upgradeModal = document.getElementById('upgrade-confirmation-modal');
            if (!upgradeModal) return;
            
            const upgradeNameEl = upgradeModal.querySelector('.upgrade-name');
            const upgradeDescriptionEl = upgradeModal.querySelector('.upgrade-description');
            const upgradeImageEl = upgradeModal.querySelector('.upgrade-image');
            const upgradePriceEl = upgradeModal.querySelector('.upgrade-price');
            const currentLevelEl = upgradeModal.querySelector('.current-level');
            const nextLevelEl = upgradeModal.querySelector('.next-level');
            const confirmUpgradeBtn = upgradeModal.querySelector('#confirm-upgrade-btn');
            
            if (upgradeNameEl) upgradeNameEl.textContent = upgrade.name;
            if (upgradeDescriptionEl) upgradeDescriptionEl.textContent = upgrade.description;
            if (upgradeImageEl) upgradeImageEl.src = upgrade.image_url || 'assets/upgrades/default.png';
            if (upgradePriceEl) {
                if (upgrade.premium) {
                    upgradePriceEl.innerHTML = `<i class="fas fa-gem"></i> ${upgrade.price}`;
                } else {
                    upgradePriceEl.innerHTML = `<i class="fas fa-coins"></i> ${upgrade.price}`;
                }
            }
            
            if (currentLevelEl) currentLevelEl.textContent = upgrade.current_level;
            if (nextLevelEl) nextLevelEl.textContent = upgrade.next_level;
            
            // Set confirm button
            if (confirmUpgradeBtn) {
                confirmUpgradeBtn.setAttribute('data-upgrade-type', upgradeType);
                confirmUpgradeBtn.onclick = () => this.purchaseUpgrade(upgradeType);
            }
            
            // Show modal
            this.showModal(upgradeModal);
        } catch (error) {
            console.error('Error showing upgrade confirmation:', error);
            this.showError('Failed to load upgrade details');
        }
    }
    
    /**
     * Purchase upgrade
     * @param {string} upgradeType - Upgrade type
     */
    async purchaseUpgrade(upgradeType) {
        try {
            this.showLoadingScreen();
            
            const result = await api.purchaseUpgrade(upgradeType);
            
            // Update currency display
            if (result.premium_currency !== undefined) {
                this.premiumCurrencyEl.textContent = result.premium_currency;
            }
            
            if (result.currency !== undefined) {
                this.regularCurrencyEl.textContent = result.currency;
            }
            
            this.hideLoadingScreen();
            this.hideModal(document.getElementById('upgrade-confirmation-modal'));
            this.showSuccess(`Successfully upgraded ${result.upgrade_name}`);
            
            // Reload user data to update stats
            await this.loadUserData();
        } catch (error) {
            console.error('Error purchasing upgrade:', error);
            this.hideLoadingScreen();
            this.showError(error.message || 'Failed to purchase upgrade');
        }
    }
    
    /**
     * Save settings
     */
    async saveSettings() {
        try {
            this.showLoadingScreen();
            
            // Get form data
            const username = document.getElementById('username-input')?.value;
            const notificationsEnabled = document.getElementById('notification-toggle')?.checked;
            const soundEnabled = document.getElementById('sound-toggle')?.checked;
            
            // Save settings
            const result = await api.saveSettings({
                username,
                notifications_enabled: notificationsEnabled,
                sound_enabled: soundEnabled
            });
            
            this.hideLoadingScreen();
            this.showSuccess('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.hideLoadingScreen();
            this.showError('Failed to save settings');
        }
    }
    
    /**
     * Toggle notifications
     * @param {boolean} enabled - Whether notifications are enabled
     */
    async toggleNotifications(enabled) {
        try {
            await api.toggleNotifications(enabled);
            this.showSuccess(`Notifications ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling notifications:', error);
            this.showError('Failed to update notification settings');
        }
    }
    
    /**
     * Toggle sound
     * @param {boolean} enabled - Whether sound is enabled
     */
    async toggleSound(enabled) {
        try {
            await api.toggleSound(enabled);
            this.showSuccess(`Sound ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling sound:', error);
            this.showError('Failed to update sound settings');
        }
    }
    
    /**
     * Show logout confirmation
     */
    showLogoutConfirmation() {
        const logoutModal = document.getElementById('logout-confirmation-modal');
        if (!logoutModal) return;
        
        const confirmBtn = logoutModal.querySelector('#confirm-logout-btn');
        if (confirmBtn) {
            confirmBtn.onclick = () => this.logout();
        }
        
        this.showModal(logoutModal);
    }
    
    /**
     * Logout user
     */
    async logout() {
        try {
            this.showLoadingScreen();
            
            await api.logout();
            
            // Clear token
            api.clearToken();
            
            // Redirect to login page or reload
            window.location.reload();
        } catch (error) {
            console.error('Error logging out:', error);
            this.hideLoadingScreen();
            this.showError('Failed to logout');
        }
    }

    /**
     * Handle window resize events
     * Adjusts UI elements based on screen size
     */
    handleResize() {
        // Get current window dimensions
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Adjust UI based on screen size
        if (width < 768) {
            // Mobile layout adjustments
            document.body.classList.add('mobile-view');
            document.body.classList.remove('desktop-view');
        } else {
            // Desktop layout adjustments
            document.body.classList.add('desktop-view');
            document.body.classList.remove('mobile-view');
        }
        
        // Adjust fortune wheel canvas if it exists
        if (this.fortuneWheelCanvas) {
            const containerWidth = this.fortuneWheelCanvas.parentElement.clientWidth;
            const size = Math.min(containerWidth * 0.9, 400);
            this.fortuneWheelCanvas.width = size;
            this.fortuneWheelCanvas.height = size;
            
            // Redraw wheel if the fortune wheel module is initialized and has rewards
            if (typeof fortuneWheel !== 'undefined' && 
                fortuneWheel.drawWheel && 
                fortuneWheel.rewards && 
                fortuneWheel.rewards.length > 0) {
                try {
                    fortuneWheel.drawWheel();
                } catch (error) {
                    console.log('Could not redraw fortune wheel:', error.message);
                }
            }
        }
        
        console.log(`Window resized to ${width}x${height}, UI adjusted`);
    }
}

// Create global UI instance
const ui = new UI();
