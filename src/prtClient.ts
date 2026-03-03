import { AppConfig } from "./config.js";

export type BustimeResponse<T = unknown> = {
  "bustime-response"?: T & {
    error?: { msg?: string };
  };
};

export class PrtClient {
  constructor(private readonly config: AppConfig) {}

  async get<T = unknown>(endpoint: string, params: Record<string, string | number | undefined>) {
    const merged = {
      ...params,
      key: this.config.apiKey,
      format: "json",
    };

    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== null && String(v).length > 0) query.set(k, String(v));
    }

    const url = `${this.config.baseUrl.replace(/\/$/, "")}/${endpoint}?${query.toString()}`;
    const payload = await this.requestWithRetry<BustimeResponse<T>>(url);

    const inner = payload["bustime-response"];
    const err = inner?.error?.msg;
    if (err) throw new Error(`PRT API error: ${err}`);
    if (!inner) throw new Error("Malformed PRT API response: missing bustime-response.");

    return inner;
  }

  private async requestWithRetry<T>(url: string): Promise<T> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.config.maxRetries) {
      try {
        return await this.request<T>(url);
      } catch (error) {
        lastError = error;
        if (attempt === this.config.maxRetries) break;
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
      attempt += 1;
    }

    throw lastError instanceof Error ? lastError : new Error("Unknown request failure");
  }

  private async request<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": this.config.userAgent,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from PRT API`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
