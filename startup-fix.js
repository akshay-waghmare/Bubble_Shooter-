// Startup issue fix for Facebook Instant Games integration
console.log("Startup fix script loaded - FB Instant Games fix");

// Function to check if there are duplicate event listeners
function checkAndFixEventListeners() {
    // Check if the Start Game button already has click listeners
    const startGameBtn = document.getElementById('startGame');
    if (!startGameBtn) {
        console.error("Start Game button not found!");
        return;
    }
    
    // Clean approach: Remove any existing listeners and add a new one
    // This is a workaround since we can't directly check how many listeners are attached
    const newStartButton = startGameBtn.cloneNode(true);
    startGameBtn.parentNode.replaceChild(newStartButton, startGameBtn);
    
    console.log("Cleaned up Start Game button - attaching single event listener");
    
    // Add the clean event listener with proper FB Instant handling
    newStartButton.addEventListener('click', function(e) {
        console.log("===== CLEAN START BUTTON CLICKED =====");
        
        // Visual feedback
        newStartButton.classList.add('clicked');
        setTimeout(() => newStartButton.classList.remove('clicked'), 300);
        
        // Check if FBInstant is available
        const isFBInstantAvailable = typeof FBInstant !== 'undefined';
        console.log("FB Instant SDK available:", isFBInstantAvailable);
        
        if (isFBInstantAvailable) {
            console.log("Using FB Instant flow");
            
            // If FB Instant available, make sure it's initialized and start game after startGameAsync resolves
            if (FBInstant.player) {
                console.log("FB Instant already initialized, starting game directly");
                startGameWithFBInstant();
            } else {
                console.log("Initializing FB Instant");
                FBInstant.initializeAsync()
                    .then(() => {
                        console.log("FB Instant initialized, setting loading progress");
                        
                        // Simple loading progress simulation
                        let progress = 0;
                        const interval = setInterval(() => {
                            progress += 10;
                            FBInstant.setLoadingProgress(progress);
                            
                            if (progress >= 100) {
                                clearInterval(interval);
                                console.log("FB Instant loading complete, starting game async");
                                
                                FBInstant.startGameAsync()
                                    .then(() => {
                                        console.log("FB Instant game started, launching game");
                                        startGameWithFBInstant();
                                    })
                                    .catch(error => {
                                        console.error("FB Instant startGameAsync error:", error);
                                        // Fallback to standard start
                                        startGameStandard();
                                    });
                            }
                        }, 100);
                    })
                    .catch(error => {
                        console.error("FB Instant initialization error:", error);
                        // Fallback to standard start
                        startGameStandard();
                    });
            }
        } else {
            console.log("FB Instant not available, using standard flow");
            startGameStandard();
        }
    });
}

