// Quick verification script for the visibility fix
// This can be run in the browser console while the game is running

function verifyVisibilityFix() {
    console.log('🔍 Verifying Visibility Fix...');
    
    if (typeof game === 'undefined' || !game) {
        console.log('❌ Game not found. Start the game first.');
        return false;
    }

    // Check if the visibility method exists
    if (typeof game.isBubbleVisibleOrNearVisible !== 'function') {
        console.log('❌ Visibility fix not implemented.');
        return false;
    }

    console.log('✅ Visibility method found.');

    // Count visible vs total bubbles
    let totalBubbles = 0;
    let visibleBubbles = 0;
    let offScreenBubbles = 0;

    for (let row = 0; row < TOTAL_GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            const bubble = game.gridBubbles[row][col];
            if (bubble) {
                totalBubbles++;
                if (game.isBubbleVisibleOrNearVisible(bubble)) {
                    visibleBubbles++;
                } else {
                    offScreenBubbles++;
                }
            }
        }
    }

    console.log(`📊 Bubble Count Analysis:
    - Total bubbles: ${totalBubbles}
    - Visible bubbles: ${visibleBubbles}
    - Off-screen bubbles: ${offScreenBubbles}`);

    // Test a few off-screen bubbles to ensure they don't interfere
    if (offScreenBubbles > 0) {
        console.log('✅ Off-screen bubbles present - testing that they don\'t affect gameplay...');
        
        // Find an off-screen bubble
        let testBubble = null;
        outerLoop: for (let row = 0; row < BUFFER_ROWS_ABOVE; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const bubble = game.gridBubbles[row][col];
                if (bubble && !game.isBubbleVisibleOrNearVisible(bubble)) {
                    testBubble = bubble;
                    break outerLoop;
                }
            }
        }

        if (testBubble) {
            // Test match checking for off-screen bubble
            const matches = game.checkMatches(testBubble.row, testBubble.col);
            const visibleMatches = matches.filter(b => game.isBubbleVisibleOrNearVisible(b));
            
            console.log(`🧪 Off-screen bubble test:
            - Total matches found: ${matches.length}
            - Visible matches: ${visibleMatches.length}
            - Fix working: ${matches.length === visibleMatches.length ? '✅' : '❌'}`);
        }
    }

    console.log('🎉 Visibility fix verification complete!');
    return true;
}

// Auto-run if called directly
if (typeof window !== 'undefined') {
    // Make available globally for console use
    window.verifyVisibilityFix = verifyVisibilityFix;
    console.log('💡 Visibility fix verification loaded. Run verifyVisibilityFix() in console during gameplay.');
}
