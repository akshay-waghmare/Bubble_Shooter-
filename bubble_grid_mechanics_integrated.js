// Grid and Game Mechanics integrated from Bubble-Shooter-Pop
// Constants for grid configuration
const GRID_SETTINGS = {
    ROWS: 14,              // Number of rows in the grid
    COLUMNS: 15,           // Number of columns in the grid
    TILE_WIDTH: 40,        // Visual width of a tile
    TILE_HEIGHT: 40,       // Visual height of a tile
    ROW_HEIGHT: 34,        // Height of a row (for the hexagonal grid effect)
    BUBBLE_RADIUS: 20,     // Bubble collision radius
    COLORS: 7,             // Number of different bubble colors
    MIN_MATCH: 3,          // Minimum number of matching bubbles to pop
    GRID_OFFSET_X: 4,      // X position of the grid
    GRID_OFFSET_Y: 83      // Y position of the grid
};

// Bubble class with additional properties from Bubble Shooter Pop
class Bubble {
    constructor(col, row, type, x, y) {
        this.col = col;
        this.row = row;
        this.type = type;
        this.x = x;
        this.y = y;
        this.removed = false;      // Flag for removal animation
        this.shift = 0;            // Shift parameter for animations
        this.velocity = 0;         // Velocity for falling animations
        this.alpha = 1;            // Alpha for fade animations
        this.processed = false;    // Flag for processing in game logic
    }
}

// Neighbor offset table for hexagonal grid positioning
// First array is for even rows, second array is for odd rows
const NEIGHBOR_OFFSETS = [
    [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]], // Even row offsets
    [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]]    // Odd row offsets
];

class BubbleGridMechanics {
    constructor() {
        // Initialize the two-dimensional grid array
        this.grid = Array(GRID_SETTINGS.COLUMNS).fill()
            .map(() => Array(GRID_SETTINGS.ROWS).fill(null));
            
        // Row offset for new row insertion and grid calculations
        this.rowOffset = 0;
        
        // Initialize grid width and height like in Bubble Shooter Pop
        this.width = GRID_SETTINGS.COLUMNS * GRID_SETTINGS.TILE_WIDTH + GRID_SETTINGS.TILE_WIDTH/2;
        this.height = (GRID_SETTINGS.ROWS-1) * GRID_SETTINGS.ROW_HEIGHT + GRID_SETTINGS.TILE_HEIGHT;
    }

    // Initialize grid with bubbles up to specified number of rows
    initializeGrid(numRows = Math.floor(GRID_SETTINGS.ROWS/2)) {
        // Create the level with random tiles, similar to Bubble Shooter Pop's createLevel
        for (let row = 0; row < GRID_SETTINGS.ROWS; row++) {
            let randomType = Math.floor(Math.random() * GRID_SETTINGS.COLORS);
            let count = 0;
            
            for (let col = 0; col < GRID_SETTINGS.COLUMNS; col++) {
                // Logic to avoid too many consecutive bubbles of the same color
                if (count >= 2) {
                    // Change the random tile
                    let newType = Math.floor(Math.random() * GRID_SETTINGS.COLORS);
                    
                    // Make sure the new tile is different from the previous tile
                    if (newType === randomType) {
                        newType = (newType + 1) % GRID_SETTINGS.COLORS;
                    }
                    randomType = newType;
                    count = 0;
                }
                count++;
                
                // Only populate the top half of the grid with bubbles
                if (row < numRows) {
                    const position = this.getTileCoordinate(col, row);
                    this.grid[col][row] = new Bubble(col, row, randomType, position.x, position.y);
                } else {
                    // Empty space for the bottom rows
                    this.grid[col][row] = new Bubble(col, row, -1, 0, 0); // -1 indicates empty
                }
            }
        }
    }

    // Convert grid coordinates to pixel positions using Bubble Shooter Pop's method
    getTileCoordinate(col, row) {
        let x = GRID_SETTINGS.GRID_OFFSET_X + col * GRID_SETTINGS.TILE_WIDTH;
        
        // X offset for odd or even rows (with rowOffset consideration)
        if ((row + this.rowOffset) % 2) {
            x += GRID_SETTINGS.TILE_WIDTH/2;
        }
        
        const y = GRID_SETTINGS.GRID_OFFSET_Y + row * GRID_SETTINGS.ROW_HEIGHT;
        return { x, y };
    }

