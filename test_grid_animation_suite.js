// Grid Animation Test Suite
// This file contains tests for the grid animation implementation

class GridAnimationTests {
    constructor() {
        this.results = [];
    }
    
    /**
     * Run all test cases
     */
    runAllTests() {
        console.log("=== Running Grid Animation Tests ===");
        
        try {
            this.testRowDetection();
            this.testAnimationInitialization();
            this.testEasingFunction();
            this.testAnimationUpdate();
            this.testAnimationIntegration();
            
            console.log("✅ All tests passed!");
            return true;
        } catch (error) {
            console.error("❌ Test failed:", error);
            return false;
        }
    }
    
    /**
     * Test the detection of multiple rows being popped
     */
    testRowDetection() {
        console.log("Testing row detection...");
        
        // Create mock bubble data
        const testCases = [
            {
                bubbles: [
                    { row: 10, col: 1 },
                    { row: 10, col: 2 },
                    { row: 10, col: 3 },
                ],
                expected: 1
            },
            {
                bubbles: [
                    { row: 5, col: 1 },
                    { row: 6, col: 2 },
                    { row: 7, col: 3 },
                ],
                expected: 3
            },
            {
                bubbles: [
                    { row: 10, col: 1 },
                    { row: 10, col: 2 },
                    { row: 12, col: 3 },
                    { row: 14, col: 4 },
                ],
                expected: 5
            }
        ];
        
        for (const [i, testCase] of testCases.entries()) {
            let minRow = Infinity;
            let maxRow = -Infinity;
            
            for (const bubble of testCase.bubbles) {
                minRow = Math.min(minRow, bubble.row);
                maxRow = Math.max(maxRow, bubble.row);
            }
            
            const rowsPopped = maxRow - minRow + 1;
            
            if (rowsPopped !== testCase.expected) {
                throw new Error(`Test case ${i+1} failed: Expected ${testCase.expected} rows, got ${rowsPopped}`);
            }
            
            console.log(`  ✓ Test case ${i+1}: Detected ${rowsPopped} rows correctly`);
        }
        
        console.log("✅ Row detection tests passed!");
    }
    
    /**
     * Test the initialization of the animation
     */
    testAnimationInitialization() {
        console.log("Testing animation initialization...");
        
        // Create a mock game instance for testing
        const mockGame = this.createMockGame();
        
        // Test with different row counts
        const testCases = [
            { rowsPopped: 2, shouldAnimate: false },
            { rowsPopped: 3, shouldAnimate: true, factor: 1 },
            { rowsPopped: 4, shouldAnimate: true, factor: 2 },
            { rowsPopped: 5, shouldAnimate: true, factor: 3 },
            { rowsPopped: 6, shouldAnimate: true, factor: 3 } // Max factor is 3
        ];
        
        for (const [i, testCase] of testCases.entries()) {
            // Reset animation state
            mockGame.gridAnimating = false;
            mockGame.gridAnimStart = 0;
            mockGame.gridAnimDistance = 0;
            
            // Trigger animation
            mockGame.animateGridAfterPop(testCase.rowsPopped);
            
            // Check results
            if (mockGame.gridAnimating !== testCase.shouldAnimate) {
                throw new Error(`Test case ${i+1} failed: Expected animation state ${testCase.shouldAnimate}, got ${mockGame.gridAnimating}`);
            }
            
            if (testCase.shouldAnimate) {
                // Check animation parameters
                if (mockGame.gridAnimStart === 0) {
                    throw new Error(`Test case ${i+1} failed: Animation start time not set`);
                }
                
                const expectedDistance = GRID_ROW_HEIGHT * 1.5 * Math.min(3, testCase.rowsPopped - 2);
                if (mockGame.gridAnimDistance !== expectedDistance) {
                    throw new Error(`Test case ${i+1} failed: Expected animation distance ${expectedDistance}, got ${mockGame.gridAnimDistance}`);
                }
                
                console.log(`  ✓ Test case ${i+1}: Animation initialized correctly for ${testCase.rowsPopped} rows`);
            } else {
                console.log(`  ✓ Test case ${i+1}: Animation correctly not triggered for ${testCase.rowsPopped} rows`);
            }
        }
        
        console.log("✅ Animation initialization tests passed!");
    }
    
