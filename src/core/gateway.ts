/**
 * Charlie Gateway
 *
 * Minimal Fastify HTTP/WS server. Serves:
 * - /health — gateway health check
 * - /api/v1/agent/* — AI agent API endpoints
 * - /api/v1/search — web search integration
 * - WebSocket for real-time streaming (future)
 */

import Fastify from "fastify";
import type { CharlieConfig } from "./config.js";
import { getWebTools } from "./web-tools.js";
import { createSubsystemLogger } from "./logger.js";

const log = createSubsystemLogger("gateway");

export async function createGateway(config: CharlieConfig) {
  const app = Fastify({
    logger: false, // We use our own pino logger
  });

  // ─── Auth middleware ──────────────────────────────────

  app.addHook("onRequest", async (request, reply) => {
    // Health endpoint is public
    if (request.url === "/health") return;

    const authHeader = request.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (token !== config.gateway.authToken) {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });

  // ─── Routes ───────────────────────────────────────────

  app.get("/health", async () => ({
    status: "ok",
    name: "charlie",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  // Runtime status endpoint
  app.get("/api/v1/status", async () => ({
    status: "ok",
    runtime: "charlie",
    version: "1.0.0",
    modules: {
      gateway: "active",
      telegram: "active",
      webSearch: "active",
      llm: "active"
    },
  }));

  // Web search endpoint
  app.post<{
    Body: { 
      query: string; 
      count?: number;
      country?: string;
      language?: string;
      freshness?: 'pd' | 'pw' | 'pm' | 'py';
    };
  }>("/api/v1/search", async (request) => {
    const webTools = getWebTools();
    
    if (!webTools) {
      return {
        success: false,
        error: "Web search not available",
        timestamp: new Date().toISOString(),
      };
    }

    const result = await webTools.search(request.body);
    return {
      ...result,
      timestamp: new Date().toISOString(),
    };
  });

  // Quick search endpoint
  app.get<{
    Querystring: { q: string; count?: string };
  }>("/api/v1/search/quick", async (request) => {
    const webTools = getWebTools();
    const { q: query, count } = request.query;

    if (!query) {
      return { success: false, error: "Query parameter 'q' is required" };
    }
    
    if (!webTools) {
      return {
        success: false,
        error: "Web search not available",
        timestamp: new Date().toISOString(),
      };
    }

    const result = await webTools.quickSearch(query, count ? parseInt(count) : 5);
    return {
      ...result,
      timestamp: new Date().toISOString(),
    };
  });

  // Web tools status
  app.get("/api/v1/tools/status", async () => {
    const webTools = getWebTools();
    return {
      status: "ok",
      tools: webTools?.getStatus() || { webSearch: { enabled: false, available: false } },
      timestamp: new Date().toISOString(),
    };
  });

  // Agent message endpoint — the core "brain" API
  app.post<{
    Body: { message: string; sessionKey?: string; channel?: string };
  }>("/api/v1/agent/message", async (request) => {
    const { message, sessionKey, channel } = request.body;

    log.info({ message: message.slice(0, 100), sessionKey, channel }, "agent message received");

    // For now, echo back — will be replaced with real agent loop
    return {
      response: `[Charlie Runtime] Received: "${message.slice(0, 200)}"`,
      model: config.models.primary,
      timestamp: new Date().toISOString(),
    };
  });

  // ─── Start ────────────────────────────────────────────

  const address = await app.listen({
    port: config.gateway.port,
    host: config.gateway.bind,
  });

  log.info(`Charlie gateway listening on ${address}`);

  return app;
}
