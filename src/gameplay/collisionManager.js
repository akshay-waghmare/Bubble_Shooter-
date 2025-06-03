// Collision Detection and Grid Management System

import { GAME_CONFIG } from '../../config/gameConfig.js';

export class CollisionManager {
    constructor(game) {
        this.game = game;
        this.collisionChecksThisFrame = 0;
        this.gridSnapsThisFrame = 0;
    }

    /**
     * Check for collisions between a flying bubble and the grid
     */
    checkGridCollisions(flyingBubble) {
        this.collisionChecksThisFrame++;
        const effectiveRows = this.game.gridBubbles.length;
        
        for (let row = 0; row < effectiveRows; row++) {
            for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
                if (this.game.gridBubbles[row] && this.game.gridBubbles[row][col]) {
                    const gridBubble = this.game.gridBubbles[row][col];
                    const distance = Math.sqrt(
                        (flyingBubble.x - gridBubble.x) ** 2 + 
                        (flyingBubble.y - gridBubble.y) ** 2
                    );
                    
                    if (distance < GAME_CONFIG.BUBBLE.RADIUS * 1.9) {
                        this.game.debugLogger.log('collision', 'Grid bubble collision detected', {
                            flyingBubble: { x: flyingBubble.x, y: flyingBubble.y, color: flyingBubble.color },
                            gridBubble: { x: gridBubble.x, y: gridBubble.y, color: gridBubble.color, row, col },
                            distance
                        });
                        
                        return { gridBubble, distance, row, col };
                    }
                }
            }
        }
        return null;
    }

    /**
     * Check if bubble hit the top wall
     */
    checkTopWallCollision(bubble) {
        return bubble.y <= GAME_CONFIG.BUBBLE.RADIUS;
    }

    /**
     * Find the best position to snap a bubble to the grid
     */
    findBestGridPosition(x, y) {
        let bestPosition = null;
        let minDistance = Infinity;
        
        // Calculate dynamic maximum row based on danger zone
        const shooterY = this.game.shooter ? this.game.shooter.y : this.game.canvas.height - 50;
        const dangerZoneY = shooterY - 80;
        const maxAllowedY = dangerZoneY - 5; // Much closer to danger zone
        
        // Calculate maximum row that fits before danger zone
        const maxRow = Math.floor((maxAllowedY - GAME_CONFIG.GRID.TOP_MARGIN) / GAME_CONFIG.GRID.ROW_HEIGHT);
        const effectiveMaxRows = Math.max(GAME_CONFIG.GRID.ROWS, maxRow);
        
        this.game.debugLogger.log('snap', 'Dynamic grid extension calculated', {
            dangerZoneY,
            maxAllowedY,
            maxRow,
            effectiveMaxRows,
            originalGridRows: GAME_CONFIG.GRID.ROWS
        });
        
        // Extend gridBubbles array if needed
        while (this.game.gridBubbles.length <= effectiveMaxRows) {
            const newRow = new Array(GAME_CONFIG.GRID.COLS).fill(null);
            this.game.gridBubbles.push(newRow);
        }
        
        // Check nearby grid positions including extended range
        for (let row = 0; row <= effectiveMaxRows; row++) {
            for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
                // Ensure row exists in gridBubbles array
                if (!this.game.gridBubbles[row]) {
                    this.game.gridBubbles[row] = new Array(GAME_CONFIG.GRID.COLS).fill(null);
                }
                
                if (this.game.gridBubbles[row][col] === null) {
                    const gridX = this.game.getColPosition(row, col);
                    const gridY = this.game.getRowPosition(row);
                    
                    // Only consider positions that don't exceed danger zone
                    if (gridY <= maxAllowedY) {
                        const distance = Math.sqrt((x - gridX) ** 2 + (y - gridY) ** 2);
                        
                        if (distance < minDistance && distance < GAME_CONFIG.BUBBLE.RADIUS * 2.5) {
                            minDistance = distance;
                            bestPosition = { x: gridX, y: gridY, row, col };
                        }
                    }
                }
            }
        }
        
        return bestPosition;
    }

    /**
     * Snap a flying bubble to the grid
     */
    snapBubbleToGrid(bubble) {
        this.gridSnapsThisFrame++;
        
        // Find the best grid position for this bubble
        const bestPosition = this.findBestGridPosition(bubble.x, bubble.y);
        
        if (bestPosition) {
            // Disable physics
            bubble.disablePhysics(this.game.physicsEngine.engine);
            
            // Move to grid position
            bubble.x = bestPosition.x;
            bubble.y = bestPosition.y;
            bubble.row = bestPosition.row;
            bubble.col = bestPosition.col;
            bubble.stuck = true;
            bubble.vx = 0;
            bubble.vy = 0;
            
            // Add to grid
            this.game.gridBubbles[bestPosition.row][bestPosition.col] = bubble;
            
            this.game.debugLogger.log('snap', 'Bubble successfully snapped to grid', {
                finalPosition: bestPosition,
                color: bubble.color
            });
            
            // Check for matches and clear bubbles
            this.checkMatches(bestPosition.row, bestPosition.col);
            
            // Play sound effects
            this.game.playSound('attach');
            
            return true;
        }
        
        return false;
    }

    /**
     * Check for matching bubbles and remove them
     */
    checkMatches(row, col) {
        const bubble = this.game.gridBubbles[row][col];
        if (!bubble) return;
        
        const color = bubble.color;
        const matches = [];
        const visited = new Set();
        
        // Flood fill to find connected bubbles of same color
        const queue = [{ row, col }];
        visited.add(`${row},${col}`);
        matches.push({ row, col });
        
        while (queue.length > 0) {
            const { row: currentRow, col: currentCol } = queue.shift();
            
            // Check all 6 neighbors in hexagonal grid
            const neighbors = this.getNeighbors(currentRow, currentCol);
            
            for (const { row: nRow, col: nCol } of neighbors) {
                const key = `${nRow},${nCol}`;
                if (!visited.has(key) && 
                    this.game.gridBubbles[nRow] && 
                    this.game.gridBubbles[nRow][nCol] &&
                    this.game.gridBubbles[nRow][nCol].color === color) {
                    
                    visited.add(key);
                    queue.push({ row: nRow, col: nCol });
                    matches.push({ row: nRow, col: nCol });
                }
            }
        }
        
        // Remove matches if 3 or more
        if (matches.length >= GAME_CONFIG.GAME.POP_THRESHOLD) {
            this.game.debugLogger.log('match', `Found ${matches.length} matching bubbles`, { matches, color });
            
            for (const { row: mRow, col: mCol } of matches) {
                const matchedBubble = this.game.gridBubbles[mRow][mCol];
                if (matchedBubble) {
                    matchedBubble.removing = true;
                    this.game.removingBubbles.push(matchedBubble);
                    this.game.gridBubbles[mRow][mCol] = null;
                    this.game.score += GAME_CONFIG.GAME.POINTS_PER_BUBBLE;
                }
            }
            
            this.game.playSound('pop');
            
            // Check for floating bubbles
            this.checkFloatingBubbles();
        }
    }

    /**
     * Get neighbors of a bubble in hexagonal grid
     */
    getNeighbors(row, col) {
        const neighbors = [];
        const isOddRow = row % 2 === 1;
        
        // Hexagonal grid neighbors
        const offsets = isOddRow ? [
            [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]
        ] : [
            [-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]
        ];
        
        for (const [dr, dc] of offsets) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (newRow >= 0 && newRow < this.game.gridBubbles.length && 
                newCol >= 0 && newCol < GAME_CONFIG.GRID.COLS) {
                neighbors.push({ row: newRow, col: newCol });
            }
        }
        
        return neighbors;
    }

    /**
     * Check for and remove floating bubbles
     */
    checkFloatingBubbles() {
        // Mark all bubbles connected to top as safe
        const connected = new Set();
        const queue = [];
        
        // Start from top row
        for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
            if (this.game.gridBubbles[0] && this.game.gridBubbles[0][col]) {
                const key = `0,${col}`;
                connected.add(key);
                queue.push({ row: 0, col });
            }
        }
        
        // BFS to find all connected bubbles
        while (queue.length > 0) {
            const { row, col } = queue.shift();
            const neighbors = this.getNeighbors(row, col);
            
            for (const { row: nRow, col: nCol } of neighbors) {
                const key = `${nRow},${nCol}`;
                if (!connected.has(key) && 
                    this.game.gridBubbles[nRow] && 
                    this.game.gridBubbles[nRow][nCol]) {
                    
                    connected.add(key);
                    queue.push({ row: nRow, col });
                }
            }
        }
        
        // Remove floating bubbles from extended grid
        const effectiveRows = this.game.gridBubbles.length;
        let floatingCount = 0;
        
        for (let row = 0; row < effectiveRows; row++) {
            for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
                const key = `${row},${col}`;
                if (this.game.gridBubbles[row] && this.game.gridBubbles[row][col] && !connected.has(key)) {
                    const floatingBubble = this.game.gridBubbles[row][col];
                    floatingBubble.falling = true;
                    floatingBubble.enablePhysics(this.game.physicsEngine.engine);
                    this.game.fallingBubbles.push(floatingBubble);
                    this.game.gridBubbles[row][col] = null;
                    this.game.score += GAME_CONFIG.GAME.AVALANCHE_BONUS;
                    floatingCount++;
                }
            }
        }
        
        if (floatingCount > 0) {
            this.game.debugLogger.log('floating', `Removed ${floatingCount} floating bubbles`, { floatingCount });
            this.game.playSound('fall');
        }
    }

    /**
     * Check for precise overlap detection
     */
    wouldOverlapPrecise(x, y, excludeRow = -1, excludeCol = -1) {
        const effectiveRows = this.game.gridBubbles.length;
        const minDistance = GAME_CONFIG.BUBBLE.RADIUS * 1.8;
        
        for (let row = 0; row < effectiveRows; row++) {
            for (let col = 0; col < GAME_CONFIG.GRID.COLS; col++) {
                if (row === excludeRow && col === excludeCol) continue;
                if (this.game.gridBubbles[row] && this.game.gridBubbles[row][col]) {
                    const bubble = this.game.gridBubbles[row][col];
                    const distance = Math.sqrt((x - bubble.x) ** 2 + (y - bubble.y) ** 2);
                    if (distance < minDistance) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Reset collision counters for new frame
     */
    resetFrameCounters() {
        this.collisionChecksThisFrame = 0;
        this.gridSnapsThisFrame = 0;
    }

    /**
     * Get collision statistics for current frame
     */
    getFrameStats() {
        return {
            collisionChecks: this.collisionChecksThisFrame,
            gridSnaps: this.gridSnapsThisFrame
        };
    }
}
