// Main application entry point for Bubble Shooter game

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing game application');
    
    // Initialize the game
    initializeApplication();
});

// Main initialization function
function initializeApplication() {
    // Check if FB Instant integration is available
    if (typeof FacebookInstantGames !== 'undefined') {
        console.log('FacebookInstantGames integration available');
        
        // Initialize through FB Instant if available, but don't auto-start the game
        // We want to wait for the user to click the Start Game button
        FacebookInstantGames.initialize(function() {
            console.log('FB initialization complete - setting up game UI');
            setupGameUI();
        }, true); // true = skip calling startGameAsync
    } else {
        console.log('No FB Instant integration - starting game directly');
        setupGameUI();
    }
}

// Set up the game UI and event handlers
function setupGameUI() {
    console.log('Setting up game UI elements');
    
    // Get UI elements
    const gameMenu = document.getElementById('gameMenu');
    const gameScreen = document.getElementById('gameScreen');
    const canvas = document.getElementById('gameCanvas');
    const startGameBtn = document.getElementById('startGame');
    const backToMenuBtn = document.getElementById('backToMenu');
    const toggleSoundBtn = document.getElementById('toggleSound');
    
    // Game state variables
    let game = null;
    let selectedGameMode = 'classic';
    let selectedDifficulty = 'novice';
    let soundEnabled = true;
    
    console.log('Adding event listeners to UI elements');
    
    // Handle game mode selection
    const gameModeButtons = document.querySelectorAll('.button-group button[data-mode]');
    gameModeButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log('Game mode selected:', button.getAttribute('data-mode'));
            gameModeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedGameMode = button.getAttribute('data-mode');
        });
    });

    // Handle difficulty selection
    const difficultyButtons = document.querySelectorAll('.button-group button[data-difficulty]');
    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log('Difficulty selected:', button.getAttribute('data-difficulty'));
            difficultyButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedDifficulty = button.getAttribute('data-difficulty');
        });
    });

    // Start Game button event is now handled by startup-fix.js
    // This ensures we don't have duplicate event handlers
    console.log('Skipping Start Game button event listener in app.js - handled by startup-fix.js');
    
    // Update the global settings for the game
    window.gameSettings = {
        selectedGameMode: selectedGameMode,
        selectedDifficulty: selectedDifficulty,
        soundEnabled: soundEnabled
    };
    
    // Create a standardized game start function that works the same way as in game.js
    window.setupAndStartGame = function() {
        try {
            // Hide menu and show game
            gameMenu.style.display = 'none';
            gameScreen.style.display = 'flex';
            document.body.classList.add('game-active');
            
            console.log('Creating new Game instance');
            
            // Get the Game constructor - try both local and global
            let GameConstructor = Game;
            if (typeof GameConstructor !== 'function' && typeof window.Game === 'function') {
                console.log('Using window.Game constructor');
                GameConstructor = window.Game;
            }
            
            if (typeof GameConstructor !== 'function') {
                console.error('Game class not available!');
                throw new Error('Game class not found');
            }
            
            // Initialize game with selected settings
            game = new GameConstructor(canvas);
            
            // Ensure proper sizing
            setTimeout(() => {
                if (game) {
                    console.log('Resizing canvas');
                    game.resizeCanvas();
                }
            }, 10);
            
            console.log('Setting game properties');
            game.gameMode = selectedGameMode;
            game.difficulty = selectedDifficulty;
            game.soundEnabled = soundEnabled;
            
            console.log('Starting the game');
            game.start();
            
            // Store for debugging
            window.game = game;
        } catch (error) {
            console.error('Error starting the game:', error);
            
            // Try fallback to debug game
            if (typeof SimpleDebugGame === 'function') {
                console.warn('Falling back to SimpleDebugGame');
                game = new SimpleDebugGame(canvas);
                game.gameMode = selectedGameMode;
                game.difficulty = selectedDifficulty;
                game.soundEnabled = soundEnabled;
                game.start();
                window.game = game;
            } else {
                alert('Game initialization error: ' + error.message);
            }
        }
    };

    // Back to Menu button
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', () => {
            console.log('Back to Menu button clicked');
            
            // Show menu and hide game
            gameMenu.style.display = 'block';
            gameScreen.style.display = 'none';
            document.body.classList.remove('game-active');
            
            // Clean up game instance
            if (game) {
                game = null; // Allow garbage collection
            }
        });
    }

    // Toggle Sound button
    if (toggleSoundBtn) {
        toggleSoundBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            toggleSoundBtn.textContent = `Sound: ${soundEnabled ? 'On' : 'Off'}`;
            
            if (game) {
                game.soundEnabled = soundEnabled;
            }
        });
    }

    // Window resize handler
    window.addEventListener('resize', () => {
        if (game) {
            game.resizeCanvas();
        } else {
            // Basic canvas sizing if game not started yet
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const aspectRatio = 9/16; // Portrait orientation
            
            let canvasWidth, canvasHeight;
            
            if (viewportWidth < viewportHeight) {
                canvasWidth = Math.min(viewportWidth * 0.95, 720);
                canvasHeight = canvasWidth / aspectRatio;
            } else {
                canvasHeight = Math.min(viewportHeight * 0.9, 1280);
                canvasWidth = canvasHeight * aspectRatio;
            }
            
            canvas.style.width = `${Math.floor(canvasWidth)}px`;
            canvas.style.height = `${Math.floor(canvasHeight)}px`;
        }
    });
    
    console.log('Game UI setup complete - ready to play');
}
