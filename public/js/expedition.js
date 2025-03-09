/**
 * Space Miner - Expedition Module
 * Handles expedition-related functionality
 */

class Expedition {
    constructor() {
        this.activeExpedition = null;
        this.countdownInterval = null;
        this.dangerCheckInterval = null;
        this.resourceCollectionInterval = null;
        this.collectedResources = [];
        
        // DOM elements
        this.expeditionPlanetName = document.getElementById('expedition-planet-name');
        this.countdownTimer = document.getElementById('countdown-timer');
        this.countdownMinutes = document.getElementById('countdown-minutes');
        this.countdownSeconds = document.getElementById('countdown-seconds');
        this.countdownWarning = document.getElementById('countdown-warning');
        this.mineBtn = document.getElementById('mine-btn');
        this.exploreBtn = document.getElementById('explore-btn');
        this.returnBtn = document.getElementById('return-btn');
        this.expeditionResourcesList = document.getElementById('expedition-resources-list');
        this.dangerAlerts = document.getElementById('danger-alerts');
        this.activeExpeditionElement = document.getElementById('active-expedition');
        this.startExpeditionBtn = document.getElementById('start-expedition-btn');
    }

    /**
     * Initialize expedition module
     * @returns {Promise} - Promise that resolves when initialization is complete
     */
    async init() {
        try {
            console.log('Initializing expedition module...');
            
            // Add event listeners
            if (this.mineBtn) {
                this.mineBtn.addEventListener('click', () => this.mineResources());
            }
            
            if (this.exploreBtn) {
                this.exploreBtn.addEventListener('click', () => this.exploreArea());
            }
            
            if (this.returnBtn) {
                this.returnBtn.addEventListener('click', () => this.returnToShip());
            }
            
            if (this.startExpeditionBtn) {
                this.startExpeditionBtn.addEventListener('click', () => this.startExpedition());
            }
            
            // Check for active expedition on init
            try {
                await this.checkActiveExpedition();
            } catch (expeditionError) {
                console.error('Failed to check active expedition:', expeditionError);
                // Continue initialization even if checking active expedition fails
            }
            
            console.log('Expedition module initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing expedition module:', error);
            // Don't throw here, just log the error
            // This allows the game to continue loading even if expedition fails
            return false;
        }
    }

    /**
     * Check if user has an active expedition
     */
    async checkActiveExpedition() {
        try {
            // First verify authentication
            const isAuthenticated = await api.isAuthenticated();
            if (!isAuthenticated) {
                console.log('User not authenticated, skipping active expedition check');
                return;
            }
            
            const profile = await api.getProfile();
            
            if (profile.active_expedition) {
                this.activeExpedition = profile.active_expedition;
                this.showActiveExpedition();
                this.startCountdown();
            }
        } catch (error) {
            console.error('Error checking active expedition:', error);
            // Don't show error to user as this is a background check
        }
    }

    /**
     * Start a new expedition
     * @param {number} planetId - Planet ID
     */
    async startExpedition() {
        try {
            const startExpeditionBtn = document.getElementById('start-expedition-btn');
            const planetId = startExpeditionBtn ? startExpeditionBtn.getAttribute('data-planet-id') : null;
            
            if (!planetId) {
                ui.showError('Invalid planet selected');
                return;
            }
            
            // Check if user already has an active expedition
            if (this.activeExpedition) {
                ui.showError('You already have an active expedition. Please complete or abort it first.');
                return;
            }
            
            // Disable the start button to prevent multiple clicks
            if (startExpeditionBtn) {
                startExpeditionBtn.disabled = true;
                startExpeditionBtn.textContent = 'Launching...';
            }
            
            ui.showLoadingScreen();
            
            // Check connection before starting expedition
            const isConnected = await api.checkConnection();
            if (!isConnected) {
                ui.hideLoadingScreen();
                ui.showError('Cannot connect to server. Please check your internet connection and try again.');
                
                // Re-enable the button
                if (startExpeditionBtn) {
                    startExpeditionBtn.disabled = false;
                    startExpeditionBtn.textContent = 'Start Expedition';
                }
                return;
            }
            
            const result = await api.startExpedition(planetId);
            
            if (!result || !result.expedition) {
                throw new Error('Invalid response from server');
            }
            
            this.activeExpedition = result.expedition;
            this.collectedResources = [];
            
            // Hide planet details modal
            ui.hideModal(document.getElementById('planet-details-modal'));
            
            // Show active expedition
            this.showActiveExpedition();
            
            // Start countdown
            this.startCountdown();
            
            ui.hideLoadingScreen();
            ui.showSuccess('Expedition started successfully!');
        } catch (error) {
            ui.hideLoadingScreen();
            console.error('Error starting expedition:', error);
            ui.showError(error.message || 'Failed to start expedition');
            
            // Re-enable the start button
            const startExpeditionBtn = document.getElementById('start-expedition-btn');
            if (startExpeditionBtn) {
                startExpeditionBtn.disabled = false;
                startExpeditionBtn.textContent = 'Start Expedition';
            }
        }
    }

    /**
     * Show active expedition UI
     */
    showActiveExpedition() {
        if (!this.activeExpedition) return;
        
        // Show active expedition section
        if (this.activeExpeditionElement) {
            this.activeExpeditionElement.classList.remove('hidden');
        }
        
        // Update planet name
        if (this.expeditionPlanetName) {
            this.expeditionPlanetName.textContent = this.activeExpedition.planet_name;
        }
        
        // Clear resources list
        if (this.expeditionResourcesList) {
            this.expeditionResourcesList.innerHTML = '';
        }
        
        // Update collected resources
        this.updateCollectedResources();
        
        // Start danger check interval
        this.startDangerCheck();
        
        // Start automatic resource collection
        this.startResourceCollection();
    }

