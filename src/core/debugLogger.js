// Debug logging and performance monitoring system
// Provides debugging capabilities for the Bubble Shooter game

export class DebugLogger {
    constructor(enabled = false) {
        this.enabled = enabled;
        this.collisionLog = [];
        this.frameCount = 0;
        this.performanceMetrics = {
            avgFrameTime: 0,
            collisionChecks: 0,
            gridSnaps: 0
        };
    }

    log(category, message, data = null) {
        if (!this.enabled) return;
        const timestamp = performance.now();
        const logEntry = {
            timestamp,
            frame: this.frameCount,
            category,
            message,
            data
        };
        
        console.log(`[${category.toUpperCase()}] Frame ${this.frameCount}: ${message}`, data || '');
        
        // Store specific logs for analysis
        if (category === 'collision') {
            this.collisionLog.push(logEntry);
            if (this.collisionLog.length > 100) {
                this.collisionLog.shift(); // Keep only last 100 collision events
            }
        }
    }

    updateMetrics(frameTime, collisionChecks, gridSnaps) {
        this.performanceMetrics.avgFrameTime = (this.performanceMetrics.avgFrameTime * 0.9) + (frameTime * 0.1);
        this.performanceMetrics.collisionChecks += collisionChecks;
        this.performanceMetrics.gridSnaps += gridSnaps;
    }

    nextFrame() {
        this.frameCount++;
    }

    getReport() {
        return {
            frame: this.frameCount,
            ...this.performanceMetrics,
            recentCollisions: this.collisionLog.slice(-10)
        };
    }

    enable() {
        this.enabled = true;
        console.log('🐛 Debug logging enabled');
    }

    disable() {
        this.enabled = false;
        console.log('🐛 Debug logging disabled');
    }

    toggle() {
        this.enabled = !this.enabled;
        console.log(`🐛 Debug logging ${this.enabled ? 'enabled' : 'disabled'}`);
    }
}
