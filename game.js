// Bubble Shooter Game Implementation

// Game constants
const BUBBLE_RADIUS = 20;
const BUBBLE_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];
const SHOOTER_SPEED = 8;
const GRID_ROWS = 10;
const GRID_COLS = 14;
const GRID_TOP_MARGIN = BUBBLE_RADIUS * 2;
const GRID_ROW_HEIGHT = BUBBLE_RADIUS * 1.8; // Increased spacing vertically
const GRID_COL_SPACING = BUBBLE_RADIUS * 2.1; // Increased spacing horizontally
const MISSED_SHOTS_LIMIT = 5;
const POP_THRESHOLD = 3; // Number of same-colored bubbles needed to pop
const POINTS_PER_BUBBLE = 10;
const AVALANCHE_BONUS = 5; // Points per bubble in an avalanche
const CLEAR_FIELD_BONUS_MULTIPLIER = 2;

class Bubble {
    constructor(x, y, color, row = -1, col = -1) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = BUBBLE_RADIUS;
        this.vx = 0;
        this.vy = 0;
        this.stuck = false;
        this.row = row;
        this.col = col;
        this.removing = false; // Flag for animation when removing
        this.falling = false;  // Flag for falling animation
        this.fallingSpeed = 0;
        this.visited = false;  // For flood fill algorithm
    }

    draw(ctx) {
        if (this.removing) {
            // Draw pop animation
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fill();
            return;
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Add a highlight for better visual effect
        ctx.beginPath();
        ctx.arc(this.x - 8, this.y - 8, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
    }

    update() {
        if (this.removing) {
            return;
        }
        
        if (this.falling) {
            this.vy += 0.5; // Increase falling speed
            this.y += this.vy;
            return;
        }

        if (!this.stuck) {
            this.x += this.vx;
            this.y += this.vy;
        }
    }

    isCollidingWith(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // More precise collision detection - optimized for proper grid placement
        return distance < (this.radius + other.radius) * 0.85; // Adjusted collision threshold
    }
}

class Shooter {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.currentColor = this.getRandomColor();
        this.nextColor = this.getRandomColor();
        this.canShoot = true;
        this.reloadTime = 300; // ms
        this.lastShot = 0;
    }

    getRandomColor() {
        return BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
    }

    draw(ctx) {
        // Draw shooter base
        ctx.beginPath();
        ctx.arc(this.x, this.y, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#444';
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw cannon barrel
        const barrelLength = 40;
        const endX = this.x + Math.cos(this.angle) * barrelLength;
        const endY = this.y + Math.sin(this.angle) * barrelLength;
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 8;
        ctx.stroke();

        // Draw current bubble
        ctx.beginPath();
        ctx.arc(this.x, this.y, BUBBLE_RADIUS * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = this.currentColor;
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw aim line with wall bounces
        if (this.angle !== 0 && this.canShoot) {
            this.drawAimLine(ctx, this.x, this.y, this.angle, 800);
        }

        // Draw next bubble preview
        ctx.beginPath();
        ctx.arc(this.x - 50, this.y + 10, BUBBLE_RADIUS * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = this.nextColor;
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Label for next bubble
        ctx.font = '14px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText('Next', this.x - 70, this.y + 10);
    }

    // Draw aim line with bank shots
    drawAimLine(ctx, startX, startY, angle, maxLength) {
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        let x = startX;
        let y = startY;
        let remainingLength = maxLength;
        let currentAngle = angle;
        
        while (remainingLength > 0 && y > BUBBLE_RADIUS * 2) {
            // Calculate next point
            let nextX = x + Math.cos(currentAngle) * remainingLength;
            let nextY = y + Math.sin(currentAngle) * remainingLength;
            
            // Check for wall collision
            if (nextX < BUBBLE_RADIUS) {
                // Hit left wall
                const distToWall = x - BUBBLE_RADIUS;
                const timeToWall = distToWall / Math.abs(Math.cos(currentAngle) * SHOOTER_SPEED);
                const yAtWall = y + Math.sin(currentAngle) * SHOOTER_SPEED * timeToWall;
                
                ctx.lineTo(BUBBLE_RADIUS, yAtWall);
                x = BUBBLE_RADIUS;
                y = yAtWall;
                currentAngle = Math.PI - currentAngle; // Reflect angle
                remainingLength -= distToWall / Math.cos(currentAngle);
            } else if (nextX > ctx.canvas.width - BUBBLE_RADIUS) {
                // Hit right wall
                const distToWall = ctx.canvas.width - BUBBLE_RADIUS - x;
                const timeToWall = distToWall / Math.abs(Math.cos(currentAngle) * SHOOTER_SPEED);
                const yAtWall = y + Math.sin(currentAngle) * SHOOTER_SPEED * timeToWall;
                
                ctx.lineTo(ctx.canvas.width - BUBBLE_RADIUS, yAtWall);
                x = ctx.canvas.width - BUBBLE_RADIUS;
                y = yAtWall;
                currentAngle = Math.PI - currentAngle; // Reflect angle
                remainingLength -= distToWall / Math.cos(currentAngle);
            } else {
                // No wall collision
                ctx.lineTo(nextX, nextY);
                remainingLength = 0;
            }
        }
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    aimAt(mouseX, mouseY) {
        this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        // Limit angle to prevent shooting downward
        if (this.angle > Math.PI / 2) this.angle = Math.PI / 2;
        if (this.angle < -Math.PI / 2) this.angle = -Math.PI / 2;
    }

    shoot() {
        if (!this.canShoot) return null;
        
        const now = Date.now();
        if (now - this.lastShot < this.reloadTime) return null;
        
        this.lastShot = now;
        this.canShoot = false;
        
        const bubble = new Bubble(this.x, this.y, this.currentColor);
        bubble.vx = Math.cos(this.angle) * SHOOTER_SPEED;
        bubble.vy = Math.sin(this.angle) * SHOOTER_SPEED;
        
        // Update colors
        this.currentColor = this.nextColor;
        this.nextColor = this.getRandomColor();
        
        setTimeout(() => {
            this.canShoot = true;
        }, this.reloadTime);
        
        return bubble;
    }
}

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Set initial canvas dimensions based on container size
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth - 40; // Account for padding
        const containerHeight = window.innerHeight * 0.7; // Use 70% of viewport height
        
        canvas.width = containerWidth;
        canvas.height = Math.min(containerHeight, containerWidth * 0.75);
        
        this.gridBubbles = []; // 2D array representing the grid of bubbles
        this.flyingBubbles = []; // Bubbles that are currently moving
        this.removingBubbles = []; // Bubbles that are being removed
        this.fallingBubbles = []; // Bubbles that are falling
        this.shooter = new Shooter(canvas.width / 2, canvas.height - 50);
        this.mouseX = 0;
        this.mouseY = 0;
        this.score = 0;
        this.level = 1;
        this.missedShots = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.bubblesCleared = 0;
        this.totalBubbles = 0;
        this.gameMode = "classic"; // classic, arcade, strategy
        this.difficulty = "novice"; // novice, easy, medium, hard, master
        this.shotsLeft = Infinity; // For strategy mode
        this.timeLeft = Infinity; // For arcade mode
        this.soundEnabled = true;
        this.highScores = this.loadHighScores();
        this.difficultySettings = {
            novice: { rowsToStart: 3, colors: 3, addRowFrequency: 10 },
            easy: { rowsToStart: 4, colors: 4, addRowFrequency: 8 },
            medium: { rowsToStart: 5, colors: 5, addRowFrequency: 6 },
            hard: { rowsToStart: 6, colors: 6, addRowFrequency: 4 },
            master: { rowsToStart: 7, colors: 6, addRowFrequency: 3 }
        };
        
        this.setupEventListeners();
    }
    
    start() {
        this.resizeCanvas(); // Ensure proper sizing before starting
        this.initGame();
        this.gameLoop();
    }

    loadHighScores() {
        const scores = localStorage.getItem('bubbleShooterHighScores');
        return scores ? JSON.parse(scores) : [];
    }

    saveHighScore(score) {
        const scores = this.loadHighScores();
        scores.push({ score, date: new Date().toISOString(), mode: this.gameMode, difficulty: this.difficulty });
        scores.sort((a, b) => b.score - a.score);
        if (scores.length > 10) scores.length = 10; // Keep only top 10
        localStorage.setItem('bubbleShooterHighScores', JSON.stringify(scores));
    }

    initGame() {
        this.gridBubbles = [];
        this.flyingBubbles = [];
        this.removingBubbles = [];
        this.fallingBubbles = [];
        this.score = 0;
        this.missedShots = 0;
        this.gameOver = false;
        this.gameWon = false;
        
        // Initialize grid
        for (let row = 0; row < GRID_ROWS; row++) {
            this.gridBubbles[row] = [];
            for (let col = 0; col < GRID_COLS; col++) {
                this.gridBubbles[row][col] = null;
            }
        }
        
        // Create initial bubble grid based on difficulty
        const settings = this.difficultySettings[this.difficulty];
        const colorSubset = BUBBLE_COLORS.slice(0, settings.colors);
        
        // Calculate maximum bubbles that can fit in the grid based on canvas width
        const maxBubblesPerRow = Math.floor((this.canvas.width - BUBBLE_RADIUS * 2) / GRID_COL_SPACING);
        const effectiveGridCols = Math.min(GRID_COLS, maxBubblesPerRow);
        
        for (let row = 0; row < settings.rowsToStart; row++) {
            for (let col = 0; col < effectiveGridCols; col++) {
                // Skip some bubbles randomly for aesthetic reasons and to create more interesting patterns
                if (Math.random() < 0.85) {
                    const x = this.getColPosition(row, col);
                    const y = this.getRowPosition(row);
                    
                    // Ensure we don't place bubbles too close to the edge
                    if (x < BUBBLE_RADIUS || x > this.canvas.width - BUBBLE_RADIUS) {
                        continue;
                    }
                    
                    // Create color clusters for more strategic gameplay
                    let color;
                    if (row > 0 && col > 0 && this.gridBubbles[row-1][col] && Math.random() < 0.6) {
                        // 60% chance to use same color as bubble above for clusters
                        color = this.gridBubbles[row-1][col].color;
                    } else if (col > 0 && this.gridBubbles[row][col-1] && Math.random() < 0.4) {
                        // 40% chance to use same color as bubble to the left
                        color = this.gridBubbles[row][col-1].color;
                    } else {
                        // Otherwise random color
                        color = colorSubset[Math.floor(Math.random() * colorSubset.length)];
                    }
                    
                    const bubble = new Bubble(x, y, color, row, col);
                    bubble.stuck = true;
                    this.gridBubbles[row][col] = bubble;
                    this.totalBubbles++;
                }
            }
        }

        // Set up game mode specifics
        if (this.gameMode === "strategy") {
            this.shotsLeft = 30; // Limited shots for strategy mode
        } else if (this.gameMode === "arcade") {
            this.timeLeft = 120; // 2 minutes for arcade mode
        }
    }

    getColPosition(row, col) {
        const evenRow = row % 2 === 0;
        // Use GRID_COL_SPACING for better horizontal spacing to prevent overlaps
        const x = col * GRID_COL_SPACING + BUBBLE_RADIUS + (evenRow ? 0 : BUBBLE_RADIUS);
        return x;
    }

    getRowPosition(row) {
        return row * GRID_ROW_HEIGHT + GRID_TOP_MARGIN;
    }

    setupEventListeners() {
        // Add resize handler for responsive canvas sizing
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
        
        // Initial resize to ensure proper dimensions
        this.resizeCanvas();
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.gameOver || this.gameWon) return;
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            this.shooter.aimAt(this.mouseX, this.mouseY);
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.gameOver || this.gameWon) {
                // Restart the game if it's over
                this.restartGame();
                return;
            }

            const bubble = this.shooter.shoot();
            if (bubble) {
                this.playSound('shoot');
                this.flyingBubbles.push(bubble);
                if (this.gameMode === "strategy") {
                    this.shotsLeft--;
                    if (this.shotsLeft <= 0) {
                        this.gameOver = true;
                    }
                }
            }
        });

        // Touch support for mobile
        this.canvas.addEventListener('touchmove', (e) => {
            if (this.gameOver || this.gameWon) return;
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;
            this.shooter.aimAt(this.mouseX, this.mouseY);
        });

        this.canvas.addEventListener('touchstart', (e) => {
            if (this.gameOver || this.gameWon) {
                // Restart the game if it's over
                this.restartGame();
                return;
            }

            e.preventDefault();
            const bubble = this.shooter.shoot();
            if (bubble) {
                this.playSound('shoot');
                this.flyingBubbles.push(bubble);
                if (this.gameMode === "strategy") {
                    this.shotsLeft--;
                    if (this.shotsLeft <= 0) {
                        this.gameOver = true;
                    }
                }
            }
        });
    }

    restartGame() {
        this.initGame();
        // Only start a new game loop if not already running
        if (this.gameOver || this.gameWon) {
            this.gameLoop();
        }
    }

    playSound(type) {
        if (!this.soundEnabled) return;
        // Sound effects would be implemented here
    }

    resizeCanvas() {
        // Get the container dimensions
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 40; // Subtracting padding
        const containerHeight = window.innerHeight * 0.7; // Use 70% of viewport height
        
        // Set canvas size based on available space while maintaining aspect ratio
        this.canvas.width = containerWidth;
        this.canvas.height = Math.min(containerHeight, containerWidth * 0.75);
        
        // Adjust bubble positioning based on canvas size
        const scaleFactor = this.canvas.width / (GRID_COLS * GRID_COL_SPACING + BUBBLE_RADIUS * 2);
        
        // Reposition the shooter
        this.shooter.x = this.canvas.width / 2;
        this.shooter.y = this.canvas.height - 50;
    }

    update() {
        if (this.gameOver || this.gameWon) return;
        
        // Update arcade mode timer
        if (this.gameMode === "arcade") {
            this.timeLeft -= 1/60; // Assuming 60 FPS
            if (this.timeLeft <= 0) {
                this.gameOver = true;
                return;
            }
        }
        
        // Update flying bubbles
        for (let i = this.flyingBubbles.length - 1; i >= 0; i--) {
            const bubble = this.flyingBubbles[i];
            bubble.update();

            // Check collision with walls
            if (bubble.x - bubble.radius <= 0 || bubble.x + bubble.radius >= this.canvas.width) {
                bubble.vx *= -0.8; // Bounce with some energy loss
                bubble.x = Math.max(bubble.radius, Math.min(this.canvas.width - bubble.radius, bubble.x));
                this.playSound('bounce');
            }

            // Check collision with top wall
            if (bubble.y - bubble.radius <= 0) {
                this.snapBubbleToGrid(bubble);
                this.flyingBubbles.splice(i, 1);
                continue;
            }

            // Optimized collision detection with existing grid bubbles
            let collided = false;
            
            // First check rows that are most likely to have collisions based on bubble's Y position
            const approximateRow = Math.floor((bubble.y - GRID_TOP_MARGIN) / GRID_ROW_HEIGHT);
            const rowsToCheck = [
                Math.max(0, approximateRow - 1),
                approximateRow,
                Math.min(GRID_ROWS - 1, approximateRow + 1)
            ];
            
            for (const row of rowsToCheck) {
                if (row < 0 || row >= GRID_ROWS) continue;
                
                // Calculate approximate column range to check based on X position
                const approximateCol = Math.floor(bubble.x / GRID_COL_SPACING);
                const colStart = Math.max(0, approximateCol - 2);
                const colEnd = Math.min(GRID_COLS - 1, approximateCol + 2);
                
                for (let col = colStart; col <= colEnd; col++) {
                    const gridBubble = this.gridBubbles[row][col];
                    if (gridBubble && bubble.isCollidingWith(gridBubble)) {
                        this.snapBubbleToGrid(bubble);
                        this.flyingBubbles.splice(i, 1);
                        collided = true;
                        break;
                    }
                }
                if (collided) break;
            }
        }

        // Update falling bubbles
        for (let i = this.fallingBubbles.length - 1; i >= 0; i--) {
            const bubble = this.fallingBubbles[i];
            bubble.update();

            // Remove bubbles that fall off screen
            if (bubble.y > this.canvas.height + bubble.radius) {
                this.fallingBubbles.splice(i, 1);
            }
        }

        // Update removing bubbles
        for (let i = this.removingBubbles.length - 1; i >= 0; i--) {
            const bubble = this.removingBubbles[i];
            // Removal animation would be here
            this.removingBubbles.splice(i, 1);
        }

        // Check if all bubbles are cleared
        let bubbleCount = 0;
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (this.gridBubbles[row][col]) {
                    bubbleCount++;
                }
            }
        }
        
        if (bubbleCount === 0) {
            this.gameWon = true;
            this.score *= CLEAR_FIELD_BONUS_MULTIPLIER; // Double score for clearing the field
            this.saveHighScore(this.score);
        }
        
        // Check if bubbles reached bottom
        for (let col = 0; col < GRID_COLS; col++) {
            if (this.gridBubbles[GRID_ROWS - 1][col]) {
                this.gameOver = true;
                this.saveHighScore(this.score);
                break;
            }
        }
    }

    snapBubbleToGrid(bubble) {
        // Find the closest grid position with improved accuracy
        let closestRow = -1;
        let closestCol = -1;
        let minDistance = Infinity;
        
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (!this.gridBubbles[row][col]) {
                    const x = this.getColPosition(row, col);
                    const y = this.getRowPosition(row);
                    const dx = bubble.x - x;
                    const dy = bubble.y - y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Add a bias toward positions closer to where the bubble hit
                    // and prioritize positions that have adjacent bubbles
                    let hasAdjacent = this.hasAdjacentBubble(row, col);
                    let adjacentBonus = hasAdjacent ? 0.7 : 1.3;
                    
                    // Final weighted distance calculation
                    let weightedDistance = distance * adjacentBonus;
                    
                    if (weightedDistance < minDistance) {
                        minDistance = weightedDistance;
                        closestRow = row;
                        closestCol = col;
                    }
                }
            }
        }
        
        // Snap to closest position
        if (closestRow >= 0 && closestCol >= 0) {
            bubble.x = this.getColPosition(closestRow, closestCol);
            bubble.y = this.getRowPosition(closestRow);
            bubble.stuck = true;
            bubble.row = closestRow;
            bubble.col = closestCol;
            bubble.vx = 0;
            bubble.vy = 0;
            this.gridBubbles[closestRow][closestCol] = bubble;
            
            // Check for matches
            const matches = this.checkMatches(closestRow, closestCol);
            if (matches.length >= POP_THRESHOLD) {
                this.playSound('pop');
                this.popBubbles(matches);
                // Reset missed shots counter
                this.missedShots = 0;
            } else {
                this.missedShots++;
                if (this.missedShots >= MISSED_SHOTS_LIMIT) {
                    this.addNewRow();
                    this.missedShots = 0;
                }
            }
        } else {
            // If no position found, try to place at a valid position in the bottom row
            for (let col = 0; col < GRID_COLS; col++) {
                if (!this.gridBubbles[GRID_ROWS - 1][col]) {
                    bubble.x = this.getColPosition(GRID_ROWS - 1, col);
                    bubble.y = this.getRowPosition(GRID_ROWS - 1);
                    bubble.stuck = true;
                    bubble.row = GRID_ROWS - 1;
                    bubble.col = col;
                    bubble.vx = 0;
                    bubble.vy = 0;
                    this.gridBubbles[GRID_ROWS - 1][col] = bubble;
                    this.missedShots++;
                    
                    if (this.missedShots >= MISSED_SHOTS_LIMIT) {
                        this.addNewRow();
                        this.missedShots = 0;
                    }
                    break;
                }
            }
        }
    }

    checkMatches(row, col) {
        const bubble = this.gridBubbles[row][col];
        if (!bubble) return [];
        
        // Reset visited flag for all bubbles
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (this.gridBubbles[r][c]) {
                    this.gridBubbles[r][c].visited = false;
                }
            }
        }
        
        // Use flood fill to find all connected bubbles of same color
        const matches = [];
        const color = bubble.color;
        
        const floodFill = (r, c) => {
            // Check bounds
            if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS) return;
            
            // Get bubble at this position
            const currentBubble = this.gridBubbles[r][c];
            
            // Check if bubble exists, is same color, and not visited
            if (!currentBubble || currentBubble.color !== color || currentBubble.visited) return;
            
            // Mark as visited
            currentBubble.visited = true;
            matches.push(currentBubble);
            
            // Get neighboring positions based on whether row is even or odd
            const isEvenRow = r % 2 === 0;
            const neighbors = [
                [r - 1, c + (isEvenRow ? -1 : 0)], // Top left
                [r - 1, c + (isEvenRow ? 0 : 1)],  // Top right
                [r, c - 1],                         // Left
                [r, c + 1],                         // Right
                [r + 1, c + (isEvenRow ? -1 : 0)], // Bottom left
                [r + 1, c + (isEvenRow ? 0 : 1)]   // Bottom right
            ];
            
            // Visit all neighbors
            for (const [nr, nc] of neighbors) {
                floodFill(nr, nc);
            }
        };
        
        floodFill(row, col);
        return matches;
    }

    popBubbles(bubbles) {
        // Remove bubbles from grid
        for (const bubble of bubbles) {
            this.gridBubbles[bubble.row][bubble.col] = null;
            bubble.removing = true;
            this.removingBubbles.push(bubble);
            this.bubblesCleared++;
        }
        
        // Add points
        this.score += bubbles.length * POINTS_PER_BUBBLE;
        
        // Check for floating bubbles (avalanche effect)
        const floatingBubbles = this.findFloatingBubbles();
        if (floatingBubbles.length > 0) {
            this.playSound('avalanche');
            this.score += floatingBubbles.length * AVALANCHE_BONUS;
            
            for (const bubble of floatingBubbles) {
                this.gridBubbles[bubble.row][bubble.col] = null;
                bubble.falling = true;
                bubble.vy = 1; // Initial falling speed
                this.fallingBubbles.push(bubble);
                this.bubblesCleared++;
            }
        }
    }

    findFloatingBubbles() {
        // Mark all bubbles as not visited
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (this.gridBubbles[row][col]) {
                    this.gridBubbles[row][col].visited = false;
                }
            }
        }
        
        // Mark all bubbles connected to top row as 'visited'
        for (let col = 0; col < GRID_COLS; col++) {
            if (this.gridBubbles[0][col]) {
                this.markConnectedBubbles(0, col);
            }
        }
        
        // Collect all unvisited (floating) bubbles
        const floatingBubbles = [];
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const bubble = this.gridBubbles[row][col];
                if (bubble && !bubble.visited) {
                    floatingBubbles.push(bubble);
                }
            }
        }
        
        return floatingBubbles;
    }

    markConnectedBubbles(row, col) {
        // Check bounds
        if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return;
        
        // Get bubble at this position
        const bubble = this.gridBubbles[row][col];
        
        // Check if bubble exists and is not visited
        if (!bubble || bubble.visited) return;
        
        // Mark as visited
        bubble.visited = true;
        
        // Get neighboring positions based on whether row is even or odd
        const isEvenRow = row % 2 === 0;
        const neighbors = [
            [row - 1, col + (isEvenRow ? -1 : 0)], // Top left
            [row - 1, col + (isEvenRow ? 0 : 1)],  // Top right
            [row, col - 1],                        // Left
            [row, col + 1],                        // Right
            [row + 1, col + (isEvenRow ? -1 : 0)], // Bottom left
            [row + 1, col + (isEvenRow ? 0 : 1)]   // Bottom right
        ];
        
        // Visit all neighbors
        for (const [nr, nc] of neighbors) {
            this.markConnectedBubbles(nr, nc);
        }
    }

    addNewRow() {
        // Shift all existing rows down
        for (let row = GRID_ROWS - 1; row > 0; row--) {
            for (let col = 0; col < GRID_COLS; col++) {
                this.gridBubbles[row][col] = this.gridBubbles[row - 1][col];
                if (this.gridBubbles[row][col]) {
                    this.gridBubbles[row][col].row = row;
                    this.gridBubbles[row][col].y = this.getRowPosition(row);
                }
            }
        }
        
        // Add new row at the top
        const settings = this.difficultySettings[this.difficulty];
        const colorSubset = BUBBLE_COLORS.slice(0, settings.colors);
        
        for (let col = 0; col < GRID_COLS; col++) {
            if (Math.random() < 0.9) { // 90% chance to add a bubble
                const x = this.getColPosition(0, col);
                const y = this.getRowPosition(0);
                const color = colorSubset[Math.floor(Math.random() * colorSubset.length)];
                const bubble = new Bubble(x, y, color, 0, col);
                bubble.stuck = true;
                this.gridBubbles[0][col] = bubble;
                this.totalBubbles++;
            } else {
                this.gridBubbles[0][col] = null;
            }
        }
        
        // Check if game is over (bubbles reached bottom)
        for (let col = 0; col < GRID_COLS; col++) {
            if (this.gridBubbles[GRID_ROWS - 1][col]) {
                this.gameOver = true;
                this.saveHighScore(this.score);
                break;
            }
        }
        
        this.playSound('newRow');
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, GRID_ROW_HEIGHT * GRID_ROWS + GRID_TOP_MARGIN);
        
        // Draw grid bubbles
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const bubble = this.gridBubbles[row][col];
                if (bubble) {
                    bubble.draw(this.ctx);
                }
            }
        }

        // Draw flying bubbles
        for (const bubble of this.flyingBubbles) {
            bubble.draw(this.ctx);
        }
        
        // Draw falling bubbles
        for (const bubble of this.fallingBubbles) {
            bubble.draw(this.ctx);
        }
        
        // Draw removing bubbles (pop animation)
        for (const bubble of this.removingBubbles) {
            bubble.draw(this.ctx);
        }

        // Draw shooter
        if (!this.gameOver && !this.gameWon) {
            this.shooter.draw(this.ctx);
        }

        // Draw UI
        this.drawUI();
    }

    drawUI() {
        // Draw score
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score}`, 20, 30);
        
        // Draw level
        this.ctx.fillText(`Level: ${this.level}`, 20, 60);
        
        // Draw missed shots indicator
        this.ctx.fillText(`Misses: ${this.missedShots}/${MISSED_SHOTS_LIMIT}`, 20, 90);
        
        // Draw mode specific UI
        if (this.gameMode === "strategy") {
            this.ctx.fillText(`Shots: ${this.shotsLeft}`, this.canvas.width - 120, 30);
        } else if (this.gameMode === "arcade") {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = Math.floor(this.timeLeft % 60);
            this.ctx.fillText(`Time: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`, this.canvas.width - 120, 30);
        }
        
        // Draw game over or win message
        if (this.gameOver || this.gameWon) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.font = 'bold 40px Arial';
            this.ctx.fillStyle = this.gameWon ? '#4ECDC4' : '#FF6B6B';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                this.gameWon ? 'You Win!' : 'Game Over', 
                this.canvas.width / 2, 
                this.canvas.height / 2 - 40
            );
            
            this.ctx.font = '24px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(
                `Final Score: ${this.score}`, 
                this.canvas.width / 2, 
                this.canvas.height / 2 + 10
            );
            
            this.ctx.font = '18px Arial';
            this.ctx.fillText(
                'Click to play again', 
                this.canvas.width / 2, 
                this.canvas.height / 2 + 50
            );
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize menu and game when page loads
window.addEventListener('load', () => {
    const canvas = document.getElementById('gameCanvas');
    const gameMenu = document.getElementById('gameMenu');
    const gameScreen = document.getElementById('gameScreen');
    const leaderboard = document.getElementById('leaderboard');
    const startGameBtn = document.getElementById('startGame');
    const backToMenuBtn = document.getElementById('backToMenu');
    const showLeaderboardBtn = document.getElementById('showLeaderboard');
    const backToMenuFromLeaderboardBtn = document.getElementById('backToMenuFromLeaderboard');
    const toggleSoundBtn = document.getElementById('toggleSound');
    
    let game = null;
    let selectedGameMode = 'classic';
    let selectedDifficulty = 'novice';
    let soundEnabled = true;

    // Handle game mode selection
    const gameModeButtons = document.querySelectorAll('.button-group button[data-mode]');
    gameModeButtons.forEach(button => {
        button.addEventListener('click', () => {
            gameModeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedGameMode = button.getAttribute('data-mode');
        });
    });

    // Handle difficulty selection
    const difficultyButtons = document.querySelectorAll('.button-group button[data-difficulty]');
    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            difficultyButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedDifficulty = button.getAttribute('data-difficulty');
        });
    });

    // Start Game button
    startGameBtn.addEventListener('click', () => {
        gameMenu.style.display = 'none';
        gameScreen.style.display = 'block';
        
        // Initialize game with selected settings
        game = new Game(canvas);
        game.gameMode = selectedGameMode;
        game.difficulty = selectedDifficulty;
        game.soundEnabled = soundEnabled;
        game.start(); // Start the game with the chosen settings
    });

    // Back to Menu button
    backToMenuBtn.addEventListener('click', () => {
        gameScreen.style.display = 'none';
        gameMenu.style.display = 'block';
    });

    // Show Leaderboard button
    showLeaderboardBtn.addEventListener('click', () => {
        gameMenu.style.display = 'none';
        leaderboard.style.display = 'block';
        
        // Populate leaderboard
        const scores = localStorage.getItem('bubbleShooterHighScores');
        const scoresList = document.getElementById('scoresList');
        scoresList.innerHTML = '';
        
        if (scores) {
            const parsedScores = JSON.parse(scores);
            parsedScores.forEach((score, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${score.score}</td>
                    <td>${score.mode}</td>
                    <td>${score.difficulty}</td>
                    <td>${new Date(score.date).toLocaleDateString()}</td>
                `;
                scoresList.appendChild(row);
            });
        } else {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5">No high scores yet!</td>';
            scoresList.appendChild(row);
        }
    });

    // Back to Menu from Leaderboard button
    backToMenuFromLeaderboardBtn.addEventListener('click', () => {
        leaderboard.style.display = 'none';
        gameMenu.style.display = 'block';
    });

    // Toggle Sound button
    toggleSoundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        toggleSoundBtn.textContent = `Sound: ${soundEnabled ? 'On' : 'Off'}`;
        if (game) {
            game.soundEnabled = soundEnabled;
        }
    });

    // Add resize listener to make the game responsive
    window.addEventListener('resize', () => {
        // Adjust canvas size if needed
        if (window.innerWidth < 850) {
            canvas.width = Math.min(400, window.innerWidth - 30);
            canvas.height = 300;
        } else {
            canvas.width = 800;
            canvas.height = 600;
        }
        
        // Update game dimensions if it exists
        if (game) {
            game.shooter.x = canvas.width / 2;
            game.shooter.y = canvas.height - 50;
        }
    });
});
