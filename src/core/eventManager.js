// Event Handling System for Game Controls

import { GAME_CONFIG } from '../../config/gameConfig.js';

export class EventManager {
    constructor(game) {
        console.log('[EventManager] Constructor called - timestamp:', Date.now());
        
        this.game = game;
        this.mouseX = 0;
        this.mouseY = 0;
        this.eventListenersAttached = false;
        this.shootCallCount = 0; // Debug counter
        this.lastShootTime = 0; // Track last successful shoot time for duplicate prevention
        
        // Store bound function references to prevent duplicate listeners
        this.boundHandlers = {
            handleMouseMove: this.handleMouseMove.bind(this),
            handleClick: this.handleClick.bind(this),
            handleTouchMove: this.handleTouchMove.bind(this),
            handleTouchStart: this.handleTouchStart.bind(this),
            handleKeyDown: this.handleKeyDown.bind(this),
            handleResize: this.handleResize.bind(this)
        };
        
        this.setupEventListeners();
    }

    /**
     * Initialize the event manager - called by Game constructor
     */
    initialize() {
        console.log('🎮 EventManager initialized');
        // Re-setup event listeners if needed
        if (!this.eventListenersAttached) {
            this.setupEventListeners();
        }
        return true;
    }

    setupEventListeners() {
        console.log('[EventManager] setupEventListeners() called - eventListenersAttached:', this.eventListenersAttached);
        
        if (this.eventListenersAttached) {
            console.warn('[EventManager] Event listeners already attached, skipping setup');
            return;
        }

        console.log('[EventManager] Attaching event listeners to canvas:', this.game.canvas);

        // Mouse events
        this.game.canvas.addEventListener('mousemove', this.boundHandlers.handleMouseMove);
        this.game.canvas.addEventListener('click', this.boundHandlers.handleClick);
        
        // Touch events for mobile support
        this.game.canvas.addEventListener('touchmove', this.boundHandlers.handleTouchMove);
        this.game.canvas.addEventListener('touchstart', this.boundHandlers.handleTouchStart);
        
        // Keyboard events for controls and debugging
        document.addEventListener('keydown', this.boundHandlers.handleKeyDown);
        
        // Window resize event
        window.addEventListener('resize', this.boundHandlers.handleResize);
        
        this.eventListenersAttached = true;
        console.log('[EventManager] Event listeners successfully attached');
    }

    handleMouseMove(e) {
        const rect = this.game.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
        
        if (this.game.shooter) {
            this.game.shooter.aimAt(this.mouseX, this.mouseY);
        }
    }

    handleClick(e) {
        e.preventDefault();
        console.log('[EventManager] handleClick() called - timestamp:', Date.now());
        this.shoot();
    }

    handleTouchMove(e) {
        e.preventDefault();
        const rect = this.game.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        this.mouseX = touch.clientX - rect.left;
        this.mouseY = touch.clientY - rect.top;
        
        if (this.game.shooter) {
            this.game.shooter.aimAt(this.mouseX, this.mouseY);
        }
    }

    handleTouchStart(e) {
        e.preventDefault();
        console.log('[EventManager] handleTouchStart() called - timestamp:', Date.now());
        this.shoot();
    }

    handleKeyDown(e) {
        switch (e.key.toLowerCase()) {
            case ' ':
            case 'enter':
                e.preventDefault();
                this.shoot();
                break;
                
            case 'r':
                if (this.game.gameOver) {
                    this.game.restart();
                }
                break;
                
            case 'd':
                // Toggle debug mode
                this.game.debugLogger.enabled = !this.game.debugLogger.enabled;
                console.log('Debug mode:', this.game.debugLogger.enabled ? 'ON' : 'OFF');
                break;
                
            case 'i':
                // Toggle debug info display
                this.game.showDebugInfo = !this.game.showDebugInfo;
                break;
                
            case 'g':
                // Toggle debug grid display
                this.game.showDebugGrid = !this.game.showDebugGrid;
                break;
                
            case 'p':
                // Pause/unpause game
                this.game.paused = !this.game.paused;
                console.log('Game paused:', this.game.paused);
                break;
                
            case '1':
            case '2':
            case '3':
                // Change difficulty
                const difficultyMap = { '1': 'easy', '2': 'medium', '3': 'hard' };
                this.game.difficulty = difficultyMap[e.key];
                console.log('Difficulty changed to:', this.game.difficulty);
                break;
        }
    }

