/**
 * TDD Test Suite for Console.log Performance Fix
 * Ensures game behavior remains unchanged after removing console.log bottlenecks
 */

// Test configuration
const TEST_CONFIG = {
    testDurationMs: 5000,
    expectedMinFps: 45,
    maxAllowedFrameTime: 25, // milliseconds
    consoleLogCountLimit: 0 // Should be 0 after fix
};

class PerformanceTestSuite {
    constructor() {
        this.testResults = [];
        this.frameMetrics = [];
        this.consoleLogCount = 0;
        this.gameInstance = null;
        this.startTime = 0;
        this.endTime = 0;
    }

    // Override console.log to count calls
    setupConsoleInterception() {
        const originalConsoleLog = console.log;
        this.consoleLogCount = 0;
        
        console.log = (...args) => {
            this.consoleLogCount++;
            // Only call original for critical errors
            if (args[0] && args[0].includes('ERROR')) {
                originalConsoleLog.apply(console, args);
            }
        };
        
        return originalConsoleLog;
    }

    // Restore console.log after test
    restoreConsole(originalConsoleLog) {
        console.log = originalConsoleLog;
    }

    // Test 1: Verify game initializes correctly without console spam
    async testGameInitialization() {
        const originalConsoleLog = this.setupConsoleInterception();
        
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 600;
            
            this.gameInstance = new BubbleShooterGame(canvas);
            
            // Allow initialization to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const initializationPassed = {
                gameCreated: !!this.gameInstance,
                gridInitialized: this.gameInstance.gridBubbles && this.gameInstance.gridBubbles.length > 0,
                shooterCreated: !!this.gameInstance.shooter,
                consoleLogCount: this.consoleLogCount,
                consoleLogAcceptable: this.consoleLogCount <= TEST_CONFIG.consoleLogCountLimit
            };
            
