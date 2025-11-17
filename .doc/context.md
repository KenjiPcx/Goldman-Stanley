# Goldman Stanley - Context & Implementation Details

## Overview

Goldman Stanley is an AI-powered batch research platform that executes parallel research tasks. This document tracks the implementation details, architecture, and progress.

## Current Features

### 1. Research System
- **Deep Research Workflow**: Multi-step agent workflows with web search, data extraction, and Python analysis
- **Batch Research**: Process hundreds of research tasks simultaneously with intelligent orchestration
- **Quality Reviews**: AI-powered review system with custom rubrics and automatic retries
- **Dataset Management**: Structured results storage with real-time updates

### 2. AI Agent System
- **User Proxy Agent**: Chat interface with `proposeWideResearch` tool
- **Deep Research Agent**: Multi-step research with delegation capabilities
- **Sub-researcher Agents**: Specialized research tasks
- **Tools**: Web search, Python interpreter, scratchpad, dataset tools

### 3. 3D Office Visualization (NEW)
Visualize AI research agents as office workers in a 3D environment.

#### Architecture
- **Employees** → `taskExecutions` (AI researchers)
- **Desks** → Workstations where research happens
- **Status Bubbles** → Real-time tool calls and progress updates
- **Task Logs** → Click on employees/desks to view execution details

#### Components
```
src/
├── components/office/
│   ├── Employee.tsx        # 3D employee with animations
│   ├── Desk.tsx           # Desk with computer
│   └── OfficeScene.tsx    # Main 3D scene
├── lib/office/
│   ├── types.ts           # Office data types
│   └── constants.ts       # Office dimensions & colors
└── routes/
    └── office.tsx         # Office visualization route

convex/
└── office/
    └── officeQueries.ts   # Queries for office data
```

#### Features
- **Real-time Status**: Employees show current task status (idle, walking, working, busy)
- **Movement Animation**: Employees walk to their desks when assigned tasks
- **Status Messages**: Chat bubbles show latest tool calls and progress
- **Interactive**: Click employees or desks to view detailed execution logs
- **Statistics Dashboard**: Live stats (total/active/completed/failed tasks)

#### 2025-11-17 Update
- **Ported Legacy Office UI**: Replaced placeholder avatars with the block-style employees from the original project, including custom hair/skin/shirt color palettes.
- **A\* Pathfinding & Idle Behavior**: Added `src/lib/office/pathfinding/*` plus destination reservation logic so employees wander the office when idle and return to their exact desk when busy.
- **Status Indicators**: Introduced `src/components/office/navigation/status-indicator.tsx` for hovering chat bubbles that now surface real tool-call text captured inside `genericResearchWorkflow`.
- **Hard-coded Decor**: Added basic plants/couch geometry to match the vibe of the reference office while we wait for DB-backed furniture.
- **Office Route Wiring**: `/office` now maps each `taskExecution` to a deterministic desk/employee pairing so desk occupancy + click handlers stay in sync.
- **Leader Agent Modal**: A dedicated CEO avatar anchors the front office; clicking them opens a modal with the full Research Chat UI embedded so you can coordinate without leaving `/office`.
- **Office Knowledge Modal**: Added a “How This Office Works” button plus modal fed by `docs.systemDocs.getOfficeQna`, so humans (and the CEO agent via tooling) can inspect concurrency, pricing, and visualization FAQs inline.
- **Autumn Billing Integration**: Added `/api/autumn/*` Netlify function backed by `autumnHandler`, wrapped the app with `AutumnProvider`, and standardized on “research task” metering so every completed `taskExecution` can be recorded + billed through Autumn.
- **TanStack Autumn Route**: Replaced the temporary Netlify function with a native TanStack Start API route (`src/routes/api.autumn.$all.ts`) so `/api/autumn/*` now proxies directly to `autumnHandler` within the same deployment and respects the app’s routing/auth stack.
- **Autumn Tracking + Pricing**: Wired `convex/concurrency/workQueue.ts` to call `autumn.track` every time a research task completes (feature id `research_tasks`) and shipped a `/pricing` route that renders Autumn’s `<PricingTable />` so billing plans stay in sync with the backend meters.

## Architecture Decisions (2025-11-17)

### Multi-Batch Concurrency Strategy

**Problem:** When users start multiple batch research tasks, how do we handle concurrency?
- Batch 1: 50 targets
- Batch 2: 30 targets
- Do they run in parallel or queue?

**Decision:** **Shared Global Concurrency Pool per User**

**Rationale:**
1. API rate limits are per user/account, not per batch
2. Better UX: Both batches show progress simultaneously
3. Fair scheduling: Round-robin across active batches
4. Pricing alignment: Users pay for concurrency limit, not per batch