    handleResize() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.game.resizeCanvas();
        }, 100);
    }

    shoot() {
        this.shootCallCount++;
        console.log(`[EventManager] shoot() called #${this.shootCallCount} - timestamp:`, Date.now());
        
        // Prevent shooting during initialization or game over
        if (this.game.initializing || this.game.gameOver || this.game.paused) {
            console.log('[EventManager] shoot() blocked: initializing/gameOver/paused');
            return;
        }

        // Prevent immediate shooting after game start
        const currentTime = Date.now();
        if (currentTime - this.game.gameStartTime < this.game.shootingDelay) {
            console.log('[EventManager] shoot() blocked: shootingDelay');
            return;
        }

        // Strategy mode: check shots remaining
        if (this.game.gameMode === "strategy" && this.game.shotsLeft <= 0) {
            console.log('[EventManager] shoot() blocked: no shots left in strategy mode');
            return;
        }

        // Check if shooter is ready
        if (!this.game.shooter || !this.game.shooter.canShoot()) {
            console.log('[EventManager] shoot() blocked: shooter not ready');
            return;
        }

        // CRITICAL FIX: Prevent rapid duplicate shooting
        if (this.lastShootTime && currentTime - this.lastShootTime < 50) {
            console.log('[EventManager] shoot() blocked: too rapid (duplicate prevention)', {
                lastShoot: this.lastShootTime,
                current: currentTime,
                diff: currentTime - this.lastShootTime
            });
            return;
        }

        try {
            const bubble = this.game.shooter.shoot();
            if (bubble) {
                // Record successful shoot time
                this.lastShootTime = currentTime;
                
                // Add to flying bubbles
                this.game.flyingBubbles.push(bubble);
                console.log('[EventManager] shoot(): Bubble added to flyingBubbles. flyingBubbles.length:', this.game.flyingBubbles.length);
                // Update game counters
                this.game.shotCount++;
                if (this.game.gameMode === "strategy") {
                    this.game.shotsLeft--;
                }
                // Enable physics for the bubble
                bubble.enablePhysics(this.game.physicsEngine.engine);
                // Play shoot sound
                this.game.playSound('shoot');
                console.log('Bubble shot:', {
                    position: { x: bubble.x, y: bubble.y },
                    velocity: { vx: bubble.vx, vy: bubble.vy },
                    color: bubble.color,
                    shotCount: this.game.shotCount
                });
                // Check if descent should be triggered
                this.game.checkDescentTriggers();
            }
        } catch (error) {
            console.error('Error during shooting:', error);
        }
    }

    /**
     * Remove all event listeners (for cleanup)
     */
    cleanup() {
        if (!this.eventListenersAttached) return;

        this.game.canvas.removeEventListener('mousemove', this.boundHandlers.handleMouseMove);
        this.game.canvas.removeEventListener('click', this.boundHandlers.handleClick);
        this.game.canvas.removeEventListener('touchmove', this.boundHandlers.handleTouchMove);
        this.game.canvas.removeEventListener('touchstart', this.boundHandlers.handleTouchStart);
        document.removeEventListener('keydown', this.boundHandlers.handleKeyDown);
        window.removeEventListener('resize', this.boundHandlers.handleResize);
        
        this.eventListenersAttached = false;
        console.log('[EventManager] Event listeners cleaned up');
    }

    /**
     * Get current mouse/touch position
     */
    getPointerPosition() {
        return { x: this.mouseX, y: this.mouseY };
    }

    /**
     * Destroy event manager and clean up all listeners
     */
    destroy() {
        this.cleanup();
        console.log('EventManager destroyed');
    }

    /**
     * Check if shooting is currently allowed
     */
    canShoot() {
        return !this.game.initializing && 
               !this.game.gameOver && 
               !this.game.paused &&
               (Date.now() - this.game.gameStartTime >= this.game.shootingDelay) &&
               (this.game.gameMode !== "strategy" || this.game.shotsLeft > 0) &&
               this.game.shooter && 
               this.game.shooter.canShoot();
    }
}