            this.testResults.push({
                test: 'Game Initialization',
                passed: Object.values(initializationPassed).every(v => v === true || typeof v === 'number'),
                details: initializationPassed
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'Game Initialization',
                passed: false,
                error: error.message
            });
        } finally {
            this.restoreConsole(originalConsoleLog);
        }
    }

    // Test 2: Measure frame performance during active gameplay
    async testFramePerformance() {
        if (!this.gameInstance) {
            this.testResults.push({
                test: 'Frame Performance',
                passed: false,
                error: 'Game not initialized'
            });
            return;
        }

        const originalConsoleLog = this.setupConsoleInterception();
        
        try {
            // Start the game
            this.gameInstance.startGame();
            
            // Collect frame metrics
            this.frameMetrics = [];
            this.startTime = performance.now();
            const testDuration = TEST_CONFIG.testDurationMs;
            
            const frameMonitor = () => {
                const frameStart = performance.now();
                
                // Simulate game update
                if (this.gameInstance.update) {
                    this.gameInstance.update();
                }
                if (this.gameInstance.draw) {
                    this.gameInstance.draw();
                }
                
                const frameTime = performance.now() - frameStart;
                this.frameMetrics.push(frameTime);
                
                // Continue monitoring if within test duration
                if (performance.now() - this.startTime < testDuration) {
                    requestAnimationFrame(frameMonitor);
                } else {
                    this.analyzeFramePerformance();
                }
            };
            
            requestAnimationFrame(frameMonitor);
            
            // Wait for test completion
            await new Promise(resolve => setTimeout(resolve, testDuration + 100));
            
        } catch (error) {
            this.testResults.push({
                test: 'Frame Performance',
                passed: false,
                error: error.message
            });
        } finally {
            this.restoreConsole(originalConsoleLog);
        }
    }

    analyzeFramePerformance() {
        if (this.frameMetrics.length === 0) {
            this.testResults.push({
                test: 'Frame Performance',
                passed: false,
                error: 'No frame metrics collected'
            });
            return;
        }

        const avgFrameTime = this.frameMetrics.reduce((a, b) => a + b, 0) / this.frameMetrics.length;
        const maxFrameTime = Math.max(...this.frameMetrics);
        const fps = 1000 / avgFrameTime;
        const droppedFrames = this.frameMetrics.filter(time => time > TEST_CONFIG.maxAllowedFrameTime).length;
        
        const performanceResults = {
            totalFrames: this.frameMetrics.length,
            avgFrameTime: Math.round(avgFrameTime * 100) / 100,
            maxFrameTime: Math.round(maxFrameTime * 100) / 100,
            averageFps: Math.round(fps * 100) / 100,
            droppedFrames: droppedFrames,
            consoleLogsDuringTest: this.consoleLogCount,
            fpsAcceptable: fps >= TEST_CONFIG.expectedMinFps,
            frameTimeAcceptable: avgFrameTime <= TEST_CONFIG.maxAllowedFrameTime,
            consoleLogAcceptable: this.consoleLogCount <= TEST_CONFIG.consoleLogCountLimit
        };

        this.testResults.push({
            test: 'Frame Performance',
            passed: performanceResults.fpsAcceptable && 
                   performanceResults.frameTimeAcceptable && 
                   performanceResults.consoleLogAcceptable,
            details: performanceResults
        });
    }

    // Test 3: Verify collision detection still works after optimization
    async testCollisionDetection() {
        if (!this.gameInstance) {
            this.testResults.push({
                test: 'Collision Detection',
                passed: false,
                error: 'Game not initialized'
            });
            return;
        }

        const originalConsoleLog = this.setupConsoleInterception();
        
        try {
            // Create a test bubble
            const testBubble = new Bubble(200, 500, '#FF0000');
            testBubble.vx = 0;
            testBubble.vy = -10;
            
            this.gameInstance.flyingBubbles.push(testBubble);
            
            // Run collision detection for several frames
            let collisionDetected = false;
            for (let i = 0; i < 10; i++) {
                const initialLength = this.gameInstance.flyingBubbles.length;
                this.gameInstance.update();
                
                // Check if bubble was processed (collision or out of bounds)
                if (this.gameInstance.flyingBubbles.length !== initialLength) {
                    collisionDetected = true;
                    break;
                }
            }
            
            const collisionResults = {
                collisionSystemWorking: collisionDetected,
                consoleLogCount: this.consoleLogCount,
                consoleLogAcceptable: this.consoleLogCount <= TEST_CONFIG.consoleLogCountLimit
            };
            
            this.testResults.push({
                test: 'Collision Detection',
                passed: collisionResults.collisionSystemWorking && collisionResults.consoleLogAcceptable,
                details: collisionResults
            });
            
        } catch (error) {
            this.testResults.push({
                test: 'Collision Detection',
                passed: false,
                error: error.message
            });
        } finally {
            this.restoreConsole(originalConsoleLog);
        }
    }

    // Run all tests
    async runAllTests() {
        console.log('🧪 Starting TDD Performance Fix Test Suite...');
        
        await this.testGameInitialization();
        await this.testFramePerformance();
        await this.testCollisionDetection();
        
        this.generateReport();
    }

    generateReport() {
        const passedTests = this.testResults.filter(t => t.passed).length;
        const totalTests = this.testResults.length;
        
        console.log('\n📊 TDD Test Results Summary:');
        console.log(`✅ Passed: ${passedTests}/${totalTests}`);
        
        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.test}: ${result.passed ? 'PASSED' : 'FAILED'}`);
            
            if (result.details) {
                console.log('   Details:', result.details);
            }
            if (result.error) {
                console.log('   Error:', result.error);
            }
        });
        
        if (passedTests === totalTests) {
            console.log('\n🎉 All tests passed! Performance optimization successful.');
        } else {
            console.log('\n⚠️  Some tests failed. Review the optimization.');
        }
        
        return { passed: passedTests, total: totalTests, success: passedTests === totalTests };
    }
}

// Export for use in HTML test files
if (typeof window !== 'undefined') {
    window.PerformanceTestSuite = PerformanceTestSuite;
    window.TEST_CONFIG = TEST_CONFIG;
}
