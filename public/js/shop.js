/**
 * Space Miner - Shop Module
 * Handles shop-related functionality
 */

class Shop {
    constructor() {
        this.shopItems = document.getElementById('shop-items');
        this.categoryButtons = document.querySelectorAll('.shop-categories .category-btn');
        this.currentCategory = 'spaceship';
        this.items = [];
    }

    /**
     * Initialize shop module
     * @returns {Promise} - Promise that resolves when initialization is complete
     */
    async init() {
        try {
            console.log('Initializing shop module...');
            
            // Add event listeners for category buttons
            this.categoryButtons.forEach(button => {
                button.addEventListener('click', (event) => {
                    const category = event.target.getAttribute('data-category');
                    this.loadShopItems(category);
                    
                    // Update active button
                    this.categoryButtons.forEach(btn => btn.classList.remove('active'));
                    event.target.classList.add('active');
                });
            });
            
            // Add event listener for confirm purchase button
            const confirmPurchaseBtn = document.getElementById('confirm-purchase-btn');
            if (confirmPurchaseBtn) {
                confirmPurchaseBtn.addEventListener('click', () => this.confirmPurchase());
            }
            
            // Load initial shop items
            try {
                await this.loadShopItems(this.currentCategory);
            } catch (loadError) {
                console.error('Failed to load initial shop items:', loadError);
                // Continue initialization even if loading shop items fails
                this.items = [];
            }
            
            console.log('Shop module initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing shop module:', error);
            // Don't throw here, just log the error
            // This allows the game to continue loading even if shop fails
            this.items = [];
            return false;
        }
    }

    /**
     * Load shop items for a category
     * @param {string} category - Item category
     */
    async loadShopItems(category) {
        try {
            ui.showLoadingScreen();
            
            this.currentCategory = category;
            console.log(`Loading shop items for category: ${category}`);
            
            try {
                this.items = await api.getShopItems(category);
                console.log(`Received ${this.items.length} items for category ${category}`);
            } catch (apiError) {
                console.error(`API error loading shop items for ${category}:`, apiError);
                this.items = [];
                ui.showError(`Failed to load shop items: ${apiError.message || 'Unknown error'}`);
            }
            
            this.renderShopItems();
            ui.hideLoadingScreen();
        } catch (error) {
            ui.hideLoadingScreen();
            console.error('Error in loadShopItems:', error);
            ui.showError('Failed to load shop items');
        }
    }

    /**
     * Render shop items
     */
    renderShopItems() {
        if (!this.shopItems) {
            console.error('Shop items container not found');
            return;
        }
        
        this.shopItems.innerHTML = '';
        
        if (!this.items || this.items.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-shop';
            emptyMessage.textContent = `No items available in the ${this.currentCategory} category.`;
            
            this.shopItems.appendChild(emptyMessage);
            return;
        }
        
        try {
            this.items.forEach(item => {
                if (!item) {
                    console.warn('Undefined item in shop items array');
                    return;
                }
                
                try {
                    const itemElement = this.createItemElement(item);
                    this.shopItems.appendChild(itemElement);
                } catch (itemError) {
                    console.error('Error creating item element:', itemError, item);
                }
            });
        } catch (renderError) {
            console.error('Error rendering shop items:', renderError);
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = 'Error rendering shop items. Please try again.';
            this.shopItems.appendChild(errorMessage);
        }
    }

