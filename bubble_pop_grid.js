// Original Bubble-Shooter-Pop Grid Logic Implementation

// Level Grid Configuration
const level = {
    x: 4,           // X position
    y: 83,          // Y position
    width: 0,       // Width, gets calculated
    height: 0,      // Height, gets calculated
    columns: 15,    // Number of tile columns
    rows: 14,       // Number of tile rows
    tilewidth: 40,  // Visual width of a tile
    tileheight: 40, // Visual height of a tile
    rowheight: 34,  // Height of a row
    radius: 20,     // Bubble collision radius
    tiles: []       // The two-dimensional tile array
};

// Neighbor offset table for hexagonal grid
const neighborsoffsets = [
    [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]], // Even row tiles
    [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]]    // Odd row tiles
];

// Define tile class as per original implementation
class Tile {
    constructor(x, y, type, shift) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.removed = false;
        this.shift = shift;
        this.velocity = 0;
        this.alpha = 1;
        this.processed = false;
    }
}

// Core Grid Functions
const BubbleGridSystem = {
    // Initialize the grid
    initGrid() {
        // Initialize the two-dimensional tile array
        for (let i = 0; i < level.columns; i++) {
            level.tiles[i] = [];
            for (let j = 0; j < level.rows; j++) {
                level.tiles[i][j] = new Tile(i, j, -1, 0); // -1 = empty tile
            }
        }

        // Calculate level width and height
        level.width = level.columns * level.tilewidth + level.tilewidth/2;
        level.height = (level.rows-1) * level.rowheight + level.tileheight;
    },

    // Get the tile coordinate for a grid position
    getTileCoordinate(column, row) {
        const tx = level.x + column * level.tilewidth;
        // Offset every other row
        const ty = level.y + row * level.rowheight;
        return { tilex: tx, tiley: ty };
    },

    // Get the closest grid position from pixel coordinates
    getGridPosition(x, y) {
        const gridy = Math.floor((y - level.y) / level.rowheight);
        // Check for offset
        let xoffset = 0;
        if (gridy % 2) {
            xoffset = level.tilewidth / 2;
        }
        const gridx = Math.floor(((x - xoffset) - level.x) / level.tilewidth);
        
        return { x: gridx, y: gridy };
    },

    // Find cluster of similar colored bubbles
    findCluster(tx, ty, matchtype, reset, skipremoved) {
        if (reset) {
            this.resetProcessed();
        }
        
        // Get target tile
        if (tx < 0 || tx >= level.columns || ty < 0 || ty >= level.rows) return [];
        
        const tile = level.tiles[tx][ty];
        
        // Skip if empty or already processed
        if (tile.type < 0 || tile.processed) return [];
        
        // Skip if removed and skipremoved is true
        if (skipremoved && tile.removed) return [];
        
        // If matchtype is true, only match same type
        if (matchtype && tile.type !== level.tiles[tx][ty].type) return [];
        
        // Mark tile as processed
        tile.processed = true;
        
        // Add current tile to cluster
        const cluster = [tile];
        
        // Get neighbor offsets for the current row
        const currentoffsets = neighborsoffsets[ty % 2];
        
        // Check neighbors
        for (let i = 0; i < 6; i++) {
            const ny = ty + currentoffsets[i][1]; // Get neighbor row
            const nx = tx + currentoffsets[i][0]; // Get neighbor column
            
            if (nx >= 0 && nx < level.columns && ny >= 0 && ny < level.rows) {
                // Recursively find clusters
                const foundcluster = this.findCluster(nx, ny, matchtype, false, skipremoved);
                // Add found cluster to current cluster
                cluster.push(...foundcluster);
            }
        }
        
        return cluster;
    },

    // Find floating clusters that are not connected to the top
    findFloatingClusters() {
        this.resetProcessed();
        
        const foundclusters = [];
        
        // Check all bubbles
        for (let i = 0; i < level.columns; i++) {
            for (let j = 0; j < level.rows; j++) {
                const tile = level.tiles[i][j];
                if (tile.type >= 0 && !tile.processed) {
                    // Find cluster
                    const cluster = this.findCluster(i, j, false, false, true);
                    
                    // Check if cluster is floating
                    let floating = true;
                    for (const bubbletile of cluster) {
                        if (bubbletile.y === 0) {
                            // Cluster is connected to top
                            floating = false;
                            break;
                        }
                    }
                    
                    if (floating) {
                        foundclusters.push(cluster);
                    }
                }
            }
        }
        
        return foundclusters;
    },

    // Reset processed flags
    resetProcessed() {
        for (let i = 0; i < level.columns; i++) {
            for (let j = 0; j < level.rows; j++) {
                level.tiles[i][j].processed = false;
            }
        }
    },

    // Check if two circles intersect
    circleIntersection(x1, y1, r1, x2, y2, r2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        return dist < r1 + r2;
    },

    // Snap bubble to grid
    snapBubble(x, y, type) {
        // Get grid position
        const gridpos = this.getGridPosition(x, y);
        
        // Make sure the grid position is valid
        if (gridpos.x < 0) {
            gridpos.x = 0;
        }
        if (gridpos.x >= level.columns) {
            gridpos.x = level.columns - 1;
        }
        if (gridpos.y < 0) {
            gridpos.y = 0;
        }
        if (gridpos.y >= level.rows) {
            gridpos.y = level.rows - 1;
        }
        
        // Check if the tile is empty
        let addtile = false;
        if (level.tiles[gridpos.x][gridpos.y].type !== -1) {
            // Tile is not empty, shift the new tile downwards
            for (let newrow = gridpos.y + 1; newrow < level.rows; newrow++) {
                if (level.tiles[gridpos.x][newrow].type === -1) {
                    gridpos.y = newrow;
                    addtile = true;
                    break;
                }
            }
        } else {
            addtile = true;
        }
        
        // Add the tile to the grid
        if (addtile) {
            level.tiles[gridpos.x][gridpos.y].type = type;
            return { x: gridpos.x, y: gridpos.y };
        }
        
        return null;
    }
};

// Export the grid system
export { BubbleGridSystem, level, Tile, neighborsoffsets };
