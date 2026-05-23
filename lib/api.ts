import type {
  AuditDataResponse,
  CountryMetadataResponse,
  DiseaseMeta,
  ParseResult,
  SimulationResult,
  TrialConfig,
} from "./types";

const API_BASE = ""; // proxied through next.config.js rewrite -> /api/*

async function jget<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

async function jpost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  health: () =>
    jget<{ status: string; ollama_available: boolean; model: string }>("/api/health"),

  diseases: () => jget<{ diseases: DiseaseMeta[] }>("/api/diseases"),

  countryMetadata: () => jget<CountryMetadataResponse>("/api/country-metadata"),

  auditData: () => jget<AuditDataResponse>("/api/audit-data"),

  parseText: (text: string) => jpost<ParseResult>("/api/parse", { text }),

  createRun: (config: TrialConfig) =>
    jpost<{ run_id: string; status: string }>("/api/simulate", config),

  getResult: (run_id: string) => jget<SimulationResult>(`/api/result/${run_id}`),
};

export type ProgressEvent =
  | { event: "queued"; data: { run_id: string } }
  | { event: "progress"; data: { stage: string; idx: number; total: number } }
  | { event: "result"; data: SimulationResult }
  | { event: "error"; data: { error: string } }
  | { event: "done"; data: Record<string, never> };

export function streamRun(
  run_id: string,
  onEvent: (e: ProgressEvent) => void
): () => void {
  const es = new EventSource(`/api/simulate/${run_id}`);

  const handler = (eventType: ProgressEvent["event"]) => (ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data);
      onEvent({ event: eventType, data } as ProgressEvent);
    } catch {
      // ignore
    }
  };

  es.addEventListener("queued", handler("queued"));
  es.addEventListener("progress", handler("progress"));
  es.addEventListener("result", handler("result"));
  es.addEventListener("error", handler("error"));
  es.addEventListener("done", (ev) => {
    handler("done")(ev as MessageEvent);
    es.close();
  });
  es.onerror = () => {
    // EventSource will auto-retry; we ignore unless we explicitly close.
  };

  return () => es.close();
}