// Function to start game with FB Instant context
function startGameWithFBInstant() {
    console.log("Starting game with FB Instant context");
    
    const gameMenu = document.getElementById('gameMenu');
    const gameScreen = document.getElementById('gameScreen');
    
    // Hide menu and show game
    gameMenu.style.display = 'none';
    gameScreen.style.display = 'flex';
    document.body.classList.add('game-active');
    
    // Get mode and difficulty from UI or use defaults
    const selectedGameMode = document.querySelector('.button-group button[data-mode].active')?.getAttribute('data-mode') || 'classic';
    const selectedDifficulty = document.querySelector('.button-group button[data-difficulty].active')?.getAttribute('data-difficulty') || 'novice';
    
    console.log("Game settings:", { mode: selectedGameMode, difficulty: selectedDifficulty });
    
    // Initialize game
    try {
        // Try different global start functions in priority order
        if (typeof window.setupAndStartGame === 'function') {
            console.log("Calling window.setupAndStartGame()");
            window.setupAndStartGame();
        } else if (typeof window.startGame === 'function') {
            console.log("Calling window.startGame()");
            window.startGame();
        } else {
            // Create a new game instance directly if no global function is available
            console.log("Creating game directly - no global start function found");
            const canvas = document.getElementById('gameCanvas');
            
            // Try to get the Game class, with detailed diagnostics
            const diagnostics = {
                gameClassExists: typeof Game === 'function',
                gameInWindow: typeof window.Game === 'function',
                canvasExists: !!canvas,
                canvasContext: canvas ? !!canvas.getContext : false
            };
            console.log("Game diagnostics:", diagnostics);
            
            // Try multiple ways to get the Game constructor
            let GameConstructor = null;
            if (typeof Game === 'function') {
                GameConstructor = Game;
            } else if (typeof window.Game === 'function') {
                GameConstructor = window.Game;
            }
            
            if (canvas && GameConstructor) {
                try {
                    console.log("Creating new game instance");
                    const game = new GameConstructor(canvas);
                    
                    console.log("Setting game properties");
                    game.gameMode = selectedGameMode;
                    game.difficulty = selectedDifficulty;
                    
                    console.log("Starting game");
                    game.start();
                    
                    // Store in window for accessibility
                    window.game = game;
                    console.log("Game started successfully");
                } catch (initError) {
                    console.error("Error during game initialization:", initError);
                    // Try simple debug game as fallback
                    if (typeof SimpleDebugGame === 'function') {
                        console.log("Falling back to SimpleDebugGame");
                        try {
                            const debugGame = new SimpleDebugGame(canvas);
                            debugGame.gameMode = selectedGameMode;
                            debugGame.difficulty = selectedDifficulty;
                            debugGame.start();
                            window.game = debugGame;
                        } catch (debugError) {
                            console.error("Even debug game failed:", debugError);
                            alert("Critical error: " + initError.message);
                        }
                    } else {
                        alert("Game initialization error: " + initError.message);
                    }
                }
            } else {
                console.error("Cannot create game:", diagnostics);
                if (typeof SimpleDebugGame === 'function') {
                    console.log("Trying SimpleDebugGame as fallback");
                    try {
                        const debugGame = new SimpleDebugGame(canvas);
                        debugGame.start();
                        window.game = debugGame;
                    } catch (error) {
                        console.error("SimpleDebugGame failed:", error);
                        alert("Game initialization error. Please refresh and try again.");
                    }
                } else {
                    alert("Game initialization error: Game class or canvas not found");
                }
            }
        }
    } catch (error) {
        console.error("Error starting game:", error);
        alert("Game initialization error. Please refresh and try again.");
    }
}

// Function to start game in standard (non-FB Instant) mode
function startGameStandard() {
    console.log("Starting game in standard mode");
    
    const gameMenu = document.getElementById('gameMenu');
    const gameScreen = document.getElementById('gameScreen');
    
    // Hide menu and show game
    gameMenu.style.display = 'none';
    gameScreen.style.display = 'flex';
    document.body.classList.add('game-active');
    
    // Try different global start functions in priority order
    if (typeof window.setupAndStartGame === 'function') {
        console.log("Calling window.setupAndStartGame()");
        window.setupAndStartGame();
    } else if (typeof window.startGame === 'function') {
        console.log("Calling window.startGame()");
        window.startGame();
    } else {
        console.error("No game start function found!");
        alert("Game initialization error. Please refresh the page and try again.");
    }
}

// Function to ensure game is properly started
function ensureProperGameStart() {
    // Add a one-time initialization check after everything has loaded
    setTimeout(function() {
        const gameMenu = document.getElementById('gameMenu');
        const gameScreen = document.getElementById('gameScreen');
        
        if (gameScreen.style.display === 'none') {
            console.log("Game screen is still hidden. Game might not have started correctly.");
        }
        
        // Check if game object exists and has been initialized
        if (window.game) {
            console.log("Game object exists:", window.game.gameStarted ? "Game started" : "Game not started");
        } else {
            console.log("Game object doesn't exist in window scope");
        }
    }, 1000);
}

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        checkAndFixEventListeners();
        ensureProperGameStart();
    });
} else {
    // DOM already loaded
    checkAndFixEventListeners();
    ensureProperGameStart();
}
