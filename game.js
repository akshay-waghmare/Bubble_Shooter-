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
const SHOOTER_SPEED = 50; // Increased from 35 to 50 for faster bubble shooting
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
        
        // 3D renderer integration
        this.bubbleId = 'bubble_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.has3DRepresentation = false;
        
        console.log('BUBBLE CREATED:', {
            position: { x: this.x, y: this.y },
            color: this.color,
            gridPos: { row: this.row, col: this.col },
            stuck: this.stuck,
            bubbleId: this.bubbleId
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

    // 3D renderer integration methods
    create3DRepresentation(renderer3D, options = {}) {
        if (!renderer3D || this.has3DRepresentation) return;
        
        const bubbleOptions = {
            glow: !this.stuck || this.removing, // Flying and removing bubbles glow
            caustics: this.stuck, // Grid bubbles have water-like effects
            wobble: !this.stuck || this.removing, // Flying and popping bubbles wobble
            collision: this.isColliding,
            preview: options.preview || false,
            ...options
        };
        
        // Convert 2D screen coordinates to 3D world coordinates
        const z = this.stuck ? 0 : (this.falling ? -20 : 10); // Flying bubbles in front, falling behind
        
        renderer3D.createBubble(
            this.bubbleId,
            this.x - renderer3D.canvas.width / 2,  // Center the coordinate system
            renderer3D.canvas.height / 2 - this.y,  // Flip Y coordinate for Three.js
            z,
            this.radius,
            this.color,
            bubbleOptions
        );
        
        this.has3DRepresentation = true;
    }
    
    update3DRepresentation(renderer3D) {
        if (!renderer3D || !this.has3DRepresentation) return;
        
        // Convert 2D screen coordinates to 3D world coordinates
        const z = this.stuck ? 0 : (this.falling ? -20 : 10);
        
        renderer3D.updateBubble(
            this.bubbleId,
            this.x - renderer3D.canvas.width / 2,
            renderer3D.canvas.height / 2 - this.y,
            z,
            {
                color: this.color,
                scale: this.scale,
                opacity: this.opacity
            }
        );
    }
    
    remove3DRepresentation(renderer3D, animated = true) {
        if (!renderer3D || !this.has3DRepresentation) return;
        
        renderer3D.removeBubble(this.bubbleId, animated);
        this.has3DRepresentation = false;
    }

    draw(ctx) {
        // If using 3D renderer, handle 3D representation instead of 2D drawing
        if (this.game && this.game.use3D && this.game.renderer3D) {
            // Create 3D representation if it doesn't exist
            if (!this.has3DRepresentation) {
                this.create3DRepresentation(this.game.renderer3D);
            } else {
                // Update existing 3D representation
                this.update3DRepresentation(this.game.renderer3D);
            }
            
            // Handle removal in 3D
            if (this.removing && this.has3DRepresentation) {
                this.remove3DRepresentation(this.game.renderer3D, true);
            }
            
            // For 3D mode, we still draw minimal 2D for UI elements if needed
            // but the main bubble rendering is handled by Three.js
            return;
        }
        
        // Original 2D rendering code follows...
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

        // Ultra-realistic 3D bubble rendering matching the screenshot quality
        const baseColor = this.color;
        
        // Step 1: Enhanced drop shadow for better depth perception
        ctx.beginPath();
        ctx.arc(2, 3, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fill();
        
        // Step 2: Outer subtle glow for premium feel
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 2, 0, Math.PI * 2);
        const outerGlowGradient = ctx.createRadialGradient(0, 0, this.radius, 0, 0, this.radius + 2);
        outerGlowGradient.addColorStop(0, baseColor);
        outerGlowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = outerGlowGradient;
        ctx.globalAlpha = 0.3 * this.opacity;
        ctx.fill();
        
        // Step 3: Main bubble body with ultra-realistic gradient (enhanced)
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        
        const mainGradient = ctx.createRadialGradient(-this.radius * 0.3, -this.radius * 0.3, 0, 0, 0, this.radius * 1.2);
        const lightColor = this.lightenColor(baseColor, 0.8);
        const midLight = this.lightenColor(baseColor, 0.3);
        const midDark = this.darkenColor(baseColor, 0.1);
        const darkColor = this.darkenColor(baseColor, 0.5);
        const veryDarkColor = this.darkenColor(baseColor, 0.7);
        
        mainGradient.addColorStop(0, lightColor);      // Bright highlight area
        mainGradient.addColorStop(0.15, midLight);     // Smooth transition
        mainGradient.addColorStop(0.35, baseColor);    // Main color
        mainGradient.addColorStop(0.65, midDark);      // Subtle darkening
        mainGradient.addColorStop(0.85, darkColor);    // Dark area
        mainGradient.addColorStop(1, veryDarkColor);   // Very dark rim
        
        ctx.fillStyle = mainGradient;
        ctx.globalAlpha = this.opacity;
        ctx.fill();
        
        // Step 4: Bottom shadow for 3D depth illusion
        ctx.beginPath();
        ctx.arc(0, this.radius * 0.2, this.radius * 0.8, 0, Math.PI * 2);
        const bottomShadowGradient = ctx.createRadialGradient(0, this.radius * 0.2, 0, 0, this.radius * 0.2, this.radius * 0.8);
        bottomShadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
        bottomShadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bottomShadowGradient;
        ctx.fill();
        
        // Step 5: Enhanced primary specular highlight (key feature from screenshot)
        ctx.beginPath();
        ctx.arc(-this.radius * 0.2, -this.radius * 0.3, this.radius * 0.4, 0, Math.PI * 2);
        
        const primaryHighlight = ctx.createRadialGradient(
            -this.radius * 0.2, -this.radius * 0.3, 0,
            -this.radius * 0.2, -this.radius * 0.3, this.radius * 0.4
        );
        primaryHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
        primaryHighlight.addColorStop(0.2, 'rgba(255, 255, 255, 0.85)');
        primaryHighlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        primaryHighlight.addColorStop(0.8, 'rgba(255, 255, 255, 0.1)');
        primaryHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = primaryHighlight;
        ctx.fill();
        
        // Step 6: Enhanced secondary bright spot highlight
        ctx.beginPath();
        ctx.arc(-this.radius * 0.05, -this.radius * 0.15, this.radius * 0.15, 0, Math.PI * 2);
        const secondaryHighlight = ctx.createRadialGradient(
            -this.radius * 0.05, -this.radius * 0.15, 0,
            -this.radius * 0.05, -this.radius * 0.15, this.radius * 0.15
        );
        secondaryHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        secondaryHighlight.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
        secondaryHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = secondaryHighlight;
        ctx.fill();
        
        // Step 7: Enhanced tertiary micro highlight for extra realism
        ctx.beginPath();
        ctx.arc(-this.radius * 0.3, -this.radius * 0.1, this.radius * 0.1, 0, Math.PI * 2);
        const tertiaryHighlight = ctx.createRadialGradient(
            -this.radius * 0.3, -this.radius * 0.1, 0,
            -this.radius * 0.3, -this.radius * 0.1, this.radius * 0.1
        );
        tertiaryHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        tertiaryHighlight.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
        tertiaryHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = tertiaryHighlight;
        ctx.fill();
        
        // Step 8: Enhanced rim lighting effect for glass-like appearance
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        const rimGradient = ctx.createRadialGradient(0, 0, this.radius * 0.75, 0, 0, this.radius);
        rimGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        rimGradient.addColorStop(0.88, 'rgba(255, 255, 255, 0)');
        rimGradient.addColorStop(0.94, 'rgba(255, 255, 255, 0.2)');
        rimGradient.addColorStop(1, 'rgba(255, 255, 255, 0.5)');
        ctx.fillStyle = rimGradient;
        ctx.fill();
        
        // Step 8.5: Add subtle curved reflection for premium glass effect
        ctx.beginPath();
        ctx.arc(-this.radius * 0.6, 0, this.radius * 0.25, 0, Math.PI * 2);
        const curvedReflection = ctx.createRadialGradient(
            -this.radius * 0.6, 0, 0,
            -this.radius * 0.6, 0, this.radius * 0.25
        );
        curvedReflection.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        curvedReflection.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        curvedReflection.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = curvedReflection;
        ctx.fill();
        
        // Step 9: Enhanced border with realistic glass edge effect
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        
        let borderColor, borderWidth;
        if (this.isColliding) {
            const collisionProgress = this.collisionAnimationTimer / 30;
            const highlightIntensity = (1 - collisionProgress) * 0.8;
            borderColor = `rgba(255, 255, 255, ${highlightIntensity})`;
            borderWidth = 3;
        } else {
            // Create sophisticated border gradient
            const borderGradient = ctx.createLinearGradient(-this.radius, -this.radius, this.radius, this.radius);
            const darkBorder = this.darkenColor(baseColor, 0.5);
            const lightBorder = this.lightenColor(baseColor, 0.2);
            borderGradient.addColorStop(0, lightBorder);
            borderGradient.addColorStop(0.5, darkBorder);
            borderGradient.addColorStop(1, this.darkenColor(baseColor, 0.7));
            borderColor = borderGradient;
            borderWidth = 1.5;
        }
        
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.stroke();

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
            // Get canvas width from the stored game reference or use a default
            let canvasWidth = 800; // Default fallback
            if (this.game && this.game.canvas) {
                canvasWidth = this.game.canvas.width;
            } else if (window.gameInstance?.canvas?.width) {
                canvasWidth = window.gameInstance.canvas.width;
            }
            
            if (this.x - this.radius <= 0 || this.x + this.radius >= canvasWidth) {
                this.vx *= -0.95; // Energy loss on bounce
                this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
                console.log('BUBBLE UPDATE - Wall bounce detected!', {
                    canvasWidth,
                    bubbleX: this.x,
                    newVx: this.vx,
                    bounceType: this.x - this.radius <= 0 ? 'left' : 'right'
                });
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
    constructor(x, y, game) {
        console.log('SHOOTER CREATED:', { x, y });
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.currentColor = this.getRandomColor();
        this.nextColor = this.getRandomColor();
        this.reloadTime = 300; // ms
        this.lastShot = 0;
        this.engine = null; // Will be set by Game class
        this.game = game; // Store game reference for bubble creation
        
        // 3D representation IDs for shooter bubbles
        this.currentBubble3D = null;
        this.nextBubble3D = null;
        
        console.log('Shooter colors initialized:', { current: this.currentColor, next: this.nextColor });
    }

    getRandomColor() {
        return BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
    }

    draw(ctx) {
        // Check if we're in 3D mode and create 3D representations for shooter bubbles
        if (this.game && this.game.use3D && this.game.renderer3D) {
            // Create 3D representation for current bubble if it doesn't exist
            if (!this.currentBubble3D) {
                this.currentBubble3D = 'shooter_current_' + Date.now();
                this.game.renderer3D.createBubble(
                    this.currentBubble3D,
                    this.x - this.game.renderer3D.canvas.width / 2,
                    this.game.renderer3D.canvas.height / 2 - this.y,
                    15, // Z position in front
                    BUBBLE_RADIUS * 0.8,
                    this.currentColor,
                    { glow: true, preview: true }
                );
            } else {
                // Update position and color
                this.game.renderer3D.updateBubble(
                    this.currentBubble3D,
                    this.x - this.game.renderer3D.canvas.width / 2,
                    this.game.renderer3D.canvas.height / 2 - this.y,
                    15,
                    {
                        color: this.currentColor,
                        scale: 1.0,
                        opacity: 1.0
                    }
                );
            }
            
            // Create 3D representation for next bubble if it doesn't exist
            const nextX = this.x - 50;
            const nextY = this.y + 10;
            if (!this.nextBubble3D) {
                this.nextBubble3D = 'shooter_next_' + Date.now();
                this.game.renderer3D.createBubble(
                    this.nextBubble3D,
                    nextX - this.game.renderer3D.canvas.width / 2,
                    this.game.renderer3D.canvas.height / 2 - nextY,
                    12, // Z position
                    BUBBLE_RADIUS * 0.6,
                    this.nextColor,
                    { glow: true, preview: true }
                );
            } else {
                // Update position and color
                this.game.renderer3D.updateBubble(
                    this.nextBubble3D,
                    nextX - this.game.renderer3D.canvas.width / 2,
                    this.game.renderer3D.canvas.height / 2 - nextY,
                    12,
                    {
                        color: this.nextColor,
                        scale: 0.6,
                        opacity: 0.8
                    }
                );
            }
            
            // Still draw 2D UI elements (shooter base, aim line, labels)
            this.draw2DUIElements(ctx);
            return;
        }
        
        // Original 2D mode
        this.draw2DComplete(ctx);
    }
    
    draw2DUIElements(ctx) {
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

        // Draw aim line with wall bounces
        if (this.canShoot()) {
            this.drawAimLine(ctx, this.x, this.y, this.angle, 800);
        }
        
        // Label for next bubble
        ctx.font = '14px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText('Next', this.x - 70, this.y + 10);
    }
    
    draw2DComplete(ctx) {
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

        // Draw current bubble with modern 3D style
        const bubbleRadius = BUBBLE_RADIUS * 0.8;
        const baseColor = this.currentColor;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Subtle shadow
        ctx.beginPath();
        ctx.arc(0.5, 0.5, bubbleRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
        
        // Main bubble body
        ctx.beginPath();
        ctx.arc(0, 0, bubbleRadius, 0, Math.PI * 2);
        
        const mainGradient = ctx.createRadialGradient(-6, -6, 0, 0, 0, bubbleRadius * 1.2);
        const lightColor = this.lightenColor(baseColor, 0.5);
        const darkColor = this.darkenColor(baseColor, 0.3);
        
        mainGradient.addColorStop(0, lightColor);
        mainGradient.addColorStop(0.3, baseColor);
        mainGradient.addColorStop(0.7, baseColor);
        mainGradient.addColorStop(1, darkColor);
        
        ctx.fillStyle = mainGradient;
        ctx.fill();
        
        // Depth gradient
        ctx.beginPath();
        ctx.arc(0, 0, bubbleRadius, 0, Math.PI * 2);
        const depthGradient = ctx.createRadialGradient(0, -bubbleRadius * 0.3, bubbleRadius * 0.3, 0, bubbleRadius * 0.7, bubbleRadius);
        depthGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        depthGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        ctx.fillStyle = depthGradient;
        ctx.fill();
        
        // Main gloss highlight
        ctx.beginPath();
        ctx.arc(-bubbleRadius * 0.3, -bubbleRadius * 0.4, bubbleRadius * 0.4, 0, Math.PI * 2);
        const glossGradient = ctx.createRadialGradient(
            -bubbleRadius * 0.3, -bubbleRadius * 0.4, 0,
            -bubbleRadius * 0.3, -bubbleRadius * 0.4, bubbleRadius * 0.4
        );
        glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        glossGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        glossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glossGradient;
        ctx.fill();
        
        // Small highlight
        ctx.beginPath();
        ctx.arc(-bubbleRadius * 0.15, -bubbleRadius * 0.25, bubbleRadius * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
        
        // Border
        ctx.beginPath();
        ctx.arc(0, 0, bubbleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = this.darkenColor(baseColor, 0.6);
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();

        // Draw aim line with wall bounces
        if (this.canShoot()) {
            this.drawAimLine(ctx, this.x, this.y, this.angle, 800);
        }

        // Draw next bubble preview with modern 3D style
        const nextBubbleRadius = BUBBLE_RADIUS * 0.6;
        const nextX = this.x - 50;
        const nextY = this.y + 10;
        const nextBaseColor = this.nextColor;
        
        ctx.save();
        ctx.translate(nextX, nextY);
        
        // Subtle shadow
        ctx.beginPath();
        ctx.arc(0.5, 0.5, nextBubbleRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
        
        // Main bubble body
        ctx.beginPath();
        ctx.arc(0, 0, nextBubbleRadius, 0, Math.PI * 2);
        
        const nextMainGradient = ctx.createRadialGradient(-4, -4, 0, 0, 0, nextBubbleRadius * 1.2);
        const nextLightColor = this.lightenColor(nextBaseColor, 0.5);
        const nextDarkColor = this.darkenColor(nextBaseColor, 0.3);
        
        nextMainGradient.addColorStop(0, nextLightColor);
        nextMainGradient.addColorStop(0.3, nextBaseColor);
        nextMainGradient.addColorStop(0.7, nextBaseColor);
        nextMainGradient.addColorStop(1, nextDarkColor);
        
        ctx.fillStyle = nextMainGradient;
        ctx.fill();
        
        // Depth gradient
        ctx.beginPath();
        ctx.arc(0, 0, nextBubbleRadius, 0, Math.PI * 2);
        const nextDepthGradient = ctx.createRadialGradient(0, -nextBubbleRadius * 0.3, nextBubbleRadius * 0.3, 0, nextBubbleRadius * 0.7, nextBubbleRadius);
        nextDepthGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        nextDepthGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        ctx.fillStyle = nextDepthGradient;
        ctx.fill();
        
        // Main gloss highlight
        ctx.beginPath();
        ctx.arc(-nextBubbleRadius * 0.3, -nextBubbleRadius * 0.4, nextBubbleRadius * 0.4, 0, Math.PI * 2);
        const nextGlossGradient = ctx.createRadialGradient(
            -nextBubbleRadius * 0.3, -nextBubbleRadius * 0.4, 0,
            -nextBubbleRadius * 0.3, -nextBubbleRadius * 0.4, nextBubbleRadius * 0.4
        );
        nextGlossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        nextGlossGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        nextGlossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = nextGlossGradient;
        ctx.fill();
        
        // Small highlight
        ctx.beginPath();
        ctx.arc(-nextBubbleRadius * 0.15, -nextBubbleRadius * 0.25, nextBubbleRadius * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
        
        // Border
        ctx.beginPath();
        ctx.arc(0, 0, nextBubbleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = this.darkenColor(nextBaseColor, 0.6);
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
        
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
        
        // CRITICAL: Set game reference for wall bounce detection
        bubble.game = this.game;
        
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
        
        // Update 3D representations when colors change
        if (this.game && this.game.use3D && this.game.renderer3D) {
            // Remove the current 3D bubble (it's now the flying bubble)
            if (this.currentBubble3D) {
                this.game.renderer3D.removeBubble(this.currentBubble3D, false);
                this.currentBubble3D = null;
            }
        }
        
        return bubble;
    }

    update() {
        // No longer needed, but keeping for consistency
    }

    // Cleanup 3D representations when needed
    cleanup3D() {
        if (this.game && this.game.use3D && this.game.renderer3D) {
            // Clean up current bubble 3D representation
            if (this.currentBubble3D) {
                this.game.renderer3D.removeBubble(this.currentBubble3D, false);
                this.currentBubble3D = null;
            }
            
            // Clean up next bubble 3D representation
            if (this.nextBubble3D) {
                this.game.renderer3D.removeBubble(this.nextBubble3D, false);
                this.nextBubble3D = null;
            }
        }
    }

    // Color utility methods needed for bubble rendering
    lightenColor(color, factor) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;
        
        const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
        const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
        const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));
        
        return this.rgbToHex(r, g, b);
    }
    
    darkenColor(color, factor) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;
        
        const r = Math.round(rgb.r * (1 - factor));
        const g = Math.round(rgb.g * (1 - factor));
        const b = Math.round(rgb.b * (1 - factor));
        
        return this.rgbToHex(r, g, b);
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
}

class Game {
    constructor(canvas) {
        console.log('=== GAME CONSTRUCTOR START ===');
        
        try {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            console.log('✅ Canvas and 2D context initialized');
            
            // RENDERING MODE SELECTION
            this.use3D = true; // Set to true for 3D mode, false for 2D mode
            this.renderer3D = null;
            this.trailRenderer = null;
            
            // Initialize 3D renderer if enabled and Three.js is available
            if (this.use3D && typeof THREE !== 'undefined') {
                try {
                    console.log('Initializing 3D bubble renderer...');
                    this.renderer3D = new BubbleRenderer3D(canvas);
                    console.log('✅ 3D renderer created');
                    this.trailRenderer = new BubbleTrailRenderer(this.renderer3D.scene, this.renderer3D.camera);
                    console.log('✅ 3D renderer initialized successfully');
                } catch (error) {
                    console.warn('⚠️ 3D renderer failed to initialize, falling back to 2D:', error);
                    this.use3D = false;
                    this.renderer3D = null;
                    this.trailRenderer = null;
                }
            } else if (this.use3D) {
                console.warn('⚠️ Three.js not available, falling back to 2D rendering');
                this.use3D = false;
            }
            
            console.log(`🎨 Rendering mode: ${this.use3D ? '3D (Three.js)' : '2D (Canvas)'}`);
            
            console.log('Initializing Matter.js physics engine...');
            // Initialize Matter.js physics engine
            this.engine = Engine.create();
            this.engine.world.gravity.y = 0.4; // Reduced gravity for bubble shooter feel
            this.engine.world.gravity.x = 0;
            console.log('✅ Matter.js engine created');
            
            console.log('Setting canvas dimensions...');
            // Set initial canvas dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const maxWidth = Math.min(viewportWidth - 20, 400);
            const portraitHeight = Math.min(viewportHeight - 100, maxWidth * 1.6);
            
            canvas.width = maxWidth;
            canvas.height = portraitHeight;
            console.log('✅ Canvas dimensions set');
            
        } catch (error) {
            console.error('❌ CRITICAL ERROR in Game constructor (early stage):', error);
            throw error;
        }
        
        try {
            console.log('Creating physics walls...');
            // Create invisible walls AFTER canvas dimensions are set
            this.createWalls();
            console.log('✅ Physics walls created');
            
            console.log('Canvas dimensions set:', { width: canvas.width, height: canvas.height });
            console.log('Matter.js engine initialized');
            
            console.log('Initializing bubble arrays...');
            this.gridBubbles = []; // 2D array representing the grid of bubbles
            this.flyingBubbles = []; // Bubbles that are currently moving
            this.removingBubbles = []; // Bubbles that are being removed
            this.fallingBubbles = []; // Bubbles that are falling
            console.log('✅ Bubble arrays initialized');
            
        } catch (error) {
            console.error('❌ CRITICAL ERROR in Game constructor (middle stage):', error);
            throw error;
        }
        
        try {
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
        console.log('✅ Event listeners set up');
        
        console.log('=== CALLING initGame ===');
        this.initGame(); // Initialize the game grid and basic setup
        console.log('✅ Game initialized');
        
        // CRITICAL: Mark initialization as complete
        this.initializing = false;
        console.log('=== INITIALIZATION COMPLETE ===');
        
        console.log('=== STARTING gameLoop ===');
        this.gameLoop(); // Start the rendering loop
        console.log('✅ Game loop started');
        
        console.log('=== GAME CONSTRUCTOR END ===');
        console.log('Final bubble counts:', {
            gridBubbles: this.gridBubbles.flat().filter(b => b !== null).length,
            flyingBubbles: this.flyingBubbles.length,
            fallingBubbles: this.fallingBubbles.length,
            removingBubbles: this.removingBubbles.length
        });
        
        } catch (error) {
            console.error('❌ CRITICAL ERROR in Game constructor (final stage):', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
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
                    // CRITICAL: Set game reference for wall bounce detection
                    bubble.game = this;
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
        
        console.log(`Generating infinite stack with effectiveGridCols: ${effectiveGridCols} (canvas width: ${this.canvas.width})`);
        
        // Generate 20 rows ahead for the infinite stack
        for (let stackRow = 0; stackRow < 20; stackRow++) {
            const rowData = new Array(effectiveGridCols).fill(null);
            
            // CRITICAL: Always fill ALL valid columns for new descending rows
            // This ensures maximum pressure and strategic challenge
            for (let col = 0; col < effectiveGridCols; col++) {
                let color;
                
                // Smart color generation algorithm for strategic gameplay
                if (col > 0 && rowData[col-1] && Math.random() < 0.4) {
                    // 40% chance to match previous column for horizontal clusters
                    color = rowData[col-1];
                } else if (stackRow > 0 && this.infiniteStack[stackRow-1] && 
                          this.infiniteStack[stackRow-1].bubbles[col] && Math.random() < 0.3) {
                    // 30% chance to match above bubble for vertical clusters
                    color = this.infiniteStack[stackRow-1].bubbles[col];
                } else {
                    // Random color from available subset
                    color = colorSubset[Math.floor(Math.random() * colorSubset.length)];
                }
                
                // GUARANTEE: Every position gets a bubble (no null values)
                rowData[col] = color;
            }
            
            // Store row data with metadata to ensure consistency
            const rowWithMetadata = {
                bubbles: rowData,
                effectiveGridCols: effectiveGridCols,
                generatedAt: Date.now(),
                canvasWidth: this.canvas.width
            };
            
            this.infiniteStack.push(rowWithMetadata);
        }
        
        console.log('Infinite stack generated with', this.infiniteStack.length, 'completely filled rows');
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
        
        // Get the next row from infinite stack (now includes metadata)
        const newRowWithMetadata = this.infiniteStack.shift();
        const newRowData = newRowWithMetadata.bubbles;
        const storedEffectiveGridCols = newRowWithMetadata.effectiveGridCols;
        
        // Calculate current effective grid cols for comparison/validation
        const maxBubblesPerRow = Math.floor((this.canvas.width - BUBBLE_RADIUS * 2) / GRID_COL_SPACING);
        const currentEffectiveGridCols = Math.min(GRID_COLS, maxBubblesPerRow);
        
        // Log for debugging - this helps us track when mismatches occur
        console.log(`Using row with stored effectiveGridCols: ${storedEffectiveGridCols}, current would be: ${currentEffectiveGridCols}`);
        if (storedEffectiveGridCols !== currentEffectiveGridCols) {
            console.warn(`🚨 Canvas width changed! Generated: ${storedEffectiveGridCols}, Current: ${currentEffectiveGridCols}, Canvas: ${this.canvas.width}px (was ${newRowWithMetadata.canvasWidth}px)`);
        }
        
        // Extend grid if needed to accommodate the descent
        const maxNeededRows = this.loseLineRow + 3; // Allow some buffer beyond lose line
        while (this.gridBubbles.length < maxNeededRows) {
            this.gridBubbles.push(new Array(GRID_COLS).fill(null));
        }
        
        // Start descent animation for all existing bubbles simultaneously with new row creation
        const descentDurationMs = 300; // Fixed duration for smooth, synchronized animation
        const fadeDurationMs = 300; // Same duration for perfect sync
        const animationStartTime = Date.now(); // Single timestamp for perfect synchronization
        
        for (let row = this.gridBubbles.length - 1; row >= 1; row--) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (this.gridBubbles[row - 1][col]) {
                    const bubble = this.gridBubbles[row - 1][col];
                    
                    // Store starting position for smooth animation
                    bubble.startX = bubble.x;
                    bubble.startY = bubble.y;
                    
                    // Calculate target position for smooth animation
                    const targetX = this.getColPosition(row, col);
                    const targetY = this.getRowPosition(row);
                    
                    // Set up time-based descent animation
                    bubble.targetRow = row;
                    bubble.targetCol = col;
                    bubble.targetX = targetX;
                    bubble.targetY = targetY;
                    bubble.isDescending = true;
                    bubble.descentStartTime = animationStartTime;
                    bubble.descentDuration = descentDurationMs;
                    
                    // Move bubble to new grid position but keep visual position for animation
                    this.gridBubbles[row][col] = bubble;
                    this.gridBubbles[row - 1][col] = null;
                    
                    // Update logical position
                    bubble.row = row;
                    bubble.col = col;
                }
            }
        }
        
        // Add new row at the top (row 0) with synchronized entry animation
        // CRITICAL FIX: Use the stored effectiveGridCols instead of recalculating
        const effectiveGridCols = storedEffectiveGridCols;
        
        console.log(`Creating new top row with ${effectiveGridCols} bubbles (completely filled) from stored metadata`);
        
        // CRITICAL: Ensure EVERY valid column gets a bubble
        for (let col = 0; col < effectiveGridCols; col++) {
            // Get color from infinite stack data, but guarantee it exists
            let color = newRowData[col];
            
            // Fallback: If for any reason the infinite stack doesn't have a color, generate one
            if (!color) {
                const settings = this.difficultySettings[this.difficulty];
                const colorSubset = BUBBLE_COLORS.slice(0, settings.colors);
                color = colorSubset[Math.floor(Math.random() * colorSubset.length)];
                console.warn(`Missing color at col ${col}, using fallback: ${color}`);
            }
            
            // Calculate final position
            const finalX = this.getColPosition(0, col);
            const finalY = this.getRowPosition(0);
            
            // Start position (above visible area for smooth entry)
            const startY = finalY - GRID_ROW_HEIGHT;
            
            // Create bubble starting above the grid
            const bubble = new Bubble(finalX, startY, color, 0, col);
            // CRITICAL: Set game reference for wall bounce detection
            bubble.game = this;
            bubble.stuck = true;
            bubble.vx = 0;
            bubble.vy = 0;
            
            // Store starting position for smooth animation
            bubble.startX = finalX;
            bubble.startY = startY;
            
            // Add synchronized time-based descent animation (same as existing bubbles)
            bubble.targetX = finalX;
            bubble.targetY = finalY;
            bubble.isDescending = true;
            bubble.descentStartTime = animationStartTime;
            bubble.descentDuration = descentDurationMs;
            
            // Add fade-in animation properties (perfectly synchronized with descent)
            bubble.isFadingIn = true;
            bubble.fadeInStartTime = animationStartTime;
            bubble.fadeInDuration = fadeDurationMs;
            bubble.opacity = 0; // Start invisible
            
            // Place bubble in grid (logical position)
            this.gridBubbles[0][col] = bubble;
            this.totalBubbles++;
        }
        
        console.log(`✓ New top row created with ${effectiveGridCols} bubbles`);
        
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
                    // Cleanup 3D representations on lose line condition
                    if (this.shooter) {
                        this.shooter.cleanup3D();
                    }
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
            this.flyingBubbles.splice(index,  1);
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
            this.shooter = new Shooter(this.canvas.width / 2, this.canvas.height - 50, this);
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
                    queue.push({ row: nRow, col });
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
        
        // Update descending bubbles with smooth animation and fade-in effects
        const effectiveRows = this.gridBubbles.length;
        for (let row = 0; row < effectiveRows; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (this.gridBubbles[row] && this.gridBubbles[row][col]) {
                    const bubble = this.gridBubbles[row][col];
                    
                    // Handle descent animation
                    if (bubble.isDescending) {
                        const currentTime = Date.now();
                        const elapsed = currentTime - bubble.descentStartTime;
                        const progress = Math.min(elapsed / bubble.descentDuration, 1);
                        
                        if (progress < 1) {
                            // Smooth interpolation from start to target position
                            bubble.x = bubble.startX + (bubble.targetX - bubble.startX) * progress;
                            bubble.y = bubble.startY + (bubble.targetY - bubble.startY) * progress;
                        } else {
                            // Animation complete - snap to final position
                            bubble.x = bubble.targetX;
                            bubble.y = bubble.targetY;
                            bubble.isDescending = false;
                            bubble.startX = undefined;
                            bubble.startY = undefined;
                            bubble.targetX = undefined;
                            bubble.targetY = undefined;
                            bubble.descentStartTime = undefined;
                            bubble.descentDuration = undefined;
                        }
                    }
                    
                    // Handle fade-in animation for new bubbles
                    if (bubble.isFadingIn) {
                        const currentTime = Date.now();
                        const elapsed = currentTime - bubble.fadeInStartTime;
                        const progress = Math.min(elapsed / bubble.fadeInDuration, 1);
                        
                        bubble.opacity = progress;
                        
                        if (progress >= 1) {
                            bubble.opacity = 1;
                            bubble.isFadingIn = false;
                            bubble.fadeInStartTime = undefined;
                            bubble.fadeInDuration = undefined;
                        }
                    }
                }
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
            // Cleanup 3D representations on game win
            if (this.shooter) {
                this.shooter.cleanup3D();
            }
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
            // Cleanup 3D representations on game over
            if (this.shooter) {
                this.shooter.cleanup3D();
            }
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
                // Cleanup 3D representations on strategy mode game over
                if (this.shooter) {
                    this.shooter.cleanup3D();
                }
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
                // Cleanup 3D representations on arcade mode game over
                if (this.shooter) {
                    this.shooter.cleanup3D();
                }
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
            // Cleanup 3D representations on grid full game over
            if (this.shooter) {
                this.shooter.cleanup3D();
            }
            this.playSound('lose');
            this.saveHighScore(this.score);
            console.log('Game over! Grid is completely full.');
            return;
        }
    }

    draw() {
        // Handle 3D rendering mode
        if (this.use3D && this.renderer3D) {
            // Render the 3D scene
            this.renderer3D.render();
            
            // For 3D mode, we still need to draw 2D UI elements on top
            // Clear only small areas for UI instead of the entire canvas
            this.drawDangerZone();
            
            // Draw shooter (2D overlay in 3D mode for UI consistency)
            if (this.shooter) {
                this.shooter.draw(this.ctx);
            }
            
            // Draw UI overlay
            this.drawUI();
            return;
        }
        
        // Traditional 2D rendering mode
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
        
        // Cleanup 3D representations
        if (this.shooter) {
            this.shooter.cleanup3D();
        }
        
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
    console.log('🔄 Window load event fired - initializing menu...');
    
    const canvas = document.getElementById('gameCanvas');
    const gameMenu = document.getElementById('gameMenu');
    const gameScreen = document.getElementById('gameScreen');
    const leaderboard = document.getElementById('leaderboard');
    const startGameBtn = document.getElementById('startGame');
    const backToMenuBtn = document.getElementById('backToMenu');
    const showLeaderboardBtn = document.getElementById('showLeaderboard');
    const backToMenuFromLeaderboardBtn = document.getElementById('backToMenuFromLeaderboard');
    const toggleSoundBtn = document.getElementById('toggleSound');
    
    console.log('📋 Element detection:', {
        canvas: !!canvas,
        gameMenu: !!gameMenu,
        gameScreen: !!gameScreen,
        startGameBtn: !!startGameBtn,
        backToMenuBtn: !!backToMenuBtn
    });
    
    // Check for missing critical elements
    if (!canvas || !gameMenu || !gameScreen || !startGameBtn) {
        console.error('❌ Critical elements missing!');
        console.error('Missing elements:', {
            canvas: !canvas ? 'gameCanvas' : null,
            gameMenu: !gameMenu ? 'gameMenu' : null,
            gameScreen: !gameScreen ? 'gameScreen' : null,
            startGameBtn: !startGameBtn ? 'startGame' : null
        });
        return;
    }
    
    console.log('✅ All critical elements found - proceeding with initialization');
    
    let game = null;
    let selectedDifficulty = 'novice';
    
    // Load sound settings from localStorage  
    const savedSoundEnabled = localStorage.getItem('bubbleShooterSoundEnabled');
    let soundEnabled = savedSoundEnabled !== null ? savedSoundEnabled === 'true' : true;
    
    // Update the sound toggle button text to match the loaded setting
    if (toggleSoundBtn) {
        toggleSoundBtn.textContent = `Sound: ${soundEnabled ? 'On' : 'Off'}`;
    }

    // Generate mock leaderboard data
    const generateLeaderboardData = () => {
        const names = [
            'BubbleMaster', 'ShotKing', 'ColorCrush', 'PopStar', 'BubbleNinja',
            'RainbowShooter', 'PrecisionPro', 'BubbleLord', 'ComboQueen', 'SkillShot',
            'BubbleHero', 'AimBot', 'PopWizard', 'BubbleSage', 'ShotGuru',
            'ColorMaster', 'BubbleAce', 'PopChamp', 'TargetKing', 'BubbleLegend',
            'SniperShot', 'BubbleGod', 'PopGenius', 'AimStar', 'BubblePhoenix',
            'ShotMachine', 'ColorSniper', 'BubbleTitan', 'PopExpert', 'BubbleElite'
        ];
        
        const difficulties = ['Novice', 'Easy', 'Medium', 'Hard', 'Master'];
        
        return names.map((name, index) => ({
            rank: index + 1,
            name: name,
            score: Math.floor(Math.random() * 50000) + 10000 - (index * 500),
            level: Math.floor(Math.random() * 20) + 1,
            difficulty: difficulties[Math.floor(Math.random() * difficulties.length)]
        })).sort((a, b) => b.score - a.score).map((player, index) => ({
            ...player,
            rank: index + 1
        }));
    };

    // Populate horizontal leaderboard
    const populateHorizontalLeaderboard = () => {
        const leaderboardContainer = document.getElementById('horizontalLeaderboard');
        if (!leaderboardContainer) return;
        
        const players = generateLeaderboardData();
        leaderboardContainer.innerHTML = '';
        
        players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${player.rank <= 3 ? 'top-3' : ''} ${player.rank === 1 ? 'rank-1' : ''}`;
            
            playerCard.innerHTML = `
                <div class="player-rank rank-${player.rank}">#${player.rank}</div>
                <div class="player-name">${player.name}</div>
                <div class="player-score">${player.score.toLocaleString()}</div>
                <div class="player-level">Lv.${player.level}</div>
            `;
            
            leaderboardContainer.appendChild(playerCard);
        });
    };

    // Initialize horizontal leaderboard
    populateHorizontalLeaderboard();

    // Handle difficulty selection (removed game mode selection)
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
        console.log('🎯 START GAME BUTTON CLICKED!');
        console.log('Selected settings:', { difficulty: selectedDifficulty, sound: soundEnabled });
        
        try {
            gameMenu.style.display = 'none';
            gameScreen.style.display = 'block';
            
            console.log('🎮 Creating game instance...');
            
            // Initialize game with selected settings
            game = new Game(canvas);
            console.log('✅ Game constructor completed');
            
            game.difficulty = selectedDifficulty;
            game.soundEnabled = soundEnabled;
            
            console.log('✅ Game settings applied');
            
            // Set global reference for bubble wall collision detection
            window.gameInstance = game;
            
            console.log('🚀 Starting game...');
            game.start(); // Start the game with the chosen settings
            console.log('✅ Game started successfully!');
            
        } catch (error) {
            console.error('❌ Error in start game handler:', error);
            console.error('Error stack:', error.stack);
            
            // Show error to user
            alert(`Game failed to start: ${error.message}\nCheck console for details.`);
            
            // Restore menu
            gameMenu.style.display = 'block';
            gameScreen.style.display = 'none';
        }
    });

    // Back to Menu button
    backToMenuBtn.addEventListener('click', () => {
        // Cleanup 3D representations before returning to menu
        if (game && game.shooter) {
            game.shooter.cleanup3D();
        }
        
        gameScreen.style.display = 'none';
        gameMenu.style.display = 'block';
        game = null; // Clear game reference
        console.log('Returned to menu via Back button');
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
                    <td>${score.difficulty}</td>
                    <td>${new Date(score.date).toLocaleDateString()}</td>
                `;
                scoresList.appendChild(row);
            });
        } else {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4">No high scores yet!</td>';
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

    // Bottom Navigation Event Listeners
    const dailyChallengeBtn = document.getElementById('dailyChallenge');
    const homeNavBtn = document.getElementById('homeNav');
    const shopNavBtn = document.getElementById('shopNav');
    
    // Daily Challenge button
    if (dailyChallengeBtn) {
        dailyChallengeBtn.addEventListener('click', () => {
            console.log('Daily Challenge clicked');
            // Update active state
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            dailyChallengeBtn.classList.add('active');
            
            // For now, show an alert - this can be replaced with actual daily challenge functionality
            alert('🏆 Daily Challenge\n\nComing Soon!\nGet ready for special daily challenges with unique rewards and leaderboards!');
        });
    }
    
    // Home navigation button
    if (homeNavBtn) {
        homeNavBtn.addEventListener('click', () => {
            console.log('Home navigation clicked');
            // Update active state
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            homeNavBtn.classList.add('active');
            
            // Return to main menu if not already there
            if (gameScreen.style.display !== 'none') {
                // Cleanup 3D representations before returning to menu
                if (game && game.shooter) {
                    game.shooter.cleanup3D();
                }
                gameScreen.style.display = 'none';
                game = null;
            }
            if (leaderboard.style.display !== 'none') {
                leaderboard.style.display = 'none';
            }
            gameMenu.style.display = 'block';
        });
    }
    
    // Shop navigation button
    if (shopNavBtn) {
        shopNavBtn.addEventListener('click', () => {
            console.log('Shop navigation clicked');
            // Update active state
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            shopNavBtn.classList.add('active');
            
            // For now, show an alert - this can be replaced with actual shop functionality
            alert('🛒 Bubble Shop\n\nComing Soon!\nBuy special bubble effects, power-ups, and customization options!');
        });
    }

    // Settings Popup Event Listeners
    const settingsGear = document.getElementById('settingsGear');
    const settingsPopup = document.getElementById('settingsPopup');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const closeSettingsBtn = document.getElementById('closeSettings');
    const musicToggle = document.getElementById('musicToggle');
    const soundToggleSettings = document.getElementById('soundToggle');
    const playerIdDisplay = document.getElementById('playerIdDisplay');
    
    // Generate unique player ID if not exists
    let playerId = localStorage.getItem('bubbleShooterPlayerId');
    if (!playerId) {
        playerId = 'BS-' + new Date().getFullYear() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        localStorage.setItem('bubbleShooterPlayerId', playerId);
    }
    if (playerIdDisplay) {
        playerIdDisplay.textContent = playerId;
    }
    
    // Load saved settings
    const savedMusicSetting = localStorage.getItem('bubbleShooterMusicEnabled');
    const savedSoundSetting = localStorage.getItem('bubbleShooterSoundEnabled');
    
    let musicEnabled = savedMusicSetting !== null ? savedMusicSetting === 'true' : true;
    let soundEffectsEnabled = savedSoundSetting !== null ? savedSoundSetting === 'true' : true;
    
    // Update toggle states
    if (musicToggle) musicToggle.checked = musicEnabled;
    if (soundToggleSettings) soundToggleSettings.checked = soundEffectsEnabled;
    
    // Open settings popup
    if (settingsGear) {
        settingsGear.addEventListener('click', () => {
            console.log('Settings gear clicked');
            settingsPopup.classList.add('show');
            settingsOverlay.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        });
    }
    
    // Close settings popup function
    const closeSettingsPopup = () => {
        settingsPopup.classList.remove('show');
        settingsOverlay.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
    };
    
    // Close settings popup - close button
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettingsPopup);
    }
    
    // Close settings popup - overlay click
    if (settingsOverlay) {
        settingsOverlay.addEventListener('click', closeSettingsPopup);
    }
    
    // Close settings popup - escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsPopup.classList.contains('show')) {
            closeSettingsPopup();
        }
    });
    
    // Music toggle
    if (musicToggle) {
        musicToggle.addEventListener('change', () => {
            musicEnabled = musicToggle.checked;
            localStorage.setItem('bubbleShooterMusicEnabled', musicEnabled.toString());
            console.log('Music toggled:', musicEnabled ? 'ON' : 'OFF');
            
            // Apply to game if it exists
            if (game) {
                game.musicEnabled = musicEnabled;
            }
        });
    }
    
    // Sound effects toggle
    if (soundToggleSettings) {
        soundToggleSettings.addEventListener('change', () => {
            soundEffectsEnabled = soundToggleSettings.checked;
            localStorage.setItem('bubbleShooterSoundEnabled', soundEffectsEnabled.toString());
            console.log('Sound effects toggled:', soundEffectsEnabled ? 'ON' : 'OFF');
            
            // Sync with existing sound toggle and apply to game
            soundEnabled = soundEffectsEnabled;
            toggleSoundBtn.textContent = `Sound: ${soundEnabled ? 'On' : 'Off'}`;
            
            if (game) {
                game.soundEnabled = soundEnabled;
            }
        });
    }

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
                
                // Cleanup 3D representations before returning to menu
                if (game && game.shooter) {
                    game.shooter.cleanup3D();
                }
                
                gameScreen.style.display = 'none';
                gameMenu.style.display = 'block';
                game = null;
                console.log('Returned to menu by user');
            }
        }
    });
    
    console.log('✅ All event listeners attached successfully!');
    console.log('🎮 Game initialization complete - Start Game button should be functional');
});
