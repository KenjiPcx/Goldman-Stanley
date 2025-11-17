# Architecture Diagrams

## Current System (Batch-Level Concurrency)

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│   Batch 1     │       │   Batch 2     │
│   50 tasks    │       │   30 tasks    │
└───────┬───────┘       └───────┬───────┘
        │                       │
        ▼                       │
┌─────────────────┐            │ BLOCKED
│ Orchestrator    │            │ (Must wait)
│ Workflow        │            │
│ Chunks: 3/task  │            │
└───────┬─────────┘            │
        │                      │
    ┌───┴────┬────┐            │
    ▼        ▼    ▼            ▼
┌──────┐┌──────┐┌──────┐  ┌────────┐
│Task 1││Task 2││Task 3│  │Queued! │
└──────┘└──────┘└──────┘  └────────┘

Issues:
❌ Batch 2 must wait for Batch 1
❌ Can't utilize idle capacity
❌ Complex chunk management
❌ Per-batch orchestration overhead
```

## New System (User-Level Concurrency)

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
│                    (Starter Tier: 3 workers)                │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│   Batch 1     │       │   Batch 2     │
│   50 tasks    │       │   30 tasks    │
└───────┬───────┘       └───────┬───────┘
        │                       │
        └───────────┬───────────┘
                    ▼
        ┌─────────────────────────────────┐
        │    USER WORK QUEUE (Global)     │
        │  ┌────┬────┬────┬────┬────┐    │
        │  │ T1 │ T2 │ T3 │ T4 │... │    │
        │  │ B1 │ B2 │ B1 │ B2 │    │    │
        │  └────┴────┴────┴────┴────┘    │
        │     80 tasks (round-robin)      │
        └───────────┬─────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    ┌──────┐  ┌──────┐  ┌──────┐
    │ W0   │  │ W1   │  │ W2   │  (3 workers)
    └───┬──┘  └───┬──┘  └───┬──┘
        │         │         │
        └─────────┼─────────┘
                  ▼
        ┌──────────────────┐
        │ Research Workflow │
        └──────────────────┘

Benefits:
✅ Both batches progress simultaneously
✅ Fair scheduling (round-robin)
✅ Simple: Fixed worker count
✅ Respects rate limits
```

## Office Visualization Comparison

### Current (Dynamic Employees)

```
With 3 active tasks:
┌──────────────────────────────┐
│         Office               │
│                              │
│   [👤]    [👤]    [👤]      │  3 employees
│   Desk1   Desk2   Desk3      │
│                              │
└──────────────────────────────┘

With 50 active tasks:
┌──────────────────────────────┐
│         Office               │
│ [👤][👤][👤][👤][👤][👤]... │  50 employees!
│ [👤][👤][👤][👤][👤][👤]... │  (Browser lag)
│ [👤][👤][👤][👤][👤][👤]... │
│ ... (crowded, confusing)     │
└──────────────────────────────┘
```

### New (Fixed Workers)

```
With 3 active, 50 queued:
┌────────────────────────────────────────┐
│         Office                         │
│                                        │
│  [👤] [👤] [👤] [💤] [💤]             │
│  Busy  Busy  Busy  Idle  Idle          │
│                                        │
│  [💤] [💤] [💤] [💤] [💤]             │
│  Idle  Idle  Idle  Idle  Idle          │
│                                        │
│  ┌──────────────────────────┐         │
│  │ 📊 Queue Status          │         │
│  │ Active: 3 workers        │         │
│  │ Queued: 47 tasks         │         │
│  │                          │         │
│  │ 📦 Batch 1: 3/50        │         │
│  │ 📦 Batch 2: 0/30        │         │
│  └──────────────────────────┘         │
└────────────────────────────────────────┘

With 50 active (Pro tier: 10 workers):
┌────────────────────────────────────────┐
│         Office                         │
│  [👤] [👤] [👤] [👤] [👤]             │  All 10
│  [👤] [👤] [👤] [👤] [👤]             │  busy!
│                                        │
│  ┌──────────────────────────┐         │
│  │ 📊 Queue Status          │         │
│  │ Active: 10 workers       │         │
│  │ Queued: 40 tasks         │         │
│  │ ETA: 4 minutes           │         │
│  └──────────────────────────┘         │
└────────────────────────────────────────┘
```

## Data Flow: Task Lifecycle

