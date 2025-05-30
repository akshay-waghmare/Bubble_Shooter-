// Hexagonal Grid Verification Script
console.log("🔬 Perfect Hexagonal Grid Verification");
console.log("=====================================");

const BUBBLE_RADIUS = 20;
const GRID_COL_SPACING = BUBBLE_RADIUS * 2; // = 40
const GRID_ROW_HEIGHT = BUBBLE_RADIUS * Math.sqrt(3); // = 34.64
const HEX_OFFSET = BUBBLE_RADIUS; // = 20

console.log(`📐 Mathematical Constants:`);
console.log(`   Bubble Radius: ${BUBBLE_RADIUS}px`);
console.log(`   Column Spacing: ${GRID_COL_SPACING}px (exactly 2 × radius)`);
console.log(`   Row Height: ${GRID_ROW_HEIGHT.toFixed(2)}px (√3 × radius)`);
console.log(`   Hex Offset: ${HEX_OFFSET}px (exact radius offset)`);
console.log("");

// Test perfect hexagonal positioning
function getColPosition(row, col) {
    const isOddRow = row % 2 === 1;
    const baseX = col * GRID_COL_SPACING + BUBBLE_RADIUS;
    const offsetX = isOddRow ? HEX_OFFSET : 0;
    return baseX + offsetX;
}

function getRowPosition(row) {
    return row * GRID_ROW_HEIGHT + (BUBBLE_RADIUS * 2);
}

console.log("🎯 Perfect Grid Positions (First 3 rows):");
for (let row = 0; row < 3; row++) {
    const positions = [];
    for (let col = 0; col < 5; col++) {
        const x = getColPosition(row, col);
        const y = getRowPosition(row);
        positions.push(`(${x}, ${y.toFixed(1)})`);
    }
    const rowType = row % 2 === 0 ? "EVEN" : "ODD ";
    console.log(`   Row ${row} [${rowType}]: ${positions.join(", ")}`);
}

console.log("");
console.log("✅ Notice the perfect hexagonal offset pattern!");
console.log("✅ Odd rows are offset by exactly 20px (one radius)");
console.log("✅ Row spacing is exactly √3 × radius = 34.64px");
