import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PrtClient } from "./prtClient.js";

const readOnlyToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: true,
};

const output = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  structuredContent: { data },
});

const errorOutput = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown tool error";
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
    structuredContent: { error: { message } },
  };
};

async function runTool<T>(operation: () => Promise<T>) {
  try {
    return output(await operation());
  } catch (error) {
    return errorOutput(error);
  }
}

export function registerTools(server: McpServer, client: PrtClient): void {
  server.registerTool(
    "prt_get_routes",
    {
      title: "Get PRT routes",
      description: "Fetch route metadata from TrueTime getroutes.",
      annotations: readOnlyToolAnnotations,
      inputSchema: {
        rtpidatafeed: z.string().optional().describe("Example: Port Authority Bus or Light Rail"),
      },
    },
    ({ rtpidatafeed }) => runTool(() => client.get("getroutes", { rtpidatafeed })),
  );

  server.registerTool(
    "prt_get_directions",
    {
      title: "Get route directions",
      description: "Fetch available directions for a route using getdirections.",
      annotations: readOnlyToolAnnotations,
      inputSchema: {
        rt: z.string().describe("Route code"),
        rtpidatafeed: z.string().optional(),
      },
    },
    ({ rt, rtpidatafeed }) => runTool(() => client.get("getdirections", { rt, rtpidatafeed })),
  );

  server.registerTool(
    "prt_get_stops",
    {
      title: "Get route stops",
      description: "Fetch stops for a route with optional direction using getstops.",
      annotations: readOnlyToolAnnotations,
      inputSchema: {
        rt: z.string().describe("Route code"),
        dir: z.string().optional().describe("INBOUND or OUTBOUND, if supported"),
        rtpidatafeed: z.string().optional(),
      },
    },
    ({ rt, dir, rtpidatafeed }) => runTool(() => client.get("getstops", { rt, dir, rtpidatafeed })),
  );

  server.registerTool(
    "prt_get_vehicles",
    {
      title: "Get active vehicles",
      description: "Fetch live vehicle data via getvehicles.",
      annotations: readOnlyToolAnnotations,
      inputSchema: {
        rt: z.string().optional().describe("Optional route filter"),
        vid: z.string().optional().describe("Optional vehicle id filter"),
        rtpidatafeed: z.string().optional(),
      },
    },
    ({ rt, vid, rtpidatafeed }) => runTool(() => client.get("getvehicles", { rt, vid, rtpidatafeed })),
  );

  server.registerTool(
    "prt_get_predictions",
    {
      title: "Get stop predictions",
      description: "Fetch arrival predictions for one or more stop IDs.",
      annotations: readOnlyToolAnnotations,
      inputSchema: {
        stpid: z.string().describe("Stop ID(s), comma-separated"),
        top: z.number().int().positive().max(20).optional().describe("Maximum predictions to return"),
        rtpidatafeed: z.string().optional(),
      },
    },
    ({ stpid, top, rtpidatafeed }) =>
      runTool(() => client.get("getpredictions", { stpid, top, rtpidatafeed })),
  );

  server.registerTool(
    "prt_get_patterns",
    {
      title: "Get route patterns",
      description: "Fetch route geometry/pattern data via getpatterns.",
      annotations: readOnlyToolAnnotations,
      inputSchema: {
        rt: z.string().optional().describe("Route code"),
        pid: z.string().optional().describe("Pattern id"),
        rtpidatafeed: z.string().optional(),
      },
    },
    ({ rt, pid, rtpidatafeed }) =>
      runTool(async () => {
        if (!rt && !pid) {
          throw new Error("Provide at least one of rt or pid.");
        }
        return client.get("getpatterns", { rt, pid, rtpidatafeed });
      }),
  );

  server.registerTool(
    "prt_get_service_bulletins",
    {
      title: "Get service bulletins",
      description: "Fetch service bulletins using getservicebulletins.",
      annotations: readOnlyToolAnnotations,
      inputSchema: {
        rt: z.string().optional().describe("Optional route filter"),
        rtpidatafeed: z.string().optional(),
      },
    },
    ({ rt, rtpidatafeed }) => runTool(() => client.get("getservicebulletins", { rt, rtpidatafeed })),
  );
}
