/**
 * Space Miner - Planets Module
 * Handles planet-related functionality
 */

class Planets {
    constructor() {
        this.planetsList = document.getElementById('planets-list');
        this.planetsData = [];
    }

    /**
     * Initialize planets module
     */
    async init() {
        try {
            // Load planets data
            this.planetsData = await api.getPlanets();
            this.renderPlanets();
            
            // Add event listeners for planet selection
            this.planetsList.addEventListener('click', (event) => {
                const planetCard = event.target.closest('.planet-card');
                if (planetCard) {
                    const planetId = planetCard.getAttribute('data-planet-id');
                    this.showPlanetDetails(planetId);
                }
            });
        } catch (error) {
            console.error('Error initializing planets:', error);
            ui.showError('Failed to load planets');
        }
    }

    /**
     * Render planets list
     */
    renderPlanets() {
        if (!this.planetsList || !this.planetsData.length) return;
        
        this.planetsList.innerHTML = '';
        
        this.planetsData.forEach(planet => {
            const planetCard = document.createElement('div');
            planetCard.className = 'planet-card';
            planetCard.setAttribute('data-planet-id', planet.id);
            
            // Create planet image with rotation animation
            const planetImage = document.createElement('div');
            planetImage.className = 'planet-image';
            planetImage.innerHTML = `<img src="${planet.image_url || 'assets/planets/default-planet.png'}" alt="${planet.name}">`;
            
            // Create planet info
            const planetInfo = document.createElement('div');
            planetInfo.className = 'planet-info';
            planetInfo.innerHTML = `
                <h3>${planet.name}</h3>
                <div class="planet-difficulty">
                    <span>Difficulty: </span>
                    <span class="difficulty-level">${this.getDifficultyStars(planet.difficulty)}</span>
                </div>
            `;
            
            planetCard.appendChild(planetImage);
            planetCard.appendChild(planetInfo);
            this.planetsList.appendChild(planetCard);
        });
    }

    /**
     * Get difficulty stars based on difficulty level
     * @param {number} difficulty - Difficulty level (1-5)
     * @returns {string} HTML string with stars
     */
    getDifficultyStars(difficulty) {
        const maxStars = 5;
        let stars = '';
        
        for (let i = 1; i <= maxStars; i++) {
            if (i <= difficulty) {
                stars += '<i class="fas fa-star"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        
        return stars;
    }

    /**
     * Show planet details modal
     * @param {number} planetId - Planet ID
     */
    showPlanetDetails(planetId) {
        const planet = this.planetsData.find(p => p.id == planetId);
        if (!planet) return;
        
        // Update modal content
        document.getElementById('modal-planet-name').textContent = planet.name;
        document.getElementById('modal-planet-image').src = planet.image_url || 'assets/planets/default-planet.png';
        document.getElementById('modal-planet-description').textContent = planet.description;
        document.getElementById('modal-planet-difficulty').innerHTML = this.getDifficultyStars(planet.difficulty);
        document.getElementById('modal-planet-time').textContent = `${planet.base_time} minutes`;
        document.getElementById('modal-planet-multiplier').textContent = `${planet.resource_multiplier}x`;
        document.getElementById('modal-planet-danger').textContent = this.getDangerLevel(planet.danger_level);
        
        // Update resources list
        const resourcesList = document.getElementById('modal-planet-resources');
        resourcesList.innerHTML = '';
        
        if (planet.resources && planet.resources.length > 0) {
            planet.resources.forEach(resource => {
                const resourceItem = document.createElement('div');
                resourceItem.className = 'resource-item';
                resourceItem.innerHTML = `
                    <div class="resource-name">${resource.name}</div>
                    <div class="resource-rarity">${this.getRarityLabel(resource.rarity)}</div>
                `;
                resourcesList.appendChild(resourceItem);
            });
        } else {
            resourcesList.innerHTML = '<div class="no-resources">No known resources</div>';
        }
        
        // Update dangers list
        const dangersList = document.getElementById('modal-planet-dangers');
        dangersList.innerHTML = '';
        
        if (planet.dangers && planet.dangers.length > 0) {
            planet.dangers.forEach(danger => {
                const dangerItem = document.createElement('div');
                dangerItem.className = 'danger-item';
                dangerItem.innerHTML = `
                    <div class="danger-name">${danger.name}</div>
                    <div class="danger-probability">${Math.round(danger.probability * 100)}% chance</div>
                `;
                dangersList.appendChild(dangerItem);
            });
        } else {
            dangersList.innerHTML = '<div class="no-dangers">No known dangers</div>';
        }
        
        // Set planet ID for start expedition button
        const startExpeditionBtn = document.getElementById('start-expedition-btn');
        startExpeditionBtn.setAttribute('data-planet-id', planet.id);
        
        // Show modal
        ui.showModal(document.getElementById('planet-details-modal'));
    }

    /**
     * Get danger level label
     * @param {number} level - Danger level (1-5)
     * @returns {string} Danger level label
     */
    getDangerLevel(level) {
        const levels = {
            1: 'Very Low',
            2: 'Low',
            3: 'Medium',
            4: 'High',
            5: 'Extreme'
        };
        
        return levels[level] || 'Unknown';
    }

    /**
     * Get rarity label
     * @param {number} rarity - Rarity level
     * @returns {string} Rarity label
     */
    getRarityLabel(rarity) {
        const rarities = {
            [CONFIG.GAME.RARITY.COMMON]: 'Common',
            [CONFIG.GAME.RARITY.UNCOMMON]: 'Uncommon',
            [CONFIG.GAME.RARITY.RARE]: 'Rare',
            [CONFIG.GAME.RARITY.EPIC]: 'Epic',
            [CONFIG.GAME.RARITY.LEGENDARY]: 'Legendary'
        };
        
        return rarities[rarity] || 'Unknown';
    }
}

// Create global planets instance
const planets = new Planets();
