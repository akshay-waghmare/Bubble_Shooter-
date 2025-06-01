// Test to identify the missing bubble issue
// The problem likely stems from effectiveGridCols calculation mismatch

console.log('=== DEBUGGING MISSING BUBBLE ISSUE ===');

// Constants from game
const BUBBLE_RADIUS = 20;
const GRID_COL_SPACING = BUBBLE_RADIUS * 2; // 40
const GRID_COLS = 14;
const BUBBLE_COLORS = ['#FF6B6B', '#4ECDC4', '#1E3A8A', '#00FF88', '#FECA57', '#FF9FF3'];

// Test canvas width
const TEST_CANVAS_WIDTH = 400;

// Simulate the generateInfiniteStack calculation
function simulateGenerateInfiniteStack() {
    console.log('\n1. GENERATE INFINITE STACK CALCULATION:');
    const maxBubblesPerRow = Math.floor((TEST_CANVAS_WIDTH - BUBBLE_RADIUS * 2) / GRID_COL_SPACING);
    const effectiveGridCols = Math.min(GRID_COLS, maxBubblesPerRow);
    
    console.log(`   Canvas width: ${TEST_CANVAS_WIDTH}`);
    console.log(`   Available width: ${TEST_CANVAS_WIDTH - BUBBLE_RADIUS * 2}`);
    console.log(`   Max bubbles per row: ${maxBubblesPerRow}`);
    console.log(`   Effective grid cols: ${effectiveGridCols}`);
    
    // Generate row data exactly like generateInfiniteStack does
    const rowData = new Array(effectiveGridCols).fill(null);
    for (let col = 0; col < effectiveGridCols; col++) {
        rowData[col] = BUBBLE_COLORS[0]; // Simple color assignment
    }
    
    console.log(`   Generated array length: ${rowData.length}`);
    console.log(`   Non-null elements: ${rowData.filter(c => c !== null).length}`);
    
    return { effectiveGridCols, rowData };
}

// Simulate the addNewRow calculation
function simulateAddNewRow(newRowData) {
    console.log('\n2. ADD NEW ROW CALCULATION:');
    const maxBubblesPerRow = Math.floor((TEST_CANVAS_WIDTH - BUBBLE_RADIUS * 2) / GRID_COL_SPACING);
    const effectiveGridCols = Math.min(GRID_COLS, maxBubblesPerRow);
    
    console.log(`   Canvas width: ${TEST_CANVAS_WIDTH}`);
    console.log(`   Available width: ${TEST_CANVAS_WIDTH - BUBBLE_RADIUS * 2}`);
    console.log(`   Max bubbles per row: ${maxBubblesPerRow}`);
    console.log(`   Effective grid cols: ${effectiveGridCols}`);
    console.log(`   Received array length: ${newRowData.length}`);
    
    // Process exactly like addNewRow does
    let bubblesCreated = 0;
    let missingColors = 0;
    
    for (let col = 0; col < effectiveGridCols; col++) {
        let color = newRowData[col];
        
        if (!color) {
            color = BUBBLE_COLORS[0]; // Fallback
            missingColors++;
            console.warn(`   Missing color at col ${col}, using fallback`);
        }
        
        bubblesCreated++;
    }
    
    console.log(`   Bubbles created: ${bubblesCreated}`);
    console.log(`   Missing colors: ${missingColors}`);
    
    return { effectiveGridCols, bubblesCreated, missingColors };
}

// Run the test
const generateResult = simulateGenerateInfiniteStack();
const addRowResult = simulateAddNewRow(generateResult.rowData);

console.log('\n3. COMPARISON:');
console.log(`   Generate effective cols: ${generateResult.effectiveGridCols}`);
console.log(`   AddRow effective cols: ${addRowResult.effectiveGridCols}`);
console.log(`   Array length: ${generateResult.rowData.length}`);
console.log(`   Bubbles created: ${addRowResult.bubblesCreated}`);

if (generateResult.effectiveGridCols === addRowResult.effectiveGridCols && 
    generateResult.rowData.length === addRowResult.bubblesCreated) {
    console.log('\n✅ NO MISMATCH DETECTED - Calculations are consistent');
} else {
    console.log('\n❌ MISMATCH DETECTED!');
    console.log('   This could be causing the missing bubble issue');
}

console.log('\n4. TESTING EDGE CASES:');

// Test with different canvas widths to see if the issue appears at certain sizes
const testWidths = [300, 350, 400, 560, 600, 700];

testWidths.forEach(width => {
    const maxBubbles = Math.floor((width - BUBBLE_RADIUS * 2) / GRID_COL_SPACING);
    const effective = Math.min(GRID_COLS, maxBubbles);
    
    console.log(`Width ${width}px: max=${maxBubbles}, effective=${effective}, limited=${maxBubbles > GRID_COLS ? 'by GRID_COLS' : 'by canvas'}`);
});