    /**
     * Create shop item element
     * @param {object} item - Shop item
     * @returns {HTMLElement} Item element
     */
    createItemElement(item) {
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        itemElement.setAttribute('data-item-id', item.id);
        
        // Check if item is owned
        const isOwned = item.owned;
        
        itemElement.innerHTML = `
            <div class="item-image">
                <img src="${item.image_url || 'assets/items/default-item.png'}" alt="${item.name}">
                ${isOwned ? '<div class="owned-badge">Owned</div>' : ''}
            </div>
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-description">${item.description}</div>
                <div class="item-boost">
                    <span>Boost: </span>
                    <span>${this.getBoostText(item)}</span>
                </div>
                <div class="item-price">
                    ${this.getPriceHTML(item)}
                </div>
            </div>
            <div class="item-actions">
                ${isOwned ? 
                    '<button class="action-button owned-btn" disabled>Owned</button>' : 
                    `<button class="action-button buy-btn" data-item-id="${item.id}">
                        <i class="fas fa-shopping-cart"></i>
                        <span>Buy</span>
                    </button>`
                }
            </div>
        `;
        
        // Add click event for buy button
        if (!isOwned) {
            const buyBtn = itemElement.querySelector('.buy-btn');
            if (buyBtn) {
                buyBtn.addEventListener('click', () => this.showPurchaseModal(item));
            }
        }
        
        return itemElement;
    }

    /**
     * Show purchase modal
     * @param {object} item - Shop item
     */
    showPurchaseModal(item) {
        const purchaseTitle = document.getElementById('purchase-title');
        const purchaseImage = document.getElementById('purchase-image');
        const purchaseDescription = document.getElementById('purchase-description');
        const purchasePriceValue = document.getElementById('purchase-price-value');
        const purchaseBoostValue = document.getElementById('purchase-boost-value');
        const confirmPurchaseBtn = document.getElementById('confirm-purchase-btn');
        
        if (purchaseTitle) purchaseTitle.textContent = item.name;
        if (purchaseImage) purchaseImage.src = item.image_url || 'assets/items/default-item.png';
        if (purchaseDescription) purchaseDescription.textContent = item.description;
        if (purchasePriceValue) purchasePriceValue.innerHTML = this.getPriceHTML(item);
        if (purchaseBoostValue) purchaseBoostValue.textContent = this.getBoostText(item);
        
        // Set item ID for purchase button
        if (confirmPurchaseBtn) {
            confirmPurchaseBtn.setAttribute('data-item-id', item.id);
        }
        
        ui.showModal(document.getElementById('purchase-modal'));
    }

    /**
     * Confirm purchase
     */
    async confirmPurchase() {
        const confirmPurchaseBtn = document.getElementById('confirm-purchase-btn');
        const itemId = confirmPurchaseBtn.getAttribute('data-item-id');
        
        if (!itemId) {
            ui.showError('Invalid item selected');
            return;
        }
        
        try {
            ui.showLoadingScreen();
            
            await api.purchaseItem(itemId);
            
            // Hide purchase modal
            ui.hideModal(document.getElementById('purchase-modal'));
            
            // Reload shop items
            this.loadShopItems(this.currentCategory);
            
            // Reload user data to update currency and stats
            ui.loadUserData();
            
            ui.hideLoadingScreen();
            ui.showSuccess('Item purchased successfully!');
        } catch (error) {
            ui.hideLoadingScreen();
            console.error('Error purchasing item:', error);
            ui.showError(error.message || 'Failed to purchase item');
        }
    }

    /**
     * Get boost text based on item type
     * @param {object} item - Shop item
     * @returns {string} Boost text
     */
    getBoostText(item) {
        switch (item.type) {
            case 'spaceship':
                return `Return Speed +${Math.round((item.boost - 1) * 100)}%`;
            case 'storage':
                return `Storage Capacity +${item.boost} units`;
            case 'suit':
                return `Suit Autonomy +${Math.round((item.boost - 1) * 100)}%`;
            case 'drone':
                return `Resource Collection +${Math.round(item.boost * 100)}%`;
            case 'insurance':
                return `Recovery Rate +${Math.round(item.boost * 100)}%`;
            case 'season_pass':
                return `Exclusive Rewards & Missions`;
            default:
                return item.boost_description || 'No boost';
        }
    }

    /**
     * Get price HTML
     * @param {object} item - Shop item
     * @returns {string} Price HTML
     */
    getPriceHTML(item) {
        if (item.premium_price) {
            return `<i class="fas fa-gem"></i> ${item.premium_price}`;
        } else {
            return `<i class="fas fa-coins"></i> ${item.price}`;
        }
    }
}

// Create global shop instance
const shop = new Shop();
