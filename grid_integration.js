// Grid Integration Module
// This file integrates the updated BubbleGridMechanics with the game

import { BubbleGridMechanics, GRID_SETTINGS, NEIGHBOR_OFFSETS } from './bubble_grid_mechanics_integrated.js';

// Create a singleton instance of the grid mechanics
const gridInstance = new BubbleGridMechanics();

// Initialize the grid
function initializeGrid(numRows = Math.floor(GRID_SETTINGS.ROWS/2)) {
    gridInstance.initializeGrid(numRows);
    return gridInstance;
}

// Get the current grid instance
function getGridInstance() {
    return gridInstance;
}

// Get grid settings
function getGridSettings() {
    return GRID_SETTINGS;
}

// Handle a bubble shot
function handleBubbleShot(x, y, type) {
    return gridInstance.handleShot(x, y, type);
}

// Check for game over condition
function isGameOver() {
    return gridInstance.checkGameOver();
}

// Check for win condition
function isGameWon() {
    return gridInstance.checkWinCondition();
}

// Add a new row of bubbles
function addNewRow() {
    gridInstance.addNewRowOfBubbles();
}

// Export the functions for game integration
export {
    initializeGrid,
    getGridInstance,
    getGridSettings,
    handleBubbleShot,
    isGameOver,
    isGameWon,
    addNewRow
};
