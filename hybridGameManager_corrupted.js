/**
 * Hybrid Game Manager - Main Integration Controller
 * Connects the menu system with hybrid Phaser.js + Three.js game
 */

class HybridGameManager {
    constructor() {
        this.gameState = {
            currentMode: 'classic',
            currentDifficulty: 'novice',
            currentRendering: 'hybrid',
            currentQuality: 'high',
            soundEnabled: true,
            gameActive: false,
            gameInstance: null,
            hybridRenderer: null
        };

        this.leaderboard = this.loadLeaderboard();
        this.initializeEventListeners();
        this.showMenu();
    }
        this.showMenu();
    }

    initializeEventListeners() {
        // Menu button selections
        document.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectOption('mode', e.target.dataset.mode, e.target));
        });

        document.querySelectorAll('[data-difficulty]').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectOption('difficulty', e.target.dataset.difficulty, e.target));
        });

        document.querySelectorAll('[data-rendering]').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectOption('rendering', e.target.dataset.rendering, e.target));
        });

        document.querySelectorAll('[data-quality]').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectOption('quality', e.target.dataset.quality, e.target));
        });

        // Main action buttons
        document.getElementById('startGame').addEventListener('click', () => this.startGame());
        document.getElementById('showLeaderboard').addEventListener('click', () => this.showLeaderboard());

        // Game control buttons
        document.getElementById('backToMenu').addEventListener('click', () => this.backToMenu());
        document.getElementById('toggleSound').addEventListener('click', () => this.toggleSound());
        document.getElementById('toggleRendering').addEventListener('click', () => this.toggleRenderingMode());
        document.getElementById('pauseGame').addEventListener('click', () => this.togglePause());

        // Leaderboard navigation
        document.getElementById('backToMenuFromLeaderboard').addEventListener('click', () => this.backToMenu());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // Handle window resize for responsive canvas
        window.addEventListener('resize', () => this.handleResize());

        // Prevent context menu on game area
        document.getElementById('gameContainer').addEventListener('contextmenu', (e) => e.preventDefault());
    }

    selectOption(category, value, button) {
        // Update visual selection
        button.parentElement.querySelectorAll('.game-button').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        // Update game state
        switch(category) {
            case 'mode':
                this.gameState.currentMode = value;
                break;
            case 'difficulty':
                this.gameState.currentDifficulty = value;
                break;
            case 'rendering':
                this.gameState.currentRendering = value;
                break;
            case 'quality':
                this.gameState.currentQuality = value;
                break;
        }

        console.log(`Selected ${category}: ${value}`);
    }

    async startGame() {
        try {
            this.showGameScreen();
            await this.initializeGameRenderer();
            
            // Start the appropriate game mode
            switch(this.gameState.currentRendering) {
                case 'hybrid':
                    await this.startHybridGame();
                    break;
                case '2d':
                    await this.start2DGame();
                    break;
                case 'legacy':
                    await this.startLegacyGame();
                    break;
                default:
                    throw new Error('Unknown rendering mode');
            }

            this.gameState.gameActive = true;
            console.log('Game started successfully');

        } catch (error) {
            console.error('Failed to start game:', error);
            this.showError(`Failed to start game: ${error.message}`);
            this.backToMenu();
        }
    }

    async initializeGameRenderer() {
        const container = document.getElementById('gameContainer');
        
        // Clear any existing game content
        container.innerHTML = '';
        
        // Set up container for the selected rendering mode
        switch(this.gameState.currentRendering) {
            case 'hybrid':
                container.className = 'hybrid-game-container';
                break;
            case '2d':
                container.className = 'hybrid-game-container phaser-only';
                break;
            case 'legacy':
                // Show legacy canvas instead
                const canvas = document.getElementById('gameCanvas');
                canvas.style.display = 'block';
                container.style.display = 'none';
                break;
        }
    }

    async startHybridGame() {
        const container = document.getElementById('gameContainer');
        
        // Initialize the hybrid renderer
        this.gameState.hybridRenderer = new HybridRenderer('gameContainer', {
            width: 800,
            height: 600,
            quality: this.gameState.currentQuality,
            enableSound: this.gameState.soundEnabled,
            use3D: true
        });

        await this.gameState.hybridRenderer.init();

        // Create the hybrid bubble shooter game
        this.gameState.gameInstance = new HybridBubbleShooterGame({
            renderer: this.gameState.hybridRenderer,
            mode: this.gameState.currentMode,
            difficulty: this.gameState.currentDifficulty,
            onScoreUpdate: (score) => this.handleScoreUpdate(score),
            onGameEnd: (result) => this.handleGameEnd(result),
            onLevelComplete: (level) => this.handleLevelComplete(level)
        });

        await this.gameState.gameInstance.start();
        console.log('Hybrid game started');
    }

    async start2DGame() {
        const container = document.getElementById('gameContainer');
        
        // Initialize Phaser-only renderer
        this.gameState.hybridRenderer = new HybridRenderer(container, {
            width: 800,
            height: 600,
            quality: this.gameState.currentQuality,
            enableSound: this.gameState.soundEnabled,
            use3D: false // Disable Three.js components
        });

        await this.gameState.hybridRenderer.init();

        this.gameState.gameInstance = new HybridBubbleShooterGame({
            renderer: this.gameState.hybridRenderer,
            mode: this.gameState.currentMode,
            difficulty: this.gameState.currentDifficulty,
            onScoreUpdate: (score) => this.handleScoreUpdate(score),
            onGameEnd: (result) => this.handleGameEnd(result),
            onLevelComplete: (level) => this.handleLevelComplete(level)
        });

        await this.gameState.gameInstance.start();
        console.log('2D-only game started');
    }

    async startLegacyGame() {
        // Fall back to original canvas-based game
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        // Initialize legacy game with original Game class
        this.gameState.gameInstance = new Game(canvas, {
            mode: this.gameState.currentMode,
            difficulty: this.gameState.currentDifficulty,
            soundEnabled: this.gameState.soundEnabled
        });

        this.gameState.gameInstance.start();
        console.log('Legacy canvas game started');
    }

    handleScoreUpdate(score) {
        // Update score display if available
        const scoreElement = document.querySelector('.score-display');
        if (scoreElement) {
            scoreElement.textContent = `Score: ${score}`;
        }
    }

    handleLevelComplete(level) {
        console.log(`Level ${level} completed!`);
        // Could show level completion animation here
    }

    handleGameEnd(result) {
        console.log('Game ended:', result);
        
        // Save high score
        if (result.score > 0) {
            this.saveScore(result);
        }

        // Show game over screen or return to menu
        setTimeout(() => {
            alert(`Game Over! Final Score: ${result.score}`);
            this.backToMenu();
        }, 1000);
    }

    saveScore(result) {
        const scoreEntry = {
            score: result.score,
            mode: this.gameState.currentMode,
            difficulty: this.gameState.currentDifficulty,
            rendering: this.gameState.currentRendering,
            date: new Date().toLocaleDateString(),
            timestamp: Date.now()
        };

        this.leaderboard.push(scoreEntry);
        this.leaderboard.sort((a, b) => b.score - a.score);
        this.leaderboard = this.leaderboard.slice(0, 10); // Keep top 10

        localStorage.setItem('bubbleShooterLeaderboard', JSON.stringify(this.leaderboard));
    }

    loadLeaderboard() {
        try {
            const saved = localStorage.getItem('bubbleShooterLeaderboard');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.warn('Failed to load leaderboard:', error);
            return [];
        }
    }

    toggleSound() {
        this.gameState.soundEnabled = !this.gameState.soundEnabled;
        const button = document.getElementById('toggleSound');
        button.textContent = `🔊 Sound: ${this.gameState.soundEnabled ? 'On' : 'Off'}`;

        // Apply to current game instance
        if (this.gameState.gameInstance && this.gameState.gameInstance.setSoundEnabled) {
            this.gameState.gameInstance.setSoundEnabled(this.gameState.soundEnabled);
        }
    }

    toggleRenderingMode() {
        if (!this.gameState.gameActive) return;

        // Cycle through rendering modes
        const modes = ['hybrid', '2d'];
        const currentIndex = modes.indexOf(this.gameState.currentRendering);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        
        this.gameState.currentRendering = nextMode;
        
        const button = document.getElementById('toggleRendering');
        button.textContent = `🎨 ${nextMode === 'hybrid' ? '3D Effects On' : '2D Only'}`;

        // Apply rendering change to current game
        if (this.gameState.hybridRenderer && this.gameState.hybridRenderer.toggle3D) {
            this.gameState.hybridRenderer.toggle3D(nextMode === 'hybrid');
        }
    }

    togglePause() {
        if (!this.gameState.gameActive || !this.gameState.gameInstance) return;

        const button = document.getElementById('pauseGame');
        
        if (this.gameState.gameInstance.paused) {
            this.gameState.gameInstance.resume();
            button.textContent = '⏸️ Pause';
        } else {
            this.gameState.gameInstance.pause();
            button.textContent = '▶️ Resume';
        }
    }

    handleKeyPress(e) {
        if (!this.gameState.gameActive) return;

        switch(e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePause();
                break;
            case 'KeyR':
                e.preventDefault();
                this.restartGame();
                break;
            case 'KeyM':
                e.preventDefault();
                this.toggleSound();
                break;
            case 'Escape':
                e.preventDefault();
                this.backToMenu();
                break;
        }
    }

    handleResize() {
        if (this.gameState.hybridRenderer && this.gameState.hybridRenderer.handleResize) {
            this.gameState.hybridRenderer.handleResize();
        }
    }

    restartGame() {
        if (this.gameState.gameInstance && this.gameState.gameInstance.restart) {
            this.gameState.gameInstance.restart();
        } else {
            // Full restart
            this.stopGame();
            this.startGame();
        }
    }

    stopGame() {
        this.gameState.gameActive = false;

        // Cleanup game instance
        if (this.gameState.gameInstance) {
            if (this.gameState.gameInstance.destroy) {
                this.gameState.gameInstance.destroy();
            }
            this.gameState.gameInstance = null;
        }

        // Cleanup hybrid renderer
        if (this.gameState.hybridRenderer) {
            if (this.gameState.hybridRenderer.destroy) {
                this.gameState.hybridRenderer.destroy();
            }
            this.gameState.hybridRenderer = null;
        }

        // Hide legacy canvas
        document.getElementById('gameCanvas').style.display = 'none';
    }

    showMenu() {
        document.getElementById('gameMenu').style.display = 'block';
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('leaderboard').style.display = 'none';
    }

    showGameScreen() {
        document.getElementById('gameMenu').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        document.getElementById('leaderboard').style.display = 'none';
    }

    showLeaderboard() {
        this.updateLeaderboardDisplay();
        document.getElementById('gameMenu').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('leaderboard').style.display = 'block';
    }

    backToMenu() {
        this.stopGame();
        this.showMenu();
    }

    updateLeaderboardDisplay() {
        const tbody = document.getElementById('scoresList');
        tbody.innerHTML = '';

        this.leaderboard.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.score.toLocaleString()}</td>
                <td>${entry.mode}</td>
                <td>${entry.difficulty}</td>
                <td>${entry.rendering}</td>
                <td>${entry.date}</td>
            `;
            tbody.appendChild(row);
        });

        if (this.leaderboard.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6">No scores yet - play a game to set your first record!</td>';
            tbody.appendChild(row);
        }
    }

    showError(message) {
        // Simple error display - could be enhanced with a modal
        alert(`Error: ${message}`);
        console.error(message);
    }

    // Utility method for checking device capabilities
    checkDeviceCapabilities() {
        const capabilities = {
            webgl: !!document.createElement('canvas').getContext('webgl'),
            performanceMemory: 'memory' in performance,
            hardwareConcurrency: navigator.hardwareConcurrency || 2,
            devicePixelRatio: window.devicePixelRatio || 1,
            touchScreen: 'ontouchstart' in window
        };

        // Adjust quality based on device capabilities
        if (capabilities.hardwareConcurrency < 4 || !capabilities.webgl) {
            this.gameState.currentQuality = 'low';
            document.querySelector('[data-quality="low"]').classList.add('active');
            document.querySelector('[data-quality="high"]').classList.remove('active');
        }

        return capabilities;
    }
}

// Initialize the game manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check for required dependencies
    if (typeof Phaser === 'undefined') {
        console.error('Phaser.js is required but not loaded');
        alert('Failed to load Phaser.js. Please check your internet connection.');
        return;
    }

    if (typeof THREE === 'undefined') {
        console.warn('Three.js not loaded - 3D effects will be disabled');
    }

    if (typeof HybridRenderer === 'undefined') {
        console.error('HybridRenderer is required but not loaded');
        alert('Failed to load game renderer. Please refresh the page.');
        return;
    }

    // Initialize the game manager
    window.gameManager = new HybridGameManager();
    console.log('Hybrid Game Manager initialized successfully');
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HybridGameManager;
}