    // Convert pixel position to grid coordinates using Bubble Shooter Pop's method
    getGridPosition(x, y) {
        const row = Math.floor((y - GRID_SETTINGS.GRID_OFFSET_Y) / GRID_SETTINGS.ROW_HEIGHT);
        
        // Check for offset
        let xOffset = 0;
        if ((row + this.rowOffset) % 2) {
            xOffset = GRID_SETTINGS.TILE_WIDTH / 2;
        }
        
        const col = Math.floor(((x - xOffset) - GRID_SETTINGS.GRID_OFFSET_X) / GRID_SETTINGS.TILE_WIDTH);
        
        // Ensure coordinates are within grid bounds
        const boundedRow = Math.max(0, Math.min(row, GRID_SETTINGS.ROWS - 1));
        const boundedCol = Math.max(0, Math.min(col, GRID_SETTINGS.COLUMNS - 1));
        
        return { row: boundedRow, col: boundedCol };
    }

    // Get all valid neighbor positions for a given grid position
    getNeighbors(col, row) {
        const tileRow = (row + this.rowOffset) % 2; // Even or odd row
        const neighbors = [];
        
        // Get the neighbor offsets for the specified position
        const offsets = NEIGHBOR_OFFSETS[tileRow];
        
        // Get the neighbors
        for (let i = 0; i < offsets.length; i++) {
            // Neighbor coordinate
            const nx = col + offsets[i][0];
            const ny = row + offsets[i][1];
            
            // Make sure the tile is valid
            if (nx >= 0 && nx < GRID_SETTINGS.COLUMNS && ny >= 0 && ny < GRID_SETTINGS.ROWS) {
                if (this.grid[nx][ny] && this.grid[nx][ny].type !== -1) {
                    neighbors.push(this.grid[nx][ny]);
                }
            }
        }
        
        return neighbors;
    }

    // Find a valid snap position for a shot bubble (using Bubble Shooter Pop logic)
    findSnapPosition(x, y) {
        // Get the grid position
        const gridPos = this.getGridPosition(x, y);

        // Check if the tile is empty
        if (this.grid[gridPos.col][gridPos.row].type !== -1) {
            // Tile is not empty, try to find an empty neighbor
            const neighbors = this.getNeighborPositions(gridPos.col, gridPos.row);
            for (const pos of neighbors) {
                if (this.grid[pos.col][pos.row].type === -1) {
                    return pos;
                }
            }
            return null; // No valid position found
        }
        
        return gridPos;
    }

    // Get all valid neighbor positions (coordinates only, not objects)
    getNeighborPositions(col, row) {
        const tileRow = (row + this.rowOffset) % 2; // Even or odd row
        const positions = [];
        
        // Get the neighbor offsets for the specified position
        const offsets = NEIGHBOR_OFFSETS[tileRow];
        
        // Get the neighbors
        for (let i = 0; i < offsets.length; i++) {
            // Neighbor coordinate
            const nx = col + offsets[i][0];
            const ny = row + offsets[i][1];
            
            // Make sure the tile is valid
            if (nx >= 0 && nx < GRID_SETTINGS.COLUMNS && ny >= 0 && ny < GRID_SETTINGS.ROWS) {
                positions.push({ col: nx, row: ny });
            }
        }
        
        return positions;
    }