    /**
     * Start countdown timer
     */
    startCountdown() {
        if (!this.activeExpedition) return;
        
        // Clear existing interval
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        const updateCountdown = () => {
            try {
                const now = new Date();
                const endTime = new Date(this.activeExpedition.end_time);
                const timeRemaining = Math.max(0, endTime - now);
                
                if (timeRemaining <= 0) {
                    // Expedition time is up
                    clearInterval(this.countdownInterval);
                    this.expeditionTimeUp();
                    return;
                }
                
                // Calculate minutes and seconds
                const minutes = Math.floor(timeRemaining / 60000);
                const seconds = Math.floor((timeRemaining % 60000) / 1000);
                
                // Update countdown display
                if (this.countdownMinutes) {
                    this.countdownMinutes.textContent = minutes.toString().padStart(2, '0');
                }
                
                if (this.countdownSeconds) {
                    this.countdownSeconds.textContent = seconds.toString().padStart(2, '0');
                }
                
                // Show warning if time is running out
                const warningTime = (CONFIG?.GAME?.EXPEDITION?.MIN_COUNTDOWN_WARNING || 30) * 1000;
                if (timeRemaining <= warningTime) {
                    if (this.countdownWarning) {
                        this.countdownWarning.classList.remove('hidden');
                    }
                    
                    if (this.countdownTimer) {
                        this.countdownTimer.classList.add('danger');
                        
                        // Add blinking effect when time is really low (last 15 seconds)
                        if (timeRemaining <= 15000) {
                            this.countdownTimer.classList.add('blinking');
                        } else {
                            this.countdownTimer.classList.remove('blinking');
                        }
                    }
                }
            } catch (error) {
                console.error('Error updating countdown:', error);
                // Don't clear the interval, try again next tick
            }
        };
        
        // Update immediately and then set interval
        updateCountdown();
        this.countdownInterval = setInterval(updateCountdown, 1000);
    }

    /**
     * Start danger check interval
     */
    startDangerCheck() {
        if (!this.activeExpedition) return;
        
        // Clear existing interval
        if (this.dangerCheckInterval) {
            clearInterval(this.dangerCheckInterval);
        }
        
        // Get danger check interval from config or use default
        const checkInterval = CONFIG?.GAME?.EXPEDITION?.DANGER_CHECK_INTERVAL || 5000; // Default to 5 seconds
        
        this.dangerCheckInterval = setInterval(async () => {
            try {
                // Only check for dangers if expedition is still active
                if (!this.activeExpedition) {
                    clearInterval(this.dangerCheckInterval);
                    return;
                }
                
                const result = await api.checkDanger();
                
                if (result && result.danger) {
                    this.showDangerEvent(result.danger);
                }
            } catch (error) {
                console.error('Error checking for dangers:', error);
            }
        }, checkInterval);
    }

    /**
     * Start automatic resource collection
     */
    startResourceCollection() {
        if (!this.activeExpedition) return;
        
        // Clear existing interval
        if (this.resourceCollectionInterval) {
            clearInterval(this.resourceCollectionInterval);
        }
        
        // Get collection interval from config or use default
        const collectionInterval = CONFIG?.GAME?.EXPEDITION?.RESOURCE_COLLECTION_INTERVAL || 3000; // Default to 3 seconds
        
        // Add some randomness to the collection interval to make it feel more natural
        const randomizedInterval = collectionInterval + (Math.random() * 10000 - 5000); // +/- 5 seconds
        
        this.resourceCollectionInterval = setInterval(async () => {
            try {
                // Only collect resources if expedition is still active
                if (!this.activeExpedition) {
                    clearInterval(this.resourceCollectionInterval);
                    return;
                }
                
                // Check if we're close to the expedition end time
                const now = new Date();
                const endTime = new Date(this.activeExpedition.end_time);
                const timeRemaining = Math.max(0, endTime - now);
                
                // Don't try to collect resources if less than 5 seconds remaining
                if (timeRemaining < 5000) {
                    return;
                }
                
                const result = await api.collectResource('auto');
                
                if (result && result.resource) {
                    this.addCollectedResource(result.resource);
                    
                    // Show a small notification for auto-collected resources
                    ui.showToast(`Auto-collected: ${result.resource.quantity} ${result.resource.name}`);
                }
            } catch (error) {
                console.error('Error collecting resources automatically:', error);
                // Don't show error to user for automatic collection
            }
        }, randomizedInterval);
    }

    /**
     * Mine resources manually
     */
    async mineResources() {
        if (!this.activeExpedition) {
            ui.showError('No active expedition found');
            return;
        }
        
        // Disable the mine button to prevent multiple clicks
        const mineBtn = document.getElementById('mine-btn');
        if (mineBtn) {
            mineBtn.disabled = true;
            mineBtn.classList.add('loading');
        }
        
        try {
            ui.showLoadingScreen();
            
            // Check connection before mining
            const isConnected = await api.checkConnection();
            if (!isConnected) {
                throw new Error('Cannot connect to server. Please check your internet connection and try again.');
            }
            
            const result = await api.collectResource('manual');
            
            if (!result) {
                throw new Error('Invalid response from server');
            }
            
            if (result.resource) {
                this.addCollectedResource(result.resource);
                this.showResourceFoundModal(result.resource);
                
                // Play mining success sound
                const miningSound = document.getElementById('mining-sound');
                if (miningSound) {
                    miningSound.currentTime = 0;
                    miningSound.play().catch(e => console.log('Error playing sound:', e));
                }
            } else if (result.error) {
                throw new Error(result.error);
            } else {
                ui.showInfo('No resources found this time. Try again!');
            }
            
            ui.hideLoadingScreen();
        } catch (error) {
            ui.hideLoadingScreen();
            console.error('Error mining resources:', error);
            ui.showError(error.message || 'Failed to mine resources');
        } finally {
            // Re-enable the mine button
            if (mineBtn) {
                mineBtn.disabled = false;
                mineBtn.classList.remove('loading');
            }
        }
    }

