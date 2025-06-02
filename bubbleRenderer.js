/**
 * Professional Bubble Renderer - Creates stunning 3D glossy bubbles
 * Scale: 10/10 quality with advanced lighting, materials, and effects
 */
class BubbleRenderer {
    constructor() {
        // Material properties for realistic bubble appearance
        this.materials = {
            // Glass-like properties
            glass: {
                baseOpacity: 0.9,
                refractiveIndex: 1.52,
                specularIntensity: 0.9,
                glossiness: 0.95,
                subsurfaceScattering: 0.3
            },
            
            // Lighting setup
            lighting: {
                ambientStrength: 0.3,
                diffuseStrength: 0.7,
                specularStrength: 0.8,
                rimLightStrength: 0.4
            },
            
            // Color enhancement
            colorEnhancement: {
                saturationBoost: 1.2,
                brightnessBoost: 1.1,
                contrastBoost: 1.15
            }
        };
        
        // Light source configuration (simulating studio lighting)
        this.lightSources = [
            { x: -0.4, y: -0.6, z: 1.0, intensity: 1.0, color: [255, 255, 255] }, // Main key light
            { x: 0.3, y: -0.3, z: 0.8, intensity: 0.6, color: [255, 248, 220] },  // Fill light
            { x: 0.0, y: 0.8, z: 0.5, intensity: 0.3, color: [220, 235, 255] }   // Rim light
        ];
        
        // Cache for gradient objects to improve performance
        this.gradientCache = new Map();
    }
    
    /**
     * Renders a professional-quality 3D bubble
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} radius - Bubble radius
     * @param {string} color - Base color
     * @param {Object} options - Additional rendering options
     */
    renderBubble(ctx, x, y, radius, color, options = {}) {
        const {
            opacity = 1.0,
            scale = 1.0,
            wobble = { x: 0, y: 0 },
            glow = 0,
            collision = false,
            preview = false,
            quality = 'high' // 'low', 'medium', 'high', 'ultra'
        } = options;
        
        const effectiveRadius = radius * scale;
        const cacheKey = `${color}-${effectiveRadius}-${quality}`;
        
        ctx.save();
        ctx.translate(x + wobble.x, y + wobble.y);
        ctx.scale(scale, scale);
        ctx.globalAlpha = opacity;
        
        // Enhanced color processing
        const processedColor = this.enhanceColor(color);
        
        // Render based on quality setting
        switch(quality) {
            case 'ultra':
                this.renderUltraQualityBubble(ctx, effectiveRadius, processedColor, options);
                break;
            case 'high':
                this.renderHighQualityBubble(ctx, effectiveRadius, processedColor, options);
                break;
            case 'medium':
                this.renderMediumQualityBubble(ctx, effectiveRadius, processedColor, options);
                break;
            default:
                this.renderBasicBubble(ctx, effectiveRadius, processedColor, options);
        }
        
        // Additional effects
        if (glow > 0) this.renderGlow(ctx, effectiveRadius, glow);
        if (collision) this.renderCollisionEffect(ctx, effectiveRadius);
        if (preview) this.renderPreviewIndicator(ctx, effectiveRadius);
        
        ctx.restore();
    }
    
    /**
     * Ultra-quality bubble rendering with advanced effects
     */
    renderUltraQualityBubble(ctx, radius, color, options) {
        // Step 1: Subsurface scattering base
        this.renderSubsurfaceScattering(ctx, radius, color);
        
        // Step 2: Multiple depth shadows for volume
        this.renderVolumetricShadows(ctx, radius, color);
        
        // Step 3: Main bubble body with advanced material
        this.renderBubbleBody(ctx, radius, color, 'ultra');
        
        // Step 4: Caustic light patterns
        this.renderCaustics(ctx, radius, color);
        
        // Step 5: Multiple specular highlights
        this.renderSpecularHighlights(ctx, radius, 'ultra');
        
        // Step 6: Fresnel rim lighting
        this.renderFresnelRim(ctx, radius, color);
        
        // Step 7: Surface imperfections and micro-details
        this.renderSurfaceDetails(ctx, radius);
        
        // Step 8: Final border with material properties
        this.renderMaterialBorder(ctx, radius, color);
    }
    