    // Check if a position would make a match of 3 or more
    findMatches(col, row, type) {
        // Mark all bubbles as unprocessed
        for (let i = 0; i < GRID_SETTINGS.COLUMNS; i++) {
            for (let j = 0; j < GRID_SETTINGS.ROWS; j++) {
                if (this.grid[i][j]) {
                    this.grid[i][j].processed = false;
                }
            }
        }
        
        const matches = [];
        
        // Initial bubble
        const bubble = this.grid[col][row];
        if (!bubble || bubble.type !== type) return matches;
        
        // Array of bubbles to process
        const toProcess = [bubble];
        bubble.processed = true;
        matches.push(bubble);
        
        // Process the cluster
        while (toProcess.length > 0) {
            const currentBubble = toProcess.pop();
            
            // Get the neighbors
            const neighbors = this.getNeighbors(currentBubble.col, currentBubble.row);
            
            // Check each neighbor
            for (const neighbor of neighbors) {
                if (!neighbor.processed && neighbor.type === type) {
                    neighbor.processed = true;
                    toProcess.push(neighbor);
                    matches.push(neighbor);
                }
            }
        }
        
        // Reset processed flags
        for (const match of matches) {
            match.processed = false;
        }
        
        // Return matches if there are at least MIN_MATCH
        if (matches.length >= GRID_SETTINGS.MIN_MATCH) {
            return matches;
        }
        
        return [];
    }

    // Check for and mark floating bubbles (using Bubble Shooter Pop's approach)
    findFloatingBubbles() {
        // Reset the processed flags
        for (let i = 0; i < GRID_SETTINGS.COLUMNS; i++) {
            for (let j = 0; j < GRID_SETTINGS.ROWS; j++) {
                if (this.grid[i][j]) {
                    this.grid[i][j].processed = false;
                }
            }
        }
        
        // Process the top row: mark all attached bubbles
        for (let i = 0; i < GRID_SETTINGS.COLUMNS; i++) {
            if (this.grid[i][0] && this.grid[i][0].type !== -1) {
                this.markAttachedCluster(i, 0, true);
            }
        }
        
        // All processed bubbles are attached to the top
        // Collect all unprocessed bubbles with valid types - these are floating
        const floatingBubbles = [];
        for (let i = 0; i < GRID_SETTINGS.COLUMNS; i++) {
            for (let j = 0; j < GRID_SETTINGS.ROWS; j++) {
                const bubble = this.grid[i][j];
                if (bubble && bubble.type !== -1 && !bubble.processed) {
                    floatingBubbles.push(bubble);
                }
            }
        }
        
        return floatingBubbles;
    }
    
    // Mark attached clusters (recursive function)
    markAttachedCluster(col, row, processed) {
        // Make sure the tile is valid
        if (col < 0 || col >= GRID_SETTINGS.COLUMNS || row < 0 || row >= GRID_SETTINGS.ROWS) {
            return;
        }
        
        // Make sure the tile exists and is not processed
        const bubble = this.grid[col][row];
        if (!bubble || bubble.type === -1 || bubble.processed) {
            return;
        }
        
        // Mark the bubble as processed
        bubble.processed = processed;
        
        // Process the neighbors
        const neighbors = this.getNeighborPositions(col, row);
        for (const pos of neighbors) {
            this.markAttachedCluster(pos.col, pos.row, processed);
        }
    }
    
