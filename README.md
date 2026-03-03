# prt-mcp

MCP server exposing Pittsburgh Regional Transit (PRT) TrueTime operations as typed tools for agent clients.

## What this implements

- MCP `tools` for core TrueTime queries:
	- `prt_get_routes`
	- `prt_get_directions`
	- `prt_get_stops`
	- `prt_get_vehicles`
	- `prt_get_predictions`
	- `prt_get_patterns`
	- `prt_get_service_bulletins`
- MCP `resources`:
	- `prt://capabilities` (discoverability for clients)
- MCP `prompts`:
	- `transit-arrival-workflow`

## Source references used for design

- MCP protocol/spec and server guidance:
	- modelcontextprotocol.io docs + specification (JSON-RPC, capabilities, safety)
- MCP reference implementations:
	- `modelcontextprotocol/servers` (`everything`, `fetch`, `filesystem`)
- MCP SDK patterns:
	- `modelcontextprotocol/typescript-sdk`
- PRT data/API entry points:
	- PRT Developer Resources
	- TrueTime account/API key workflow
	- TrueTime v3 endpoint behavior from public community codebases:
		- `juctaposed/bustimePGH`
		- `aidan2312/prt-api`

## Prerequisites

- Node 20+ (Node 22 recommended)
- A PRT TrueTime API key

## Configuration

Copy env template:

```bash
cp .env.example .env
```

Set:

- `PRT_TRUETIME_API_KEY` (required)
- Optional tuning:
	- `PRT_TRUETIME_BASE_URL`
	- `PRT_REQUEST_TIMEOUT_MS`
	- `PRT_MAX_RETRIES`
	- `PRT_USER_AGENT`
- Optional HTTP mode security:
	- `HOST` (default: `127.0.0.1`)
	- `PORT` (default: `3000`)
	- `MCP_ALLOWED_HOSTS` (comma-separated `Host` allowlist)
	- `MCP_ALLOWED_ORIGINS` (comma-separated browser `Origin` allowlist)
	- `MCP_AUTH_TOKEN` (Bearer token expected on `/mcp`)
	- `MCP_RATE_LIMIT_WINDOW_MS`
	- `MCP_RATE_LIMIT_MAX`

## Run

```bash
npm install
npm run build
npm start
```

For local development:

```bash
npm run dev
```

For hosted HTTP mode (remote MCP endpoint):

```bash
npm run build
PORT=3000 HOST=0.0.0.0 MCP_AUTH_TOKEN=change-me npm run start:http
```

Health check:

```bash
curl http://localhost:3000/healthz
```

MCP endpoint:

- `POST /mcp`
- Include `Authorization: Bearer <MCP_AUTH_TOKEN>` if auth is enabled.

## Example MCP client config (stdio)

```json
{
	"mcpServers": {
		"prt": {
			"command": "node",
			"args": ["/ABSOLUTE/PATH/prt-mcp/dist/index.js"],
			"env": {
				"PRT_TRUETIME_API_KEY": "YOUR_KEY"
			}
		}
	}
}
```

## Hosting options

You now have two transport modes:

1. **Local stdio** (`npm start`)  
	Best for Claude Desktop / local agent tools.
2. **Remote Streamable HTTP** (`npm run start:http`)  
	Best for hosting on Render/Railway/Fly.io/a VM.

Minimal production checklist:

- Set `PRT_TRUETIME_API_KEY` in host environment variables.
- Use Node 20+ runtime.
- Expose the `PORT` your host provides.
- Keep at least one health check path (`/healthz`).
- Set `MCP_AUTH_TOKEN`.
- Set `MCP_ALLOWED_HOSTS` and `MCP_ALLOWED_ORIGINS` for your deployment.
- Restrict inbound access (IP allowlist, auth gateway, or private network).

Example Render/Railway start command:

```bash
npm run build && npm run start:http
```

## Docker

Build image:

```bash
docker build -t prt-mcp:latest .
```

Run container:

```bash
docker run --rm -p 3000:3000 -e PRT_TRUETIME_API_KEY=YOUR_KEY prt-mcp:latest
```

## Implementation best practices applied

- Input validation with `zod` on every tool schema
- Fail-fast config checks (missing key)
- Retry + timeout behavior to handle unstable upstream API responses
- Uniform structured + text output for deterministic agent parsing
- Tool execution failures returned as MCP `isError` results
- Tool annotations (`readOnlyHint`, `idempotentHint`, `openWorldHint`) for client safety hints
- HTTP hardening: auth token, origin checks, host allowlist support, and rate limiting
- Strict TypeScript + minimal surface area
- No secrets in source; env-only configuration

## Notes

- TrueTime key acquisition is account-gated by PRT.
- API responses can differ by data feed (`Port Authority Bus`, `Light Rail`).
- Some endpoints require additional filters (`rt`, `stpid`, `pid`).
