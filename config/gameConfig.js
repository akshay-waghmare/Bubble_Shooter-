// Game Configuration and Constants
// Centralized configuration for the Bubble Shooter game

export const GAME_CONFIG = {
    // Canvas properties
    CANVAS: {
        DEFAULT_WIDTH: 400,
        DEFAULT_HEIGHT: 640,
        MIN_WIDTH: 300,
        MAX_WIDTH: 600
    },
    
    // Colors
    COLORS: {
        BACKGROUND: '#1a1a2e',
        UI_TEXT: '#ffffff',
        DEBUG: '#ffff00'
    },
    
    // Bubble properties
    BUBBLE: {
        RADIUS: 20,
        COLORS: ['#FF6B6B', '#4ECDC4', '#1E3A8A', '#00FF88', '#FECA57', '#FF9FF3']
    },
    
    // Shooting properties
    SHOOTER: {
        SPEED: 35,
        RELOAD_TIME: 300, // ms
        SHOOTING_DELAY: 500 // ms delay after game start
    },
    
    // Grid properties
    GRID: {
        ROWS: 10,
        COLS: 10, // Reduced from 14 to fit better in smaller canvases
        get TOP_MARGIN() { return GAME_CONFIG.BUBBLE.RADIUS * 2; },
        get COL_SPACING() { return GAME_CONFIG.BUBBLE.RADIUS * 2; }, // Perfect horizontal spacing
        get ROW_HEIGHT() { return GAME_CONFIG.BUBBLE.RADIUS * Math.sqrt(3); }, // Perfect hexagonal row height
        get HEX_OFFSET() { return GAME_CONFIG.BUBBLE.RADIUS; } // Offset for odd rows
    },
    
    // Game mechanics
    MISSED_SHOTS_LIMIT: 5,
    POP_THRESHOLD: 3, // Number of same-colored bubbles needed to pop
    POINTS_PER_BUBBLE: 10,
    AVALANCHE_BONUS: 5, // Points per bubble in an avalanche
    CLEAR_FIELD_BONUS_MULTIPLIER: 2,
    
    // Physics
    GRAVITY: 0.4,
    WALL_BOUNCE_ENERGY_LOSS: 0.95,
    COLLISION_RESTITUTION: 0.3,
    
    // Animation and timing
    REMOVE_ANIMATION_FRAMES: 30,
    DESCENT_ANIMATION_DURATION: 300, // ms
    WOBBLE_DURATION: 500, // ms for newly placed bubbles
    
    // Collision detection
    COLLISION_PRECISION_FACTOR: 0.98,
    SNAP_DISTANCE_MULTIPLIER: 2.05,
    WALL_BOUNCE_RESTITUTION: 0.95,
    
    // Performance
    MAX_TRAIL_LENGTH: 8,
    PREDICTION_STEPS: 10,
    TIME_STEP: 1/60, // Assuming 60 FPS
    
    // Difficulty settings
    DIFFICULTY: {
        novice: { 
            rowsToStart: 2, 
            colors: 3, 
            addRowFrequency: 8, 
            timeBasedDescent: 15000 // 15 seconds
        },
        easy: { 
            rowsToStart: 2, 
            colors: 4, 
            addRowFrequency: 6, 
            timeBasedDescent: 12000 // 12 seconds
        },
        medium: { 
            rowsToStart: 3, 
            colors: 5, 
            addRowFrequency: 5, 
            timeBasedDescent: 10000 // 10 seconds
        },
        hard: { 
            rowsToStart: 3, 
            colors: 6, 
            addRowFrequency: 4, 
            timeBasedDescent: 8000 // 8 seconds
        },
        master: { 
            rowsToStart: 3, 
            colors: 6, 
            addRowFrequency: 3, 
            timeBasedDescent: 6000 // 6 seconds
        }
    }
};

export const GAME_MODES = {
    CLASSIC: 'classic',
    ARCADE: 'arcade',
    STRATEGY: 'strategy'
};

export const CANVAS_CONFIG = {
    MAX_WIDTH: 400,
    ASPECT_RATIO: 1.6, // height = width * aspect_ratio
    MARGIN: 20
};
