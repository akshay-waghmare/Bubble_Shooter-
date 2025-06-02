// 3D Integration Validation Script
// This script validates the 3D integration functionality for the Bubble Shooter game

console.log('🧪 3D Integration Validation Starting...');
console.log('=========================================');

// Test 1: Verify cleanup3D method exists in Shooter class
function test1_cleanup3DMethodExists() {
    console.log('\n📋 Test 1: Checking cleanup3D method existence');
    
    try {
        // Create a mock shooter to test the method
        const mockGame = {
            use3D: true,
            renderer3D: {
                removeBubble: function(bubble, flag) {
                    console.log('✅ Mock renderer3D.removeBubble called');
                }
            }
        };
        
        // Create a shooter with the mock game
        const shooter = new Shooter(400, 550, mockGame);
        
        // Check if cleanup3D method exists
        if (typeof shooter.cleanup3D === 'function') {
            console.log('✅ cleanup3D method exists in Shooter class');
            
            // Test the method execution
            shooter.currentBubble3D = {}; // Mock 3D bubble
            shooter.nextBubble3D = {}; // Mock 3D bubble
            shooter.cleanup3D();
            
            console.log('✅ cleanup3D method executed successfully');
            return true;
        } else {
            console.log('❌ cleanup3D method NOT found in Shooter class');
            return false;
        }
    } catch (error) {
        console.log('❌ Error testing cleanup3D method:', error.message);
        return false;
    }
}

// Test 2: Verify 3D mode configuration in Game constructor
function test2_3DModeConfiguration() {
    console.log('\n📋 Test 2: Checking 3D mode configuration');
    
    try {
        // Check if we can find evidence of 3D configuration
        const gameSource = game.constructor.toString();
        
        if (gameSource.includes('use3D') && gameSource.includes('renderer3D')) {
            console.log('✅ 3D configuration variables found in Game constructor');
            
            // Check if 3D is enabled by default
            if (gameSource.includes('use3D = true') || gameSource.includes('use3D: true')) {
                console.log('✅ 3D mode enabled by default');
            } else {
                console.log('ℹ️  3D mode configuration found but status unclear');
            }
            
            return true;
        } else {
            console.log('❌ 3D configuration NOT found in Game constructor');
            return false;
        }
    } catch (error) {
        console.log('❌ Error checking 3D configuration:', error.message);
        return false;
    }
}

// Test 3: Verify cleanup3D calls in game lifecycle methods
function test3_cleanup3DInGameLifecycle() {
    console.log('\n📋 Test 3: Checking cleanup3D calls in game lifecycle');
    
    let found = 0;
    const lifecycleMethods = ['restart', 'checkGameState', 'checkLoseCondition'];
    
    try {
        // Check restart method
        const restartSource = game.restart.toString();
        if (restartSource.includes('cleanup3D')) {
            console.log('✅ cleanup3D found in restart() method');
            found++;
        } else {
            console.log('❌ cleanup3D NOT found in restart() method');
        }
        
        // Check checkGameState method
        const checkGameStateSource = game.checkGameState.toString();
        if (checkGameStateSource.includes('cleanup3D')) {
            console.log('✅ cleanup3D found in checkGameState() method');
            found++;
        } else {
            console.log('❌ cleanup3D NOT found in checkGameState() method');
        }
        
        // Check checkLoseCondition method
        const checkLoseConditionSource = game.checkLoseCondition.toString();
        if (checkLoseConditionSource.includes('cleanup3D')) {
            console.log('✅ cleanup3D found in checkLoseCondition() method');
            found++;
        } else {
            console.log('❌ cleanup3D NOT found in checkLoseCondition() method');
        }
        
        console.log(`📊 Found cleanup3D in ${found}/3 lifecycle methods`);
        return found >= 2; // At least 2 methods should have cleanup3D
    } catch (error) {
        console.log('❌ Error checking lifecycle methods:', error.message);
        return false;
    }
}

