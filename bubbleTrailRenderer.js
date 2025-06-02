/**
 * Advanced Trail Renderer for 3D Bubbles
 * Creates realistic particle trails, caustics, and dynamic effects
 */
class BubbleTrailRenderer {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.trails = new Map();
        this.particleSystems = new Map();
        
        this.initializeParticleSystem();
        this.createTrailMaterials();
    }
    
    initializeParticleSystem() {
        // Particle geometry
        this.particleGeometry = new THREE.BufferGeometry();
        this.maxParticles = 1000;
        
        // Particle attributes
        this.positions = new Float32Array(this.maxParticles * 3);
        this.colors = new Float32Array(this.maxParticles * 3);
        this.sizes = new Float32Array(this.maxParticles);
        this.alphas = new Float32Array(this.maxParticles);
        this.lifecycles = new Float32Array(this.maxParticles);
        
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
        this.particleGeometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));
        this.particleGeometry.setAttribute('lifecycle', new THREE.BufferAttribute(this.lifecycles, 1));
        
        this.activeParticles = 0;
    }
    
    createTrailMaterials() {
        // Trail material with custom shader
        this.trailMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pointTexture: { value: this.createParticleTexture() }
            },
            vertexShader: `
                attribute float size;
                attribute float alpha;
                attribute float lifecycle;
                
                varying float vAlpha;
                varying float vLifecycle;
                varying vec3 vColor;
                
                void main() {
                    vAlpha = alpha;
                    vLifecycle = lifecycle;
                    vColor = color;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform sampler2D pointTexture;
                
                varying float vAlpha;
                varying float vLifecycle;
                varying vec3 vColor;
                
                void main() {
                    gl_FragColor = vec4(vColor, vAlpha);
                    gl_FragColor = gl_FragColor * texture2D(pointTexture, gl_PointCoord);
                    
                    // Fade based on lifecycle
                    float fade = 1.0 - vLifecycle;
                    gl_FragColor.a *= fade;
                    
                    if (gl_FragColor.a < 0.003) discard;
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
            vertexColors: true
        });
        
        // Bubble pop particles
        this.popMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pointTexture: { value: this.createSparkTexture() }
            },
            vertexShader: `
                attribute float size;
                attribute float alpha;
                attribute float lifecycle;
                
                varying float vAlpha;
                varying float vLifecycle;
                varying vec3 vColor;
                
                void main() {
                    vAlpha = alpha;
                    vLifecycle = lifecycle;
                    vColor = color;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform sampler2D pointTexture;
                
                varying float vAlpha;
                varying float vLifecycle;
                varying vec3 vColor;
                
                void main() {
                    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                    gl_FragColor = vec4(vColor * texColor.rgb, vAlpha * texColor.a);
                    
                    // Sparkle effect
                    float sparkle = sin(vLifecycle * 10.0) * 0.5 + 0.5;
                    gl_FragColor.rgb *= sparkle;
                    
                    float fade = 1.0 - vLifecycle;
                    gl_FragColor.a *= fade * fade;
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true,
            vertexColors: true
        });
        
        // Create particle system
        this.particleSystem = new THREE.Points(this.particleGeometry, this.trailMaterial);
        this.scene.add(this.particleSystem);
    }
    
    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Create radial gradient
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        
        return new THREE.CanvasTexture(canvas);
    }
    
    createSparkTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        // Create star shape
        ctx.fillStyle = 'white';
        ctx.beginPath();
        
        // Draw 4-pointed star
        ctx.moveTo(16, 4);
        ctx.lineTo(18, 14);
        ctx.lineTo(28, 16);
        ctx.lineTo(18, 18);
        ctx.lineTo(16, 28);
        ctx.lineTo(14, 18);
        ctx.lineTo(4, 16);
        ctx.lineTo(14, 14);
        ctx.closePath();
        
        ctx.fill();
        
        return new THREE.CanvasTexture(canvas);
    }
    
    /**
     * Start trail for a bubble
     */
    startTrail(bubbleId, color = '#ffffff', intensity = 1.0) {
        this.trails.set(bubbleId, {
            positions: [],
            maxLength: 15,
            color: new THREE.Color(color),
            intensity: intensity,
            lastPosition: null
        });
    }
    
    /**
     * Update trail position
     */
    updateTrail(bubbleId, x, y, z, velocity = { x: 0, y: 0, z: 0 }) {
        const trail = this.trails.get(bubbleId);
        if (!trail) return;
        
        const position = new THREE.Vector3(x, y, z);
        
        // Only add if position changed significantly
        if (!trail.lastPosition || trail.lastPosition.distanceTo(position) > 2) {
            trail.positions.push({
                position: position.clone(),
                time: performance.now(),
                velocity: velocity
            });
            
            // Limit trail length
            if (trail.positions.length > trail.maxLength) {
                trail.positions.shift();
            }
            
            trail.lastPosition = position;
            
            // Create trail particles
            this.createTrailParticles(trail, position, velocity);
        }
    }
    
    createTrailParticles(trail, position, velocity) {
        const particleCount = 3 + Math.random() * 4;
        
        for (let i = 0; i < particleCount; i++) {
            if (this.activeParticles >= this.maxParticles) break;
            
            const idx = this.activeParticles * 3;
            const particleIdx = this.activeParticles;
            
            // Random offset
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 5
            );
            
            // Position
            this.positions[idx] = position.x + offset.x;
            this.positions[idx + 1] = position.y + offset.y;
            this.positions[idx + 2] = position.z + offset.z;
            
            // Color
            this.colors[idx] = trail.color.r;
            this.colors[idx + 1] = trail.color.g;
            this.colors[idx + 2] = trail.color.b;
            
            // Size and alpha
            this.sizes[particleIdx] = 5 + Math.random() * 10;
            this.alphas[particleIdx] = 0.8 * trail.intensity;
            this.lifecycles[particleIdx] = 0;
            
            this.activeParticles++;
        }
        
        // Update buffer attributes
        this.particleGeometry.attributes.position.needsUpdate = true;
        this.particleGeometry.attributes.color.needsUpdate = true;
        this.particleGeometry.attributes.size.needsUpdate = true;
        this.particleGeometry.attributes.alpha.needsUpdate = true;
        this.particleGeometry.attributes.lifecycle.needsUpdate = true;
    }
    
    /**
     * Create bubble pop effect
     */
    createPopEffect(x, y, z, color = '#ffffff', intensity = 1.0) {
        const particleCount = 20 + Math.random() * 30;
        const popColor = new THREE.Color(color);
        
        for (let i = 0; i < particleCount; i++) {
            if (this.activeParticles >= this.maxParticles) break;
            
            const idx = this.activeParticles * 3;
            const particleIdx = this.activeParticles;
            
            // Random direction
            const angle = Math.random() * Math.PI * 2;
            const elevation = Math.random() * Math.PI - Math.PI / 2;
            const speed = 20 + Math.random() * 40;
            
            const velocity = new THREE.Vector3(
                Math.cos(angle) * Math.cos(elevation) * speed,
                Math.sin(elevation) * speed,
                Math.sin(angle) * Math.cos(elevation) * speed
            );
            
            // Position
            this.positions[idx] = x + (Math.random() - 0.5) * 5;
            this.positions[idx + 1] = y + (Math.random() - 0.5) * 5;
            this.positions[idx + 2] = z + (Math.random() - 0.5) * 5;
            
            // Color with variation
            const colorVariation = 0.8 + Math.random() * 0.4;
            this.colors[idx] = popColor.r * colorVariation;
            this.colors[idx + 1] = popColor.g * colorVariation;
            this.colors[idx + 2] = popColor.b * colorVariation;
            
            // Size and alpha
            this.sizes[particleIdx] = 8 + Math.random() * 15;
            this.alphas[particleIdx] = 0.9 * intensity;
            this.lifecycles[particleIdx] = 0;
            
            this.activeParticles++;
        }
        
        // Switch to pop material temporarily
        this.particleSystem.material = this.popMaterial;
        setTimeout(() => {
            this.particleSystem.material = this.trailMaterial;
        }, 1000);
        
        this.updateBufferAttributes();
    }
    
    /**
     * Create collision effect
     */
    createCollisionEffect(x, y, z, color1 = '#ffffff', color2 = '#ffff00') {
        const particleCount = 15 + Math.random() * 20;
        const color1Vec = new THREE.Color(color1);
        const color2Vec = new THREE.Color(color2);
        
        for (let i = 0; i < particleCount; i++) {
            if (this.activeParticles >= this.maxParticles) break;
            
            const idx = this.activeParticles * 3;
            const particleIdx = this.activeParticles;
            
            // Random spark direction
            const angle = Math.random() * Math.PI * 2;
            const speed = 10 + Math.random() * 20;
            
            const offset = new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                (Math.random() - 0.5) * 10
            );
            
            // Position
            this.positions[idx] = x + offset.x;
            this.positions[idx + 1] = y + offset.y;
            this.positions[idx + 2] = z + offset.z;
            
            // Alternate colors
            const useColor = i % 2 === 0 ? color1Vec : color2Vec;
            this.colors[idx] = useColor.r;
            this.colors[idx + 1] = useColor.g;
            this.colors[idx + 2] = useColor.b;
            
            // Size and alpha
            this.sizes[particleIdx] = 3 + Math.random() * 8;
            this.alphas[particleIdx] = 0.7;
            this.lifecycles[particleIdx] = 0;
            
            this.activeParticles++;
        }
        
        this.updateBufferAttributes();
    }
    
    updateBufferAttributes() {
        this.particleGeometry.attributes.position.needsUpdate = true;
        this.particleGeometry.attributes.color.needsUpdate = true;
        this.particleGeometry.attributes.size.needsUpdate = true;
        this.particleGeometry.attributes.alpha.needsUpdate = true;
        this.particleGeometry.attributes.lifecycle.needsUpdate = true;
    }
    
    /**
     * Stop trail for a bubble
     */
    stopTrail(bubbleId) {
        this.trails.delete(bubbleId);
    }
    
    /**
     * Update all particles and trails
     */
    update(deltaTime) {
        const time = performance.now() * 0.001;
        
        // Update shader uniforms
        this.trailMaterial.uniforms.time.value = time;
        this.popMaterial.uniforms.time.value = time;
        
        // Update particles
        for (let i = 0; i < this.activeParticles; i++) {
            const idx = i * 3;
            
            // Update lifecycle
            this.lifecycles[i] += deltaTime * 0.001;
            
            // Apply gravity and movement
            this.positions[idx + 1] += 20 * deltaTime; // Gravity
            
            // Fade out
            this.alphas[i] *= 0.98;
            
            // Remove dead particles
            if (this.lifecycles[i] > 1.0 || this.alphas[i] < 0.01) {
                // Move last particle to this position
                if (i < this.activeParticles - 1) {
                    const lastIdx = (this.activeParticles - 1) * 3;
                    
                    this.positions[idx] = this.positions[lastIdx];
                    this.positions[idx + 1] = this.positions[lastIdx + 1];
                    this.positions[idx + 2] = this.positions[lastIdx + 2];
                    
                    this.colors[idx] = this.colors[lastIdx];
                    this.colors[idx + 1] = this.colors[lastIdx + 1];
                    this.colors[idx + 2] = this.colors[lastIdx + 2];
                    
                    this.sizes[i] = this.sizes[this.activeParticles - 1];
                    this.alphas[i] = this.alphas[this.activeParticles - 1];
                    this.lifecycles[i] = this.lifecycles[this.activeParticles - 1];
                }
                
                this.activeParticles--;
                i--; // Recheck this index
            }
        }
        
        // Update geometry range
        this.particleGeometry.setDrawRange(0, this.activeParticles);
        this.updateBufferAttributes();
    }
    
    /**
     * Clear all effects
     */
    clear() {
        this.trails.clear();
        this.activeParticles = 0;
        this.particleGeometry.setDrawRange(0, 0);
    }
    
    /**
     * Dispose of resources
     */
    dispose() {
        this.particleGeometry.dispose();
        this.trailMaterial.dispose();
        this.popMaterial.dispose();
        this.scene.remove(this.particleSystem);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BubbleTrailRenderer;
}
