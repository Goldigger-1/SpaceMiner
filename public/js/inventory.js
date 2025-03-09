/**
 * Space Miner - Inventory Module
 * Handles inventory-related functionality
 */

class Inventory {
    constructor() {
        this.inventoryGrid = document.getElementById('inventory-grid');
        this.filterButtons = document.querySelectorAll('.inventory-filters .filter-btn');
        this.inventoryItems = [];
        this.currentFilter = 'all';
    }

    /**
     * Initialize inventory module
     */
    init() {
        // Add event listeners for filter buttons
        this.filterButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const filter = event.target.getAttribute('data-filter');
                this.filterInventory(filter);
                
                // Update active button
                this.filterButtons.forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
            });
        });
        
        // Load inventory
        this.loadInventory();
    }

    /**
     * Load inventory items
     */
    async loadInventory() {
        try {
            ui.showLoadingScreen();
            
            this.inventoryItems = await api.getInventory();
            this.renderInventory();
            
            ui.hideLoadingScreen();
        } catch (error) {
            ui.hideLoadingScreen();
            console.error('Error loading inventory:', error);
            ui.showError('Failed to load inventory');
        }
    }

    /**
     * Render inventory items
     */
    renderInventory() {
        if (!this.inventoryGrid) return;
        
        this.inventoryGrid.innerHTML = '';
        
        // Filter items based on current filter
        const filteredItems = this.filterItems(this.inventoryItems, this.currentFilter);
        
        if (filteredItems.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-inventory';
            emptyMessage.textContent = this.currentFilter === 'all' ? 
                'Your inventory is empty. Go on expeditions to collect resources!' : 
                `You don't have any ${this.currentFilter} resources.`;
            
            this.inventoryGrid.appendChild(emptyMessage);
            return;
        }
        
        // Group items by type
        const groupedItems = this.groupItemsByType(filteredItems);
        
        // Render grouped items
        Object.entries(groupedItems).forEach(([type, items]) => {
            const typeHeading = document.createElement('h3');
            typeHeading.className = 'inventory-type-heading';
            typeHeading.textContent = this.capitalizeFirstLetter(type);
            this.inventoryGrid.appendChild(typeHeading);
            
            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'inventory-items-container';
            
            items.forEach(item => {
                const itemElement = this.createItemElement(item);
                itemsContainer.appendChild(itemElement);
            });
            
            this.inventoryGrid.appendChild(itemsContainer);
        });
    }

    /**
     * Create inventory item element
     * @param {object} item - Inventory item
     * @returns {HTMLElement} Item element
     */
    createItemElement(item) {
        const itemElement = document.createElement('div');
        itemElement.className = `inventory-item rarity-${item.rarity}`;
        itemElement.setAttribute('data-item-id', item.id);
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${item.image_url || 'assets/resources/default-resource.png'}" alt="${item.name}">
            </div>
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-quantity">x${item.quantity}</div>
                <div class="item-value">${item.value} coins each</div>
            </div>
        `;
        
        // Add click event to show item details
        itemElement.addEventListener('click', () => this.showItemDetails(item));
        
        return itemElement;
    }

    /**
     * Show item details
     * @param {object} item - Inventory item
     */
    showItemDetails(item) {
        // Create modal dynamically
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'item-details-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <div class="item-details">
                    <h2>${item.name}</h2>
                    <div class="item-image">
                        <img src="${item.image_url || 'assets/resources/default-resource.png'}" alt="${item.name}">
                    </div>
                    <p>${item.description || 'No description available.'}</p>
                    <div class="item-stats">
                        <div class="stat-item">
                            <span class="stat-label">Type:</span>
                            <span class="stat-value">${this.capitalizeFirstLetter(item.type)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Rarity:</span>
                            <span class="stat-value">${this.getRarityLabel(item.rarity)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Quantity:</span>
                            <span class="stat-value">${item.quantity}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Value:</span>
                            <span class="stat-value">${item.value} coins each</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Total Value:</span>
                            <span class="stat-value">${item.value * item.quantity} coins</span>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="action-button sell-btn" data-item-id="${item.id}">
                            <i class="fas fa-coins"></i>
                            <span>Sell</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        document.body.appendChild(modal);
        
        // Show modal
        ui.showModal(modal);
        
        // Add event listener for close button
        const closeButton = modal.querySelector('.close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                ui.hideModal(modal);
                // Remove modal from DOM after hiding
                setTimeout(() => {
                    if (document.body.contains(modal)) {
                        document.body.removeChild(modal);
                    }
                }, 300);
            });
        }
        
        // Add event listener for sell button
        const sellButton = modal.querySelector('.sell-btn');
        if (sellButton) {
            sellButton.addEventListener('click', async () => {
                try {
                    // Disable sell button to prevent multiple clicks
                    sellButton.disabled = true;
                    sellButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Selling...';
                    
                    ui.showLoadingScreen();
                    
                    await api.sellItem(item.id);
                    
                    // Hide modal
                    ui.hideModal(modal);
                    
                    // Reload inventory
                    this.loadInventory();
                    
                    // Reload user data to update currency
                    ui.loadUserData();
                    
                    ui.hideLoadingScreen();
                    ui.showSuccess(`Sold ${item.name} for ${item.value * item.quantity} coins!`);
                    
                    // Remove modal from DOM
                    if (document.body.contains(modal)) {
                        document.body.removeChild(modal);
                    }
                } catch (error) {
                    // Re-enable sell button
                    sellButton.disabled = false;
                    sellButton.innerHTML = '<i class="fas fa-coins"></i><span>Sell</span>';
                    
                    ui.hideLoadingScreen();
                    console.error('Error selling item:', error);
                    ui.showError(error.message || 'Failed to sell item');
                }
            });
        }
    }

    /**
     * Filter inventory
     * @param {string} filter - Filter to apply
     */
    filterInventory(filter) {
        this.currentFilter = filter;
        this.renderInventory();
    }

    /**
     * Filter items based on filter
     * @param {Array} items - Items to filter
     * @param {string} filter - Filter to apply
     * @returns {Array} Filtered items
     */
    filterItems(items, filter) {
        if (filter === 'all') return items;
        
        const rarityMap = {
            'common': CONFIG.GAME.RARITY.COMMON,
            'uncommon': CONFIG.GAME.RARITY.UNCOMMON,
            'rare': CONFIG.GAME.RARITY.RARE,
            'epic': CONFIG.GAME.RARITY.EPIC,
            'legendary': CONFIG.GAME.RARITY.LEGENDARY
        };
        
        return items.filter(item => item.rarity === rarityMap[filter]);
    }

    /**
     * Group items by type
     * @param {Array} items - Items to group
     * @returns {Object} Grouped items
     */
    groupItemsByType(items) {
        return items.reduce((groups, item) => {
            const type = item.type || 'resource';
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(item);
            return groups;
        }, {});
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

    /**
     * Capitalize first letter of string
     * @param {string} string - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

// Create global inventory instance
const inventory = new Inventory();