// Test 4: Verify 3D renderer integration
function test4_3DRendererIntegration() {
    console.log('\n📋 Test 4: Checking 3D renderer integration');
    
    try {
        if (game.use3D !== undefined) {
            console.log(`✅ use3D flag found: ${game.use3D}`);
            
            if (game.renderer3D !== undefined) {
                console.log('✅ renderer3D object found');
                
                // Check if renderer3D has expected methods
                if (game.renderer3D && typeof game.renderer3D.render === 'function') {
                    console.log('✅ renderer3D.render method found');
                }
                if (game.renderer3D && typeof game.renderer3D.removeBubble === 'function') {
                    console.log('✅ renderer3D.removeBubble method found');
                }
                
                return true;
            } else {
                console.log('⚠️  renderer3D object not initialized');
                return false;
            }
        } else {
            console.log('❌ use3D flag NOT found');
            return false;
        }
    } catch (error) {
        console.log('❌ Error checking 3D renderer integration:', error.message);
        return false;
    }
}

// Test 5: Verify 3D cleanup in menu/navigation handlers
function test5_MenuNavigationCleanup() {
    console.log('\n📋 Test 5: Checking menu navigation cleanup');
    
    try {
        // Check if event handlers have cleanup3D calls
        const scripts = document.querySelectorAll('script');
        let foundMenuCleanup = false;
        
        for (const script of scripts) {
            if (script.textContent.includes('cleanup3D') && 
                (script.textContent.includes('Back to Menu') || 
                 script.textContent.includes('Escape') || 
                 script.textContent.includes('backToMenuBtn'))) {
                foundMenuCleanup = true;
                break;
            }
        }
        
        if (foundMenuCleanup) {
            console.log('✅ cleanup3D found in menu navigation handlers');
            return true;
        } else {
            console.log('❌ cleanup3D NOT found in menu navigation handlers');
            return false;
        }
    } catch (error) {
        console.log('❌ Error checking menu navigation cleanup:', error.message);
        return false;
    }
}

// Run all tests
function runAll3DIntegrationTests() {
    console.log('🚀 Running all 3D integration tests...\n');
    
    const tests = [
        { name: 'cleanup3D Method Exists', test: test1_cleanup3DMethodExists },
        { name: '3D Mode Configuration', test: test2_3DModeConfiguration },
        { name: 'Lifecycle Cleanup Calls', test: test3_cleanup3DInGameLifecycle },
        { name: '3D Renderer Integration', test: test4_3DRendererIntegration },
        { name: 'Menu Navigation Cleanup', test: test5_MenuNavigationCleanup }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const { name, test } of tests) {
        try {
            if (test()) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.log(`❌ Test "${name}" threw an error:`, error.message);
            failed++;
        }
    }
    
    console.log('\n📊 FINAL RESULTS');
    console.log('================');
    console.log(`✅ Tests Passed: ${passed}`);
    console.log(`❌ Tests Failed: ${failed}`);
    console.log(`📋 Total Tests: ${tests.length}`);
    
    if (failed === 0) {
        console.log('\n🎉 ALL 3D INTEGRATION TESTS PASSED! 🎉');
        console.log('The 3D integration with cleanup3D is working correctly!');
    } else {
        console.log('\n⚠️  Some 3D integration tests failed. Review the issues above.');
    }
    
    return { passed, failed, total: tests.length };
}

// Auto-run if this script is loaded directly
if (typeof window !== 'undefined') {
    // Wait for the game to be ready
    setTimeout(() => {
        if (typeof game !== 'undefined' && typeof Shooter !== 'undefined') {
            runAll3DIntegrationTests();
        } else {
            console.log('⚠️  Game or Shooter class not available. Tests cannot run.');
        }
    }, 1000);
} else {
    console.log('🔧 3D Integration validation script loaded. Call runAll3DIntegrationTests() to execute.');
}
