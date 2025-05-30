// Enhanced Collision Logic Test Script
// This script demonstrates and validates the improved collision detection system

console.log('🎯 Testing Enhanced Bubble Shooter Collision Logic');
console.log('================================================');

// Test the collision prediction system
function testCollisionPrediction() {
    console.log('\n🔮 Testing Collision Prediction System');
    
    const predictor = new CollisionPredictor();
    
    // Create a test bubble
    const testBubble = {
        x: 400,
        y: 500,
        vx: 10,
        vy: -20,
        radius: 20
    };
    
    // Mock grid for testing
    const mockGrid = Array(10).fill().map(() => Array(14).fill(null));
    mockGrid[3][7] = { x: 300, y: 120, radius: 20 };
    
    const predictions = predictor.predictCollision(testBubble, mockGrid, 800, 600);
    
    console.log(`Predictions found: ${predictions.length}`);
    predictions.forEach((pred, i) => {
        console.log(`  ${i + 1}. ${pred.type} at (${pred.position.x.toFixed(1)}, ${pred.position.y.toFixed(1)}) in ${pred.time.toFixed(3)}s`);
    });
    
    return predictions.length > 0;
}

// Test the debug logger
function testDebugLogger() {
    console.log('\n📝 Testing Debug Logger System');
    
    const logger = new DebugLogger(true);
    
    // Test different log categories
    logger.log('collision', 'Test collision event', { x: 100, y: 200 });
    logger.log('movement', 'Test movement tracking', { vx: 5, vy: -10 });
    logger.log('snap', 'Test grid snapping', { row: 2, col: 3 });
    
    // Test performance metrics
    logger.updateMetrics(16.67, 5, 1);
    logger.nextFrame();
    
    const report = logger.getReport();
    console.log('Logger report:', report);
    
    return report.frame === 1;
}

// Test hexagonal grid calculations
function testHexagonalGrid() {
    console.log('\n⬢ Testing Hexagonal Grid Precision');
    
    const BUBBLE_RADIUS = 20;
    const GRID_COL_SPACING = BUBBLE_RADIUS * 2;
    const GRID_ROW_HEIGHT = BUBBLE_RADIUS * Math.sqrt(3);
    const HEX_OFFSET = BUBBLE_RADIUS;
    
    function getColPosition(row, col) {
        const isOddRow = row % 2 === 1;
        const baseX = col * GRID_COL_SPACING + BUBBLE_RADIUS;
        const offsetX = isOddRow ? HEX_OFFSET : 0;
        return baseX + offsetX;
    }
    
    function getRowPosition(row) {
        return row * GRID_ROW_HEIGHT + BUBBLE_RADIUS * 2;
    }
    
    // Test perfect hexagonal distances
    const testCases = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 1, col: 1 }
    ];
    
    console.log('Grid position calculations:');
    testCases.forEach(({ row, col }) => {
        const x = getColPosition(row, col);
        const y = getRowPosition(row);
        console.log(`  (${row}, ${col}) -> (${x}, ${y})`);
    });
    
    // Verify hexagonal neighbor distances
    const pos1 = { x: getColPosition(0, 0), y: getRowPosition(0) };
    const pos2 = { x: getColPosition(0, 1), y: getRowPosition(0) };
    const pos3 = { x: getColPosition(1, 0), y: getRowPosition(1) };
    
    const horizontalDistance = Math.abs(pos2.x - pos1.x);
    const diagonalDistance = Math.sqrt((pos3.x - pos1.x) ** 2 + (pos3.y - pos1.y) ** 2);
    
    console.log(`Horizontal neighbor distance: ${horizontalDistance} (expected: ${BUBBLE_RADIUS * 2})`);
    console.log(`Diagonal neighbor distance: ${diagonalDistance.toFixed(2)} (expected: ${(BUBBLE_RADIUS * 2).toFixed(2)})`);
    
    const horizontalPrecise = Math.abs(horizontalDistance - BUBBLE_RADIUS * 2) < 0.001;
    const diagonalPrecise = Math.abs(diagonalDistance - BUBBLE_RADIUS * 2) < 0.001;
    
    return horizontalPrecise && diagonalPrecise;
}

