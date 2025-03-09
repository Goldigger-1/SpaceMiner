/**
 * Space Miner - Fortune Wheel Module
 * Handles fortune wheel-related functionality
 */

class FortuneWheel {
    constructor() {
        this.wheelCanvas = document.getElementById('wheel-spinner');
        this.spinBtn = document.getElementById('spin-button');
        this.spinsRemaining = document.getElementById('spins-remaining');
        this.spinCost = document.getElementById('spin-cost');
        this.wheelPrizes = document.getElementById('wheel-prizes');
        this.buySpinsButtons = document.querySelectorAll('.buy-package-btn');
        
        this.wheelCtx = null;
        this.wheelRadius = 150;
        this.wheelCenterX = 150;
        this.wheelCenterY = 150;
        this.wheelSegments = CONFIG.FORTUNE_WHEEL.SEGMENTS;
        this.isSpinning = false;
        this.rewards = [];
        this.spins = 0;
    }

    /**
     * Initialize fortune wheel module
     */
    init() {
        // Initialize canvas if available
        if (this.wheelCanvas && this.wheelCanvas.getContext) {
            this.wheelCtx = this.wheelCanvas.getContext('2d');
            this.wheelCanvas.width = 300;
            this.wheelCanvas.height = 300;
        }
        
        // Add event listeners
        if (this.spinBtn) {
            this.spinBtn.addEventListener('click', () => this.spinWheel());
        }
        
        this.buySpinsButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const packageType = event.target.getAttribute('data-package');
                this.purchaseSpins(packageType);
            });
        });
        
        // Add event listener for continue button in wheel result modal
        const wheelContinueBtn = document.getElementById('wheel-continue-btn');
        if (wheelContinueBtn) {
            wheelContinueBtn.addEventListener('click', () => {
                const resultModal = document.getElementById('wheel-result-modal');
                if (resultModal) {
                    ui.hideModal(resultModal);
                    resultModal.classList.remove('show');
                    resultModal.style.display = 'none';
                }
            });
        }
        
        // Load fortune wheel rewards
        this.loadFortuneWheelRewards();
    }

    /**
     * Load fortune wheel rewards
     */
    async loadFortuneWheelRewards() {
        try {
            ui.showLoadingScreen();
            
            const data = await api.getFortuneWheelRewards();
            this.rewards = data.rewards || [];
            this.spins = data.spins || 0;
            
            // Update spins remaining
            if (this.spinsRemaining) {
                this.spinsRemaining.textContent = this.spins;
            }
            
            // Update spin cost
            if (this.spinCost && data.spin_cost) {
                this.spinCost.textContent = data.spin_cost;
            }
            
            // Render wheel
            this.drawWheel();
            
            // Render prizes list
            this.renderPrizesList();
            
            ui.hideLoadingScreen();
        } catch (error) {
            ui.hideLoadingScreen();
            console.error('Error loading fortune wheel rewards:', error);
            ui.showError('Failed to load fortune wheel rewards');
        }
    }

    /**
     * Draw the fortune wheel
     */
    drawWheel() {
        if (!this.wheelCanvas || !this.wheelCtx || !this.rewards || this.rewards.length === 0) {
            console.error('Cannot draw wheel: missing canvas, context, or rewards');
            return;
        }
        
        const centerX = this.wheelCenterX;
        const centerY = this.wheelCenterY;
        const radius = this.wheelRadius;
        const segmentCount = this.rewards.length;
        const segmentAngle = 2 * Math.PI / segmentCount;
        
        // Draw wheel background
        this.wheelCtx.beginPath();
        this.wheelCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.wheelCtx.fillStyle = '#333';
        this.wheelCtx.fill();
        this.wheelCtx.lineWidth = 2;
        this.wheelCtx.strokeStyle = '#555';
        this.wheelCtx.stroke();
        
        // Draw segments
        for (let i = 0; i < segmentCount; i++) {
            const segment = this.rewards[i];
            const startAngle = i * segmentAngle;
            const endAngle = (i + 1) * segmentAngle;
            
            // Draw segment
            this.wheelCtx.beginPath();
            this.wheelCtx.moveTo(centerX, centerY);
            this.wheelCtx.arc(centerX, centerY, radius, startAngle, endAngle);
            this.wheelCtx.closePath();
            
            // Set segment color based on rarity
            const segmentColor = this.getSegmentColor(segment.rarity || 'common');
            this.wheelCtx.fillStyle = segmentColor;
            this.wheelCtx.fill();
            
            this.wheelCtx.lineWidth = 1;
            this.wheelCtx.strokeStyle = '#fff';
            this.wheelCtx.stroke();
            
            // Draw segment content
            this.drawSegmentContent(segment, startAngle, endAngle, radius);
        }
        
        // Draw center circle
        this.wheelCtx.beginPath();
        this.wheelCtx.arc(centerX, centerY, radius * 0.1, 0, 2 * Math.PI);
        this.wheelCtx.fillStyle = '#fff';
        this.wheelCtx.fill();
        this.wheelCtx.lineWidth = 2;
        this.wheelCtx.strokeStyle = '#555';
        this.wheelCtx.stroke();
    }
    
    /**
     * Draw segment content
     * @param {object} segment - Segment data
     * @param {number} startAngle - Start angle
     * @param {number} endAngle - End angle
     * @param {number} radius - Wheel radius
     */
    drawSegmentContent(segment, startAngle, endAngle, radius) {
        if (!this.wheelCtx) return;
        
        const centerX = this.wheelCenterX;
        const centerY = this.wheelCenterY;
        const midAngle = (startAngle + endAngle) / 2;
        const textRadius = radius * 0.75;
        const textX = centerX + Math.cos(midAngle) * textRadius;
        const textY = centerY + Math.sin(midAngle) * textRadius;
        
        // Save context
        this.wheelCtx.save();
        
        // Rotate text
        this.wheelCtx.translate(textX, textY);
        this.wheelCtx.rotate(midAngle + Math.PI / 2);
        
        // Draw text
        this.wheelCtx.fillStyle = '#fff';
        this.wheelCtx.font = 'bold 14px Arial';
        this.wheelCtx.textAlign = 'center';
        this.wheelCtx.textBaseline = 'middle';
        
        // Truncate text if too long
        const segmentName = segment.name || 'Prize';
        const maxLength = 10;
        const displayText = segmentName.length > maxLength ? 
            segmentName.substring(0, maxLength) + '...' : 
            segmentName;
            
        this.wheelCtx.fillText(displayText, 0, 0);
        
        // Restore context
        this.wheelCtx.restore();
    }
    
    /**
     * Get segment color based on rarity
     * @param {string} rarity - Rarity level
     * @returns {string} - Color hex code
     */
    getSegmentColor(rarity) {
        const colors = {
            common: '#6c757d',
            uncommon: '#28a745',
            rare: '#007bff',
            epic: '#6f42c1',
            legendary: '#ffc107',
            mythic: '#dc3545'
        };
        
        return colors[rarity] || colors.common;
    }

    /**
     * Render prizes list
     */
    renderPrizesList() {
        if (!this.wheelPrizes || !this.rewards || this.rewards.length === 0) return;
        
        this.wheelPrizes.innerHTML = '';
        
        // Group rewards by rarity
        const groupedRewards = this.groupRewardsByRarity();
        
        // Render grouped rewards
        Object.entries(groupedRewards).forEach(([rarity, rewards]) => {
            const rarityHeading = document.createElement('h4');
            rarityHeading.className = `rarity-heading rarity-${rarity.toLowerCase()}`;
            rarityHeading.textContent = rarity;
            this.wheelPrizes.appendChild(rarityHeading);
            
            const rewardsContainer = document.createElement('div');
            rewardsContainer.className = 'prizes-container';
            
            rewards.forEach(reward => {
                const prizeItem = document.createElement('div');
                prizeItem.className = `prize-item rarity-${rarity.toLowerCase()}`;
                prizeItem.innerHTML = `
                    <div class="prize-icon">
                        <img src="${reward.image_url || 'assets/items/default-reward.png'}" alt="${reward.name}">
                    </div>
                    <div class="prize-info">
                        <div class="prize-name">${reward.name}</div>
                        <div class="prize-chance">${Math.round(reward.probability * 100)}% chance</div>
                    </div>
                `;
                rewardsContainer.appendChild(prizeItem);
            });
            
            this.wheelPrizes.appendChild(rewardsContainer);
        });
    }

    /**
     * Group rewards by rarity
     * @returns {Object} Grouped rewards
     */
    groupRewardsByRarity() {
        const rarityMap = {
            [CONFIG.GAME.RARITY.COMMON]: 'Common',
            [CONFIG.GAME.RARITY.UNCOMMON]: 'Uncommon',
            [CONFIG.GAME.RARITY.RARE]: 'Rare',
            [CONFIG.GAME.RARITY.EPIC]: 'Epic',
            [CONFIG.GAME.RARITY.LEGENDARY]: 'Legendary'
        };
        
        return this.rewards.reduce((groups, reward) => {
            const rarity = rarityMap[reward.rarity] || 'Common';
            if (!groups[rarity]) {
                groups[rarity] = [];
            }
            groups[rarity].push(reward);
            return groups;
        }, {});
    }

    /**
     * Spin the wheel
     * @param {string} paymentType - Payment type ('premium' or 'real')
     */
    async spinWheel(paymentType = 'premium') {
        if (this.isSpinning) {
            ui.showError('Wheel is already spinning');
            return;
        }
        
        if (this.spins <= 0) {
            ui.showError('No spins remaining. Purchase more spins to continue.');
            return;
        }
        
        try {
            this.isSpinning = true;
            
            // Disable spin button
            if (this.spinBtn) {
                this.spinBtn.disabled = true;
            }
            
            // Get spin result from API
            const result = await api.spinFortuneWheel(paymentType);
            
            if (!result || !result.reward) {
                throw new Error('Invalid spin result received from server');
            }
            
            // Ensure segment index is valid
            const segmentIndex = result.segment_index !== undefined ? 
                result.segment_index : 
                Math.floor(Math.random() * (this.rewards.length || 8));
            
            // Animate wheel spin
            this.animateWheelSpin(segmentIndex, () => {
                // Update spins remaining
                this.spins--;
                if (this.spinsRemaining) {
                    this.spinsRemaining.textContent = this.spins;
                }
                
                // Show reward modal
                this.showRewardModal(result.reward);
                
                // Re-enable spin button
                if (this.spinBtn) {
                    this.spinBtn.disabled = false;
                }
                
                this.isSpinning = false;
            });
        } catch (error) {
            console.error('Error spinning wheel:', error);
            ui.showError(error.message || 'Failed to spin the wheel');
            
            // Re-enable spin button
            if (this.spinBtn) {
                this.spinBtn.disabled = false;
            }
            
            this.isSpinning = false;
        }
    }

    /**
     * Animate wheel spin
     * @param {number} segmentIndex - Segment index to land on
     * @param {function} callback - Callback function after animation
     */
    animateWheelSpin(segmentIndex, callback) {
        const spinDuration = CONFIG.FORTUNE_WHEEL.SPIN_DURATION || 3000; // Default to 3 seconds if not defined
        const startTime = Date.now();
        const startAngle = 0;
        const segmentCount = this.rewards.length || 8;
        const spinAngle = 1440 + (segmentIndex * (360 / segmentCount)); // Multiple full rotations + landing segment
        
        // Ensure we have the wheel canvas and context
        if (!this.wheelCanvas || !this.wheelCtx) {
            this.wheelCanvas = document.getElementById('wheel-spinner');
            if (!this.wheelCanvas) {
                console.error('Fortune wheel canvas not found');
                if (callback && typeof callback === 'function') {
                    callback();
                }
                return;
            }
            
            this.wheelCtx = this.wheelCanvas.getContext('2d');
            // Set canvas dimensions if not already set
            if (this.wheelCanvas.width === 0 || this.wheelCanvas.height === 0) {
                this.wheelCanvas.width = 300;
                this.wheelCanvas.height = 300;
            }
            this.wheelRadius = this.wheelCanvas.width / 2;
            this.wheelCenterX = this.wheelRadius;
            this.wheelCenterY = this.wheelRadius;
        }
        
        const animate = () => {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / spinDuration, 1);
            
            // Easing function for slowing down
            const easeOut = (t) => 1 - Math.pow(1 - t, 3);
            const easedProgress = easeOut(progress);
            
            // Calculate current angle
            const currentAngle = startAngle + (spinAngle * easedProgress);
            
            // Rotate wheel
            if (this.wheelCtx) {
                this.wheelCtx.clearRect(0, 0, this.wheelCanvas.width, this.wheelCanvas.height);
                this.wheelCtx.save();
                this.wheelCtx.translate(this.wheelCenterX, this.wheelCenterY);
                this.wheelCtx.rotate(currentAngle * Math.PI / 180);
                this.wheelCtx.translate(-this.wheelCenterX, -this.wheelCenterY);
                this.drawWheel();
                this.wheelCtx.restore();
                
                // Add visual indicator for spinning
                if (progress < 1) {
                    this.wheelCtx.save();
                    this.wheelCtx.font = 'bold 14px Arial';
                    this.wheelCtx.fillStyle = '#ffffff';
                    this.wheelCtx.textAlign = 'center';
                    this.wheelCtx.textBaseline = 'middle';
                    this.wheelCtx.fillText('Spinning...', this.wheelCenterX, this.wheelCenterY + this.wheelRadius + 30);
                    this.wheelCtx.restore();
                }
            }
            
            // Continue animation or finish
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Play sound effect when wheel stops
                const audio = new Audio('/assets/sounds/wheel-stop.mp3');
                audio.volume = 0.5;
                audio.play().catch(err => console.log('Audio play failed:', err));
                
                if (callback && typeof callback === 'function') {
                    callback();
                }
            }
        };
        
        // Play sound effect when wheel starts spinning
        const audio = new Audio('/assets/sounds/wheel-spin.mp3');
        audio.volume = 0.3;
        audio.play().catch(err => console.log('Audio play failed:', err));
        
        animate();
    }

    /**
     * Show reward modal
     * @param {object} reward - Reward object
     */
    showRewardModal(reward) {
        if (!reward) {
            console.error('No reward data provided to showRewardModal');
            return;
        }
        
        const wheelPrizeName = document.getElementById('wheel-prize-name');
        const wheelPrizeDescription = document.getElementById('wheel-prize-description');
        const wheelPrizeImage = document.getElementById('wheel-prize-image');
        const wheelPrizeValue = document.getElementById('wheel-prize-value');
        
        if (wheelPrizeName) wheelPrizeName.textContent = reward.name || 'Mystery Prize';
        if (wheelPrizeDescription) wheelPrizeDescription.textContent = reward.description || 'You won a special prize!';
        if (wheelPrizeImage && wheelPrizeImage.setAttribute) {
            wheelPrizeImage.src = reward.image_url || 'assets/items/default-reward.png';
        }
        
        // Set value based on reward type
        if (wheelPrizeValue) {
            if (reward.type === 'currency') {
                wheelPrizeValue.innerHTML = `<i class="fas fa-coins"></i> ${reward.value || 0}`;
            } else if (reward.type === 'premium_currency') {
                wheelPrizeValue.innerHTML = `<i class="fas fa-gem"></i> ${reward.value || 0}`;
            } else {
                wheelPrizeValue.textContent = reward.value_description || 'Special item';
            }
        }
        
        const resultModal = document.getElementById('wheel-result-modal');
        if (resultModal) {
            ui.showModal(resultModal);
        } else {
            console.error('Wheel result modal not found');
        }
        
        // Reload user data to update currency
        ui.loadUserData();
    }

    /**
     * Purchase spins
     * @param {string} packageType - Package type ('single', 'five', 'ten')
     */
    async purchaseSpins(packageType) {
        try {
            ui.showLoadingScreen();
            
            await api.purchaseSpins(packageType);
            
            // Reload fortune wheel data
            await this.loadFortuneWheelRewards();
            
            ui.hideLoadingScreen();
            ui.showSuccess('Spins purchased successfully!');
        } catch (error) {
            ui.hideLoadingScreen();
            console.error('Error purchasing spins:', error);
            ui.showError(error.message || 'Failed to purchase spins');
        }
    }
}

// Create global fortune wheel instance
const fortuneWheel = new FortuneWheel();
