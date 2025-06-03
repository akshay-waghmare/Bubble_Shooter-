// Enhanced Game Class - Core gameplay mechanics and initialization

import { GAME_CONFIG } from '../../config/gameConfig.js';
import { DebugLogger } from '../core/debugLogger.js';
import { CollisionPredictor } from '../physics/collisionPredictor.js';
import { PhysicsEngine } from '../physics/physicsEngine.js';
import { EventManager } from '../core/eventManager.js';
import { GameLoop } from '../core/gameLoop.js';
import { CollisionManager } from './collisionManager.js';
import { GameStateManager } from './gameStateManager.js';
import { GameUI } from '../ui/gameUI.js';
import { SoundManager } from '../audio/soundManager.js';
import { Shooter } from './shooter.js';
import { Bubble } from './bubble.js';

// Global debug counter
let gameInstanceCount = 0;

export class Game {
    constructor(canvas) {
        gameInstanceCount++;
        console.log(`=== GAME CONSTRUCTOR START === instance #${gameInstanceCount} timestamp:`, Date.now());
        
        // Mark initialization as starting
        this.initializing = true;
        
        try {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            console.log('✅ Canvas and 2D context initialized');
            
            // RENDERING MODE SELECTION
            this.use3D = false; // Set to true for 3D mode, false for 2D mode (disabled for modular testing)
            this.renderer3D = null;
            this.trailRenderer = null;
            
            // Initialize 3D renderer if enabled and Three.js is available
            if (this.use3D && typeof THREE !== 'undefined') {
                try {
                    console.log('Initializing 3D bubble renderer...');
                    this.renderer3D = new BubbleRenderer3D(canvas);
                    console.log('✅ 3D renderer created');
                    this.trailRenderer = new BubbleTrailRenderer(this.renderer3D.scene, this.renderer3D.camera);
                    console.log('✅ 3D renderer initialized successfully');
                } catch (error) {
                    console.warn('⚠️ 3D renderer failed to initialize, falling back to 2D:', error);
                    this.use3D = false;
                    this.renderer3D = null;
                    this.trailRenderer = null;
                }
            } else if (this.use3D) {
                console.warn('⚠️ Three.js not available, falling back to 2D rendering');
                this.use3D = false;
            }
            
            console.log(`🎨 Rendering mode: ${this.use3D ? '3D (Three.js)' : '2D (Canvas)'}`);
            
            // Initialize physics engine
            this.physicsEngine = new PhysicsEngine();
            this.physicsEngine.initialize();
            
            // Set canvas dimensions
            this._initializeCanvasDimensions();
            
            // Create physics walls
            this.physicsEngine.createWalls(this.canvas.width, this.canvas.height);
            
            console.log('Canvas dimensions set:', { width: canvas.width, height: canvas.height });
            
            // Initialize game state
            this._initializeGameState();
            
            // Initialize all manager systems
            this.debugLogger = new DebugLogger(false); // Enable with 'D' key
            this.collisionPredictor = new CollisionPredictor();
            
            // Initialize event manager for input handling
            this.eventManager = new EventManager(this);
            
            // Initialize game loop manager
            this.gameLoop = new GameLoop(this);
            
            // Initialize collision manager
            this.collisionManager = new CollisionManager(this);
            
            // Initialize game state manager
            this.gameStateManager = new GameStateManager(this);
            
            // Initialize UI system
            this.gameUI = new GameUI(this);
            
            // Initialize sound manager
            this.soundManager = new SoundManager();
            
            // Initialize debug and performance tracking
            this.frameStartTime = 0;
            this.collisionChecksThisFrame = 0;
            this.gridSnapsThisFrame = 0;
            this.showDebugInfo = false; // Toggle with 'I' key
            
            // Enhanced collision settings
            this.collisionSettings = {
                precisionFactor: 0.98, // Tighter collision detection
                wallBounceRestitution: 0.95, // Energy retention on wall bounce
                snapDistance: GAME_CONFIG.BUBBLE.RADIUS * 2.05, // Distance for proximity snapping
                predictionSteps: 10, // Steps ahead for collision prediction
                smoothingFactor: 0.1 // For velocity smoothing
            };
            
            // Score buckets system
            this.scoreBuckets = [
                { x: 0, width: 0, score: 100, color: '#4ECDC4', label: '100' },
                { x: 0, width: 0, score: 200, color: '#45B7D1', label: '200' },
                { x: 0, width: 0, score: 300, color: '#FF6B6B', label: '300' }
            ];
            this.finishLineY = 0; // Will be set in resizeCanvas
            
            console.log('=== INITIALIZING MANAGERS ===');
            this.soundManager.initialize();
            console.log('✅ Managers initialized');
            
            console.log('=== CALLING initGame ===');
            this.initGame(); // Initialize the game grid and basic setup
            console.log('✅ Game initialized');
            
            // CRITICAL: Mark initialization as complete
            this.initializing = false;
            console.log('=== INITIALIZATION COMPLETE ===');
            
            console.log('=== STARTING gameLoop ===');
            this.gameLoop.start(); // Start the rendering loop using GameLoop manager
            console.log('✅ Game loop started');
            
            console.log('=== GAME CONSTRUCTOR END ===');
            
        } catch (error) {
            console.error('❌ CRITICAL ERROR in Game constructor:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    /**
     * Set up canvas dimensions to be responsive
     */
    _initializeCanvasDimensions() {
        // Set initial canvas dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const maxWidth = Math.min(viewportWidth - 20, 400);
        const portraitHeight = Math.min(viewportHeight - 100, maxWidth * 1.6);
        
        this.canvas.width = maxWidth;
        this.canvas.height = portraitHeight;
    }

    /**
     * Initialize all game state variables
     */
    _initializeGameState() {
        // Initialize bubble arrays
        this.gridBubbles = []; // 2D array representing the grid of bubbles
        this.flyingBubbles = []; // Bubbles that are currently moving
        this.removingBubbles = []; // Bubbles that are being removed
        this.fallingBubbles = []; // Bubbles that are falling
        
        // Initialize shooter as null - will be created in resizeCanvas
        this.shooter = null;
        
        // Game state
        this.mouseX = 0;
        this.mouseY = 0;
        this.score = 0;
        this.level = 1;
        this.missedShots = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.bubblesCleared = 0;
        this.totalBubbles = 0;
        this.gameMode = "classic"; // classic, arcade, strategy
        this.difficulty = "novice"; // novice, easy, medium, hard, master
        this.initializing = true; // Flag to prevent premature lose condition checks
        this.shotsLeft = Infinity; // For strategy mode
        this.timeLeft = Infinity; // For arcade mode
        this.soundEnabled = true;
        this.highScores = this.loadHighScores();
        this.lastTime = 0; // For smooth frame rate control
        
        this.gameStarted = false; // Track if game has been started
        this.showDebugGrid = false; // Debug mode to show hexagonal grid
        
        // CRITICAL: Add flag to prevent game loop from processing during initialization
        this.initializing = true;
        
        // CRITICAL: Add timestamp to prevent immediate shooting after game start
        this.gameStartTime = 0;
        this.shootingDelay = 500; // 500ms delay after game start before allowing shooting
        
        // Fix for collision detection timing issue
        this.pendingNewRow = false; // Flag to defer addNewRow() until after flying bubble processing
        
        // Infinite Stack System
        this.infiniteStack = []; // Pre-generated rows waiting to descend
        this.shotCount = 0; // Track shots fired for descent triggers
        this.lastDescentTime = 0; // Track time since last descent
        this.loseLineRow = 0; // Row index that defines the lose line (calculated dynamically)
        
        // Difficulty settings
        this.difficultySettings = {
            novice: {
                colors: 4,
                initialRows: 5,
                addRowFrequency: 15, // Add row every 15 shots
                timeBasedDescent: 45000, // 45 seconds
                shooterSpeedMultiplier: 0.8,
                scoreMultiplier: 1.0
            },
            easy: {
                colors: 5,
                initialRows: 6,
                addRowFrequency: 12,
                timeBasedDescent: 40000,
                shooterSpeedMultiplier: 0.9,
                scoreMultiplier: 1.2
            },
            medium: {
                colors: 6,
                initialRows: 7,
                addRowFrequency: 10,
                timeBasedDescent: 35000,
                shooterSpeedMultiplier: 1.0,
                scoreMultiplier: 1.5
            },
            hard: {
                colors: 7,
                initialRows: 8,
                addRowFrequency: 8,
                timeBasedDescent: 30000,
                shooterSpeedMultiplier: 1.1,
                scoreMultiplier: 2.0
            },
            master: {
                colors: 8,
                initialRows: 9,
                addRowFrequency: 6,
                timeBasedDescent: 25000,
                shooterSpeedMultiplier: 1.2,
                scoreMultiplier: 3.0
            }
        };
    }
    
    start() {
        this.resizeCanvas(); // Ensure proper sizing before starting
        
        // CRITICAL: Ensure game is properly initialized
        if (this.initializing) {
            console.log('Game still initializing, forcing completion...');
            this.initializing = false;
        }
        
        // CRITICAL: Force game state to started
        this.gameStarted = true; // Mark game as started
        this.gameOver = false;  // Ensure not in game over state
        this.gameWon = false;   // Ensure not in win state
        this.paused = false;    // Ensure not paused
        
        this.gameStartTime = Date.now(); // Record when game started
        
        // Ensure event listeners are attached - check EventManager's status, not Game's
        if (this.eventManager && !this.eventManager.eventListenersAttached) {
            console.log('[Game] EventManager needs initialization');
            this.eventManager.initialize();
            console.log('[Game] Event listeners attached after game start');
        } else if (this.eventManager && this.eventManager.eventListenersAttached) {
            console.log('[Game] Event listeners already attached at game start');
        }
        
        console.log('Game started at:', this.gameStartTime);
        console.log('Game state after start:', {
            gameStarted: this.gameStarted,
            gameOver: this.gameOver,
            gameWon: this.gameWon,
            initializing: this.initializing,
            paused: this.paused,
            gridBubbles: this.gridBubbles.flat().filter(b => b !== null).length
        });
        
        // Game loop is already running from constructor
    }

    loadHighScores() {
        const scores = localStorage.getItem('bubbleShooterHighScores');
        return scores ? JSON.parse(scores) : [];
    }

    saveHighScore(score) {
        const scores = this.loadHighScores();
        scores.push({ score, date: new Date().toISOString(), mode: this.gameMode, difficulty: this.difficulty });
        scores.sort((a, b) => b.score - a.score);
        if (scores.length > 10) scores.length = 10; // Keep only top 10
        localStorage.setItem('bubbleShooterHighScores', JSON.stringify(scores));
    }

    initGame() {
        console.log('=== INIT GAME START ===');
        
        this.gridBubbles = [];
        this.flyingBubbles = [];
        this.removingBubbles = [];
        this.fallingBubbles = [];
        this.score = 0;
        this.missedShots = 0;
        this.gameOver = false;
        this.gameWon = false;
        
        console.log('Arrays cleared, bubble counts:', {
            flyingBubbles: this.flyingBubbles.length,
            fallingBubbles: this.fallingBubbles.length,
            removingBubbles: this.removingBubbles.length
        });
        
        // Reset collision timing fix flag
        this.pendingNewRow = false;
        
        // Reset infinite stack system
        this.shotCount = 0;
        this.lastDescentTime = Date.now();
        this.infiniteStack = [];
        
        // Initialize grid
        for (let row = 0; row < GAME_CONFIG.GRID.ROWS; row++) {
            this.gridBubbles[row] = [];
            for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
                this.gridBubbles[row][col] = null;
            }
        }
        
        console.log('Grid initialized');
        
        // Initialize infinite stack with pre-generated rows
        this.generateInfiniteStack();
        
        // Calculate lose line (dynamically based on canvas height and shooter position)
        this.calculateLoseLine();
        
        // Ensure GameStateManager has the correct lose line
        if (this.gameStateManager) {
            this.gameStateManager.calculateLoseLine();
        }
        
        // Create initial bubble grid based on difficulty
        this._createInitialBubbleGrid();
        
        // Set up game mode specifics
        if (this.gameMode === "strategy") {
            this.shotsLeft = 30; // Limited shots for strategy mode
        } else if (this.gameMode === "arcade") {
            this.timeLeft = 120; // 2 minutes for arcade mode
        }
        
        console.log('=== INIT GAME END ===');
        console.log('Final bubble counts after initGame:', {
            gridBubbles: this.gridBubbles.flat().filter(b => b !== null).length,
            flyingBubbles: this.flyingBubbles.length,
            fallingBubbles: this.fallingBubbles.length,
            removingBubbles: this.removingBubbles.length
        });
        
        // Mark initialization as complete
        this.initializing = false;
        console.log('Game initialization complete - initializing flag set to false');
    }

    _createInitialBubbleGrid() {
        console.log('=== _createInitialBubbleGrid START ===');
        const settings = GAME_CONFIG.DIFFICULTY[this.difficulty];
        const colorSubset = GAME_CONFIG.BUBBLE.COLORS.slice(0, settings.colors);
        
        console.log('Creating initial bubbles with settings:', settings);
        console.log('Available colors:', colorSubset);
        
        // Calculate maximum bubbles that can fit in the grid based on canvas width
        const maxBubblesPerRow = Math.floor((this.canvas.width - GAME_CONFIG.BUBBLE.RADIUS * 2) / GAME_CONFIG.GRID.COL_SPACING);
        const effectiveGridCols = Math.min(GAME_CONFIG.GRID.COLS, maxBubblesPerRow);
        
        console.log('Grid calculations:', { maxBubblesPerRow, effectiveGridCols, rowsToStart: settings.rowsToStart });
        
        let bubblesCreated = 0;
        let bubblesSkipped = 0;
        for (let row = 0; row < settings.rowsToStart; row++) {
            for (let col = 0; col < effectiveGridCols; col++) {
                // ALWAYS CREATE BUBBLES for initial rows to ensure game starts properly
                const x = this.getColPosition(row, col);
                const y = this.getRowPosition(row);
                
                // Ensure we don't place bubbles too close to the edge
                if (x < GAME_CONFIG.BUBBLE.RADIUS || x > this.canvas.width - GAME_CONFIG.BUBBLE.RADIUS) {
                    bubblesSkipped++;
                    continue;
                }
                
                // Use wouldOverlapPrecise for robust overlap prevention
                if (this.wouldOverlapPrecise(x, y, row, col)) {
                    bubblesSkipped++;
                    continue;
                }
                
                // Always create bubbles for the initial setup
                const color = colorSubset[Math.floor(Math.random() * colorSubset.length)];
                
                const bubble = new Bubble(x, y, color, row, col);
                // CRITICAL: Set game reference for wall bounce detection
                bubble.game = this;
                // CRITICAL FIX: Set stuck=true IMMEDIATELY after creation, before any other operations
                bubble.stuck = true;
                bubble.vx = 0; // Ensure no velocity
                bubble.vy = 0; // Ensure no velocity
                this.gridBubbles[row][col] = bubble;
                this.totalBubbles++;
                bubblesCreated++;
            }
        }
        
        console.log('=== _createInitialBubbleGrid END ===');
        console.log('Grid bubble creation summary:', { 
            bubblesCreated, 
            bubblesSkipped, 
            totalAttempts: bubblesCreated + bubblesSkipped,
            gridBubblesLength: this.gridBubbles.length,
            totalBubbles: this.totalBubbles,
            effectiveGridCols,
            rowsToStart: settings.rowsToStart
        });
        
        // ENSURE we have at least SOME bubbles
        if (bubblesCreated === 0) {
            console.warn('❌ NO BUBBLES CREATED! Creating fallback bubbles...');
            // Create at least a few bubbles for testing
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < Math.min(5, effectiveGridCols); col++) {
                    const x = this.getColPosition(row, col);
                    const y = this.getRowPosition(row);
                    
                    if (x >= GAME_CONFIG.BUBBLE.RADIUS && x <= this.canvas.width - GAME_CONFIG.BUBBLE.RADIUS) {
                        const color = colorSubset[col % colorSubset.length];
                        const bubble = new Bubble(x, y, color, row, col);
                        bubble.game = this;
                        bubble.stuck = true;
                        bubble.vx = 0;
                        bubble.vy = 0;
                        this.gridBubbles[row][col] = bubble;
                        this.totalBubbles++;
                        bubblesCreated++;
                    }
                }
            }
            console.log('✅ Created', bubblesCreated, 'fallback bubbles');
        }
    }

