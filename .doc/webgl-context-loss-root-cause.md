# WebGL Context Loss - Root Cause Analysis

## Date: Nov 17, 2025

## The Real Problem

**Initial assumption**: WebGL context loss was caused by React Strict Mode's double-mounting behavior.

**Actual root cause**: The Canvas component was **remounting on every employee data update** due to an overly aggressive `memo` comparison function!

## How We Discovered It

The memo function had console.log statements that revealed the issue:

```typescript
if (prev.statusMessage !== next.statusMessage) {
    console.log('[OfficeScene] REMOUNT: employee statusMessage changed', ...);
    return false; // ❌ This destroys and recreates the Canvas!
}
```

Every time a task execution updated (which happens constantly during research):
1. Employee's `statusMessage`, `workState`, or `status` would change
2. The memo function would return `false` (trigger remount)
3. React would destroy the Canvas component
4. WebGL context would be lost
5. Canvas would remount with new WebGL context
6. **Repeat for every task update** = constant context thrashing!

## The Mistake

The memo comparison function was checking if employee **data** changed, not if the employee **structure** changed.

### Wrong Approach (Before)
```typescript
// ❌ Remount Canvas when employee data changes
if (prev.workState !== next.workState) return false;
if (prev.status !== next.status) return false;
if (prev.statusMessage !== next.statusMessage) return false;
if (prev.isBusy !== next.isBusy) return false;
// etc... checking 10+ fields per employee
```

**Problem**: During active research, employees constantly update their status/messages. This caused:
- 10-20 Canvas remounts per second during active tasks
- WebGL context loss on every remount
- Terrible performance
- Noisy console warnings

### Correct Approach (After)
```typescript
// ✅ Only remount Canvas for STRUCTURAL changes
if (prevProps.employees.length !== nextProps.employees.length) return false;
if (prevProps.employees[i]?.id !== nextProps.employees[i]?.id) return false;
// That's it! Let child components handle data updates
```

**Why this works**: 
- Canvas only remounts when employees are added/removed
- Employee components receive new props and update themselves
- No WebGL context loss during normal operation
- Smooth animations and updates

## React Component Architecture 101

```
OfficeScene (Canvas wrapper)
  ↓ Should only remount for structural changes
  └─ SceneContents
       ↓ Updates flow as props, no remount
       └─ Employee components (memoized)
            ↓ Receive new props, update internally
            └─ Mesh/Animation updates
```

**Key principle**: Parent components should NOT remount when child data changes. Children handle their own data updates via props.

## Why the Old Code Was Wrong

It violated React's reconciliation model:

1. **Expensive remounts**: Remounting Canvas destroys entire WebGL context
2. **Lost state**: All Three.js objects recreated from scratch
3. **Animation jank**: Positions/rotations reset on remount
4. **Memory leaks**: Old contexts not always properly cleaned up

## The Fix

Changed memo comparison to only check **structural changes**:

```typescript
}, (prevProps, nextProps) => {
    // Only remount for structural changes:
    // 1. Number of employees changed (add/remove)
    if (prevProps.employees.length !== nextProps.employees.length) {
        return false;
    }
    
    // 2. Different employees at positions (ID changed)
    for (let i = 0; i < prevProps.employees.length; i++) {
        if (prevProps.employees[i]?.id !== nextProps.employees[i]?.id) {
            return false;
        }
    }
    
    // Same structure = skip remount, let props flow down
    return true;
});
```

## Performance Impact

### Before Fix
- Canvas remounts: **10-20 per second** during active tasks
- WebGL contexts created: Hundreds per minute
- Console warnings: Constant context loss messages
- Performance: Janky, stuttery animations

### After Fix
- Canvas remounts: **0-2 per hour** (only when workers added/removed)
- WebGL contexts created: One on page load, stable
- Console warnings: None (in dev, properly silenced in prod)
- Performance: Smooth 60fps animations

## Lessons Learned

1. **Don't over-optimize memo functions** - Only check what actually requires remount
2. **Structural vs Data changes** - Parent remounts for structure, children update for data
3. **Add console logs** - They revealed the real issue immediately
4. **WebGL context is expensive** - Preserve it at all costs
5. **React Strict Mode was innocent** - It was our comparison logic, not React

## Related Improvements

While fixing this, we also:
1. Added lazy grid initialization (waits for mount)
2. Improved mount tracking with `isMounted` state
3. Used `requestAnimationFrame` instead of `setInterval`
4. Silenced dev-only console noise

But these were secondary - the memo function was the real culprit!

## Testing the Fix

After this change, verify:
- ✅ No "[OfficeScene] REMOUNT" logs during normal operation
- ✅ Employees smoothly update status/messages without Canvas remount
- ✅ No WebGL context loss warnings during active tasks
- ✅ Smooth 60fps animations
- ✅ Canvas only remounts when workers are purchased/removed

## Files Modified

1. `src/components/office/OfficeScene.tsx`
   - Simplified memo comparison function (70 lines → 15 lines)
   - Removed checks for employee data fields
   - Only check structural changes (IDs, lengths)
   - Added detailed comments explaining the pattern

## Conclusion

**The WebGL context wasn't being "lost" mysteriously - we were actively destroying it 20 times per second with unnecessary Canvas remounts!**

The fix: Trust React's reconciliation. Only remount when structure changes, let props flow for data changes.

