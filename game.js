// Bubble Shooter Game Implementation

// Debug logging system
class DebugLogger {
    constructor(enabled = false) {
        this.enabled = enabled;
        this.collisionLog = [];
        this.frameCount = 0;
        this.performanceMetrics = {
            avgFrameTime: 0,
            collisionChecks: 0,
            gridSnaps: 0
        };
    }

    log(category, message, data = null) {
        if (!this.enabled) return;
        const timestamp = performance.now();
        const logEntry = {
            timestamp,
            frame: this.frameCount,
            category,
            message,
            data
        };
        
        console.log(`[${category.toUpperCase()}] Frame ${this.frameCount}: ${message}`, data || '');
        
        // Store specific logs for analysis
        if (category === 'collision') {
            this.collisionLog.push(logEntry);
            if (this.collisionLog.length > 100) {
                this.collisionLog.shift(); // Keep only last 100 collision events
            }
        }
    }

    updateMetrics(frameTime, collisionChecks, gridSnaps) {
        this.performanceMetrics.avgFrameTime = (this.performanceMetrics.avgFrameTime * 0.9) + (frameTime * 0.1);
        this.performanceMetrics.collisionChecks += collisionChecks;
        this.performanceMetrics.gridSnaps += gridSnaps;
    }

    nextFrame() {
        this.frameCount++;
    }

    getReport() {
        return {
            frame: this.frameCount,
            ...this.performanceMetrics,
            recentCollisions: this.collisionLog.slice(-10)
        };
    }
}

// Enhanced collision prediction system
class CollisionPredictor {
    constructor() {
        this.predictionSteps = 10; // Number of steps to predict ahead
        this.timeStep = 1/60; // Assuming 60 FPS
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
                vx *= -0.95; // Energy loss on bounce
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
        const GRID_ROW_HEIGHT = radius * Math.sqrt(3);
        const GRID_COL_SPACING = radius * 2;
        const GRID_TOP_MARGIN = radius * 2;

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
                    
                    if (distance < (radius + gridBubble.radius) * 0.98) {
                        return { bubble: gridBubble, distance, row, col };
                    }
                }
            }
        }
        return null;
    }
}

// Game constants
const BUBBLE_RADIUS = 20;
const BUBBLE_COLORS = ['#FF6B6B', '#4ECDC4', '#1E3A8A', '#00FF88', '#FECA57', '#FF9FF3'];
const SHOOTER_SPEED = 35;
const GRID_ROWS = 10;
const GRID_COLS = 14;
const GRID_TOP_MARGIN = BUBBLE_RADIUS * 2;

// Perfect hexagonal grid constants using mathematical precision
const GRID_COL_SPACING = BUBBLE_RADIUS * 2; // Exact bubble diameter for perfect horizontal spacing
const GRID_ROW_HEIGHT = BUBBLE_RADIUS * Math.sqrt(3); // Perfect hexagonal row height (√3 * radius)
const HEX_OFFSET = BUBBLE_RADIUS; // Exact offset for odd rows in hexagonal pattern

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
        
        // Enhanced collision properties
        this.lastCollisionTime = 0;
        this.collisionCount = 0;
        this.snapPredicted = false; // Flag for predicted snapping
        
        // Enhanced animation properties
        this.scale = 1.0;
        this.opacity = 1.0;
        this.pulsePhase = Math.random() * Math.PI * 2; // Random pulse phase
        this.creationTime = performance.now();
        this.wobbleAmplitude = 0;
        this.wobbleFrequency = 5;
        this.glowIntensity = 0;
        
        // Trail effect for flying bubbles
        this.trail = [];
        this.maxTrailLength = 8;
        
        // DEBUG: Log every bubble creation with stack trace
        console.log('BUBBLE CREATED:', {
            position: { x: this.x, y: this.y },
            color: this.color,
            gridPos: { row: this.row, col: this.col },
            stuck: this.stuck,
            velocity: { vx: this.vx, vy: this.vy },
            stackTrace: new Error().stack
        });
    }

    draw(ctx) {
        // Update trail for flying bubbles
        if (!this.stuck && !this.removing && !this.falling) {
            this.trail.push({ x: this.x, y: this.y, opacity: 1.0 });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
            
            // Draw trail
            for (let i = 0; i < this.trail.length; i++) {
                const trailPoint = this.trail[i];
                const trailOpacity = (i / this.trail.length) * 0.3;
                const trailRadius = this.radius * (0.3 + (i / this.trail.length) * 0.7);
                
                ctx.beginPath();
                ctx.arc(trailPoint.x, trailPoint.y, trailRadius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${trailOpacity})`;
                ctx.fill();
            }
        }
        
        if (this.removing) {
            // Enhanced pop animation with particle effects
            const animationProgress = (this.animationTimer || 0) / 30;
            const scale = 1 + animationProgress * 1.2;
            const alpha = 1 - animationProgress;
            
            // Main explosion effect
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * scale, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
            ctx.fill();
            
            // Particle effects
            const particleCount = 8;
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2;
                const distance = animationProgress * 40;
                const particleX = this.x + Math.cos(angle) * distance;
                const particleY = this.y + Math.sin(angle) * distance;
                const particleSize = this.radius * 0.2 * (1 - animationProgress);
                
                ctx.beginPath();
                ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.8})`;
                ctx.fill();
            }
            return;
        }

        // Apply wobble effect for newly placed bubbles
        const timeSinceCreation = performance.now() - this.creationTime;
        if (timeSinceCreation < 500 && this.stuck) {
            this.wobbleAmplitude = Math.max(0, 3 * (1 - timeSinceCreation / 500));
        }
        
        // Calculate wobble offset
        const wobbleX = Math.sin(performance.now() * 0.01 * this.wobbleFrequency) * this.wobbleAmplitude;
        const wobbleY = Math.cos(performance.now() * 0.01 * this.wobbleFrequency) * this.wobbleAmplitude * 0.5;
        
        // Apply pulse effect
        const pulseScale = 1 + Math.sin(this.pulsePhase + performance.now() * 0.003) * 0.05;
        
        ctx.save();
        ctx.translate(this.x + wobbleX, this.y + wobbleY);
        ctx.scale(pulseScale * this.scale, pulseScale * this.scale);

        // Enhanced glow effect
        if (this.glowIntensity > 0) {
            const glowRadius = this.radius + this.glowIntensity * 10;
            const glowGradient = ctx.createRadialGradient(0, 0, this.radius, 0, 0, glowRadius);
            glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            glowGradient.addColorStop(1, `rgba(255, 255, 255, ${this.glowIntensity * 0.3})`);
            
            ctx.beginPath();
            ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
            ctx.fillStyle = glowGradient;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        
        // Enhanced gradient system for all colors
        const gradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, this.radius);
        const baseColor = this.color;
        
        // Create lighter and darker variants
        const lightColor = this.lightenColor(baseColor, 0.3);
        const darkColor = this.darkenColor(baseColor, 0.2);
        
        gradient.addColorStop(0, lightColor);
        gradient.addColorStop(0.7, baseColor);
        gradient.addColorStop(1, darkColor);
        
        ctx.fillStyle = gradient;
        ctx.globalAlpha = this.opacity;
        ctx.fill();
        
        // Enhanced border with depth
        ctx.strokeStyle = this.darkenColor(baseColor, 0.4);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Multiple highlight layers for depth
        ctx.beginPath();
        ctx.arc(-6, -6, this.radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(-3, -3, this.radius * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();

        // Enhanced visual feedback for predicted snap
        if (this.snapPredicted && !this.stuck) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Add prediction glow
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.lineWidth = 6;
            ctx.stroke();
        }
        
        ctx.restore();
    }

    // Helper methods for color manipulation
    lightenColor(color, factor) {
        const hex = color.replace('#', '');
        const r = Math.min(255, Math.floor(parseInt(hex.substr(0, 2), 16) * (1 + factor)));
        const g = Math.min(255, Math.floor(parseInt(hex.substr(2, 2), 16) * (1 + factor)));
        const b = Math.min(255, Math.floor(parseInt(hex.substr(4, 2), 16) * (1 + factor)));
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    darkenColor(color, factor) {
        const hex = color.replace('#', '');
        const r = Math.floor(parseInt(hex.substr(0, 2), 16) * (1 - factor));
        const g = Math.floor(parseInt(hex.substr(2, 2), 16) * (1 - factor));
        const b = Math.floor(parseInt(hex.substr(4, 2), 16) * (1 - factor));
        return `rgb(${r}, ${g}, ${b})`;
    }

    update() {
        if (this.removing) {
            return;
        }
        
        if (this.falling) {
            this.vy += 0.8; // Increase falling speed for smoother gameplay
            this.y += this.vy;
            
            // Add rotation and scale effect while falling
            this.pulsePhase += 0.2;
            this.scale = Math.max(0.1, this.scale - 0.02);
            this.opacity = Math.max(0, this.opacity - 0.03);
            return;
        }

        if (!this.stuck) {
            this.x += this.vx;
            this.y += this.vy;
            
            // Add dynamic glow effect for flying bubbles
            this.glowIntensity = 0.5 + Math.sin(performance.now() * 0.01) * 0.3;
        } else {
            // Reduce glow for stuck bubbles
            this.glowIntensity = Math.max(0, this.glowIntensity - 0.02);
        }
    }

    isCollidingWith(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Enhanced collision detection with improved precision
        const collisionDistance = (this.radius + other.radius) * 0.98;
        const isColliding = distance < collisionDistance;
        
        if (isColliding) {
            this.lastCollisionTime = performance.now();
            this.collisionCount++;
        }
        
        return isColliding;
    }

    // Enhanced method for smooth collision response
    handleCollisionWith(other, restitution = 0.8) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return; // Avoid division by zero
        
        // Normalize collision vector
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Calculate relative velocity
        const rvx = this.vx - (other.vx || 0);
        const rvy = this.vy - (other.vy || 0);
        
        // Calculate relative velocity in collision normal direction
        const speed = rvx * nx + rvy * ny;
        
        // Do not resolve if velocities are separating
        if (speed > 0) return;
        
        // Apply restitution (bounciness)
        const impulse = restitution * speed;
        this.vx -= impulse * nx;
        this.vy -= impulse * ny;
        
        // Separate overlapping bubbles
        const overlap = (this.radius + other.radius) - distance;
        if (overlap > 0) {
            this.x += nx * overlap * 0.5;
            this.y += ny * overlap * 0.5;
        }
    }
}

