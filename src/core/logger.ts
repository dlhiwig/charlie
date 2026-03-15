/**
 * Charlie Logger
 *
 * Shim #1 of 8: Lightweight subsystem logger.
 * Uses pino for structured, fast logging.
 */

import pino from "pino";

const rootLogger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: process.env.NODE_ENV !== "production"
    ? { target: "pino-pretty", options: { colorize: true, ignore: "pid,hostname" } }
    : undefined,
});

/**
 * Create a subsystem logger with structured output
 */
export function createSubsystemLogger(subsystem: string) {
  return rootLogger.child({ subsystem });
}

export type Logger = ReturnType<typeof createSubsystemLogger>;
export { rootLogger };
