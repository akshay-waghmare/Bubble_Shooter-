// Debug shooting angles and velocities
console.log('=== SHOOTING DEBUG TEST ===');

// Test the angle calculation manually
function testAngleCalculation() {
    console.log('Testing angle calculations:');
    
    // Simulate shooter at center bottom
    const shooterX = 400;
    const shooterY = 550;
    
    // Test different mouse positions
    const testPositions = [
        { x: 200, y: 300, label: 'Upper Left' },
        { x: 600, y: 300, label: 'Upper Right' },
        { x: 400, y: 200, label: 'Straight Up' },
        { x: 100, y: 400, label: 'Left' },
        { x: 700, y: 400, label: 'Right' },
        { x: 200, y: 500, label: 'Lower Left' },
        { x: 600, y: 500, label: 'Lower Right' }
    ];
    
    testPositions.forEach(pos => {
        const deltaX = pos.x - shooterX;
        const deltaY = pos.y - shooterY;
        let angle = Math.atan2(deltaY, deltaX);
        
        // Apply the new angle limits
        if (angle > Math.PI * 0.75) {
            angle = Math.PI * 0.75;
        } else if (angle < -Math.PI * 0.75) {
            angle = -Math.PI * 0.75;
        }
        
        const vx = Math.cos(angle) * 35; // SHOOTER_SPEED
        const vy = Math.sin(angle) * 35;
        
        console.log(`${pos.label}: Mouse(${pos.x}, ${pos.y}) -> Angle: ${(angle * 180 / Math.PI).toFixed(1)}° -> Velocity(${vx.toFixed(1)}, ${vy.toFixed(1)})`);
    });
}

// Test when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(testAngleCalculation, 1000);
});

// Test with actual game if it exists
setTimeout(() => {
    if (typeof Game !== 'undefined') {
        console.log('Game class available for testing');
        
        // Hook into shooting to log actual values
        const originalShoot = Shooter.prototype.shoot;
        Shooter.prototype.shoot = function() {
            console.log('ACTUAL SHOOT - Angle:', this.angle, 'Degrees:', (this.angle * 180 / Math.PI).toFixed(1));
            const result = originalShoot.call(this);
            if (result) {
                console.log('ACTUAL BUBBLE - vx:', result.vx, 'vy:', result.vy);
            }
            return result;
        };
    }
}, 2000);