```
1. USER CREATES BATCH
   ↓
2. CREATE TASK EXECUTIONS
   ├─ taskExecution 1 (queued)
   ├─ taskExecution 2 (queued)
   └─ taskExecution N (queued)
   ↓
3. ENQUEUE TO USER WORK QUEUE
   ├─ userWorkQueue item 1 → points to taskExecution 1
   ├─ userWorkQueue item 2 → points to taskExecution 2
   └─ userWorkQueue item N → points to taskExecution N
   ↓
4. WORKER POOL STARTS (if not already running)
   ├─ Worker 0: Active
   ├─ Worker 1: Active
   └─ Worker 2: Active
   ↓
5. WORKER PULLS TASK
   Worker 0: dequeueNextTask()
   ↓
   ├─ Get next queued item from userWorkQueue
   ├─ Mark as "running"
   └─ Assign workerId: 0
   ↓
6. EXECUTE RESEARCH WORKFLOW
   ├─ Start genericResearchWorkflow
   ├─ Web search
   ├─ Data extraction
   ├─ Python analysis
   └─ Save results
   ↓
7. COMPLETE TASK
   ├─ Mark userWorkQueue item as "completed"
   ├─ Update taskExecution status to "completed"
   ├─ Increment user's usage counter
   └─ Update concurrencyStats
   ↓
8. WORKER GETS NEXT TASK (Loop to step 5)
   ↓
9. QUEUE EMPTY
   ├─ Worker waits (2 seconds)
   ├─ Checks again
   └─ After 10 empty checks → Worker shuts down
```

## Subscription Tier Comparison

```
FREE TIER ($0)
┌─────────────────────────┐
│ 1 Worker                │
│ [👤]                    │
│                         │
│ 50 tasks/month          │
│ ~1 task/min             │
└─────────────────────────┘

STARTER TIER ($29/mo)
┌─────────────────────────┐
│ 3 Workers               │
│ [👤] [👤] [👤]         │
│                         │
│ 500 tasks/month         │
│ ~3 tasks/min            │
│ 3x faster ⚡            │
└─────────────────────────┘

PRO TIER ($79/mo)
┌─────────────────────────┐
│ 10 Workers              │
│ [👤]×10                 │
│                         │
│ 5,000 tasks/month       │
│ ~10 tasks/min           │
│ 10x faster ⚡⚡         │
│ + BYOK support          │
└─────────────────────────┘

ENTERPRISE (Custom)
┌─────────────────────────┐
│ 50+ Workers             │
│ [👤]×50                 │
│                         │
│ Unlimited tasks         │
│ ~50 tasks/min           │
│ 50x faster ⚡⚡⚡       │
│ + Custom integrations   │
└─────────────────────────┘
```

## Pricing Impact Examples

### Example 1: Research 100 companies

```
FREE TIER:
  ├─ Time: 100 minutes (1 worker)
  ├─ Cost: $0
  └─ Quota: Uses 100/50 → Need to upgrade!

STARTER TIER:
  ├─ Time: 33 minutes (3 workers)
  ├─ Cost: $29/month
  └─ Quota: Uses 100/500 ✅

PRO TIER:
  ├─ Time: 10 minutes (10 workers)
  ├─ Cost: $79/month
  └─ Quota: Uses 100/5000 ✅

PRO + BYOK (user's OpenAI key):
  ├─ Time: 5 minutes (20 workers, no rate limit)
  ├─ Cost: $79/month + OpenAI API (~$5)
  └─ Quota: Unlimited ✅
```

### Example 2: Daily batch research (50 companies/day)

```
Monthly volume: 50 × 30 = 1,500 tasks

FREE TIER:
  ❌ Not possible (50 task quota)

STARTER TIER:
  ❌ Not enough (500 task quota)

PRO TIER:
  ✅ 1,500/5,000 quota
  ├─ Time per batch: 5 minutes
  ├─ Cost: $79/month
  └─ ROI: Saves hours of manual research daily
```

## Technical Implementation Summary

```
NEW FILES:
├─ convex/
│  └─ concurrency/
│     ├─ schema.ts          (3 new tables)
│     ├─ workQueue.ts       (Queue operations)
│     ├─ workerPool.ts      (Task execution)
│     └─ queries.ts         (Public API)
│
├─ src/
│  └─ components/office/
│     └─ ConcurrencyStatusPanel.tsx  (UI component)
│
└─ .doc/
   ├─ MIGRATION_GUIDE.md
   ├─ CONCURRENCY_QA.md
   └─ ARCHITECTURE_DIAGRAM.md (this file)

MODIFIED FILES:
├─ convex/schema.ts         (Import new tables)
├─ convex/research/wideResearch.ts  (Use work queue)
└─ src/routes/office.tsx    (Add status panel)

DEPRECATED (Eventually):
└─ convex/research/batchResearchOrchestratorWorkflow.ts
   (Replaced by user-level worker pool)
```

## Migration Path

```
PHASE 1: Setup (1-2 hours)
├─ Deploy new schema tables
├─ Initialize user subscriptions
└─ Test queue operations

PHASE 2: Parallel Run (1 week)
├─ Keep old system running
├─ Add feature flag
├─ Test with beta users
└─ Monitor metrics

PHASE 3: Migration (1 day)
├─ Switch feature flag
├─ Update all new batches
└─ Let old batches complete

PHASE 4: Cleanup (1 week)
├─ Remove old orchestrator code
├─ Update documentation
└─ Train team on new system
```