    /**
     * Check if it's time for a new row to descend based on shot count or time
     */
    checkDescentTriggers() {
        // Check if it's time for a new row to descend based on shot count or time
        const settings = this.difficultySettings[this.difficulty];
        const now = Date.now();
        
        let shouldDescend = false;
        let reason = '';
        
        // Check shot-based trigger
        if (this.shotCount >= settings.addRowFrequency) {
            shouldDescend = true;
            reason = `shot count (${this.shotCount}/${settings.addRowFrequency})`;
            this.shotCount = 0; // Reset shot count
        }
        
        // Check time-based trigger
        const timeSinceLastDescent = now - this.lastDescentTime;
        if (timeSinceLastDescent >= settings.timeBasedDescent) {
            shouldDescend = true;
            reason = `time elapsed (${(timeSinceLastDescent/1000).toFixed(1)}s/${settings.timeBasedDescent/1000}s)`;
            this.lastDescentTime = now;
        }
        
        if (shouldDescend) {
            console.log(`Triggering descent due to: ${reason}`);
            // Use the pending flag to avoid calling addNewRow during bubble processing
            this.pendingNewRow = true;
        }
    }

    /**
     * Add a new row of bubbles and shift existing ones down
     */
    addNewRow() {
        // This is the core mechanic: shift all bubbles down and add a new row from infinite stack
        console.log('=== ADDING NEW ROW ===');
        
        if (this.infiniteStack.length === 0) {
            console.warn('Infinite stack is empty! Regenerating...');
            this.generateInfiniteStack();
        }
        
        // Get the next row from infinite stack (now includes metadata)
        const newRowWithMetadata = this.infiniteStack.shift();
        const newRowData = newRowWithMetadata.bubbles;
        const storedEffectiveGridCols = newRowWithMetadata.effectiveGridCols;
        
        // Calculate current effective grid cols for comparison/validation
        const maxBubblesPerRow = Math.floor((this.canvas.width - GAME_CONFIG.BUBBLE.RADIUS * 2) / GAME_CONFIG.GRID.COL_SPACING);
        const currentEffectiveGridCols = Math.min(GAME_CONFIG.GRID.COLS, maxBubblesPerRow);
        
        // Log for debugging - this helps us track when mismatches occur
        console.log(`Using row with stored effectiveGridCols: ${storedEffectiveGridCols}, current would be: ${currentEffectiveGridCols}`);
        if (storedEffectiveGridCols !== currentEffectiveGridCols) {
            console.warn(`🚨 Canvas width changed! Generated: ${storedEffectiveGridCols}, Current: ${currentEffectiveGridCols}, Canvas: ${this.canvas.width}px (was ${newRowWithMetadata.canvasWidth}px)`);
        }
        
        // Extend grid if needed to accommodate the descent
        const maxNeededRows = this.loseLineRow + 3; // Allow some buffer beyond lose line
        while (this.gridBubbles.length < maxNeededRows) {
            this.gridBubbles.push(new Array(GAME_CONFIG.GRID.COLS).fill(null));
        }
        
        // Start descent animation for all existing bubbles simultaneously with new row creation
        const descentDurationMs = 300; // Fixed duration for smooth, synchronized animation
        const fadeDurationMs = 300; // Same duration for perfect sync
        const animationStartTime = Date.now(); // Single timestamp for perfect synchronization
        
        for (let row = this.gridBubbles.length - 1; row >= 1; row--) {
            for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
                if (this.gridBubbles[row - 1][col]) {
                    const bubble = this.gridBubbles[row - 1][col];
                    
                    // Store starting position for smooth animation
                    bubble.startX = bubble.x;
                    bubble.startY = bubble.y;
                    
                    // Calculate target position for smooth animation
                    const targetX = this.getColPosition(row, col);
                    const targetY = this.getRowPosition(row);
                    
                    // Set up time-based descent animation
                    bubble.targetRow = row;
                    bubble.targetCol = col;
                    bubble.targetX = targetX;
                    bubble.targetY = targetY;
                    bubble.isDescending = true;
                    bubble.descentStartTime = animationStartTime;
                    bubble.descentDuration = descentDurationMs;
                    bubble.fadeStartTime = animationStartTime;
                    bubble.fadeDuration = fadeDurationMs;
                    
                    // Move bubble in grid array
                    this.gridBubbles[row][col] = bubble;
                    this.gridBubbles[row - 1][col] = null;
                }
            }
        }
        
