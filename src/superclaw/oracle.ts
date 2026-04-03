/**
 * Charlie ORACLE — Self-Learning Pattern Engine with EWC++ Fisher protection
 * Persists to data/oracle-state.json
 */
import * as fs from "fs/promises";
import * as path from "path";

export interface PatternRecord {
  key: string;
  taskType: string;
  successRate: number;
  fisherImportance: number;
  sampleCount: number;
  preferredProvider: string;
  avgLatencyMs: number;
  lastUpdated: number;
}

const STATE_PATH = path.join(process.cwd(), "data", "oracle-state.json");

export class CharlieOracle {
  private patterns = new Map<string, PatternRecord>();
  private readonly lambda = 0.4;
  private readonly decay = 0.95;
  private dirty = false;

  async load(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
      const records: PatternRecord[] = JSON.parse(await fs.readFile(STATE_PATH, "utf-8"));
      for (const r of records) this.patterns.set(r.key, r);
      console.log(`[Oracle] Loaded ${this.patterns.size} patterns`);
    } catch { console.log("[Oracle] No prior state — starting fresh"); }
  }

  async save(): Promise<void> {
    if (!this.dirty) return;
    await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
    await fs.writeFile(STATE_PATH, JSON.stringify([...this.patterns.values()], null, 2));
    this.dirty = false;
  }

  record(key: string, taskType: string, provider: string, reward: number, latencyMs: number): void {
    const existing = this.patterns.get(key);
    const importance = reward * reward;
    if (existing) {
      existing.fisherImportance = this.decay * existing.fisherImportance + (1 - this.decay) * importance;
      existing.successRate = (existing.successRate * existing.sampleCount + reward) / (existing.sampleCount + 1);
      existing.avgLatencyMs = (existing.avgLatencyMs * existing.sampleCount + latencyMs) / (existing.sampleCount + 1);
      existing.sampleCount++;
      existing.lastUpdated = Date.now();
      if (reward > existing.successRate) existing.preferredProvider = provider;
    } else {
      this.patterns.set(key, { key, taskType, successRate: reward, fisherImportance: importance, sampleCount: 1, preferredProvider: provider, avgLatencyMs: latencyMs, lastUpdated: Date.now() });
    }
    this.dirty = true;
  }

  recommend(key: string): { provider: string; confidence: number } | null {
    const p = this.patterns.get(key);
    if (!p || p.sampleCount < 5) return null;
    return { provider: p.preferredProvider, confidence: Math.min(p.fisherImportance, 1.0) };
  }

  getTopPatterns(n = 10): PatternRecord[] {
    return [...this.patterns.values()].sort((a, b) => b.fisherImportance - a.fisherImportance).slice(0, n);
  }

  getWeakAreas(n = 5): PatternRecord[] {
    return [...this.patterns.values()].filter(p => p.sampleCount >= 10).sort((a, b) => a.successRate - b.successRate).slice(0, n);
  }

  get patternCount(): number { return this.patterns.size; }
}

export const oracle = new CharlieOracle();