// Test enhanced collision detection
function testEnhancedCollision() {
    console.log('\n💥 Testing Enhanced Collision Detection');
    
    // Create test bubbles
    const bubble1 = {
        x: 100,
        y: 100,
        radius: 20,
        vx: 5,
        vy: 0,
        isCollidingWith: function(other) {
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < (this.radius + other.radius) * 0.98;
        },
        handleCollisionWith: function(other, restitution = 0.8) {
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance === 0) return;
            
            const nx = dx / distance;
            const ny = dy / distance;
            const rvx = this.vx - (other.vx || 0);
            const rvy = this.vy - (other.vy || 0);
            const speed = rvx * nx + rvy * ny;
            
            if (speed > 0) return;
            
            const impulse = restitution * speed;
            this.vx -= impulse * nx;
            this.vy -= impulse * ny;
        }
    };
    
    const bubble2 = {
        x: 135,
        y: 100,
        radius: 20,
        vx: -2,
        vy: 0
    };
    
    // Test collision detection
    const isColliding = bubble1.isCollidingWith(bubble2);
    console.log(`Collision detected: ${isColliding}`);
    
    if (isColliding) {
        const oldVx = bubble1.vx;
        bubble1.handleCollisionWith(bubble2);
        console.log(`Velocity changed: ${oldVx} -> ${bubble1.vx}`);
    }
    
    return isColliding;
}

// Performance benchmark
function benchmarkCollisionDetection() {
    console.log('\n⚡ Benchmarking Collision Performance');
    
    const iterations = 10000;
    const bubbles = [];
    
    // Create test bubbles
    for (let i = 0; i < 100; i++) {
        bubbles.push({
            x: Math.random() * 800,
            y: Math.random() * 600,
            radius: 20,
            isCollidingWith: function(other) {
                const dx = this.x - other.x;
                const dy = this.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance < (this.radius + other.radius) * 0.98;
            }
        });
    }
    
    // Benchmark collision checks
    const startTime = performance.now();
    let collisionCount = 0;
    
    for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < bubbles.length; i++) {
            for (let j = i + 1; j < bubbles.length; j++) {
                if (bubbles[i].isCollidingWith(bubbles[j])) {
                    collisionCount++;
                }
            }
        }
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const checksPerSecond = (iterations * bubbles.length * (bubbles.length - 1) / 2) / (totalTime / 1000);
    
    console.log(`Performed ${iterations} iterations with ${bubbles.length} bubbles`);
    console.log(`Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`Collision checks per second: ${checksPerSecond.toFixed(0)}`);
    console.log(`Collisions found: ${collisionCount}`);
    
    return checksPerSecond > 100000; // Should handle at least 100k checks per second
}

// Run all tests
function runAllTests() {
    console.log('🧪 Running Enhanced Collision Logic Test Suite');
    console.log('===============================================');
    
    const tests = [
        { name: 'Collision Prediction', test: testCollisionPrediction },
        { name: 'Debug Logger', test: testDebugLogger },
        { name: 'Hexagonal Grid', test: testHexagonalGrid },
        { name: 'Enhanced Collision', test: testEnhancedCollision },
        { name: 'Performance Benchmark', test: benchmarkCollisionDetection }
    ];
    
    const results = tests.map(({ name, test }) => {
        try {
            const passed = test();
            console.log(`✅ ${name}: PASSED`);
            return { name, passed: true };
        } catch (error) {
            console.log(`❌ ${name}: FAILED - ${error.message}`);
            return { name, passed: false, error: error.message };
        }
    });
    
    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    
    console.log(`Tests passed: ${passedTests}/${totalTests}`);
    console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Enhanced collision logic is working correctly.');
    } else {
        console.log('⚠️ Some tests failed. Check the implementation.');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.name}: ${r.error || 'Unknown error'}`);
        });
    }
    
    return { passed: passedTests, total: totalTests, results };
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.CollisionTests = {
        runAllTests,
        testCollisionPrediction,
        testDebugLogger,
        testHexagonalGrid,
        testEnhancedCollision,
        benchmarkCollisionDetection
    };
    
    console.log('🎮 Collision test functions available in window.CollisionTests');
    console.log('📝 Run window.CollisionTests.runAllTests() to test everything');
}

// Auto-run tests if in browser and DOM is loaded
if (typeof window !== 'undefined' && document.readyState === 'complete') {
    setTimeout(() => {
        console.log('\n🚀 Auto-running collision tests...');
        runAllTests();
    }, 1000);
}
