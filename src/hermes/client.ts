/** Hermes MCP Client — Charlie ↔ Hermes recursive loop. Port 18790. */
export class HermesClient {
  private baseUrl = process.env.HERMES_URL ?? "http://localhost:18790";
  private timeout = 5000;

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch { return false; }
  }

  async submitTask(input: string, source: string, context?: Record<string, unknown>): Promise<unknown | null> {
    try {
      const res = await fetch(`${this.baseUrl}/task`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, source, context, recursionDepth: 0 }),
        signal: AbortSignal.timeout(this.timeout),
      });
      return res.ok ? res.json() : null;
    } catch { return null; }
  }

  async sendTrajectory(t: { taskId: string; score: number; pattern: string }): Promise<void> {
    fetch(`${this.baseUrl}/trajectory`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t), signal: AbortSignal.timeout(this.timeout),
    }).catch(() => { /* silent */ });
  }
}

export const hermesClient = new HermesClient();
