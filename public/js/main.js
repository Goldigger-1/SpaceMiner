/**
 * Space Miner - Main Application
 * Initializes all modules and handles application startup
 */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Add event listener for start expedition button
        const startExpeditionBtn = document.getElementById('start-expedition-btn');
        if (startExpeditionBtn) {
            startExpeditionBtn.addEventListener('click', () => expedition.startExpedition());
        }
        
        // Show loading screen immediately
        ui.showLoadingScreen();
        
        // Check for Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
            // Initialize Telegram WebApp
            const webApp = window.Telegram.WebApp;
            webApp.ready();
            
            // Handle authentication
            try {
                console.log('Attempting Telegram authentication...');
                
                // Store Telegram initData in localStorage for future use
                if (webApp.initData) {
                    try {
                        localStorage.setItem('telegramInitData', webApp.initData);
                        console.log('Stored Telegram initData in localStorage');
                    } catch (storageError) {
                        console.warn('Failed to store Telegram initData in localStorage:', storageError);
                    }
                }
                
                // Use the WebApp user data directly
                if (webApp.initDataUnsafe && webApp.initDataUnsafe.user) {
                    const user = webApp.initDataUnsafe.user;
                    console.log('Telegram user data found:', user);
                    
                    try {
                        // Authenticate with user data
                        const authResult = await api.authenticateTelegram(webApp.initData);
                        console.log('Authenticated with Telegram successfully:', authResult);
                        
                        // Initialize modules after authentication
                        await initializeGame();
                    } catch (authError) {
                        console.error('Authentication error:', authError);
                        ui.hideLoadingScreen();
                        ui.showError('Failed to authenticate with Telegram: ' + authError.message);
                        
                        // Try to recover by checking if we have a stored token
                        const storedToken = localStorage.getItem('token');
                        if (storedToken) {
                            console.log('Attempting to recover with stored token...');
                            try {
                                api.setToken(storedToken);
                                // Verify the token works
                                await api.request('/auth/ping');
                                console.log('Recovery successful, initializing game...');
                                await initializeGame();
                            } catch (recoveryError) {
                                console.error('Recovery failed:', recoveryError);
                                showLoginPrompt();
                            }
                        } else {
                            showLoginPrompt();
                        }
                    }
                } else {
                    console.error('No Telegram user data found in WebApp');
                    ui.hideLoadingScreen();
                    ui.showError('Failed to get Telegram user data');
                    showLoginPrompt();
                }
            } catch (error) {
                console.error('Error authenticating with Telegram:', error);
                ui.hideLoadingScreen();
                ui.showError('Failed to authenticate with Telegram: ' + error.message);
                showLoginPrompt();
            }
            
            // Set up back button handler
            webApp.BackButton.onClick(() => {
                if (ui.currentTab !== 'home') {
                    ui.showTab('home');
                    webApp.BackButton.hide();
                }
            });
            
            // Show back button when not on home tab
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tab = btn.getAttribute('data-tab');
                    if (tab !== 'home') {
                        webApp.BackButton.show();
                    } else {
                        webApp.BackButton.hide();
                    }
                });
            });
        } else {
            // Web browser authentication (for development)
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('token');
                
                if (token) {
                    await api.authenticateWithToken(token);
                    console.log('Authenticated with token');
                    await initializeGame();
                } else {
                    // Check if we have a stored token
                    const storedToken = localStorage.getItem('token');
                    if (storedToken) {
                        console.log('Found stored token, attempting to authenticate...');
                        try {
                            api.setToken(storedToken);
                            // Verify the token works
                            await api.request('/auth/ping');
                            console.log('Authentication with stored token successful');
                            await initializeGame();
                        } catch (tokenError) {
                            console.error('Stored token invalid:', tokenError);
                            ui.hideLoadingScreen();
                            showLoginPrompt();
                        }
                    } else {
                        // Redirect to login page or show login modal
                        console.log('No authentication token found');
                        ui.hideLoadingScreen();
                        showLoginPrompt();
                    }
                }
            } catch (error) {
                console.error('Error authenticating:', error);
                ui.hideLoadingScreen();
                ui.showError('Failed to authenticate: ' + error.message);
                showLoginPrompt();
            }
        }
    } catch (error) {
        console.error('Error initializing application:', error);
        ui.hideLoadingScreen();
        ui.showError('Failed to initialize application: ' + error.message);
    }
});

/**
 * Initialize the game after successful authentication
 */