    /**
     * Explore area for resources
     */
    async exploreArea() {
        if (!this.activeExpedition) {
            ui.showError('No active expedition found');
            return;
        }
        
        // Check if expedition is about to end
        const now = new Date();
        const endTime = new Date(this.activeExpedition.end_time);
        const timeRemaining = Math.max(0, endTime - now);
        
        // Don't start exploration if less than 10 seconds remaining
        if (timeRemaining < 10000) {
            ui.showWarning('Not enough time to explore! Expedition is ending soon.');
            return;
        }
        
        // Disable the explore button to prevent multiple clicks
        const exploreBtn = document.getElementById('explore-btn');
        if (exploreBtn) {
            exploreBtn.disabled = true;
            exploreBtn.classList.add('loading');
        }
        
        try {
            ui.showLoadingScreen();
            
            // Check connection before exploring
            const isConnected = await api.checkConnection();
            if (!isConnected) {
                throw new Error('Cannot connect to server. Please check your internet connection and try again.');
            }
            
            const result = await api.exploreArea();
            
            if (!result) {
                throw new Error('Invalid response from server');
            }
            
            if (result.resources && result.resources.length > 0) {
                // Play exploration success sound
                const exploreSound = document.getElementById('explore-sound');
                if (exploreSound) {
                    exploreSound.currentTime = 0;
                    exploreSound.play().catch(e => console.log('Error playing sound:', e));
                }
                
                // Add all collected resources
                let totalQuantity = 0;
                result.resources.forEach(resource => {
                    this.addCollectedResource(resource);
                    totalQuantity += resource.quantity || 1;
                });
                
                // Show the first resource found
                this.showResourceFoundModal(result.resources[0], result.resources.length);
                
                // Show success message with total resources found
                ui.showSuccess(`Exploration successful! Found ${result.resources.length} resource types (${totalQuantity} total items).`);
            } else if (result.error) {
                throw new Error(result.error);
            } else {
                ui.showInfo('No resources found in this area. Try exploring somewhere else!');
            }
            
            ui.hideLoadingScreen();
        } catch (error) {
            ui.hideLoadingScreen();
            console.error('Error exploring area:', error);
            ui.showError(error.message || 'Failed to explore area');
        } finally {
            // Re-enable the explore button after a short delay
            setTimeout(() => {
                if (exploreBtn) {
                    exploreBtn.disabled = false;
                    exploreBtn.classList.remove('loading');
                }
            }, 1000); // 1 second delay to prevent accidental double-clicks
        }
    }

    /**
     * Return to ship
     */
    async returnToShip() {
        if (!this.activeExpedition) {
            ui.showError('No active expedition found');
            return;
        }
        
        // Check if there are any active dangers that might prevent return
        const activeDangers = document.querySelectorAll('.danger-alert.active');
        if (activeDangers.length > 0 && activeDangers.length >= 3) {
            const confirmDangerReturn = confirm('WARNING: Multiple active dangers detected! Returning now is extremely risky. Are you absolutely sure you want to attempt return?');
            if (!confirmDangerReturn) {
                return;
            }
        }
        
        // Ask for confirmation if there are collected resources
        if (this.collectedResources && this.collectedResources.length > 0) {
            // Calculate total resources and their value
            let totalItems = 0;
            let totalValue = 0;
            
            this.collectedResources.forEach(resource => {
                totalItems += resource.quantity || 1;
                totalValue += (resource.value || 0) * (resource.quantity || 1);
            });
            
            // Show more detailed confirmation message
            const confirmMessage = `You have collected ${totalItems} items worth ${totalValue} credits during this expedition. Are you sure you want to return to your ship? This will end your current expedition.`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
        } else if (!confirm('Are you sure you want to return to your ship? This will end your current expedition without any resources collected.')) {
            return;
        }
        
        try {
            // Disable all expedition buttons to prevent multiple actions
            const expeditionButtons = document.querySelectorAll('.expedition-btn');
            expeditionButtons.forEach(btn => {
                if (btn) btn.disabled = true;
            });
            
            const returnButton = document.getElementById('return-btn');
            if (returnButton) {
                returnButton.disabled = true;
                returnButton.classList.add('loading');
                returnButton.textContent = 'Returning...';
            }
            
            ui.showLoadingScreen('Returning to ship...');
            
            // Check connection before returning
            const isConnected = await api.checkConnection();
            if (!isConnected) {
                throw new Error('Cannot connect to server. Please check your internet connection and try again.');
            }
            
            // Add a timestamp to track when the return request was sent
            const returnStartTime = new Date().getTime();
            
            // Set a timeout to handle server not responding
            const returnTimeout = setTimeout(() => {
                ui.hideLoadingScreen();
                ui.showError('Return request is taking too long. The server might be experiencing issues. Please try again.');
                
                // Re-enable expedition buttons
                expeditionButtons.forEach(btn => {
                    if (btn) btn.disabled = false;
                });
                
                if (returnButton) {
                    returnButton.disabled = false;
                    returnButton.classList.remove('loading');
                    returnButton.textContent = 'Return to Ship';
                }
            }, 15000); // 15 seconds timeout
            
            const result = await api.returnToShip();
            
            // Clear the timeout since we got a response
            clearTimeout(returnTimeout);
            
            // Calculate how long the return took
            const returnDuration = new Date().getTime() - returnStartTime;
            
            // If the return was too quick, add a small delay for better user experience
            if (returnDuration < 1500) {
                await new Promise(resolve => setTimeout(resolve, 1500 - returnDuration));
            }
            
            if (!result) {
                throw new Error('Invalid response from server');
            }
            
            // Play return sound
            const returnSound = document.getElementById('return-sound');
            if (returnSound) {
                returnSound.currentTime = 0;
                returnSound.play().catch(e => console.log('Error playing sound:', e));
            }
            
            // Clear expedition data
            this.clearExpedition();
            
            ui.hideLoadingScreen();
            
            // Show result
            if (result) {
                // Add a success message based on resources collected
                if (result.success && this.collectedResources && this.collectedResources.length > 0) {
                    ui.showSuccess(`Successfully returned to ship with ${this.collectedResources.length} types of resources!`);
                }
                this.showExpeditionResult(result);
            }
        } catch (error) {
            ui.hideLoadingScreen();
            console.error('Error returning to ship:', error);
            ui.showError(error.message || 'Failed to return to ship');
            
            // Re-enable expedition buttons
            const expeditionButtons = document.querySelectorAll('.expedition-btn');
            expeditionButtons.forEach(btn => {
                if (btn) btn.disabled = false;
            });
            
            const returnButton = document.getElementById('return-btn');
            if (returnButton) {
                returnButton.disabled = false;
                returnButton.classList.remove('loading');
                returnButton.textContent = 'Return to Ship';
            }
            
            // Suggest actions to the user based on the error
            if (error.message && error.message.includes('connection')) {
                ui.showInfo('Try checking your internet connection and returning again in a few moments.');
            }
        }
    }

