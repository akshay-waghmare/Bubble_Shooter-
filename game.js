// Bubble Shooter Game Implementation with Matter.js Physics

// Matter.js destructuring - loaded from CDN in HTML
const { Engine, Render, World, Bodies, Body, Events, Vector, Constraint } = Matter;

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
        this.stuck = false;
        this.row = row;
        this.col = col;
        this.removing = false;
        this.falling = false;
        this.visited = false;
        
        // Velocity properties for manual physics
        this.vx = 0;
        this.vy = 0;
        
        // Matter.js physics body
        this.body = null;
        this.isPhysicsEnabled = false;
        
        // Enhanced animation properties
        this.scale = 1.0;
        this.opacity = 1.0;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.creationTime = performance.now();
        this.wobbleAmplitude = 0;
        this.wobbleFrequency = 5;
        this.glowIntensity = 0;
        
        // Trail effect for flying bubbles
        this.trail = [];
        this.maxTrailLength = 8;
        
        console.log('BUBBLE CREATED:', {
            position: { x: this.x, y: this.y },
            color: this.color,
            gridPos: { row: this.row, col: this.col },
            stuck: this.stuck
        });
    }

    // Create physics body for flying bubble
    enablePhysics(engine) {
        if (this.body) return; // Already has physics
        
        this.body = Bodies.circle(this.x, this.y, this.radius, {
            restitution: 0.8, // Bounciness
            friction: 0.1,
            frictionAir: 0.01, // Air resistance
            density: 0.001,
            label: 'bubble'
        });
        
        World.add(engine.world, this.body);
        this.isPhysicsEnabled = true;
        
        console.log('Physics enabled for bubble at:', { x: this.x, y: this.y });
    }

    // Disable physics and stick to grid
    disablePhysics(engine) {
        if (!this.body) return;
        
        World.remove(engine.world, this.body);
        this.body = null;
        this.isPhysicsEnabled = false;
        this.stuck = true;
        
        console.log('Physics disabled for bubble at:', { x: this.x, y: this.y });
    }

    // Sync position with physics body
    syncWithPhysics() {
        if (this.body && this.isPhysicsEnabled) {
            this.x = this.body.position.x;
            this.y = this.body.position.y;
        }
    }

    // Set velocity using physics
    setVelocity(vx, vy) {
        if (this.body && this.isPhysicsEnabled) {
            Body.setVelocity(this.body, { x: vx, y: vy });
        }
    }

    // Apply force to bubble
    applyForce(fx, fy) {
        if (this.body && this.isPhysicsEnabled) {
            Body.applyForce(this.body, this.body.position, { x: fx, y: fy });
        }
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

        // Apply wobble effect for newly placed bubbles or collision response
        const timeSinceCreation = performance.now() - this.creationTime;
        if (timeSinceCreation < 500 && this.stuck) {
            this.wobbleAmplitude = Math.max(0, 3 * (1 - timeSinceCreation / 500));
        }
        
        // NEW: Enhanced wobble effect during collision
        let collisionWobble = 0;
        if (this.isColliding) {
            const collisionProgress = this.collisionAnimationTimer / 30;
            collisionWobble = Math.sin(this.collisionAnimationTimer * 0.5) * (1 - collisionProgress) * 2;
        }
        
        // Calculate wobble offset
        const wobbleX = Math.sin(performance.now() * 0.01 * this.wobbleFrequency) * this.wobbleAmplitude + collisionWobble;
        const wobbleY = Math.cos(performance.now() * 0.01 * this.wobbleFrequency) * this.wobbleAmplitude * 0.5;
        
        // Apply pulse effect
        const pulseScale = 1 + Math.sin(this.pulsePhase + performance.now() * 0.003) * 0.05;
        
        // NEW: Add collision impact scale effect
        let collisionScale = 1;
        if (this.isColliding) {
            const collisionProgress = this.collisionAnimationTimer / 30;
            collisionScale = 1 + Math.sin(this.collisionAnimationTimer * 0.3) * (1 - collisionProgress) * 0.15;
        }
        
        ctx.save();
        ctx.translate(this.x + wobbleX, this.y + wobbleY);
        ctx.scale(pulseScale * this.scale * collisionScale, pulseScale * this.scale * collisionScale);

        // Enhanced glow effect with collision intensity
        let effectiveGlowIntensity = this.glowIntensity;
        if (this.isColliding) {
            const collisionProgress = this.collisionAnimationTimer / 30;
            effectiveGlowIntensity += (1 - collisionProgress) * 0.5; // Extra glow during collision
        }
        
        if (effectiveGlowIntensity > 0) {
            const glowRadius = this.radius + effectiveGlowIntensity * 10;
            const glowGradient = ctx.createRadialGradient(0, 0, this.radius, 0, 0, glowRadius);
            glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            glowGradient.addColorStop(1, `rgba(255, 255, 255, ${effectiveGlowIntensity * 0.3})`);
            
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
        
        // Enhanced border with depth - add collision highlight
        let borderColor = this.darkenColor(baseColor, 0.4);
        if (this.isColliding) {
            const collisionProgress = this.collisionAnimationTimer / 30;
            const highlightIntensity = (1 - collisionProgress) * 0.8;
            borderColor = `rgba(255, 255, 255, ${highlightIntensity})`;
        }
        
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = this.isColliding ? 3 : 2;
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
        
        // Sync position with physics if enabled
        if (this.isPhysicsEnabled) {
            this.syncWithPhysics();
        } else if (!this.stuck && !this.falling) {
            // Manual physics for flying bubbles (when not using Matter.js physics)
            console.log('BUBBLE UPDATE - Manual physics:', {
                beforePos: { x: this.x, y: this.y },
                velocity: { vx: this.vx, vy: this.vy },
                stuck: this.stuck,
                falling: this.falling
            });
            
            this.x += this.vx || 0;
            this.y += this.vy || 0;
            
            console.log('BUBBLE UPDATE - After movement:', {
                afterPos: { x: this.x, y: this.y }
            });
            
            // Handle wall bounces for flying bubbles
            // Get canvas width from the game instance or use a default
            const canvasWidth = window.gameInstance?.canvas?.width || 800;
            if (this.x - this.radius <= 0 || this.x + this.radius >= canvasWidth) {
                this.vx *= -0.95; // Energy loss on bounce
                this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
                console.log('BUBBLE UPDATE - Wall bounce, new vx:', this.vx);
            }
        }
        
        if (this.falling) {
            // Let physics handle falling with realistic motion
            if (!this.isPhysicsEnabled) {
                this.y += 5; // Fallback if physics disabled
            }
            
            // Add rotation and scale effect while falling
            this.pulsePhase += 0.2;
            this.scale = Math.max(0.1, this.scale - 0.02);
            this.opacity = Math.max(0, this.opacity - 0.03);
            return;
        }

        // Update trail for flying bubbles
        if (!this.stuck && !this.removing && !this.falling) {
            this.trail.push({ x: this.x, y: this.y, opacity: 1.0 });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
            
            // Add dynamic glow effect for flying bubbles
            this.glowIntensity = 0.5 + Math.sin(performance.now() * 0.01) * 0.3;
        } else {
            // Reduce glow for stuck bubbles
            this.glowIntensity = Math.max(0, this.glowIntensity - 0.02);
        }
    }

    // Enhanced method for realistic collision response
    handleCollisionWith(other, restitution = 0.3) {
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
        
        // Apply restitution (bounciness) to the flying bubble
        const impulse = restitution * speed;
        this.vx -= impulse * nx;
        this.vy -= impulse * ny;
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
        this.engine = null; // Will be set by Game class
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
        
        // Calculate the angle from shooter to mouse
        let angle = Math.atan2(deltaY, deltaX);
        
        console.log('AIMING DEBUG:', {
            mouseX, mouseY,
            shooterX: this.x, shooterY: this.y,
            deltaX, deltaY,
            rawAngle: angle,
            rawAngleDegrees: (angle * 180 / Math.PI).toFixed(1)
        });
        
        // For bubble shooter, allow wide range but prevent extreme downward shots
        // Allow from -3*PI/4 (bottom-left) to 3*PI/4 (bottom-right)
        if (angle > Math.PI * 0.9) {
            angle = Math.PI * 0.9;
        } else if (angle < -Math.PI * 0.9) {
            angle = -Math.PI * 0.9;
        }
        
        console.log('FINAL ANGLE:', {
            finalAngle: angle,
            finalAngleDegrees: (angle * 180 / Math.PI).toFixed(1)
        });
        
        this.angle = angle;
    }

    canShoot() {
        const now = Date.now();
        return now - this.lastShot >= this.reloadTime;
    }

    shoot() {
        if (!this.canShoot()) return null;
        
        console.log('SHOOTER SHOOTING - creating bubble');
        console.log('Current angle:', this.angle, 'degrees:', (this.angle * 180 / Math.PI).toFixed(1));
        
        const bubble = new Bubble(this.x, this.y, this.currentColor);
        
        // CRITICAL: Ensure bubble is NOT stuck for flying
        bubble.stuck = false;
        bubble.falling = false;
        bubble.isPhysicsEnabled = false;
        
        // Set initial velocity for manual physics
        const vx = Math.cos(this.angle) * SHOOTER_SPEED;
        const vy = Math.sin(this.angle) * SHOOTER_SPEED;
        bubble.vx = vx;
        bubble.vy = vy;
        
        console.log('Bubble shot with velocity:', { vx, vy });
        console.log('Bubble state:', { 
            stuck: bubble.stuck, 
            falling: bubble.falling, 
            isPhysicsEnabled: bubble.isPhysicsEnabled 
        });
        console.log('Expected direction:', {
            horizontal: vx > 0 ? 'RIGHT' : vx < 0 ? 'LEFT' : 'NONE',
            vertical: vy > 0 ? 'DOWN' : vy < 0 ? 'UP' : 'NONE'
        });
        
        // Update shooter colors
        this.currentColor = this.nextColor;
        this.nextColor = this.getRandomColor();
        this.lastShot = Date.now();
        
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
        
        // Initialize Matter.js physics engine
        this.engine = Engine.create();
        this.engine.world.gravity.y = 0.4; // Reduced gravity for bubble shooter feel
        this.engine.world.gravity.x = 0;
        
        // Set initial canvas dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const maxWidth = Math.min(viewportWidth - 20, 400);
        const portraitHeight = Math.min(viewportHeight - 100, maxWidth * 1.6);
        
        canvas.width = maxWidth;
        canvas.height = portraitHeight;
        
        // Create invisible walls AFTER canvas dimensions are set
        this.createWalls();
        
        console.log('Canvas dimensions set:', { width: canvas.width, height: canvas.height });
        console.log('Matter.js engine initialized');
        
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
            novice: { rowsToStart: 2, colors: 3, addRowFrequency: 8, timeBasedDescent: 15000 }, // 15 seconds
            easy: { rowsToStart: 2, colors: 4, addRowFrequency: 6, timeBasedDescent: 12000 }, // 12 seconds
            medium: { rowsToStart: 3, colors: 5, addRowFrequency: 5, timeBasedDescent: 10000 }, // 10 seconds
            hard: { rowsToStart: 3, colors: 6, addRowFrequency: 4, timeBasedDescent: 8000 }, // 8 seconds
            master: { rowsToStart: 3, colors: 6, addRowFrequency: 3, timeBasedDescent: 6000 } // 6 seconds
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
        
        // Infinite Stack System
        this.infiniteStack = []; // Pre-generated rows waiting to descend
        this.shotCount = 0; // Track shots fired for descent triggers
        this.lastDescentTime = 0; // Track time since last descent
        this.loseLineRow = 0; // Row index that defines the lose line (calculated dynamically)
        
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
        
        // Reset infinite stack system
        this.shotCount = 0;
        this.lastDescentTime = Date.now();
        this.infiniteStack = [];
        
        // Initialize grid
        for (let row = 0; row < GRID_ROWS; row++) {
            this.gridBubbles[row] = [];
            for (let col = 0; col < GRID_COLS; col++) {
                this.gridBubbles[row][col] = null;
            }
        }
        
        console.log('Grid initialized');
        
        // Initialize infinite stack with pre-generated rows
        this.generateInfiniteStack();
        
        // Calculate lose line (dynamically based on canvas height and shooter position)
        this.calculateLoseLine();
        
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

    generateInfiniteStack() {
        // Generate a stack of pre-generated rows to ensure constant pressure
        console.log('Generating infinite stack...');
        
        const settings = this.difficultySettings[this.difficulty];
        const colorSubset = BUBBLE_COLORS.slice(0, settings.colors);
        const maxBubblesPerRow = Math.floor((this.canvas.width - BUBBLE_RADIUS * 2) / GRID_COL_SPACING);
        const effectiveGridCols = Math.min(GRID_COLS, maxBubblesPerRow);
        
        // Generate 20 rows ahead for the infinite stack
        for (let stackRow = 0; stackRow < 20; stackRow++) {
            const rowData = new Array(effectiveGridCols).fill(null);
            
            for (let col = 0; col < effectiveGridCols; col++) {
                // Create bubbles with some randomness but ensure clusters for strategy
                if (Math.random() < 0.8) { // 80% chance of bubble placement
                    let color;
                    
                    // Create color clusters for strategic gameplay
                    if (col > 0 && rowData[col-1] && Math.random() < 0.5) {
                        color = rowData[col-1];
                    } else if (stackRow > 0 && this.infiniteStack[stackRow-1] && this.infiniteStack[stackRow-1][col] && Math.random() < 0.4) {
                        color = this.infiniteStack[stackRow-1][col];
                    } else {
                        color = colorSubset[Math.floor(Math.random() * colorSubset.length)];
                    }
                    
                    rowData[col] = color;
                }
            }
            
            this.infiniteStack.push(rowData);
        }
        
        console.log('Infinite stack generated with', this.infiniteStack.length, 'rows');
    }

    calculateLoseLine() {
        // Calculate the lose line based on canvas dimensions and shooter position
        const shooterY = this.canvas.height - 50; // Estimated shooter position
        const safeZone = 100; // Minimum safe zone above shooter
        const loseLineY = shooterY - safeZone;
        
        // Convert Y position to row index
        this.loseLineRow = Math.floor((loseLineY - GRID_TOP_MARGIN) / GRID_ROW_HEIGHT);
        
        // Ensure lose line is reasonable (at least 8 rows from top)
        this.loseLineRow = Math.max(8, this.loseLineRow);
        
        console.log('Lose line calculated:', {
            loseLineY,
            loseLineRow: this.loseLineRow,
            shooterY,
            safeZone
        });
    }

    addNewRow() {
        // This is the core mechanic: shift all bubbles down and add a new row from infinite stack
        console.log('=== ADDING NEW ROW ===');
        
        if (this.infiniteStack.length === 0) {
            console.warn('Infinite stack is empty! Regenerating...');
            this.generateInfiniteStack();
        }
        
        // Get the next row from infinite stack
        const newRowData = this.infiniteStack.shift();
        
        // Extend grid if needed to accommodate the descent
        const maxNeededRows = this.loseLineRow + 3; // Allow some buffer beyond lose line
        while (this.gridBubbles.length < maxNeededRows) {
            this.gridBubbles.push(new Array(GRID_COLS).fill(null));
        }
        
        // Shift all existing bubbles down by one row
        for (let row = this.gridBubbles.length - 1; row >= 1; row--) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (this.gridBubbles[row - 1][col]) {
                    const bubble = this.gridBubbles[row - 1][col];
                    
                    // Update bubble's position and grid coordinates
                    bubble.row = row;
                    bubble.col = col;
                    bubble.x = this.getColPosition(row, col);
                    bubble.y = this.getRowPosition(row);
                    
                    // Move bubble to new position
                    this.gridBubbles[row][col] = bubble;
                    this.gridBubbles[row - 1][col] = null;
                }
            }
        }
        
        // Add new row at the top (row 0)
        const maxBubblesPerRow = Math.floor((this.canvas.width - BUBBLE_RADIUS * 2) / GRID_COL_SPACING);
        const effectiveGridCols = Math.min(GRID_COLS, maxBubblesPerRow);
        
        for (let col = 0; col < effectiveGridCols; col++) {
            if (newRowData[col]) {
                const x = this.getColPosition(0, col);
                const y = this.getRowPosition(0);
                
                const bubble = new Bubble(x, y, newRowData[col], 0, col);
                bubble.stuck = true;
                bubble.vx = 0;
                bubble.vy = 0;
                
                this.gridBubbles[0][col] = bubble;
                this.totalBubbles++;
            }
        }
        
        // Replenish infinite stack
        if (this.infiniteStack.length < 10) {
            this.generateInfiniteStack();
        }
        
        // Reset missed shots counter as player gets fresh challenge
        this.missedShots = 0;
        
        console.log('New row added. Grid now has', this.gridBubbles.length, 'rows');
        console.log('Bubbles in grid:', this.gridBubbles.flat().filter(b => b !== null).length);
        
        // Check for immediate lose condition after descent
        this.checkLoseCondition();
    }

    checkLoseCondition() {
        // Check if any bubble has reached or crossed the lose line
        for (let row = this.loseLineRow; row < this.gridBubbles.length; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (this.gridBubbles[row] && this.gridBubbles[row][col]) {
                    console.log('LOSE CONDITION MET: Bubble found at row', row, 'which is at/below lose line row', this.loseLineRow);
                    this.gameOver = true;
                    this.gameWon = false;
                    this.playSound('lose');
                    this.saveHighScore(this.score);
                    return true;
                }
            }
        }
        return false;
    }

    checkDescentTriggers() {
        // Check if it's time for a new row to descend based on shot count or time
        const settings = this.difficultySettings[this.difficulty];
        const now = Date.now();
        
        let shouldDescend = false;
        let reason = '';
        
        // Check shot-based trigger
        if (this.shotCount >= settings.addRowFrequency) {
            shouldDescend = true;
            reason = `shot count (${this.shotCount}/${settings.addRowFrequency})`;
            this.shotCount = 0; // Reset shot count
        }
        
        // Check time-based trigger
        const timeSinceLastDescent = now - this.lastDescentTime;
        if (timeSinceLastDescent >= settings.timeBasedDescent) {
            shouldDescend = true;
            reason = `time elapsed (${(timeSinceLastDescent/1000).toFixed(1)}s/${settings.timeBasedDescent/1000}s)`;
            this.lastDescentTime = now;
        }
        
        if (shouldDescend) {
            console.log(`Triggering descent due to: ${reason}`);
            // Use the pending flag to avoid calling addNewRow during bubble processing
            this.pendingNewRow = true;
        }
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

    createWalls() {
        // Create invisible walls for physics boundaries
        const thickness = 50;
        
        // Left wall
        this.leftWall = Bodies.rectangle(-thickness/2, this.canvas.height/2, thickness, this.canvas.height, {
            isStatic: true,
            label: 'leftWall'
        });
        
        // Right wall  
        this.rightWall = Bodies.rectangle(this.canvas.width + thickness/2, this.canvas.height/2, thickness, this.canvas.height, {
            isStatic: true,
            label: 'rightWall'
        });
        
        // Top wall
        this.topWall = Bodies.rectangle(this.canvas.width/2, -thickness/2, this.canvas.width, thickness, {
            isStatic: true,
            label: 'topWall'
        });
        
        // Bottom wall (for falling bubbles to hit buckets)
        this.bottomWall = Bodies.rectangle(this.canvas.width/2, this.canvas.height + thickness/2, this.canvas.width, thickness, {
            isStatic: true,
            label: 'bottomWall'
        });
        
        World.add(this.engine.world, [this.leftWall, this.rightWall, this.topWall, this.bottomWall]);
        
        console.log('Physics walls created');
    }

    setupPhysicsCollisions() {
        // Handle collisions between physics bodies
        Events.on(this.engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            
            for (let pair of pairs) {
                const { bodyA, bodyB } = pair;
                
                // Find which bodies are bubbles
                const bubbleA = this.findBubbleByBody(bodyA);
                const bubbleB = this.findBubbleByBody(bodyB);
                
                // Handle bubble-to-bubble collision
                if (bubbleA && bubbleB) {
                    this.handleBubbleCollision(bubbleA, bubbleB);
                }
                
                // Handle bubble-to-wall collision
                if (bubbleA && (bodyB.label === 'topWall')) {
                    this.handleTopWallCollision(bubbleA);
                }
                if (bubbleB && (bodyA.label === 'topWall')) {
                    this.handleTopWallCollision(bubbleB);
                }
                
                // Handle wall bounces with sound
                if ((bubbleA && (bodyB.label === 'leftWall' || bodyB.label === 'rightWall')) ||
                    (bubbleB && (bodyA.label === 'leftWall' || bodyA.label === 'rightWall'))) {
                    this.playSound('bounce');
                }
            }
        });
        
        console.log('Physics collision detection setup complete');
    }

    findBubbleByBody(body) {
        // Find bubble object that corresponds to this physics body
        for (let bubble of this.flyingBubbles) {
            if (bubble.body === body) return bubble;
        }
        for (let bubble of this.fallingBubbles) {
            if (bubble.body === body) return bubble;
        }
        return null;
    }

    handleBubbleCollision(flyingBubble, gridBubble) {
        console.log('Physics collision detected between bubbles');
        
        // Snap the flying bubble to grid
        this.snapBubbleToGrid(flyingBubble);
        
        // Remove from flying bubbles
        const index = this.flyingBubbles.indexOf(flyingBubble);
        if (index > -1) {
            this.flyingBubbles.splice(index, 1);
        }
    }

    handleTopWallCollision(bubble) {
        console.log('Bubble hit top wall - snapping to grid');
        
        this.snapBubbleToGrid(bubble);
        
        // Remove from flying bubbles
        const index = this.flyingBubbles.indexOf(bubble);
        if (index > -1) {
            this.flyingBubbles.splice(index, 1);
        }
    }

    setupEventListeners() {
        if (this.eventListenersAttached) return;
        
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            if (this.shooter) {
                this.shooter.aimAt(this.mouseX, this.mouseY);
            }
        });

        this.canvas.addEventListener('click', (e) => {
            if (!this.gameStarted || this.gameOver) return;
            
            // Check shooting delay
            const now = Date.now();
            if (now - this.gameStartTime < this.shootingDelay) return;
            
            if (this.shooter && this.shooter.canShoot()) {
                const bubble = this.shooter.shoot();
                if (bubble) {
                    this.flyingBubbles.push(bubble);
                    
                    // Increment shot count for descent tracking
                    this.shotCount++;
                    
                    // Decrement shots for strategy mode
                    if (this.gameMode === "strategy") {
                        this.shotsLeft--;
                        console.log(`Strategy mode: ${this.shotsLeft} shots remaining`);
                    }
                    
                    // Check if it's time for a new row to descend
                    this.checkDescentTriggers();
                }
            }
        });

        // Touch support
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseX = touch.clientX - rect.left;
            this.mouseY = touch.clientY - rect.top;
            if (this.shooter) {
                this.shooter.aimAt(this.mouseX, this.mouseY);
            }
        });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this.gameStarted || this.gameOver) return;
            
            const now = Date.now();
            if (now - this.gameStartTime < this.shootingDelay) return;
            
            if (this.shooter && this.shooter.canShoot()) {
                const bubble = this.shooter.shoot();
                if (bubble) {
                    this.flyingBubbles.push(bubble);
                    
                    // Increment shot count for descent tracking
                    this.shotCount++;
                    
                    // Decrement shots for strategy mode
                    if (this.gameMode === "strategy") {
                        this.shotsLeft--;
                        console.log(`Strategy mode: ${this.shotsLeft} shots remaining`);
                    }
                    
                    // Check if it's time for a new row to descend
                    this.checkDescentTriggers();
                }
            }
        });

        this.eventListenersAttached = true;
        this.resizeCanvas(); // Set up proper dimensions and create shooter
    }

    resizeCanvas() {
        // Set responsive dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const maxWidth = Math.min(viewportWidth - 20, 400);
        const portraitHeight = Math.min(viewportHeight - 100, maxWidth * 1.6);
        
        this.canvas.width = maxWidth;
        this.canvas.height = portraitHeight;
        
        // Create shooter if not exists
        if (!this.shooter) {
            this.shooter = new Shooter(this.canvas.width / 2, this.canvas.height - 50);
            this.shooter.engine = this.engine; // Pass engine reference
            console.log('Shooter created at:', { x: this.shooter.x, y: this.shooter.y });
        }
        
        // Update finish line for score buckets
        this.finishLineY = this.canvas.height - 100;
        
        // Update score bucket positions
        const bucketWidth = this.canvas.width / this.scoreBuckets.length;
        for (let i = 0; i < this.scoreBuckets.length; i++) {
            this.scoreBuckets[i].x = i * bucketWidth;
            this.scoreBuckets[i].width = bucketWidth;
        }
    }

    snapBubbleToGrid(bubble) {
        // Find the best grid position for this bubble
        const bestPosition = this.findBestGridPosition(bubble.x, bubble.y);
        
        if (bestPosition) {
            // Disable physics
            bubble.disablePhysics(this.engine);
            
            // Move to grid position
            bubble.x = bestPosition.x;
            bubble.y = bestPosition.y;
            bubble.row = bestPosition.row;
            bubble.col = bestPosition.col;
            bubble.stuck = true;
            bubble.vx = 0;
            bubble.vy = 0;
            
            // Add to grid
            this.gridBubbles[bestPosition.row][bestPosition.col] = bubble;
            
            console.log('Bubble snapped to grid at:', bestPosition);
            
            // Check for matches and clear bubbles
            this.checkMatches(bestPosition.row, bestPosition.col);
        }
    }

    findBestGridPosition(x, y) {
        let bestPosition = null;
        let minDistance = Infinity;
        
        // Calculate dynamic maximum row based on danger zone
        const shooterY = this.shooter ? this.shooter.y : this.canvas.height - 50;
        const dangerZoneY = shooterY - 80;
        // Allow bubbles to get very close to danger zone (only 5px buffer instead of full radius)
        const maxAllowedY = dangerZoneY - 5; // Much closer to danger zone
        
        // Calculate maximum row that fits before danger zone
        const maxRow = Math.floor((maxAllowedY - GRID_TOP_MARGIN) / GRID_ROW_HEIGHT);
        const effectiveMaxRows = Math.max(GRID_ROWS, maxRow); // Use at least original GRID_ROWS
        
        console.log('DYNAMIC GRID EXTENSION:', {
            dangerZoneY,
            maxAllowedY,
            maxRow,
            effectiveMaxRows,
            originalGridRows: GRID_ROWS,
            calculatedRowY: maxRow * GRID_ROW_HEIGHT + GRID_TOP_MARGIN
        });
        
        // Extend gridBubbles array if needed
        while (this.gridBubbles.length <= effectiveMaxRows) {
            const newRow = new Array(GRID_COLS).fill(null);
            this.gridBubbles.push(newRow);
        }
        
        // Check nearby grid positions including extended range
        for (let row = 0; row <= effectiveMaxRows; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                // Ensure row exists in gridBubbles array
                if (!this.gridBubbles[row]) {
                    this.gridBubbles[row] = new Array(GRID_COLS).fill(null);
                }
                
                if (this.gridBubbles[row][col] === null) {
                    const gridX = this.getColPosition(row, col);
                    const gridY = this.getRowPosition(row);
                    
                    // Only consider positions that don't exceed danger zone
                    if (gridY <= maxAllowedY) {
                        const distance = Math.sqrt((x - gridX) ** 2 + (y - gridY) ** 2);
                        
                        if (distance < minDistance && distance < BUBBLE_RADIUS * 2.5) {
                            minDistance = distance;
                            bestPosition = { x: gridX, y: gridY, row, col };
                        }
                    }
                }
            }
        }
        
        return bestPosition;
    }

    checkMatches(row, col) {
        const bubble = this.gridBubbles[row][col];
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
                    this.gridBubbles[nRow] && 
                    this.gridBubbles[nRow][nCol] &&
                    this.gridBubbles[nRow][nCol].color === color) {
                    
                    visited.add(key);
                    queue.push({ row: nRow, col: nCol });
                    matches.push({ row: nRow, col: nCol });
                }
            }
        }
        
        // Remove matches if 3 or more
        if (matches.length >= 3) {
            for (const { row: mRow, col: mCol } of matches) {
                const matchedBubble = this.gridBubbles[mRow][mCol];
                if (matchedBubble) {
                    matchedBubble.removing = true;
                    this.removingBubbles.push(matchedBubble);
                    this.gridBubbles[mRow][mCol] = null;
                    this.score += 10;
                }
            }
            
            // Check for floating bubbles
            this.checkFloatingBubbles();
        }
    }

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
            
            if (newRow >= 0 && newRow < this.gridBubbles.length && 
                newCol >= 0 && newCol < GRID_COLS) {
                neighbors.push({ row: newRow, col: newCol });
            }
        }
        
        return neighbors;
    }

    checkFloatingBubbles() {
        // Mark all bubbles connected to top as safe
        const connected = new Set();
        const queue = [];
        
        // Start from top row
        for (let col = 0; col < GRID_COLS; col++) {
            if (this.gridBubbles[0] && this.gridBubbles[0][col]) {
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
                    this.gridBubbles[nRow] && 
                    this.gridBubbles[nRow][nCol]) {
                    
                    connected.add(key);
                    queue.push({ row: nRow, col: nCol });
                }
            }
        }
        
        // Remove floating bubbles from extended grid
        const effectiveRows = this.gridBubbles.length;
        for (let row = 0; row < effectiveRows; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const key = `${row},${col}`;
                if (this.gridBubbles[row] && this.gridBubbles[row][col] && !connected.has(key)) {
                    const floatingBubble = this.gridBubbles[row][col];
                    floatingBubble.falling = true;
                    floatingBubble.enablePhysics(this.engine);
                    this.fallingBubbles.push(floatingBubble);
                    this.gridBubbles[row][col] = null;
                    this.score += 5; // Bonus for floating bubbles
                }
            }
        }
    }

    wouldOverlapPrecise(x, y, excludeRow = -1, excludeCol = -1) {
        const effectiveRows = this.gridBubbles.length;
        for (let row = 0; row < effectiveRows; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (row === excludeRow && col === excludeCol) continue;
                if (this.gridBubbles[row] && this.gridBubbles[row][col]) {
                    const bubble = this.gridBubbles[row][col];
                    const distance = Math.sqrt((x - bubble.x) ** 2 + (y - bubble.y) ** 2);
                    if (distance < BUBBLE_RADIUS * 1.8) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    update() {
        if (this.initializing) return;
        
        // Update game timer for arcade mode
        if (this.gameMode === "arcade" && this.timeLeft > 0 && !this.gameOver) {
            this.timeLeft -= 16.67 / 1000; // Approximate frame time in seconds
            if (this.timeLeft < 0) this.timeLeft = 0;
        }
        
        // Update Matter.js physics
        Engine.update(this.engine);
        
        // Update flying bubbles
        for (let i = this.flyingBubbles.length - 1; i >= 0; i--) {
            const bubble = this.flyingBubbles[i];
            bubble.update();
            
            // Check for collisions with grid bubbles using extended grid
            let collided = false;
            const effectiveRows = this.gridBubbles.length;
            for (let row = 0; row < effectiveRows && !collided; row++) {
                for (let col = 0; col < GRID_COLS && !collided; col++) {
                    if (this.gridBubbles[row] && this.gridBubbles[row][col]) {
                        const gridBubble = this.gridBubbles[row][col];
                        const distance = Math.sqrt(
                            (bubble.x - gridBubble.x) ** 2 + 
                            (bubble.y - gridBubble.y) ** 2
                        );
                        
                        if (distance < BUBBLE_RADIUS * 1.9) {
                            this.snapBubbleToGrid(bubble);
                            this.flyingBubbles.splice(i, 1);
                            collided = true;
                        }
                    }
                }
            }
            
            // Check if bubble hit top
            if (!collided && bubble.y <= BUBBLE_RADIUS) {
                this.snapBubbleToGrid(bubble);
                this.flyingBubbles.splice(i, 1);
            }
            
            // Remove if off screen
            if (!collided && bubble.y > this.canvas.height + BUBBLE_RADIUS) {
                bubble.disablePhysics(this.engine);
                this.flyingBubbles.splice(i, 1);
                this.missedShots++;
            }
        }
        
        // Update falling bubbles
        for (let i = this.fallingBubbles.length - 1; i >= 0; i--) {
            const bubble = this.fallingBubbles[i];
            bubble.update();
            
            if (bubble.y > this.canvas.height + BUBBLE_RADIUS) {
                bubble.disablePhysics(this.engine);
                this.fallingBubbles.splice(i, 1);
            }
        }
        
        // Update removing bubbles
        for (let i = this.removingBubbles.length - 1; i >= 0; i--) {
            const bubble = this.removingBubbles[i];
            bubble.animationTimer = (bubble.animationTimer || 0) + 1;
            
            if (bubble.animationTimer > 30) {
                this.removingBubbles.splice(i, 1);
            }
        }
        
        // Process pending new row descent (only when no flying bubbles)
        if (this.pendingNewRow && this.flyingBubbles.length === 0) {
            this.addNewRow();
            this.pendingNewRow = false;
        }
        
        // Check win/lose conditions
        this.checkGameState();
    }

    checkGameState() {
        // Don't check game state if already over
        if (this.gameOver) return;
        
        // Check if all bubbles cleared (win condition)
        const effectiveRows = this.gridBubbles.length;
        const remainingBubbles = this.gridBubbles.flat().filter(b => b !== null).length;
        if (remainingBubbles === 0) {
            this.gameWon = true;
            this.gameOver = true;
            this.playSound('win');
            this.saveHighScore(this.score);
            console.log('Game won! All bubbles cleared.');
            return;
        }
        
        // Check if bubbles reached the lose line (lose condition)
        // Use the dedicated lose line logic instead of old danger zone calculation
        if (this.checkLoseCondition()) {
            return; // Game over already handled in checkLoseCondition
        }
        
        // Check missed shots limit (lose condition)
        if (this.missedShots >= 5) {
            this.gameOver = true;
            this.gameWon = false;
            this.playSound('lose');
            this.saveHighScore(this.score);
            console.log('Game over! Too many missed shots.');
            return;
        }
        
        // Mode-specific win/lose conditions
        if (this.gameMode === "strategy") {
            // Strategy mode: limited shots
            if (this.shotsLeft <= 0 && this.flyingBubbles.length === 0) {
                this.gameOver = true;
                this.gameWon = false;
                this.playSound('lose');
                this.saveHighScore(this.score);
                console.log('Game over! No shots remaining in strategy mode.');
                return;
            }
        } else if (this.gameMode === "arcade") {
            // Arcade mode: time limit
            if (this.timeLeft <= 0) {
                this.gameOver = true;
                this.gameWon = false;
                this.playSound('lose');
                this.saveHighScore(this.score);
                console.log('Game over! Time expired in arcade mode.');
                return;
            }
        }
        
        // Check if grid is completely full (lose condition)
        let gridFull = true;
        for (let row = 0; row < GRID_ROWS && gridFull; row++) {
            for (let col = 0; col < GRID_COLS && gridFull; col++) {
                if (this.gridBubbles[row][col] === null) {
                    gridFull = false;
                }
            }
        }
        
        if (gridFull) {
            this.gameOver = true;
            this.gameWon = false;
            this.playSound('lose');
            this.saveHighScore(this.score);
            console.log('Game over! Grid is completely full.');
            return;
        }
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid bubbles using extended grid
        const effectiveRows = this.gridBubbles.length;
        for (let row = 0; row < effectiveRows; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (this.gridBubbles[row] && this.gridBubbles[row][col]) {
                    const bubble = this.gridBubbles[row][col];
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
        
        // Draw removing bubbles
        for (const bubble of this.removingBubbles) {
            bubble.draw(this.ctx);
        }
        
        // Draw danger zone line
        this.drawDangerZone();
        
        // Draw shooter
        if (this.shooter) {
            this.shooter.draw(this.ctx);
        }
        
        // Draw UI
        this.drawUI();
    }

    drawDangerZone() {
        // Draw the lose line based on the calculated lose line row
        const loseLineY = this.getRowPosition(this.loseLineRow);
        
        // Find current lowest bubble position using extended grid
        let lowestBubbleRow = 0;
        const effectiveRows = this.gridBubbles.length;
        for (let row = 0; row < effectiveRows; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (this.gridBubbles[row] && this.gridBubbles[row][col]) {
                    lowestBubbleRow = Math.max(lowestBubbleRow, row);
                }
            }
        }
        
        // Calculate how close bubbles are to lose line (0-1, where 1 is at lose line)
        const dangerProgress = Math.max(0, Math.min(1, lowestBubbleRow / this.loseLineRow));
        
        // Change line color based on proximity to lose line
        let lineColor, lineOpacity;
        if (dangerProgress > 0.9) {
            lineColor = '#FF0000'; // Red - critical
            lineOpacity = 0.9;
        } else if (dangerProgress > 0.7) {
            lineColor = '#FF6600'; // Orange - warning
            lineOpacity = 0.7;
        } else if (dangerProgress > 0.5) {
            lineColor = '#FFCC00'; // Yellow - caution
            lineOpacity = 0.5;
        } else {
            lineColor = '#00FF00'; // Green - safe
            lineOpacity = 0.4;
        }
        
        // Draw the lose line
        this.ctx.save();
        this.ctx.strokeStyle = lineColor;
        this.ctx.globalAlpha = lineOpacity;
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([8, 4]); // Dashed line
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, loseLineY);
        this.ctx.lineTo(this.canvas.width, loseLineY);
        this.ctx.stroke();
        
        // Add text label
        this.ctx.setLineDash([]); // Reset line dash
        this.ctx.fillStyle = lineColor;
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('LOSE LINE', this.canvas.width - 10, loseLineY - 8);
        
        // Show row indicator
        this.ctx.textAlign = 'left';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`Row ${this.loseLineRow}`, 10, loseLineY - 8);
        
        this.ctx.restore();
    }

    drawDangerLevelIndicator() {
        // Calculate danger level using lose line logic
        let lowestBubbleRow = 0;
        const effectiveRows = this.gridBubbles.length;
        for (let row = 0; row < effectiveRows; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (this.gridBubbles[row] && this.gridBubbles[row][col]) {
                    lowestBubbleRow = Math.max(lowestBubbleRow, row);
                }
            }
        }
        
        const dangerProgress = Math.max(0, Math.min(1, lowestBubbleRow / this.loseLineRow));
        
        // Only show indicator when bubbles are present and approaching lose line
        if (lowestBubbleRow > 0 && dangerProgress > 0.3) {
            let statusText, statusColor;
            if (dangerProgress > 0.9) {
                statusText = 'CRITICAL!';
                statusColor = '#FF0000';
            } else if (dangerProgress > 0.7) {
                statusText = 'WARNING!';
                statusColor = '#FF6600';
            } else if (dangerProgress > 0.5) {
                statusText = 'CAUTION';
                statusColor = '#FFCC00';
            } else {
                statusText = 'SAFE';
                statusColor = '#00FF88';
            }
            
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillStyle = statusColor;
            this.ctx.fillText(`Danger Level: ${statusText}`, 10, 150);
            
            // Show distance to lose line
            const rowsToLoseLine = this.loseLineRow - lowestBubbleRow;
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`${rowsToLoseLine} rows to lose line`, 10, 170);
        }
    }

    drawUI() {
        // Score
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        
        // Missed shots
        this.ctx.fillText(`Missed: ${this.missedShots}/5`, 10, 60);
        
        // Mode-specific information
        if (this.gameMode === "strategy") {
            this.ctx.fillText(`Shots Left: ${this.shotsLeft}`, 10, 90);
        } else if (this.gameMode === "arcade") {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = Math.floor(this.timeLeft % 60);
            this.ctx.fillText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`, 10, 90);
        }
        
        // Game mode indicator
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#4ECDC4';
        this.ctx.fillText(`Mode: ${this.gameMode.charAt(0).toUpperCase() + this.gameMode.slice(1)}`, 10, 120);
        
        // Descent information
        const settings = this.difficultySettings[this.difficulty];
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#CCCCCC';
        
        // Show shots until next descent
        const shotsUntilDescent = settings.addRowFrequency - this.shotCount;
        this.ctx.fillText(`Next descent: ${shotsUntilDescent} shots`, 10, 140);
        
        // Show time until next descent
        const timeSinceLastDescent = Date.now() - this.lastDescentTime;
        const timeUntilDescent = Math.max(0, settings.timeBasedDescent - timeSinceLastDescent);
        const secondsUntilDescent = Math.ceil(timeUntilDescent / 1000);
        this.ctx.fillText(`or ${secondsUntilDescent}s`, 10, 155);
        
        // Danger level indicator
        this.drawDangerLevelIndicator();
        
        // Game over screen
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.font = 'bold 36px Arial';
            this.ctx.fillStyle = this.gameWon ? '#4ECDC4' : '#FF6B6B';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                this.gameWon ? 'YOU WIN!' : 'GAME OVER',
                this.canvas.width / 2,
                this.canvas.height / 2 - 40
            );
            
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(
                `Final Score: ${this.score}`,
                this.canvas.width / 2,
                this.canvas.height / 2 + 20
            );
            
            // Add restart instruction
            this.ctx.font = 'bold 18px Arial';
            this.ctx.fillStyle = '#FECA57';
            this.ctx.fillText(
                'Press R to Restart or ESC for Menu',
                this.canvas.width / 2,
                this.canvas.height / 2 + 60
            );
            
            this.ctx.textAlign = 'left';
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    playSound(type) {
        // Placeholder for sound effects
        if (!this.soundEnabled) return;
        // Could implement actual sound playing here
    }

    // Method to restart the game with current settings
    restart() {
        console.log('=== RESTARTING GAME ===');
        
        // Reset game state flags
        this.gameOver = false;
        this.gameWon = false;
        this.gameStarted = false;
        
        // Clear all bubble arrays
        this.flyingBubbles.forEach(bubble => bubble.disablePhysics(this.engine));
        this.fallingBubbles.forEach(bubble => bubble.disablePhysics(this.engine));
        this.removingBubbles = [];
        this.flyingBubbles = [];
        this.fallingBubbles = [];
        
        // Reset game variables
        this.score = 0;
        this.missedShots = 0;
        this.pendingNewRow = false;
        
        // Reset infinite stack system
        this.shotCount = 0;
        this.lastDescentTime = Date.now();
        this.infiniteStack = [];
        
        // Reset mode-specific variables
        if (this.gameMode === "strategy") {
            this.shotsLeft = 30;
        } else if (this.gameMode === "arcade") {
            this.timeLeft = 120;
        }
        
        // Reinitialize the game
        this.initGame();
        this.start();
        
        console.log('Game restarted successfully');
    }

    // Game constants
    static get BUBBLE_RADIUS() { return 20; }
    static get BUBBLE_COLORS() { return ['#FF6B6B', '#4ECDC4', '#1E3A8A', '#00FF88', '#FECA57', '#FF9FF3']; }
    static get SHOOTER_SPEED() { return 35; }
    static get GRID_ROWS() { return 10; }
    static get GRID_COLS() { return 14; }
    static get GRID_TOP_MARGIN() { return Game.BUBBLE_RADIUS * 2; }

    // Perfect hexagonal grid constants using mathematical precision
    static get GRID_COL_SPACING() { return Game.BUBBLE_RADIUS * 2; } // Exact bubble diameter for perfect horizontal spacing
    static get GRID_ROW_HEIGHT() { return Game.BUBBLE_RADIUS * Math.sqrt(3); } // Perfect hexagonal row height (√3 * radius)
    static get HEX_OFFSET() { return Game.BUBBLE_RADIUS; } // Exact offset for odd rows in hexagonal pattern

    static get MISSED_SHOTS_LIMIT() { return 5; }
    static get POP_THRESHOLD() { return 3; } // Number of same-colored bubbles needed to pop
    static get POINTS_PER_BUBBLE() { return 10; }
    static get AVALANCHE_BONUS() { return 5; } // Points per bubble in an avalanche
    static get CLEAR_FIELD_BONUS_MULTIPLIER() { return 2; }
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
        
        // Set global reference for bubble wall collision detection
        window.gameInstance = game;
        
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

    // Add keyboard event listeners for restart functionality
    window.addEventListener('keydown', (e) => {
        if (!game) return;
        
        // Only handle restart/menu keys when game is over
        if (game.gameOver) {
            if (e.key === 'r' || e.key === 'R') {
                // Restart game with same settings
                e.preventDefault();
                
                game.restart();
                console.log('Game restarted by user');
            } else if (e.key === 'Escape') {
                // Return to menu
                e.preventDefault();
                
                gameScreen.style.display = 'none';
                gameMenu.style.display = 'block';
                game = null;
                console.log('Returned to menu by user');
            }
        }
    });
});
