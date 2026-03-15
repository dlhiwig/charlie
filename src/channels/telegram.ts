/**
 * Charlie Telegram Channel
 *
 * Direct grammY integration with clean, minimal architecture.
 * Handles incoming messages, routes to agent, sends responses.
 */

import { Bot, type Context } from "grammy";
import type { CharlieConfig } from "../core/config.js";
import { chatWithFallback, type LLMMessage } from "../core/llm.js";
import { getWebTools } from "../core/web-tools.js";
import { createSubsystemLogger } from "../core/logger.js";

const log = createSubsystemLogger("telegram");

// ─── Session memory (in-memory for now, SQLite later) ───

interface Session {
  messages: LLMMessage[];
  lastActive: number;
}

const sessions = new Map<string, Session>();

const SYSTEM_PROMPT = `You are Charlie, a clean and efficient AI assistant built on a pure TypeScript runtime.
You run as a standalone bot framework with multi-provider LLM support and integrated web search capabilities.
You have access to multiple AI models (Anthropic Claude, OpenAI GPT, local Ollama models) plus Brave Search API.
Be helpful, direct, and technically accurate. You're a production-ready AI runtime.

When users ask for current information, recent events, or anything that requires up-to-date data, use web search automatically.
Format search results clearly and cite sources with URLs.`;

function getSession(chatId: string): Session {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, {
      messages: [{ role: "system", content: SYSTEM_PROMPT }],
      lastActive: Date.now(),
    });
  }
  const session = sessions.get(chatId)!;
  session.lastActive = Date.now();
  return session;
}

// ─── Telegram Bot ───────────────────────────────────────

export async function startTelegram(config: CharlieConfig) {
  const token = config.telegram.botToken;
  if (!token || token === "NEEDS_BOT_TOKEN") {
    log.warn("Telegram botToken is not configured — skipping Telegram channel. Set a valid token in charlie.json.");
    return null;
  }

  const bot = new Bot(token);

  // Auth check — only allow configured users
  bot.use(async (ctx, next) => {
    const senderId = String(ctx.from?.id ?? "");
    if (config.telegram.allowFrom.length > 0 && !config.telegram.allowFrom.includes(senderId)) {
      log.warn({ senderId, username: ctx.from?.username }, "unauthorized message, ignoring");
      return; // Silent drop
    }
    await next();
  });

  // Handle /search command
  bot.command("search", async (ctx) => {
    const query = ctx.message?.text.replace("/search", "").trim();
    
    if (!query) {
      await ctx.reply("Usage: /search <your query>\nExample: /search latest AI developments");
      return;
    }

    const webTools = getWebTools();
    if (!webTools) {
      await ctx.reply("❌ Web search is not available");
      return;
    }

    await ctx.replyWithChatAction("typing");

    try {
      const searchResult = await webTools.quickSearch(query, 5);
      
      if (!searchResult.success) {
        await ctx.reply(`❌ Search failed: ${searchResult.error}`);
        return;
      }

      if (searchResult.results.length === 0) {
        await ctx.reply(`🔍 No results found for "${query}"`);
        return;
      }

      let message = `🔍 **Search results for "${query}":**\n\n`;
      searchResult.results.slice(0, 5).forEach((result, i) => {
        message += `**${i + 1}. ${result.title}**\n`;
        message += `${result.url}\n`;
        message += `${result.description.substring(0, 150)}...\n\n`;
      });

      await ctx.reply(message, { parse_mode: "Markdown" }).catch(() =>
        ctx.reply(message) // Fallback without markdown
      );

    } catch (error) {
      log.error({ error, query }, "Search command failed");
      await ctx.reply("❌ Search failed due to an error");
    }
  });

  // Handle text messages
  bot.on("message:text", async (ctx: Context) => {
    const chatId = String(ctx.chat!.id);
    const text = ctx.message!.text!;
    const sender = ctx.from?.username ?? ctx.from?.first_name ?? "unknown";

    // Skip if it's a command
    if (text.startsWith("/")) {
      return;
    }

    log.info({ chatId, sender, text: text.slice(0, 100) }, "message received");

    // Check if message might need web search
    const needsWebSearch = /\b(latest|recent|current|today|news|what's|happening|2026|update|now)\b/i.test(text) ||
                          /\b(search|find|look up)\b/i.test(text);

    // Add to session
    const session = getSession(chatId);
    
    // If web search might be helpful, perform it first
    let webSearchContext = "";
    if (needsWebSearch) {
      const webTools = getWebTools();
      if (webTools) {
        try {
          await ctx.replyWithChatAction("typing");
          const searchResult = await webTools.quickSearch(text, 3);
          if (searchResult.success && searchResult.results.length > 0) {
            webSearchContext = `\n\nWeb search context for your response:\n${searchResult.formattedText}`;
          }
        } catch (error) {
          log.warn({ error }, "Auto web search failed");
        }
      }
    }

    session.messages.push({ 
      role: "user", 
      content: text + webSearchContext 
    });

    // Keep context window manageable (last 20 messages + system)
    if (session.messages.length > 21) {
      session.messages = [
        session.messages[0], // system prompt
        ...session.messages.slice(-20),
      ];
    }

    try {
      // Send typing indicator
      await ctx.replyWithChatAction("typing");

      // Call LLM
      const response = await chatWithFallback(session.messages, config);

      // Add assistant response to session
      session.messages.push({ role: "assistant", content: response.content });

      // Send response
      await ctx.reply(response.content, { parse_mode: "Markdown" }).catch(() =>
        // Fallback: send without markdown if parsing fails
        ctx.reply(response.content)
      );

      log.info({
        chatId,
        provider: response.provider,
        model: response.model,
        tokensIn: response.tokensIn,
        tokensOut: response.tokensOut,
        latencyMs: response.latencyMs,
      }, "response sent");
    } catch (err) {
      log.error({ chatId, error: String(err) }, "agent error");
      await ctx.reply("⚠️ Something went wrong. All providers failed.").catch(() => {});
    }
  });

  // Handle /start command
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "🚀 *Charlie Runtime — Online*\n\n" +
      "Independent AI runtime. Zero external platform dependency.\n" +
      "Fastify gateway + grammY Telegram integration.\n\n" +
      "Status: Early testing. Talk to me.",
      { parse_mode: "Markdown" },
    );
  });

  // Handle /status command
  bot.command("status", async (ctx) => {
    const sessionCount = sessions.size;
    const uptime = Math.floor(process.uptime());
    const memMB = Math.floor(process.memoryUsage.rss() / 1024 / 1024);

    await ctx.reply(
      `📊 *Charlie Status*\n\n` +
      `Runtime: Charlie v1.0.0\n` +
      `Uptime: ${uptime}s\n` +
      `Memory: ${memMB} MB\n` +
      `Sessions: ${sessionCount}\n` +
      `Primary: ${config.models.primary}\n` +
      `Providers: ${Object.keys(config.models.providers).join(", ")}`,
      { parse_mode: "Markdown" },
    );
  });

  // Start polling (non-blocking — errors are caught)
  bot.start({
    onStart: (botInfo) => {
      log.info({ username: botInfo.username, id: botInfo.id }, "Telegram bot started");
    },
  }).catch((err) => {
    log.error({ error: String(err) }, "Telegram bot polling failed — will not receive messages");
  });

  log.info("Telegram channel initialized");
  return bot;
}