    /**
     * High-quality bubble rendering
     */
    renderHighQualityBubble(ctx, radius, color, options) {
        // Step 1: Drop shadow for depth
        this.renderDropShadow(ctx, radius);
        
        // Step 2: Main bubble body
        this.renderBubbleBody(ctx, radius, color, 'high');
        
        // Step 3: Depth gradient
        this.renderDepthGradient(ctx, radius);
        
        // Step 4: Primary specular highlight
        this.renderSpecularHighlights(ctx, radius, 'high');
        
        // Step 5: Secondary highlights
        this.renderSecondaryHighlights(ctx, radius);
        
        // Step 6: Rim lighting
        this.renderRimLighting(ctx, radius, color);
        
        // Step 7: Enhanced border
        this.renderEnhancedBorder(ctx, radius, color);
    }
    
    /**
     * Medium-quality bubble rendering
     */
    renderMediumQualityBubble(ctx, radius, color, options) {
        this.renderDropShadow(ctx, radius);
        this.renderBubbleBody(ctx, radius, color, 'medium');
        this.renderSpecularHighlights(ctx, radius, 'medium');
        this.renderEnhancedBorder(ctx, radius, color);
    }
    
    /**
     * Basic bubble rendering for performance
     */
    renderBasicBubble(ctx, radius, color, options) {
        this.renderBubbleBody(ctx, radius, color, 'basic');
        this.renderSpecularHighlights(ctx, radius, 'basic');
    }
    
    // === RENDERING COMPONENTS ===
    
    renderSubsurfaceScattering(ctx, radius, color) {
        const scatterRadius = radius * 1.1;
        const gradient = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, scatterRadius);
        
        const scatterColor = this.lightenColor(color, 0.3);
        gradient.addColorStop(0, `${scatterColor}00`);
        gradient.addColorStop(0.7, `${scatterColor}20`);
        gradient.addColorStop(1, `${scatterColor}00`);
        
