export type AppConfig = {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  userAgent: string;
};

function toInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function loadConfig(): AppConfig {
  const apiKey = process.env.PRT_TRUETIME_API_KEY?.trim() ?? "";
  if (!apiKey) {
    throw new Error("Missing PRT_TRUETIME_API_KEY environment variable.");
  }

  return {
    apiKey,
    baseUrl:
      process.env.PRT_TRUETIME_BASE_URL?.trim() ||
      "https://truetime.portauthority.org/bustime/api/v3",
    timeoutMs: toInt(process.env.PRT_REQUEST_TIMEOUT_MS, 15000),
    maxRetries: toInt(process.env.PRT_MAX_RETRIES, 2),
    userAgent: process.env.PRT_USER_AGENT?.trim() || "prt-mcp/0.1.0",
  };
}