class Shooter {
    constructor(x, y) {
        console.log('SHOOTER CREATED:', { x, y });
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.currentColor = this.getRandomColor();
        this.nextColor = this.getRandomColor();
        this.reloadTime = 300; // ms
        this.lastShot = 0;
        console.log('Shooter colors initialized:', { current: this.currentColor, next: this.nextColor });
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
        if (this.canShoot()) {
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
                const distToWall = Math.abs(x - BUBBLE_RADIUS);
                const timeToWall = distToWall / Math.abs(Math.cos(currentAngle) * SHOOTER_SPEED);
                const yAtWall = y + Math.sin(currentAngle) * SHOOTER_SPEED * timeToWall;
                
                ctx.lineTo(BUBBLE_RADIUS, yAtWall);
                x = BUBBLE_RADIUS;
                y = yAtWall;
                currentAngle = Math.PI - currentAngle; // Reflect angle
                remainingLength -= distToWall;
            } else if (nextX > ctx.canvas.width - BUBBLE_RADIUS) {
                // Hit right wall
                const distToWall = ctx.canvas.width - BUBBLE_RADIUS - x;
                const timeToWall = distToWall / Math.abs(Math.cos(currentAngle) * SHOOTER_SPEED);
                const yAtWall = y + Math.sin(currentAngle) * SHOOTER_SPEED * timeToWall;
                
                ctx.lineTo(ctx.canvas.width - BUBBLE_RADIUS, yAtWall);
                x = ctx.canvas.width - BUBBLE_RADIUS;
                y = yAtWall;
                currentAngle = Math.PI - currentAngle; // Reflect angle
                remainingLength -= distToWall;
            } else {
                // No wall collision
                ctx.lineTo(nextX, nextY);
                remainingLength = 0;
            }
        }
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; // More visible aim line
        ctx.lineWidth = 3; // Thicker line for better visibility
        ctx.stroke();
        ctx.setLineDash([]);
    }

    aimAt(mouseX, mouseY) {
        // Calculate relative position
        const deltaX = mouseX - this.x;
        const deltaY = mouseY - this.y;
        
        // Calculate the basic angle from shooter to mouse
        let angle = Math.atan2(deltaY, deltaX);
        
        // Convert any angle to the upward shooting range (-PI to 0)
        // This ensures we can aim anywhere from left to right but only shoot upward
        
        if (angle > Math.PI / 2) {
            // Bottom right quadrant -> map to top left
            angle = angle - Math.PI;
        } else if (angle > 0) {
            // Bottom left quadrant -> map to top right  
            angle = -angle;
        }
        // Top quadrants (angle <= 0) are already in correct range
        
        // Clamp to valid upward shooting range (-PI to 0)
        this.angle = Math.max(-Math.PI, Math.min(0, angle));
    }

    canShoot() {
        const now = Date.now();
        return now - this.lastShot >= this.reloadTime;
    }

    shoot() {
        if (!this.canShoot()) return null;
        
        console.log('SHOOTER SHOOTING - creating new bubble');
        
        this.lastShot = Date.now();
        
        const bubble = new Bubble(this.x, this.y, this.currentColor);
        bubble.vx = Math.cos(this.angle) * SHOOTER_SPEED;
        bubble.vy = Math.sin(this.angle) * SHOOTER_SPEED;
        
        console.log('Shot bubble created:', { 
            x: bubble.x, y: bubble.y, 
            vx: bubble.vx, vy: bubble.vy, 
            color: bubble.color,
            stuck: bubble.stuck
        });
        
        // Update colors
        this.currentColor = this.nextColor;
        this.nextColor = this.getRandomColor();
        
        return bubble;
    }

    update() {
        // No longer needed, but keeping for consistency
    }
}

class Game {
    constructor(canvas) {
        console.log('=== GAME CONSTRUCTOR START ===');
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Set initial canvas dimensions for portrait mobile
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const maxWidth = Math.min(viewportWidth - 20, 400);
        const portraitHeight = Math.min(viewportHeight - 100, maxWidth * 1.6);
        
        canvas.width = maxWidth;
        canvas.height = portraitHeight;
        
        console.log('Canvas dimensions set:', { width: canvas.width, height: canvas.height });
        
        this.gridBubbles = []; // 2D array representing the grid of bubbles
        this.flyingBubbles = []; // Bubbles that are currently moving
        this.removingBubbles = []; // Bubbles that are being removed
        this.fallingBubbles = []; // Bubbles that are falling
        
        console.log('Bubble arrays initialized');
        
        // Initialize shooter as null - will be created in resizeCanvas
        this.shooter = null;
        
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
        this.lastTime = 0; // For smooth frame rate control
        this.difficultySettings = {
            novice: { rowsToStart: 3, colors: 3, addRowFrequency: 10 },
            easy: { rowsToStart: 4, colors: 4, addRowFrequency: 8 },
            medium: { rowsToStart: 5, colors: 5, addRowFrequency: 6 },
            hard: { rowsToStart: 6, colors: 6, addRowFrequency: 4 },
            master: { rowsToStart: 7, colors: 6, addRowFrequency: 3 }
        };
        
        this.gameStarted = false; // Track if game has been started
        this.showDebugGrid = false; // Debug mode to show hexagonal grid
        
        // CRITICAL: Add flag to prevent game loop from processing during initialization
        this.initializing = true;
        
        // CRITICAL: Add flag to prevent duplicate event listeners
        this.eventListenersAttached = false;
        
        // CRITICAL: Add timestamp to prevent immediate shooting after game start
        this.gameStartTime = 0;
        this.shootingDelay = 500; // 500ms delay after game start before allowing shooting
        
        // Fix for collision detection timing issue
        this.pendingNewRow = false; // Flag to defer addNewRow() until after flying bubble processing
        
        // Enhanced debug and collision systems
        this.debugLogger = new DebugLogger(false); // Enable with 'D' key
        this.collisionPredictor = new CollisionPredictor();
        this.frameStartTime = 0;
        this.collisionChecksThisFrame = 0;
        this.gridSnapsThisFrame = 0;
        this.showDebugInfo = false; // Toggle with 'I' key
        
        // Enhanced collision settings
        this.collisionSettings = {
            precisionFactor: 0.98, // Tighter collision detection
            wallBounceRestitution: 0.95, // Energy retention on wall bounce
            snapDistance: BUBBLE_RADIUS * 2.05, // Distance for proximity snapping
            predictionSteps: 10, // Steps ahead for collision prediction
            smoothingFactor: 0.1 // For velocity smoothing
        };
        
        // Score buckets system
        this.scoreBuckets = [
            { x: 0, width: 0, score: 100, color: '#4ECDC4', label: '100' },
            { x: 0, width: 0, score: 200, color: '#45B7D1', label: '200' },
            { x: 0, width: 0, score: 300, color: '#FF6B6B', label: '300' }
        ];
        this.finishLineY = 0; // Will be set in resizeCanvas
    
        console.log('=== CALLING setupEventListeners ===');
        this.setupEventListeners(); // This calls resizeCanvas which creates the shooter
        
        console.log('=== CALLING initGame ===');
        this.initGame(); // Initialize the game grid and basic setup
        
        // CRITICAL: Mark initialization as complete
        this.initializing = false;
        console.log('=== INITIALIZATION COMPLETE ===');
        
        console.log('=== STARTING gameLoop ===');
        this.gameLoop(); // Start the rendering loop
        
        console.log('=== GAME CONSTRUCTOR END ===');
        console.log('Final bubble counts:', {
            gridBubbles: this.gridBubbles.flat().filter(b => b !== null).length,
            flyingBubbles: this.flyingBubbles.length,
            fallingBubbles: this.fallingBubbles.length,
            removingBubbles: this.removingBubbles.length
        });
    }
    