    /**
     * Expedition time is up
     */
    expeditionTimeUp() {
        // Clear all intervals
        this.clearIntervals();
        
        // Play time up sound
        const timeUpSound = document.getElementById('time-up-sound');
        if (timeUpSound) {
            timeUpSound.currentTime = 0;
            timeUpSound.play().catch(e => console.log('Error playing sound:', e));
        }
        
        // Show time up message
        const timeUpMessage = document.getElementById('expedition-time-up');
        if (timeUpMessage) {
            timeUpMessage.classList.remove('hidden');
            // Add animation for better visibility
            timeUpMessage.classList.add('pulse-animation');
        }
        
        // Add visual indication that time is up
        if (this.countdownTimer) {
            this.countdownTimer.classList.add('time-up');
            this.countdownTimer.classList.add('blinking');
        }
        
        // Disable mining buttons
        const miningButtons = document.querySelectorAll('.mining-btn');
        miningButtons.forEach(btn => {
            if (btn) btn.disabled = true;
        });
        
        // Enable return button and make it more visible
        const returnButton = document.getElementById('return-btn');
        if (returnButton) {
            returnButton.disabled = false;
            returnButton.classList.add('pulse');
            returnButton.classList.add('emergency');
            returnButton.textContent = 'EMERGENCY RETURN';
        }
        
        // Add screen shake effect for urgency
        document.body.classList.add('screen-shake');
        setTimeout(() => {
            document.body.classList.remove('screen-shake');
        }, 2000);
        
        // Show warning toast to the user
        ui.showWarning('Time is up! Return to your ship immediately to salvage what you can!');
        
        // If user has collected resources, show additional message
        if (this.collectedResources && this.collectedResources.length > 0) {
            // Calculate total value at risk
            const totalValue = this.collectedResources.reduce((total, resource) => {
                return total + ((resource.value || 0) * (resource.quantity || 1));
            }, 0);
            
            setTimeout(() => {
                ui.showWarning(`You have ${this.collectedResources.length} resource types worth ${totalValue} credits at risk! Return now!`);
            }, 3000);
        }
        
        // Log the time up event
        console.log('Expedition time up:', {
            expeditionId: this.activeExpedition?.id,
            resourcesCollected: this.collectedResources.length,
            timestamp: new Date().toISOString()
        });
        
        // Notify server that expedition time is up
        this.notifyTimeUp();
    }
    
