// Game State Management and Core Mechanics

import { GAME_CONFIG } from '../../config/gameConfig.js';
import { Bubble } from './bubble.js';

export class GameStateManager {
    constructor(game) {
        this.game = game;
        this.infiniteStack = [];
        this.lastDescentTime = Date.now();
        this.pendingNewRow = false;
        this.loseLineRow = 0;
    }

    /**
     * Generate infinite stack of rows for descent
     */
    generateInfiniteStack() {
        const settings = GAME_CONFIG.DIFFICULTY[this.game.difficulty];
        const colorSubset = GAME_CONFIG.BUBBLE.COLORS.slice(0, settings.colors);
        
        // Calculate effective grid columns based on current canvas width
        const maxBubblesPerRow = Math.floor((this.game.canvas.width - GAME_CONFIG.BUBBLE.RADIUS * 2) / GAME_CONFIG.GRID.COL_SPACING);
        const effectiveGridCols = Math.min(GAME_CONFIG.GRID.COLS, maxBubblesPerRow);
        
        console.log('Generating infinite stack with settings:', { effectiveGridCols, canvasWidth: this.game.canvas.width });
        
        // Generate 20 rows ahead of time
        for (let i = 0; i < 20; i++) {
            const rowData = [];
            
            // Fill the entire effective width with bubbles for consistent descent
            for (let col = 0; col < effectiveGridCols; col++) {
                // Create strategic patterns in the generated rows
                let color;
                if (i > 0 && col > 0 && Math.random() < 0.4) {
                    // Sometimes use color from previous position for clusters
                    color = rowData[col - 1] || colorSubset[Math.floor(Math.random() * colorSubset.length)];
                } else {
                    color = colorSubset[Math.floor(Math.random() * colorSubset.length)];
                }
                rowData.push(color);
            }
            
            // Store row with metadata for validation
            this.infiniteStack.push({
                bubbles: rowData,
                effectiveGridCols: effectiveGridCols,
                canvasWidth: this.game.canvas.width,
                generatedAt: Date.now()
            });
        }
        
        console.log('Generated infinite stack with', this.infiniteStack.length, 'rows');
    }

    /**
     * Calculate lose line position
     */
    calculateLoseLine() {
        // Use the Game's lose line calculation instead of duplicating logic
        this.game.calculateLoseLine();
        this.loseLineRow = this.game.loseLineRow;
        
        console.log('GameStateManager calculateLoseLine() - BEFORE/AFTER:', {
            gameStateMgrLoseLineRow: this.loseLineRow,
            gameLoseLineRow: this.game.loseLineRow,
            synced: this.loseLineRow === this.game.loseLineRow
        });
    }

    /**
     * Add new row of bubbles from infinite stack
     */
    addNewRow() {
        console.log('=== ADDING NEW ROW ===');
        
        if (this.infiniteStack.length === 0) {
            console.warn('Infinite stack is empty! Regenerating...');
            this.generateInfiniteStack();
        }

        // Get the next row from infinite stack
        const newRowWithMetadata = this.infiniteStack.shift();
        const newRowData = newRowWithMetadata.bubbles;
        const storedEffectiveGridCols = newRowWithMetadata.effectiveGridCols;
        
        // Calculate current effective grid cols for validation
        const maxBubblesPerRow = Math.floor((this.game.canvas.width - GAME_CONFIG.BUBBLE.RADIUS * 2) / GAME_CONFIG.GRID.COL_SPACING);
        const currentEffectiveGridCols = Math.min(GAME_CONFIG.GRID.COLS, maxBubblesPerRow);
        
        console.log(`Using row with stored effectiveGridCols: ${storedEffectiveGridCols}, current would be: ${currentEffectiveGridCols}`);
        
        // Extend grid if needed
        const maxNeededRows = this.loseLineRow + 3;
        while (this.game.gridBubbles.length < maxNeededRows) {
            this.game.gridBubbles.push(new Array(GAME_CONFIG.GRID.COLS).fill(null));
        }
        
        // Animation settings
        const descentDurationMs = 300;
        const animationStartTime = Date.now();
        
        // Move all existing bubbles down one row
        for (let row = this.game.gridBubbles.length - 1; row >= 1; row--) {
            for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
                if (this.game.gridBubbles[row - 1][col]) {
                    const bubble = this.game.gridBubbles[row - 1][col];
                    
                    // Store starting position for animation
                    bubble.startX = bubble.x;
                    bubble.startY = bubble.y;
                    
                    // Calculate target position
                    const targetX = this.game.getColPosition(row, col);
                    const targetY = this.game.getRowPosition(row);
                    
                    // Set up descent animation
                    bubble.targetRow = row;
                    bubble.targetCol = col;
                    bubble.targetX = targetX;
                    bubble.targetY = targetY;
                    bubble.isDescending = true;
                    bubble.descentStartTime = animationStartTime;
                    bubble.descentDuration = descentDurationMs;
                    
                    // Move bubble to new grid position
                    this.game.gridBubbles[row][col] = bubble;
                    this.game.gridBubbles[row - 1][col] = null;
                    
                    // Update logical position
                    bubble.row = row;
                    bubble.col = col;
                }
            }
        }
        
