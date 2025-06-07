/**
 * Bubble Count Cache Test Suite - TDD Implementation
 * Testing cache optimization to replace expensive .flat().filter() operations
 * Target: Fix performance bottleneck at line 1701 in game.js
 */

// Test utilities
const TestUtils = {
    createTestGame() {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        document.body.appendChild(canvas);
        
        const game = new Game(canvas);
        return game;
    },

    cleanupTestGame(game) {
        if (game && game.canvas && game.canvas.parentNode) {
            game.canvas.parentNode.removeChild(game.canvas);
        }
    },

    measurePerformance(operation, iterations = 1000) {
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            operation();
        }
        const end = performance.now();
        return (end - start) / iterations; // Average time per operation
    },

    // Create a grid with known bubble count for testing
    createTestGrid(game, bubbleCount) {
        // Clear existing grid
        game.gridBubbles = Array(game.TOTAL_GRID_ROWS).fill().map(() => Array(game.GRID_COLS).fill(null));
        
        let added = 0;
        for (let row = 0; row < game.TOTAL_GRID_ROWS && added < bubbleCount; row++) {
            for (let col = 0; col < game.GRID_COLS && added < bubbleCount; col++) {
                game.gridBubbles[row][col] = {
                    x: col * game.BUBBLE_SIZE,
                    y: row * game.BUBBLE_SIZE,
                    color: 'red',
                    type: 'red'
                };
                added++;
            }
        }
        return added;
    },

    // Get actual count using the expensive operation
    getActualBubbleCount(game) {
        return game.gridBubbles.flat().filter(b => b !== null).length;
    }
};

