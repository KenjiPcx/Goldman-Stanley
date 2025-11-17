// convex/convex.config.ts
import { defineApp } from "convex/server";
import workflow from "@convex-dev/workflow/convex.config";
import agent from "@convex-dev/agent/convex.config";
import autumn from "@useautumn/convex/convex.config";

const app = defineApp();
app.use(workflow);
app.use(agent);
app.use(autumn);

export default app;