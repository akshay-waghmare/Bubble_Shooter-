// Main entry point for the modularized Bubble Shooter game

import { Game } from './gameplay/game.js';
import { GAME_CONFIG } from '../config/gameConfig.js';

/**
 * Main application class that initializes and manages the game
 */
class BubbleShooterApp {
    constructor() {
        this.game = null;
        this.canvas = null;
        this.initialized = false;
    }
    
    /**
     * Initialize the application
     */
    async initialize() {
        console.log('=== BUBBLE SHOOTER APP INITIALIZING ===');
        
        try {
            // Get or create canvas
            this.canvas = this.getOrCreateCanvas();
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Initialize the game
            console.log('Creating Game instance...');
            this.game = new Game(this.canvas);
            
            // Set up global error handling
            this.setupErrorHandling();
            
            // Set up window resize handler
            this.setupWindowHandlers();
            
            this.initialized = true;
            console.log('✅ BUBBLE SHOOTER APP INITIALIZED SUCCESSFULLY');
            
            return this.game;
            
        } catch (error) {
            console.error('❌ FAILED TO INITIALIZE BUBBLE SHOOTER APP:', error);
            this.showErrorMessage(error);
            throw error;
        }
    }
    
    /**
     * Get existing canvas or create a new one
     */
    getOrCreateCanvas() {
        let canvas = document.getElementById('gameCanvas');
        
        if (!canvas) {
            console.log('Creating new canvas element...');
            canvas = document.createElement('canvas');
            canvas.id = 'gameCanvas';
            canvas.width = GAME_CONFIG.CANVAS.DEFAULT_WIDTH;
            canvas.height = GAME_CONFIG.CANVAS.DEFAULT_HEIGHT;
            
            // Style the canvas
            canvas.style.border = '1px solid #333';
            canvas.style.display = 'block';
            canvas.style.margin = '0 auto';
            canvas.style.backgroundColor = GAME_CONFIG.COLORS.BACKGROUND;
            
            // Add to document body
            document.body.appendChild(canvas);
        }
        
        console.log('Canvas ready:', { width: canvas.width, height: canvas.height });
        return canvas;
    }
    
    /**
     * Set up global error handling
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error caught:', event.error);
            this.showErrorMessage(event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showErrorMessage(event.reason);
        });
    }
    
    /**
     * Set up window event handlers
     */
    setupWindowHandlers() {
        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.game && this.game.resizeCanvas) {
                    console.log('Window resized, updating canvas...');
                    this.game.resizeCanvas();
                }
            }, 250);
        });
        
        // Handle page visibility changes (pause/resume)
        document.addEventListener('visibilitychange', () => {
            if (this.game && this.game.gameLoop) {
                if (document.visibilityState === 'hidden') {
                    console.log('Page hidden, pausing game...');
                    this.game.gameLoop.pause();
                } else {
                    console.log('Page visible, resuming game...');
                    this.game.gameLoop.resume();
                }
            }
        });
    }
    
    /**
     * Show error message to user
     */
    showErrorMessage(error) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff4444;
            color: white;
            padding: 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            max-width: 400px;
            text-align: center;
            z-index: 1000;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;
        
        errorDiv.innerHTML = `
            <h3>Game Error</h3>
            <p>An error occurred while running the game:</p>
            <pre style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px; overflow: auto; max-height: 200px;">${error.message || error}</pre>
            <button onclick="this.parentElement.remove()" style="
                background: white;
                color: #ff4444;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">Close</button>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 10000);
    }
    
    /**
     * Start the game
     */
    start() {
        if (!this.initialized) {
            console.error('App not initialized. Call initialize() first.');
            return false;
        }
        
        if (this.game && this.game.start) {
            console.log('Starting game...');
            this.game.start();
            return true;
        }
        
        console.error('Game not available for starting');
        return false;
    }
    
    /**
     * Restart the game
     */
    restart() {
        if (this.game && this.game.restart) {
            console.log('Restarting game...');
            this.game.restart();
        }
    }
    
    /**
     * Clean up the application
     */
    cleanup() {
        if (this.game && this.game.cleanup) {
            this.game.cleanup();
        }
        this.initialized = false;
        console.log('Bubble Shooter App cleaned up');
    }
}

// Auto-initialize when script loads
let app = null;

/**
 * Initialize and start the Bubble Shooter game
 */
export async function initializeBubbleShooter() {
    if (app) {
        console.log('Game already initialized');
        return app.game;
    }
    
    try {
        app = new BubbleShooterApp();
        const game = await app.initialize();
        
        // Auto-start the game
        app.start();
        
        // Expose globally for debugging
        window.bubbleShooterApp = app;
        window.bubbleShooterGame = game;
        
        return game;
    } catch (error) {
        console.error('Failed to initialize Bubble Shooter:', error);
        throw error;
    }
}

/**
 * Restart the current game
 */
export function restartBubbleShooter() {
    if (app) {
        app.restart();
    } else {
        console.warn('No game instance to restart');
    }
}

/**
 * Clean up the game
 */
export function cleanupBubbleShooter() {
    if (app) {
        app.cleanup();
        app = null;
    }
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeBubbleShooter().catch(console.error);
        });
    } else {
        // DOM already loaded, initialize immediately
        setTimeout(() => {
            initializeBubbleShooter().catch(console.error);
        }, 0);
    }
}

// Export the app class as well for advanced usage
export { BubbleShooterApp };
