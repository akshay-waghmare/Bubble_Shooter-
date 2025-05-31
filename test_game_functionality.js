// Quick functionality test for the Bubble Shooter game
console.log('=== Bubble Shooter Game Functionality Test ===');

// Test 1: Check if Matter.js is available
try {
    const { Engine, Render, World, Bodies, Body, Events, Vector, Constraint } = Matter;
    console.log('✓ Matter.js properly loaded and destructured');
} catch (error) {
    console.error('✗ Matter.js loading failed:', error);
}

// Test 2: Check if Game class can be instantiated
try {
    // Create a mock canvas element
    const mockCanvas = {
        width: 800,
        height: 600,
        getContext: () => ({
            clearRect: () => {},
            fillRect: () => {},
            arc: () => {},
            fill: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            rotate: () => {},
            fillText: () => {},
            beginPath: () => {},
            stroke: () => {},
            fillStyle: '',
            strokeStyle: '',
            font: '',
            textAlign: '',
            lineWidth: 1
        }),
        addEventListener: () => {},
        removeEventListener: () => {},
        getBoundingClientRect: () => ({ left: 0, top: 0 })
    };
    
    const game = new Game(mockCanvas);
    console.log('✓ Game class instantiated successfully');
    
    // Test basic properties
    if (game.engine) console.log('✓ Matter.js engine created');
    if (game.gridBubbles) console.log('✓ Grid bubbles array initialized');
    if (game.flyingBubbles) console.log('✓ Flying bubbles array initialized');
    if (game.shooter) console.log('✓ Shooter object created');
    
} catch (error) {
    console.error('✗ Game class instantiation failed:', error);
}

// Test 3: Check Bubble class functionality
try {
    const bubble = new Bubble(100, 100, '#FF0000');
    console.log('✓ Bubble class instantiated successfully');
    
    // Test update method
    bubble.update();
    console.log('✓ Bubble update method works');
    
} catch (error) {
    console.error('✗ Bubble class test failed:', error);
}

// Test 4: Check Shooter class functionality
try {
    const mockEngine = Engine.create();
    const shooter = new Shooter(400, 550, mockEngine);
    console.log('✓ Shooter class instantiated successfully');
    
} catch (error) {
    console.error('✗ Shooter class test failed:', error);
}

console.log('=== Test Complete ===');