        // Create new top row using infinite stack data with fade-in animation
        const effectiveGridCols = Math.min(storedEffectiveGridCols, currentEffectiveGridCols);
        for (let col = 0; col < effectiveGridCols; col++) {
            const color = newRowData[col];
            
            // Fallback: If for any reason the infinite stack doesn't have a color, generate one
            if (!color) {
                const settings = this.difficultySettings[this.difficulty];
                const colorSubset = GAME_CONFIG.BUBBLE.COLORS.slice(0, settings.colors);
                color = colorSubset[Math.floor(Math.random() * colorSubset.length)];
                console.warn(`Missing color at col ${col}, using fallback: ${color}`);
            }
            
            // Calculate final position
            const finalX = this.getColPosition(0, col);
            const finalY = this.getRowPosition(0);
            
            // Start position (above visible area for smooth entry)
            const startY = finalY - GAME_CONFIG.GRID.ROW_HEIGHT;
            
            // Create bubble starting above the grid
            const bubble = new Bubble(finalX, startY, color, 0, col);
            bubble.stuck = true;
            bubble.vx = 0;
            bubble.vy = 0;
            
            // Set up descent animation to match existing bubbles
            bubble.startX = finalX;
            bubble.startY = startY;
            bubble.targetX = finalX;
            bubble.targetY = finalY;
            bubble.targetRow = 0;
            bubble.targetCol = col;
            bubble.isDescending = true;
            bubble.descentStartTime = animationStartTime;
            bubble.descentDuration = descentDurationMs;
            bubble.fadeStartTime = animationStartTime;
            bubble.fadeDuration = fadeDurationMs;
            bubble.opacity = 0; // Start invisible for fade-in effect
            
            this.gridBubbles[0][col] = bubble;
        }
        