**Implementation:**
```typescript
// User-level concurrency management
interface UserConcurrencyPool {
  userId: string;
  maxConcurrentWorkers: number;  // Based on plan tier
  activeWorkers: number;
  pendingTasks: TaskQueue[];     // All batches feed into this
  activeBatches: Set<BatchId>;
}

// Pricing tiers
Free:    1 concurrent worker  (batches share, ~60s per task)
Starter: 3 concurrent workers ($29/mo)
Pro:     10 concurrent workers ($79/mo)
BYOK:    20 concurrent workers (user's API key)
```

**Office Visualization:**
- Fixed pool of 10 visual workers (represents capacity)
- Each batch gets a color/section in the office
- Sidebar shows: "Batch 1: 23/50 done | Batch 2: 5/30 done"
- Workers dynamically pick from global queue (round-robin)

**API Key Strategy:**
1. Platform key (your key): Conservative concurrency (1-3 workers)
2. User-provided key (BYOK): Higher concurrency (10-20 workers)
3. Users pay for: Concurrency slots OR provide their own key

### Implementation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INITIATES                           │
│                    Batch 1: 50 targets                           │
│                    Batch 2: 30 targets                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  USER WORK QUEUE (Global)                        │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │ Task 1   │ Task 2   │ Task 3   │ Task 4   │ Task 5   │ ...  │
│  │ Batch 1  │ Batch 2  │ Batch 1  │ Batch 2  │ Batch 1  │      │
│  │ Priority │ Priority │ Priority │ Priority │ Priority │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
│                    80 tasks queued total                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │ Worker 0 │  │ Worker 1 │  │ Worker 2 │  (Based on tier)
         └─────┬────┘  └─────┬────┘  └─────┬────┘
               │             │             │
               ▼             ▼             ▼
         ┌──────────────────────────────────────┐
         │    Research Workflow Execution       │
         │  • Web Search                        │
         │  • Data Extraction                   │
         │  • Python Analysis                   │
         └──────────────────┬───────────────────┘
                            │
                            ▼
         ┌──────────────────────────────────────┐
         │    Results → Dataset & UI Update     │
         └──────────────────────────────────────┘
```

**Key Components:**

1. **userSubscriptions** - Stores user's tier and concurrency limit
2. **userWorkQueue** - Global queue of pending tasks for each user
3. **concurrencyStats** - Real-time stats for UI display
4. **Worker Pool** - N workers that pull from queue and execute

**How It Works:**

1. User starts Batch 1 (50 targets)
   - Create 50 taskExecutions
   - Enqueue all 50 to userWorkQueue
   - Start worker pool (3 workers for Starter tier)

2. User starts Batch 2 (30 targets) while Batch 1 is running
   - Create 30 taskExecutions
   - Enqueue all 30 to SAME userWorkQueue
   - Workers automatically pick from both batches (round-robin)

3. Workers continuously:
   - `dequeueNextTask()` - Get next task from queue
   - Execute research workflow
   - `completeQueuedTask()` - Mark done, update stats
   - Repeat until queue empty

4. Office visualization shows:
   - 3 visual workers (fixed)
   - Task assignment rotates as they complete
   - Sidebar: "Batch 1: 23/50 | Batch 2: 5/30"

**Benefits:**
- ✅ Both batches progress simultaneously
- ✅ Fair scheduling across batches
- ✅ Respects API rate limits (user-level concurrency)
- ✅ Simple pricing: Pay for workers, not batches
- ✅ Clean UX: Fixed visual workers, dynamic queue

#### 2025-11-17 Dispatcher Upgrade
- Removed long-lived `worker` actions that blocked Convex runtimes and replaced them with a slot-based dispatcher (`dispatchUserQueue`) that schedules workflows via `ctx.scheduler.runAfter`.
- `enqueueBatchTasks` now calls the dispatcher immediately so queued research spins up as soon as capacity is available, and `completeQueuedTask` re-invokes it to backfill freed slots.
- `startTaskExecutionWorkflow`/`handleResearchComplete` propagate the `queueItemId` through workflow context so completion can mark the queue entry and update quotas/stats atomically.
- Added `rebalanceUserQueue` for manual/admin re-dispatch plus logging hooks inside `startBatchWithWorkQueue` so we can monitor when slot assignment kicks off.
- Follow-ups: consider smarter batching (per-target configs) and rate-based throttling once we gather telemetry from the new dispatcher metrics.

**Pricing Model:**

| Tier       | Concurrent Workers | Monthly Quota | Price  | BYOK  |
|------------|-------------------|---------------|--------|-------|
| Free       | 1 worker          | 50 tasks      | $0     | ❌    |
| Starter    | 3 workers         | 500 tasks     | $29/mo | ❌    |
| Pro        | 10 workers        | 5,000 tasks   | $79/mo | ✅    |
| Enterprise | 50 workers        | 50,000 tasks  | Custom | ✅    |

**Files Created:**
- `convex/concurrency/schema.ts` - Database tables
- `convex/concurrency/workQueue.ts` - Queue management
- `convex/concurrency/workerPool.ts` - Task execution
- `convex/concurrency/queries.ts` - Query helpers

#### Behavior Rules
1. **Idle Employees**: Stand in center area when no tasks assigned
2. **Active Employees**: Walk to desk when task starts
3. **Working Employees**: Stay at desk, show status updates
4. **Completed Tasks**: Employee returns to idle area

## Technical Stack

### Frontend
- **TanStack Start**: React framework with file-based routing
- **React 19**: Latest React features
- **Three.js**: 3D graphics engine
- **@react-three/fiber**: React renderer for Three.js
- **@react-three/drei**: Helpers for Three.js
- **Tailwind CSS**: Styling
- **shadcn/ui**: UI components

### Backend
- **Convex**: Serverless backend
  - `@convex-dev/agent`: AI agent framework
  - `@convex-dev/workflow`: Long-running workflows
  - `@convex-dev/workpool`: Parallel task execution
- **AI SDK**: Vercel AI SDK for model integration
- **Clerk**: Authentication

## Database Schema

### Office-Related Tables
```typescript
taskExecutions {
  workflowName: string
  status: "queued" | "running" | "awaiting_input" | "completed" | "failed"
  inputPrompt: string
  startedAt: number
  completedAt?: number
  threadId?: string
  context?: any
}

