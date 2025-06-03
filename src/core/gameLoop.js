// Game Loop and Update Manager

export class GameLoop {
    constructor(game) {
        this.game = game;
        this.isRunning = false;
        this.animationFrameId = null;
        this.lastFrameTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        this.frameCounter = 0;
        this.fpsDisplay = 0;
        this.lastFPSUpdate = 0;
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) {
            console.warn('Game loop is already running');
            return;
        }

        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.lastFPSUpdate = this.lastFrameTime;
        this.frameCounter = 0;
        
        console.log('Game loop started');
        this.gameLoop();
    }

    /**
     * Stop the game loop
     */
    stop() {
        if (!this.isRunning) return;

        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        console.log('Game loop stopped');
    }

    /**
     * Pause the game loop
     */
    pause() {
        if (!this.isRunning) {
            console.warn('Game loop is not running, cannot pause');
            return;
        }

        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        console.log('Game loop paused');
    }

    /**
     * Resume the game loop
     */
    resume() {
        if (this.isRunning) {
            console.warn('Game loop is already running');
            return;
        }

        this.isRunning = true;
        this.lastFrameTime = performance.now();
        console.log('Game loop resumed');
        this.gameLoop();
    }

    /**
     * Toggle pause/resume state
     */
    togglePause() {
        if (this.isRunning) {
            this.pause();
        } else {
            this.resume();
        }
    }

    /**
     * Main game loop function
     */
    gameLoop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;

        // Frame rate limiting (optional, browser typically handles this)
        if (deltaTime >= this.frameInterval) {
            this.frameStartTime = currentTime;
            
            // Update FPS counter
            this.updateFPS(currentTime);
            
            // Update debug logger frame
            this.game.debugLogger.nextFrame();
            
            // Reset collision manager frame counters
            if (this.game.collisionManager) {
                this.game.collisionManager.resetFrameCounters();
            }

            try {
                // Update game state
                this.update(deltaTime);
                
                // Render the game
                this.render();
                
                // Update performance metrics
                this.updatePerformanceMetrics(currentTime);
                
            } catch (error) {
                console.error('Error in game loop:', error);
                this.handleGameLoopError(error);
            }

            this.lastFrameTime = currentTime;
        }

        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * Update game state
     */
    update(deltaTime) {
        // Skip updates during initialization
        if (this.game.initializing || this.game.paused) return;

        // Update game timer for arcade mode
        if (this.game.gameMode === "arcade" && this.game.timeLeft > 0 && !this.game.gameOver) {
            this.game.timeLeft -= deltaTime / 1000; // Convert to seconds
            if (this.game.timeLeft < 0) this.game.timeLeft = 0;
        }

        // Update Matter.js physics
        if (this.game.engine) {
            Matter.Engine.update(this.game.engine);
        }

        // Update flying bubbles
        this.updateFlyingBubbles(deltaTime);

        // Update falling bubbles
        this.updateFallingBubbles(deltaTime);

        // Update removing bubbles
        this.updateRemovingBubbles(deltaTime);

        // Update descending bubble animations
        if (this.game.gameStateManager) {
            this.game.gameStateManager.updateDescentAnimations();
        }

        // Process pending new row descent
        if (this.game.gameStateManager) {
            this.game.gameStateManager.processPendingNewRow();
        }

        // Check win/lose conditions
        if (this.game.gameStateManager) {
            this.game.gameStateManager.checkGameState();
        }
    }

    /**
     * Update flying bubbles
     */
    updateFlyingBubbles(deltaTime) {
        console.log('[DEBUG] flyingBubbles.length:', this.game.flyingBubbles.length);
        for (let i = this.game.flyingBubbles.length - 1; i >= 0; i--) {
            const bubble = this.game.flyingBubbles[i];
            console.log('[DEBUG] updateFlyingBubbles: bubble', i, {
                id: bubble.bubbleId,
                x: bubble.x,
                y: bubble.y,
                vx: bubble.vx,
                vy: bubble.vy,
                stuck: bubble.stuck,
                removing: bubble.removing,
                falling: bubble.falling,
                isPhysicsEnabled: bubble.isPhysicsEnabled
            });
            bubble.update(deltaTime);

            let collided = false;

            // Debug: Log flying bubble state with object reference and id
            if (i === 0) {
                console.log('[DEBUG] Flying bubble update:', {
                    ref: bubble,
                    id: bubble.bubbleId,
                    x: bubble.x,
                    y: bubble.y,
                    vx: bubble.vx,
                    vy: bubble.vy,
                    stuck: bubble.stuck,
                    removing: bubble.removing,
                    falling: bubble.falling
                });
            }

            // Check for collisions with grid bubbles
            if (this.game.collisionManager) {
                const collision = this.game.collisionManager.checkGridCollisions(bubble);
                if (collision) {
                    console.log('[DEBUG] Flying bubble collided with grid:', collision);
                    this.game.collisionManager.snapBubbleToGrid(bubble);
                    this.game.flyingBubbles.splice(i, 1);
                    collided = true;
                    continue;
                }
            }

            // Check if bubble hit top wall
            if (!collided && this.game.collisionManager && this.game.collisionManager.checkTopWallCollision(bubble)) {
                console.log('[DEBUG] Flying bubble hit top wall');
                this.game.collisionManager.snapBubbleToGrid(bubble);
                this.game.flyingBubbles.splice(i, 1);
                collided = true;
                continue;
            }

            // Remove if bubble falls off screen
            if (!collided && bubble.y > this.game.canvas.height + bubble.radius) {
                console.log('[DEBUG] Flying bubble fell off screen:', { y: bubble.y, canvasHeight: this.game.canvas.height });
                bubble.disablePhysics(this.game.engine);
                this.game.flyingBubbles.splice(i, 1);
                this.game.missedShots++;
                this.game.debugLogger.log('miss', 'Bubble missed target', {
                    position: { x: bubble.x, y: bubble.y },
                    missedShots: this.game.missedShots
                });
            }
        }
    }

    /**
     * Update falling bubbles
     */
    updateFallingBubbles(deltaTime) {
        for (let i = this.game.fallingBubbles.length - 1; i >= 0; i--) {
            const bubble = this.game.fallingBubbles[i];
            bubble.update(deltaTime);

            // Remove if bubble falls off screen
            if (bubble.y > this.game.canvas.height + bubble.radius) {
                bubble.disablePhysics(this.game.engine);
                this.game.fallingBubbles.splice(i, 1);
            }
        }
    }

    /**
     * Update removing bubbles (with pop animation)
     */
    updateRemovingBubbles(deltaTime) {
        for (let i = this.game.removingBubbles.length - 1; i >= 0; i--) {
            const bubble = this.game.removingBubbles[i];
            bubble.animationTimer = (bubble.animationTimer || 0) + 1;

            // Remove after animation completes
            if (bubble.animationTimer > 30) {
                this.game.removingBubbles.splice(i, 1);
            }
        }
    }

    /**
     * Render the game
     */
    render() {
        if (!this.game.ctx || !this.game.canvas) return;

        // Clear canvas
        this.game.ctx.clearRect(0, 0, this.game.canvas.width, this.game.canvas.height);

        // Use GameUI for rendering if available
        if (this.game.gameUI) {
            this.game.gameUI.render(this.game.ctx);
        } else {
            // Fallback rendering
            this.renderFallback();
        }
    }

    /**
     * Fallback rendering method
     */
    renderFallback() {
        const ctx = this.game.ctx;

        // Draw background
        const gradient = ctx.createLinearGradient(0, 0, 0, this.game.canvas.height);
        gradient.addColorStop(0, '#1a1a3a');
        gradient.addColorStop(1, '#0f0f2a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

        // Draw grid bubbles
        const effectiveRows = this.game.gridBubbles.length;
        for (let row = 0; row < effectiveRows; row++) {
            for (let col = 0; col < this.game.gridBubbles[0].length; col++) {
                if (this.game.gridBubbles[row] && this.game.gridBubbles[row][col]) {
                    const bubble = this.game.gridBubbles[row][col];
                    bubble.draw(ctx);
                }
            }
        }

        // Draw flying bubbles
        for (const bubble of this.game.flyingBubbles) {
            bubble.draw(ctx);
        }

        // Draw falling bubbles
        for (const bubble of this.game.fallingBubbles) {
            bubble.draw(ctx);
        }

        // Draw removing bubbles
        for (const bubble of this.game.removingBubbles) {
            bubble.draw(ctx);
        }

        // Draw shooter
        if (this.game.shooter) {
            this.game.shooter.draw(ctx);
        }
    }

    /**
     * Update FPS counter
     */
    updateFPS(currentTime) {
        this.frameCounter++;
        
        if (currentTime - this.lastFPSUpdate >= 1000) {
            this.fpsDisplay = this.frameCounter;
            this.frameCounter = 0;
            this.lastFPSUpdate = currentTime;
        }
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(currentTime) {
        const frameTime = currentTime - this.frameStartTime;
        
        // Update debug logger metrics
        if (this.game.collisionManager) {
            const stats = this.game.collisionManager.getFrameStats();
            this.game.debugLogger.updateMetrics(frameTime, stats.collisionChecks, stats.gridSnaps);
        }
    }

    /**
     * Handle errors in the game loop
     */
    handleGameLoopError(error) {
        console.error('Critical error in game loop:', error);
        
        // Try to recover by resetting some state
        try {
            if (this.game.flyingBubbles) this.game.flyingBubbles.length = 0;
            if (this.game.fallingBubbles) this.game.fallingBubbles.length = 0;
            if (this.game.removingBubbles) this.game.removingBubbles.length = 0;
        } catch (recoveryError) {
            console.error('Recovery failed:', recoveryError);
            this.stop();
        }
    }

    /**
     * Get current FPS
     */
    getFPS() {
        return this.fpsDisplay;
    }

    /**
     * Get performance information
     */
    getPerformanceInfo() {
        return {
            fps: this.fpsDisplay,
            isRunning: this.isRunning,
            frameTime: performance.now() - this.frameStartTime,
            bubbleCounts: {
                grid: this.game.gridBubbles ? this.game.gridBubbles.flat().filter(b => b !== null).length : 0,
                flying: this.game.flyingBubbles ? this.game.flyingBubbles.length : 0,
                falling: this.game.fallingBubbles ? this.game.fallingBubbles.length : 0,
                removing: this.game.removingBubbles ? this.game.removingBubbles.length : 0
            }
        };
    }

    /**
     * Set target FPS
     */
    setTargetFPS(fps) {
        this.targetFPS = Math.max(30, Math.min(120, fps));
        this.frameInterval = 1000 / this.targetFPS;
        console.log('Target FPS set to:', this.targetFPS);
    }
}
