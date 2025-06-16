// Grid and Game Mechanics from Bubble-Shooter-Pop
// Constants for grid configuration
const GRID_SETTINGS = {
    ROWS: 14,
    COLUMNS: 15,
    TILE_WIDTH: 40,
    TILE_HEIGHT: 40,
    ROW_HEIGHT: 34,
    BUBBLE_RADIUS: 20,
    COLORS: 7,
    MIN_MATCH: 3
};

// Neighbor offset patterns for hexagonal grid
const NEIGHBOR_OFFSETS = {
    EVEN_ROW: [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]], // Even row tiles
    ODD_ROW: [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]]     // Odd row tiles
};

class BubbleGridMechanics {
    constructor() {
        this.grid = Array(GRID_SETTINGS.COLUMNS).fill()
            .map(() => Array(GRID_SETTINGS.ROWS).fill(null));
        this.gridOffsetX = 4;
        this.gridOffsetY = 83;
    }

    // Initialize grid with bubbles up to specified number of rows
    initializeGrid(numRows = 5) {
        for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < GRID_SETTINGS.COLUMNS; col++) {
                const type = Math.floor(Math.random() * GRID_SETTINGS.COLORS);
                this.grid[col][row] = {
                    type,
                    row,
                    col,
                    ...this.getGridPosition(col, row)
                };
            }
        }
    }

    // Convert grid coordinates to pixel positions
    getGridPosition(col, row) {
        const offset = row % 2 === 0 ? 0 : GRID_SETTINGS.TILE_WIDTH / 2;
        return {
            x: this.gridOffsetX + col * GRID_SETTINGS.TILE_WIDTH + offset,
            y: this.gridOffsetY + row * GRID_SETTINGS.ROW_HEIGHT
        };
    }

    // Convert pixel position to nearest grid coordinates
    getGridCoordinates(x, y) {
        let row = Math.round((y - this.gridOffsetY) / GRID_SETTINGS.ROW_HEIGHT);
        let col;
        
        if (row % 2 === 0) {
            col = Math.round((x - this.gridOffsetX) / GRID_SETTINGS.TILE_WIDTH);
        } else {
            col = Math.round((x - this.gridOffsetX - GRID_SETTINGS.TILE_WIDTH/2) / GRID_SETTINGS.TILE_WIDTH);
        }

        // Ensure coordinates are within grid bounds
        row = Math.max(0, Math.min(row, GRID_SETTINGS.ROWS - 1));
        col = Math.max(0, Math.min(col, GRID_SETTINGS.COLUMNS - 1));

        return { row, col };
    }

    // Get all valid neighbor positions for a given grid position
    getNeighborPositions(col, row) {
        const offsets = row % 2 === 0 ? NEIGHBOR_OFFSETS.EVEN_ROW : NEIGHBOR_OFFSETS.ODD_ROW;
        return offsets
            .map(([dx, dy]) => ({
                col: col + dx,
                row: row + dy
            }))
            .filter(({col, row}) => 
                col >= 0 && col < GRID_SETTINGS.COLUMNS &&
                row >= 0 && row < GRID_SETTINGS.ROWS
            );
    }

    // Find a valid snap position for a bubble
    findSnapPosition(x, y) {
        const { row, col } = this.getGridCoordinates(x, y);
        
        // If target position is occupied, find nearest empty neighbor
        if (this.grid[col][row]) {
            const neighbors = this.getNeighborPositions(col, row);
            for (const pos of neighbors) {
                if (!this.grid[pos.col][pos.row]) {
                    return pos;
                }
            }
            return null; // No valid position found
        }
        
        return { row, col };
    }

    // Check if a position would make a match of 3 or more
    findMatches(col, row, type) {
        const matches = new Set();
        const checkPosition = (c, r) => {
            if (c < 0 || c >= GRID_SETTINGS.COLUMNS || 
                r < 0 || r >= GRID_SETTINGS.ROWS) return;

            const bubble = this.grid[c][r];
            if (!bubble || bubble.type !== type || matches.has(`${c},${r}`)) return;

            matches.add(`${c},${r}`);
            
            const neighbors = this.getNeighborPositions(c, r);
            for (const pos of neighbors) {
                checkPosition(pos.col, pos.row);
            }
        };

        checkPosition(col, row);
        return Array.from(matches).map(pos => {
            const [c, r] = pos.split(',').map(Number);
            return this.grid[c][r];
        });
    }

    // Check for and mark floating bubbles
    findFloatingBubbles() {
        const visited = new Set();
        const floating = new Set();

        // First mark all bubbles as potentially floating
        for (let col = 0; col < GRID_SETTINGS.COLUMNS; col++) {
            for (let row = 0; row < GRID_SETTINGS.ROWS; row++) {
                if (this.grid[col][row]) {
                    floating.add(`${col},${row}`);
                }
            }
        }

        // Function to mark connected bubbles starting from a position
        const markConnected = (col, row) => {
            if (col < 0 || col >= GRID_SETTINGS.COLUMNS || 
                row < 0 || row >= GRID_SETTINGS.ROWS ||
                !this.grid[col][row] ||
                visited.has(`${col},${row}`)) return;

            const pos = `${col},${row}`;
            visited.add(pos);
            floating.delete(pos);

            const neighbors = this.getNeighborPositions(col, row);
            for (const pos of neighbors) {
                markConnected(pos.col, pos.row);
            }
        };

        // Start from top row to mark all connected bubbles
        for (let col = 0; col < GRID_SETTINGS.COLUMNS; col++) {
            if (this.grid[col][0]) {
                markConnected(col, 0);
            }
        }

        // Convert remaining floating positions back to bubbles
        return Array.from(floating).map(pos => {
            const [col, row] = pos.split(',').map(Number);
            return this.grid[col][row];
        });
    }

    // Calculate collision between a moving bubble and the grid
    checkCollision(x, y, radius) {
        for (let col = 0; col < GRID_SETTINGS.COLUMNS; col++) {
            for (let row = 0; row < GRID_SETTINGS.ROWS; row++) {
                const bubble = this.grid[col][row];
                if (bubble) {
                    const dx = x - bubble.x;
                    const dy = y - bubble.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < radius * 2) {
                        return {
                            collided: true,
                            withBubble: bubble,
                            snapPosition: this.findSnapPosition(x, y)
                        };
                    }
                }
            }
        }
        return { collided: false };
    }

    // Add a bubble to the grid
    addBubble(col, row, type) {
        const position = this.getGridPosition(col, row);
        this.grid[col][row] = {
            type,
            row,
            col,
            ...position
        };
        return this.grid[col][row];
    }

    // Remove a bubble from the grid
    removeBubble(col, row) {
        const bubble = this.grid[col][row];
        this.grid[col][row] = null;
        return bubble;
    }

    // Check if the game is over (bubbles reached bottom)
    checkGameOver() {
        for (let col = 0; col < GRID_SETTINGS.COLUMNS; col++) {
            if (this.grid[col][GRID_SETTINGS.ROWS - 1]) {
                return true;
            }
        }
        return false;
    }

    // Check if the game is won (all bubbles cleared)
    checkWinCondition() {
        for (let col = 0; col < GRID_SETTINGS.COLUMNS; col++) {
            for (let row = 0; row < GRID_SETTINGS.ROWS; row++) {
                if (this.grid[col][row]) {
                    return false;
                }
            }
        }
        return true;
    }

    // Handle shooting mechanics and collision resolution
    handleShot(x, y, type) {
        const collision = this.checkCollision(x, y, GRID_SETTINGS.BUBBLE_RADIUS);
        
        if (collision.collided && collision.snapPosition) {
            const { row, col } = collision.snapPosition;
            const bubble = this.addBubble(col, row, type);
            
            // Check for matches
            const matches = this.findMatches(col, row, type);
            if (matches.length >= GRID_SETTINGS.MIN_MATCH) {
                // Remove matched bubbles
                matches.forEach(match => {
                    this.removeBubble(match.col, match.row);
                });
                
                // Find and remove floating bubbles
                const floating = this.findFloatingBubbles();
                floating.forEach(bubble => {
                    this.removeBubble(bubble.col, bubble.row);
                });
                
                return {
                    matched: true,
                    matches: matches,
                    floating: floating
                };
            }
            
            return {
                matched: false,
                snapped: true,
                position: { col, row }
            };
        }
        
        return { matched: false, snapped: false };
    }
}

// Export the class and constants
export { BubbleGridMechanics, GRID_SETTINGS, NEIGHBOR_OFFSETS };
