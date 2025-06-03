// Enhanced collision prediction system
// Provides advanced collision detection and prediction for improved gameplay

import { GAME_CONFIG } from '../../config/gameConfig.js';

export class CollisionPredictor {
    constructor() {
        this.predictionSteps = GAME_CONFIG.PREDICTION_STEPS;
        this.timeStep = GAME_CONFIG.TIME_STEP;
    }

    predictCollision(bubble, gridBubbles, canvasWidth, canvasHeight) {
        const predictions = [];
        let x = bubble.x;
        let y = bubble.y;
        let vx = bubble.vx;
        let vy = bubble.vy;

        for (let step = 0; step < this.predictionSteps; step++) {
            // Predict next position
            x += vx * this.timeStep;
            y += vy * this.timeStep;

            // Check wall bounces
            if (x - bubble.radius <= 0 || x + bubble.radius >= canvasWidth) {
                vx *= -GAME_CONFIG.WALL_BOUNCE_ENERGY_LOSS;
                x = Math.max(bubble.radius, Math.min(canvasWidth - bubble.radius, x));
            }

            // Check if we hit the top
            if (y - bubble.radius <= 0) {
                predictions.push({
                    step,
                    type: 'top_wall',
                    position: { x, y },
                    time: step * this.timeStep
                });
                break;
            }

            // Check grid collisions
            const collisionResult = this.checkGridCollision(x, y, bubble.radius, gridBubbles);
            if (collisionResult) {
                predictions.push({
                    step,
                    type: 'grid_collision',
                    position: { x, y },
                    collision: collisionResult,
                    time: step * this.timeStep
                });
                break;
            }
        }

        return predictions;
    }

    checkGridCollision(x, y, radius, gridBubbles) {
        // Quick grid-based collision check
        const GRID_ROW_HEIGHT = GAME_CONFIG.GRID_ROW_HEIGHT;
        const GRID_COL_SPACING = GAME_CONFIG.GRID_COL_SPACING;
        const GRID_TOP_MARGIN = GAME_CONFIG.GRID_TOP_MARGIN;

        const approximateRow = Math.round((y - GRID_TOP_MARGIN) / GRID_ROW_HEIGHT);
        const approximateCol = Math.round((x - radius) / GRID_COL_SPACING);

        const rowsToCheck = [
            Math.max(0, approximateRow - 1),
            approximateRow,
            Math.min(gridBubbles.length - 1, approximateRow + 1)
        ];

        for (const row of rowsToCheck) {
            if (row < 0 || row >= gridBubbles.length) continue;
            
            const colStart = Math.max(0, approximateCol - 2);
            const colEnd = Math.min(gridBubbles[row].length - 1, approximateCol + 2);
            
            for (let col = colStart; col <= colEnd; col++) {
                const gridBubble = gridBubbles[row][col];
                if (gridBubble) {
                    const dx = x - gridBubble.x;
                    const dy = y - gridBubble.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < (radius + gridBubble.radius) * GAME_CONFIG.COLLISION_PRECISION_FACTOR) {
                        return { bubble: gridBubble, distance, row, col };
                    }
                }
            }
        }
        return null;
    }

    // Predict optimal shot path considering bounces
    predictOptimalPath(startX, startY, targetX, targetY, canvasWidth, canvasHeight, maxBounces = 2) {
        const paths = [];
        
        // Direct path
        const directAngle = Math.atan2(targetY - startY, targetX - startX);
        paths.push({ angle: directAngle, bounces: 0, confidence: 1.0 });
        
        // Bank shot paths
        for (let bounces = 1; bounces <= maxBounces; bounces++) {
            // Left wall bounce
            const leftWallReflectionX = -(targetX - 0);
            const leftWallAngle = Math.atan2(targetY - startY, leftWallReflectionX - startX);
            if (leftWallAngle > -Math.PI/2 && leftWallAngle < 0) {
                paths.push({ 
                    angle: leftWallAngle, 
                    bounces, 
                    confidence: 1.0 / (bounces + 1),
                    wall: 'left'
                });
            }
            
            // Right wall bounce
            const rightWallReflectionX = 2 * canvasWidth - targetX;
            const rightWallAngle = Math.atan2(targetY - startY, rightWallReflectionX - startX);
            if (rightWallAngle > 0 && rightWallAngle < Math.PI/2) {
                paths.push({ 
                    angle: rightWallAngle, 
                    bounces, 
                    confidence: 1.0 / (bounces + 1),
                    wall: 'right'
                });
            }
        }
        
        return paths.sort((a, b) => b.confidence - a.confidence);
    }
}
