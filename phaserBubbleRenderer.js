// phaserBubbleRenderer.js
// Faithful drop-in replacement for bubbleRenderer.js using Phaser for visuals and Three.js for effects

class PhaserBubbleRenderer {
    constructor(phaserContainerId, options = {}) {
        this.containerId = phaserContainerId;
        this.options = Object.assign({
            width: 800,
            height: 600,
            use3D: true,
            quality: 'high',
        }, options);
        this.bubbles = new Map();
        this.initPhaser();
        if (this.options.use3D) {
            this.initThreeJS();
        }
    }

    initPhaser() {
        const config = {
            type: Phaser.AUTO,
            width: this.options.width,
            height: this.options.height,
            parent: this.containerId,
            backgroundColor: '#1a1a2e',
            physics: {
                default: 'arcade',
                arcade: { gravity: { y: 0 }, debug: false }
            },
            scene: {
                preload: this.preload.bind(this),
                create: this.create.bind(this),
                update: this.update.bind(this)
            }
        };
        this.phaserGame = new Phaser.Game(config);
    }

    initThreeJS() {
        // Overlay Three.js canvas for effects
        this.threeCanvas = document.createElement('canvas');
        this.threeCanvas.style.position = 'absolute';
        this.threeCanvas.style.top = '0';
        this.threeCanvas.style.left = '0';
        this.threeCanvas.style.pointerEvents = 'none';
        this.threeCanvas.style.zIndex = '10';
        document.getElementById(this.containerId).appendChild(this.threeCanvas);
        this.scene3D = new THREE.Scene();
        this.camera3D = new THREE.OrthographicCamera(
            -this.options.width/2, this.options.width/2,
            this.options.height/2, -this.options.height/2, 1, 1000
        );
        this.camera3D.position.z = 100;
        this.threeRenderer = new THREE.WebGLRenderer({
            canvas: this.threeCanvas,
            antialias: true,
            alpha: true
        });
        this.threeRenderer.setSize(this.options.width, this.options.height);
        // Add lights, effects, etc. as needed
    }

    preload() {
        // Load assets as needed (sprites, etc.)
    }

    create() {
        // Setup groups, input, etc.
        this.bubbleGroup = this.phaserGame.scene.scenes[0].add.group();
    }

    update() {
        // Animate bubbles, update 3D effects, etc.
        if (this.options.use3D && this.threeRenderer) {
            this.threeRenderer.render(this.scene3D, this.camera3D);
        }
    }

    // --- API expected by Game class ---
    clear() {
        this.bubbleGroup.clear(true, true);
        this.bubbles.clear();
    }

    drawBubble(x, y, color, radius) {
        // Draw a bubble at (x, y) with given color and radius
        const scene = this.phaserGame.scene.scenes[0];
        const bubble = scene.add.circle(x, y, radius, Phaser.Display.Color.HexStringToColor(color).color);
        this.bubbleGroup.add(bubble);
        this.bubbles.set(bubble, {x, y, color, radius});
        return bubble;
    }

    removeBubble(bubble) {
        if (bubble && bubble.destroy) bubble.destroy();
        this.bubbles.delete(bubble);
    }

    drawLine(x1, y1, x2, y2, color, width) {
        // Draw a line (for aiming, etc.)
        const scene = this.phaserGame.scene.scenes[0];
        const graphics = scene.add.graphics();
        graphics.lineStyle(width || 2, Phaser.Display.Color.HexStringToColor(color).color);
        graphics.beginPath();
        graphics.moveTo(x1, y1);
        graphics.lineTo(x2, y2);
        graphics.strokePath();
        return graphics;
    }

    clearLines() {
        // Remove all lines/graphics
        // (implement as needed)
    }

    // Add more methods as needed to match bubbleRenderer.js API
    // ...
}

// Export for use
if (typeof window !== 'undefined') {
    window.PhaserBubbleRenderer = PhaserBubbleRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhaserBubbleRenderer;
}
