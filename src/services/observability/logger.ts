export type LogLevel = "info" | "warn" | "error";

export type LogContext = {
  requestId?: string;
  path?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  job?: string;
  [key: string]: unknown;
};

function shouldWrite(level: LogLevel): boolean {
  if (level === "error") {
    return true;
  }

  if (level === "warn") {
    return true;
  }

  return import.meta.env.DEV;
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  if (!shouldWrite(level)) {
    return;
  }

  const payload = {
    level,
    message,
    ts: new Date().toISOString(),
    ...context,
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

export function logInfo(message: string, context: LogContext = {}) {
  write("info", message, context);
}

export function logWarn(message: string, context: LogContext = {}) {
  write("warn", message, context);
}

export function logError(message: string, context: LogContext = {}) {
  write("error", message, context);
}
