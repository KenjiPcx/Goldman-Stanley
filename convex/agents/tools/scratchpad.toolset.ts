import { z } from "zod/v3";
import { createTool } from "@convex-dev/agent";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

export const writeScratchpadSchema = z.object({
    scratchpad: z.string().describe("Complete scratchpad in markdown format with all required sections: Research Progress, Findings Tracker, Citations Log, Delegation Log, Calculation Workspace, Gaps & Uncertainties"),
    workflowProgress: z.optional(z.string()).describe("Brief summary of current research stage (e.g., 'Planning', 'Website Research', 'Fund Information', 'Final Compilation')"),
});

export type WriteScratchpadInput = z.infer<typeof writeScratchpadSchema>;

const createWriteScratchpadTool = (taskExecutionId: Id<"taskExecutions">) => {
    return createTool({
        description: "REQUIRED FIRST ACTION: Write your complete research plan and todo list to scratchpad. This is your external memory - use it constantly throughout research. Format in markdown with: Research Progress (todos), Findings Tracker (data found), Citations Log, Delegation Log, Calculation Workspace, and Gaps & Uncertainties sections. Update after EVERY delegation or finding.",
        args: writeScratchpadSchema,
        handler: async (ctx, args) => {
            await ctx.runMutation(internal.orchestration.taskExecutions.writeScratchpad, {
                taskExecutionId,
                scratchpad: args.scratchpad,
                workflowProgress: args.workflowProgress,
            });

            return `Set scratchpad to: \n${args.scratchpad}`;
        },
    });
};

export const writeTodosSchema = z.object({
    todos: z.string().describe("Your todos in markdown format"),
});

export type WriteTodosInput = z.infer<typeof writeTodosSchema>;

const createWriteTodosTool = () => {
    return createTool({
        description: "Write your todos, call this at the start your session after you have created a plan, call this after you finish each task to remind you of what you need to do",
        args: writeTodosSchema,
        handler: async (ctx, args) => {
            return `Todos: \n${args.todos}`;
        },
    });
};

export const replaceScratchpadStringSchema = z.object({
    oldString: z.string().describe("Exact string to find and replace in scratchpad"),
    newString: z.string().describe("New string to replace with (e.g., checked todo, new finding with citation)"),
    workflowProgress: z.optional(z.string()).describe("Brief summary of what this update represents"),
});

export type ReplaceScratchpadStringInput = z.infer<typeof replaceScratchpadStringSchema>;

const createReplaceScratchpadStringTool = (taskExecutionId: Id<"taskExecutions">) => {
    return createTool({
        description: "Update specific section of scratchpad (e.g., check off todo, add citation, record delegation result). Use this frequently to keep scratchpad current. For complete rewrite, use writeScratchpad instead.",
        args: replaceScratchpadStringSchema,
        handler: async (ctx, args): Promise<string> => {
            const newScratchpad: string = await ctx.runMutation(internal.orchestration.taskExecutions.replaceScratchpadString, {
                taskExecutionId,
                oldString: args.oldString,
                newString: args.newString,
                workflowProgress: args.workflowProgress,
            });

            return `New scratchpad: \n${newScratchpad}`;
        },
    });
};

export const createScratchpadToolset = (taskExecutionId: Id<"taskExecutions">) => {
    return {
        writeScratchpad: createWriteScratchpadTool(taskExecutionId),
        writeTodos: createWriteTodosTool(),
        replaceScratchpadString: createReplaceScratchpadStringTool(taskExecutionId),
    };
};
