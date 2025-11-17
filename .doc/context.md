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

