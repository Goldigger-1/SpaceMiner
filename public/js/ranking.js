/**
 * Space Miner - Ranking Module
 * Handles leaderboard-related functionality
 */

class Ranking {
    constructor() {
        this.rankingList = document.getElementById('ranking-list');
        this.rankingTabButtons = document.querySelectorAll('.ranking-tab-btn');
        this.monthlyTimeRemaining = document.getElementById('monthly-time-remaining');
        this.currentPeriod = 'month';
    }

    /**
     * Initialize ranking module
     */
    init() {
        // Add event listeners for tab buttons
        this.rankingTabButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const period = event.target.getAttribute('data-period');
                this.loadLeaderboard(period);
                
                // Update active button
                this.rankingTabButtons.forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
            });
        });
        
        // Load initial leaderboard
        this.loadLeaderboard(this.currentPeriod);
        
        // Update monthly time remaining
        this.updateMonthlyTimeRemaining();
        setInterval(() => this.updateMonthlyTimeRemaining(), 60000); // Update every minute
    }

    /**
     * Load leaderboard data
     * @param {string} period - Leaderboard period ('month' or 'all-time')
     */
    async loadLeaderboard(period) {
        try {
            ui.showLoadingScreen();
            
            this.currentPeriod = period;
            let leaderboardData;
            
            if (period === 'month') {
                leaderboardData = await api.getMonthlyLeaderboard();
            } else {
                leaderboardData = await api.getGlobalLeaderboard();
            }
            
            this.renderLeaderboard(leaderboardData);
            
            ui.hideLoadingScreen();
        } catch (error) {
            ui.hideLoadingScreen();
            console.error('Error loading leaderboard:', error);
            ui.showError('Failed to load leaderboard');
        }
    }

    /**
     * Render leaderboard
     * @param {object} data - Leaderboard data
     */
    renderLeaderboard(data) {
        if (!this.rankingList) return;
        
        this.rankingList.innerHTML = '';
        
        const leaderboard = data.leaderboard || [];
        
        if (leaderboard.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-leaderboard';
            emptyMessage.textContent = 'No rankings available for this period.';
            
            this.rankingList.appendChild(emptyMessage);
            return;
        }
        
        // Create leaderboard header
        const header = document.createElement('div');
        header.className = 'ranking-header';
        header.innerHTML = `
            <div class="rank-column">Rank</div>
            <div class="player-column">Player</div>
            <div class="score-column">Score</div>
        `;
        this.rankingList.appendChild(header);
        
        // Create leaderboard items
        leaderboard.forEach((player, index) => {
            const rank = index + 1;
            const isUser = data.userRank === rank;
            
            const playerItem = document.createElement('div');
            playerItem.className = `ranking-item ${isUser ? 'current-user' : ''}`;
            
            // Add special class for top 3
            if (rank <= 3) {
                playerItem.classList.add(`top-${rank}`);
            }
            
            playerItem.innerHTML = `
                <div class="rank-column">
                    ${rank <= 3 ? 
                        `<div class="rank-medal rank-${rank}">
                            <i class="fas fa-trophy"></i>
                        </div>` : 
                        `<div class="rank-number">${rank}</div>`
                    }
                </div>
                <div class="player-column">
                    <div class="player-name">${player.username}</div>
                </div>
                <div class="score-column">${player.score || player.total_score}</div>
            `;
            
            this.rankingList.appendChild(playerItem);
        });
        
        // Add user's rank if not in top 100
        if (data.userRank && data.userRank > leaderboard.length) {
            const userItem = document.createElement('div');
            userItem.className = 'ranking-item current-user user-outside-top';
            
            userItem.innerHTML = `
                <div class="rank-column">
                    <div class="rank-number">${data.userRank}</div>
                </div>
                <div class="player-column">
                    <div class="player-name">You</div>
                </div>
                <div class="score-column">${data.userScore || 0}</div>
            `;
            
            this.rankingList.appendChild(userItem);
        }
    }

    /**
     * Update monthly time remaining
     */
    updateMonthlyTimeRemaining() {
        if (!this.monthlyTimeRemaining) return;
        
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const timeRemaining = endOfMonth - now;
        
        // Calculate days, hours, minutes
        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        
        this.monthlyTimeRemaining.textContent = `${days}d ${hours}h ${minutes}m`;
    }
}

// Create global ranking instance
const ranking = new Ranking();