        // Regenerate infinite stack if running low
        if (this.infiniteStack.length < 10) {
            this.generateInfiniteStack();
        }
        
        // Reset missed shots counter as player gets fresh challenge
        this.missedShots = 0;
        
        console.log('New row added. Grid now has', this.gridBubbles.length, 'rows');
        console.log('Bubbles in grid:', this.gridBubbles.flat().filter(b => b !== null).length);
        
        // Check for immediate lose condition after descent
        this.checkLoseCondition();
    }

    /**
     * Generate infinite stack of pre-calculated rows for descent
     */
    generateInfiniteStack() {
        console.log('Generating infinite stack of bubble rows...');
        
        const settings = this.difficultySettings[this.difficulty];
        const colorSubset = GAME_CONFIG.BUBBLE.COLORS.slice(0, settings.colors);
        
        // Calculate effective grid columns based on current canvas width
        const maxBubblesPerRow = Math.floor((this.canvas.width - GAME_CONFIG.BUBBLE.RADIUS * 2) / GAME_CONFIG.GRID.COL_SPACING);
        const effectiveGridCols = Math.min(GAME_CONFIG.GRID.COLS, maxBubblesPerRow);
        
        // Generate 50 rows ahead of time
        for (let stackRow = 0; stackRow < 50; stackRow++) {
            const bubbleRow = [];
            
            for (let col = 0; col < effectiveGridCols; col++) {
                // 80% chance to place a bubble (creates interesting gaps)
                if (Math.random() < 0.80) {
                    const color = colorSubset[Math.floor(Math.random() * colorSubset.length)];
                    bubbleRow[col] = color;
                } else {
                    bubbleRow[col] = null; // Empty space
                }
            }
            
            // Store row with metadata to handle canvas width changes
            this.infiniteStack.push({
                bubbles: bubbleRow,
                effectiveGridCols: effectiveGridCols,
                canvasWidth: this.canvas.width,
                generatedAt: Date.now()
            });
        }
        
        console.log(`Generated ${this.infiniteStack.length} rows in infinite stack`);
    }

    /**
     * Check if bubbles have reached the lose line
     */
    checkLoseCondition() {
        // Check if any bubble has reached or crossed the lose line
        for (let row = this.loseLineRow; row < this.gridBubbles.length; row++) {
            for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
                if (this.gridBubbles[row] && this.gridBubbles[row][col]) {
                    console.log('LOSE CONDITION MET: Bubble found at row', row, 'which is at/below lose line row', this.loseLineRow);
                    this.gameStateManager.setGameOver(false); // Lost, not won
                    this.playSound('lose');
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Calculate the lose line based on canvas dimensions and shooter position
     */
    calculateLoseLine() {
        // Calculate the lose line based on canvas dimensions and shooter position
        const shooterY = this.canvas.height - 50; // Estimated shooter position
        const safeZone = 100; // Minimum safe zone above shooter
        const loseLineY = shooterY - safeZone;
        
        // Convert Y position to row index
        this.loseLineRow = Math.floor((loseLineY - GAME_CONFIG.GRID.TOP_MARGIN) / GAME_CONFIG.GRID.ROW_HEIGHT);
        
        // Ensure lose line is reasonable (at least 8 rows from top)
        this.loseLineRow = Math.max(8, this.loseLineRow);
        
        console.log('Lose line calculated:', {
            loseLineY,
            loseLineRow: this.loseLineRow,
            shooterY,
            safeZone
        });
    }

    /**
     * Get column position for hexagonal grid
     */
    getColPosition(row, col) {
        // Perfect hexagonal grid positioning
        const isOddRow = row % 2 === 1;
        const baseX = col * GAME_CONFIG.GRID.COL_SPACING + GAME_CONFIG.BUBBLE.RADIUS;
        
        // For odd rows, offset by exactly half the column spacing for perfect hexagonal alignment
        const offsetX = isOddRow ? GAME_CONFIG.BUBBLE.RADIUS : 0;
        
        return baseX + offsetX;
    }

    /**
     * Get row position for hexagonal grid
     */
    getRowPosition(row) {
        // Perfect vertical spacing using √3 * radius for true hexagonal geometry
        return row * GAME_CONFIG.GRID.ROW_HEIGHT + GAME_CONFIG.GRID.TOP_MARGIN;
    }

    /**
     * Snap flying bubble to grid position
     */
    snapBubbleToGrid(bubble) {
        // Find the best grid position for this bubble
        const bestPosition = this.findBestGridPosition(bubble.x, bubble.y);
        
        if (bestPosition) {
            // Disable physics
            if (bubble.disablePhysics && this.physicsEngine) {
                bubble.disablePhysics(this.physicsEngine.engine);
            }
            
            // Move to grid position
            bubble.x = bestPosition.x;
            bubble.y = bestPosition.y;
            bubble.row = bestPosition.row;
            bubble.col = bestPosition.col;
            bubble.stuck = true;
            bubble.vx = 0;
            bubble.vy = 0;
            
            // Add to grid
            this.gridBubbles[bestPosition.row][bestPosition.col] = bubble;
            
            console.log('Bubble snapped to grid at:', bestPosition);
            
            // Check for matches and clear bubbles
            this.checkMatches(bestPosition.row, bestPosition.col);
        }
    }

    /**
     * Find best grid position for bubble placement
     */
    findBestGridPosition(x, y) {
        let bestPosition = null;
        let minDistance = Infinity;
        
        // Calculate dynamic maximum row based on danger zone
        const shooterY = this.shooter ? this.shooter.y : this.canvas.height - 50;
        const dangerZoneY = shooterY - 80;
        const maxAllowedY = dangerZoneY - 5; // Much closer to danger zone
        
        // Calculate maximum row that fits before danger zone
        const maxRow = Math.floor((maxAllowedY - GAME_CONFIG.GRID.TOP_MARGIN) / GAME_CONFIG.GRID.ROW_HEIGHT);
        const effectiveMaxRows = Math.max(GAME_CONFIG.GRID.ROWS, maxRow);
        
        // Extend gridBubbles array if needed
        while (this.gridBubbles.length <= effectiveMaxRows) {
            const newRow = new Array(GAME_CONFIG.GRID.COLS).fill(null);
            this.gridBubbles.push(newRow);
        }
        
        // Check nearby grid positions including extended range
        for (let row = 0; row <= effectiveMaxRows; row++) {
            for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
                // Ensure row exists in gridBubbles array
                if (!this.gridBubbles[row]) {
                    this.gridBubbles[row] = new Array(GAME_CONFIG.GRID.COLS).fill(null);
                }
                
                if (this.gridBubbles[row][col] === null) {
                    const gridX = this.getColPosition(row, col);
                    const gridY = this.getRowPosition(row);
                    
                    // Only consider positions that don't exceed danger zone
                    if (gridY <= maxAllowedY) {
                        const distance = Math.sqrt((x - gridX) ** 2 + (y - gridY) ** 2);
                        
                        if (distance < minDistance && distance < GAME_CONFIG.BUBBLE.RADIUS * 2.5) {
                            minDistance = distance;
                            bestPosition = { x: gridX, y: gridY, row, col };
                        }
                    }
                }
            }
        }
        
        return bestPosition;
    }

    /**
     * Check for matches after bubble placement
     */
    checkMatches(row, col) {
        const bubble = this.gridBubbles[row][col];
        if (!bubble) return;
        
        const color = bubble.color;
        const matches = [];
        const visited = new Set();
        
        // Flood fill to find connected bubbles of same color
        const queue = [{ row, col }];
        visited.add(`${row},${col}`);
        matches.push({ row, col });
        
        while (queue.length > 0) {
            const { row: currentRow, col: currentCol } = queue.shift();
            
            // Check all 6 neighbors in hexagonal grid
            const neighbors = this.getNeighbors(currentRow, currentCol);
            
            for (const { row: nRow, col: nCol } of neighbors) {
                const key = `${nRow},${nCol}`;
                if (!visited.has(key) && 
                    this.gridBubbles[nRow] && 
                    this.gridBubbles[nRow][nCol] &&
                    this.gridBubbles[nRow][nCol].color === color) {
                    
                    visited.add(key);
                    queue.push({ row: nRow, col: nCol });
                    matches.push({ row: nRow, col: nCol });
                }
            }
        }
        
        // Remove matches if 3 or more
        if (matches.length >= 3) {
            for (const { row: mRow, col: mCol } of matches) {
                const matchedBubble = this.gridBubbles[mRow][mCol];
                if (matchedBubble) {
                    matchedBubble.removing = true;
                    this.removingBubbles.push(matchedBubble);
                    this.gridBubbles[mRow][mCol] = null;
                    this.gameStateManager.addScore(10);
                }
            }
            
            // Check for floating bubbles
            this.checkFloatingBubbles();
        }
    }

    /**
     * Get hexagonal neighbors for a grid position
     */
    getNeighbors(row, col) {
        const neighbors = [];
        const isOddRow = row % 2 === 1;
        
        // Hexagonal grid neighbors
        const offsets = isOddRow ? [
            [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]
        ] : [
            [-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]
        ];
        
        for (const [dr, dc] of offsets) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (newRow >= 0 && newRow < this.gridBubbles.length && 
                newCol >= 0 && newCol < GAME_CONFIG.GRID.COLS) {
                neighbors.push({ row: newRow, col: newCol });
            }
        }
        
        return neighbors;
    }

    /**
     * Check for floating bubbles after match removal
     */
    checkFloatingBubbles() {
        // Mark all bubbles as potentially floating
        const connected = new Set();
        
        // Start from top row - bubbles connected to top are not floating
        for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
            if (this.gridBubbles[0] && this.gridBubbles[0][col]) {
                this.markConnected(0, col, connected);
            }
        }
        
        // Find floating bubbles
        const floating = [];
        for (let row = 0; row < this.gridBubbles.length; row++) {
            for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
                if (this.gridBubbles[row][col] && !connected.has(`${row},${col}`)) {
                    floating.push(this.gridBubbles[row][col]);
                    this.gridBubbles[row][col] = null;
                }
            }
        }
        
        // Make floating bubbles fall
        for (const bubble of floating) {
            bubble.stuck = false;
            bubble.falling = true;
            this.fallingBubbles.push(bubble);
            this.gameStateManager.addScore(5); // Bonus for floating bubbles
        }
    }

    /**
     * Mark connected bubbles (not floating)
     */
    markConnected(row, col, connected) {
        const key = `${row},${col}`;
        if (connected.has(key)) return;
        
        connected.add(key);
        
        const neighbors = this.getNeighbors(row, col);
        for (const { row: nRow, col: nCol } of neighbors) {
            if (this.gridBubbles[nRow] && this.gridBubbles[nRow][nCol]) {
                this.markConnected(nRow, nCol, connected);
            }
        }
    }

    // ========== MANAGER COORDINATION METHODS ==========
    
    /**
     * Delegate shooting to shooter and managers
     */
    shoot(targetX, targetY) {
        if (!this.shooter) return false;
        
        const success = this.shooter.shoot(targetX, targetY);
        if (success) {
            this.eventManager.onShoot();
            this.soundManager.playShoot();
            this.gameStateManager.onShoot();
        }
        return success;
    }
    
    /**
     * Update game - called by GameLoop
     */
    update(deltaTime) {
        if (this.initializing || this.gameOver) return;
        
        // Update all managers
        this.gameStateManager.update(deltaTime);
        this.collisionManager.update(deltaTime);
        
        // Update physics
        this.physicsEngine.update(deltaTime);
        
        // Update all bubbles
        this.updateBubbles(deltaTime);
        
        // Check game conditions
        this.gameStateManager.checkGameConditions();
    }
    
    /**
     * Render game - called by GameLoop
     */
    render() {
        if (this.initializing) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render using GameUI
        this.gameUI.render();
    }
    
    /**
     * Update bubble positions and physics
     */
    updateBubbles(deltaTime) {
        // Update flying bubbles
        for (let i = this.flyingBubbles.length - 1; i >= 0; i--) {
            const bubble = this.flyingBubbles[i];
            bubble.update(deltaTime);
            
            // Check for collisions
            this.collisionManager.checkCollisions(bubble);
        }
        
        // Update falling bubbles
        for (let i = this.fallingBubbles.length - 1; i >= 0; i--) {
            const bubble = this.fallingBubbles[i];
            bubble.update(deltaTime);
            
            // Remove if off screen
            if (bubble.y > this.canvas.height + GAME_CONFIG.BUBBLE.RADIUS) {
                this.fallingBubbles.splice(i, 1);
            }
        }
        
        // Update removing bubbles (animation)
        for (let i = this.removingBubbles.length - 1; i >= 0; i--) {
            const bubble = this.removingBubbles[i];
            bubble.update(deltaTime);
            
            // Remove if animation complete
            if (bubble.scale <= 0) {
                this.removingBubbles.splice(i, 1);
            }
        }
    }
    
    /**
     * Resize canvas and update all dependent systems
     */
    resizeCanvas() {
        this._initializeCanvasDimensions();
        
        // Update physics walls
        this.physicsEngine.createWalls(this.canvas.width, this.canvas.height);
        
        // Recreate shooter with new dimensions
        const shooterY = this.canvas.height - 50;
        this.shooter = new Shooter(this.canvas.width / 2, shooterY, this);
        
        // Update score buckets
        this.updateScoreBuckets();
        
        // Recalculate lose line
        this.calculateLoseLine();
        
        // DO NOT call initGame() here!
        console.log('Canvas resized to:', { width: this.canvas.width, height: this.canvas.height });
    }
    
    /**
     * Update score buckets positioning
     */
    updateScoreBuckets() {
        const bucketWidth = this.canvas.width / this.scoreBuckets.length;
        this.finishLineY = this.canvas.height - 80;
        
        for (let i = 0; i < this.scoreBuckets.length; i++) {
            this.scoreBuckets[i].x = i * bucketWidth;
            this.scoreBuckets[i].width = bucketWidth;
        }
    }
    
    /**
     * Get current mouse position relative to canvas
     */
    getMousePosition() {
        return { x: this.mouseX, y: this.mouseY };
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        this.resizeCanvas();
    }
    
    /**
     * Toggle debug mode
     */
    toggleDebug() {
        this.showDebugInfo = !this.showDebugInfo;
        if (this.debugLogger) {
            this.debugLogger.enabled = this.showDebugInfo;
        }
        console.log('Debug mode:', this.showDebugInfo ? 'ON' : 'OFF');
    }

    /**
     * Play sound effect through SoundManager
     */
    playSound(soundName) {
        if (this.soundManager) {
            this.soundManager.playSound(soundName);
        }
    }
    
    /**
     * Reset the game to initial state
     */
    resetGame() {
        // Reset game state
        this.score = 0;
        this.level = 1;
        this.missedShots = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.shotCount = 0;
        
        // Reinitialize the game
        this.initGame();
        
        console.log('Game reset to initial state');
    }
    
    /**
     * Pause/unpause the game
     */
    togglePause() {
        if (this.gameLoop) {
            this.gameLoop.togglePause();
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        if (this.gameLoop) {
            this.gameLoop.stop();
        }
        if (this.eventManager) {
            this.eventManager.destroy();
        }
        if (this.physicsEngine) {
            this.physicsEngine.destroy();
        }
        if (this.soundManager) {
            this.soundManager.stop();
        }
    }
    
    /**
     * Check if a position would cause precise overlap with existing bubbles
     */
    wouldOverlapPrecise(x, y, excludeRow = -1, excludeCol = -1) {
        const effectiveRows = this.gridBubbles.length;
        for (let row = 0; row < effectiveRows; row++) {
            for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
                if (row === excludeRow && col === excludeCol) continue;
                if (this.gridBubbles[row] && this.gridBubbles[row][col]) {
                    const bubble = this.gridBubbles[row][col];
                    const distance = Math.sqrt((x - bubble.x) ** 2 + (y - bubble.y) ** 2);
                    if (distance < GAME_CONFIG.BUBBLE.RADIUS * 1.8) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
