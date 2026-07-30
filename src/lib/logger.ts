import "server-only";

type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
    version: process.env.APP_VERSION ?? "local",
    ...context,
  };

  const serialized = JSON.stringify(entry);

  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.info(serialized);
}

export const logger = {
  info: (message: string, context?: LogContext) =>
    write("info", message, context),
  warn: (message: string, context?: LogContext) =>
    write("warn", message, context),
  error: (message: string, context?: LogContext) =>
    write("error", message, context),
};