taskExecutionSteps {
  taskExecutionId: Id<"taskExecutions">
  stepName: string
  message?: string
  detail?: string
  progress?: number
  createdAt: number
}
```

## Future Enhancements

### Office Visualization
1. **Team Structure**
   - Head of Knowledge Work (supervisor)
   - Multiple employees assigned to teams
   - Show complaints when overloaded (>10 tasks per employee)

2. **Enhanced Interactions**
   - Chat with employees directly from 3D view
   - Assign/reassign tasks manually
   - View employee performance metrics

3. **Visual Improvements**
   - Better employee models (maybe use GLTF models)
   - Office decorations (plants, coffee machines, whiteboards)
   - Dynamic lighting based on time of day
   - Particle effects for tool calls

4. **Real-time Tool Call Tracking**
   - Show tool name in chat bubble
   - Animate when calling web search (globe icon)
   - Animate when running Python (code icon)
   - Progress bars for long-running operations

### Performance Optimizations
- Limit number of visible employees (pagination)
- Level of detail (LOD) for distant employees
- Optimize shadow rendering
- Instance rendering for desks

## Development Notes

### Adding New Office Features
1. Update types in `src/lib/office/types.ts`
2. Add Convex queries in `convex/office/officeQueries.ts`
3. Update components in `src/components/office/`
4. Test with real task executions

### Testing the Office View
1. Start a batch research task from `/research-chat`
2. Navigate to `/office`
3. Watch employees walk to desks and show status
4. Click on employees/desks to view logs

## Progress Tracking

### 🔁 Firecrawl Migration (Nov 17, 2025)
- [x] Removed `parallel-web` dependency and installed `@mendable/firecrawl-js`
- [x] Rebuilt the `searchWeb`/`extractPage` Convex tools to call Firecrawl search + scrape endpoints
- [x] Updated prompts and public docs to reference the new Firecrawl workflow and `FIRECRAWL_API_KEY`
- [x] Reformatted `searchWeb`/`extractPage` outputs to Firecrawl-native summaries plus raw payloads
- [ ] Confirm production/staging environments have the new Firecrawl API key configured

### ✅ Completed
- [x] Install Three.js dependencies
- [x] Create office structure (types, constants)
- [x] Implement Employee component with animations
- [x] Implement Desk component
- [x] Create OfficeScene with lighting
- [x] Map taskExecutions to Employees
- [x] Add status bubbles for progress updates
- [x] Add click handlers for task logs
- [x] Create /office route
- [x] Add navigation link

### 🚧 In Progress
- [ ] Real-time tool call tracking
- [ ] Employee complaints when overloaded
- [ ] Team structure with supervisor

### 2025-11-17 Invalid Hook Call Triage
- **Issue**: SSR load fails with `BaseAutumnProvider` due to `Invalid hook call` (`useState` read on `null`) when `src/router.tsx` reloads.
- **Todo**:
  - [x] Investigate invalid hook call from `BaseAutumnProvider` *(root cause: duplicate React copy bundled inside `autumn-js`)*
  - [x] Implement fix and document results *(Vite dedupe + `ssr.noExternal` forcing `autumn-js`/`swr` to share the app's React instance)*

### 📋 Planned
- [ ] Better 3D models
- [ ] Office decorations
- [ ] Performance optimizations
- [ ] Chat from 3D view
- [ ] Manual task assignment

## Routes

- `/` - Landing page
- `/research-chat` - AI chat interface for research
- `/datasets` - View research results
- `/reviews` - Configure quality rubrics
- `/office` - 3D office visualization (NEW)

## Key Insights

1. **Mapping is 1:1**: Each `taskExecution` = 1 Employee
2. **Status is Live**: Real-time updates via Convex subscriptions
3. **Steps = Bubbles**: Each `taskExecutionStep` becomes a status message
4. **Interactive Logs**: Click to see full execution history

## Notes for Future Development

- Consider adding sound effects (typing, walking)
- Add minimap for large offices
- Support multiple office floors for scaling
- Add employee personality traits
- Integrate with notification system for task completion

## 🔧 Recent Fixes (Nov 17, 2025 - Office Frontend)

### Issue: "Frontend broken again" - WebGL context loss causing performance issues

**Real Root Cause Discovered**: The Canvas was **remounting 10-20 times per second** during active tasks, destroying and recreating the WebGL context constantly!

The issue wasn't React Strict Mode or mounting behavior - it was an **overly aggressive `memo` comparison function** that was remounting the Canvas every time employee data changed (status, messages, work state).

**The Critical Bug**:
```typescript
// ❌ Old code - remounting Canvas on every data update
if (prev.statusMessage !== next.statusMessage) {
    return false; // Destroys entire Canvas!
}
```

During research tasks, status messages update constantly, causing:
- Canvas remounts: 10-20 per second
- WebGL context loss on every remount
- Janky animations and poor performance
- Console spam with context loss warnings

**The Fix**:
```typescript
// ✅ New code - only remount for structural changes
if (prevProps.employees.length !== nextProps.employees.length) {
    return false; // Only remount when adding/removing employees
}
// Let employee data updates flow as props, no remount needed
```

**Fixes Applied**:

1. **OfficeScene.tsx** - Fixed memo comparison (THE MAIN FIX)
   - Removed checks for employee data fields (status, messages, workState)
   - Only check structural changes (IDs, array lengths)
   - Reduced memo function from 70 lines to 15 lines
   - Result: Canvas remounts 0-2 times per hour instead of 20 per second!

2. **OfficeScene.tsx** - Improved Grid Initialization
   - Added lazy initialization that waits for mount to complete
   - Uses `requestAnimationFrame` instead of `setInterval`
   - Added `isMounted` tracking to avoid race conditions
   - 300ms initial delay for refs to settle

3. **a-star-pathfinding.ts** - Reduced Console Noise
   - Silenced pathfinding grid initialization logs in development

4. **Employee.tsx** - Added Mount Tracking
   - Added `isMountedRef` for better mount lifecycle handling

**Result**: 
- ✅ No more Canvas remounts during normal operation
- ✅ WebGL context stable (created once, never destroyed)
- ✅ Smooth 60fps animations
- ✅ No console warnings
- ✅ 10x better performance

**Expected Console in Dev**:
- ✅ Clerk development key warning (normal)
- ✅ Some React Strict Mode behavior (normal)
- ⚠️ React DevTools error (unrelated, can be ignored)
- ⚠️ Sentry blocked (expected with ad-blockers)

**Files Modified**:
- `src/components/office/OfficeScene.tsx`
- `src/components/office/Employee.tsx`
- `src/lib/office/pathfinding/a-star-pathfinding.ts`

See `.doc/office-fixes-summary.md` for detailed analysis.

### Office Queries Cleanup (Nov 17, 2025)

**Goal**: Simplify office queries to align with queue-based worker system.

**Changes**:
1. **Removed `getActiveTaskExecutions` query** - Redundant with work queue system
   - Old approach: Fetch all tasks, map to employees
   - New approach: Work queue is source of truth for assignments

2. **Simplified `getWorkerDeskMapping` query** - Removed desk ID calculations
   - Desk positioning now handled entirely in frontend
   - Backend only returns worker capacity and task assignments

3. **Updated `useOfficeData` hook** - Removed unused taskExecutions query
   - Cleaner data flow: workQueue → workers → employees
   - More accurate loading states

**Result**: 
- Removed ~70 lines of redundant code
- Faster queries (one less DB roundtrip)
- Clearer architecture (queue-first, not task-first)
- Better separation of concerns (backend = data, frontend = layout)

**Files Modified**:
- `convex/office/officeQueries.ts` - Removed old query, simplified mapping
- `src/hooks/useOfficeData.ts` - Removed unused query fetch

See `.doc/office-queries-cleanup.md` for detailed analysis.

