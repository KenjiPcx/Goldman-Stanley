# Office Queries Cleanup Summary

## Date: Nov 17, 2025

## Overview
Cleaned up office visualization queries to align with the queue-based worker system.

## Changes Made

### 1. Removed `getActiveTaskExecutions` Query
**Why**: This query was part of the old employee-mapping approach where we fetched all active task executions and mapped them to employees. Now we use the work queue system exclusively.

**What it did**:
- Fetched all task executions from the last 24 hours
- Got latest step for each task
- Returned array of task executions with steps

**Why it's not needed**:
- `getUserWorkQueueWithWorkers` now provides all the task information we need
- Queue-based approach is more accurate (shows assigned workers)
- Reduces redundant data fetching

### 2. Simplified `getWorkerDeskMapping` Query
**Before**:
- Calculated desk IDs in the backend (`desk-${row}-${col}`)
- Returned desk assignments with workers

**After**:
- Only returns worker capacity (maxWorkers) and task assignments
- Desk mapping handled entirely in frontend (more flexible)
- Cleaner separation of concerns

**Why**:
- Frontend already does desk layout calculations
- Backend doesn't need to know about desk positioning
- Easier to change desk layouts without backend changes

### 3. Updated `useOfficeData` Hook
**Removed**:
```typescript
const taskExecutions = useQuery(api.office.officeQueries.getActiveTaskExecutions);
```

**Updated loading state**:
```typescript
// Before
isLoading: taskExecutions === undefined

// After  
isLoading: workerMapping === undefined || workQueueItems === undefined
```

## Current Architecture

### Data Flow
```
userWorkQueue (source of truth)
    ↓
getUserWorkQueueWithWorkers (fetch queue items with task details)
    ↓
useOfficeData (transform to employees/desks)
    ↓
OfficeScene (render 3D visualization)
```

### Key Queries (After Cleanup)

1. **getWorkerDeskMapping**
   - Returns: `{ maxWorkers, workers[] }`
   - Purpose: Get worker capacity and which workers have tasks
   - Used by: useOfficeData to create employee array

2. **getUserWorkQueueWithWorkers**
   - Returns: Queue items with full task execution details
   - Purpose: Get all active/queued tasks with worker assignments
   - Used by: useOfficeData to populate employee status + OfficeSimulation for queue view

3. **getTaskExecutionSteps**
   - Returns: Array of execution steps for a specific task
   - Purpose: Show detailed execution log
   - Used by: Task log modal when clicking employees/desks

4. **getOfficeStats**
   - Returns: `{ totalTasks, activeTasks, completedTasks, failedTasks }`
   - Purpose: Dashboard statistics
   - Used by: Office route stats overlay

## Benefits of Cleanup

✅ **Simpler**: Removed redundant query that duplicated work queue data
✅ **Faster**: One less query to execute and sync
✅ **Clearer**: Architecture is now queue-first, not task-first
✅ **Maintainable**: Desk mapping logic is in one place (frontend)
✅ **Accurate**: Work queue is source of truth for worker assignments

## Files Modified

1. `convex/office/officeQueries.ts`
   - Removed `getActiveTaskExecutions` query (70 lines)
   - Simplified `getWorkerDeskMapping` query
   - Added architecture documentation

2. `src/hooks/useOfficeData.ts`
   - Removed unused `taskExecutions` query
   - Updated loading state logic
   - No functional changes to output

## Testing

After cleanup, verify:
- ✅ Office page loads correctly
- ✅ Employees/desks render with proper positions
- ✅ Clicking employees shows task queue
- ✅ Clicking desks shows task logs
- ✅ Statistics dashboard updates in real-time
- ✅ No console errors

## Future Improvements

Consider:
- Combine `getWorkerDeskMapping` and `getUserWorkQueueWithWorkers` into one query
- Add pagination for large task queues
- Cache worker capacity separately (changes infrequently)

