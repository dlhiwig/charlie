/**
 * Charlie Configuration
 *
 * Minimal, typed config loader. No wizard, no interactive setup.
 * Reads from charlie.json + .env — that's it.
 */

import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { z } from "zod";

// ─── Schema ─────────────────────────────────────────────────

const ProviderSchema = z.object({
  baseUrl: z.string(),
  apiKey: z.string(),
  models: z.array(z.object({
    id: z.string(),
    name: z.string().optional(),
    contextWindow: z.number().optional(),
    maxTokens: z.number().optional(),
  })).default([]),
});

const CharlieConfigSchema = z.object({
  gateway: z.object({
    port: z.number().default(18795),
    bind: z.string().default("127.0.0.1"),
    authToken: z.string().default("bravo-local-key"),
  }),
  telegram: z.object({
    botToken: z.string(),
    allowFrom: z.array(z.string()).default([]),
  }),
  models: z.object({
    primary: z.string().default("anthropic/claude-sonnet-4-20250514"),
    fallbacks: z.array(z.string()).default([]),
    providers: z.record(z.string(), ProviderSchema).default({}),
  }),
  tools: z.object({
    webSearch: z.object({
      enabled: z.boolean().default(false),
      provider: z.string().default("brave"),
      apiKey: z.string().optional(),
      defaults: z.object({
        country: z.string().default("US"),
        search_lang: z.string().default("en"),
        safesearch: z.enum(["off", "moderate", "strict"]).default("moderate"),
        maxResults: z.number().default(10),
      }).optional(),
    }).optional(),
  }).optional(),
  ollama: z.object({
    baseUrl: z.string().default("http://127.0.0.1:11434"),
  }),
  stateDir: z.string().default(homedir() + "/.charlie"),
});

export type CharlieConfig = z.infer<typeof CharlieConfigSchema>;

// ─── Loader ─────────────────────────────────────────────────

let _config: CharlieConfig | null = null;

export function loadConfig(configPath?: string): CharlieConfig {
  if (_config) return _config;

  const defaultStateDir = process.env.CHARLIE_STATE_DIR ?? (homedir() + "/.charlie");
  const filePath = configPath
    ?? process.env.CHARLIE_CONFIG_PATH
    ?? resolve(defaultStateDir, "charlie.json");

  if (!existsSync(filePath)) {
    console.error(
      `\n❌ Config not found: ${filePath}\n` +
      `   To get started, copy the example config:\n` +
      `     mkdir -p ${defaultStateDir}\n` +
      `     cp config/charlie.example.json ${filePath}\n` +
      `   Then edit it with your API keys and bot token.\n`,
    );
    throw new Error(`Config not found: ${filePath}. See charlie.example.json in config/.`);
  }

  let rawContent = readFileSync(filePath, "utf-8");
  
  // Simple environment variable substitution
  rawContent = rawContent.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    return process.env[varName] || match;
  });
  
  const raw = JSON.parse(rawContent);
  _config = CharlieConfigSchema.parse(raw);

  // Ensure stateDir exists
  if (!existsSync(_config.stateDir)) {
    mkdirSync(_config.stateDir, { recursive: true });
  }

  return _config;
}

export function getConfig(): CharlieConfig {
  if (!_config) throw new Error("Config not loaded. Call loadConfig() first.");
  return _config;
}
