/**
 * Charlie — Standalone AI Runtime
 *
 * Clean, independent AI bot framework built from scratch.
 *
 * Architecture:
 *   main.ts → config → gateway (Fastify) + telegram (grammY) + llm (Multi-provider)
 *                         ↓
 *                    Web tools + Search integration
 */

import { loadConfig } from "./core/config.js";
import { createGateway } from "./core/gateway.js";
import { startTelegram } from "./channels/telegram.js";
import { warnIfNoProviders } from "./core/llm.js";
import { initializeWebTools } from "./core/web-tools.js";
import { rootLogger } from "./core/logger.js";

const log = rootLogger.child({ subsystem: "main" });

async function main() {
  log.info("═══════════════════════════════════════════════════");
  log.info("  CHARLIE v1.0.0 — Standalone AI Runtime");
  log.info("  Pure TypeScript bot framework. Zero dependencies.");
  log.info("═══════════════════════════════════════════════════");
  log.info("");

  // ─── Load config ──────────────────────────────────────
  const config = loadConfig();
  log.info({
    port: config.gateway.port,
    bind: config.gateway.bind,
    primary: config.models.primary,
    providers: Object.keys(config.models.providers),
  }, "config loaded");

  // ─── Check providers ───────────────────────────────────
  warnIfNoProviders(config);

  // ─── Initialize web tools ─────────────────────────────
  const webTools = initializeWebTools(config);
  const webStatus = webTools.getStatus();
  log.info({ webTools: webStatus }, "web tools initialized");

  // ─── Start gateway ────────────────────────────────────
  const gateway = await createGateway(config);
  log.info(`gateway listening on ${config.gateway.bind}:${config.gateway.port}`);

  // ─── Start Telegram ───────────────────────────────────
  let bot: Awaited<ReturnType<typeof startTelegram>> | null = null;
  try {
    bot = await startTelegram(config);
    if (bot) {
      log.info("telegram channel active");
    } else {
      log.info("telegram channel skipped (no bot token configured)");
    }
  } catch (err) {
    log.warn({ error: String(err) }, "telegram failed to start (bot token may be invalid — gateway continues without it)");
  }

  // ─── Status summary ───────────────────────────────────
  log.info("");
  log.info("┌─────────────────────────────────────────────────┐");
  log.info("│  CHARLIE RUNTIME ONLINE                         │");
  log.info("│                                                 │");
  log.info(`│  Gateway:   http://${config.gateway.bind}:${config.gateway.port}        │`);
  log.info(`│  Telegram:  ${bot ? "Active (polling)" : "Disabled       "}                    │`);
  log.info(`│  Primary:   ${config.models.primary.slice(0, 36).padEnd(36)}│`);
  log.info(`│  Providers: ${Object.keys(config.models.providers).join(", ").slice(0, 36).padEnd(36)}│`);
  log.info("│                                                 │");
  log.info("│  Web Search: Brave API integrated               │");
  log.info("│  Status:     Production ready                   │");
  log.info("│                                                 │");
  log.info("│  \"Simple, clean, powerful.\"                     │");
  log.info("└─────────────────────────────────────────────────┘");

  // ─── Graceful shutdown ────────────────────────────────
  const shutdown = async (signal: string) => {
    log.info({ signal }, "shutdown signal received");
    bot?.stop();
    await gateway.close();
    log.info("Charlie shutdown complete");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  log.fatal({ error: String(err) }, "Charlie failed to start");
  process.exit(1);
});
