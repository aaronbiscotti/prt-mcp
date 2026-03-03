import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PrtClient } from "./prtClient.js";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

export function createPrtServer(client: PrtClient): McpServer {
  const server = new McpServer({
    name: "prt-mcp",
    version: "0.1.0",
    title: "Pittsburgh Regional Transit MCP",
  });

  registerTools(server, client);
  registerResources(server);
  registerPrompts(server);

  return server;
}