        // Add new row at the top
        const effectiveGridCols = storedEffectiveGridCols;
        
        for (let col = 0; col < effectiveGridCols; col++) {
            let color = newRowData[col];
            
            // Fallback color if needed
            if (!color) {
                const settings = GAME_CONFIG.DIFFICULTY[this.game.difficulty];
                const colorSubset = GAME_CONFIG.BUBBLE.COLORS.slice(0, settings.colors);
                color = colorSubset[Math.floor(Math.random() * colorSubset.length)];
                console.warn(`Missing color at col ${col}, using fallback: ${color}`);
            }
            
            // Calculate positions
            const finalX = this.game.getColPosition(0, col);
            const finalY = this.game.getRowPosition(0);
            const startY = finalY - GAME_CONFIG.GRID.ROW_HEIGHT;
            
            // Create bubble
            const bubble = new Bubble(finalX, startY, color, 0, col);
            bubble.game = this.game;
            bubble.stuck = true;
            bubble.vx = 0;
            bubble.vy = 0;
            
            // Set up entry animation
            bubble.targetX = finalX;
            bubble.targetY = finalY;
            bubble.isEntering = true;
            bubble.entryStartTime = animationStartTime;
            bubble.entryDuration = descentDurationMs;
            bubble.entryProgress = 0;
            bubble.opacity = 0; // Start invisible
            
            this.game.gridBubbles[0][col] = bubble;
        }
        
        // Replenish infinite stack
        if (this.infiniteStack.length < 10) {
            this.generateInfiniteStack();
        }
        
        // Reset missed shots counter
        this.game.missedShots = 0;
        
        console.log('New row added. Grid now has', this.game.gridBubbles.length, 'rows');
        console.log('Bubbles in grid:', this.game.gridBubbles.flat().filter(b => b !== null).length);
        
