// Shooter class - Handles bubble shooting mechanics and aiming

import { GAME_CONFIG } from '../../config/gameConfig.js';
import { Bubble } from './bubble.js';

export class Shooter {
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
        this.shootCallCount = 0; // Debug counter
        
        // 3D representation IDs for shooter bubbles
        this.currentBubble3D = null;
        this.nextBubble3D = null;
        
        console.log('Shooter colors initialized:', { current: this.currentColor, next: this.nextColor });
    }

    getRandomColor() {
        return GAME_CONFIG.BUBBLE.COLORS[Math.floor(Math.random() * GAME_CONFIG.BUBBLE.COLORS.length)];
    }

    draw(ctx) {
        // Check if we're in 3D mode and create 3D representations for shooter bubbles
        if (this.game && this.game.use3D && this.game.renderer3D) {
            this._handle3DRendering();
            // Still draw 2D UI elements (shooter base, aim line, labels)
            this.draw2DUIElements(ctx);
            return;
        }
        
        // Original 2D mode
        this.draw2DComplete(ctx);
    }

    _handle3DRendering() {
        const renderer3D = this.game.renderer3D;
        
        // Create 3D representation for current bubble if it doesn't exist
        if (!this.currentBubble3D) {
            this.currentBubble3D = 'shooter_current_' + Date.now();
            renderer3D.createBubble(
                this.currentBubble3D,
                this.x - renderer3D.canvas.width / 2,
                renderer3D.canvas.height / 2 - this.y,
                15, // Z position in front
                GAME_CONFIG.BUBBLE.RADIUS * 0.8,
                this.currentColor,
                { glow: true, preview: true }
            );
        } else {
            // Update position and color
            renderer3D.updateBubble(
                this.currentBubble3D,
                this.x - renderer3D.canvas.width / 2,
                renderer3D.canvas.height / 2 - this.y,
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
            renderer3D.createBubble(
                this.nextBubble3D,
                nextX - renderer3D.canvas.width / 2,
                renderer3D.canvas.height / 2 - nextY,
                12, // Z position
                GAME_CONFIG.BUBBLE.RADIUS * 0.6,
                this.nextColor,
                { glow: true, preview: true }
            );
        } else {
            // Update position and color
            renderer3D.updateBubble(
                this.nextBubble3D,
                nextX - renderer3D.canvas.width / 2,
                renderer3D.canvas.height / 2 - nextY,
                12,
                {
                    color: this.nextColor,
                    scale: 0.6,
                    opacity: 0.8
                }
            );
        }
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
        this._drawCurrentBubble(ctx);

        // Draw aim line with wall bounces
        if (this.canShoot()) {
            this.drawAimLine(ctx, this.x, this.y, this.angle, 800);
        }

        // Draw next bubble preview with modern 3D style
        this._drawNextBubble(ctx);
        
        // Label for next bubble
        ctx.font = '14px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText('Next', this.x - 70, this.y + 10);
    }

    _drawCurrentBubble(ctx) {
        const bubbleRadius = GAME_CONFIG.BUBBLE.RADIUS * 0.8;
        const baseColor = this.currentColor;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        this._drawBubbleWithEffects(ctx, bubbleRadius, baseColor);
        
        ctx.restore();
    }

    _drawNextBubble(ctx) {
        const nextBubbleRadius = GAME_CONFIG.BUBBLE.RADIUS * 0.6;
        const nextX = this.x - 50;
        const nextY = this.y + 10;
        const nextBaseColor = this.nextColor;
        
        ctx.save();
        ctx.translate(nextX, nextY);
        
        this._drawBubbleWithEffects(ctx, nextBubbleRadius, nextBaseColor);
        
        ctx.restore();
    }

    _drawBubbleWithEffects(ctx, radius, baseColor) {
        // Subtle shadow
        ctx.beginPath();
        ctx.arc(0.5, 0.5, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
        
        // Main bubble body
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        
        const mainGradient = ctx.createRadialGradient(-6, -6, 0, 0, 0, radius * 1.2);
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
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        const depthGradient = ctx.createRadialGradient(0, -radius * 0.3, radius * 0.3, 0, radius * 0.7, radius);
        depthGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        depthGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        ctx.fillStyle = depthGradient;
        ctx.fill();
        
        // Main gloss highlight
        ctx.beginPath();
        ctx.arc(-radius * 0.3, -radius * 0.4, radius * 0.4, 0, Math.PI * 2);
        const glossGradient = ctx.createRadialGradient(
            -radius * 0.3, -radius * 0.4, 0,
            -radius * 0.3, -radius * 0.4, radius * 0.4
        );
        glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        glossGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        glossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glossGradient;
        ctx.fill();
        
        // Small highlight
        ctx.beginPath();
        ctx.arc(-radius * 0.15, -radius * 0.25, radius * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
        
        // Border
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.darkenColor(baseColor, 0.6);
        ctx.lineWidth = 1;
        ctx.stroke();
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
        
        while (remainingLength > 0 && y > GAME_CONFIG.BUBBLE.RADIUS * 2) {
            // Calculate next point
            let nextX = x + Math.cos(currentAngle) * remainingLength;
            let nextY = y + Math.sin(currentAngle) * remainingLength;
            
            // Check for wall collision
            if (nextX < GAME_CONFIG.BUBBLE.RADIUS) {
                // Hit left wall
                const distToWall = Math.abs(x - GAME_CONFIG.BUBBLE.RADIUS);
                const timeToWall = distToWall / Math.abs(Math.cos(currentAngle) * GAME_CONFIG.SHOOTER.SPEED);
                const yAtWall = y + Math.sin(currentAngle) * GAME_CONFIG.SHOOTER.SPEED * timeToWall;
                
                ctx.lineTo(GAME_CONFIG.BUBBLE.RADIUS, yAtWall);
                x = GAME_CONFIG.BUBBLE.RADIUS;
                y = yAtWall;
                currentAngle = Math.PI - currentAngle; // Reflect angle
                remainingLength -= distToWall;
            } else if (nextX > ctx.canvas.width - GAME_CONFIG.BUBBLE.RADIUS) {
                // Hit right wall
                const distToWall = ctx.canvas.width - GAME_CONFIG.BUBBLE.RADIUS - x;
                const timeToWall = distToWall / Math.abs(Math.cos(currentAngle) * GAME_CONFIG.SHOOTER.SPEED);
                const yAtWall = y + Math.sin(currentAngle) * GAME_CONFIG.SHOOTER.SPEED * timeToWall;
                
                ctx.lineTo(ctx.canvas.width - GAME_CONFIG.BUBBLE.RADIUS, yAtWall);
                x = ctx.canvas.width - GAME_CONFIG.BUBBLE.RADIUS;
                y = yAtWall;
                currentAngle = Math.PI - currentAngle; // Reflect angle
                remainingLength -= distToWall;
            } else {
                // No wall collision
                ctx.lineTo(nextX, nextY);
                remainingLength = 0;
            }
        }
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    aimAt(mouseX, mouseY) {
        // Calculate relative position
        const deltaX = mouseX - this.x;
        const deltaY = mouseY - this.y;
        
        // Calculate the angle from shooter to mouse
        let angle = Math.atan2(deltaY, deltaX);
        
        // Only log occasionally to reduce spam
        if (Math.random() < 0.02) { // Log only 2% of the time
            console.log('AIMING DEBUG:', {
                mouseX, mouseY,
                shooterX: this.x, shooterY: this.y,
                deltaX, deltaY,
                rawAngle: angle,
                rawAngleDegrees: (angle * 180 / Math.PI).toFixed(1)
            });
        }
        
        // For bubble shooter, allow wide range but prevent extreme downward shots
        // Allow from -3*PI/4 (bottom-left) to 3*PI/4 (bottom-right)
        if (angle > Math.PI * 0.9) {
            angle = Math.PI * 0.9;
        } else if (angle < -Math.PI * 0.9) {
            angle = -Math.PI * 0.9;
        }
        
        if (Math.random() < 0.02) { // Log only 2% of the time
            console.log('FINAL ANGLE:', {
                finalAngle: angle,
                finalAngleDegrees: (angle * 180 / Math.PI).toFixed(1)
            });
        }
        
        this.angle = angle;
    }

    canShoot() {
        const now = Date.now();
        const timeSinceLastShot = now - this.lastShot;
        const canShoot = timeSinceLastShot >= this.reloadTime;
        
        console.log('[Shooter] canShoot() check:', {
            now: now,
            lastShot: this.lastShot,
            timeSinceLastShot: timeSinceLastShot,
            reloadTime: this.reloadTime,
            canShoot: canShoot
        });
        
        return canShoot;
    }

    shoot() {
        this.shootCallCount++;
        const timestamp = Date.now();
        console.log(`[Shooter] shoot() called #${this.shootCallCount} - timestamp:`, timestamp);
        
        if (!this.canShoot()) {
            console.log('[Shooter] shoot() blocked: canShoot() returned false');
            return null;
        }
        console.log('[Shooter] SHOOTING - creating bubble');
        console.log('[Shooter] Current angle:', this.angle, 'degrees:', (this.angle * 180 / Math.PI).toFixed(1));
        const bubble = new Bubble(this.x, this.y, this.currentColor);
        console.log(`[Shooter] Created bubble with ID: ${bubble.bubbleId} at position (${bubble.x}, ${bubble.y})`);
        
        // CRITICAL: Ensure bubble is NOT stuck for flying
        bubble.stuck = false;
        bubble.falling = false;
        bubble.isPhysicsEnabled = false;
        // CRITICAL: Set game reference for wall bounce detection
        bubble.game = this.game;
        // Set initial velocity for manual physics
        const vx = Math.cos(this.angle) * GAME_CONFIG.SHOOTER.SPEED;
        const vy = Math.sin(this.angle) * GAME_CONFIG.SHOOTER.SPEED;
        bubble.vx = vx;
        bubble.vy = vy;
        console.log('[Shooter] Bubble shot with velocity:', { vx, vy });
        console.log('[Shooter] Bubble state:', { stuck: bubble.stuck, falling: bubble.falling, isPhysicsEnabled: bubble.isPhysicsEnabled });
        // Update shooter colors
        this.currentColor = this.nextColor;
        this.nextColor = this.getRandomColor();
        this.lastShot = timestamp;
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
