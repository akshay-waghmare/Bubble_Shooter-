// Bubble Shooter Game with Hexagonal Grid System

// Constants for grid configuration
const GRID_SETTINGS = {
    ROWS: 14,
    COLS: 15,
    TILE_WIDTH: 40,
    TILE_HEIGHT: 40,
    ROW_HEIGHT: 34,
    BUBBLE_RADIUS: 20,
    COLORS: 7
};

// Hexagonal grid neighbor patterns
const NEIGHBOR_OFFSETS = {
    EVEN_ROW: [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]],
    ODD_ROW: [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]]
};

class Bubble {
    constructor(x, y, type, row = -1, col = -1) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.row = row;
        this.col = col;
        this.radius = GRID_SETTINGS.BUBBLE_RADIUS;
        this.vx = 0;
        this.vy = 0;
        this.stuck = false;
        this.removing = false;
        this.falling = false;
        this.scale = 1;
        this.alpha = 1;
    }

    update() {
        if (!this.stuck) {
            this.x += this.vx;
            this.y += this.vy;
        }
        
        if (this.removing) {
            this.alpha -= 0.05;
            this.scale += 0.05;
            return this.alpha <= 0;
        }

        if (this.falling) {
            this.vy += 0.5;
            this.y += this.vy;
            this.alpha -= 0.02;
            return this.y > 600 || this.alpha <= 0;
        }

        return false;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        
        // Draw bubble
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.getColor();
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Add highlight
        ctx.beginPath();
        ctx.arc(-5, -5, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
        
        ctx.restore();
    }

    getColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B539C'];
        return colors[this.type];
    }
}

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridOffsetX = 4;
        this.gridOffsetY = 83;
        this.grid = Array(GRID_SETTINGS.COLS).fill()
            .map(() => Array(GRID_SETTINGS.ROWS).fill(null));
        this.score = 0;
        this.gameOver = false;
        this.shooter = {
            x: canvas.width / 2,
            y: canvas.height - 50,
            angle: 90,
            currentBubble: null,
            nextBubble: null
        };
        this.lastFrame = 0;
        
        this.initGame();
        this.setupEventListeners();
    }

    initGame() {
        // Initialize first 5 rows with bubbles
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < GRID_SETTINGS.COLS; col++) {
                const type = Math.floor(Math.random() * GRID_SETTINGS.COLORS);
                const pos = this.getGridPosition(col, row);
                const bubble = new Bubble(pos.x, pos.y, type, row, col);
                bubble.stuck = true;
                this.grid[col][row] = bubble;
            }
        }

        this.createNextBubble();
    }

    getGridPosition(col, row) {
        const offset = row % 2 === 0 ? 0 : GRID_SETTINGS.TILE_WIDTH / 2;
        return {
            x: this.gridOffsetX + col * GRID_SETTINGS.TILE_WIDTH + offset,
            y: this.gridOffsetY + row * GRID_SETTINGS.ROW_HEIGHT
        };
    }

    getGridCoordinates(x, y) {
        const adjustedY = y - this.gridOffsetY;
        const row = Math.round(adjustedY / GRID_SETTINGS.ROW_HEIGHT);
        const offset = row % 2 === 0 ? 0 : GRID_SETTINGS.TILE_WIDTH / 2;
        const adjustedX = x - this.gridOffsetX - offset;
        const col = Math.round(adjustedX / GRID_SETTINGS.TILE_WIDTH);

        return {
            row: Math.max(0, Math.min(row, GRID_SETTINGS.ROWS - 1)),
            col: Math.max(0, Math.min(col, GRID_SETTINGS.COLS - 1))
        };
    }

    getNeighborPositions(col, row) {
        const offsets = row % 2 === 0 ? 
            NEIGHBOR_OFFSETS.EVEN_ROW : 
            NEIGHBOR_OFFSETS.ODD_ROW;

        return offsets
            .map(([dx, dy]) => ({
                col: col + dx,
                row: row + dy
            }))
            .filter(({col, row}) => 
                col >= 0 && col < GRID_SETTINGS.COLS &&
                row >= 0 && row < GRID_SETTINGS.ROWS);
    }

    findSnapPosition(x, y) {
        const { col, row } = this.getGridCoordinates(x, y);
        
        if (!this.grid[col][row]) {
            return { col, row };
        }

        // Find nearest empty neighbor
        const neighbors = this.getNeighborPositions(col, row);
        for (const pos of neighbors) {
            if (!this.grid[pos.col][pos.row]) {
                return pos;
            }
        }
        return null;
    }

    checkCollision(bubble) {
        // Check wall collisions
        if (bubble.x - bubble.radius <= this.gridOffsetX) {
            bubble.x = this.gridOffsetX + bubble.radius;
            bubble.vx *= -1;
            return true;
        }
        if (bubble.x + bubble.radius >= this.gridOffsetX + GRID_SETTINGS.COLS * GRID_SETTINGS.TILE_WIDTH) {
            bubble.x = this.gridOffsetX + GRID_SETTINGS.COLS * GRID_SETTINGS.TILE_WIDTH - bubble.radius;
            bubble.vx *= -1;
            return true;
        }

        // Check ceiling
        if (bubble.y - bubble.radius <= this.gridOffsetY) {
            this.snapBubble(bubble);
            return true;
        }

        // Check other bubbles
        const { col, row } = this.getGridCoordinates(bubble.x, bubble.y);
        const neighbors = this.getNeighborPositions(col, row);
        neighbors.push({ col, row });

        for (const pos of neighbors) {
            const targetBubble = this.grid[pos.col][pos.row];
            if (targetBubble) {
                const dx = bubble.x - targetBubble.x;
                const dy = bubble.y - targetBubble.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < bubble.radius * 2) {
                    this.snapBubble(bubble);
                    return true;
                }
            }
        }

        return false;
    }

    snapBubble(bubble) {
        const snapPos = this.findSnapPosition(bubble.x, bubble.y);
        if (!snapPos) {
            this.gameOver = true;
            return;
        }

        const position = this.getGridPosition(snapPos.col, snapPos.row);
        bubble.x = position.x;
        bubble.y = position.y;
        bubble.stuck = true;
        bubble.row = snapPos.row;
        bubble.col = snapPos.col;
        this.grid[snapPos.col][snapPos.row] = bubble;

        // Check for matches
        const matches = this.findMatches(snapPos.col, snapPos.row, bubble.type);
        if (matches.length >= 3) {
            this.popBubbles(matches);
            this.checkFloatingBubbles();
        }

        this.createNextBubble();
    }

    findMatches(col, row, type) {
        const matches = new Set();
        const stack = [{col, row}];

        while (stack.length > 0) {
            const current = stack.pop();
            const key = `${current.col},${current.row}`;

            if (!matches.has(key) && 
                this.grid[current.col][current.row]?.type === type) {
                
                matches.add(key);
                const neighbors = this.getNeighborPositions(current.col, current.row);
                stack.push(...neighbors);
            }
        }

        return Array.from(matches).map(key => {
            const [col, row] = key.split(',').map(Number);
            return this.grid[col][row];
        });
    }

    checkFloatingBubbles() {
        const visited = new Set();
        const floating = new Set();

        // Mark all bubbles as potentially floating
        for (let col = 0; col < GRID_SETTINGS.COLS; col++) {
            for (let row = 0; row < GRID_SETTINGS.ROWS; row++) {
                if (this.grid[col][row]) {
                    floating.add(`${col},${row}`);
                }
            }
        }

        // Find bubbles connected to top
        const markConnected = (col, row) => {
            if (col < 0 || col >= GRID_SETTINGS.COLS || 
                row < 0 || row >= GRID_SETTINGS.ROWS ||
                !this.grid[col][row] ||
                visited.has(`${col},${row}`)) return;

            const key = `${col},${row}`;
            visited.add(key);
            floating.delete(key);

            const neighbors = this.getNeighborPositions(col, row);
            for (const pos of neighbors) {
                markConnected(pos.col, pos.row);
            }
        };

        // Start from top row
        for (let col = 0; col < GRID_SETTINGS.COLS; col++) {
            if (this.grid[col][0]) {
                markConnected(col, 0);
            }
        }

        // Make floating bubbles fall
        floating.forEach(key => {
            const [col, row] = key.split(',').map(Number);
            const bubble = this.grid[col][row];
            if (bubble) {
                bubble.falling = true;
                this.grid[col][row] = null;
                this.score += 50; // Bonus for floating bubbles
            }
        });
    }

    popBubbles(bubbles) {
        bubbles.forEach(bubble => {
            bubble.removing = true;
            this.grid[bubble.col][bubble.row] = null;
            this.score += 100;
        });
    }

    createNextBubble() {
        const type = Math.floor(Math.random() * GRID_SETTINGS.COLORS);
        if (!this.shooter.currentBubble) {
            this.shooter.currentBubble = new Bubble(
                this.shooter.x,
                this.shooter.y,
                type
            );
        } else {
            this.shooter.currentBubble = this.shooter.nextBubble;
        }
        
        this.shooter.nextBubble = new Bubble(
            this.shooter.x - 60,
            this.shooter.y,
            type
        );
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.gameOver) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const dx = x - this.shooter.x;
            const dy = this.shooter.y - y;
            this.shooter.angle = Math.atan2(dy, dx) * 180 / Math.PI;
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.gameOver) {
                this.restart();
                return;
            }

            if (this.shooter.currentBubble && this.shooter.currentBubble.stuck) return;

            const angle = this.shooter.angle * Math.PI / 180;
            const speed = 15;
            this.shooter.currentBubble.vx = Math.cos(angle) * speed;
            this.shooter.currentBubble.vy = -Math.sin(angle) * speed;
        });
    }

    restart() {
        this.grid = Array(GRID_SETTINGS.COLS).fill()
            .map(() => Array(GRID_SETTINGS.ROWS).fill(null));
        this.score = 0;
        this.gameOver = false;
        this.shooter.currentBubble = null;
        this.shooter.nextBubble = null;
        this.initGame();
    }

    update(timestamp) {
        const deltaTime = (timestamp - this.lastFrame) / 1000;
        this.lastFrame = timestamp;

        if (this.shooter.currentBubble && !this.shooter.currentBubble.stuck) {
            this.shooter.currentBubble.update();
            if (this.checkCollision(this.shooter.currentBubble)) {
                // Collision handled in checkCollision
            }
        }

        // Update removing/falling bubbles
        for (let col = 0; col < GRID_SETTINGS.COLS; col++) {
            for (let row = 0; row < GRID_SETTINGS.ROWS; row++) {
                const bubble = this.grid[col][row];
                if (bubble && (bubble.removing || bubble.falling)) {
                    if (bubble.update()) {
                        this.grid[col][row] = null;
                    }
                }
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid bubbles
        for (let col = 0; col < GRID_SETTINGS.COLS; col++) {
            for (let row = 0; row < GRID_SETTINGS.ROWS; row++) {
                const bubble = this.grid[col][row];
                if (bubble) {
                    bubble.draw(this.ctx);
                }
            }
        }

        // Draw shooter bubbles
        if (this.shooter.currentBubble) {
            this.shooter.currentBubble.draw(this.ctx);
        }
        if (this.shooter.nextBubble) {
            this.shooter.nextBubble.draw(this.ctx);
        }

        // Draw shooter arrow
        this.ctx.save();
        this.ctx.translate(this.shooter.x, this.shooter.y);
        this.ctx.rotate((90 - this.shooter.angle) * Math.PI / 180);
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(0, -60);
        this.ctx.strokeStyle = '#FFF';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.restore();

        // Draw UI
        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = '#FFF';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score}`, 20, 30);

        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.font = '48px Arial';
            this.ctx.fillStyle = '#FF6B6B';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over!', this.canvas.width/2, this.canvas.height/2);
            
            this.ctx.font = '24px Arial';
            this.ctx.fillStyle = '#FFF';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 40);
            this.ctx.fillText('Click to restart', this.canvas.width/2, this.canvas.height/2 + 80);
        }
    }
}

// Start the game
window.addEventListener('load', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);
    
    function gameLoop(timestamp) {
        game.update(timestamp);
        game.draw();
        requestAnimationFrame(gameLoop);
    }
    
    requestAnimationFrame(gameLoop);
});
