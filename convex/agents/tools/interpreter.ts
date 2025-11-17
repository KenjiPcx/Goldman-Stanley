"use node";

import { Sandbox } from '@e2b/code-interpreter'
import { v } from 'convex/values';
import { internalAction } from '../../_generated/server';

if (!process.env.E2B_API_KEY) throw new Error("E2B_API_KEY is not set");

export const runCode = internalAction({
    args: {
        code: v.string(),
    },
    handler: async (ctx, args) => {
        const sbx = await Sandbox.create()
        const execution = await sbx.runCode(args.code)
        return execution.logs
    },
});