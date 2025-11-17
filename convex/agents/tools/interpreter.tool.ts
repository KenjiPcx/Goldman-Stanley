import { z } from "zod";
import { createTool } from "@convex-dev/agent";
import { internal } from "../../_generated/api";

export const interpreterSchema = z.object({
    code: z.string().describe("Python code to execute. Include comments explaining the calculation, source data, and assumptions. Print results with confidence levels."),
});

export type InterpreterInput = z.infer<typeof interpreterSchema>;

export const createInterpreterTool = () => {
    return createTool({
        description: "Execute Python code for calculations and data analysis. REQUIRED for all numeric estimates (dry powder, deal sizes, averages, etc.) - no mental math allowed. Show your work to prevent hallucination. Can use libraries: json, re, statistics, datetime. After calculation, copy output to scratchpad's Calculation Workspace section.",
        args: interpreterSchema,
        handler: async (ctx, args): Promise<string> => {
            const logs = await ctx.runAction(internal.agents.tools.interpreter.runCode, {
                code: args.code,
            });
            return `Python code executed: \n${JSON.stringify(logs)}`;
        },
    });
};

