#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { PrtClient } from "./prtClient.js";
import { createPrtServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new PrtClient(config);
  const server = createPrtServer(client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("PRT MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in prt-mcp:", error);
  process.exit(1);
});