async function initializeGame() {
    try {
        console.log('Starting game initialization...');
        
        // Initialize UI first as it's critical
        console.log('Initializing UI...');
        ui.init();
        console.log('UI initialized successfully');
        
        // Track initialization status for each module
        const initStatus = {
            planets: false,
            expedition: false,
            inventory: false,
            shop: false,
            ranking: false,
            profile: false,
            fortuneWheel: false
        };
        
        // Initialize all modules in parallel to speed up loading
        const initPromises = [];
        
        // Planets initialization
        initPromises.push(
            planets.init()
                .then(() => {
                    console.log('Planets initialized successfully');
                    initStatus.planets = true;
                })
                .catch(error => {
                    console.error('Failed to initialize planets:', error);
                })
        );
        
        // Expedition initialization
        initPromises.push(
            expedition.init()
                .then(() => {
                    console.log('Expedition initialized successfully');
                    initStatus.expedition = true;
                })
                .catch(error => {
                    console.error('Failed to initialize expedition:', error);
                })
        );
        
        // Inventory initialization
        initPromises.push(
            inventory.init()
                .then(() => {
                    console.log('Inventory initialized successfully');
                    initStatus.inventory = true;
                })
                .catch(error => {
                    console.error('Failed to initialize inventory:', error);
                })
        );
        
        // Shop initialization
        initPromises.push(
            shop.init()
                .then(() => {
                    console.log('Shop initialized successfully');
                    initStatus.shop = true;
                })
                .catch(error => {
                    console.error('Failed to initialize shop:', error);
                })
        );
        
        // Ranking initialization
        initPromises.push(
            ranking.init()
                .then(() => {
                    console.log('Ranking initialized successfully');
                    initStatus.ranking = true;
                })
                .catch(error => {
                    console.error('Failed to initialize ranking:', error);
                })
        );
        
        // Profile initialization
        initPromises.push(
            profile.init()
                .then(() => {
                    console.log('Profile initialized successfully');
                    initStatus.profile = true;
                })
                .catch(error => {
                    console.error('Failed to initialize profile:', error);
                })
        );
        
        // Fortune wheel initialization
        initPromises.push(
            fortuneWheel.init()
                .then(() => {
                    console.log('Fortune wheel initialized successfully');
                    initStatus.fortuneWheel = true;
                })
                .catch(error => {
                    console.error('Failed to initialize fortune wheel:', error);
                })
        );
        
        // Wait for all initialization promises to settle
        await Promise.allSettled(initPromises);
        
        // Check initialization status and log summary
        console.log('Initialization status summary:');
        for (const [module, status] of Object.entries(initStatus)) {
            console.log(`- ${module}: ${status ? 'SUCCESS' : 'FAILED'}`);
        }
        
        // Check if critical modules initialized
        const criticalModules = ['inventory', 'shop', 'profile'];
        const criticalFailures = criticalModules.filter(module => !initStatus[module]);
        
        if (criticalFailures.length > 0) {
            console.warn(`Some critical modules failed to initialize: ${criticalFailures.join(', ')}`);
            // Show a warning to the user but still continue
            ui.showWarning(`Some game features may be limited due to connection issues. Please check your internet connection and try refreshing the page if you experience problems.`);
        }
        
        console.log('Game initialization completed');
        
        // Force hide loading screen
        setTimeout(() => {
            console.log('Forcing loading screen to hide');
            ui.hideLoadingScreen();
            ui.showTab('home');
        }, 500);
    } catch (error) {
        console.error('Unexpected error during game initialization:', error);
        ui.showError('Failed to initialize game: ' + error.message);
        
        // Force hide loading screen even on error
        setTimeout(() => {
            console.log('Forcing loading screen to hide after error');
            ui.hideLoadingScreen();
        }, 500);
    }
}

/**
 * Show login prompt for web browser
 */
function showLoginPrompt() {
    // Create login modal
    const loginModal = document.createElement('div');
    loginModal.className = 'modal';
    loginModal.id = 'login-modal';
    
    loginModal.innerHTML = `
        <div class="modal-content">
            <div class="login-container">
                <h2>Login Required</h2>
                <p>Please login with Telegram to play Space Miner.</p>
                <button class="action-button telegram-login-btn">
                    <i class="fab fa-telegram"></i>
                    <span>Login with Telegram</span>
                </button>
                <div class="dev-login">
                    <h3>Developer Login</h3>
                    <input type="text" id="dev-user-id" placeholder="User ID">
                    <button class="action-button dev-login-btn">Login</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(loginModal);
    
    // Show modal
    loginModal.style.display = 'flex';
    
    // Add event listeners
    const telegramLoginBtn = loginModal.querySelector('.telegram-login-btn');
    if (telegramLoginBtn) {
        telegramLoginBtn.addEventListener('click', () => {
            // Redirect to Telegram login
            window.location.href = '/api/auth/telegram-login';
        });
    }
    
    const devLoginBtn = loginModal.querySelector('.dev-login-btn');
    if (devLoginBtn) {
        devLoginBtn.addEventListener('click', async () => {
            const userIdInput = document.getElementById('dev-user-id');
            const userId = userIdInput.value.trim();
            
            if (!userId) {
                ui.showError('Please enter a user ID');
                return;
            }
            
            try {
                await api.devLogin(userId);
                loginModal.style.display = 'none';
                document.body.removeChild(loginModal);
                window.location.reload();
            } catch (error) {
                console.error('Error logging in:', error);
                ui.showError('Failed to login');
            }
        });
    }
}
