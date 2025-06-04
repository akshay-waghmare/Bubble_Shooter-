/**
 * Hybrid Renderer for Bubble Shooter Game
 * Combines Phaser.js for 2D rendering/animation with Three.js for advanced 3D effects
 * 
 * Architecture:
 * - Phaser.js: Game logic, UI, 2D bubble rendering, animation system
 * - Three.js: Advanced 3D effects, particle systems, post-processing
 * - Integration: Render Three.js to texture for Phaser, or overlay canvases
 */
class HybridRenderer {
    constructor(gameContainer, options = {}) {
        this.gameContainer = gameContainer;
        this.options = {
            width: options.width || 800,
            height: options.height || 600,
            use3D: options.use3D !== false,
            quality: options.quality || 'high',
            integrationMode: options.integrationMode || 'overlay' // 'overlay' or 'texture'
        };
        
        this.initialized = false;
        this.phaserGame = null;
        this.threeRenderer = null;
        this.bubbles = new Map();
        this.effects = new Map();
        
        this.init();
    }
    
    async init() {
        try {
            // Load required libraries
            await this.loadLibraries();
            
            // Initialize Phaser.js for 2D game logic
            this.initPhaser();
            
            // Initialize Three.js for 3D effects (if enabled)
            if (this.options.use3D) {
                this.initThreeJS();
                this.setupIntegration();
            }
            
            this.initialized = true;
            console.log('🎮 Hybrid Renderer initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Hybrid Renderer:', error);
            throw error;
        }
    }
    
    async loadLibraries() {
        // Load Phaser.js if not available
        if (typeof Phaser === 'undefined') {
            await this.loadScript('https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js');
        }
        
        // Load Three.js if not available and 3D is enabled
        if (this.options.use3D && typeof THREE === 'undefined') {
            // Use the ES modules version for better compatibility
            await this.loadScript('https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js');
            
            // Fallback to global build if module fails
            if (typeof THREE === 'undefined') {
                await this.loadScript('https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js');
            }
        }
    }
    
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    initPhaser() {
        const hybridRenderer = this;
        
        const config = {
            type: Phaser.AUTO,
            width: this.options.width,
            height: this.options.height,
            parent: this.gameContainer,
            backgroundColor: '#1a1a2e',
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            },
            scene: {
                preload: function() {
                    this.hybridRenderer = hybridRenderer;
                    hybridRenderer.phaserScene = this;
                    hybridRenderer.preload.call(this);
                },
                create: function() {
                    this.hybridRenderer = hybridRenderer;
                    hybridRenderer.create.call(this);
                },
                update: function(time, delta) {
                    hybridRenderer.update.call(this, time, delta);
                }
            },
            render: {
                antialias: true,
                pixelArt: false
            }
        };
        
