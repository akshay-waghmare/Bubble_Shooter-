/**
 * Hybrid Bubble Shooter Game
 * Integrates Phaser.js + Three.js hybrid renderer with existing game logic
 */

class HybridBubbleShooterGame {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            width: options.width || 800,
            height: options.height || 600,
            use3D: options.use3D !== false,
            quality: options.quality || 'high',
            mode: options.mode || 'classic',
            difficulty: options.difficulty || 'medium',
            ...options
        };
        
        // Game state
        this.gameState = 'menu'; // 'menu', 'playing', 'paused', 'gameOver', 'victory'
        this.score = 0;
        this.level = 1;
        this.shots = 0;
        this.maxShots = 50;
        
        // Grid and bubble management
        this.grid = [];
        this.gridRows = 12;
        this.gridCols = 15;
        this.bubbleRadius = 20;
        this.gridOffsetX = 50;
        this.gridOffsetY = 50;
        
        // Shooting mechanics
        this.currentBubble = null;
        this.nextBubble = null;
        this.shootingPosition = { x: 400, y: 550 };
        this.isAiming = false;
        this.aimAngle = 0;
        
        // Available colors (indices 0-5)
        this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];
        
        // Initialize hybrid renderer
        this.hybridRenderer = null;
        this.bubbleMap = new Map(); // Map bubble IDs to game data
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🎮 Initializing Hybrid Bubble Shooter Game...');
            
            // Initialize hybrid renderer
            this.hybridRenderer = new HybridRenderer(this.containerId, {
                width: this.options.width,
                height: this.options.height,
                use3D: this.options.use3D,
                quality: this.options.quality,
                integrationMode: 'overlay'
            });
            
            // Wait for initialization
            await this.waitForRenderer();
            
            // Setup game-specific event handlers
            this.setupGameEvents();
            
            // Initialize game grid
            this.initializeGrid();
            
            // Start the game
            this.startGame();
            
            console.log('✅ Hybrid Bubble Shooter Game initialized successfully!');
            
        } catch (error) {
            console.error('❌ Failed to initialize Hybrid Bubble Shooter Game:', error);
            throw error;
        }
    }
    
    async waitForRenderer() {
        let attempts = 0;
        while (!this.hybridRenderer.initialized && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!this.hybridRenderer.initialized) {
            throw new Error('Hybrid renderer failed to initialize');
        }
    }
    
    setupGameEvents() {
        // Override the default shooting handler
        const scene = this.hybridRenderer.phaserScene;
        
        // Remove default handlers
        scene.input.removeAllListeners('pointerdown');
        
        // Add game-specific input handling
        scene.input.on('pointerdown', (pointer) => {
            this.handleClick(pointer.x, pointer.y);
        });
        
        scene.input.on('pointermove', (pointer) => {
            this.handleMouseMove(pointer.x, pointer.y);
        });
        
        // Keyboard shortcuts
        scene.input.keyboard.on('keydown-SPACE', () => {
            this.handlePause();
        });
        
        scene.input.keyboard.on('keydown-R', () => {
            this.restartGame();
        });
    }
    
    initializeGrid() {
        // Clear existing grid
        this.grid = [];
        
        // Initialize empty grid
        for (let row = 0; row < this.gridRows; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.gridCols; col++) {
                this.grid[row][col] = null;
            }
        }
        
        // Add initial bubbles based on difficulty
        const initialRows = this.getInitialRowsForDifficulty();
        this.generateInitialBubbles(initialRows);
    }
    
    getInitialRowsForDifficulty() {
        const difficultyRows = {
            'novice': 3,
            'easy': 4,
            'medium': 5,
            'hard': 6,
            'master': 7
        };
        return difficultyRows[this.options.difficulty] || 5;
    }
    
    generateInitialBubbles(rows) {
        for (let row = 0; row < rows; row++) {
            const cols = this.getColumnsForRow(row);
            for (let col = 0; col < cols; col++) {
                const color = Math.floor(Math.random() * 6); // Random color 0-5
                this.createGridBubble(row, col, color);
            }
        }
    }
    
    getColumnsForRow(row) {
        // Hexagonal grid: even rows have full columns, odd rows are offset
        return row % 2 === 0 ? this.gridCols : this.gridCols - 1;
    }
    
    createGridBubble(row, col, color) {
        const position = this.getGridPosition(row, col);
        
        // Create bubble using hybrid renderer
        const bubbleId = this.hybridRenderer.createBubble(position.x, position.y, color, {
            scale: 0.8,
            physics: false // Grid bubbles don't need physics
        });
        
        // Store in grid
        this.grid[row][col] = {
            id: bubbleId,
            color: color,
            row: row,
            col: col,
            x: position.x,
            y: position.y
        };
        
        // Map bubble ID to grid position
        this.bubbleMap.set(bubbleId, this.grid[row][col]);
        
        return bubbleId;
    }
    
    getGridPosition(row, col) {
        const hexWidth = this.bubbleRadius * 2;
        const hexHeight = this.bubbleRadius * 1.732; // sqrt(3)
        
        let x = this.gridOffsetX + col * hexWidth;
        let y = this.gridOffsetY + row * hexHeight * 0.75;
        
        // Offset odd rows for hexagonal pattern
        if (row % 2 === 1) {
            x += hexWidth * 0.5;
        }
        
        return { x, y };
    }
    
    startGame() {
        this.gameState = 'playing';
        
        // Create current and next bubbles
        this.currentBubble = this.createShootingBubble();
        this.nextBubble = this.createNextBubble();
        
        // Update UI
        this.updateUI();
    }
    
    createShootingBubble() {
        const color = Math.floor(Math.random() * 6);
        const bubbleId = this.hybridRenderer.createBubble(
            this.shootingPosition.x, 
            this.shootingPosition.y, 
            color, 
            {
                scale: 1.0,
                physics: true,
                trail: this.options.use3D
            }
        );
        
        // Store shooting bubble data
        const bubbleData = {
            id: bubbleId,
            color: color,
            type: 'shooting',
            x: this.shootingPosition.x,
            y: this.shootingPosition.y
        };
        
        this.bubbleMap.set(bubbleId, bubbleData);
        return bubbleData;
    }
    
    createNextBubble() {
        const color = Math.floor(Math.random() * 6);
        const bubbleId = this.hybridRenderer.createBubble(
            this.shootingPosition.x + 60, 
            this.shootingPosition.y, 
            color, 
            {
                scale: 0.6,
                physics: false,
                alpha: 0.7
            }
        );
        
        return {
            id: bubbleId,
            color: color,
            type: 'next'
        };
    }
    
    handleClick(x, y) {
        if (this.gameState !== 'playing' || !this.currentBubble) return;
        
        // Calculate shooting angle and shoot
        const angle = Math.atan2(y - this.shootingPosition.y, x - this.shootingPosition.x);
        this.shootBubble(angle);
    }
    
    handleMouseMove(x, y) {
        if (this.gameState !== 'playing') return;
        
        // Update aim angle for visual feedback
        this.aimAngle = Math.atan2(y - this.shootingPosition.y, x - this.shootingPosition.x);
        // You could add aim line rendering here
    }
    
    shootBubble(angle) {
        if (!this.currentBubble) return;
        
        const bubble = this.hybridRenderer.bubbles.get(this.currentBubble.id);
        if (!bubble) return;
        
        const speed = 600;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        
        // Apply physics velocity
        if (bubble.sprite && bubble.sprite.body) {
            bubble.sprite.body.setVelocity(vx, vy);
        }
        
        // Set up collision detection
        this.setupBubbleCollision(this.currentBubble.id);
        
        // Move next bubble to current
        this.moveBubbleToShooting();
        
        // Update shots counter
        this.shots++;
        this.updateUI();
        
        // Check if out of shots
        if (this.shots >= this.maxShots) {
            this.handleGameOver();
        }
    }
    
    setupBubbleCollision(bubbleId) {
        const bubble = this.hybridRenderer.bubbles.get(bubbleId);
        if (!bubble || !bubble.sprite) return;
        
        // Set up collision callback
        const scene = this.hybridRenderer.phaserScene;
        
        // Check for collisions with grid bubbles and walls
        scene.physics.world.on('worldstep', () => {
            this.checkBubbleCollisions(bubbleId);
        });
    }
    
    checkBubbleCollisions(bubbleId) {
        const bubbleData = this.bubbleMap.get(bubbleId);
        const bubble = this.hybridRenderer.bubbles.get(bubbleId);
        
        if (!bubble || !bubble.sprite || !bubbleData) return;
        
        const sprite = bubble.sprite;
        const x = sprite.x;
        const y = sprite.y;
        
        // Check wall collisions
        if (x <= this.bubbleRadius || x >= this.options.width - this.bubbleRadius) {
            sprite.body.setVelocityX(-sprite.body.velocity.x * 0.8);
        }
        
        // Check ceiling collision
        if (y <= this.bubbleRadius + this.gridOffsetY) {
            this.handleBubbleStick(bubbleId, x, y);
            return;
        }
        
        // Check grid bubble collisions
        this.checkGridCollisions(bubbleId, x, y);
    }
    
    checkGridCollisions(bubbleId, x, y) {
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.getColumnsForRow(row); col++) {
                const gridBubble = this.grid[row][col];
                if (!gridBubble) continue;
                
                const distance = Math.sqrt(
                    Math.pow(x - gridBubble.x, 2) + 
                    Math.pow(y - gridBubble.y, 2)
                );
                
                if (distance < this.bubbleRadius * 2) {
                    this.handleBubbleStick(bubbleId, x, y);
                    return;
                }
            }
        }
    }
    
    handleBubbleStick(bubbleId, x, y) {
        // Find nearest grid position
        const gridPos = this.findNearestGridPosition(x, y);
        if (!gridPos) return;
        
        // Stop bubble physics
        const bubble = this.hybridRenderer.bubbles.get(bubbleId);
        if (bubble && bubble.sprite && bubble.sprite.body) {
            bubble.sprite.body.setVelocity(0, 0);
            bubble.sprite.body.setAngularVelocity(0);
        }
        
        // Move bubble to grid position
        const position = this.getGridPosition(gridPos.row, gridPos.col);
        bubble.sprite.setPosition(position.x, position.y);
        
        // Add to grid
        const bubbleData = this.bubbleMap.get(bubbleId);
        this.grid[gridPos.row][gridPos.col] = {
            id: bubbleId,
            color: bubbleData.color,
            row: gridPos.row,
            col: gridPos.col,
            x: position.x,
            y: position.y
        };
        
        // Update bubble map
        this.bubbleMap.set(bubbleId, this.grid[gridPos.row][gridPos.col]);
        
        // Check for matches
        this.checkMatches(gridPos.row, gridPos.col);
        
        // Prepare next shot
        this.prepareNextShot();
    }
    
    findNearestGridPosition(x, y) {
        let nearest = null;
        let minDistance = Infinity;
        
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.getColumnsForRow(row); col++) {
                if (this.grid[row][col]) continue; // Position occupied
                
                const pos = this.getGridPosition(row, col);
                const distance = Math.sqrt(
                    Math.pow(x - pos.x, 2) + 
                    Math.pow(y - pos.y, 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = { row, col };
                }
            }
        }
        
        return nearest;
    }
    
    checkMatches(row, col) {
        const targetColor = this.grid[row][col].color;
        const matches = this.findMatches(row, col, targetColor, new Set());
        
        if (matches.size >= 3) {
            this.removeBubbles(Array.from(matches));
            this.checkFloatingBubbles();
            this.updateScore(matches.size);
        }
    }
    
    findMatches(row, col, color, visited) {
        const key = `${row},${col}`;
        if (visited.has(key)) return visited;
        if (!this.grid[row] || !this.grid[row][col]) return visited;
        if (this.grid[row][col].color !== color) return visited;
        
        visited.add(key);
        
        // Check all 6 hexagonal neighbors
        const neighbors = this.getHexNeighbors(row, col);
        for (const neighbor of neighbors) {
            this.findMatches(neighbor.row, neighbor.col, color, visited);
        }
        
        return visited;
    }
    
    getHexNeighbors(row, col) {
        const neighbors = [];
        const isEvenRow = row % 2 === 0;
        
        // Define neighbor offsets for hexagonal grid
        const offsets = isEvenRow ? [
            [-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]
        ] : [
            [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]
        ];
        
        for (const [dr, dc] of offsets) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (newRow >= 0 && newRow < this.gridRows && 
                newCol >= 0 && newCol < this.getColumnsForRow(newRow)) {
                neighbors.push({ row: newRow, col: newCol });
            }
        }
        
        return neighbors;
    }
    
    removeBubbles(matches) {
        for (const match of matches) {
            const [row, col] = match.split(',').map(Number);
            const bubble = this.grid[row][col];
            
            if (bubble) {
                // Create pop effect
                this.hybridRenderer.createPopEffect(bubble.x, bubble.y, this.colors[bubble.color]);
                
                // Remove from renderer
                const bubbleSprite = this.hybridRenderer.bubbles.get(bubble.id);
                if (bubbleSprite && bubbleSprite.sprite) {
                    bubbleSprite.sprite.destroy();
                }
                this.hybridRenderer.bubbles.delete(bubble.id);
                
                // Remove from grid and map
                this.grid[row][col] = null;
                this.bubbleMap.delete(bubble.id);
            }
        }
    }
    
    checkFloatingBubbles() {
        // Find all bubbles connected to the top
        const connected = new Set();
        
        // Start from top row
        for (let col = 0; col < this.getColumnsForRow(0); col++) {
            if (this.grid[0][col]) {
                this.markConnected(0, col, connected);
            }
        }
        
        // Remove unconnected bubbles
        const toRemove = [];
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.getColumnsForRow(row); col++) {
                if (this.grid[row][col] && !connected.has(`${row},${col}`)) {
                    toRemove.push(`${row},${col}`);
                }
            }
        }
        
        if (toRemove.length > 0) {
            this.removeBubbles(toRemove);
            this.updateScore(toRemove.length, true); // Bonus for floating bubbles
        }
    }
    
    markConnected(row, col, connected) {
        const key = `${row},${col}`;
        if (connected.has(key)) return;
        if (!this.grid[row] || !this.grid[row][col]) return;
        
        connected.add(key);
        
        const neighbors = this.getHexNeighbors(row, col);
        for (const neighbor of neighbors) {
            this.markConnected(neighbor.row, neighbor.col, connected);
        }
    }
    
    updateScore(bubbleCount, isFloating = false) {
        const basePoints = bubbleCount * 10;
        const bonus = isFloating ? bubbleCount * 5 : 0;
        this.score += basePoints + bonus;
        
        this.updateUI();
        this.checkLevelComplete();
    }
    
    checkLevelComplete() {
        // Check if all bubbles are cleared
        let hasBubbles = false;
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.getColumnsForRow(row); col++) {
                if (this.grid[row][col]) {
                    hasBubbles = true;
                    break;
                }
            }
            if (hasBubbles) break;
        }
        
        if (!hasBubbles) {
            this.handleLevelComplete();
        }
    }
    
    handleLevelComplete() {
        this.gameState = 'victory';
        this.level++;
        
        // Show victory message
        console.log(`🎉 Level ${this.level - 1} Complete! Score: ${this.score}`);
        
        // Start next level after delay
        setTimeout(() => {
            this.startNextLevel();
        }, 2000);
    }
    
    startNextLevel() {
        // Reset shots
        this.shots = 0;
        this.maxShots += 10; // More shots for higher levels
        
        // Generate new level
        this.initializeGrid();
        this.startGame();
    }
    
    handleGameOver() {
        this.gameState = 'gameOver';
        console.log(`💀 Game Over! Final Score: ${this.score}`);
        
        // Could add restart UI here
    }
    
    moveBubbleToShooting() {
        if (this.nextBubble) {
            // Remove current bubble reference
            this.currentBubble = null;
            
            // Move next bubble to shooting position
            const nextSprite = this.hybridRenderer.bubbles.get(this.nextBubble.id);
            if (nextSprite && nextSprite.sprite) {
                nextSprite.sprite.setPosition(this.shootingPosition.x, this.shootingPosition.y);
                nextSprite.sprite.setScale(1.0);
                nextSprite.sprite.setAlpha(1.0);
                
                // Enable physics
                const scene = this.hybridRenderer.phaserScene;
                scene.physics.add.existing(nextSprite.sprite);
                nextSprite.sprite.body.setCircle(this.bubbleRadius);
                nextSprite.sprite.body.setBounce(0.8);
            }
            
            // Update bubble data
            this.nextBubble.type = 'shooting';
            this.nextBubble.x = this.shootingPosition.x;
            this.nextBubble.y = this.shootingPosition.y;
            
            this.currentBubble = this.nextBubble;
            this.bubbleMap.set(this.nextBubble.id, this.nextBubble);
        }
        
        // Create new next bubble
        this.nextBubble = this.createNextBubble();
    }
    
    prepareNextShot() {
        // Small delay before next shot is available
        setTimeout(() => {
            if (this.gameState === 'playing') {
                this.moveBubbleToShooting();
            }
        }, 500);
    }
    
    updateUI() {
        // Update score display
        const scene = this.hybridRenderer.phaserScene;
        if (scene && scene.scoreText) {
            scene.scoreText.setText(`Score: ${this.score}`);
            scene.levelText.setText(`Level: ${this.level}`);
            scene.shotsText.setText(`Shots: ${this.maxShots - this.shots}`);
        }
    }
    
    handlePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.hybridRenderer.phaserGame.scene.pause();
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.hybridRenderer.phaserGame.scene.resume();
        }
    }
    
    restartGame() {
        // Reset game state
        this.gameState = 'playing';
        this.score = 0;
        this.level = 1;
        this.shots = 0;
        this.maxShots = 50;
        
        // Clear all bubbles
        this.hybridRenderer.bubbles.forEach((bubble, id) => {
            if (bubble.sprite) {
                bubble.sprite.destroy();
            }
        });
        this.hybridRenderer.bubbles.clear();
        this.bubbleMap.clear();
        
        // Restart
        this.initializeGrid();
        this.startGame();
    }
    
    destroy() {
        if (this.hybridRenderer) {
            this.hybridRenderer.destroy();
        }
        this.bubbleMap.clear();
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HybridBubbleShooterGame;
} else if (typeof window !== 'undefined') {
    window.HybridBubbleShooterGame = HybridBubbleShooterGame;
}
