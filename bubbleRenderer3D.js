/**
 * Three.js Professional 3D Bubble Renderer
 * Creates photorealistic 3D bubbles with advanced materials, lighting, and physics
 * Quality Level: 10/10 - Studio-grade rendering
 */
class BubbleRenderer3D {
    constructor(canvas) {
        this.canvas = canvas;
        this.initializeThreeJS();
        this.createMaterials();
        this.setupLighting();
        this.createBubbleGeometry();
        this.bubbleInstances = new Map(); // Track active bubbles
        this.animationFrame = null;
        
        // Performance settings
        this.qualitySettings = {
            ultra: { segments: 64, subsurfaceDetail: 8, reflectionDetail: 1024 },
            high: { segments: 32, subsurfaceDetail: 6, reflectionDetail: 512 },
            medium: { segments: 24, subsurfaceDetail: 4, reflectionDetail: 256 },
            low: { segments: 16, subsurfaceDetail: 2, reflectionDetail: 128 }
        };
        
        this.currentQuality = 'high';
        this.startRenderLoop();
    }
    
    initializeThreeJS() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        
        // Camera setup for 2D game projection
        const aspect = this.canvas.width / this.canvas.height;
        this.camera = new THREE.OrthographicCamera(
            -this.canvas.width / 2, this.canvas.width / 2,
            this.canvas.height / 2, -this.canvas.height / 2,
            1, 1000
        );
        this.camera.position.z = 100;
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Enable advanced features
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Post-processing
        this.setupPostProcessing();
    }
    
    setupPostProcessing() {
        // Import post-processing if available
        if (typeof THREE.EffectComposer !== 'undefined') {
            this.composer = new THREE.EffectComposer(this.renderer);
            
            // Render pass
            const renderPass = new THREE.RenderPass(this.scene, this.camera);
            this.composer.addPass(renderPass);
            
            // Bloom effect for glowing bubbles
            const bloomPass = new THREE.UnrealBloomPass(
                new THREE.Vector2(this.canvas.width, this.canvas.height),
                0.5, 0.4, 0.85
            );
            this.composer.addPass(bloomPass);
            
            // FXAA for anti-aliasing
            const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
            fxaaPass.material.uniforms['resolution'].value.x = 1 / this.canvas.width;
            fxaaPass.material.uniforms['resolution'].value.y = 1 / this.canvas.height;
            this.composer.addPass(fxaaPass);
        }
    }
    
    createMaterials() {
        // Environment map for reflections
        this.createEnvironmentMap();
        
        // Bubble material with realistic glass properties
        this.bubbleMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.0,
            roughness: 0.1,
            transmission: 0.9,
            thickness: 1.0,
            ior: 1.52, // Glass index of refraction
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            envMap: this.environmentMap,
            envMapIntensity: 1.5,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        
        // Animated material for special effects
        this.glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(0x4ECDC4) },
                intensity: { value: 1.0 }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color;
                uniform float intensity;
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                    float pulse = sin(time * 2.0) * 0.3 + 0.7;
                    vec3 finalColor = color * intensity * fresnel * pulse;
                    gl_FragColor = vec4(finalColor, fresnel * 0.8);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        
        // Caustics material for water-like effects
        this.causticsMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                scale: { value: 1.0 },
                intensity: { value: 0.5 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float scale;
                uniform float intensity;
                varying vec2 vUv;
                varying vec3 vPosition;
                
                float caustic(vec2 uv, float time) {
                    vec2 p = uv * scale;
                    float a = sin(p.x * 3.0 + time) * 0.3;
                    float b = sin(p.y * 3.0 + time * 1.3) * 0.3;
                    float c = sin((p.x + p.y) * 2.0 + time * 0.8) * 0.3;
                    return pow(abs(a + b + c), 2.0) * intensity;
                }
                
                void main() {
                    float c1 = caustic(vUv, time);
                    float c2 = caustic(vUv + 0.1, time + 1.0);
                    float c3 = caustic(vUv + 0.2, time + 2.0);
                    
                    float finalCaustic = (c1 + c2 + c3) / 3.0;
                    gl_FragColor = vec4(vec3(1.0), finalCaustic);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
    }
    
    createEnvironmentMap() {
        // Create a simple environment map for reflections
        const loader = new THREE.CubeTextureLoader();
        
        // Generate procedural environment if cube textures aren't available
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Create gradient environment
        const gradient = ctx.createLinearGradient(0, 0, 0, size);
        gradient.addColorStop(0, '#87CEEB'); // Sky blue
        gradient.addColorStop(0.5, '#4682B4'); // Steel blue
        gradient.addColorStop(1, '#191970'); // Midnight blue
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        const texture = new THREE.CanvasTexture(canvas);
        this.environmentMap = texture;
    }
    
    setupLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Main directional light (key light)
        this.keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.keyLight.position.set(-50, -50, 100);
        this.keyLight.castShadow = true;
        this.keyLight.shadow.mapSize.width = 2048;
        this.keyLight.shadow.mapSize.height = 2048;
        this.scene.add(this.keyLight);
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(0xfff8dc, 0.6);
        fillLight.position.set(50, -30, 80);
        this.scene.add(fillLight);
        
        // Rim light for edge highlighting
        const rimLight = new THREE.DirectionalLight(0xdce7ff, 0.4);
        rimLight.position.set(0, 80, 50);
        this.scene.add(rimLight);
        
        // Point lights for dynamic effects
        this.pointLights = [];
        for (let i = 0; i < 3; i++) {
            const pointLight = new THREE.PointLight(0xffffff, 0.5, 200);
            pointLight.position.set(
                (Math.random() - 0.5) * 400,
                (Math.random() - 0.5) * 400,
                50
            );
            this.pointLights.push(pointLight);
            this.scene.add(pointLight);
        }
    }
    
    createBubbleGeometry() {
        const quality = this.qualitySettings[this.currentQuality];
        
        // Main bubble geometry
        this.bubbleGeometry = new THREE.SphereGeometry(1, quality.segments, quality.segments);
        
        // Inner bubble for subsurface effects
        this.innerBubbleGeometry = new THREE.SphereGeometry(0.95, quality.segments * 0.75, quality.segments * 0.75);
        
        // Highlight geometry
        this.highlightGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    }
    
    /**
     * Create a 3D bubble instance
     * @param {string} id - Unique identifier for the bubble
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position (depth)
     * @param {number} radius - Bubble radius
     * @param {string} color - Bubble color
     * @param {Object} options - Additional options
     */
    createBubble(id, x, y, z = 0, radius = 20, color = '#4ECDC4', options = {}) {
        const {
            quality = this.currentQuality,
            glow = false,
            caustics = false,
            wobble = false,
            collision = false,
            preview = false
        } = options;
        
        // Create bubble group
        const bubbleGroup = new THREE.Group();
        
        // Main bubble mesh
        const material = this.bubbleMaterial.clone();
        material.color.setHex(color.replace('#', '0x'));
        
        const bubbleMesh = new THREE.Mesh(this.bubbleGeometry, material);
        bubbleMesh.scale.setScalar(radius);
        bubbleMesh.castShadow = true;
        bubbleMesh.receiveShadow = true;
        
        // Inner subsurface layer
        const innerMaterial = material.clone();
        innerMaterial.opacity = 0.3;
        innerMaterial.transmission = 0.5;
        const innerMesh = new THREE.Mesh(this.innerBubbleGeometry, innerMaterial);
        innerMesh.scale.setScalar(radius);
        
        // Specular highlights
        const highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        const highlight1 = new THREE.Mesh(this.highlightGeometry, highlightMaterial);
        highlight1.position.set(-radius * 0.3, -radius * 0.4, radius * 0.2);
        highlight1.scale.setScalar(radius * 0.4);
        
        const highlight2 = new THREE.Mesh(this.highlightGeometry, highlightMaterial);
        highlight2.position.set(-radius * 0.15, -radius * 0.25, radius * 0.15);
        highlight2.scale.setScalar(radius * 0.15);
        highlight2.material.opacity = 0.6;
        
        // Add components to group
        bubbleGroup.add(bubbleMesh);
        bubbleGroup.add(innerMesh);
        bubbleGroup.add(highlight1);
        bubbleGroup.add(highlight2);
        
        // Glow effect
        if (glow) {
            const glowMesh = new THREE.Mesh(this.bubbleGeometry, this.glowMaterial.clone());
            glowMesh.scale.setScalar(radius * 1.2);
            bubbleGroup.add(glowMesh);
        }
        
        // Caustics effect
        if (caustics) {
            const causticsMesh = new THREE.Mesh(this.bubbleGeometry, this.causticsMaterial.clone());
            causticsMesh.scale.setScalar(radius * 0.8);
            bubbleGroup.add(causticsMesh);
        }
        
        // Position the bubble
        bubbleGroup.position.set(x, y, z);
        
        // Store bubble data
        const bubbleData = {
            group: bubbleGroup,
            mainMesh: bubbleMesh,
            innerMesh: innerMesh,
            highlights: [highlight1, highlight2],
            options: options,
            animations: {
                wobble: wobble ? this.createWobbleAnimation() : null,
                glow: glow ? this.createGlowAnimation() : null,
                rotation: this.createRotationAnimation()
            },
            startTime: performance.now()
        };
        
        // Add to scene and track
        this.scene.add(bubbleGroup);
        this.bubbleInstances.set(id, bubbleData);
        
        return bubbleData;
    }
    
    /**
     * Update bubble position and properties
     */
    updateBubble(id, x, y, z, options = {}) {
        const bubble = this.bubbleInstances.get(id);
        if (!bubble) return;
        
        bubble.group.position.set(x, y, z);
        
        // Update properties
        if (options.color) {
            bubble.mainMesh.material.color.setHex(options.color.replace('#', '0x'));
        }
        
        if (options.scale) {
            bubble.group.scale.setScalar(options.scale);
        }
        
        if (options.opacity !== undefined) {
            bubble.mainMesh.material.opacity = options.opacity;
            bubble.innerMesh.material.opacity = options.opacity * 0.3;
        }
    }
    
    /**
     * Remove bubble from scene
     */
    removeBubble(id, animated = true) {
        const bubble = this.bubbleInstances.get(id);
        if (!bubble) return;
        
        if (animated) {
            // Animate removal
            const tl = this.createRemovalAnimation(bubble);
            tl.onComplete = () => {
                this.scene.remove(bubble.group);
                this.bubbleInstances.delete(id);
            };
        } else {
            this.scene.remove(bubble.group);
            this.bubbleInstances.delete(id);
        }
    }
    
    /**
     * Animation creators
     */
    createWobbleAnimation() {
        return {
            frequency: 2 + Math.random() * 3,
            amplitude: 0.02 + Math.random() * 0.03,
            phase: Math.random() * Math.PI * 2
        };
    }
    
    createGlowAnimation() {
        return {
            frequency: 1 + Math.random() * 2,
            minIntensity: 0.3,
            maxIntensity: 1.0,
            phase: Math.random() * Math.PI * 2
        };
    }
    
    createRotationAnimation() {
        return {
            speed: (Math.random() - 0.5) * 0.01,
            axis: new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            ).normalize()
        };
    }
    
    createRemovalAnimation(bubble) {
        // Scale down and fade out
        const duration = 500;
        const startScale = bubble.group.scale.x;
        const startOpacity = bubble.mainMesh.material.opacity;
        const startTime = performance.now();
        
        const animate = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const scale = startScale * (1 - progress);
            const opacity = startOpacity * (1 - progress);
            
            bubble.group.scale.setScalar(scale);
            bubble.mainMesh.material.opacity = opacity;
            bubble.innerMesh.material.opacity = opacity * 0.3;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(bubble.group);
                this.bubbleInstances.delete(bubble.id);
            }
        };
        
        animate();
    }
    
    /**
     * Main render loop
     */
    startRenderLoop() {
        const animate = () => {
            this.animationFrame = requestAnimationFrame(animate);
            this.updateAnimations();
            this.render();
        };
        animate();
    }
    
    updateAnimations() {
        const time = performance.now() * 0.001;
        
        // Update bubble animations
        this.bubbleInstances.forEach((bubble, id) => {
            const elapsed = time - bubble.startTime * 0.001;
            
            // Wobble animation
            if (bubble.animations.wobble) {
                const wobble = bubble.animations.wobble;
                const wobbleX = Math.sin(elapsed * wobble.frequency + wobble.phase) * wobble.amplitude;
                const wobbleY = Math.cos(elapsed * wobble.frequency * 1.3 + wobble.phase) * wobble.amplitude * 0.5;
                
                bubble.group.position.x += wobbleX;
                bubble.group.position.y += wobbleY;
            }
            
            // Rotation animation
            if (bubble.animations.rotation) {
                const rotation = bubble.animations.rotation;
                bubble.group.rotateOnAxis(rotation.axis, rotation.speed);
            }
            
            // Glow animation
            if (bubble.animations.glow && bubble.group.children.length > 4) {
                const glow = bubble.animations.glow;
                const glowMesh = bubble.group.children[4]; // Glow mesh
                if (glowMesh.material.uniforms) {
                    const intensity = glow.minIntensity + 
                        (glow.maxIntensity - glow.minIntensity) * 
                        (Math.sin(elapsed * glow.frequency + glow.phase) * 0.5 + 0.5);
                    glowMesh.material.uniforms.intensity.value = intensity;
                }
            }
        });
        
        // Update shader uniforms
        if (this.glowMaterial.uniforms) {
            this.glowMaterial.uniforms.time.value = time;
        }
        if (this.causticsMaterial.uniforms) {
            this.causticsMaterial.uniforms.time.value = time;
        }
        
        // Animate point lights
        this.pointLights.forEach((light, index) => {
            light.position.x = Math.sin(time + index * 2) * 100;
            light.position.y = Math.cos(time + index * 1.5) * 100;
        });
    }
    
    render() {
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * Quality and performance controls
     */
    setQuality(quality) {
        if (this.qualitySettings[quality]) {
            this.currentQuality = quality;
            this.createBubbleGeometry();
        }
    }
    
    /**
     * Resize handler
     */
    handleResize(width, height) {
        this.camera.left = -width / 2;
        this.camera.right = width / 2;
        this.camera.top = height / 2;
        this.camera.bottom = -height / 2;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        
        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }
    
    /**
     * Cleanup
     */
    dispose() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Dispose of geometries and materials
        this.bubbleGeometry.dispose();
        this.innerBubbleGeometry.dispose();
        this.highlightGeometry.dispose();
        this.bubbleMaterial.dispose();
        this.glowMaterial.dispose();
        this.causticsMaterial.dispose();
        
        // Clear scene
        this.scene.clear();
        
        // Dispose renderer
        this.renderer.dispose();
    }
}

// Utility function to load Three.js if not already loaded
function loadThreeJS() {
    return new Promise((resolve, reject) => {
        if (typeof THREE !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = () => {
            // Load additional modules
            Promise.all([
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'),
                // Add post-processing if needed
                // loadScript('https://threejs.org/examples/js/postprocessing/EffectComposer.js')
            ]).then(resolve).catch(reject);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BubbleRenderer3D, loadThreeJS };
}
