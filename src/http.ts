#!/usr/bin/env node
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { loadConfig } from "./config.js";
import { PrtClient } from "./prtClient.js";
import { createPrtServer } from "./server.js";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

function toInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function parseCsv(value: string | undefined): string[] | undefined {
  const items = value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return items && items.length > 0 ? items : undefined;
}

function sendJsonRpcError(res: Response, status: number, message: string): void {
  res.status(status).json({
    jsonrpc: "2.0",
    error: { code: -32000, message },
    id: null,
  });
}

function secureEquals(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) return false;
  return timingSafeEqual(leftBuf, rightBuf);
}

const host = process.env.HOST?.trim() || "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);
const allowedHosts = parseCsv(process.env.MCP_ALLOWED_HOSTS);
const allowedOrigins = parseCsv(process.env.MCP_ALLOWED_ORIGINS);
const authToken = process.env.MCP_AUTH_TOKEN?.trim() || "";
const rateLimitWindowMs = toInt(process.env.MCP_RATE_LIMIT_WINDOW_MS, 60000);
const rateLimitMax = toInt(process.env.MCP_RATE_LIMIT_MAX, 120);
const rateLimitBuckets = new Map<string, RateLimitBucket>();

if (!Number.isFinite(port) || port <= 0) {
  throw new Error("Invalid PORT value.");
}

if ((host === "0.0.0.0" || host === "::") && !allowedHosts?.length) {
  console.error(
    "Warning: HOST is publicly bound without MCP_ALLOWED_HOSTS. Set MCP_ALLOWED_HOSTS to reduce DNS rebinding risk.",
  );
}

const config = loadConfig();
const app = createMcpExpressApp({ host, allowedHosts });

app.use("/mcp", (req, res, next) => {
  if (allowedOrigins?.length) {
    const origin = req.header("origin");
    if (origin && !allowedOrigins.includes(origin)) {
      sendJsonRpcError(res, 403, "Forbidden: invalid Origin header.");
      return;
    }
  }

  if (authToken) {
    const authHeader = req.header("authorization") ?? "";
    const bearerPrefix = "Bearer ";
    if (!authHeader.startsWith(bearerPrefix)) {
      sendJsonRpcError(res, 401, "Unauthorized.");
      return;
    }

    const token = authHeader.slice(bearerPrefix.length).trim();
    if (!token || !secureEquals(token, authToken)) {
      sendJsonRpcError(res, 401, "Unauthorized.");
      return;
    }
  }

  if (rateLimitMax > 0) {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";

    if (rateLimitBuckets.size > 2000) {
      for (const [bucketKey, bucket] of rateLimitBuckets.entries()) {
        if (bucket.resetAt <= now) rateLimitBuckets.delete(bucketKey);
      }
    }

    let bucket = rateLimitBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + rateLimitWindowMs };
    }
    bucket.count += 1;
    rateLimitBuckets.set(key, bucket);

    const remaining = Math.max(0, rateLimitMax - bucket.count);
    res.setHeader("X-RateLimit-Limit", String(rateLimitMax));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > rateLimitMax) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      sendJsonRpcError(res, 429, "Too many requests.");
      return;
    }
  }

  next();
});

app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: "prt-mcp" });
});

app.post("/mcp", async (req: Request, res: Response) => {
  const server = createPrtServer(new PrtClient(config));

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling /mcp request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

app.get("/mcp", (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  });
});

app.delete("/mcp", (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  });
});

app.listen(port, host, () => {
  console.error(`PRT MCP HTTP server listening on http://${host}:${port}/mcp`);
});
