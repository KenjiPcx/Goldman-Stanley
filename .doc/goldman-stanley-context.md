# Goldman Stanley - Batch Research Platform

## Project Vision

Goldman Stanley is an AI-powered batch research platform built for the TanStack Convex Hackathon. The core value proposition: **Never do knowledge work again.**

Users give a prompt, and AI agents execute deep research in parallel across hundreds of targets—like having an entire Goldman Sachs/JP Morgan/Morgan Stanley research team at your fingertips.

## Tech Stack

- **Frontend**: TanStack Start + React 19
- **Backend**: Convex (serverless)
- **AI**: @convex-dev/agent + @convex-dev/workflow
- **Models**: Google Gemini 2.5 (Flash & Pro), OpenAI
- **Tools**: Parallel.ai (web search), Python interpreter

## Key Features

### 1. AI Batch Research
- Parallel execution of hundreds of research tasks
- Intelligent orchestration with rate limiting
- Multi-step agent workflows with tools
- Real-time progress tracking

### 2. Research Chat Interface
- Natural language research requests
- AI proposes structured research plans
- File upload (Excel/CSV) for targets
- Streaming results in real-time

### 3. Dataset Viewer
- Interactive tables with research results
- Real-time updates as agents complete tasks
- Export to CSV
- Rich metadata (citations, status, etc.)

### 4. Theme System
- Background image switching (light/dark)
- Smooth theme transitions
- Office building backgrounds for visual appeal

## Architecture

### Convex Backend
- **Research workflows**: Long-running batch orchestration
- **Agent system**: Deep researcher with sub-agents
- **Task execution**: Parallel processing with concurrency control
- **Messaging**: Chat threads with notifications

### Frontend
- **Landing page**: Value prop + CTA
- **Research chat**: Conversational interface
- **Dataset viewer**: Results dashboard

## Current Status

✅ All core functionality migrated from DealOS
✅ Landing page created with theme switcher
✅ Dataset viewer implemented
✅ README updated for hackathon
✅ Navigation configured

## 3D Office Visualization ✅

Implemented Three.js visualization with:
- Virtual office environment (Goldman Sachs style)
- Agent avatars "working" in real-time
- **Animated states**: Typing, thinking, walking, idle animations
- **Chat bubbles**: Display tool calls above employees (🌐 Searching, 🐍 Python, 💾 Saving, etc.)
- **Floating status bars**: Progress indicators and status displays
- **Smart navigation**: Employees automatically return to desks on completion messages
- Interactive workspace with clickable employees/desks
- Visual status indicators (info, success, warning, question)

### Employee Animations
- **Typing**: Head bobs and body leans forward when executing tool calls
- **Thinking**: Head tilts side-to-side when processing/planning
- **Walking**: Smooth pathfinding with rotation toward movement direction
- **Idle**: Natural wandering behavior when not busy

### Tool Call Display
- Chat bubbles appear above employees showing current tool calls
- Humanized messages: "🌐 Searching: 'query'", "🐍 Running Python code", etc.
- Auto-hide after 5 seconds or when tool call completes
- Floating animations for visual appeal

### Navigation Triggers
Employees automatically return to their desks when messages contain:
- "completed", "saving", "writing", "finalizing", "done", "finished", "saved"

This creates a realistic feeling of having a real investment bank research team working for you.

## Hackathon Submission Points

1. **Real-time subscriptions**: Live research progress
2. **Long-running workflows**: Hours-long orchestration
3. **AI agent framework**: Multi-step reasoning
4. **Production-ready**: Auth, error handling, monitoring
5. **Beautiful UI**: Theme system with backgrounds
6. **Practical use case**: Solves real problems

## Development

```bash
# Install
pnpm install

# Convex
npx convex dev

# Frontend
pnpm dev
```

## Key Files

- `src/app/page.tsx` - Landing page
- `src/app/research-chat/page.tsx` - Chat interface
- `src/app/datasets/page.tsx` - Dataset viewer
- `convex/research/` - Research workflows
- `convex/agents/` - AI agent system
- `README.md` - Hackathon documentation

## Recent Enhancements

✅ **Employee Animations & Tool Call Display**
- Added typing/thinking animations for working employees
- Chat bubbles display tool calls above employees
- Floating status bars show progress and status
- Smart navigation triggers return employees to desks
- Enhanced employee component with controllable states

## TODOs

- [ ] Deploy to production
- [ ] Record demo video
- [ ] Add demo GIFs to README
- [ ] Polish UI animations (consider adding celebration animation on completion)
- [ ] Add more example use cases
- [ ] Consider adding sound effects for tool calls

---

**Status**: Ready for hackathon submission