    /**
     * Notify server that expedition time is up
     */
    async notifyTimeUp() {
        // Maximum number of retry attempts
        const maxRetries = 3;
        let retryCount = 0;
        let success = false;
        
        while (retryCount < maxRetries && !success) {
            try {
                // Check connection before notifying
                const isConnected = await api.checkConnection();
                if (!isConnected) {
                    console.error('Cannot connect to server to notify about expedition time up');
                    
                    // Show offline message to user only on first attempt
                    if (retryCount === 0) {
                        ui.showWarning('Unable to connect to server. Will retry automatically. You can still return to ship.');
                    }
                    
                    // Increment retry count and wait before retrying
                    retryCount++;
                    if (retryCount < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 3000 * retryCount)); // Exponential backoff
                        continue;
                    } else {
                        // If all retries failed, show a final message
                        ui.showError('Server connection failed. Please return to ship manually to save your progress.');
                        return;
                    }
                }
                
                const result = await api.expeditionTimeUp();
                success = true;
                
                // If user has insurance, show recovered resources
                if (result && result.recoveryPercentage > 0 && result.resources && result.resources.length > 0) {
                    // Add a small delay to ensure the user sees the time up message first
                    setTimeout(() => {
                        // Play insurance recovery sound if available
                        const recoverySound = document.getElementById('recovery-sound');
                        if (recoverySound) {
                            recoverySound.currentTime = 0;
                            recoverySound.play().catch(e => console.log('Error playing sound:', e));
                        }
                        
                        ui.showInfo(`Your insurance recovered ${result.recoveryPercentage}% of your resources!`);
                        
                        // Calculate the total value of recovered resources
                        const totalValue = result.resources.reduce((total, resource) => {
                            return total + ((resource.value || 0) * (resource.quantity || 1));
                        }, 0);
                        
                        if (totalValue > 0) {
                            setTimeout(() => {
                                ui.showSuccess(`Recovered resources worth ${totalValue} credits!`);
                            }, 1500);
                        }
                        
                        this.showExpeditionResult(result);
                    }, 2000);
                } else if (result && result.recoveryPercentage === 0) {
                    // If user has no insurance or it didn't recover anything
                    setTimeout(() => {
                        ui.showWarning('No resources were recovered. Consider purchasing insurance for future expeditions.');
                    }, 2000);
                }
            } catch (error) {
                console.error('Error notifying server about expedition time up:', error);
                
                // Increment retry count and wait before retrying
                retryCount++;
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 3000 * retryCount)); // Exponential backoff
                } else {
                    // If all retries failed, show a final message
                    ui.showError('Failed to process expedition end. Please return to ship manually.');
                    return;
                }
            }
        }
    }

    /**
     * Clear all intervals
     */
    clearIntervals() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        
        if (this.dangerCheckInterval) {
            clearInterval(this.dangerCheckInterval);
            this.dangerCheckInterval = null;
        }
        
        if (this.resourceCollectionInterval) {
            clearInterval(this.resourceCollectionInterval);
            this.resourceCollectionInterval = null;
        }
    }

    /**
     * Clear expedition data
     */
    clearExpedition() {
        // Clear all intervals
        this.clearIntervals();
        
        // Reset expedition data
        this.activeExpedition = null;
        this.collectedResources = [];
        
        // Reset UI elements
        if (this.countdownTimer) {
            this.countdownTimer.classList.remove('time-up', 'blinking', 'warning');
        }
        
        if (this.countdownWarning) {
            this.countdownWarning.classList.add('hidden');
        }
        
        // Reset time up message
        const timeUpMessage = document.getElementById('expedition-time-up');
        if (timeUpMessage) {
            timeUpMessage.classList.add('hidden');
            timeUpMessage.classList.remove('pulse-animation');
        }
        
        // Reset danger alerts
        if (this.dangerAlerts) {
            this.dangerAlerts.innerHTML = '';
        }
        
        // Reset resources list
        if (this.expeditionResourcesList) {
            this.expeditionResourcesList.innerHTML = '';
        }
        
        // Reset buttons
        if (this.mineBtn) {
            this.mineBtn.disabled = false;
            this.mineBtn.classList.remove('loading', 'pulse');
        }
        
        if (this.exploreBtn) {
            this.exploreBtn.disabled = false;
            this.exploreBtn.classList.remove('loading', 'pulse');
        }
        
        if (this.returnBtn) {
            this.returnBtn.disabled = false;
            this.returnBtn.classList.remove('loading', 'pulse', 'emergency');
            this.returnBtn.textContent = 'Return to Ship';
        }
        
        // Reset all mining buttons
        const miningButtons = document.querySelectorAll('.mining-btn');
        miningButtons.forEach(btn => {
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('loading', 'pulse', 'emergency');
            }
        });
        
        // Remove any screen shake effects
        document.body.classList.remove('screen-shake');
        
        // Reset any active modals
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal && !modal.classList.contains('hidden')) {
                ui.hideModal(modal);
            }
        });
        
        // Hide expedition UI
        const expeditionUI = document.getElementById('expedition-ui');
        if (expeditionUI) {
            expeditionUI.classList.add('hidden');
        }
        
        // Show planet selection
        const planetSelection = document.getElementById('planet-selection');
        if (planetSelection) {
            planetSelection.classList.remove('hidden');
        }
        
        // Enable start expedition button
        if (this.startExpeditionBtn) {
            this.startExpeditionBtn.disabled = false;
        }
        
        // Hide active expedition element
        if (this.activeExpeditionElement) {
            this.activeExpeditionElement.classList.add('hidden');
        }
        
        // Reset any countdown displays
        if (this.countdownMinutes) {
            this.countdownMinutes.textContent = '00';
        }
        
        if (this.countdownSeconds) {
            this.countdownSeconds.textContent = '00';
        }
        
        // Reset planet name display
        if (this.expeditionPlanetName) {
            this.expeditionPlanetName.textContent = '';
        }
        
        // Stop any playing sounds
        const sounds = document.querySelectorAll('audio');
        sounds.forEach(sound => {
            if (sound) {
                sound.pause();
                sound.currentTime = 0;
            }
        });
        
        console.log('Expedition cleared successfully');
    }

    /**
     * Add collected resource to list
     * @param {object} resource - Resource object
     */
    addCollectedResource(resource) {
        if (!resource) return;
        
        // Check if resource already exists in collection
        const existingResourceIndex = this.collectedResources.findIndex(r => 
            r.id === resource.id || (r.name === resource.name && r.rarity === resource.rarity)
        );
        
        if (existingResourceIndex !== -1) {
            // Update existing resource quantity
            this.collectedResources[existingResourceIndex].quantity = 
                (this.collectedResources[existingResourceIndex].quantity || 1) + (resource.quantity || 1);
            
            // Update total value
            this.collectedResources[existingResourceIndex].total_value = 
                this.collectedResources[existingResourceIndex].quantity * (resource.value || 0);
        } else {
            // Add new resource to collection
            const newResource = {
                ...resource,
                quantity: resource.quantity || 1,
                total_value: (resource.quantity || 1) * (resource.value || 0)
            };
            
            this.collectedResources.push(newResource);
        }
        
        // Update collected resources display
        this.updateCollectedResources();
        
        // Log collection
        console.log(`Resource collected: ${resource.name} (${resource.rarity})`);
    }

    /**
     * Update collected resources display
     */
    updateCollectedResources() {
        if (!this.expeditionResourcesList) return;
        
        this.expeditionResourcesList.innerHTML = '';
        
        if (!this.collectedResources || this.collectedResources.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-resources';
            emptyMessage.textContent = 'No resources collected yet.';
            this.expeditionResourcesList.appendChild(emptyMessage);
            return;
        }
        
        // Sort resources by rarity (highest to lowest)
        const sortedResources = [...this.collectedResources].sort((a, b) => {
            const rarityOrder = { 'legendary': 4, 'epic': 3, 'rare': 2, 'uncommon': 1, 'common': 0 };
            return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
        });
        
        // Calculate total value
        const totalValue = sortedResources.reduce((total, resource) => {
            return total + ((resource.value || 0) * (resource.quantity || 1));
        }, 0);
        
        // Create resources list
        sortedResources.forEach(resource => {
            const resourceItem = document.createElement('div');
            resourceItem.className = `resource-item rarity-${resource.rarity || 'common'}`;
            
            // Calculate individual resource value
            const resourceValue = (resource.value || 0) * (resource.quantity || 1);
            
            resourceItem.innerHTML = `
                <div class="resource-icon">
                    <img src="${resource.image_url || 'assets/resources/default-resource.png'}" alt="${resource.name || 'Resource'}">
                </div>
                <div class="resource-info">
                    <div class="resource-name">${resource.name || 'Unknown Resource'} <span class="resource-rarity">(${resource.rarity || 'common'})</span></div>
                    <div class="resource-quantity">Quantity: ${resource.quantity || 0}</div>
                    <div class="resource-value">Value: ${resourceValue} credits</div>
                </div>
            `;
            
            // Add tooltip with description if available
            if (resource.description) {
                resourceItem.setAttribute('title', resource.description);
                resourceItem.classList.add('has-tooltip');
            }
            
            this.expeditionResourcesList.appendChild(resourceItem);
        });
        
        // Add total value display if there are resources
        if (sortedResources.length > 0) {
            const totalValueElement = document.createElement('div');
            totalValueElement.className = 'total-value';
            totalValueElement.innerHTML = `<strong>Total Value:</strong> ${totalValue} credits`;
            this.expeditionResourcesList.appendChild(totalValueElement);
        }
    }

    /**
     * Show resource found modal
     * @param {object} resource - Resource object
     * @param {number} totalFound - Total resources found (for explore)
     */
    showResourceFoundModal(resource, totalFound = 1) {
        const foundResourceImage = document.getElementById('found-resource-image');
        const foundResourceName = document.getElementById('found-resource-name');
        const foundResourceDescription = document.getElementById('found-resource-description');
        const foundResourceQuantity = document.getElementById('found-resource-quantity');
        const foundResourceValue = document.getElementById('found-resource-value');
        const foundResourceRarity = document.getElementById('found-resource-rarity');
        const resourceFoundModal = document.getElementById('resource-found-modal');
        
        if (foundResourceImage) {
            foundResourceImage.src = resource.image_url || 'assets/resources/default-resource.png';
            foundResourceImage.alt = resource.name || 'Resource';
            
            // Add rarity class to image container
            const imageContainer = foundResourceImage.parentElement;
            if (imageContainer) {
                // Remove any existing rarity classes
                imageContainer.className = imageContainer.className.replace(/rarity-\w+/g, '');
                // Add new rarity class
                imageContainer.classList.add(`rarity-${resource.rarity || 'common'}`);
                
                // Add animation based on rarity
                imageContainer.classList.remove('pulse-animation', 'glow-animation', 'sparkle-animation');
                
                if (resource.rarity === 'legendary') {
                    imageContainer.classList.add('flip-in');
                } else if (resource.rarity === 'epic') {
                    imageContainer.classList.add('zoom-in');
                } else if (resource.rarity === 'rare') {
                    imageContainer.classList.add('bounce-in');
                } else {
                    imageContainer.classList.add('slide-in');
                }
            }
        }
        
        if (foundResourceName) {
            foundResourceName.textContent = resource.name || 'Unknown Resource';
            
            // Add color based on rarity
            foundResourceName.className = `resource-name rarity-text-${resource.rarity || 'common'}`;
        }
        
        if (foundResourceDescription) {
            foundResourceDescription.textContent = resource.description || 'No description available.';
        }
        
        if (foundResourceQuantity) {
            foundResourceQuantity.textContent = totalFound > 1 ? `${totalFound} found!` : '1 found!';
            
            // Add animation for multiple resources
            if (totalFound > 1) {
                foundResourceQuantity.classList.add('highlight-text');
                setTimeout(() => {
                    foundResourceQuantity.classList.remove('highlight-text');
                }, 2000);
            }
        }
        
        if (foundResourceValue) {
            // Calculate total value
            const totalValue = (resource.value || 0) * totalFound;
            foundResourceValue.textContent = `${totalValue} credits`;
            
            // Add animation for high value resources
            if (totalValue > 100) {
                foundResourceValue.classList.add('highlight-value');
                setTimeout(() => {
                    foundResourceValue.classList.remove('highlight-value');
                }, 2000);
            }
        }
        
        if (foundResourceRarity) {
            foundResourceRarity.textContent = resource.rarity ? resource.rarity.charAt(0).toUpperCase() + resource.rarity.slice(1) : 'Common';
            foundResourceRarity.className = `resource-rarity rarity-badge-${resource.rarity || 'common'}`;
        }
        
        // Play appropriate sound based on rarity
        let soundId;
        switch(resource.rarity) {
            case 'legendary':
                soundId = 'legendary-sound';
                break;
            case 'epic':
                soundId = 'epic-sound';
                break;
            case 'rare':
                soundId = 'rare-sound';
                break;
            case 'uncommon':
                soundId = 'uncommon-sound';
                break;
            default:
                soundId = 'common-sound';
        }
        
        // Use the safe sound playing method
        this.playSound(soundId, resource.rarity === 'legendary' ? 1.0 : 0.8);
        
        // Add resource to collection
        this.addCollectedResource(resource);
        
        // Show modal with animation
        if (resourceFoundModal) {
            // Add entrance animation class based on rarity
            resourceFoundModal.classList.remove('slide-in', 'fade-in', 'bounce-in', 'zoom-in', 'flip-in');
            
            if (resource.rarity === 'legendary') {
                resourceFoundModal.classList.add('flip-in');
            } else if (resource.rarity === 'epic') {
                resourceFoundModal.classList.add('zoom-in');
            } else if (resource.rarity === 'rare') {
                resourceFoundModal.classList.add('bounce-in');
            } else {
                resourceFoundModal.classList.add('slide-in');
            }
        }
        
        // Show the modal
        ui.showModal(document.getElementById('resource-found-modal'));
        
        // For rare resources, add a toast notification
        if (resource.rarity === 'rare' || resource.rarity === 'epic' || resource.rarity === 'legendary') {
            ui.showSuccess(`Found ${resource.rarity} resource: ${resource.name}!`);
        }
        
        // Auto-close the modal after a delay for common resources if multiple were found
        if (totalFound > 3 && (resource.rarity === 'common' || resource.rarity === 'uncommon')) {
            setTimeout(() => {
                ui.hideModal(document.getElementById('resource-found-modal'));
            }, 3000);
        }
    }

    /**
     * Safely play a sound effect
     * @param {string} soundId - ID of the sound element
     * @param {number} volume - Volume level (0.0 to 1.0)
     * @returns {boolean} - True if sound played successfully, false otherwise
     */
    playSound(soundId, volume = 1.0) {
        try {
            const sound = document.getElementById(soundId);
            if (!sound) {
                console.warn(`Sound element with ID "${soundId}" not found`);
                return false;
            }
            
            // Reset sound to beginning
            sound.currentTime = 0;
            
            // Set volume
            sound.volume = Math.max(0, Math.min(1, volume));
            
            // Play sound with error handling
            sound.play().catch(error => {
                console.warn(`Error playing sound "${soundId}":`, error);
                return false;
            });
            
            return true;
        } catch (error) {
            console.error(`Error with sound "${soundId}":`, error);
            return false;
        }
    }

    /**
     * Show danger event modal
     * @param {object} danger - Danger object
     */
    showDangerEvent(danger) {
        if (!danger) {
            console.error('No danger data provided to showDangerEvent');
            return;
        }
        
        const dangerIcon = document.getElementById('danger-icon');
        const dangerName = document.getElementById('danger-name');
        const dangerDescription = document.getElementById('danger-description');
        const dangerEffect = document.getElementById('danger-effect');
        const dangerSeverity = document.getElementById('danger-severity');
        
        if (dangerIcon) {
            dangerIcon.className = `fas ${danger.icon || 'fa-exclamation-triangle'}`;
            // Add color based on severity
            dangerIcon.style.color = this.getDangerSeverityColor(danger.severity || 'medium');
        }
        
        if (dangerName) {
            dangerName.textContent = danger.name || 'Unknown Danger';
        }
        
        if (dangerDescription) {
            dangerDescription.textContent = danger.description || 'You encountered an unknown danger!';
        }
        
        if (dangerEffect) {
            dangerEffect.textContent = danger.effect || 'Be careful!';
        }
        
        if (dangerSeverity) {
            const severity = danger.severity || 'medium';
            dangerSeverity.textContent = severity.charAt(0).toUpperCase() + severity.slice(1);
            dangerSeverity.className = `danger-severity danger-${severity}`;
        }
        
        // Add danger to alerts panel
        this.addDangerAlert(danger);
        
        // Play danger sound
        const dangerSound = document.getElementById('danger-sound');
        if (dangerSound) {
            dangerSound.currentTime = 0;
            dangerSound.play().catch(e => console.log('Error playing sound:', e));
        }
        
        // Shake screen for severe dangers
        if ((danger.severity === 'high' || danger.severity === 'extreme') && this.activeExpeditionElement) {
            this.activeExpeditionElement.classList.add('shake-animation');
            setTimeout(() => {
                this.activeExpeditionElement.classList.remove('shake-animation');
            }, 1000);
        }
        
        ui.showModal(document.getElementById('danger-modal'));
    }
    
    /**
     * Add danger alert to the alerts panel
     * @param {object} danger - Danger object
     */
    addDangerAlert(danger) {
        if (!this.dangerAlerts || !danger) return;
        
        const alertElement = document.createElement('div');
        alertElement.className = `danger-alert danger-${danger.severity || 'medium'}`;
        
        const timestamp = new Date();
        const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        alertElement.innerHTML = `
            <div class="danger-alert-time">${timeString}</div>
            <div class="danger-alert-icon"><i class="fas ${danger.icon || 'fa-exclamation-triangle'}"></i></div>
            <div class="danger-alert-name">${danger.name || 'Unknown Danger'}</div>
        `;
        
        // Add to the top of the alerts list
        this.dangerAlerts.insertBefore(alertElement, this.dangerAlerts.firstChild);
        
        // Limit the number of alerts shown
        const maxAlerts = 5;
        while (this.dangerAlerts.children.length > maxAlerts) {
            this.dangerAlerts.removeChild(this.dangerAlerts.lastChild);
        }
        
        // Auto-remove after some time
        setTimeout(() => {
            if (alertElement && alertElement.parentNode) {
                alertElement.classList.add('fade-out');
                setTimeout(() => {
                    if (alertElement && alertElement.parentNode) {
                        alertElement.parentNode.removeChild(alertElement);
                    }
                }, 500);
            }
        }, 30000); // Remove after 30 seconds
    }
    
    /**
     * Get color for danger severity
     * @param {string} severity - Danger severity (low, medium, high, extreme)
     * @returns {string} - CSS color value
     */
    getDangerSeverityColor(severity) {
        switch (severity) {
            case 'low':
                return '#4caf50'; // Green
            case 'medium':
                return '#ff9800'; // Orange
            case 'high':
                return '#f44336'; // Red
            case 'extreme':
                return '#9c27b0'; // Purple
            default:
                return '#ff9800'; // Default to orange
        }
    }

    /**
     * Show expedition result modal
     * @param {object} result - Expedition result
     */
    showExpeditionResult(result) {
        // Get DOM elements
        const resultModal = document.getElementById('expedition-result-modal');
        const resultTitle = document.getElementById('expedition-result-title');
        const resultMessage = document.getElementById('expedition-result-message');
        const resultResources = document.getElementById('expedition-result-resources');
        const resultStats = document.getElementById('expedition-result-stats');
        
        if (!resultModal || !resultTitle || !resultMessage || !resultResources || !resultStats) {
            console.error('Missing DOM elements for expedition result modal');
            return;
        }
        
        // Update modal title based on success or failure
        if (result.success) {
            resultTitle.textContent = 'Expedition Successful!';
            resultTitle.className = 'modal-title success-text';
            
            // Play success sound
            this.playSound('expedition-success-sound', 0.8);
        } else {
            resultTitle.textContent = 'Expedition Failed!';
            resultTitle.className = 'modal-title failure-text';
            
            // Play failure sound
            this.playSound('expedition-failure-sound', 0.8);
        }
        
        // Update result message
        resultMessage.textContent = result.message || (result.success ? 
            'You have successfully completed your expedition and returned safely.' : 
            'Your expedition was unsuccessful. Better luck next time.');
        
        // Clear previous resources
        resultResources.innerHTML = '';
        
        // Show collected resources summary
        if (this.collectedResources && this.collectedResources.length > 0) {
            // Create resources header
            const resourcesHeader = document.createElement('h3');
            resourcesHeader.textContent = 'Resources Collected:';
            resourcesHeader.className = 'resources-header';
            resultResources.appendChild(resourcesHeader);
            
            // Create resources list
            const resourcesList = document.createElement('ul');
            resourcesList.className = 'resources-list';
            
            // Sort resources by rarity (legendary -> common)
            const rarityOrder = { 'legendary': 0, 'epic': 1, 'rare': 2, 'uncommon': 3, 'common': 4 };
            
            const sortedResources = [...this.collectedResources].sort((a, b) => {
                // Sort by rarity first
                const rarityDiff = (rarityOrder[a.rarity] || 5) - (rarityOrder[b.rarity] || 5);
                if (rarityDiff !== 0) return rarityDiff;
                
                // Then by value (highest first)
                return (b.value || 0) - (a.value || 0);
            });
            
            // Add each resource to the list
            let totalValue = 0;
            sortedResources.forEach(resource => {
                const quantity = resource.quantity || 1;
                const value = resource.value || 0;
                const itemValue = quantity * value;
                totalValue += itemValue;
                
                const resourceItem = document.createElement('li');
                resourceItem.className = `resource-item rarity-${resource.rarity || 'common'}`;
                
                // Create resource icon if image available
                if (resource.image_url) {
                    const resourceIcon = document.createElement('img');
                    resourceIcon.src = resource.image_url;
                    resourceIcon.alt = resource.name;
                    resourceIcon.className = 'resource-icon';
                    resourceItem.appendChild(resourceIcon);
                }
                
                // Create resource info container
                const resourceInfo = document.createElement('div');
                resourceInfo.className = 'resource-info';
                
                // Resource name with rarity indicator
                const resourceName = document.createElement('span');
                resourceName.textContent = resource.name;
                resourceName.className = `resource-name rarity-text-${resource.rarity || 'common'}`;
                resourceInfo.appendChild(resourceName);
                
                // Resource quantity and value
                const resourceDetails = document.createElement('span');
                resourceDetails.textContent = `${quantity}× (${itemValue} credits)`;
                resourceDetails.className = 'resource-details';
                resourceInfo.appendChild(resourceDetails);
                
                resourceItem.appendChild(resourceInfo);
                resourcesList.appendChild(resourceItem);
            });
            
            resultResources.appendChild(resourcesList);
            
            // Add total value
            const totalValueElement = document.createElement('p');
            totalValueElement.textContent = `Total Value: ${totalValue} credits`;
            totalValueElement.className = 'total-value';
            resultResources.appendChild(totalValueElement);
        } else {
            // No resources collected
            const noResourcesMsg = document.createElement('p');
            noResourcesMsg.textContent = 'No resources were collected during this expedition.';
            noResourcesMsg.className = 'no-resources';
            resultResources.appendChild(noResourcesMsg);
        }
        
        // Show expedition stats
        resultStats.innerHTML = '';
        
        if (result.stats) {
            // Create stats list
            const statsList = document.createElement('ul');
            statsList.className = 'stats-list';
            
            // Add each stat
            const stats = [
                { label: 'Duration', value: `${result.stats.duration || 0} minutes` },
                { label: 'Resources Found', value: result.stats.resources_found || 0 },
                { label: 'Dangers Encountered', value: result.stats.dangers_encountered || 0 },
                { label: 'Dangers Survived', value: result.stats.dangers_survived || 0 },
                { label: 'Experience Gained', value: `${result.stats.xp_gained || 0} XP` }
            ];
            
            stats.forEach(stat => {
                const statItem = document.createElement('li');
                statItem.className = 'stat-item';
                
                const statLabel = document.createElement('span');
                statLabel.textContent = `${stat.label}: `;
                statLabel.className = 'stat-label';
                statItem.appendChild(statLabel);
                
                const statValue = document.createElement('span');
                statValue.textContent = stat.value;
                statValue.className = 'stat-value';
                statItem.appendChild(statValue);
                
                statsList.appendChild(statItem);
            });
            
            resultStats.appendChild(statsList);
        }
        
        // Add animation class based on result
        resultModal.classList.remove('success-animation', 'failure-animation');
        resultModal.classList.add(result.success ? 'success-animation' : 'failure-animation');
        
        // Show the modal
        ui.showModal(resultModal);
        
        // Reset collected resources after showing results
        this.clearExpedition();
        
        // Update user profile data
        ui.loadUserData();
        
        // Show appropriate toast notification
        if (result.success) {
            ui.showSuccess('Expedition completed successfully!');
            
            // Show special notification for high-value expeditions
            if (totalValue > 500) {
                setTimeout(() => {
                    ui.showSuccess(`Impressive haul! You collected resources worth ${totalValue} credits!`);
                }, 1500);
            }
        } else {
            ui.showWarning('Expedition failed. Better luck next time!');
        }
    }
}

// Create global expedition instance
const expedition = new Expedition();
