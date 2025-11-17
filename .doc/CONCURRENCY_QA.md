# Concurrency Architecture Q&A

## Your Questions Answered

### Q1: How are taskExecution IDs mapped to employees?

**Current Implementation:**
In `src/routes/office.tsx` (lines 89-141), the mapping is **1:1** - each `taskExecution` creates one employee avatar. With 3 "workers" (really just concurrent task executions), you're seeing 3 employees in the office.

```typescript
// Current: One employee per taskExecution
taskExecutions.forEach((task, index) => {
    const desk = desks[index % desks.length]; // Cycles through desks
    mapped.push({
        id: task._id,
        name: `Researcher ${index + 1}`,
        taskExecutionId: task._id,
        // ...
    });
});
```

**Problem:** If you have 100 taskExecutions, you'll have 100 employees (performance nightmare).

**Solution:** Use **fixed visual workers** that represent concurrency slots, not individual tasks.

---

### Q2: Do they randomly get assigned to one employee?

**Current:** Sort of. The assignment is **deterministic but not intelligent**:
- taskExecutions are fetched in creation order
- Each gets assigned to a desk using modulo: `desks[index % desks.length]`
- Multiple taskExecutions can "share" the same desk position
- There's no actual worker assignment - it's just visual positioning

**New System:** Workers pull from a shared queue:
```typescript
// Worker pulls next task from queue
const task = await dequeueNextTask(userId, workerId);
// Process task
// Get next task (round-robin across batches)
```

---

### Q3: Should we spawn as many agents as user wants OR stick with fixed employees?

**Recommendation: Fixed Employees (Virtual Workers)**

**Why?**
1. **Performance:** 100 3D avatars = laggy browser
2. **UX:** 10 workers is enough to show "busy office"
3. **Scalability:** Works for 10 or 1000 tasks
4. **Pricing clarity:** Users understand "3 workers" vs "dynamic scaling"

**Implementation:**
```typescript
// Visual layer: 10 fixed workers in office
const VISUAL_WORKERS = 10;

// Actual concurrency: Based on tier
const tiers = {
    free: 1,      // 1 parallel task
    starter: 3,   // 3 parallel tasks
    pro: 10,      // 10 parallel tasks
    enterprise: 50 // 50 parallel tasks
};

// Visual workers > actual workers = some appear idle
// Visual workers < actual workers = show "10+" with overflow indicator
```

**Office Visualization:**
```
┌─────────────────────────────────────┐
│  Office: 10 desks (fixed)           │
│                                     │
│  [👤] [👤] [👤] [👤] [👤]          │  5 active (Starter tier)
│  [💤] [💤] [💤] [💤] [💤]          │  5 idle
│                                     │
│  Sidebar:                           │
│  ├─ Batch 1: 23/50 ⏳              │
│  ├─ Batch 2: 5/30 ⏳               │
│  └─ Queue: 52 tasks waiting        │
└─────────────────────────────────────┘
```

---

### Q4: Should we render a new office for every research task?

**No - One office per user, all batches visible**

**Reasoning:**
```
❌ One office per batch:
   - User has 3 browser tabs open
   - Confusing to track progress
   - Hard to see total utilization

✅ One office shows all batches:
   - Single dashboard view
   - Clear queue visualization
   - Shows utilization across all work
```

**Multi-Batch UI:**
```typescript
<OfficeScene>
    {/* Fixed 10 workers */}
    <Workers count={10} />
    
    {/* Sidebar shows all batches */}
    <BatchProgress>
        <Batch id="1" name="Tech Companies" progress="23/50" />
        <Batch id="2" name="Healthcare" progress="5/30" />
        <Batch id="3" name="Finance" queued />
    </BatchProgress>
    
    {/* Queue indicator */}
    <QueueDepth total={52} active={3} />
</OfficeScene>
```

---

### Q5: How should we price it?

**Recommended Pricing Model: Pay for Concurrency**

```typescript
const pricing = {
    free: {
        price: 0,
        concurrentWorkers: 1,
        monthlyQuota: 50,
        features: [
            "1 parallel task",
            "50 tasks/month",
            "Basic office view",
        ],
    },
    
    starter: {
        price: 29, // per month
        concurrentWorkers: 3,
        monthlyQuota: 500,
        features: [
            "3 parallel tasks",
            "500 tasks/month",
            "Priority support",
            "Dataset exports",
        ],
    },
    
    pro: {
        price: 79, // per month
        concurrentWorkers: 10,
        monthlyQuota: 5000,
        features: [
            "10 parallel tasks",
            "5,000 tasks/month",
            "BYOK (use your own API key)",
            "Advanced analytics",
            "Team collaboration",
        ],
    },
    
    enterprise: {
        price: "Custom",
        concurrentWorkers: 50,
        monthlyQuota: 50000,
        features: [
            "50+ parallel tasks",
            "Unlimited monthly quota",
            "Dedicated support",
            "Custom integrations",
            "SLA guarantee",
        ],
    },
};
```

