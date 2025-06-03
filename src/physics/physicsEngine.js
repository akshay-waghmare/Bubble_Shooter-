// Physics Engine - Matter.js wrapper for bubble physics

export class PhysicsEngine {
    constructor() {
        // Matter.js destructuring - loaded from CDN in HTML
        const { Engine, Render, World, Bodies, Body, Events, Vector, Constraint } = Matter;
        
        this.Matter = { Engine, Render, World, Bodies, Body, Events, Vector, Constraint };
        this.engine = null;
        this.walls = [];
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        
        console.log('Initializing Matter.js physics engine...');
        this.engine = this.Matter.Engine.create();
        this.engine.world.gravity.y = 0.4; // Reduced gravity for bubble shooter feel
        this.engine.world.gravity.x = 0;
        this.initialized = true;
        
        console.log('✅ Matter.js engine created');
    }

    createWalls(canvasWidth, canvasHeight) {
        if (!this.engine) {
            console.error('Physics engine not initialized');
            return;
        }

        // Clear existing walls
        this.removeWalls();

        const wallThickness = 50;
        const { Bodies, World } = this.Matter;
        
        // Create invisible walls
        const leftWall = Bodies.rectangle(
            -wallThickness / 2, 
            canvasHeight / 2, 
            wallThickness, 
            canvasHeight, 
            { isStatic: true, label: 'leftWall' }
        );
        
        const rightWall = Bodies.rectangle(
            canvasWidth + wallThickness / 2, 
            canvasHeight / 2, 
            wallThickness, 
            canvasHeight, 
            { isStatic: true, label: 'rightWall' }
        );
        
        const topWall = Bodies.rectangle(
            canvasWidth / 2, 
            -wallThickness / 2, 
            canvasWidth, 
            wallThickness, 
            { isStatic: true, label: 'topWall' }
        );
        
        const bottomWall = Bodies.rectangle(
            canvasWidth / 2, 
            canvasHeight + wallThickness / 2, 
            canvasWidth, 
            wallThickness, 
            { isStatic: true, label: 'bottomWall' }
        );
        
        this.walls = [leftWall, rightWall, topWall, bottomWall];
        World.add(this.engine.world, this.walls);
        
        console.log('✅ Physics walls created');
    }

    removeWalls() {
        if (this.walls.length > 0 && this.engine) {
            this.Matter.World.remove(this.engine.world, this.walls);
            this.walls = [];
        }
    }

    addBody(body) {
        if (!this.engine) {
            console.error('Physics engine not initialized');
            return;
        }
        this.Matter.World.add(this.engine.world, body);
    }

    removeBody(body) {
        if (!this.engine) {
            console.error('Physics engine not initialized');
            return;
        }
        this.Matter.World.remove(this.engine.world, body);
    }

    update() {
        if (!this.engine) return;
        this.Matter.Engine.update(this.engine);
    }

    onCollision(callback) {
        if (!this.engine) {
            console.error('Physics engine not initialized');
            return;
        }
        this.Matter.Events.on(this.engine, 'collisionStart', callback);
    }

    offCollision(callback) {
        if (!this.engine) {
            console.error('Physics engine not initialized');
            return;
        }
        this.Matter.Events.off(this.engine, 'collisionStart', callback);
    }

    createCircleBody(x, y, radius, options = {}) {
        if (!this.engine) {
            console.error('Physics engine not initialized');
            return null;
        }
        
        const defaultOptions = {
            restitution: 0.8,
            friction: 0.1,
            frictionAir: 0.01,
            density: 0.001
        };
        
        return this.Matter.Bodies.circle(x, y, radius, { ...defaultOptions, ...options });
    }

    setBodyVelocity(body, velocity) {
        this.Matter.Body.setVelocity(body, velocity);
    }

    applyForce(body, position, force) {
        this.Matter.Body.applyForce(body, position, force);
    }

    getEngine() {
        return this.engine;
    }

    cleanup() {
        if (this.engine) {
            this.removeWalls();
            // Clear all bodies
            this.Matter.World.clear(this.engine.world);
            this.engine = null;
            this.initialized = false;
        }
    }
}