    start() {
        this.resizeCanvas(); // Ensure proper sizing before starting
        this.gameStarted = true; // Mark game as started
        this.gameStartTime = Date.now(); // Record when game started
        console.log('Game started at:', this.gameStartTime);
        // Game loop is already running from constructor
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
        console.log('=== INIT GAME START ===');
        
        this.gridBubbles = [];
        this.flyingBubbles = [];
        this.removingBubbles = [];
        this.fallingBubbles = [];
        this.score = 0;
        this.missedShots = 0;
        this.gameOver = false;
        this.gameWon = false;
        
        console.log('Arrays cleared, bubble counts:', {
            flyingBubbles: this.flyingBubbles.length,
            fallingBubbles: this.fallingBubbles.length,
            removingBubbles: this.removingBubbles.length
        });
        
        // Reset collision timing fix flag
        this.pendingNewRow = false;
        
        // Initialize grid
        for (let row = 0; row < GRID_ROWS; row++) {
            this.gridBubbles[row] = [];
            for (let col = 0; col < GRID_COLS; col++) {
                this.gridBubbles[row][col] = null;
            }
        }
        
        console.log('Grid initialized');
        
        // Create initial bubble grid based on difficulty
        const settings = this.difficultySettings[this.difficulty];
        const colorSubset = BUBBLE_COLORS.slice(0, settings.colors);
        
        console.log('Creating initial bubbles with settings:', settings);
        
        // Calculate maximum bubbles that can fit in the grid based on canvas width
        const maxBubblesPerRow = Math.floor((this.canvas.width - BUBBLE_RADIUS * 2) / GRID_COL_SPACING);
        const effectiveGridCols = Math.min(GRID_COLS, maxBubblesPerRow);
        
        console.log('Grid calculations:', { maxBubblesPerRow, effectiveGridCols });
        
        let bubblesCreated = 0;
        for (let row = 0; row < settings.rowsToStart; row++) {
            for (let col = 0; col < effectiveGridCols; col++) {
                // Skip some bubbles randomly for aesthetic reasons and to create more interesting patterns
                if (Math.random() < 0.85) {
                    const x = this.getColPosition(row, col);
                    const y = this.getRowPosition(row);
                    
                    // Ensure we don't place bubbles too close to the edge or overlapping
                    if (x < BUBBLE_RADIUS || x > this.canvas.width - BUBBLE_RADIUS) {
                        console.log('Skipping bubble due to edge constraint:', { row, col, x });
                        continue;
                    }
                    // Use wouldOverlapPrecise for robust overlap prevention
                    if (this.wouldOverlapPrecise(x, y, row, col)) {
                        console.log('Skipping bubble due to overlap:', { row, col, x, y });
                        continue;
                    }
                    
                    // Create color clusters for more strategic gameplay
                    let color;
                    if (row > 0 && col > 0 && this.gridBubbles[row-1][col] && Math.random() < 0.6) {
                        color = this.gridBubbles[row-1][col].color;
                    } else if (col > 0 && this.gridBubbles[row][col-1] && Math.random() < 0.4) {
                        color = this.gridBubbles[row][col-1].color;
                    } else {
                        color = colorSubset[Math.floor(Math.random() * colorSubset.length)];
                    }
                    
                    console.log('Creating grid bubble:', { row, col, x, y, color });
                    const bubble = new Bubble(x, y, color, row, col);
                    // CRITICAL FIX: Set stuck=true IMMEDIATELY after creation, before any other operations
                    bubble.stuck = true;
                    bubble.vx = 0; // Ensure no velocity
                    bubble.vy = 0; // Ensure no velocity
                    this.gridBubbles[row][col] = bubble;
                    this.totalBubbles++;
                    bubblesCreated++;
                }
            }
        }
        
        console.log('Grid bubbles created:', bubblesCreated);

        // Set up game mode specifics
        if (this.gameMode === "strategy") {
            this.shotsLeft = 30; // Limited shots for strategy mode
        } else if (this.gameMode === "arcade") {
            this.timeLeft = 120; // 2 minutes for arcade mode
        }
        
        console.log('=== INIT GAME END ===');
        console.log('Final bubble counts after initGame:', {
            gridBubbles: this.gridBubbles.flat().filter(b => b !== null).length,
            flyingBubbles: this.flyingBubbles.length,
            fallingBubbles: this.fallingBubbles.length,
            removingBubbles: this.removingBubbles.length
        });
    }

    getColPosition(row, col) {
        // Perfect hexagonal grid positioning
        const isOddRow = row % 2 === 1;
        const baseX = col * GRID_COL_SPACING + BUBBLE_RADIUS;
        
        // For odd rows, offset by exactly half the column spacing for perfect hexagonal alignment
        const offsetX = isOddRow ? HEX_OFFSET : 0;
        
        return baseX + offsetX;
    }

    getRowPosition(row) {
        // Perfect vertical spacing using √3 * radius for true hexagonal geometry
        return row * GRID_ROW_HEIGHT + GRID_TOP_MARGIN;
    }

