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
        
        // Initialize modules
        ui.init();
        planets.init();
        expedition.init();
        inventory.init();
        shop.init();
        ranking.init();
        profile.init();
        fortuneWheel.init();
        
        // Check for Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
            // Initialize Telegram WebApp
            const webApp = window.Telegram.WebApp;
            webApp.ready();
            
            // Handle authentication
            const initData = webApp.initData;
            if (initData) {
                try {
                    await api.authenticateTelegram(initData);
                    console.log('Authenticated with Telegram');
                } catch (error) {
                    console.error('Error authenticating with Telegram:', error);
                    ui.showError('Failed to authenticate with Telegram');
                }
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
                } else {
                    // Redirect to login page or show login modal
                    console.log('No authentication token found');
                    showLoginPrompt();
                }
            } catch (error) {
                console.error('Error authenticating:', error);
                ui.showError('Failed to authenticate');
                showLoginPrompt();
            }
        }
    } catch (error) {
        console.error('Error initializing application:', error);
        ui.showError('Failed to initialize application');
    }
});

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