// Test Suite
const BubbleCacheTests = {
    results: [],
    
    log(testName, passed, message = '') {
        this.results.push({ testName, passed, message });
        console.log(`${passed ? '✓' : '✗'} ${testName}${message ? ': ' + message : ''}`);
    },

    // Phase 1: Baseline Tests - Capture current behavior
    testBaslinePerformance() {
        console.log('\n=== PHASE 1: BASELINE PERFORMANCE TESTS ===');
        
        const game = TestUtils.createTestGame();
        
        // Test with small grid (current performance)
        TestUtils.createTestGrid(game, 50);
        const smallGridTime = TestUtils.measurePerformance(() => {
            TestUtils.getActualBubbleCount(game);
        }, 100);
        
        // Test with large grid (problem case)
        TestUtils.createTestGrid(game, 1800);
        const largeGridTime = TestUtils.measurePerformance(() => {
            TestUtils.getActualBubbleCount(game);
        }, 10); // Fewer iterations for large grid
        
        this.log('Baseline Small Grid Performance', true, `${smallGridTime.toFixed(4)}ms per operation`);
        this.log('Baseline Large Grid Performance', true, `${largeGridTime.toFixed(4)}ms per operation`);
        this.log('Performance Degradation', largeGridTime > smallGridTime * 10, 
                `${(largeGridTime / smallGridTime).toFixed(1)}x slower with large grid`);
        
        TestUtils.cleanupTestGame(game);
    },

    // Phase 2: Red Phase - Failing Tests for Cache
    testCacheInitialization() {
        console.log('\n=== PHASE 2: CACHE INITIALIZATION TESTS (RED) ===');
        
        const game = TestUtils.createTestGame();
        
        // Test cache property exists
        this.log('Cache Property Exists', 
                typeof game.gridBubbleCount === 'number', 
                `Type: ${typeof game.gridBubbleCount}`);
        
        // Test cache starts at zero
        this.log('Cache Starts at Zero', 
                game.gridBubbleCount === 0, 
                `Initial value: ${game.gridBubbleCount}`);
        
        // Test cache initialization method exists (will fail initially)
        this.log('Cache Initialize Method Exists', 
                typeof game.initializeBubbleCount === 'function',
                'Method should exist to properly initialize cache');
        
        TestUtils.cleanupTestGame(game);
    },

    testCacheAccuracy() {
        console.log('\n=== PHASE 2: CACHE ACCURACY TESTS (RED) ===');
        
        const game = TestUtils.createTestGame();
        
        // Test empty grid
        const actualEmpty = TestUtils.getActualBubbleCount(game);
        this.log('Empty Grid Cache Accuracy', 
                game.gridBubbleCount === actualEmpty,
                `Cache: ${game.gridBubbleCount}, Actual: ${actualEmpty}`);
        
        // Test with bubbles added
        TestUtils.createTestGrid(game, 100);
        const actualWithBubbles = TestUtils.getActualBubbleCount(game);
        this.log('Grid with Bubbles Cache Accuracy', 
                game.gridBubbleCount === actualWithBubbles,
                `Cache: ${game.gridBubbleCount}, Actual: ${actualWithBubbles}`);
        
        TestUtils.cleanupTestGame(game);
    },

    testCacheOperations() {
        console.log('\n=== PHASE 2: CACHE OPERATION TESTS (RED) ===');
        
        const game = TestUtils.createTestGame();
        
        // Test increment operation
        const initialCount = game.gridBubbleCount;
        if (typeof game.incrementBubbleCount === 'function') {
            game.incrementBubbleCount();
            this.log('Cache Increment Operation', 
                    game.gridBubbleCount === initialCount + 1,
                    `Before: ${initialCount}, After: ${game.gridBubbleCount}`);
        } else {
            this.log('Cache Increment Method Exists', false, 'Method not implemented yet');
        }
        
        // Test decrement operation
        if (typeof game.decrementBubbleCount === 'function') {
            game.decrementBubbleCount();
            this.log('Cache Decrement Operation', 
                    game.gridBubbleCount === initialCount,
                    `After decrement: ${game.gridBubbleCount}`);
        } else {
            this.log('Cache Decrement Method Exists', false, 'Method not implemented yet');
        }
        
        TestUtils.cleanupTestGame(game);
    },

    testSnapBubbleToGridCacheUpdate() {
        console.log('\n=== PHASE 2: SNAP BUBBLE CACHE TESTS (RED) ===');
        
        const game = TestUtils.createTestGame();
        
        const initialCacheCount = game.gridBubbleCount;
        const initialActualCount = TestUtils.getActualBubbleCount(game);
        
        // Create a test bubble
        const testBubble = {
            x: 100,
            y: 100,
            color: 'red',
            type: 'red'
        };
        
        // Snap bubble to grid (should update cache)
        game.snapBubbleToGrid(testBubble);
        
        const newCacheCount = game.gridBubbleCount;
        const newActualCount = TestUtils.getActualBubbleCount(game);
        
        this.log('Snap Bubble Updates Cache', 
                newCacheCount === initialCacheCount + 1,
                `Cache: ${initialCacheCount} → ${newCacheCount}`);
        
        this.log('Snap Bubble Cache Accuracy', 
                newCacheCount === newActualCount,
                `Cache: ${newCacheCount}, Actual: ${newActualCount}`);
        
        TestUtils.cleanupTestGame(game);
    },

    testPopBubblesCacheUpdate() {
        console.log('\n=== PHASE 2: POP BUBBLES CACHE TESTS (RED) ===');
        
        const game = TestUtils.createTestGame();
        
        // Add some bubbles first
        TestUtils.createTestGrid(game, 20);
        const initialCacheCount = game.gridBubbleCount;
        const initialActualCount = TestUtils.getActualBubbleCount(game);
        
        // Find some bubbles to pop
        const bubblesToPop = [];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                if (game.gridBubbles[row] && game.gridBubbles[row][col]) {
                    bubblesToPop.push(game.gridBubbles[row][col]);
                }
            }
        }
        
        if (bubblesToPop.length > 0) {
            game.popBubbles(bubblesToPop);
            
            const newCacheCount = game.gridBubbleCount;
            const newActualCount = TestUtils.getActualBubbleCount(game);
            
            this.log('Pop Bubbles Updates Cache', 
                    newCacheCount === initialCacheCount - bubblesToPop.length,
                    `Popped ${bubblesToPop.length}, Cache: ${initialCacheCount} → ${newCacheCount}`);
            
            this.log('Pop Bubbles Cache Accuracy', 
                    newCacheCount === newActualCount,
                    `Cache: ${newCacheCount}, Actual: ${newActualCount}`);
        } else {
            this.log('Pop Bubbles Test Setup', false, 'No bubbles found to pop');
        }
        
        TestUtils.cleanupTestGame(game);
    },

    testPerformanceImprovement() {
        console.log('\n=== PHASE 3: PERFORMANCE IMPROVEMENT TESTS ===');
        
        const game = TestUtils.createTestGame();
        TestUtils.createTestGrid(game, 1800);
        
        // Measure old method
        const oldMethodTime = TestUtils.measurePerformance(() => {
            TestUtils.getActualBubbleCount(game);
        }, 10);
        
        // Measure new method (cache access)
        const newMethodTime = TestUtils.measurePerformance(() => {
            return game.gridBubbleCount;
        }, 1000);
        
        const improvementFactor = oldMethodTime / newMethodTime;
        
        this.log('Cache Performance Improvement', 
                improvementFactor > 50,
                `${improvementFactor.toFixed(1)}x faster (${oldMethodTime.toFixed(4)}ms → ${newMethodTime.toFixed(4)}ms)`);
        
        TestUtils.cleanupTestGame(game);
    },

    testStressTestCacheAccuracy() {
        console.log('\n=== PHASE 3: STRESS TEST CACHE ACCURACY ===');
        
        const game = TestUtils.createTestGame();
        
        // Perform many operations and check cache stays in sync
        for (let i = 0; i < 50; i++) {
            // Add some bubbles
            const testBubble = {
                x: (i * 40) % 800,
                y: (i * 30) % 600,
                color: 'red',
                type: 'red'
            };
            game.snapBubbleToGrid(testBubble);
            
            // Check cache accuracy every 10 operations
            if (i % 10 === 0) {
                const cacheCount = game.gridBubbleCount;
                const actualCount = TestUtils.getActualBubbleCount(game);
                
                if (cacheCount !== actualCount) {
                    this.log('Stress Test Cache Sync', false, 
                            `Desync at operation ${i}: Cache=${cacheCount}, Actual=${actualCount}`);
                    TestUtils.cleanupTestGame(game);
                    return;
                }
            }
        }
        
        this.log('Stress Test Cache Sync', true, 'Cache remained synchronized through 50 operations');
        
        TestUtils.cleanupTestGame(game);
    },

    // Run all tests
    runAllTests() {
        console.log('🧪 Starting Bubble Count Cache Test Suite');
        console.log('Testing TDD implementation for performance optimization');
        this.results = [];
        
        this.testBaslinePerformance();
        this.testCacheInitialization();
        this.testCacheAccuracy();
        this.testCacheOperations();
        this.testSnapBubbleToGridCacheUpdate();
        this.testPopBubblesCacheUpdate();
        this.testPerformanceImprovement();
        this.testStressTestCacheAccuracy();
        
        this.displaySummary();
    },

    displaySummary() {
        console.log('\n=== TEST SUMMARY ===');
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        const failed = this.results.filter(r => !r.passed);
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${total - passed}`);
        
        if (failed.length > 0) {
            console.log('\nFailed Tests:');
            failed.forEach(test => {
                console.log(`  ✗ ${test.testName}: ${test.message}`);
            });
        }
        
        const passRate = (passed / total * 100).toFixed(1);
        console.log(`\nPass Rate: ${passRate}%`);
        
        if (passed === total) {
            console.log('🎉 All tests passed! Cache implementation is working correctly.');
        } else {
            console.log('⚠️ Some tests failed. Implementation needs work.');
        }
    }
};

// Auto-run tests when page loads (if in browser)
if (typeof window !== 'undefined') {
    window.BubbleCacheTests = BubbleCacheTests;
    window.TestUtils = TestUtils;
}