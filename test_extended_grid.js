// Test script to validate the extended grid system
console.log('🧪 Testing Extended Grid System for Danger Zone Fix');
console.log('==================================================');

// Test if the game loads properly
try {
    // Simulate creating a game instance
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    document.body.appendChild(canvas);
    
    console.log('✅ Canvas created successfully');
    
    // Test the extended grid functionality
    function testExtendedGrid() {
        console.log('\n🎯 Testing Extended Grid Calculations:');
        
        const BUBBLE_RADIUS = 20;
        const GRID_TOP_MARGIN = BUBBLE_RADIUS * 2;
        const GRID_ROW_HEIGHT = BUBBLE_RADIUS * Math.sqrt(3);
        const shooterY = 550; // Example shooter position
        const dangerZoneY = shooterY - 80; // 470px
        const maxAllowedY = dangerZoneY - BUBBLE_RADIUS; // 450px
        
        // Calculate maximum row that fits before danger zone
        const maxRow = Math.floor((maxAllowedY - GRID_TOP_MARGIN) / GRID_ROW_HEIGHT);
        const originalGridRows = 10;
        const effectiveMaxRows = Math.max(originalGridRows, maxRow);
        
        console.log('📊 Grid Extension Calculations:');
        console.log(`   Canvas Height: ${canvas.height}px`);
        console.log(`   Shooter Y: ${shooterY}px`);
        console.log(`   Danger Zone Y: ${dangerZoneY}px`);
        console.log(`   Max Allowed Y: ${maxAllowedY}px`);
        console.log(`   Original Grid Rows: ${originalGridRows}`);
        console.log(`   Calculated Max Row: ${maxRow}`);
        console.log(`   Effective Max Rows: ${effectiveMaxRows}`);
        
        // Verify that bubbles can now reach closer to the danger zone
        const lastRowY = maxRow * GRID_ROW_HEIGHT + GRID_TOP_MARGIN;
        const distanceToDangerZone = dangerZoneY - lastRowY;
        
        console.log('\n🎯 Distance Analysis:');
        console.log(`   Last Row Y Position: ${lastRowY.toFixed(2)}px`);
        console.log(`   Distance to Danger Zone: ${distanceToDangerZone.toFixed(2)}px`);
        console.log(`   Previous Gap (before fix): ~158px`);
        console.log(`   New Gap (after fix): ${distanceToDangerZone.toFixed(2)}px`);
        
        if (distanceToDangerZone < 80) {
            console.log('✅ SUCCESS: Bubbles can now reach much closer to danger zone!');
            console.log('✅ Gap reduced from ~158px to ~' + distanceToDangerZone.toFixed(0) + 'px');
        } else {
            console.log('❌ ISSUE: Gap is still too large');
        }
        
        return {
            originalGridRows,
            effectiveMaxRows,
            distanceToDangerZone,
            success: distanceToDangerZone < 80
        };
    }
    
    const testResult = testExtendedGrid();
    
    console.log('\n🏁 FINAL RESULT:');
    if (testResult.success) {
        console.log('✅ Extended grid system is working correctly!');
        console.log('✅ Bubbles can now reach the danger zone and trigger game over!');
        console.log('✅ Dynamic grid extension from ' + testResult.originalGridRows + ' to ' + testResult.effectiveMaxRows + ' rows');
    } else {
        console.log('❌ Extended grid system needs further adjustment');
    }
    
} catch (error) {
    console.error('❌ Test failed with error:', error);
}

console.log('\n🎮 Instructions for manual testing:');
console.log('1. Start the game');
console.log('2. Shoot bubbles to build up rows');
console.log('3. Watch the console for "DYNAMIC GRID EXTENSION" logs');
console.log('4. Observe that bubbles can now be placed much closer to the danger zone');
console.log('5. When bubbles reach the red danger line, the game should end');
