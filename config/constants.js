// Game Constants and Configuration
// All game constants centralized for easy maintenance

// Game constants
export const BUBBLE_RADIUS = 20;
export const BUBBLE_COLORS = ['#FF6B6B', '#4ECDC4', '#1E3A8A', '#00FF88', '#FECA57', '#FF9FF3'];
export const SHOOTER_SPEED = 35;
export const GRID_ROWS = 10;
export const GRID_COLS = 14;
export const GRID_TOP_MARGIN = BUBBLE_RADIUS * 2;

// Perfect hexagonal grid constants using mathematical precision
export const GRID_COL_SPACING = BUBBLE_RADIUS * 2; // Exact bubble diameter for perfect horizontal spacing
export const GRID_ROW_HEIGHT = BUBBLE_RADIUS * Math.sqrt(3); // Perfect hexagonal row height (√3 * radius)
export const HEX_OFFSET = BUBBLE_RADIUS; // Exact offset for odd rows in hexagonal pattern

// Game rules
export const MISSED_SHOTS_LIMIT = 5;
export const POP_THRESHOLD = 3; // Number of same-colored bubbles needed to pop
export const POINTS_PER_BUBBLE = 10;
export const AVALANCHE_BONUS = 5; // Points per bubble in an avalanche
export const CLEAR_FIELD_BONUS_MULTIPLIER = 2;

// Physics settings
export const PHYSICS_SETTINGS = {
    gravity: { x: 0, y: 0.4 },
    restitution: 0.8,
    friction: 0.1,
    frictionAir: 0.01,
    density: 0.001
};

// Collision settings
export const COLLISION_SETTINGS = {
    precisionFactor: 0.98,
    wallBounceRestitution: 0.95,
    snapDistance: BUBBLE_RADIUS * 2.05,
    maxSearchRadius: 3,
    velocityThreshold: 0.1
};

// Difficulty settings
export const DIFFICULTY_SETTINGS = {
    novice: { rowsToStart: 3, colors: 3, addRowFrequency: 10 },
    easy: { rowsToStart: 4, colors: 4, addRowFrequency: 8 },
    medium: { rowsToStart: 5, colors: 5, addRowFrequency: 6 },
    hard: { rowsToStart: 6, colors: 6, addRowFrequency: 4 },
    master: { rowsToStart: 7, colors: 6, addRowFrequency: 3 }
};

// Animation settings
export const ANIMATION_SETTINGS = {
    popDuration: 30,
    fallSpeed: 0.8,
    trailLength: 8,
    glowIntensity: 0.5
};
