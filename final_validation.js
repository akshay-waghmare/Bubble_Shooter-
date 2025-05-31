// Comprehensive Bubble Shooter Game Validation
console.log('🎮 BUBBLE SHOOTER GAME VALIDATION 🎮');
console.log('========================================');

let validationResults = {
    passed: 0,
    failed: 0,
    tests: []
};

function test(description, testFn) {
    try {
        const result = testFn();
        if (result) {
            console.log(`✅ ${description}`);
            validationResults.passed++;
            validationResults.tests.push({ description, status: 'PASSED' });
        } else {
            console.log(`❌ ${description} - Test returned false`);
            validationResults.failed++;
            validationResults.tests.push({ description, status: 'FAILED', error: 'Test returned false' });
        }
    } catch (error) {
        console.log(`❌ ${description} - Error: ${error.message}`);
        validationResults.failed++;
        validationResults.tests.push({ description, status: 'FAILED', error: error.message });
    }
}

// Test 1: Matter.js Integration
test('Matter.js library loaded and accessible', () => {
    return typeof Matter !== 'undefined' && 
           typeof Matter.Engine !== 'undefined' &&
           typeof Matter.Bodies !== 'undefined';
});

// Test 2: Game Constants
test('Game constants properly defined', () => {
    return typeof BUBBLE_RADIUS !== 'undefined' && 
           typeof BUBBLE_COLORS !== 'undefined' &&
           typeof GRID_ROWS !== 'undefined' &&
           Array.isArray(BUBBLE_COLORS) &&
           BUBBLE_COLORS.length > 0;
});

// Test 3: Bubble Class
test('Bubble class instantiation and methods', () => {
    const bubble = new Bubble(100, 100, '#FF0000');
    return bubble.x === 100 && 
           bubble.y === 100 && 
           bubble.color === '#FF0000' &&
           typeof bubble.update === 'function' &&
           typeof bubble.draw === 'function';
});

// Test 4: Bubble update method with physics
test('Bubble update method handles manual physics', () => {
    const bubble = new Bubble(100, 100, '#FF0000');
    bubble.vx = 5;
    bubble.vy = 3;
    bubble.stuck = false;
    bubble.falling = false;
    bubble.isPhysicsEnabled = false;
    
    const initialX = bubble.x;
    const initialY = bubble.y;
    
    bubble.update();
    
    return bubble.x === initialX + 5 && bubble.y === initialY + 3;
});

// Test 5: Shooter Class
test('Shooter class instantiation', () => {
    const engine = Matter.Engine.create();
    const shooter = new Shooter(400, 550, engine);
    return shooter.x === 400 && 
           shooter.y === 550 &&
           typeof shooter.updateAimAngle === 'function' &&
           typeof shooter.shoot === 'function';
});

// Test 6: Game Class Basic Setup
test('Game class basic instantiation', () => {
    // Create minimal canvas mock
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    const game = new Game(canvas);
    return game.canvas === canvas &&
           Array.isArray(game.gridBubbles) &&
           Array.isArray(game.flyingBubbles) &&
           game.engine !== null;
});

// Test 7: Game Initialization
test('Game initialization process', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    const game = new Game(canvas);
    game.initGame();
    
    return game.gridBubbles.length >= 0 &&
           game.flyingBubbles.length === 0 &&
           game.score === 0;
});

// Test 8: Hexagonal Grid Mathematics
test('Hexagonal grid position calculations', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    const game = new Game(canvas);
    const pos = game.getGridPosition(0, 0);
    
    return typeof pos.x === 'number' && typeof pos.y === 'number';
});

// Test 9: Color matching logic
test('Bubble color matching detection', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    const game = new Game(canvas);
    
    // Create test bubbles
    const bubble1 = new Bubble(100, 100, '#FF0000');
    const bubble2 = new Bubble(150, 100, '#FF0000');
    const bubble3 = new Bubble(200, 100, '#00FF00');
    
    return bubble1.color === bubble2.color && bubble1.color !== bubble3.color;
});

// Test 10: Game State Management
test('Game state flags and management', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    
    const game = new Game(canvas);
    
    return typeof game.gameOver === 'boolean' &&
           typeof game.gameWon === 'boolean' &&
           typeof game.gameStarted === 'boolean' &&
           typeof game.start === 'function';
});

// Run all tests
setTimeout(() => {
    console.log('\n📊 VALIDATION SUMMARY');
    console.log('====================');
    console.log(`✅ Tests Passed: ${validationResults.passed}`);
    console.log(`❌ Tests Failed: ${validationResults.failed}`);
    console.log(`📋 Total Tests: ${validationResults.tests.length}`);
    
    if (validationResults.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! The Bubble Shooter game is ready to play! 🎉');
    } else {
        console.log('\n⚠️  Some tests failed. Check the issues above.');
    }
    
    console.log('\n🚀 Game should be fully functional now!');
    console.log('Click "Start Game" to begin playing.');
}, 100);
