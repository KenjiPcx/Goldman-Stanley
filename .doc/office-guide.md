# Goldman Stanley Office - User Guide

## Overview
The 3D Office is a real-time visualization of your AI research team. Each researcher (employee) represents a `taskExecution`, showing you what your AI agents are doing at any moment.

## Getting Started

### 1. Start Some Research
First, you need some research tasks running:
1. Go to `/research-chat`
2. Ask the AI to research something, e.g.:
   ```
   Research the top 5 AI startups from Y Combinator 2024. 
   For each, find their funding, team size, and main product.
   ```
3. Approve the batch research proposal
4. The AI will create multiple task executions (one per target)

### 2. Open the Office
1. Navigate to `/office` or click "Office 🏢" in the navigation
2. You'll see a 3D office with:
   - **Floor and walls** - the office space
   - **Desks** - workstations arranged in rows
   - **Employees** - AI researchers (one per task)

### 3. Watch the Action
- **New tasks**: Employees appear in the center (idle area)
- **Task starts**: Employee walks to an available desk
- **Working**: Employee stays at desk, shows status updates
- **Completed**: Employee returns to center

## Interacting with the Office

### Camera Controls
- **Rotate**: Click and drag
- **Pan**: Right-click and drag (or two-finger drag on trackpad)
- **Zoom**: Scroll wheel (or pinch on trackpad)

### Clicking on Employees
Click any employee to see:
- Task execution details
- Detailed step-by-step logs
- Tool calls (web search, Python, etc.)
- Timestamps and progress

### Clicking on Desks
Click an occupied desk (darker brown with computer) to see the same details as clicking the employee.

### Status Bubbles
Employees show chat bubbles above their heads with:
- **Real tool calls** from the agent (not generic steps!)
- Latest step name with emoji indicators:
  - 🌐 Web Search: "Searching: [query]"
  - 🐍 Python: "Running Python code"
  - 💾 Save: "Saving [fieldName]"
  - 👥 Delegate: "Delegating research task"
  - 📝 Scratchpad: "Updating scratchpad"
  - 🔍 Review: "Quality review (attempt X/Y)"
  - ✅ Complete: "Research phase complete"
- Real-time updates as the agent uses tools

## Understanding Employee Colors

Each employee's color indicates their status:

| Color | Status | Meaning |
|-------|--------|---------|
| 🟢 Green | Idle | Waiting for a task |
| 🔵 Blue | Walking | Moving to/from desk |
| 🟠 Orange | Working | Actively researching |
| 🔴 Red | Busy | Processing or waiting |

## Statistics Dashboard

The top-left panel shows:
- **Total Tasks**: All tasks in last 24 hours
- **Active**: Currently running
- **Completed**: Successfully finished
- **Failed**: Errored or failed

## Tips & Tricks

### Best Time to View
- **During batch research**: See multiple employees working simultaneously
- **Large datasets**: More targets = more employees = busier office

### Performance
- The office shows up to 50 most recent tasks
- Older completed tasks don't show employees (to keep it clean)
- If too many tasks, older employees disappear

### Debugging Research
Use the office to:
1. See if tasks are stuck (employee at desk for long time)
2. Check what step failed (click for logs)
3. Monitor progress across multiple tasks

## Technical Details

### Mapping
- 1 `taskExecution` = 1 Employee
- 1 `taskExecutionStep` = 1 Status update
- Latest step = Current status bubble

### Real-time Updates
- Uses Convex subscriptions
- Updates every time agent makes progress
- No polling - instant updates

### Desk Assignment
- Desks assigned in order (first come, first served)
- 10 desks total (5 per row)
- If more than 10 tasks, employees share desk positions

## Future Enhancements

Coming soon:
- Team structure with supervisor
- Employee complaints when overloaded
- Better 3D models (GLTF)
- Office decorations (plants, coffee machines)
- Chat directly with employees from 3D view
- Manual task assignment
- Sound effects (typing, walking)

## Troubleshooting

### No Employees Visible
- **Cause**: No recent task executions
- **Fix**: Start a batch research task from `/research-chat`

### Employees Not Moving
- **Cause**: Tasks already completed or failed
- **Fix**: Start new research tasks to see movement

### Chat Bubbles Not Showing
- **Cause**: No recent steps logged
- **Fix**: Check task execution logs (click employee)

### Poor Performance
- **Cause**: Too many employees or shadows
- **Fix**: Try zooming out or closing browser devtools

## Example Workflow

1. **Create batch research** (`/research-chat`):
   - "Research 20 SaaS companies"
   - Get 20 task executions

2. **Open office** (`/office`):
   - See 20 employees appear
   - Watch them walk to desks

3. **Monitor progress**:
   - Status bubbles show current steps
   - Dashboard shows active count

4. **Click for details**:
   - Click employee or desk
   - View full execution logs
   - See tool calls and progress

5. **Review results** (`/datasets`):
   - Once complete, view structured data
   - Export as CSV if needed

## Keyboard Shortcuts

Currently none, but planned:
- `Space`: Play/pause animations
- `R`: Reset camera
- `D`: Toggle debug mode
- `1-9`: Jump to employee N

## Questions?

- Check `.doc/context.md` for implementation details
- See `src/components/office/` for component code
- See `convex/office/` for queries

Enjoy watching your AI team at work! 🏢✨

