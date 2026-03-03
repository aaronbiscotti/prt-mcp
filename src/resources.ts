import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerResources(server: McpServer): void {
  server.registerResource(
    "prt-api-capabilities",
    "prt://capabilities",
    {
      title: "PRT MCP capabilities",
      description: "High-level capability list for available tools.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(
            {
              tools: [
                "prt_get_routes",
                "prt_get_directions",
                "prt_get_stops",
                "prt_get_vehicles",
                "prt_get_predictions",
                "prt_get_patterns",
                "prt_get_service_bulletins",
              ],
              notes: [
                "TrueTime API key is required",
                "All tools return raw API payload in structuredContent",
                "Use route-level narrowing for lower token usage",
              ],
            },
            null,
            2,
          ),
        },
      ],
    }),
  );
}
