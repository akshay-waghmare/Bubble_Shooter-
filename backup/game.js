// Game constants
const BUBBLE_RADIUS = 25;
const BUBBLE_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];
const SHOOTER_SPEED = 8;
const GRID_ROWS = 10;
const GRID_COLS = 14;
const GRID_TOP_MARGIN = BUBBLE_RADIUS * 2;
const GRID_ROW_HEIGHT = BUBBLE_RADIUS * 1.7;
const MISSED_SHOTS_LIMIT = 5;
const POP_THRESHOLD = 3; // Number of same-colored bubbles needed to pop

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
        return distance < this.radius * 2 - 5; // Slightly smaller collision radius for better gameplay
    }
}

class Shooter {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.currentColor = this.getRandomColor();
        this.nextColor = this.getRandomColor();
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

        // Draw aim line
        if (this.angle !== 0) {
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(this.x + Math.cos(this.angle) * 150, this.y + Math.sin(this.angle) * 150);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    aimAt(mouseX, mouseY) {
        this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        // Limit angle to prevent shooting downward
        if (this.angle > Math.PI / 2) this.angle = Math.PI / 2;
        if (this.angle < -Math.PI / 2) this.angle = -Math.PI / 2;
    }

    shoot() {
        const bubble = new Bubble(this.x, this.y, this.currentColor);
        bubble.vx = Math.cos(this.angle) * SHOOTER_SPEED;
        bubble.vy = Math.sin(this.angle) * SHOOTER_SPEED;
        
        // Update colors
        this.currentColor = this.nextColor;
        this.nextColor = this.getRandomColor();
        
        return bubble;
    }
}

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.bubbles = [];
        this.shooter = new Shooter(canvas.width / 2, canvas.height - 50);
        this.mouseX = 0;
        this.mouseY = 0;
        
        this.setupEventListeners();
        this.gameLoop();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            this.shooter.aimAt(this.mouseX, this.mouseY);
        });

        this.canvas.addEventListener('click', (e) => {
            const bubble = this.shooter.shoot();
            this.bubbles.push(bubble);
        });

        // Touch support for mobile
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;
            this.shooter.aimAt(this.mouseX, this.mouseY);
        });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const bubble = this.shooter.shoot();
            this.bubbles.push(bubble);
        });
    }

    update() {
        // Update all bubbles
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const bubble = this.bubbles[i];
            bubble.update();

            // Check collision with walls
            if (bubble.x - bubble.radius <= 0 || bubble.x + bubble.radius >= this.canvas.width) {
                bubble.vx *= -0.8; // Bounce with some energy loss
                bubble.x = Math.max(bubble.radius, Math.min(this.canvas.width - bubble.radius, bubble.x));
            }

            // Check collision with top wall
            if (bubble.y - bubble.radius <= 0) {
                bubble.stuck = true;
                bubble.y = bubble.radius;
                bubble.vx = 0;
                bubble.vy = 0;
            }

            // Check collision with other bubbles
            for (let j = 0; j < this.bubbles.length; j++) {
                if (i !== j) {
                    const other = this.bubbles[j];
                    if (other.stuck && bubble.isCollidingWith(other)) {
                        bubble.stuck = true;
                        bubble.vx = 0;
                        bubble.vy = 0;
                        
                        // Simple separation to prevent overlap
                        const dx = bubble.x - other.x;
                        const dy = bubble.y - other.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const overlap = bubble.radius + other.radius - distance;
                        
                        if (overlap > 0) {
                            const moveX = (dx / distance) * overlap * 0.5;
                            const moveY = (dy / distance) * overlap * 0.5;
                            bubble.x += moveX;
                            bubble.y += moveY;
                        }
                        break;
                    }
                }
            }

            // Remove bubbles that fall off screen
            if (bubble.y > this.canvas.height + bubble.radius) {
                this.bubbles.splice(i, 1);
            }
        }
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw bubbles
        for (const bubble of this.bubbles) {
            bubble.draw(this.ctx);
        }

        // Draw shooter
        this.shooter.draw(this.ctx);

        // Draw next bubble indicator
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('Next:', this.canvas.width - 80, 30);
        
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width - 30, 40, 15, 0, Math.PI * 2);
        this.ctx.fillStyle = this.shooter.nextColor;
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const canvas = document.getElementById('gameCanvas');
    new Game(canvas);
});