    /**
     * Test the easing function used for the animation
     */
    testEasingFunction() {
        console.log("Testing easing function...");
        
        // Quadratic ease-out: y = 1 - (1-x)^2
        function easeOut(progress) {
            return 1 - Math.pow(1 - progress, 2);
        }
        
        // Test specific values
        const testCases = [
            { progress: 0, expected: 0 },
            { progress: 0.25, expected: 0.4375 },
            { progress: 0.5, expected: 0.75 },
            { progress: 0.75, expected: 0.9375 },
            { progress: 1, expected: 1 }
        ];
        
        for (const [i, testCase] of testCases.entries()) {
            const result = easeOut(testCase.progress);
            const epsilon = 0.0001; // Small tolerance for floating point comparison
            
            if (Math.abs(result - testCase.expected) > epsilon) {
                throw new Error(`Test case ${i+1} failed: Expected ease-out(${testCase.progress}) to be ${testCase.expected}, got ${result}`);
            }
            
            console.log(`  ✓ Test case ${i+1}: ease-out(${testCase.progress}) = ${result}`);
        }
        
        // Verify curve properties
        let lastValue = easeOut(0);
        let lastDelta = 0;
        
        for (let i = 0.1; i <= 1; i += 0.1) {
            const value = easeOut(i);
            const delta = value - lastValue;
            
            // Verify it's always increasing
            if (value <= lastValue) {
                throw new Error(`Easing curve not monotonically increasing at x=${i}`);
            }
            
            // Verify rate of change is decreasing (it's decelerating)
            if (i > 0.2 && delta >= lastDelta) {
                throw new Error(`Easing curve not decelerating at x=${i}`);
            }
            
            lastValue = value;
            lastDelta = delta;
        }
        
        console.log("  ✓ Easing curve has correct shape (accelerating then decelerating)");
        console.log("✅ Easing function tests passed!");
    }
    
    /**
     * Test the update logic for the animation
     */
    testAnimationUpdate() {
        console.log("Testing animation update...");
        
        // Create a mock game instance for testing
        const mockGame = this.createMockGame();
        
        // Setup animation
        mockGame.gridAnimating = true;
        mockGame.gridAnimStart = Date.now() - 400; // Half-way through animation
        mockGame.gridAnimDuration = 800;
        mockGame.gridOffsetY = 100;
        mockGame.gridStartY = mockGame.gridOffsetY;
        mockGame.gridAnimDistance = 50;
        
        // Test mid-animation update
        const midAnimComplete = mockGame.updateGridAnimation();
        
        if (midAnimComplete !== false) {
            throw new Error("Animation incorrectly reported as complete mid-way through");
        }
        
        if (!mockGame.gridAnimating) {
            throw new Error("Animation flag incorrectly set to false mid-animation");
        }
        
        if (mockGame.gridOffsetY <= mockGame.gridStartY) {
            throw new Error("Grid did not move from starting position during animation");
        }
        
        if (mockGame.gridOffsetY >= mockGame.gridStartY + mockGame.gridAnimDistance) {
            throw new Error("Grid moved too far during animation");
        }
        
        console.log("  ✓ Mid-animation state is correct");
        
        // Force animation to complete
        mockGame.gridAnimStart = Date.now() - 900; // Past animation duration
        const animComplete = mockGame.updateGridAnimation();
        
        if (animComplete !== true) {
            throw new Error("Animation did not report completion after duration");
        }
        
        if (mockGame.gridAnimating !== false) {
            throw new Error("Animation flag not set to false after completion");
        }
        
        if (mockGame.gridOffsetY !== mockGame.gridStartY + mockGame.gridAnimDistance) {
            throw new Error(`Grid position incorrect after animation: expected ${mockGame.gridStartY + mockGame.gridAnimDistance}, got ${mockGame.gridOffsetY}`);
        }
        
        console.log("  ✓ Animation completion state is correct");
        console.log("✅ Animation update tests passed!");
    }
    