    setupEventListeners() {
        // Add resize handler for responsive canvas sizing
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
        
        // Initial resize to ensure proper dimensions
        this.resizeCanvas();
        
        // CRITICAL: Only attach these listeners once and with proper checks
        if (!this.eventListenersAttached) {
            this.eventListenersAttached = true;
            
            // Use document for mouse movement to ensure full canvas coverage
            document.addEventListener('mousemove', (e) => {
                if (!this.gameStarted || this.gameOver || this.gameWon || !this.shooter || this.initializing) return;
                const rect = this.canvas.getBoundingClientRect();
                this.mouseX = e.clientX - rect.left;
                this.mouseY = e.clientY - rect.top;
                this.shooter.aimAt(this.mouseX, this.mouseY);
            });

            document.addEventListener('click', (e) => {
                if (!this.gameStarted || !this.shooter || this.initializing) return;
                
                // CRITICAL: Check if enough time has passed since game start to prevent accidental shooting
                const timeSinceStart = Date.now() - this.gameStartTime;
                if (timeSinceStart < this.shootingDelay) {
                    console.log('Shooting blocked - too soon after game start:', { timeSinceStart, delay: this.shootingDelay });
                    return;
                }
                
                if (this.gameOver || this.gameWon) {
                    // Restart the game if it's over
                    this.restartGame();
                    return;
                }

                // Only handle clicks when the canvas is clicked
                const rect = this.canvas.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                
                // CRITICAL: Add bounds checking and prevent shooting during initialization
                if (clickX >= 0 && clickX <= this.canvas.width && 
                    clickY >= 0 && clickY <= this.canvas.height &&
                    !this.initializing) {
                    
                    console.log('User clicked to shoot at:', { clickX, clickY, timeSinceStart });
                    const bubble = this.shooter.shoot();
                    if (bubble) {
                        console.log('Bubble shot created by user click');
                        this.playSound('shoot');
                        this.flyingBubbles.push(bubble);
                        if (this.gameMode === "strategy") {
                            this.shotsLeft--;
                            if (this.shotsLeft <= 0) {
                                this.gameOver = true;
                            }
                        }
                    }
                }
            });

            // Keyboard controls for debug features
            document.addEventListener('keydown', (e) => {
                const key = e.key.toLowerCase();
                
                switch (key) {
                    case 'g':
                        this.showDebugGrid = !this.showDebugGrid;
                        this.debugLogger.log('debug', 'Toggled debug grid', { enabled: this.showDebugGrid });
                        break;
                        
                    case 'd':
                        this.debugLogger.enabled = !this.debugLogger.enabled;
                        console.log(`Debug logging ${this.debugLogger.enabled ? 'ENABLED' : 'DISABLED'}`);
                        this.debugLogger.log('debug', 'Toggled debug logging', { enabled: this.debugLogger.enabled });
                        break;
                        
                    case 'i':
                        this.showDebugInfo = !this.showDebugInfo;
                        this.debugLogger.log('debug', 'Toggled debug info display', { enabled: this.showDebugInfo });
                        break;
                        
                    case 'r':
                        if (this.debugLogger.enabled) {
                            console.log('Performance Report:', this.debugLogger.getReport());
                        }
                        break;
                        
                    case 'c':
                        if (this.debugLogger.enabled) {
                            this.debugLogger.collisionLog = [];
                            console.log('Cleared collision log');
                        }
                        break;
                        
                    case 'p':
                        // Toggle collision prediction visualization
                        this.showCollisionPrediction = !this.showCollisionPrediction;
                        this.debugLogger.log('debug', 'Toggled collision prediction', { enabled: this.showCollisionPrediction });
                        break;
                }
            });

            // Touch support for mobile
            document.addEventListener('touchmove', (e) => {
                if (!this.gameStarted || this.gameOver || this.gameWon || !this.shooter || this.initializing) return;
                e.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                const touch = e.touches[0];
                this.mouseX = touch.clientX - rect.left;
                this.mouseY = touch.clientY - rect.top;
                this.shooter.aimAt(this.mouseX, this.mouseY);
            }, { passive: false });

            document.addEventListener('touchstart', (e) => {
                if (!this.gameStarted || !this.shooter || this.initializing) return;
                
                // CRITICAL: Check if enough time has passed since game start to prevent accidental shooting
                const timeSinceStart = Date.now() - this.gameStartTime;
                if (timeSinceStart < this.shootingDelay) {
                    console.log('Touch shooting blocked - too soon after game start:', { timeSinceStart, delay: this.shootingDelay });
                    return;
                }
                
                if (this.gameOver || this.gameWon) {
                    // Restart the game if it's over
                    this.restartGame();
                    return;
                }

                e.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                const touch = e.touches[0];
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;
                
                // CRITICAL: Add bounds checking and prevent shooting during initialization
                if (touchX >= 0 && touchX <= this.canvas.width && 
                    touchY >= 0 && touchY <= this.canvas.height &&
                    !this.initializing) {
                    
                    console.log('User touched to shoot at:', { touchX, touchY, timeSinceStart });
                    const bubble = this.shooter.shoot();
                    if (bubble) {
                        console.log('Bubble shot created by user touch');
                        this.playSound('shoot');
                        this.flyingBubbles.push(bubble);
                        if (this.gameMode === "strategy") {
                            this.shotsLeft--;
                            if (this.shotsLeft <= 0) {
                                this.gameOver = true;
                            }
                        }
                    }
                }
            }, { passive: false });
        }
    }

    restartGame() {
        this.initGame();
        this.gameStarted = true; // Ensure game is marked as started
        this.gameStartTime = Date.now(); // Reset the start time for shooting delay
        console.log('Game restarted at:', this.gameStartTime);
        // The game loop should already be running, no need to start it again
    }

    playSound(type) {
        if (!this.soundEnabled) return;
        // Sound effects would be implemented here
    }

    resizeCanvas() {
        console.log('=== RESIZE CANVAS START ===');
        
        // Portrait mobile resolution setup
        const container = this.canvas.parentElement;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Set canvas for portrait mobile (9:16 aspect ratio)
        const maxWidth = Math.min(viewportWidth - 20, 400); // Max 400px width with 20px margin
        const portraitHeight = Math.min(viewportHeight - 100, maxWidth * 1.6); // 16:10 ratio for better gameplay
        
        this.canvas.width = maxWidth;
        this.canvas.height = portraitHeight;
        
        console.log('Canvas resized to:', { width: this.canvas.width, height: this.canvas.height });
        
        // Adjust bubble positioning based on canvas size
        const scaleFactor = this.canvas.width / (GRID_COLS * GRID_COL_SPACING + BUBBLE_RADIUS * 2);
        
        // Set finish line position (above the shooter area)
        this.finishLineY = this.canvas.height - 80;
        console.log('Finish line Y set to:', this.finishLineY);
        
        // Calculate score bucket dimensions and positions
        const bucketHeight = 40;
        const bucketWidth = this.canvas.width / 3;
        
        for (let i = 0; i < this.scoreBuckets.length; i++) {
            this.scoreBuckets[i].x = i * bucketWidth;
            this.scoreBuckets[i].width = bucketWidth;
            this.scoreBuckets[i].y = this.canvas.height - bucketHeight;
            this.scoreBuckets[i].height = bucketHeight;
        }
        
        // Create or reposition the shooter (above the buckets)
        if (this.shooter) {
            console.log('Repositioning existing shooter');
            this.shooter.x = this.canvas.width / 2;
            this.shooter.y = this.finishLineY - 20;
        } else {
            console.log('Creating new shooter at:', { x: this.canvas.width / 2, y: this.finishLineY - 20 });
            this.shooter = new Shooter(this.canvas.width / 2, this.finishLineY - 20);
        }
        
        console.log('=== RESIZE CANVAS END ===');
    }

