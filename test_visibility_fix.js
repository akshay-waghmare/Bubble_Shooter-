// TDD Test for Off-Screen Bubble Popping Fix
// Test file to validate that bubbles outside viewport don't affect gameplay

class VisibilityTestSuite {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    // Helper function to check if a bubble is visible based on its screen position
    isBubbleVisible(game, bubble) {
        const screenY = bubble.y + game.gridOffsetY;
        const viewportTop = -BUBBLE_RADIUS * 2; // Small buffer above viewport
        const viewportBottom = game.canvas.height + BUBBLE_RADIUS * 2; // Small buffer below viewport
        return screenY > viewportTop && screenY < viewportBottom;
    }

    // Helper function to count visible bubbles in the grid
    countVisibleBubbles(game) {
        let count = 0;
        for (let row = 0; row < TOTAL_GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const bubble = game.gridBubbles[row][col];
                if (bubble && this.isBubbleVisible(game, bubble)) {
                    count++;
                }
            }
        }
        return count;
    }

    // Helper function to count all bubbles in the grid
    countAllBubbles(game) {
        let count = 0;
        for (let row = 0; row < TOTAL_GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (game.gridBubbles[row][col]) count++;
            }
        }
        return count;
    }

    // Test: Only visible bubbles should be included in matches
    testVisibleMatchesOnly() {
        console.log('TEST: Only visible bubbles should be included in matches');
        
        // Create a mock game instance
        const canvas = document.createElement('canvas');
        canvas.width = 390;
        canvas.height = 844;
        const game = new Game(canvas);
        game.initGame();

        // Record initial state
        const initialVisibleCount = this.countVisibleBubbles(game);
        const initialScore = game.score;

        // Find a visible bubble position to test
        let testRow = -1, testCol = -1;
        for (let row = BUFFER_ROWS_ABOVE; row < BUFFER_ROWS_ABOVE + GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (game.gridBubbles[row][col]) {
                    testRow = row;
                    testCol = col;
                    break;
                }
            }
            if (testRow !== -1) break;
        }

        if (testRow === -1) {
            console.log('❌ TEST SETUP FAILED: No visible bubbles found');
            return false;
        }

        // Simulate checking matches from this visible position
        const matches = game.checkMatches(testRow, testCol);
        
        // Verify all matches are visible
        let allMatchesVisible = true;
        for (const match of matches) {
            if (!this.isBubbleVisible(game, match)) {
                allMatchesVisible = false;
                console.log('❌ FOUND INVISIBLE MATCH:', {
                    row: match.row,
                    col: match.col,
                    screenY: match.y + game.gridOffsetY
                });
            }
        }

        if (allMatchesVisible && matches.length > 0) {
            console.log('✅ All matches are visible');
            return true;
        } else if (matches.length === 0) {
            console.log('ℹ️  No matches found (expected for single bubble)');
            return true;
        } else {
            console.log('❌ Some matches are invisible');
            return false;
        }
    }

    // Test: Floating bubbles should only include visible ones
    testVisibleFloatingBubblesOnly() {
        console.log('TEST: Floating bubbles should only include visible ones');
        
        const canvas = document.createElement('canvas');
        canvas.width = 390;
        canvas.height = 844;
        const game = new Game(canvas);
        game.initGame();

        // Find floating bubbles
        const floatingBubbles = game.findFloatingBubbles();
        
        // Check if any floating bubbles are invisible
        let allFloatingVisible = true;
        for (const bubble of floatingBubbles) {
            if (!this.isBubbleVisible(game, bubble)) {
                allFloatingVisible = false;
                console.log('❌ FOUND INVISIBLE FLOATING BUBBLE:', {
                    row: bubble.row,
                    col: bubble.col,
                    screenY: bubble.y + game.gridOffsetY
                });
            }
        }

        if (allFloatingVisible) {
            console.log('✅ All floating bubbles are visible');
            return true;
        } else {
            console.log('❌ Some floating bubbles are invisible');
            return false;
        }
    }

    // Test: Score should only increase based on visible bubbles
    testScoreOnlyFromVisibleBubbles() {
        console.log('TEST: Score should only increase based on visible bubbles');
        
        const canvas = document.createElement('canvas');
        canvas.width = 390;
        canvas.height = 844;
        const game = new Game(canvas);
        game.initGame();

        const initialScore = game.score;
        const initialVisibleCount = this.countVisibleBubbles(game);

        // Simulate popping bubbles by directly calling popBubbles
        // Find some visible bubbles to pop
        const visibleBubbles = [];
        for (let row = 0; row < TOTAL_GRID_ROWS && visibleBubbles.length < 3; row++) {
            for (let col = 0; col < GRID_COLS && visibleBubbles.length < 3; col++) {
                const bubble = game.gridBubbles[row][col];
                if (bubble && this.isBubbleVisible(game, bubble)) {
                    visibleBubbles.push(bubble);
                }
            }
        }

        if (visibleBubbles.length === 0) {
            console.log('ℹ️  No visible bubbles to test with');
            return true;
        }

        // Mock popping these visible bubbles
        game.popBubbles(visibleBubbles);
        
        const expectedScoreIncrease = visibleBubbles.length * POINTS_PER_BUBBLE;
        const actualScoreIncrease = game.score - initialScore;

        if (actualScoreIncrease === expectedScoreIncrease) {
            console.log('✅ Score increased correctly for visible bubbles only');
            return true;
        } else {
            console.log('❌ Score increase mismatch:', {
                expected: expectedScoreIncrease,
                actual: actualScoreIncrease,
                bubbleCount: visibleBubbles.length
            });
            return false;
        }
    }

    // Run all tests
    runAllTests() {
        console.log('=== RUNNING VISIBILITY TESTS ===');
        
        const tests = [
            () => this.testVisibleMatchesOnly(),
            () => this.testVisibleFloatingBubblesOnly(),
            () => this.testScoreOnlyFromVisibleBubbles()
        ];

        let passed = 0;
        let total = tests.length;

        for (let i = 0; i < tests.length; i++) {
            try {
                const result = tests[i]();
                if (result) {
                    passed++;
                    console.log(`✅ Test ${i + 1} PASSED`);
                } else {
                    console.log(`❌ Test ${i + 1} FAILED`);
                }
            } catch (error) {
                console.log(`❌ Test ${i + 1} ERROR:`, error.message);
            }
            console.log('---');
        }

        console.log(`=== RESULTS: ${passed}/${total} tests passed ===`);
        return passed === total;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.VisibilityTestSuite = VisibilityTestSuite;
}
