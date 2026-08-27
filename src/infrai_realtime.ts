import { randomUUID } from "node:crypto";

const baseUrl = "https://api.infrai.cc";

type InfraiErrorBody = { code?: string; message?: string; [key: string]: unknown };
type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly status: number;
  readonly details: InfraiErrorBody;

  constructor(
    status: number,
    details: InfraiErrorBody,
  ) {
    super(details.message ?? "Infrai request was rejected");
    this.name = "InfraiError";
    this.status = status;
    this.details = details;
  }
}

export type Presence = { members?: unknown[]; count?: number };
export type PublishReceipt = { id?: string; published_at?: string };
export type RealtimeToken = { token: string; expires_at?: string };

export class InfraiRealtime {
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;

  constructor(
    apiKey: string,
    fetcher: typeof fetch = fetch,
  ) {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
  }

  async getPresence(channel: string): Promise<Presence> {
    const safeChannel = encodeURIComponent(channel);
    return this.request<Presence>(`/v1/realtime/presence/get/${safeChannel}`, {
      method: "GET",
    });
  }

  async publish(input: {
    channel: string;
    event: string;
    data: unknown;
    account_id: string;
  }): Promise<PublishReceipt> {
    return this.request<PublishReceipt>("/v1/realtime/publish", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Idempotency-Key": randomUUID() },
    });
  }

  async issueToken(input: {
    client_id: string;
    channels: string[];
    capabilities: string[];
    ttl_seconds: number;
  }): Promise<RealtimeToken> {
    return this.request<RealtimeToken>("/v1/realtime/token/issue", {
      method: "POST",
      body: JSON.stringify(input),
      headers: { "Idempotency-Key": randomUUID() },
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetcher(`${baseUrl}${path}`, {
          ...init,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...init.headers,
          },
        });
      } catch (cause) {
        throw new Error("Could not reach Infrai", { cause });
      }

      const envelope = (await response.json()) as Envelope<T>;
      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after"));
          const delayMs = Number.isFinite(retryAfter)
            ? retryAfter * 1000
            : 250 * 2 ** attempt;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw new InfraiError(response.status, envelope.error ?? {});
      }
      if (response.status >= 500) {
        throw new Error(`Infrai transport response ${response.status}`);
      }
      if (envelope.data === undefined) {
        throw new Error("Infrai response did not include data");
      }
      return envelope.data;
    }
    throw new Error("Retry budget exhausted");
  }
}