    update() {
        // CRITICAL: Don't process anything during initialization
        if (this.initializing) {
            return;
        }
        
        if (this.gameOver || this.gameWon) return;
        
        this.frameStartTime = performance.now();
        this.collisionChecksThisFrame = 0;
        this.gridSnapsThisFrame = 0;
        
        // Debug: Log flying bubbles count each frame
        if (this.flyingBubbles.length > 0) {
            console.log('Flying bubbles in update:', this.flyingBubbles.length, this.flyingBubbles.map(b => ({
                x: b.x, y: b.y, vx: b.vx, vy: b.vy, stuck: b.stuck
            })));
        }
        
        // Only update shooter and game logic if game has started and shooter exists
        if (this.gameStarted && this.shooter) {
            this.shooter.update();
            
            // Update arcade mode timer
            if (this.gameMode === "arcade") {
                this.timeLeft -= 1/60; // Assuming 60 FPS
                if (this.timeLeft <= 0) {
                    this.gameOver = true;
                    this.debugLogger.log('game', 'Game over - time expired');
                    return;
                }
            }
        }
        
        // Enhanced flying bubble update with improved collision detection
        for (let i = this.flyingBubbles.length - 1; i >= 0; i--) {
            const bubble = this.flyingBubbles[i];
            const oldX = bubble.x;
            const oldY = bubble.y;
            
            bubble.update();
            this.debugLogger.log('movement', `Flying bubble ${i}`, {
                position: { x: bubble.x, y: bubble.y },
                velocity: { vx: bubble.vx, vy: bubble.vy }
            });

            // Enhanced wall collision with improved physics
            let wallBounced = false;
            if (bubble.x - bubble.radius <= 0) {
                bubble.vx = Math.abs(bubble.vx) * this.collisionSettings.wallBounceRestitution;
                bubble.x = bubble.radius;
                wallBounced = true;
                this.debugLogger.log('collision', 'Wall bounce - left wall', { 
                    position: { x: bubble.x, y: bubble.y },
                    newVelocity: { vx: bubble.vx, vy: bubble.vy }
                });
            } else if (bubble.x + bubble.radius >= this.canvas.width) {
                bubble.vx = -Math.abs(bubble.vx) * this.collisionSettings.wallBounceRestitution;
                bubble.x = this.canvas.width - bubble.radius;
                wallBounced = true;
                this.debugLogger.log('collision', 'Wall bounce - right wall', { 
                    position: { x: bubble.x, y: bubble.y },
                    newVelocity: { vx: bubble.vx, vy: bubble.vy }
                });
            }
            
            if (wallBounced) {
                this.playSound('bounce');
            }

            // Check collision with top wall
            if (bubble.y - bubble.radius <= 0) {
                this.debugLogger.log('collision', 'Top wall collision - snapping to grid', {
                    position: { x: bubble.x, y: bubble.y }
                });
                this.snapBubbleToGrid(bubble);
                this.flyingBubbles.splice(i, 1);
                continue;
            }

            // Enhanced collision prediction for better gameplay feel
            if (this.showCollisionPrediction) {
                const predictions = this.collisionPredictor.predictCollision(
                    bubble, this.gridBubbles, this.canvas.width, this.canvas.height
                );
                
                if (predictions.length > 0) {
                    bubble.snapPredicted = true;
                    this.debugLogger.log('prediction', 'Collision predicted', {
                        predictions: predictions.slice(0, 3) // Log first 3 predictions
                    });
                }
            }

            // Optimized collision detection with spatial partitioning
            let collided = false;
            this.collisionChecksThisFrame++;
            
            // Calculate grid region for more efficient collision checking
            const approximateRow = Math.round((bubble.y - GRID_TOP_MARGIN) / GRID_ROW_HEIGHT);
            const approximateCol = Math.round((bubble.x - BUBBLE_RADIUS) / GRID_COL_SPACING);
            
            // Expand search area based on bubble velocity for fast-moving bubbles
            const velocityMagnitude = Math.sqrt(bubble.vx * bubble.vx + bubble.vy * bubble.vy);
            const searchRadius = Math.max(1, Math.ceil(velocityMagnitude / BUBBLE_RADIUS));
            
            const rowsToCheck = [];
            for (let r = Math.max(0, approximateRow - searchRadius); 
                 r <= Math.min(GRID_ROWS - 1, approximateRow + searchRadius); r++) {
                rowsToCheck.push(r);
            }
            
            for (const row of rowsToCheck) {
                if (row < 0 || row >= GRID_ROWS) continue;
                
                // Enhanced column range for hexagonal offset
                const colStart = Math.max(0, approximateCol - searchRadius - 1);
                const colEnd = Math.min(GRID_COLS - 1, approximateCol + searchRadius + 1);
                
                for (let col = colStart; col <= colEnd; col++) {
                    const gridBubble = this.gridBubbles[row][col];
                    if (gridBubble && bubble.isCollidingWith(gridBubble)) {
                        this.debugLogger.log('collision', 'Grid bubble collision detected', {
                            flyingBubble: { x: bubble.x, y: bubble.y, color: bubble.color },
                            gridBubble: { x: gridBubble.x, y: gridBubble.y, color: gridBubble.color, row, col },
                            distance: Math.sqrt((bubble.x - gridBubble.x) ** 2 + (bubble.y - gridBubble.y) ** 2)
                        });
                        
                        // Enhanced collision response with smoother physics
                        bubble.handleCollisionWith(gridBubble, 0.2);
                        
                        this.snapBubbleToGrid(bubble);
                        this.flyingBubbles.splice(i, 1);
                        collided = true;
                        break;
                    }
                }
                if (collided) break;
            }
            
            // Enhanced proximity-based snapping with better prediction
            if (!collided) {
                const snapDistance = this.collisionSettings.snapDistance;
                
                // Check for nearby bubbles for smoother snapping experience
                for (let row = 0; row < GRID_ROWS && !collided; row++) {
                    for (let col = 0; col < GRID_COLS; col++) {
                        const gridBubble = this.gridBubbles[row][col];
                        if (gridBubble) {
                            const dx = bubble.x - gridBubble.x;
                            const dy = bubble.y - gridBubble.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            // Enhanced proximity check with velocity consideration
                            const velocityAdjustedSnapDistance = snapDistance + (velocityMagnitude * 0.1);
                            
                            if (distance < velocityAdjustedSnapDistance) {
                                this.debugLogger.log('collision', 'Proximity snap triggered', {
                                    distance,
                                    snapDistance: velocityAdjustedSnapDistance,
                                    velocity: velocityMagnitude
                                });
                                
                                this.snapBubbleToGrid(bubble);
                                this.flyingBubbles.splice(i, 1);
                                collided = true;
                                break;
                            }
                        }
                    }
                }
            }
        }

        // Handle deferred new row addition after all flying bubble processing is complete
        if (this.pendingNewRow) {
            this.debugLogger.log('game', 'Processing deferred new row addition');
            this.addNewRow();
            this.missedShots = 0;
            this.pendingNewRow = false;
        }

        // Update falling bubbles with enhanced physics and bucket collision
        for (let i = this.fallingBubbles.length - 1; i >= 0; i--) {
            const bubble = this.fallingBubbles[i];
            const oldY = bubble.y;
            bubble.update();
            
            this.debugLogger.log('movement', `Falling bubble ${i}`, {
                position: { x: bubble.x, y: bubble.y },
                velocity: bubble.vy,
                acceleration: 0.8
            });

            // Check for bucket collisions
            let bucketHit = false;
            for (const bucket of this.scoreBuckets) {
                if (bubble.x >= bucket.x && 
                    bubble.x <= bucket.x + bucket.width && 
                    bubble.y + bubble.radius >= bucket.y) {
                    
                    // Award bucket points
                    this.score += bucket.score;
                    bucketHit = true;
                    
                    this.debugLogger.log('score', 'Bucket hit!', {
                        bucket: bucket.label,
                        points: bucket.score,
                        newScore: this.score,
                        bubblePosition: { x: bubble.x, y: bubble.y }
                    });
                    
                    this.playSound('bucket');
                    break;
                }
            }

            // Remove bubbles that hit buckets or fall off screen
            if (bucketHit || bubble.y > this.canvas.height + bubble.radius) {
                this.fallingBubbles.splice(i, 1);
                this.debugLogger.log('cleanup', bucketHit ? 'Bubble hit bucket' : 'Falling bubble removed from screen');
            }
        }

        // Update removing bubbles with smooth animation
        for (let i = this.removingBubbles.length - 1; i >= 0; i--) {
            const bubble = this.removingBubbles[i];
            if (!bubble.animationTimer) bubble.animationTimer = 0;
            bubble.animationTimer += 1;
            
            // Remove after animation completes (smoother feedback)
            if (bubble.animationTimer > 20) {
                this.removingBubbles.splice(i, 1);
                this.debugLogger.log('cleanup', 'Removing bubble animation completed');
            }
        }

        // Check win condition
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
            this.score *= CLEAR_FIELD_BONUS_MULTIPLIER;
            this.saveHighScore(this.score);
            this.debugLogger.log('game', 'Game won - all bubbles cleared', { finalScore: this.score });
        }
        
        // Check lose condition
        for (let col = 0; col < GRID_COLS; col++) {
            if (this.gridBubbles[GRID_ROWS - 1][col]) {
                this.gameOver = true;
                this.saveHighScore(this.score);
                this.debugLogger.log('game', 'Game over - bubbles reached bottom');
                break;
            }
        }
        
