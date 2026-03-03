import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "transit-arrival-workflow",
    {
      title: "Transit arrival workflow",
      description: "Step-by-step workflow for arrival predictions at a stop.",
      argsSchema: {
        stopId: z.string().describe("Stop ID used by TrueTime"),
      },
    },
    (args) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Find predictions for stop ${args.stopId}. ` +
              "Use prt_get_predictions with top=5, then summarize imminent arrivals, delays, and route labels.",
          },
        },
      ],
    }),
  );
}
