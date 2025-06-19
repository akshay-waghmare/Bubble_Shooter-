// Debug file to monitor game startup

console.log('Debug startup script loaded');

// Function to monitor button clicks
function monitorStartButton() {
    const startGameBtn = document.getElementById('startGame');
    
    if (startGameBtn) {
        console.log('Found Start Game button, adding debug listener');
        
        // Add a debug listener that will log before the actual click handler
        startGameBtn.addEventListener('click', function() {
            console.log('===== START GAME BUTTON CLICKED - DEBUG MONITOR =====');
            console.trace('Click stack trace');
            
            // Log DOM state
            console.log('DOM state:', {
                gameMenu: document.getElementById('gameMenu')?.style.display,
                gameScreen: document.getElementById('gameScreen')?.style.display,
                canvas: document.getElementById('gameCanvas')?.getContext ? 'Available' : 'Not available'
            });
        }, true); // Use capture phase to ensure this runs before other handlers
    } else {
        console.error('Start Game button not found!');
    }
}

// Function to check global game state
function checkGameState() {
    console.log('Current window.game:', window.game ? 'Exists' : 'Not defined');
    
    // Check for event listeners
    const listenerCount = getEventListenerCount();
    console.log(`Estimated event listeners: ${listenerCount}`);
}

// Estimate number of event listeners
function getEventListenerCount() {
    // This is a crude estimation
    let count = 0;
    const elements = document.querySelectorAll('*');
    
    for (const el of elements) {
        if (el.onclick) count++;
        if (el.onmousemove) count++;
        if (el.ontouchstart) count++;
    }
    
    return count;
}

// Monitor canvas for rendering
function monitorCanvas() {
    const canvas = document.getElementById('gameCanvas');
    
    if (canvas) {
        console.log('Canvas found, dimensions:', {
            width: canvas.width,
            height: canvas.height,
            style: {
                width: canvas.style.width,
                height: canvas.style.height
            },
            visible: canvas.style.display !== 'none'
        });
    } else {
        console.error('Canvas not found!');
    }
}

// Run startup diagnostics
function runStartupDiagnostics() {
    console.log('Running startup diagnostics...');
    monitorStartButton();
    checkGameState();
    monitorCanvas();
    
    // Check if FBInstant is initialized
    if (typeof FBInstant !== 'undefined') {
        console.log('FBInstant is available');
    } else {
        console.log('FBInstant is not available');
    }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runStartupDiagnostics);
} else {
    // DOM already loaded
    runStartupDiagnostics();
}

// Add this script to the window object for debugging
window.debugStartup = {
    rerun: runStartupDiagnostics,
    checkGame: checkGameState,
    monitorCanvas: monitorCanvas
};

console.log('Debug startup configuration complete');