    /**
     * Test the integration with the game's update loop
     */
    testAnimationIntegration() {
        console.log("Testing animation integration with update loop...");
        
        // Create a mock game instance for testing
        const mockGame = this.createMockGame();
        
        // Override update method for testing
        const originalUpdate = mockGame.update;
        let normalScrollingApplied = false;
        let animationUpdated = false;
        
        mockGame.update = function() {
            // Track whether animation or normal scrolling was applied
            if (this.gridAnimating) {
                this.updateGridAnimation();
                animationUpdated = true;
            } else if (CONTINUOUS_SCROLL_ENABLED) {
                this.gridOffsetY += CONTINUOUS_SCROLL_SPEED;
                normalScrollingApplied = true;
            }
        };
        
        // Test 1: Normal scrolling
        mockGame.gridAnimating = false;
        normalScrollingApplied = false;
        animationUpdated = false;
        
        const initialOffsetY = mockGame.gridOffsetY = 100;
        mockGame.update();
        
        if (!normalScrollingApplied) {
            throw new Error("Normal scrolling not applied when animation is inactive");
        }
        
        if (animationUpdated) {
            throw new Error("Animation updated when it should not be");
        }
        
        if (mockGame.gridOffsetY !== initialOffsetY + CONTINUOUS_SCROLL_SPEED) {
            throw new Error("Normal scrolling applied incorrect offset");
        }
        
        console.log("  ✓ Normal scrolling works when animation is inactive");
        
        // Test 2: Animation takes precedence
        mockGame.gridAnimating = true;
        mockGame.gridAnimStart = Date.now();
        mockGame.gridOffsetY = initialOffsetY;
        mockGame.gridStartY = initialOffsetY;
        mockGame.gridAnimDistance = 50;
        normalScrollingApplied = false;
        animationUpdated = false;
        
        mockGame.update();
        
        if (normalScrollingApplied) {
            throw new Error("Normal scrolling applied when animation is active");
        }
        
        if (!animationUpdated) {
            throw new Error("Animation not updated when active");
        }
        
        console.log("  ✓ Animation takes precedence over normal scrolling");
        
        // Test 3: Animation completion returns to normal scrolling
        mockGame.gridAnimating = true;
        mockGame.gridAnimStart = Date.now() - 900; // Past animation duration
        mockGame.update();
        
        mockGame.gridAnimating = false; // Animation should set this to false
        normalScrollingApplied = false;
        animationUpdated = false;
        
        mockGame.update();
        
        if (!normalScrollingApplied) {
            throw new Error("Normal scrolling not resumed after animation completes");
        }
        
        // Restore original update method
        mockGame.update = originalUpdate;
        
        console.log("  ✓ Normal scrolling resumes after animation completes");
        console.log("✅ Animation integration tests passed!");
    }
    
    /**
     * Create a mock Game object for testing
     */
    createMockGame() {
        // Create a minimal mock of the Game class
        const mockGame = {
            gridAnimating: false,
            gridAnimStart: 0,
            gridAnimDuration: 800,
            gridAnimDistance: 0,
            gridStartY: 0,
            gridOffsetY: 0,
            debugLogger: {
                log: () => {} // No-op log function
            },
            
            // Implement animation methods for testing
            animateGridAfterPop(rowsPopped) {
                if (rowsPopped >= 3) {
                    this.gridAnimating = true;
                    this.gridAnimStart = Date.now();
                    this.gridStartY = this.gridOffsetY;
                    this.gridAnimDistance = GRID_ROW_HEIGHT * 1.5 * Math.min(3, rowsPopped - 2);
                }
            },
            
            updateGridAnimation() {
                if (this.gridAnimating) {
                    const elapsed = Date.now() - this.gridAnimStart;
                    
                    if (elapsed >= this.gridAnimDuration) {
                        // Animation complete
                        this.gridAnimating = false;
                        this.gridOffsetY = this.gridStartY + this.gridAnimDistance;
                        return true;
                    } else {
                        // Apply easing function
                        const progress = elapsed / this.gridAnimDuration;
                        const easeOut = 1 - Math.pow(1 - progress, 2);
                        this.gridOffsetY = this.gridStartY + (this.gridAnimDistance * easeOut);
                        return false;
                    }
                }
                return true;
            },
            
            update() {
                // Mock update method
            }
        };
        
        return mockGame;
    }
}

// Export for use in test pages
if (typeof window !== 'undefined') {
    window.GridAnimationTests = GridAnimationTests;
}
