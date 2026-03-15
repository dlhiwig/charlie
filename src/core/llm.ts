/**
 * Charlie LLM Provider Abstraction
 *
 * Unified interface to talk to any LLM provider.
 * Uses the OpenAI SDK as the universal adapter (most providers are compatible).
 */

import OpenAI from "openai";
import type { CharlieConfig } from "./config.js";
import { createSubsystemLogger } from "./logger.js";

const log = createSubsystemLogger("llm");

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
}

// ─── Provider registry ──────────────────────────────────

const clients = new Map<string, OpenAI>();

function getClient(provider: string, config: CharlieConfig): OpenAI {
  if (clients.has(provider)) return clients.get(provider)!;

  const providerConfig = config.models.providers[provider];
  if (!providerConfig) {
    throw new Error(`Unknown provider: ${provider}. Available: ${Object.keys(config.models.providers).join(", ")}`);
  }

  const client = new OpenAI({
    baseURL: providerConfig.baseUrl,
    apiKey: providerConfig.apiKey,
  });

  clients.set(provider, client);
  return client;
}

// ─── Chat completion ────────────────────────────────────

/**
 * Send a chat completion request to the specified model.
 * Model format: "provider/model-id" (e.g., "anthropic/claude-sonnet-4-20250514")
 */
export async function chat(
  modelRef: string,
  messages: LLMMessage[],
  config: CharlieConfig,
  options?: {
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  },
): Promise<LLMResponse> {
  const [provider, ...modelParts] = modelRef.split("/");
  const modelId = modelParts.join("/");

  if (!provider || !modelId) {
    throw new Error(`Invalid model ref: "${modelRef}". Expected "provider/model-id".`);
  }

  const client = getClient(provider, config);
  const start = Date.now();

  log.info({ provider, model: modelId }, "sending chat request");

  try {
    const completion = await client.chat.completions.create({
      model: modelId,
      messages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    });

    const choice = completion.choices[0];
    const latencyMs = Date.now() - start;

    const response: LLMResponse = {
      content: choice?.message?.content ?? "",
      model: modelId,
      provider,
      tokensIn: completion.usage?.prompt_tokens ?? 0,
      tokensOut: completion.usage?.completion_tokens ?? 0,
      latencyMs,
    };

    log.info({
      provider,
      model: modelId,
      tokensIn: response.tokensIn,
      tokensOut: response.tokensOut,
      latencyMs,
    }, "chat complete");

    return response;
  } catch (err) {
    log.error({ provider, model: modelId, error: String(err) }, "chat failed");
    throw err;
  }
}

/**
 * Chat with automatic fallback through the model chain.
 */
/**
 * Check if any cloud providers are configured with real API keys.
 */
export function hasConfiguredProviders(config: CharlieConfig): boolean {
  const providers = config.models.providers;
  if (!providers || Object.keys(providers).length === 0) return false;
  return Object.values(providers).some((p) => p.apiKey && p.apiKey.length > 0);
}

/**
 * Log a warning if no cloud providers are available (Ollama-only mode).
 */
export function warnIfNoProviders(config: CharlieConfig): void {
  if (!hasConfiguredProviders(config)) {
    log.warn("No cloud LLM providers configured (or all have empty API keys). Running in Ollama-only mode. Cloud model requests will fail.");
  }
}

export async function chatWithFallback(
  messages: LLMMessage[],
  config: CharlieConfig,
  options?: { maxTokens?: number; temperature?: number },
): Promise<LLMResponse> {
  const chain = [config.models.primary, ...config.models.fallbacks];

  for (const modelRef of chain) {
    try {
      return await chat(modelRef, messages, config, options);
    } catch (err) {
      log.warn({ model: modelRef, error: String(err) }, "model failed, trying next");
    }
  }

  throw new Error(`All models failed: ${chain.join(", ")}`);
}
