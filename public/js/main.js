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
        // Initialize modules
        ui.init();
        await planets.init();
        await expedition.init();
        await inventory.init();
        await shop.init();
        await ranking.init();
        await profile.init();
        await fortuneWheel.init();
        
        console.log('Game initialized successfully');
        ui.hideLoadingScreen();
    } catch (error) {
        console.error('Error initializing game:', error);
        ui.showError('Failed to initialize game: ' + error.message);
        ui.hideLoadingScreen();
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
