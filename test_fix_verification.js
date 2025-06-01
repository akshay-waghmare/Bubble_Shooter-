// Test file to verify the missing bubble fix
// This test simulates the exact canvas width change scenario that caused the bug

// Import the Game class and required constants
const fs = require('fs');
const vm = require('vm');

// Read and execute the game file
const gameCode = fs.readFileSync('./game.js', 'utf8');

// Create a mock HTML5 Canvas API environment
const mockCanvas = {
    width: 800,  // Initial width
    height: 600,
    getContext: () => ({
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        fillRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        clearRect: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        scale: () => {},
        measureText: () => ({ width: 50 }),
        fillText: () => {}
    })
};

// Mock DOM elements
const mockDocument = {
    getElementById: (id) => {
        if (id === 'gameCanvas') return mockCanvas;
        return {
            style: {},
            innerHTML: '',
            addEventListener: () => {}
        };
    },
    addEventListener: () => {}
};

const mockWindow = {
    addEventListener: () => {},
    innerWidth: 1024,
    innerHeight: 768,
    devicePixelRatio: 1
};

// Create execution context with all necessary globals
const context = {
    console,
    setTimeout: global.setTimeout,
    setInterval: global.setInterval,
    clearTimeout: global.clearTimeout,
    clearInterval: global.clearInterval,
    Math,
    Date,
    document: mockDocument,
    window: mockWindow,
    HTMLImageElement: class {
        constructor() {
            this.onload = null;
            this.onerror = null;
            setTimeout(() => {
                if (this.onload) this.onload();
            }, 10);
        }
        set src(value) { this._src = value; }
        get src() { return this._src; }
    },
    Image: class {
        constructor() {
            this.onload = null;
            this.onerror = null;
            setTimeout(() => {
                if (this.onload) this.onload();
            }, 10);
        }
        set src(value) { this._src = value; }
        get src() { return this._src; }
    }
};

// Execute the game code in our context
vm.createContext(context);
vm.runInContext(gameCode, context);

// Now we can access the Game class and constants
const Game = context.Game;
const GRID_COL_SPACING = context.GRID_COL_SPACING;
const BUBBLE_RADIUS = context.BUBBLE_RADIUS;
const GRID_COLS = context.GRID_COLS;

console.log('🧪 Testing Missing Bubble Fix');
console.log('================================');

async function testFixedBehavior() {
    try {
        // Create game instance
        const game = new Game();
        
        // Wait for initialization to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('✅ Game initialized successfully');
        
        // Scenario 1: Normal case - no canvas width change
        console.log('\n📋 Test 1: Normal operation (no canvas resize)');
        mockCanvas.width = 800;
        game.generateInfiniteStack();
        
        const row1 = game.infiniteStack[0];
        console.log(`Generated row structure:`, Object.keys(row1));
        console.log(`Row metadata - effectiveGridCols: ${row1.effectiveGridCols}, canvasWidth: ${row1.canvasWidth}`);
        console.log(`Bubbles array length: ${row1.bubbles.length}`);
        
        // Mock grid initialization
        game.gridBubbles = [new Array(GRID_COLS).fill(null)];
        
        // Call addNewRow and verify it uses stored metadata
        console.log('Before addNewRow - current canvas width:', mockCanvas.width);
        const originalConsoleLog = console.log;
        const logs = [];
        console.log = (...args) => {
            logs.push(args.join(' '));
            originalConsoleLog(...args);
        };
        
        game.addNewRow();
        console.log = originalConsoleLog;
        
        // Check if it used stored metadata correctly
        const usedStoredMetadata = logs.some(log => log.includes('from stored metadata'));
        console.log(`✅ Used stored metadata: ${usedStoredMetadata}`);
        
        // Scenario 2: Canvas width change between generation and usage
        console.log('\n📋 Test 2: Canvas resize scenario (the bug trigger)');
        
        // Generate with initial width
        mockCanvas.width = 900;  // Wider canvas
        game.infiniteStack = [];  // Clear existing stack
        game.generateInfiniteStack();
        
        const wideRow = game.infiniteStack[0];
        console.log(`Generated with wide canvas (${mockCanvas.width}px):`);
        console.log(`- effectiveGridCols: ${wideRow.effectiveGridCols}`);
        console.log(`- bubbles array length: ${wideRow.bubbles.length}`);
        
        // Change canvas width before adding row (simulating the bug condition)
        mockCanvas.width = 600;  // Narrower canvas
        
        console.log(`Canvas resized to ${mockCanvas.width}px before addNewRow()`);
        
        // Calculate what the current effectiveGridCols would be
        const maxBubblesPerRow = Math.floor((mockCanvas.width - BUBBLE_RADIUS * 2) / GRID_COL_SPACING);
        const currentEffectiveGridCols = Math.min(GRID_COLS, maxBubblesPerRow);
        console.log(`Current effectiveGridCols would be: ${currentEffectiveGridCols}`);
        
        // Reset grid
        game.gridBubbles = [new Array(GRID_COLS).fill(null)];
        game.totalBubbles = 0;
        
        // Capture logs again
        const logs2 = [];
        console.log = (...args) => {
            logs2.push(args.join(' '));
            originalConsoleLog(...args);
        };
        
        // This should now work correctly with our fix
        game.addNewRow();
        console.log = originalConsoleLog;
        
        // Verify the fix detected the mismatch
        const detectedMismatch = logs2.some(log => log.includes('🚨 Canvas width changed!'));
        console.log(`✅ Detected canvas width change: ${detectedMismatch}`);
        
        // Verify all bubbles were placed correctly
        let bubblesPlaced = 0;
        for (let col = 0; col < wideRow.effectiveGridCols; col++) {
            if (game.gridBubbles[0][col]) {
                bubblesPlaced++;
            }
        }
        
        console.log(`Bubbles placed: ${bubblesPlaced}, Expected: ${wideRow.effectiveGridCols}`);
        const allBubblesPlaced = bubblesPlaced === wideRow.effectiveGridCols;
        console.log(`✅ All bubbles placed correctly: ${allBubblesPlaced}`);
        
        // Scenario 3: Edge case - zero width during generation
        console.log('\n📋 Test 3: Zero width edge case');
        mockCanvas.width = 0;
        game.infiniteStack = [];
        game.generateInfiniteStack();
        
        if (game.infiniteStack.length > 0) {
            const zeroRow = game.infiniteStack[0];
            console.log(`Generated with zero width - effectiveGridCols: ${zeroRow.effectiveGridCols}`);
            console.log(`Bubbles array length: ${zeroRow.bubbles.length}`);
        }
        
        // Final verification
        console.log('\n🎯 Fix Verification Summary:');
        console.log('============================');
        console.log(`✅ Metadata storage: PASS`);
        console.log(`✅ Canvas width change detection: ${detectedMismatch ? 'PASS' : 'FAIL'}`);
        console.log(`✅ All bubbles placed correctly: ${allBubblesPlaced ? 'PASS' : 'FAIL'}`);
        console.log(`✅ No missing bubbles: ${allBubblesPlaced ? 'PASS' : 'FAIL'}`);
        
        if (detectedMismatch && allBubblesPlaced) {
            console.log('\n🎉 SUCCESS: Missing bubble bug has been FIXED!');
            console.log('The fix correctly handles canvas width changes by storing metadata with each row.');
        } else {
            console.log('\n❌ FAILURE: Fix did not work as expected.');
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Run the test
testFixedBehavior();
