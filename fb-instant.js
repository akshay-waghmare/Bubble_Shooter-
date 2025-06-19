// Facebook Instant Games SDK Integration

// Main FBInstant wrapper class to handle all FB Instant Games functionality
class FBInstantWrapper {
    constructor() {
        this.initialized = false;
        this.loaded = false;
        this.playerName = "Player";
        this.playerPhoto = null;
        this.playerID = null;
        this.supportedAPIs = [];
        this.contextID = null;
        this.contextType = null;
        this.contextPlayers = [];
        this.entryPointData = null;
        this.platform = "unknown";
        this.locale = "en_US";
    }

    // Initialize the FB Instant SDK
    async initialize() {
        try {
            if (typeof FBInstant === 'undefined') {
                console.log('FB Instant is not available. Running in standalone mode.');
                this.initialized = true;
                return Promise.resolve();
            }

            console.log('Initializing FB Instant SDK...');
            await FBInstant.initializeAsync();
            console.log('FB Instant SDK initialized');
            
            this.initialized = true;
            this.supportedAPIs = FBInstant.getSupportedAPIs();
            this.platform = FBInstant.getPlatform();
            this.locale = FBInstant.getLocale();
            this.entryPointData = FBInstant.getEntryPointData();
            
            try {
                const contextInfo = FBInstant.context;
                if (contextInfo) {
                    this.contextID = contextInfo.getID();
                    this.contextType = contextInfo.getType();
                }
            } catch (e) {
                console.warn('Could not get context information', e);
            }
            
            // Get player info
            try {
                const playerInfo = FBInstant.player;
                if (playerInfo) {
                    this.playerID = playerInfo.getID();
                    this.playerName = playerInfo.getName();
                    this.playerPhoto = playerInfo.getPhoto();
                }
            } catch (e) {
                console.warn('Could not get player information', e);
            }
            
            return Promise.resolve();
        } catch (error) {
            console.error('Error initializing FB Instant SDK:', error);
            // Still mark as initialized to allow game to work in standalone mode
            this.initialized = true;
            return Promise.resolve();
        }
    }

    // Start the game
    async startGame() {
        if (!this.initialized) {
            await this.initialize();
        }
        
        try {
            if (typeof FBInstant !== 'undefined') {
                await FBInstant.startGameAsync();
                console.log('FB Instant game started');
            }
            return Promise.resolve();
        } catch (error) {
            console.error('Error starting FB Instant game:', error);
            return Promise.resolve();
        }
    }
    
    // Set loading progress (0 to 100)
    async setLoadingProgress(progress) {
        try {
            if (typeof FBInstant !== 'undefined') {
                await FBInstant.setLoadingProgress(progress);
            }
            return Promise.resolve();
        } catch (error) {
            console.warn('Error setting loading progress:', error);
            return Promise.resolve();
        }
    }
    
    // Update player stats
    async updatePlayerStats(stats) {
        if (typeof FBInstant === 'undefined' || !this.supportedAPIs.includes('player.setDataAsync')) {
            return Promise.resolve();
        }
        
        try {
            await FBInstant.player.setDataAsync(stats);
            return Promise.resolve();
        } catch (error) {
            console.warn('Error updating player stats:', error);
            return Promise.resolve();
        }
    }
    
    // Save high score to leaderboard
    async saveHighScore(score, leaderboardName = 'bubble_shooter_highscores') {
        if (typeof FBInstant === 'undefined' || !this.supportedAPIs.includes('leaderboard.setScoreAsync')) {
            return Promise.resolve();
        }
        
        try {
            const result = await FBInstant.leaderboard.setScoreAsync(leaderboardName, score);
            console.log('High score saved:', result);
            return Promise.resolve(result);
        } catch (error) {
            console.warn('Error saving high score:', error);
            return Promise.resolve(null);
        }
    }
    
    // Get leaderboard entries
    async getLeaderboard(leaderboardName = 'bubble_shooter_highscores', count = 10) {
        if (typeof FBInstant === 'undefined' || !this.supportedAPIs.includes('leaderboard.getEntriesAsync')) {
            return Promise.resolve([]);
        }
        
        try {
            const leaderboard = await FBInstant.leaderboard.getLeaderboardAsync(leaderboardName);
            const entries = await leaderboard.getEntriesAsync(count, 0);
            return Promise.resolve(entries.map(entry => ({
                rank: entry.getRank(),
                score: entry.getScore(),
                player: {
                    id: entry.getPlayer().getID(),
                    name: entry.getPlayer().getName(),
                    photo: entry.getPlayer().getPhoto()
                }
            })));
        } catch (error) {
            console.warn('Error getting leaderboard:', error);
            return Promise.resolve([]);
        }
    }
    
    // Share game results
    async shareGame(options) {
        if (typeof FBInstant === 'undefined' || !this.supportedAPIs.includes('shareAsync')) {
            return Promise.resolve(false);
        }
        
        try {
            const result = await FBInstant.shareAsync({
                intent: 'SHARE',
                image: options.image,
                text: options.text,
                data: options.data || {}
            });
            return Promise.resolve(true);
        } catch (error) {
            console.warn('Error sharing game:', error);
            return Promise.resolve(false);
        }
    }
    
    // Show advertisements
    async showInterstitialAd(placementID = 'INTERSTITIAL') {
        if (typeof FBInstant === 'undefined' || !this.supportedAPIs.includes('getInterstitialAdAsync')) {
            return Promise.resolve(false);
        }
        
        try {
            const ad = await FBInstant.getInterstitialAdAsync(placementID);
            await ad.loadAsync();
            await ad.showAsync();
            return Promise.resolve(true);
        } catch (error) {
            console.warn('Error showing interstitial ad:', error);
            return Promise.resolve(false);
        }
    }
    
    // Show rewarded video
    async showRewardedVideo(placementID = 'REWARDED_VIDEO') {
        if (typeof FBInstant === 'undefined' || !this.supportedAPIs.includes('getRewardedVideoAsync')) {
            return Promise.resolve(false);
        }
        
        try {
            const ad = await FBInstant.getRewardedVideoAsync(placementID);
            await ad.loadAsync();
            await ad.showAsync();
            return Promise.resolve(true);
        } catch (error) {
            console.warn('Error showing rewarded video:', error);
            return Promise.resolve(false);
        }
    }
    
    // Check if running in Facebook Instant Games environment
    isFBInstant() {
        return typeof FBInstant !== 'undefined';
    }
}

// Create singleton instance
const fbInstant = new FBInstantWrapper();

// Export the instance
export default fbInstant;