        // Update performance metrics
        const frameTime = performance.now() - this.frameStartTime;
        this.debugLogger.updateMetrics(frameTime, this.collisionChecksThisFrame, this.gridSnapsThisFrame);
        this.debugLogger.nextFrame();
    }

    snapBubbleToGrid(bubble) {
        this.gridSnapsThisFrame++;
        this.debugLogger.log('snap', 'Attempting to snap bubble to grid', {
            bubblePosition: { x: bubble.x, y: bubble.y },
            bubbleColor: bubble.color
        });
        
        // Enhanced hexagonal grid snapping with precise positioning
        let bestRow = -1;
        let bestCol = -1;
        let minDistance = Infinity;
        let candidatePositions = [];
        
        // Find the best grid position using hexagonal distance calculation
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (!this.gridBubbles[row][col]) {
                    const gridX = this.getColPosition(row, col);
                    const gridY = this.getRowPosition(row);
                    
                    // Skip positions that would cause overlaps
                    if (this.wouldOverlapPrecise(gridX, gridY, row, col)) {
                        continue;
                    }
                    
                    // Calculate precise distance to this grid position
                    const dx = bubble.x - gridX;
                    const dy = bubble.y - gridY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Check if this position maintains connectivity to top
                    const isTopRow = row === 0;
                    const isConnected = isTopRow || this.isPositionConnectedToTop(row, col);
                    
                    // Store candidate position
                    candidatePositions.push({
                        row, col, gridX, gridY, distance, isConnected
                    });
                    
                    // Prioritize connected positions with closer distance
                    if (isConnected && distance < minDistance) {
                        minDistance = distance;
                        bestRow = row;
                        bestCol = col;
                    }
                }
            }
        }
        
        this.debugLogger.log('snap', 'Grid position analysis', {
            candidatesFound: candidatePositions.length,
            connectedCandidates: candidatePositions.filter(c => c.isConnected).length,
            bestPosition: bestRow >= 0 ? { row: bestRow, col: bestCol, distance: minDistance } : null
        });
        
        // Enhanced fallback logic for edge cases
        if (bestRow === -1) {
            this.debugLogger.log('snap', 'No connected position found, using fallback');
            bestRow = this.findBestFallbackPosition(bubble);
            if (bestRow !== -1) {
                // Find first available column in the fallback row
                for (let col = 0; col < GRID_COLS; col++) {
                    if (!this.gridBubbles[bestRow][col]) {
                        const gridX = this.getColPosition(bestRow, col);
                        const gridY = this.getRowPosition(bestRow);
                        if (!this.wouldOverlapPrecise(gridX, gridY, bestRow, col)) {
                            bestCol = col;
                            break;
                        }
                    }
                }
            }
        }
        
        // Snap bubble to the determined position
        if (bestRow >= 0 && bestCol >= 0) {
            // Perfect positioning using grid calculations
            bubble.x = this.getColPosition(bestRow, bestCol);
            bubble.y = this.getRowPosition(bestRow);
            bubble.stuck = true;
            bubble.row = bestRow;
            bubble.col = bestCol;
            bubble.vx = 0;
            bubble.vy = 0;
            bubble.snapPredicted = false; // Reset prediction flag
            this.gridBubbles[bestRow][bestCol] = bubble;
            
            this.debugLogger.log('snap', 'Bubble successfully snapped to grid', {
                finalPosition: { row: bestRow, col: bestCol, x: bubble.x, y: bubble.y },
                color: bubble.color
            });
            
            // Process matches and game logic
            const matches = this.checkMatches(bestRow, bestCol);
            this.debugLogger.log('match', 'Checking for matches', {
                position: { row: bestRow, col: bestCol },
                matchesFound: matches.length,
                threshold: POP_THRESHOLD
            });
            
            if (matches.length >= POP_THRESHOLD) {
                this.debugLogger.log('match', 'Match threshold reached - popping bubbles', {
                    bubblesPopped: matches.length,
                    colors: matches.map(b => b.color)
                });
                this.playSound('pop');
                this.popBubbles(matches);
                this.missedShots = 0;
            } else {
                this.missedShots++;
                this.debugLogger.log('game', 'Shot missed - incrementing miss counter', {
                    missedShots: this.missedShots,
                    limit: MISSED_SHOTS_LIMIT
                });
                
                if (this.missedShots >= MISSED_SHOTS_LIMIT) {
                    this.debugLogger.log('game', 'Miss limit reached - deferring new row addition');
                    this.pendingNewRow = true;
                    this.missedShots = 0;
                }
            }
        } else {
            this.debugLogger.log('snap', 'WARNING: Could not find valid grid position for bubble!', {
                bubblePosition: { x: bubble.x, y: bubble.y },
                candidatesChecked: candidatePositions.length
            });
        }
    }

    findBestFallbackPosition(bubble) {
        // Find the best row for fallback placement (top rows preferred)
        for (let row = 0; row < Math.min(GRID_ROWS, 3); row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (!this.gridBubbles[row][col]) {
                    const gridX = this.getColPosition(row, col);
                    const gridY = this.getRowPosition(row);
                    if (!this.wouldOverlapPrecise(gridX, gridY, row, col)) {
                        return row;
                    }
                }
            }
        }
        return -1;
    }

    wouldOverlapPrecise(x, y, targetRow, targetCol) {
        // Enhanced overlap detection using precise hexagonal distances
        const MIN_DISTANCE = BUBBLE_RADIUS * 2 * 0.98; // Slightly tighter for perfect placement
        
        // Check all nearby positions that could cause overlaps
        const neighbors = this.getNeighborPositions(targetRow, targetCol);
        
        // Add the target position's immediate vicinity
        const positionsToCheck = [
            ...neighbors,
            [targetRow, targetCol - 2], [targetRow, targetCol + 2], // Extended horizontal
            [targetRow - 2, targetCol], [targetRow + 2, targetCol]   // Extended vertical
        ];
        
        for (const [checkRow, checkCol] of positionsToCheck) {
            if (checkRow >= 0 && checkRow < GRID_ROWS && 
                checkCol >= 0 && checkCol < GRID_COLS && 
                this.gridBubbles[checkRow][checkCol]) {
                
                const existingBubble = this.gridBubbles[checkRow][checkCol];
                const dx = x - existingBubble.x;
                const dy = y - existingBubble.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < MIN_DISTANCE) {
                    return true;
                }
            }
        }
        
        return false;
    }

    isPositionConnectedToTop(row, col) {
        // Check if placing a bubble at this position would be connected to the top row
        // through a chain of adjacent bubbles
        
        // Get neighbors of this position
        const neighbors = this.getNeighborPositions(row, col);
        
        // Check if any neighbor exists and is connected to top
        for (const [nRow, nCol] of neighbors) {
            if (nRow >= 0 && nRow < GRID_ROWS && nCol >= 0 && nCol < GRID_COLS) {
                const neighborBubble = this.gridBubbles[nRow][nCol];
                if (neighborBubble) {
                    // If neighbor is in top row, we're connected
                    if (nRow === 0) {
                        return true;
                    }
                    // Otherwise, check if this neighbor is connected to top
                    if (this.isBubbleConnectedToTop(nRow, nCol)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    isBubbleConnectedToTop(row, col) {
        // Use breadth-first search to check if a bubble is connected to the top row
        if (row === 0) return true; // Already in top row
        
        const visited = new Set();
        const queue = [[row, col]];
        visited.add(`${row},${col}`);
        
        while (queue.length > 0) {
            const [currentRow, currentCol] = queue.shift();
            
            // If we reached the top row, we're connected
            if (currentRow === 0) {
                return true;
            }
            
            // Check all neighbors
            const neighbors = this.getNeighborPositions(currentRow, currentCol);
            for (const [nRow, nCol] of neighbors) {
                const key = `${nRow},${nCol}`;
                if (nRow >= 0 && nRow < GRID_ROWS && nCol >= 0 && nCol < GRID_COLS && 
                    !visited.has(key) && this.gridBubbles[nRow][nCol]) {
                    visited.add(key);
                    queue.push([nRow, nCol]);
                }
            }
        }
        
        return false;
    }

    getNeighborPositions(row, col) {
        // Perfect hexagonal neighbor calculation
        // In a hexagonal grid, odd rows are offset to the right
        const isOddRow = row % 2 === 1;
        
        // Calculate the 6 hexagonal neighbors with correct offset logic
        return [
            [row - 1, col + (isOddRow ? 0 : -1)], // Top left
            [row - 1, col + (isOddRow ? 1 : 0)],  // Top right
            [row, col - 1],                        // Direct left
            [row, col + 1],                        // Direct right
            [row + 1, col + (isOddRow ? 0 : -1)], // Bottom left
            [row + 1, col + (isOddRow ? 1 : 0)]   // Bottom right
        ];
    }

    wouldOverlap(x, y, targetRow, targetCol) {
        // Check if placing a bubble at this position would overlap with existing bubbles
        const testBubble = { x: x, y: y, radius: BUBBLE_RADIUS };
        
        // Check nearby positions for overlaps
        for (let row = Math.max(0, targetRow - 1); row <= Math.min(GRID_ROWS - 1, targetRow + 1); row++) {
            for (let col = Math.max(0, targetCol - 1); col <= Math.min(GRID_COLS - 1, targetCol + 1); col++) {
                if (row === targetRow && col === targetCol) continue; // Skip the target position itself
                
                const existingBubble = this.gridBubbles[row][col];
                if (existingBubble) {
                    const dx = x - existingBubble.x;
                    const dy = y - existingBubble.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Check if bubbles would overlap (with a small tolerance)
                    if (distance < (BUBBLE_RADIUS * 2) * 0.95) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    hasAdjacentBubble(row, col) {
        // Check if there are any bubbles adjacent to this position
        const neighbors = this.getNeighborPositions(row, col);
        
        for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
                if (this.gridBubbles[nr][nc]) {
                    return true;
                }
            }
        }
        
        return false;
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
            
            // Get neighboring positions using helper method
            const neighbors = this.getNeighborPositions(r, c);
            
            // Visit all neighbors
            for (const [nr, nc] of neighbors) {
                floodFill(nr, nc);
            }
        };
        
        floodFill(row, col);
        return matches;
    }

    popBubbles(bubbles) {
        this.debugLogger.log('pop', 'Popping bubble group', {
            count: bubbles.length,
            colors: [...new Set(bubbles.map(b => b.color))], // Unique colors
            positions: bubbles.map(b => ({ row: b.row, col: b.col }))
        });
        
        // Remove bubbles from grid
        for (const bubble of bubbles) {
            this.gridBubbles[bubble.row][bubble.col] = null;
            bubble.removing = true;
            this.removingBubbles.push(bubble);
            this.bubblesCleared++;
        }
        
        // Add points
        const pointsEarned = bubbles.length * POINTS_PER_BUBBLE;
        this.score += pointsEarned;
        this.debugLogger.log('score', 'Points earned from popping', {
            bubblesPopped: bubbles.length,
            pointsEarned,
            newScore: this.score
        });
        
        // Check for floating bubbles (avalanche effect)
        const floatingBubbles = this.findFloatingBubbles();
        if (floatingBubbles.length > 0) {
            this.debugLogger.log('avalanche', 'Floating bubbles detected', {
                count: floatingBubbles.length,
                positions: floatingBubbles.map(b => ({ row: b.row, col: b.col, color: b.color }))
            });
            
            this.playSound('avalanche');
            const avalanchePoints = floatingBubbles.length * AVALANCHE_BONUS;
            this.score += avalanchePoints;
            
            this.debugLogger.log('score', 'Avalanche bonus points', {
                bubblesDropped: floatingBubbles.length,
                bonusPoints: avalanchePoints,
                newScore: this.score
            });
            
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
        
        // Get neighboring positions using helper method
        const neighbors = this.getNeighborPositions(row, col);
        
        // Visit all neighbors
        for (const [nr, nc] of neighbors) {
            this.markConnectedBubbles(nr, nc);
        }
    }

    addNewRow() {
        this.debugLogger.log('game', 'Adding new row - starting shift operation');
        
        // Shift all existing rows down and update their positions
        for (let row = GRID_ROWS - 1; row > 0; row--) {
            for (let col = 0; col < GRID_COLS; col++) {
                this.gridBubbles[row][col] = this.gridBubbles[row - 1][col];
                if (this.gridBubbles[row][col]) {
                    // Update both grid coordinates and actual position
                    this.gridBubbles[row][col].row = row;
                    this.gridBubbles[row][col].col = col;
                    
                    // Recalculate precise position using grid positioning methods
                    this.gridBubbles[row][col].x = this.getColPosition(row, col);
                    this.gridBubbles[row][col].y = this.getRowPosition(row);
                    
                    this.debugLogger.log('shift', `Moved bubble from row ${row-1} to row ${row}`, {
                        col: col,
                        newPosition: { x: this.gridBubbles[row][col].x, y: this.gridBubbles[row][col].y }
                    });
                }
            }
        }
        
        // Clear the top row
        for (let col = 0; col < GRID_COLS; col++) {
            this.gridBubbles[0][col] = null;
        }
        
        // Add new row at the top with proper collision checking
        const settings = this.difficultySettings[this.difficulty];
        const colorSubset = BUBBLE_COLORS.slice(0, settings.colors);
        
        // Calculate maximum bubbles that can fit in the grid based on canvas width
        const maxBubblesPerRow = Math.floor((this.canvas.width - BUBBLE_RADIUS * 2) / GRID_COL_SPACING);
        const effectiveGridCols = Math.min(GRID_COLS, maxBubblesPerRow);
        
        for (let col = 0; col < effectiveGridCols; col++) {
            if (Math.random() < 0.85) { // 85% chance to add a bubble
                const x = this.getColPosition(0, col);
                const y = this.getRowPosition(0);
                
                // Ensure we don't place bubbles too close to the edge
                if (x < BUBBLE_RADIUS || x > this.canvas.width - BUBBLE_RADIUS) {
                    continue;
                }
                
                // Use enhanced overlap checking to prevent conflicts
                if (this.wouldOverlapPrecise(x, y, 0, col)) {
                    this.debugLogger.log('warning', 'Overlap detected when adding new row bubble', {
                        position: { row: 0, col: col, x: x, y: y }
                    });
                    continue;
                }
                
                // Create color clusters for more strategic gameplay
                let color;
                if (col > 0 && this.gridBubbles[0][col-1] && Math.random() < 0.4) {
                    color = this.gridBubbles[0][col-1].color;
                } else {
                    color = colorSubset[Math.floor(Math.random() * colorSubset.length)];
                }
                
                const bubble = new Bubble(x, y, color, 0, col);
                // CRITICAL FIX: Set stuck=true IMMEDIATELY after creation
                bubble.stuck = true;
                bubble.vx = 0; // Ensure no velocity
                bubble.vy = 0; // Ensure no velocity
                this.gridBubbles[0][col] = bubble;
                this.totalBubbles++;
                
                this.debugLogger.log('add', 'New bubble added to top row', {
                    position: { row: 0, col: col, x: x, y: y },
                    color: color
                });
            }
        }
        
        // Verify grid integrity after the operation
        this.verifyGridIntegrity();
        
        // Check if game is over (bubbles reached bottom)
        for (let col = 0; col < GRID_COLS; col++) {
            if (this.gridBubbles[GRID_ROWS - 1][col]) {
                this.gameOver = true;
                this.saveHighScore(this.score);
                this.debugLogger.log('game', 'Game over - bubbles reached bottom after new row added');
                break;
            }
        }
        
        this.playSound('newRow');
        this.debugLogger.log('game', 'New row addition completed successfully');
    }

    // Add a method to verify grid integrity (helps catch positioning issues)
    verifyGridIntegrity() {
        if (!this.debugLogger.enabled) return; // Only run in debug mode
        
        let issues = 0;
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const bubble = this.gridBubbles[row][col];
                if (bubble) {
                    const expectedX = this.getColPosition(row, col);
                    const expectedY = this.getRowPosition(row);
                    
                    // Check if bubble position matches expected grid position
                    const positionError = Math.sqrt(
                        Math.pow(bubble.x - expectedX, 2) + 
                        Math.pow(bubble.y - expectedY, 2)
                    );
                    
                    if (positionError > 1) { // Allow 1 pixel tolerance

                        this.debugLogger.log('warning', 'Grid integrity issue detected', {
                            bubble: { row: bubble.row, col: bubble.col, x: bubble.x, y: bubble.y },
                            expected: { row: row, col: col, x: expectedX, y: expectedY },
                            error: positionError
                        });
                        
                        // Auto-correct the position
                        bubble.x = expectedX;
                        bubble.y = expectedY;
                        bubble.row = row;
                        bubble.col = col;
                        issues++;
                    }
                }
            }
        }
        
        if (issues > 0) {
            this.debugLogger.log('warning', `Fixed ${issues} grid integrity issues`);
        }
    }

    draw() {
        // CRITICAL: Still draw during initialization, but don't process bubble movement
        
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, GRID_ROW_HEIGHT * GRID_ROWS + GRID_TOP_MARGIN);
        
        // Optional: Draw hexagonal grid visualization (press 'G' to toggle)
        if (this.showDebugGrid) {
            this.drawHexagonalGrid();
        }
        
        // Draw grid bubbles
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const bubble = this.gridBubbles[row][col];
                if (bubble) {
                    bubble.draw(this.ctx);
                }
            }
        }

        // Only draw flying bubbles if not initializing
        if (!this.initializing) {
            // Draw flying bubbles with enhanced collision prediction
            for (const bubble of this.flyingBubbles) {
                bubble.draw(this.ctx);
                
                // Draw collision prediction if enabled
                if (this.showCollisionPrediction) {
                    this.drawCollisionPrediction(bubble);
                }
            }
        }
        
        // Draw falling bubbles
        for (const bubble of this.fallingBubbles) {
            bubble.draw(this.ctx);
        }
        
        // Draw removing bubbles (pop animation)
        for (const bubble of this.removingBubbles) {
            bubble.draw(this.ctx);
        }

        // Draw finish line only if finishLineY is properly set
        if (this.finishLineY > 0) {
            this.ctx.strokeStyle = '#FFD700';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([10, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.finishLineY);
            this.ctx.lineTo(this.canvas.width, this.finishLineY);
            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset line dash
            
            // Draw finish line label
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillStyle = '#FFD700';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('FINISH LINE', this.canvas.width / 2, this.finishLineY - 10);
        }

        // Draw score buckets
        for (let i = 0; i < this.scoreBuckets.length; i++) {
            const bucket = this.scoreBuckets[i];
            
            // Draw bucket background
            this.ctx.fillStyle = bucket.color;
            this.ctx.fillRect(bucket.x, bucket.y, bucket.width, bucket.height);
            
            // Draw bucket border
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(bucket.x, bucket.y, bucket.width, bucket.height);
            
            // Draw bucket score label
            this.ctx.font = 'bold 18px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                bucket.label, 
                bucket.x + bucket.width / 2, 
                bucket.y + bucket.height / 2 + 6
            );
            
            // Draw bucket glow effect
            const gradient = this.ctx.createLinearGradient(bucket.x, bucket.y, bucket.x, bucket.y + bucket.height);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(bucket.x, bucket.y, bucket.width, bucket.height / 2);
        }

        // Only draw shooter if it exists, game is started, and position is valid
        if (this.shooter && this.gameStarted && !this.gameOver && !this.gameWon && this.finishLineY > 0) {
            this.shooter.draw(this.ctx);
        }

        // Draw UI
        this.drawUI();
        
        // Show initialization status
        if (this.initializing) {
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillStyle = 'yellow';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Initializing...', this.canvas.width / 2, this.canvas.height / 2);
        }
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
        
        // Enhanced debug information display
        if (this.showDebugInfo) {
            this.drawDebugInfo();
        }
        
        // Debug controls help
        if (this.debugLogger.enabled) {
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            this.ctx.fillText('DEBUG MODE: G=Grid, I=Info, P=Prediction, R=Report, C=Clear, D=Toggle', 10, this.canvas.height - 5);
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

    drawDebugInfo() {
        const report = this.debugLogger.getReport();
        
        // Debug info background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(this.canvas.width - 250, 50, 240, 200);
        
        // Debug info text
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#00FF00';
        this.ctx.textAlign = 'left';
        
        const debugInfo = [
            `Frame: ${report.frame}`,
            `Avg Frame Time: ${report.avgFrameTime.toFixed(2)}ms`,
            `Collision Checks: ${report.collisionChecks}`,
            `Grid Snaps: ${report.gridSnaps}`,
            `Flying Bubbles: ${this.flyingBubbles.length}`,
            `Falling Bubbles: ${this.fallingBubbles.length}`,
            `Removing Bubbles: ${this.removingBubbles.length}`,
            `Recent Collisions: ${report.recentCollisions.length}`,
            '',
            'Collision Settings:',
            `Precision: ${this.collisionSettings.precisionFactor}`,
            `Wall Bounce: ${this.collisionSettings.wallBounceRestitution}`,
            `Snap Distance: ${this.collisionSettings.snapDistance.toFixed(1)}`
        ];
        
        debugInfo.forEach((line, index) => {
            this.ctx.fillText(line, this.canvas.width - 240, 70 + index * 14);
        });
        
        // Show recent collision details if any
        if (report.recentCollisions.length > 0) {
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.fillText('Last Collision:', this.canvas.width - 240, 70 + debugInfo.length * 14);
            const lastCollision = report.recentCollisions[report.recentCollisions.length - 1];
            this.ctx.fillText(`${lastCollision.category}: ${lastCollision.message}`, this.canvas.width - 240, 84 + debugInfo.length * 14);
        }
    }

    drawCollisionPrediction(bubble) {
        const predictions = this.collisionPredictor.predictCollision(
            bubble, this.gridBubbles, this.canvas.width, this.canvas.height
        );
        
        if (predictions.length > 0) {
            const prediction = predictions[0]; // Show first prediction
            
            // Draw prediction line
            this.ctx.setLineDash([2, 2]);
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(bubble.x, bubble.y);
            this.ctx.lineTo(prediction.position.x, prediction.position.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Draw prediction point
            this.ctx.beginPath();
            this.ctx.arc(prediction.position.x, prediction.position.y, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = prediction.type === 'grid_collision' ? 'rgba(255, 0, 0, 0.7)' : 'rgba(255, 255, 0, 0.7)';
            this.ctx.fill();
            
            // Draw prediction text
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = 'yellow';
            this.ctx.fillText(
                `${prediction.type} (${prediction.time.toFixed(2)}s)`,
                prediction.position.x + 10,
                prediction.position.y - 10
            );
        }
    }

    drawHexagonalGrid() {
        // Draw the perfect hexagonal grid for debugging and verification
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)'; // Semi-transparent green
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([2, 2]); // Dashed lines
        
        // Draw grid positions and connections
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = this.getColPosition(row, col);
                const y = this.getRowPosition(row);
                
                // Draw position markers
                this.ctx.beginPath();
                this.ctx.arc(x, y, 3, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
                this.ctx.fill();
                
                // Draw hexagonal connections to neighbors
                const neighbors = this.getNeighborPositions(row, col);
                for (const [nRow, nCol] of neighbors) {
                    if (nRow >= 0 && nRow < GRID_ROWS && nCol >= 0 && nCol < GRID_COLS) {
                        const nx = this.getColPosition(nRow, nCol);
                        const ny = this.getRowPosition(nRow);
                        
                        this.ctx.beginPath();
                        this.ctx.moveTo(x, y);
                        this.ctx.lineTo(nx, ny);
                        this.ctx.stroke();
                    }
                }
            }
        }
        
        this.ctx.setLineDash([]); // Reset line dash
        
        // Display grid info
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        this.ctx.fillText('DEBUG: Perfect Hexagonal Grid', 10, this.canvas.height - 80);
        this.ctx.fillText(`Row Height: ${GRID_ROW_HEIGHT.toFixed(2)} (√3 × ${BUBBLE_RADIUS})`, 10, this.canvas.height - 65);
        this.ctx.fillText(`Col Spacing: ${GRID_COL_SPACING} (2 × ${BUBBLE_RADIUS})`, 10, this.canvas.height - 50);
        this.ctx.fillText(`Hex Offset: ${HEX_OFFSET} (${BUBBLE_RADIUS})`, 10, this.canvas.height - 35);
               this.ctx.fillText('Press G to toggle grid', 10, this.canvas.height - 20);
    }

    gameLoop() {
        // Limit to 60 FPS for consistent smooth gameplay
        const now = performance.now();
        if (!this.lastTime) this.lastTime = now;
        const deltaTime = now - this.lastTime;
        
        if (deltaTime >= 16.67) { // ~60 FPS
            this.update();
            this.draw();
            this.lastTime = now;
        }
        
        // Always continue the game loop
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