        // Check for immediate lose condition
        this.checkLoseCondition();
    }

    /**
     * Check if bubbles have reached the lose line
     */
    checkLoseCondition() {
        // Don't check lose condition during initialization
        if (this.game.initializing) {
            console.log('checkLoseCondition() skipped - game still initializing');
            return false;
        }
        
        // Ensure we have the latest lose line calculation
        if (this.loseLineRow !== this.game.loseLineRow) {
            console.log('SYNC ISSUE: GameStateManager loseLineRow out of sync, updating:', {
                oldValue: this.loseLineRow,
                newValue: this.game.loseLineRow
            });
            this.loseLineRow = this.game.loseLineRow;
        }
        
        // Only log occasionally to reduce spam
        if (Math.random() < 0.01) { // Log only 1% of the time
            console.log('checkLoseCondition() running with loseLineRow:', this.loseLineRow);
        }
        
        for (let row = this.loseLineRow; row < this.game.gridBubbles.length; row++) {
            for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
                if (this.game.gridBubbles[row] && this.game.gridBubbles[row][col]) {
                    console.log('LOSE CONDITION MET: Bubble found at row', row, 'which is at/below lose line row', this.loseLineRow);
                    this.game.gameOver = true;
                    this.game.gameWon = false;
                    
                    // Cleanup 3D representations
                    if (this.game.shooter) {
                        this.game.shooter.cleanup3D();
                    }
                    
                    this.game.playSound('lose');
                    this.game.saveHighScore(this.game.score);
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check if descent should be triggered
     */
    checkDescentTriggers() {
        const settings = GAME_CONFIG.DIFFICULTY[this.game.difficulty];
        const currentTime = Date.now();
        
        // Trigger by shot count
        if (this.game.shotCount % settings.addRowFrequency === 0 && this.game.shotCount > 0) {
            console.log('Descent triggered by shot count:', this.game.shotCount);
            this.pendingNewRow = true;
            return;
        }
        
        // Trigger by time (if enabled)
        if (settings.timeBasedDescent && 
            currentTime - this.lastDescentTime >= settings.timeBasedDescent) {
            console.log('Descent triggered by time:', currentTime - this.lastDescentTime, 'ms');
            this.pendingNewRow = true;
            this.lastDescentTime = currentTime;
            return;
        }
    }

    /**
     * Check overall game state for win/lose conditions
     */
    checkGameState() {
        // Don't check game state during initialization
        if (this.game.initializing || this.game.gameOver) return;
        
        // Check if all bubbles cleared (win condition)
        const effectiveRows = this.game.gridBubbles.length;
        const remainingBubbles = this.game.gridBubbles.flat().filter(b => b !== null).length;
        
        if (remainingBubbles === 0) {
            this.game.gameWon = true;
            this.game.gameOver = true;
            
            if (this.game.shooter) {
                this.game.shooter.cleanup3D();
            }
            
            this.game.playSound('win');
            this.game.saveHighScore(this.game.score);
            console.log('Game won! All bubbles cleared.');
            return;
        }
        
        // Check lose line condition
        if (this.checkLoseCondition()) {
            return;
        }
        
        // Game mode specific checks
        if (this.game.gameMode === "strategy") {
            if (this.game.shotsLeft <= 0) {
                this.game.gameOver = true;
                this.game.gameWon = false;
                
                if (this.game.shooter) {
                    this.game.shooter.cleanup3D();
                }
                
                this.game.playSound('lose');
                this.game.saveHighScore(this.game.score);
                console.log('Game over! No shots remaining in strategy mode.');
                return;
            }
        } else if (this.game.gameMode === "arcade") {
            if (this.game.timeLeft <= 0) {
                this.game.gameOver = true;
                this.game.gameWon = false;
                
                if (this.game.shooter) {
                    this.game.shooter.cleanup3D();
                }
                
                this.game.playSound('lose');
                this.game.saveHighScore(this.game.score);
                console.log('Game over! Time expired in arcade mode.');
                return;
            }
        }
        
        // Check if grid is completely full
        let gridFull = true;
        for (let row = 0; row < GAME_CONFIG.GRID.ROWS && gridFull; row++) {
            for (let col = 0; col < GAME_CONFIG.GRID.COLS && gridFull; col++) {
                if (this.game.gridBubbles[row][col] === null) {
                    gridFull = false;
                }
            }
        }
        
        if (gridFull) {
            this.game.gameOver = true;
            this.game.gameWon = false;
            
            if (this.game.shooter) {
                this.game.shooter.cleanup3D();
            }
            
            this.game.playSound('lose');
            this.game.saveHighScore(this.game.score);
            console.log('Game over! Grid is completely full.');
            return;
        }
    }

    /**
     * Process pending new row addition
     */
    processPendingNewRow() {
        if (this.pendingNewRow && this.game.flyingBubbles.length === 0) {
            this.addNewRow();
            this.pendingNewRow = false;
        }
    }

    /**
     * Update descending bubble animations
     */
    updateDescentAnimations() {
        const currentTime = Date.now();
        const effectiveRows = this.game.gridBubbles.length;
        
        for (let row = 0; row < effectiveRows; row++) {
            for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
                if (this.game.gridBubbles[row] && this.game.gridBubbles[row][col]) {
                    const bubble = this.game.gridBubbles[row][col];
                    
                    // Handle descent animation
                    if (bubble.isDescending) {
                        const elapsed = currentTime - bubble.descentStartTime;
                        const progress = Math.min(elapsed / bubble.descentDuration, 1);
                        
                        if (progress < 1) {
                            // Smooth interpolation from start to target position
                            bubble.x = bubble.startX + (bubble.targetX - bubble.startX) * progress;
                            bubble.y = bubble.startY + (bubble.targetY - bubble.startY) * progress;
                        } else {
                            // Animation complete
                            bubble.x = bubble.targetX;
                            bubble.y = bubble.targetY;
                            bubble.isDescending = false;
                        }
                    }
                    
                    // Handle entry animation for new bubbles
                    if (bubble.isEntering) {
                        const elapsed = currentTime - bubble.entryStartTime;
                        const progress = Math.min(elapsed / bubble.entryDuration, 1);
                        
                        if (progress < 1) {
                            // Smooth entry with fade-in
                            bubble.y = bubble.startY + (bubble.targetY - bubble.startY) * progress;
                            bubble.opacity = progress;
                            bubble.entryProgress = progress;
                        } else {
                            // Entry complete
                            bubble.y = bubble.targetY;
                            bubble.opacity = 1;
                            bubble.isEntering = false;
                            bubble.entryProgress = 1;
                        }
                    }
                }
            }
        }
    }

    /**
     * Reset state manager for new game
     */
    reset() {
        this.infiniteStack = [];
        this.lastDescentTime = Date.now();
        this.pendingNewRow = false;
        this.loseLineRow = 0;
        this.generateInfiniteStack();
        this.calculateLoseLine();
    }
}
