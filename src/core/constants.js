// filepath: /workspaces/Bubble_Shooter-/src/core/constants.js
// Core game constants and enums
// Defines essential constants used throughout the game

export const BUBBLE_COLORS = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal  
    '#1E3A8A', // Blue
    '#00FF88', // Green
    '#FECA57', // Yellow
    '#FF9FF3'  // Pink
];

export const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    LEVEL_COMPLETE: 'level_complete'
};

export const PHYSICS_CONSTANTS = {
    GRAVITY: 0.4,
    BOUNCE_DAMPING: 0.8,
    FRICTION: 0.95,
    MIN_VELOCITY: 0.1,
    COLLISION_PRECISION: 0.1
};

export const BUBBLE_CONSTANTS = {
    RADIUS: 20,
    MIN_POP_GROUP: 3,
    SHOOTING_SPEED: 35,
    TRAIL_LENGTH: 5,
    GLOW_INTENSITY: 0.8
};

export const GRID_CONSTANTS = {
    ROWS: 10,
    COLS: 14,
    HEX_OFFSET_X: 20, // BUBBLE_RADIUS
    HEX_OFFSET_Y: Math.sqrt(3) * 20, // BUBBLE_RADIUS * sqrt(3)
    TOP_MARGIN: 40 // BUBBLE_RADIUS * 2
};

export const AUDIO_CONSTANTS = {
    VOLUME: 0.7,
    EFFECTS: {
        SHOOT: 'shoot',
        POP: 'pop',
        COMBO: 'combo',
        GAME_OVER: 'game_over'
    }
};

export const SCORING = {
    BUBBLE_POP: 10,
    COMBO_MULTIPLIER: 1.5,
    AVALANCHE_BONUS: 5,
    LEVEL_COMPLETE_BONUS: 100
};