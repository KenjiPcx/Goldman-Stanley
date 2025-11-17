# Tool Call Tracking for Office Visualization

## Problem
The office needed to show **real, meaningful status updates** from the AI agents, not just generic task execution steps. We wanted to see what tools the agents are actually calling (web search, Python, etc.) in real-time.

## Solution
Instead of trying to parse thread messages after the fact, we **log tool calls directly in the workflow loop** when they happen. This is more straightforward and gives us real-time updates.

## Implementation

### 1. Enhanced `runAgentStep` Return Type
**File**: `convex/research/genericResearchWorkflow.ts`

Added `toolCalls` to the return object:

```typescript
returns: v.object({
    finishReason: v.union(...),
    text: v.string(),
    toolCalls: v.optional(v.array(v.object({
        toolName: v.string(),
        args: v.optional(v.any()),
    }))),
})
```

This extracts tool call information from the agent's result.

### 2. Log Tool Calls as Task Execution Steps
**File**: `convex/research/genericResearchWorkflow.ts` (lines ~179-215)

When `finishReason === "tool-calls"`, we now:
1. Extract the tool calls from the result
2. Create user-friendly messages with emojis
3. Log each tool call as a `taskExecutionStep`

```typescript
if (finishReason === "tool-calls") {
    // Log tool calls as task execution steps for office visualization
    if (toolCalls && toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
            let message = `Calling ${toolCall.toolName}`;
            
            // Add context based on tool name
            if (toolCall.toolName === 'webSearch' && toolCall.args?.query) {
                message = `🌐 Searching: "${toolCall.args.query}"`;
            } else if (toolCall.toolName === 'pythonInterpreter') {
                message = `🐍 Running Python code`;
            }
            // ... more tool types
            
            await step.runMutation(
                internal.orchestration.taskExecutions.addTaskExecutionStep,
                {
                    taskExecutionId: args.taskExecutionId,
                    stepName: toolCall.toolName,
                    message,
                    detail,
                }
            );
        }
    }
    continue;
}
```

### 3. Additional Lifecycle Steps
We also added steps for:
- **Research start**: "🚀 Starting research"
- **Agent complete**: "✅ Research phase complete"
- **Quality review**: "🔍 Quality review (attempt X/Y)"

## Tool Types Tracked

| Tool | Icon | Message Example |
|------|------|-----------------|
| `webSearch` | 🌐 | "Searching: [query]" |
| `pythonInterpreter` | 🐍 | "Running Python code" |
| `saveFieldValue` | 💾 | "Saving [fieldName]" |
| `delegate` | 👥 | "Delegating research task" |
| `scratchpad` | 📝 | "Updating scratchpad" |
| Generic | - | "Calling [toolName]" |

Plus lifecycle events:
- `researchStart` - 🚀
- `agentComplete` - ✅
- `qualityReview` - 🔍

## Benefits

### 1. Real-time Updates
Tool calls are logged **immediately** when they happen, not parsed later.

### 2. Meaningful Status
Users see **what the agent is actually doing**, not generic "step 1, step 2".

### 3. No Extra Queries
We don't need to fetch and parse thread messages - the data is already in `taskExecutionSteps`.

### 4. Office Visualization
The office now shows:
- Employees with chat bubbles showing current tool calls
- Real-time updates as agents work
- Easy-to-understand icons and messages

## Data Flow

```
Agent makes tool call
    ↓
runAgentStep extracts toolCalls
    ↓
Workflow loop logs to taskExecutionSteps
    ↓
getActiveTaskExecutions fetches latest step
    ↓
Office displays in employee status bubble
    ↓
User sees: "🌐 Searching: 'AI startups 2024'"
```

## Example Sequence

For a research task about "Find funding for Anthropic":

1. **Start**: "🚀 Starting research"
2. **Tool**: "🌐 Searching: 'Anthropic funding rounds'"
3. **Tool**: "🐍 Running Python code" (parsing results)
4. **Tool**: "💾 Saving funding_amount"
5. **Tool**: "💾 Saving funding_date"
6. **Complete**: "✅ Research phase complete"
7. **Review**: "🔍 Quality review (attempt 1/2)"

All visible in real-time in the office!

## Code Locations

- **Enhanced return type**: `convex/research/genericResearchWorkflow.ts:481-496`
- **Tool call extraction**: `convex/research/genericResearchWorkflow.ts:524-531`
- **Tool call logging**: `convex/research/genericResearchWorkflow.ts:182-213`
- **Lifecycle steps**: Various locations in `genericResearchWorkflow.ts`

## Future Enhancements

### 1. Tool-specific Animations
- Show globe spinning for web search
- Show code editor for Python
- Show save icon for field updates

### 2. Tool Call History
- Keep last 5 tool calls visible
- Fade out old ones
- Timeline view

### 3. Tool Call Statistics
- Count web searches per task
- Track Python execution time
- Show most-used tools

### 4. Error Tracking
- Show failed tool calls
- Retry indicators
- Error messages in bubbles

## Testing

To see tool calls in action:

1. **Start research** from `/research-chat`:
   ```
   Research the top 5 AI companies from 2024. 
   For each, find their funding and team size.
   ```

2. **Open office** at `/office`

3. **Watch status bubbles**:
   - You'll see web searches appear
   - Python code execution
   - Field saves
   - Quality reviews

4. **Click employee/desk**:
   - View full execution log
   - See all tool calls with timestamps

## Performance

- **Minimal overhead**: Only logs when tool calls happen
- **No extra queries**: Uses existing `taskExecutionSteps` table
- **Real-time**: Immediate updates via Convex subscriptions
- **Efficient**: One mutation per tool call

## Notes

- Tool calls are extracted from the agent framework's result object
- We use `(result as any).toolCalls` since the agent framework types aren't fully exposed
- Each tool call gets its own step for granular tracking
- Messages are intentionally short and emoji-rich for visual scanning

---

**Result**: Office now shows meaningful, real-time status updates! 🎉

