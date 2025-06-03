// Utility functions for the game
// Centralized utility functions for math, color manipulation, and common operations

export class MathUtils {
    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    static randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    static degToRad(degrees) {
        return degrees * Math.PI / 180;
    }

    static radToDeg(radians) {
        return radians * 180 / Math.PI;
    }
}

export class ColorUtils {
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    static rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    static lightenColor(color, factor) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;

        const newR = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * factor));
        const newG = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * factor));
        const newB = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * factor));

        return this.rgbToHex(newR, newG, newB);
    }

    static darkenColor(color, factor) {
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;

        const newR = Math.floor(rgb.r * (1 - factor));
        const newG = Math.floor(rgb.g * (1 - factor));
        const newB = Math.floor(rgb.b * (1 - factor));

        return this.rgbToHex(newR, newG, newB);
    }

    static getRandomColor(colors) {
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

export class GridUtils {
    static getColPosition(row, col, gridColSpacing, hexOffset, bubbleRadius) {
        const isOddRow = row % 2 === 1;
        const baseX = col * gridColSpacing + bubbleRadius;
        return isOddRow ? baseX + hexOffset : baseX;
    }

    static getRowPosition(row, gridTopMargin, gridRowHeight) {
        return row * gridRowHeight + gridTopMargin;
    }

    static getGridCoordinates(x, y, gridColSpacing, gridRowHeight, gridTopMargin, hexOffset, bubbleRadius) {
        const row = Math.round((y - gridTopMargin) / gridRowHeight);
        const isOddRow = row % 2 === 1;
        const adjustedX = isOddRow ? x - hexOffset : x;
        const col = Math.round((adjustedX - bubbleRadius) / gridColSpacing);
        return { row, col };
    }

    static getNeighborPositions(row, col, gridRows, gridCols) {
        const neighbors = [];
        const isOddRow = row % 2 === 1;

        // Define neighbor offsets for hexagonal grid
        const evenRowOffsets = [
            [-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]
        ];
        const oddRowOffsets = [
            [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]
        ];

        const offsets = isOddRow ? oddRowOffsets : evenRowOffsets;

        for (const [dr, dc] of offsets) {
            const newRow = row + dr;
            const newCol = col + dc;

            if (newRow >= 0 && newRow < gridRows && newCol >= 0 && newCol < gridCols) {
                neighbors.push({ row: newRow, col: newCol });
            }
        }

        return neighbors;
    }
}

export class ValidationUtils {
    static isValidGridPosition(row, col, gridRows, gridCols) {
        return row >= 0 && row < gridRows && col >= 0 && col < gridCols;
    }

    static isValidCanvasPosition(x, y, canvasWidth, canvasHeight) {
        return x >= 0 && x <= canvasWidth && y >= 0 && y <= canvasHeight;
    }

    static validateBubbleData(bubble) {
        return bubble && 
               typeof bubble.x === 'number' && 
               typeof bubble.y === 'number' && 
               typeof bubble.color === 'string' &&
               typeof bubble.radius === 'number';
    }
}

export class PerformanceUtils {
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static debounce(func, delay) {
        let debounceTimer;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        };
    }

    static measurePerformance(func, name) {
        return function(...args) {
            const start = performance.now();
            const result = func.apply(this, args);
            const end = performance.now();
            console.log(`${name} took ${end - start} milliseconds`);
            return result;
        };
    }
}