        this.phaserGame = new Phaser.Game(config);
    }
    
    initThreeJS() {
        if (!this.options.use3D) return;
        
        // Create Three.js canvas for 3D effects
        this.threeCanvas = document.createElement('canvas');
        this.threeCanvas.style.position = 'absolute';
        this.threeCanvas.style.top = '0';
        this.threeCanvas.style.left = '0';
        this.threeCanvas.style.pointerEvents = 'none';
        this.threeCanvas.style.zIndex = '10';
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(
            -this.options.width / 2, this.options.width / 2,
            this.options.height / 2, -this.options.height / 2,
            1, 1000
        );
        this.camera.position.z = 100;
        
        // Renderer setup
        this.threeRenderer = new THREE.WebGLRenderer({
            canvas: this.threeCanvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        
        this.threeRenderer.setSize(this.options.width, this.options.height);
        this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.threeRenderer.shadowMap.enabled = true;
        this.threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Setup lighting for 3D effects
        this.setupThreeLighting();
        
        // Initialize particle systems
        this.initParticleSystems();
    }
    
    setupIntegration() {
        if (this.options.integrationMode === 'overlay') {
            // Overlay mode: Stack Three.js canvas on top of Phaser canvas
            const phaserCanvas = this.phaserGame.canvas;
            const phaserContainer = phaserCanvas.parentElement;
            
            // Position Three.js canvas over Phaser canvas
            phaserContainer.style.position = 'relative';
            phaserContainer.appendChild(this.threeCanvas);
            
        } else if (this.options.integrationMode === 'texture') {
            // Texture mode: Render Three.js to texture for use in Phaser
            this.renderTarget = new THREE.WebGLRenderTarget(
                this.options.width, 
                this.options.height,
                { 
                    minFilter: THREE.LinearFilter,
                    magFilter: THREE.LinearFilter,
                    format: THREE.RGBAFormat 
                }
            );
        }
    }
    
    setupThreeLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);
        
        // Key light
        const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
        keyLight.position.set(-100, -200, 300);
        keyLight.castShadow = true;
        this.scene.add(keyLight);
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffcc, 0.4);
        fillLight.position.set(100, -100, 200);
        this.scene.add(fillLight);
        
        // Rim light
        const rimLight = new THREE.DirectionalLight(0xccddff, 0.2);
        rimLight.position.set(0, 200, 100);
        this.scene.add(rimLight);
    }
    
    initParticleSystems() {
        // Particle system for bubble trails
        this.trailSystem = new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8,
                size: 2,
                blending: THREE.AdditiveBlending
            })
        );
        this.scene.add(this.trailSystem);
        
        // Particle system for pop effects
        this.popSystem = new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 1.0,
                size: 4,
                blending: THREE.AdditiveBlending
            })
        );
        this.scene.add(this.popSystem);
    }
    
    // Phaser scene methods
    preload() {
        // Store reference to the scene context
        const scene = this;
        
        // Create bubble textures for different colors
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];
        
        colors.forEach((color, index) => {
            const graphics = scene.add.graphics();
            
            // Create gradient bubble texture
            graphics.fillGradientStyle(
                Phaser.Display.Color.HexStringToColor(color).color,
                Phaser.Display.Color.HexStringToColor(color).color,
                Phaser.Display.Color.ValueToColor(0xffffff).color,
                Phaser.Display.Color.HexStringToColor(color).color,
                0.8
            );
            
            graphics.fillCircle(25, 25, 25);
            
            // Add highlight
            graphics.fillStyle(0xffffff, 0.3);
            graphics.fillCircle(18, 18, 8);
            
            graphics.generateTexture(`bubble_${index}`, 50, 50);
            graphics.destroy();
        });
    }
    
    create() {
        // Store reference to the scene context
        const scene = this;
        
        // Initialize game objects in Phaser
        scene.bubbleGroup = scene.add.group();
        scene.uiGroup = scene.add.group();
        
        // Create UI elements
        scene.scoreText = scene.add.text(16, 16, 'Score: 0', {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif'
        });
        
        scene.levelText = scene.add.text(16, 50, 'Level: 1', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif'
        });
        
        scene.shotsText = scene.add.text(16, 84, 'Shots: 5', {
            fontSize: '20px',
            fill: '#ffffff',
            fontFamily: 'Arial, sans-serif'
        });
        
        // Setup event listeners
        scene.input.on('pointerdown', (pointer) => {
            // Access the HybridRenderer instance through the stored reference
            const hybridRenderer = scene.hybridRenderer;
            if (hybridRenderer && hybridRenderer.handleShoot) {
                hybridRenderer.handleShoot(pointer.x, pointer.y);
            }
        });
        
        // Keyboard controls
        scene.input.keyboard.on('keydown-SPACE', () => {
            const hybridRenderer = scene.hybridRenderer;
            if (hybridRenderer && hybridRenderer.handlePause) {
                hybridRenderer.handlePause();
            }
        });
        
        console.log('🎯 Phaser scene created');
    }
    
    update(time, delta) {
        // Get reference to HybridRenderer instance
        const hybridRenderer = this.hybridRenderer;
        if (!hybridRenderer) return;
        
        // Update 2D game logic
        hybridRenderer.updateBubbles(delta);
        hybridRenderer.updateUI(delta);
        
        // Update 3D effects
        if (hybridRenderer.options.use3D && hybridRenderer.threeRenderer) {
            hybridRenderer.update3DEffects(delta);
            hybridRenderer.render3D();
        }
    }
    
    createBubbleTextures() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];
        
        colors.forEach((color, index) => {
            const graphics = this.add.graphics();
            
            // Create gradient bubble texture
            graphics.fillGradientStyle(
                Phaser.Display.Color.HexStringToColor(color).color,
                Phaser.Display.Color.HexStringToColor(color).color,
                Phaser.Display.Color.ValueToColor(0xffffff).color,
                Phaser.Display.Color.HexStringToColor(color).color,
                0.8
            );
            
            graphics.fillCircle(25, 25, 25);
            
            // Add highlight
            graphics.fillStyle(0xffffff, 0.3);
            graphics.fillCircle(18, 18, 8);
            
            graphics.generateTexture(`bubble_${index}`, 50, 50);
            graphics.destroy();
        });
    }
    
    // Game logic methods
    createBubble(x, y, color, options = {}) {
        if (!this.phaserScene) {
            console.error('Phaser scene not ready');
            return null;
        }
        
        const scene = this.phaserScene;
        const bubble = scene.add.sprite(x, y, `bubble_${color}`);
        bubble.setScale(options.scale || 1);
        bubble.setAlpha(options.alpha || 1);
        
        // Add physics
        scene.physics.add.existing(bubble);
        bubble.body.setCircle(25);
        bubble.body.setBounce(0.8);
        
        // Store bubble data
        const bubbleId = `bubble_${Date.now()}_${Math.random()}`;
        this.bubbles.set(bubbleId, {
            sprite: bubble,
            color: color,
            options: options,
            created: Date.now()
        });
        
        // Add to group
        if (scene.bubbleGroup) {
            scene.bubbleGroup.add(bubble);
        }
        
        // Create 3D trail effect if enabled
        if (this.options.use3D && options.trail) {
            this.create3DTrail(bubbleId, x, y, color);
        }
        
        return bubbleId;
    }
    
    create3DTrail(bubbleId, x, y, color) {
        if (!this.threeRenderer) return;
        
        // Create trail particles
        const trailParticles = [];
        for (let i = 0; i < 20; i++) {
            trailParticles.push({
                position: new THREE.Vector3(
                    x - this.options.width / 2,
                    -(y - this.options.height / 2),
                    0
                ),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ),
                life: 1.0,
                color: new THREE.Color(color)
            });
        }
        
        this.effects.set(`trail_${bubbleId}`, {
            type: 'trail',
            particles: trailParticles,
            created: Date.now()
        });
    }
    
    createPopEffect(x, y, color) {
        if (!this.phaserScene) {
            console.error('Phaser scene not ready');
            return;
        }
        
        const scene = this.phaserScene;
        
        // 2D pop animation in Phaser
        const popSprite = scene.add.circle(x, y, 25, Phaser.Display.Color.HexStringToColor(color).color);
        popSprite.setAlpha(0.8);
        
        scene.tweens.add({
            targets: popSprite,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                popSprite.destroy();
            }
        });
        
        // 3D particle explosion
        if (this.options.use3D) {
            this.create3DPopEffect(x, y, color);
        }
    }
    
    create3DPopEffect(x, y, color) {
        if (!this.threeRenderer) return;
        
        const particles = [];
        for (let i = 0; i < 50; i++) {
            const angle = (Math.PI * 2 * i) / 50;
            const speed = 2 + Math.random() * 3;
            
            particles.push({
                position: new THREE.Vector3(
                    x - this.options.width / 2,
                    -(y - this.options.height / 2),
                    0
                ),
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    (Math.random() - 0.5) * speed
                ),
                life: 1.0,
                color: new THREE.Color(color)
            });
        }
        
        this.effects.set(`pop_${Date.now()}`, {
            type: 'pop',
            particles: particles,
            created: Date.now()
        });
    }
    
    updateBubbles(delta) {
        // Update bubble animations and physics
        this.bubbles.forEach((bubbleData, bubbleId) => {
            const sprite = bubbleData.sprite;
            
            // Add floating animation
            const time = Date.now() * 0.001;
            const offset = Math.sin(time * 2 + sprite.x * 0.01) * 2;
            sprite.y += offset * 0.1;
            
            // Update 3D trail if exists
            if (this.effects.has(`trail_${bubbleId}`)) {
                this.update3DTrail(bubbleId, sprite.x, sprite.y);
            }
        });
    }
    
    updateUI(delta) {
        // Update UI elements based on game state
        // This would be connected to your game logic
    }
    
    update3DEffects(delta) {
        if (!this.threeRenderer) return;
        
        // Update particle effects
        this.effects.forEach((effect, effectId) => {
            effect.particles.forEach(particle => {
                // Update position
                particle.position.add(particle.velocity.clone().multiplyScalar(delta * 0.001));
                
                // Update life
                particle.life -= delta * 0.001;
                
                // Apply gravity/forces based on effect type
                if (effect.type === 'pop') {
                    particle.velocity.y -= 9.8 * delta * 0.001; // Gravity
                }
            });
            
            // Remove dead particles
            effect.particles = effect.particles.filter(p => p.life > 0);
            
            // Remove empty effects
            if (effect.particles.length === 0) {
                this.effects.delete(effectId);
            }
        });
        
        this.updateParticleGeometry();
    }
    
    updateParticleGeometry() {
        // Update trail particles
        const trailPositions = [];
        const trailColors = [];
        
        // Update pop particles
        const popPositions = [];
        const popColors = [];
        
        this.effects.forEach(effect => {
            effect.particles.forEach(particle => {
                const positions = effect.type === 'trail' ? trailPositions : popPositions;
                const colors = effect.type === 'trail' ? trailColors : popColors;
                
                positions.push(particle.position.x, particle.position.y, particle.position.z);
                colors.push(particle.color.r, particle.color.g, particle.color.b);
            });
        });
        
        // Update trail system
        if (trailPositions.length > 0) {
            this.trailSystem.geometry.setAttribute('position', 
                new THREE.Float32BufferAttribute(trailPositions, 3));
            this.trailSystem.geometry.setAttribute('color',
                new THREE.Float32BufferAttribute(trailColors, 3));
        }
        
        // Update pop system
        if (popPositions.length > 0) {
            this.popSystem.geometry.setAttribute('position',
                new THREE.Float32BufferAttribute(popPositions, 3));
            this.popSystem.geometry.setAttribute('color',
                new THREE.Float32BufferAttribute(popColors, 3));
        }
    }
    
    update3DTrail(bubbleId, x, y) {
        const effectId = `trail_${bubbleId}`;
        if (!this.effects.has(effectId)) return;
        
        const effect = this.effects.get(effectId);
        
        // Add new trail particle
        effect.particles.push({
            position: new THREE.Vector3(
                x - this.options.width / 2,
                -(y - this.options.height / 2),
                0
            ),
            velocity: new THREE.Vector3(0, 0, 0),
            life: 0.5,
            color: new THREE.Color(0xffffff)
        });
        
        // Limit trail length
        if (effect.particles.length > 20) {
            effect.particles.shift();
        }
    }
    
    render3D() {
        if (!this.threeRenderer) return;
        
        if (this.options.integrationMode === 'overlay') {
            // Direct render to overlay canvas
            this.threeRenderer.render(this.scene, this.camera);
        } else if (this.options.integrationMode === 'texture') {
            // Render to texture for Phaser integration
            this.threeRenderer.setRenderTarget(this.renderTarget);
            this.threeRenderer.render(this.scene, this.camera);
            this.threeRenderer.setRenderTarget(null);
            
            // Use the rendered texture in Phaser (would need additional setup)
        }
    }
    
    handleShoot(x, y) {
        // Implement shooting logic
        console.log(`🎯 Shooting at ${x}, ${y}`);
        
        // Create bubble with trail effect
        const bubbleId = this.createBubble(400, 550, Math.floor(Math.random() * 6), {
            trail: true
        });
        
        // Calculate trajectory and animate
        const bubble = this.bubbles.get(bubbleId).sprite;
        const angle = Math.atan2(y - 550, x - 400);
        const speed = 500;
        
        bubble.body.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );
    }
    
    handlePause() {
        if (this.phaserGame.scene.isPaused()) {
            this.phaserGame.scene.resume();
        } else {
            this.phaserGame.scene.pause();
        }
    }
    
    // Public API methods
    destroy() {
        if (this.phaserGame) {
            this.phaserGame.destroy(true);
        }
        
        if (this.threeRenderer) {
            this.threeRenderer.dispose();
        }
        
        this.bubbles.clear();
        this.effects.clear();
        
        console.log('🧹 Hybrid Renderer destroyed');
    }
    
    setQuality(quality) {
        this.options.quality = quality;
        console.log(`🎮 Quality set to: ${quality}`);
    }
    
    toggle3D(enabled) {
        this.options.use3D = enabled;
        if (enabled && !this.threeRenderer) {
            this.initThreeJS();
            this.setupIntegration();
        } else if (!enabled && this.threeRenderer) {
            this.threeCanvas.style.display = 'none';
        } else if (enabled && this.threeRenderer) {
            this.threeCanvas.style.display = 'block';
        }
        
        console.log(`🎮 3D effects ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HybridRenderer;
} else if (typeof window !== 'undefined') {
    window.HybridRenderer = HybridRenderer;
}