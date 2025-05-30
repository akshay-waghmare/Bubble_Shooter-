# 🎮 Enhanced Bubble Shooter - Quick Debug Guide

## 🚀 Getting Started with Debug Mode

### Basic Setup
1. Open the game in your browser: `http://localhost:8080`
2. Start a new game (select any mode/difficulty)
3. Press **D** to enable debug logging
4. Open browser console (F12) to see detailed logs

### Essential Debug Commands

| Key | Command | What It Does |
|-----|---------|--------------|
| **D** | Toggle Debug | Enable/disable console logging |
| **G** | Show Grid | Display hexagonal grid overlay |
| **I** | Show Info | Performance metrics on screen |
| **P** | Show Predictions | Collision prediction visualization |
| **R** | Generate Report | Performance report in console |
| **C** | Clear Logs | Reset collision history |

## 🔍 What to Look For

### 1. Perfect Grid Placement
- Enable grid with **G** key
- Look for perfect hexagonal alignment
- All bubbles should snap to exact grid positions
- No floating or misaligned bubbles

### 2. Smooth Collision Physics
- Enable predictions with **P** key
- Yellow lines show predicted collision paths
- Wall bounces should feel natural (95% energy retention)
- No jittery or unrealistic movement

### 3. Performance Metrics
- Enable info display with **I** key
- Frame time should stay below 16.67ms (60 FPS)
- Collision checks should be minimal per frame
- No memory leaks in bubble arrays

## 📊 Console Output Examples

### Collision Detection
```
[COLLISION] Frame 145: Grid bubble collision detected
{
  flyingBubble: { x: 300.5, y: 120.2, color: "#FF6B6B" },
  gridBubble: { x: 300, y: 120, color: "#4ECDC4", row: 2, col: 5 },
  distance: 38.9
}
```

### Grid Snapping
```
[SNAP] Frame 146: Bubble successfully snapped to grid
{
  finalPosition: { row: 2, col: 6, x: 320, y: 119.6 },
  color: "#FF6B6B"
}
```

### Match Detection
```
[MATCH] Frame 147: Match threshold reached - popping bubbles
{
  bubblesPopped: 4,
  colors: ["#FF6B6B", "#FF6B6B", "#FF6B6B", "#FF6B6B"]
}
```

## 🧪 Testing Scenarios

### 1. Rapid Fire Test
- Shoot bubbles quickly in succession
- Check for consistent collision detection
- Verify no bubbles get stuck or lost

### 2. Edge Collision Test
- Aim near canvas edges
- Test wall bouncing behavior
- Ensure proper edge case handling

### 3. Complex Pattern Test
- Create dense bubble clusters
- Test avalanche effect
- Verify floating bubble detection

### 4. Performance Stress Test
- Fill screen with many bubbles
- Monitor frame rate stability
- Check collision performance metrics

## 🎯 Expected Results

### ✅ Good Performance Indicators
- Frame time: < 16.67ms consistently
- Collision checks: < 20 per frame
- Grid snaps: 1 per flying bubble collision
- No console errors or warnings

### ⚠️ Warning Signs
- Frame time: > 20ms (performance issues)
- Collision checks: > 50 per frame (inefficient detection)
- Missing snap events (collision logic problems)
- JavaScript errors in console

### 🔧 Troubleshooting

**Bubbles not snapping correctly:**
- Check grid overlay with **G** key
- Verify hexagonal calculations in console
- Look for overlap warnings in logs

**Poor performance:**
- Enable performance display with **I** key
- Check collision check count per frame
- Look for memory leaks in bubble arrays

**Collision detection issues:**
- Enable prediction with **P** key
- Check collision logs in console
- Verify bubble velocities and positions

## 🎨 Visual Debug Features

### Grid Overlay (G key)
- Green dots show grid positions
- Dashed lines show hexagonal connections
- Mathematical constants displayed at bottom

### Collision Prediction (P key)
- Yellow lines show predicted paths
- Red dots indicate grid collisions
- Yellow dots indicate wall collisions

### Debug Info Panel (I key)
- Real-time performance metrics
- Bubble count statistics
- Collision settings display

## 📈 Performance Optimization Tips

1. **Monitor frame time** - Keep below 16.67ms for 60 FPS
2. **Watch collision checks** - Should scale with bubble density
3. **Check memory usage** - Arrays should not grow indefinitely
4. **Verify early termination** - Collision loops should exit efficiently

## 🎮 Game Features to Test

- [x] Perfect hexagonal grid placement
- [x] Smooth wall bouncing physics
- [x] Accurate collision detection
- [x] Proper bubble matching logic
- [x] Avalanche effect for floating bubbles
- [x] Performance optimization
- [x] Visual feedback and animations
- [x] Debug visualization tools

Remember: Debug mode provides powerful insights into game mechanics. Use it to understand collision behavior, optimize performance, and ensure the best gameplay experience!
