// Advanced test to identify the missing bubble issue
// Focus on canvas width timing and calculation consistency

console.log('=== ADVANCED MISSING BUBBLE INVESTIGATION ===');

// Mock a Game-like class to test the exact scenario
class MockGame {
    constructor() {
        // Simulate exactly how the Game class initializes
        this.canvas = {
            width: 0,  // Start with 0 like in actual initialization
            height: 0
        };
        
        // Constants from game
        this.BUBBLE_RADIUS = 20;
        this.GRID_COL_SPACING = this.BUBBLE_RADIUS * 2; // 40
        this.GRID_COLS = 14;
        this.BUBBLE_COLORS = ['#FF6B6B', '#4ECDC4', '#1E3A8A', '#00FF88', '#FECA57', '#FF9FF3'];
        
        this.infiniteStack = [];
        this.difficulty = 'novice';
        this.difficultySettings = {
            novice: { colors: 3 }
        };
        
        // Simulate the initialization sequence
        this.initializeCanvasDimensions();
        this.generateInfiniteStack();
    }
    
    initializeCanvasDimensions() {
        // This simulates what happens in the Game constructor
        const viewportWidth = 800; // Simulated viewport
        const viewportHeight = 600;
        const maxWidth = Math.min(viewportWidth - 20, 400);
        const portraitHeight = Math.min(viewportHeight - 100, maxWidth * 1.6);
        
        this.canvas.width = maxWidth;
        this.canvas.height = portraitHeight;
        
        console.log('Canvas dimensions set to:', { width: this.canvas.width, height: this.canvas.height });
    }
    
    generateInfiniteStack() {
        console.log('\n=== GENERATE INFINITE STACK ===');
        console.log('Canvas width at generation time:', this.canvas.width);
        
        if (this.canvas.width === 0) {
            console.error('🚨 CANVAS WIDTH IS 0 - This could cause calculation errors!');
        }
        
        const settings = this.difficultySettings[this.difficulty];
        const colorSubset = this.BUBBLE_COLORS.slice(0, settings.colors);
        const maxBubblesPerRow = Math.floor((this.canvas.width - this.BUBBLE_RADIUS * 2) / this.GRID_COL_SPACING);
        const effectiveGridCols = Math.min(this.GRID_COLS, maxBubblesPerRow);
        
        console.log('Calculation details:');
        console.log(`  Canvas width: ${this.canvas.width}`);
        console.log(`  Available width: ${this.canvas.width - this.BUBBLE_RADIUS * 2}`);
        console.log(`  Max bubbles per row: ${maxBubblesPerRow}`);
        console.log(`  Effective grid cols: ${effectiveGridCols}`);
        
        // Generate a test row
        const rowData = new Array(effectiveGridCols).fill(null);
        
        for (let col = 0; col < effectiveGridCols; col++) {
            rowData[col] = colorSubset[Math.floor(Math.random() * colorSubset.length)];
        }
        
        this.infiniteStack.push(rowData);
        
        console.log(`Generated row with ${rowData.length} elements`);
        console.log(`Non-null elements: ${rowData.filter(c => c !== null).length}`);
        
        return { effectiveGridCols, rowData };
    }
    
    addNewRow() {
        console.log('\n=== ADD NEW ROW ===');
        console.log('Canvas width at addNewRow time:', this.canvas.width);
        
        if (this.infiniteStack.length === 0) {
            console.error('🚨 INFINITE STACK IS EMPTY!');
            return null;
        }
        
        const newRowData = this.infiniteStack.shift();
        
        // Recalculate effectiveGridCols (this is what happens in the real game)
        const maxBubblesPerRow = Math.floor((this.canvas.width - this.BUBBLE_RADIUS * 2) / this.GRID_COL_SPACING);
        const effectiveGridCols = Math.min(this.GRID_COLS, maxBubblesPerRow);
        
        console.log('Recalculation details:');
        console.log(`  Canvas width: ${this.canvas.width}`);
        console.log(`  Available width: ${this.canvas.width - this.BUBBLE_RADIUS * 2}`);
        console.log(`  Max bubbles per row: ${maxBubblesPerRow}`);
        console.log(`  Effective grid cols: ${effectiveGridCols}`);
        console.log(`  Received array length: ${newRowData.length}`);
        
        let bubblesCreated = 0;
        let missingColors = 0;
        
        for (let col = 0; col < effectiveGridCols; col++) {
            let color = newRowData[col];
            
            if (!color) {
                console.warn(`🚨 Missing color at col ${col}!`);
                missingColors++;
                color = this.BUBBLE_COLORS[0]; // Fallback
            }
            
            bubblesCreated++;
        }
        
        console.log(`Bubbles created: ${bubblesCreated}`);
        console.log(`Missing colors: ${missingColors}`);
        
        // CRITICAL TEST: What if the recalculated effectiveGridCols is different?
        if (effectiveGridCols !== newRowData.length) {
            console.error('🚨 MISMATCH DETECTED!');
            console.error(`  Generated array length: ${newRowData.length}`);
            console.error(`  Current effective cols: ${effectiveGridCols}`);
            console.error('  This could cause missing bubbles!');
        }
        
        return { effectiveGridCols, bubblesCreated, missingColors, arrayLength: newRowData.length };
    }
}

// Test different scenarios
console.log('\n=== TESTING DIFFERENT SCENARIOS ===');

// Scenario 1: Normal initialization
console.log('\n1. Normal initialization:');
const game1 = new MockGame();
const result1 = game1.addNewRow();

// Scenario 2: Canvas width changes between generation and use
console.log('\n2. Canvas width changes between calls:');
const game2 = new MockGame();
// Simulate canvas resize after generation but before addNewRow
game2.canvas.width = 350; // Smaller canvas
const result2 = game2.addNewRow();

// Scenario 3: Zero canvas width during generation
console.log('\n3. Zero canvas width during generation:');
class BuggyMockGame extends MockGame {
    initializeCanvasDimensions() {
        // Don't set canvas dimensions (simulates initialization timing bug)
        console.log('Canvas dimensions left at default:', { width: this.canvas.width, height: this.canvas.height });
    }
}

const game3 = new BuggyMockGame();
// Now set proper dimensions and try addNewRow
game3.canvas.width = 400;
game3.canvas.height = 640;
const result3 = game3.addNewRow();

console.log('\n=== SUMMARY ===');
console.log('Scenario 1 (Normal):', result1 ? '✅ No issues' : '❌ Failed');
console.log('Scenario 2 (Canvas resize):', result2 && result2.arrayLength === result2.effectiveGridCols ? '✅ No issues' : '❌ Mismatch detected');
console.log('Scenario 3 (Zero width):', result3 ? '✅ Recovered' : '❌ Failed');

if (result2 && result2.arrayLength !== result2.effectiveGridCols) {
    console.log('\n🔍 FOUND THE ISSUE:');
    console.log('Canvas width changes between generateInfiniteStack() and addNewRow()');
    console.log('This causes a mismatch in effectiveGridCols calculation');
    console.log('Solution: Store effectiveGridCols with each generated row OR ensure consistent canvas width');
}