        ctx.beginPath();
        ctx.arc(0, 0, scatterRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    
    renderVolumetricShadows(ctx, radius, color) {
        // Multiple shadow layers for volume
        const shadows = [
            { offset: { x: 2, y: 2 }, blur: 4, opacity: 0.3 },
            { offset: { x: 1, y: 1 }, blur: 2, opacity: 0.2 },
            { offset: { x: 3, y: 3 }, blur: 8, opacity: 0.1 }
        ];
        
        shadows.forEach(shadow => {
            ctx.save();
            ctx.filter = `blur(${shadow.blur}px)`;
            ctx.globalAlpha = shadow.opacity;
            
            ctx.beginPath();
            ctx.arc(shadow.offset.x, shadow.offset.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fill();
            
            ctx.restore();
        });
    }
    
    renderBubbleBody(ctx, radius, color, quality) {
        const gradientStops = this.getGradientStops(color, quality);
        const lightDirection = this.lightSources[0];
        
        const gradient = ctx.createRadialGradient(
            lightDirection.x * radius * 0.3,
            lightDirection.y * radius * 0.3,
            0,
            0, 0,
            radius * 1.2
        );
        
        gradientStops.forEach((stop, index) => {
            gradient.addColorStop(stop.position, stop.color);
        });
        
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    
    renderCaustics(ctx, radius, color) {
        // Simulate light caustics patterns inside the bubble
        const patterns = [
            { x: -0.2, y: -0.3, size: 0.15, rotation: 0.3 },
            { x: 0.1, y: -0.2, size: 0.1, rotation: -0.2 },
            { x: -0.1, y: 0.2, size: 0.08, rotation: 0.8 }
        ];
        
        patterns.forEach(pattern => {
            ctx.save();
            ctx.translate(pattern.x * radius, pattern.y * radius);
            ctx.rotate(pattern.rotation);
            
            const causticGradient = ctx.createRadialGradient(
                0, 0, 0,
                0, 0, radius * pattern.size
            );
            
            causticGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
            causticGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
            causticGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.beginPath();
            ctx.arc(0, 0, radius * pattern.size, 0, Math.PI * 2);
            ctx.fillStyle = causticGradient;
            ctx.fill();
            
            ctx.restore();
        });
    }
    
    renderSpecularHighlights(ctx, radius, quality) {
        const highlights = this.getHighlightConfiguration(quality);
        
        highlights.forEach(highlight => {
            const gradient = ctx.createRadialGradient(
                highlight.x * radius, highlight.y * radius, 0,
                highlight.x * radius, highlight.y * radius, highlight.size * radius
            );
            
            gradient.addColorStop(0, `rgba(255, 255, 255, ${highlight.intensity})`);
            gradient.addColorStop(0.5, `rgba(255, 255, 255, ${highlight.intensity * 0.4})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.beginPath();
            ctx.arc(
                highlight.x * radius,
                highlight.y * radius,
                highlight.size * radius,
                0, Math.PI * 2
            );
            ctx.fillStyle = gradient;
            ctx.fill();
        });
    }
    
    renderFresnelRim(ctx, radius, color) {
        // Fresnel effect - stronger reflection at grazing angles
        const rimGradient = ctx.createRadialGradient(0, 0, radius * 0.7, 0, 0, radius);
        const rimColor = this.lightenColor(color, 0.6);
        
        rimGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        rimGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0)');
        rimGradient.addColorStop(0.95, `rgba(255, 255, 255, 0.3)`);
        rimGradient.addColorStop(1, `rgba(255, 255, 255, 0.6)`);
        
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = rimGradient;
        ctx.fill();
    }
    
    renderSurfaceDetails(ctx, radius) {
        // Add subtle surface imperfections for realism
        const details = [
            { x: 0.3, y: -0.4, size: 0.02, opacity: 0.1 },
            { x: -0.2, y: 0.3, size: 0.015, opacity: 0.08 },
            { x: 0.4, y: 0.2, size: 0.018, opacity: 0.12 }
        ];
        
        details.forEach(detail => {
            ctx.beginPath();
            ctx.arc(
                detail.x * radius,
                detail.y * radius,
                detail.size * radius,
                0, Math.PI * 2
            );
            ctx.fillStyle = `rgba(255, 255, 255, ${detail.opacity})`;
            ctx.fill();
        });
    }
    
    renderDropShadow(ctx, radius) {
        ctx.save();
        ctx.filter = 'blur(3px)';
        ctx.globalAlpha = 0.3;
        
        ctx.beginPath();
        ctx.arc(2, 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();
        
        ctx.restore();
    }
    
    renderDepthGradient(ctx, radius) {
        const depthGradient = ctx.createRadialGradient(
            0, -radius * 0.3, radius * 0.3,
            0, radius * 0.7, radius
        );
        
        depthGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        depthGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
        depthGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = depthGradient;
        ctx.fill();
    }
    
    renderSecondaryHighlights(ctx, radius) {
        // Smaller, more subtle highlights
        const secondaryHighlights = [
            { x: -0.15, y: -0.25, size: 0.12, intensity: 0.7 },
            { x: 0.25, y: -0.35, size: 0.08, intensity: 0.5 }
        ];
        
        secondaryHighlights.forEach(highlight => {
            ctx.beginPath();
            ctx.arc(
                highlight.x * radius,
                highlight.y * radius,
                highlight.size * radius,
                0, Math.PI * 2
            );
            ctx.fillStyle = `rgba(255, 255, 255, ${highlight.intensity})`;
            ctx.fill();
        });
    }
    
    renderRimLighting(ctx, radius, color) {
        const rimGradient = ctx.createRadialGradient(0, 0, radius * 0.8, 0, 0, radius);
        
        rimGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        rimGradient.addColorStop(0.9, 'rgba(255, 255, 255, 0)');
        rimGradient.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
        
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = rimGradient;
        ctx.fill();
    }
    
    renderEnhancedBorder(ctx, radius, color) {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.darkenColor(color, 0.4);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Inner highlight border
        ctx.beginPath();
        ctx.arc(0, 0, radius - 1, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }
    
    renderMaterialBorder(ctx, radius, color) {
        // Multi-layer border for material depth
        const borderLayers = [
            { offset: 0, width: 2, color: this.darkenColor(color, 0.5), opacity: 0.8 },
            { offset: -1, width: 1, color: 'rgba(255, 255, 255, 0.4)', opacity: 0.6 },
            { offset: 1, width: 1, color: 'rgba(0, 0, 0, 0.3)', opacity: 0.4 }
        ];
        
        borderLayers.forEach(layer => {
            ctx.beginPath();
            ctx.arc(0, 0, radius + layer.offset, 0, Math.PI * 2);
            ctx.strokeStyle = layer.color;
            ctx.lineWidth = layer.width;
            ctx.globalAlpha = layer.opacity;
            ctx.stroke();
        });
    }
    
    // === EFFECT COMPONENTS ===
    
    renderGlow(ctx, radius, intensity) {
        const glowRadius = radius + intensity * 15;
        const glowGradient = ctx.createRadialGradient(0, 0, radius, 0, 0, glowRadius);
        
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        glowGradient.addColorStop(0.7, `rgba(255, 255, 255, ${intensity * 0.2})`);
        glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();
    }
    
    renderCollisionEffect(ctx, radius) {
        // Collision impact ring
        ctx.beginPath();
        ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Impact glow
        const impactGradient = ctx.createRadialGradient(0, 0, radius, 0, 0, radius + 10);
        impactGradient.addColorStop(0, 'rgba(255, 255, 0, 0)');
        impactGradient.addColorStop(1, 'rgba(255, 255, 0, 0.3)');
        
        ctx.beginPath();
        ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
        ctx.fillStyle = impactGradient;
        ctx.fill();
    }
    
    renderPreviewIndicator(ctx, radius) {
        // Preview indicator with pulsing effect
        const time = performance.now() * 0.003;
        const pulse = Math.sin(time) * 0.2 + 0.8;
        
        ctx.beginPath();
        ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100, 200, 255, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // === UTILITY FUNCTIONS ===
    
    enhanceColor(color) {
        // Parse color and enhance saturation/brightness
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;
        
        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
        
        // Apply enhancement
        hsl.s = Math.min(1, hsl.s * this.materials.colorEnhancement.saturationBoost);
        hsl.l = Math.min(1, hsl.l * this.materials.colorEnhancement.brightnessBoost);
        
        const enhancedRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        return this.rgbToHex(enhancedRgb.r, enhancedRgb.g, enhancedRgb.b);
    }
    
    getGradientStops(color, quality) {
        const lightColor = this.lightenColor(color, 0.6);
        const darkColor = this.darkenColor(color, 0.4);
        const midColor = color;
        
        switch(quality) {
            case 'ultra':
                return [
                    { position: 0, color: lightColor },
                    { position: 0.15, color: this.lightenColor(color, 0.3) },
                    { position: 0.4, color: midColor },
                    { position: 0.7, color: midColor },
                    { position: 0.9, color: this.darkenColor(color, 0.2) },
                    { position: 1, color: darkColor }
                ];
            case 'high':
                return [
                    { position: 0, color: lightColor },
                    { position: 0.3, color: midColor },
                    { position: 0.7, color: midColor },
                    { position: 1, color: darkColor }
                ];
            default:
                return [
                    { position: 0, color: lightColor },
                    { position: 0.5, color: midColor },
                    { position: 1, color: darkColor }
                ];
        }
    }
    
    getHighlightConfiguration(quality) {
        switch(quality) {
            case 'ultra':
                return [
                    { x: -0.3, y: -0.4, size: 0.35, intensity: 0.9 },
                    { x: -0.15, y: -0.25, size: 0.15, intensity: 0.8 },
                    { x: 0.2, y: -0.3, size: 0.1, intensity: 0.6 },
                    { x: -0.4, y: -0.2, size: 0.08, intensity: 0.5 }
                ];
            case 'high':
                return [
                    { x: -0.3, y: -0.4, size: 0.35, intensity: 0.9 },
                    { x: -0.15, y: -0.25, size: 0.15, intensity: 0.7 }
                ];
            case 'medium':
                return [
                    { x: -0.3, y: -0.4, size: 0.3, intensity: 0.8 }
                ];
            default:
                return [
                    { x: -0.25, y: -0.35, size: 0.25, intensity: 0.7 }
                ];
        }
    }
    
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
    
    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return { h, s, l };
    }
    
    hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BubbleRenderer;
}
