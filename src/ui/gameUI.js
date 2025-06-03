// GameUI class - Handles all UI rendering and user interface elements

import { GAME_CONFIG } from '../../config/gameConfig.js';

export class GameUI {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
    }

    /**
     * Main render method called by GameLoop
     */
    render(ctx) {
        this.drawGameState();
    }

    drawGameState() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this._drawBackground();
        
        // Draw game elements
        this._drawBubbles();
        this._drawShooter();
        this._drawUI();
        
        // Draw 3D if enabled
        if (this.game.use3D && this.game.renderer3D) {
            this.game.renderer3D.render();
        }
        
        // Draw overlays
        this._drawGameOverlay();
    }

    _drawBackground() {
        // Enhanced gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1e3c72');
        gradient.addColorStop(0.5, '#2a5298');
        gradient.addColorStop(1, '#1e3c72');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add subtle texture
        this._drawBackgroundTexture();
    }

    _drawBackgroundTexture() {
        this.ctx.save();
        this.ctx.globalAlpha = 0.1;
        
        // Draw subtle grid pattern
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 0.5;
        
        const gridSize = 50;
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    _drawBubbles() {
        // Draw grid bubbles (if not using 3D)
        if (!this.game.use3D) {
            this._drawGridBubbles();
        }
        
        // Draw flying bubbles
        this._drawFlyingBubbles();
        
        // Draw removing bubbles
        this._drawRemovingBubbles();
        
        // Draw falling bubbles
        this._drawFallingBubbles();
    }

    _drawGridBubbles() {
        // Handle descent animations
        this._updateDescentAnimations();
        
        for (let row = 0; row < this.game.gridBubbles.length; row++) {
            for (let col = 0; col < this.game.gridBubbles[row].length; col++) {
                const bubble = this.game.gridBubbles[row][col];
                if (bubble) {
                    bubble.draw(this.ctx);
                }
            }
        }
    }

    _updateDescentAnimations() {
        const now = Date.now();
        
        for (let row = 0; row < this.game.gridBubbles.length; row++) {
            for (let col = 0; col < this.game.gridBubbles[row].length; col++) {
                const bubble = this.game.gridBubbles[row][col];
                if (bubble && bubble.isDescending) {
                    const elapsed = now - bubble.descentStartTime;
                    const progress = Math.min(elapsed / bubble.descentDuration, 1);
                    
                    // Smooth easing function
                    const easedProgress = 1 - Math.pow(1 - progress, 3);
                    
                    // Interpolate position
                    bubble.x = bubble.startX + (bubble.targetX - bubble.startX) * easedProgress;
                    bubble.y = bubble.startY + (bubble.targetY - bubble.startY) * easedProgress;
                    
                    // Handle fade-in animation for new bubbles
                    if (bubble.isFadingIn) {
                        const fadeElapsed = now - bubble.fadeInStartTime;
                        const fadeProgress = Math.min(fadeElapsed / bubble.fadeInDuration, 1);
                        bubble.opacity = fadeProgress;
                        
                        if (fadeProgress >= 1) {
                            bubble.isFadingIn = false;
                        }
                    }
                    
                    // Check if animation is complete
                    if (progress >= 1) {
                        bubble.isDescending = false;
                        bubble.x = bubble.targetX;
                        bubble.y = bubble.targetY;
                    }
                }
            }
        }
    }

    _drawFlyingBubbles() {
        for (const bubble of this.game.flyingBubbles) {
            bubble.draw(this.ctx);
        }
    }

    _drawRemovingBubbles() {
        for (const bubble of this.game.removingBubbles) {
            bubble.draw(this.ctx);
        }
    }

    _drawFallingBubbles() {
        for (const bubble of this.game.fallingBubbles) {
            bubble.draw(this.ctx);
        }
    }

    _drawShooter() {
        if (this.game.shooter) {
            this.game.shooter.draw(this.ctx);
        }
    }

    _drawUI() {
        this._drawScore();
        this._drawLevel();
        this._drawGameModeInfo();
        this._drawDebugInfo();
        this._drawLoseLine();
    }

    _drawScore() {
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.game.score}`, 10, 30);
    }

    _drawLevel() {
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Level: ${this.game.level}`, this.canvas.width - 10, 25);
    }

    _drawGameModeInfo() {
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.textAlign = 'left';
        
        let y = 55;
        this.ctx.fillText(`Mode: ${this.game.gameMode} (${this.game.difficulty})`, 10, y);
        
        if (this.game.gameMode === 'strategy' && this.game.shotsLeft < Infinity) {
            y += 20;
            this.ctx.fillText(`Shots: ${this.game.shotsLeft}`, 10, y);
        }
        
        if (this.game.gameMode === 'arcade' && this.game.timeLeft < Infinity) {
            y += 20;
            const minutes = Math.floor(this.game.timeLeft / 60);
            const seconds = this.game.timeLeft % 60;
            this.ctx.fillText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`, 10, y);
        }
        
        if (this.game.missedShots > 0) {
            y += 20;
            this.ctx.fillText(`Missed: ${this.game.missedShots}/${GAME_CONFIG.GAMEPLAY.MISSED_SHOTS_LIMIT}`, 10, y);
        }
    }

    _drawDebugInfo() {
        if (!this.game.showDebugInfo) return;
        
        const debugInfo = this.game.debugLogger.getReport();
        
        this.ctx.font = '12px monospace';
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
        this.ctx.textAlign = 'left';
        
        let y = this.canvas.height - 100;
        this.ctx.fillText(`Frame: ${debugInfo.frame}`, 10, y);
        y += 15;
        this.ctx.fillText(`Avg Frame Time: ${debugInfo.avgFrameTime.toFixed(2)}ms`, 10, y);
        y += 15;
        this.ctx.fillText(`Collision Checks: ${debugInfo.collisionChecks}`, 10, y);
        y += 15;
        this.ctx.fillText(`Grid Snaps: ${debugInfo.gridSnaps}`, 10, y);
        y += 15;
        this.ctx.fillText(`Flying: ${this.game.flyingBubbles.length}`, 10, y);
        y += 15;
        this.ctx.fillText(`Falling: ${this.game.fallingBubbles.length}`, 10, y);
    }

    _drawLoseLine() {
        if (this.game.showDebugGrid || this.game.showDebugInfo) {
            // Draw lose line for debug
            const loseLineY = this.game.getRowPosition(this.game.loseLineRow);
            
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([10, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(0, loseLineY);
            this.ctx.lineTo(this.canvas.width, loseLineY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Label
            this.ctx.font = '12px Arial';
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
            this.ctx.textAlign = 'right';
            this.ctx.fillText('LOSE LINE', this.canvas.width - 10, loseLineY - 5);
        }
    }

    _drawGameOverlay() {
        if (this.game.gameOver) {
            this._drawGameOverScreen();
        } else if (this.game.gameWon) {
            this._drawVictoryScreen();
        } else if (!this.game.gameStarted) {
            this._drawStartScreen();
        }
    }

    _drawGameOverScreen() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Game Over text
        this.ctx.font = 'bold 48px Arial';
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        // Final score
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(`Final Score: ${this.game.score}`, this.canvas.width / 2, this.canvas.height / 2);
        
        // Instructions
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillText('Press R to restart or ESC for menu', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }

    _drawVictoryScreen() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Victory text
        this.ctx.font = 'bold 48px Arial';
        this.ctx.fillStyle = '#4ECDC4';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('VICTORY!', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        // Final score
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(`Score: ${this.game.score}`, this.canvas.width / 2, this.canvas.height / 2);
        
        // Instructions
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillText('Press R to restart or ESC for menu', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }

    _drawStartScreen() {
        // This would typically be handled by the menu system
        // but we'll add a simple overlay for completeness
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Click to Start!', this.canvas.width / 2, this.canvas.height / 2);
    }

    drawDebugGrid() {
        if (!this.game.showDebugGrid) return;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
        this.ctx.lineWidth = 1;
        
        // Draw hexagonal grid
        for (let row = 0; row < GAME_CONFIG.GRID.ROWS; row++) {
            for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
                const x = this.game.getColPosition(row, col);
                const y = this.game.getRowPosition(row);
                
                // Draw circle to show bubble position
                this.ctx.beginPath();
                this.ctx.arc(x, y, GAME_CONFIG.BUBBLE.RADIUS, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // Draw grid coordinates
                this.ctx.font = '10px Arial';
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`${row},${col}`, x, y);
            }
        }
    }

    // Handle window resize
    handleResize() {
        // Update canvas dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const maxWidth = Math.min(viewportWidth - 20, 400);
        const portraitHeight = Math.min(viewportHeight - 100, maxWidth * 1.6);
        
        this.canvas.width = maxWidth;
        this.canvas.height = portraitHeight;
        
        // Recreate physics walls with new dimensions
        if (this.game.physicsEngine) {
            this.game.physicsEngine.createWalls(this.canvas.width, this.canvas.height);
        }
        
        // Update shooter position
        if (this.game.shooter) {
            this.game.shooter.x = this.canvas.width / 2;
            this.game.shooter.y = this.canvas.height - 50;
        }
        
        // Update 3D renderer if enabled
        if (this.game.renderer3D) {
            this.game.renderer3D.handleResize();
        }
        
        // Recalculate lose line
        this.game.calculateLoseLine();
    }
}