**Why this model?**
- ✅ Simple to understand: "Pay for speed (workers), not volume"
- ✅ Aligns with costs: More workers = more API calls
- ✅ Fair: Small batches and large batches pay the same per tier
- ✅ Upgrades: Clear value prop (3x faster = 3x more workers)

---

### Q6: How to handle 5 tasks vs 100 tasks with API rate limits?

**Answer: User-Level Queue + Tier-Based Concurrency**

**Scenario 1: User with 5 tasks (Free tier)**
```
Time: 0s    60s   120s  180s  240s  300s
      [T1]  [T2]  [T3]  [T4]  [T5]
      
Worker: 1 concurrent
Result: 5 minutes total (sequential)
Cost: Free tier
```

**Scenario 2: Same user with 100 tasks (Still Free tier)**
```
Time: 0s ───────────────────────────> 100 minutes
      [T1][T2][T3]...[T100]
      
Worker: 1 concurrent (rate limit respected)
Result: 100 minutes total
Cost: Free tier (but hits 50 task/month quota at T50)
```

**Scenario 3: User upgrades to Starter (3 workers)**
```
Time: 0s ───────────────────────────> 33 minutes
      [T1, T2, T3][T4, T5, T6]...[T98, T99, T100]
      
Workers: 3 concurrent
Result: 33 minutes total (3x faster)
Cost: $29/mo
```

**Scenario 4: User with Pro + BYOK (10 workers, their API key)**
```
Time: 0s ─────────────> 10 minutes
      [T1-T10][T11-T20]...[T91-T100]
      
Workers: 10 concurrent (user's OpenAI key)
Result: 10 minutes total
Cost: $79/mo + OpenAI API costs
```

**Implementation:**
```typescript
async function calculateEstimatedTime(
    taskCount: number,
    userTier: Tier
): Promise<{ minutes: number; workers: number }> {
    const TASK_DURATION_SECONDS = 60; // Average task
    const workers = TIER_CONFIGS[userTier].maxConcurrentWorkers;
    
    const totalSeconds = (taskCount / workers) * TASK_DURATION_SECONDS;
    const minutes = Math.ceil(totalSeconds / 60);
    
    return { minutes, workers };
}

// Example usage:
const estimate = await calculateEstimatedTime(100, "starter");
// Result: { minutes: 33, workers: 3 }

// Show to user:
"Estimated completion: 33 minutes with Starter tier (3 workers)"
"Upgrade to Pro (10 workers) to finish in 10 minutes!"
```

---

## Summary: Recommended Architecture

### ✅ Use This Approach

1. **Fixed Visual Workers:** 10 employees in office (always)
2. **User-Level Queue:** All batches feed into one queue
3. **Tier-Based Concurrency:** 1-50 actual workers depending on subscription
4. **Multi-Batch Support:** Both batches progress simultaneously
5. **Pricing:** Pay for workers ($0, $29, $79, custom)
6. **BYOK Option:** Pro users can use their own API keys (20+ workers)

### 📊 User Experience

```
User starts Batch 1 (50 tasks)
  → Office shows: 3/10 workers busy (Starter tier)
  → Queue: 47 tasks waiting
  → ETA: 25 minutes

User starts Batch 2 (30 tasks) - WHILE Batch 1 running
  → Office shows: Still 3/10 workers (shared pool)
  → Queue: 77 tasks waiting (47 + 30)
  → Both batches progress simultaneously
  → Batch 1: 15/50 ⏳
  → Batch 2: 3/30 ⏳

User upgrades to Pro ($79/mo)
  → Workers increase: 3 → 10 workers
  → Queue drains 3.3x faster
  → New batches complete in 1/3 the time
```

### 🎯 Benefits

- **Performance:** Fixed 10 workers, not 100+ avatars
- **UX:** Clear, consistent visualization
- **Pricing:** Simple tiers that users understand
- **Rate Limits:** Respected at user level (not batch level)
- **Scalability:** Works for 10 or 10,000 tasks
- **Fairness:** Round-robin across batches

---

## Next Steps

1. ✅ **Schema created** (`convex/concurrency/schema.ts`)
2. ✅ **Work queue system** (`convex/concurrency/workQueue.ts`)
3. ✅ **Worker pool** (`convex/concurrency/workerPool.ts`)
4. ✅ **UI component** (`src/components/office/ConcurrencyStatusPanel.tsx`)
5. ⏳ **Migration** (see `MIGRATION_GUIDE.md`)
6. ⏳ **Testing** (single batch, multi-batch, quota limits)
7. ⏳ **Billing integration** (Stripe for tier management)
8. ⏳ **BYOK implementation** (secure key storage)

**Ready to implement?** Start with Step 1 of the migration guide!