    // Calculate collision between a moving bubble and the grid
    checkCollision(x, y, radius = GRID_SETTINGS.BUBBLE_RADIUS) {
        for (let col = 0; col < GRID_SETTINGS.COLUMNS; col++) {
            for (let row = 0; row < GRID_SETTINGS.ROWS; row++) {
                const bubble = this.grid[col][row];
                
                // Skip empty tiles
                if (!bubble || bubble.type === -1) {
                    continue;
                }
                
                // Check for intersections
                const dx = x - bubble.x - GRID_SETTINGS.TILE_WIDTH/2;
                const dy = y - bubble.y - GRID_SETTINGS.TILE_HEIGHT/2;
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
        return { collided: false };
    }

    // Add a bubble to the grid
    addBubble(col, row, type) {
        // Make sure the position is valid
        if (col < 0 || col >= GRID_SETTINGS.COLUMNS || row < 0 || row >= GRID_SETTINGS.ROWS) {
            return null;
        }
        
        // Get the tile coordinate for the specified tile
        const position = this.getTileCoordinate(col, row);
        
        // Set the tile
        this.grid[col][row] = new Bubble(col, row, type, position.x, position.y);
        
        return this.grid[col][row];
    }

    // Remove a bubble from the grid
    removeBubble(col, row) {
        if (col < 0 || col >= GRID_SETTINGS.COLUMNS || row < 0 || row >= GRID_SETTINGS.ROWS) {
            return null;
        }
        
        const bubble = this.grid[col][row];
        if (bubble) {
            this.grid[col][row] = new Bubble(col, row, -1, bubble.x, bubble.y);
        }
        
        return bubble;
    }

    // Add a new row of bubbles at the top (Bubble Shooter Pop approach)
    addNewRowOfBubbles() {
        // Move all existing bubbles down one row
        for (let col = 0; col < GRID_SETTINGS.COLUMNS; col++) {
            for (let row = GRID_SETTINGS.ROWS - 1; row > 0; row--) {
                this.grid[col][row].type = this.grid[col][row - 1].type;
                
                // Update positions
                const position = this.getTileCoordinate(col, row);
                this.grid[col][row].x = position.x;
                this.grid[col][row].y = position.y;
            }
        }
        
        // Add a new row at the top with random existing colors
        for (let col = 0; col < GRID_SETTINGS.COLUMNS; col++) {
            // Add random, existing, colors
            const type = this.getExistingColor();
            const position = this.getTileCoordinate(col, 0);
            this.grid[col][0] = new Bubble(col, 0, type, position.x, position.y);
        }
        
        // Increment the row offset
        this.rowOffset = (this.rowOffset + 1) % 2;
    }
    
    // Find existing colors in the grid
    getExistingColor() {
        const foundColors = [];
        const colorTable = Array(GRID_SETTINGS.COLORS).fill(false);
        
        // Check all tiles
        for (let col = 0; col < GRID_SETTINGS.COLUMNS; col++) {
            for (let row = 0; row < GRID_SETTINGS.ROWS; row++) {
                const bubble = this.grid[col][row];
                if (bubble && bubble.type >= 0 && bubble.type < GRID_SETTINGS.COLORS) {
                    if (!colorTable[bubble.type]) {
                        colorTable[bubble.type] = true;
                        foundColors.push(bubble.type);
                    }
                }
            }
        }
        
        // Return a random color from the existing colors,
        // or a completely random color if none found
        if (foundColors.length > 0) {
            return foundColors[Math.floor(Math.random() * foundColors.length)];
        } else {
            return Math.floor(Math.random() * GRID_SETTINGS.COLORS);
        }
    }

    // Check if the game is over (bubbles reached bottom)
    checkGameOver() {
        for (let col = 0; col < GRID_SETTINGS.COLUMNS; col++) {
            if (this.grid[col][GRID_SETTINGS.ROWS - 1] && 
                this.grid[col][GRID_SETTINGS.ROWS - 1].type !== -1) {
                return true;
            }
        }
        return false;
    }

    // Check if the game is won (all bubbles cleared)
    checkWinCondition() {
        for (let col = 0; col < GRID_SETTINGS.COLUMNS; col++) {
            for (let row = 0; row < GRID_SETTINGS.ROWS; row++) {
                if (this.grid[col][row] && this.grid[col][row].type !== -1) {
                    return false;
                }
            }
        }
        return true;
    }

    // Handle shooting mechanics and collision resolution
    handleShot(x, y, type) {
        const collision = this.checkCollision(x, y);
        
        if (collision.collided && collision.snapPosition) {
            const { row, col } = collision.snapPosition;
            const bubble = this.addBubble(col, row, type);
            
            if (!bubble) {
                return { matched: false, snapped: false };
            }
            
            // Check for matches
            const matches = this.findMatches(col, row, type);
            
            if (matches.length >= GRID_SETTINGS.MIN_MATCH) {
                // Remove matched bubbles
                for (const match of matches) {
                    this.removeBubble(match.col, match.row);
                }
                
                // Find and remove floating bubbles
                const floating = this.findFloatingBubbles();
                for (const bubble of floating) {
                    this.removeBubble(bubble.col, bubble.row);
                }
                
                return {
                    matched: true,
                    matches,
                    floating
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
    
    // Helper method to check if two circles intersect
    static circleIntersection(x1, y1, r1, x2, y2, r2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        return dist <= r1 + r2;
    }
}

// Export the class and constants
export { BubbleGridMechanics, GRID_SETTINGS, NEIGHBOR_OFFSETS };
