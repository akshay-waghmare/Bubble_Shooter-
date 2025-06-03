// Bubble class - Core bubble entity with physics, rendering, and state management

import { GAME_CONFIG } from '../../config/gameConfig.js';

export class Bubble {
    constructor(x, y, color, row = -1, col = -1) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = GAME_CONFIG.BUBBLE.RADIUS;
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
        
        // Collision animation properties
        this.isColliding = false;
        this.collisionAnimationTimer = 0;
        
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
        if (this.body) {
            console.warn('[Bubble] enablePhysics: already has physics body');
            return;
        }
        if (!engine) {
            console.error('[Bubble] enablePhysics: engine is undefined');
            return;
        }
        const { Bodies, World } = Matter;
        this.body = Bodies.circle(this.x, this.y, this.radius, {
            restitution: 0.8, // Bounciness
            friction: 0.1,
            frictionAir: 0.01, // Air resistance
            density: 0.001,
            label: 'bubble'
        });
        World.add(engine.world, this.body);
        this.isPhysicsEnabled = true;
        console.log('[Bubble] Physics enabled for bubble at:', { x: this.x, y: this.y, bubbleId: this.bubbleId });
    }

    // Disable physics and stick to grid
    disablePhysics(engine) {
        console.log('disablePhysics called with:', { engine, body: this.body });
        if (!this.body) {
            console.log('No body to remove, returning early');
            return;
        }
        
        if (!engine) {
            console.error('Engine is undefined in disablePhysics!');
            return;
        }
        
        if (!engine.world) {
            console.error('Engine.world is undefined in disablePhysics!', engine);
            return;
        }
        
        const { World } = Matter;
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
            const { Body } = Matter;
            Body.setVelocity(this.body, { x: vx, y: vy });
        }
    }

    // Apply force to bubble
    applyForce(fx, fy) {
        if (this.body && this.isPhysicsEnabled) {
            const { Body } = Matter;
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
        
        // 2D Rendering
        this._draw2D(ctx);
    }

    _draw2D(ctx) {
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
            this._drawRemovalAnimation(ctx);
            return;
        }

        this._drawMainBubble(ctx);
    }

    _drawRemovalAnimation(ctx) {
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
    }

    _drawMainBubble(ctx) {
        // Apply wobble effect for newly placed bubbles or collision response
        const timeSinceCreation = performance.now() - this.creationTime;
        if (timeSinceCreation < 500 && this.stuck) {
            this.wobbleAmplitude = Math.max(0, 3 * (1 - timeSinceCreation / 500));
        }
        
        // Enhanced wobble effect during collision
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
        
        // Add collision impact scale effect
        let collisionScale = 1;
        if (this.isColliding) {
            const collisionProgress = this.collisionAnimationTimer / 30;
            collisionScale = 1 + Math.sin(this.collisionAnimationTimer * 0.3) * (1 - collisionProgress) * 0.15;
        }
        
        ctx.save();
        ctx.translate(this.x + wobbleX, this.y + wobbleY);
        ctx.scale(pulseScale * this.scale * collisionScale, pulseScale * this.scale * collisionScale);

        this._drawBubbleWithEffects(ctx);
        
        ctx.restore();
    }

    _drawBubbleWithEffects(ctx) {
        const baseColor = this.color;
        
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

        // Ultra-realistic 3D bubble rendering
        this._drawRealistic3DBubble(ctx, baseColor);

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
    }

    _drawRealistic3DBubble(ctx, baseColor) {
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
        
        // Step 3: Main bubble body with ultra-realistic gradient
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
        
        // Add all the realistic lighting effects
        this._drawLightingEffects(ctx);
        
        // Enhanced border with realistic glass edge effect
        this._drawBorder(ctx, baseColor);
    }

    _drawLightingEffects(ctx) {
        // Bottom shadow for 3D depth illusion
        ctx.beginPath();
        ctx.arc(0, this.radius * 0.2, this.radius * 0.8, 0, Math.PI * 2);
        const bottomShadowGradient = ctx.createRadialGradient(0, this.radius * 0.2, 0, 0, this.radius * 0.2, this.radius * 0.8);
        bottomShadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
        bottomShadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bottomShadowGradient;
        ctx.fill();
        
        // Enhanced primary specular highlight
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
        
        // Secondary bright spot highlight
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
        
        // Tertiary micro highlight for extra realism
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
        
        // Rim lighting effect for glass-like appearance
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        const rimGradient = ctx.createRadialGradient(0, 0, this.radius * 0.75, 0, 0, this.radius);
        rimGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        rimGradient.addColorStop(0.88, 'rgba(255, 255, 255, 0)');
        rimGradient.addColorStop(0.94, 'rgba(255, 255, 255, 0.2)');
        rimGradient.addColorStop(1, 'rgba(255, 255, 255, 0.5)');
        ctx.fillStyle = rimGradient;
        ctx.fill();
        
        // Subtle curved reflection for premium glass effect
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
    }

    _drawBorder(ctx, baseColor) {
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

    update(deltaTime = 1) {
        if (this.removing) {
            // Use deltaTime for animation speed if needed
            this.animationTimer = (this.animationTimer || 0) + deltaTime;
            return;
        }
        
        // Sync position with physics if enabled
        if (this.isPhysicsEnabled) {
            this.syncWithPhysics();
        } else if (!this.stuck && !this.falling) {
            // Manual physics for flying bubbles (when not using Matter.js physics)
            this.x += (this.vx || 0) * deltaTime;
            this.y += (this.vy || 0) * deltaTime;
            
            // Handle wall bounces for flying bubbles
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
                this.y += 5 * deltaTime; // Fallback if physics disabled
            }
            
            // Add rotation and scale effect while falling
            this.pulsePhase += 0.2 * deltaTime;
            this.scale = Math.max(0.1, this.scale - 0.02 * deltaTime);
            this.opacity = Math.max(0, this.opacity - 0.03 * deltaTime);
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
