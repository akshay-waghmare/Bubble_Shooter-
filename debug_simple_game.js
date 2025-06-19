// Simple game implementation for debugging purposes
console.log("Loading debug simple game implementation");

// This is a simplified version of the Game class for debugging
class SimpleDebugGame {
    constructor(canvas) {
        console.log("Creating SimpleDebugGame instance");
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameStarted = false;
        this.gameMode = 'classic';
        this.difficulty = 'novice';
        this.soundEnabled = true;
        
        // Ensure canvas dimensions
        canvas.width = Math.min(window.innerWidth - 20, 400);
        canvas.height = Math.min(window.innerHeight - 100, canvas.width * 1.6);
        console.log("Canvas dimensions:", canvas.width, canvas.height);
    }
    
    start() {
        console.log("Starting SimpleDebugGame");
        this.gameStarted = true;
        this.render();
    }
    
    resizeCanvas() {
        console.log("Resizing canvas in SimpleDebugGame");
        this.canvas.width = Math.min(window.innerWidth - 20, 400);
        this.canvas.height = Math.min(window.innerHeight - 100, this.canvas.width * 1.6);
        this.render();
    }
    
    render() {
        console.log("Rendering SimpleDebugGame");
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.fillStyle = '#152238';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw game title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("Bubble Shooter Debug Mode", this.canvas.width / 2, 50);
        
        // Draw game info
        ctx.font = '16px Arial';
        ctx.fillText(`Mode: ${this.gameMode}`, this.canvas.width / 2, 80);
        ctx.fillText(`Difficulty: ${this.difficulty}`, this.canvas.width / 2, 110);
        ctx.fillText("Game is running in debug mode", this.canvas.width / 2, 140);
        
        // Draw a test bubble
        ctx.beginPath();
        ctx.fillStyle = '#FF6B6B';
        ctx.arc(this.canvas.width / 2, 200, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }
}

// Check if the original Game class is available
if (typeof Game !== 'function') {
    console.log("Game class not found, providing debug implementation");
    window.Game = SimpleDebugGame;
}

// Provide a simple game start mechanism as fallback
if (typeof window.setupAndStartGame !== 'function') {
    console.log("Setting up debug game start function");
    
    window.setupAndStartGame = function() {
        console.log("Debug setupAndStartGame called");
        
        try {
            // Get UI elements
            const gameMenu = document.getElementById('gameMenu');
            const gameScreen = document.getElementById('gameScreen');
            const canvas = document.getElementById('gameCanvas');
            
            // Hide menu and show game
            if (gameMenu) gameMenu.style.display = 'none';
            if (gameScreen) gameScreen.style.display = 'flex';
            document.body.classList.add('game-active');
            
            // Get game settings
            const selectedGameMode = document.querySelector('.button-group button[data-mode].active')?.getAttribute('data-mode') || 'classic';
            const selectedDifficulty = document.querySelector('.button-group button[data-difficulty].active')?.getAttribute('data-difficulty') || 'novice';
            
            console.log("Creating game with settings:", { mode: selectedGameMode, difficulty: selectedDifficulty });
            
            if (canvas) {
                // Try to use Game constructor if it exists
                let GameConstructor = window.Game;
                
                if (typeof GameConstructor !== 'function') {
                    console.warn("Game constructor not found, using SimpleDebugGame");
                    GameConstructor = SimpleDebugGame;
                }
                
                // Create and start the game
                const game = new GameConstructor(canvas);
                game.gameMode = selectedGameMode;
                game.difficulty = selectedDifficulty;
                game.start();
                
                // Store in global scope for debugging
                window.game = game;
                
                console.log("Game started successfully");
            } else {
                console.error("Canvas element not found");
                alert("Cannot initialize game: Canvas not found");
            }
        } catch (error) {
            console.error("Error in debug game setup:", error);
            alert("Game initialization error: " + error.message);
        }
    };
}

console.log("Debug simple game implementation loaded successfully");
