import { createRequire } from "node:module";
import { Writable } from "node:stream";

const require = createRequire(import.meta.url);

let pinoFactory: any;
try {
  pinoFactory = require("pino");
} catch (error) {
  pinoFactory = null;
}

interface ExternalProviderConfig {
  provider?: string;
  endpoint?: string;
  apiKey?: string;
}

const externalConfig: ExternalProviderConfig = {
  provider: process.env.LOG_EXTERNAL_PROVIDER,
  endpoint: process.env.LOG_EXTERNAL_ENDPOINT,
  apiKey: process.env.LOG_EXTERNAL_API_KEY,
};

class ExternalProviderStream extends Writable {
  private readonly provider: string;
  private readonly endpoint: string;
  private readonly apiKey?: string;

  constructor(config: Required<Pick<ExternalProviderConfig, "provider" | "endpoint">> & { apiKey?: string }) {
    super({ decodeStrings: false });
    this.provider = config.provider;
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
  }

  override _write(chunk: any, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    const payload = typeof chunk === "string" ? chunk : chunk?.toString?.() ?? "";

    void fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        "x-log-provider": this.provider,
      },
      body: payload,
    }).catch((error) => {
      console.error("Failed to forward log to external provider", error);
    }).finally(() => callback());
  }
}

type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

type LogInput = Record<string, unknown> | Error | string | undefined;

type StructuredLogger = {
  level: LogLevel;
  info: (obj?: LogInput, msg?: string) => void;
  error: (obj?: LogInput, msg?: string) => void;
  warn: (obj?: LogInput, msg?: string) => void;
  debug: (obj?: LogInput, msg?: string) => void;
};

const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.body.password",
  "req.body.token",
  "req.body.secret",
  "req.body.currentPassword",
  "req.body.newPassword",
  "req.body.confirmPassword",
];

function buildStructuredPayload(level: LogLevel, input?: LogInput, message?: string) {
  const timestamp = new Date().toISOString();
  const payload: Record<string, unknown> = { level, timestamp };

  if (typeof input === "string" && !message) {
    payload.message = input;
  } else if (input instanceof Error) {
    payload.message = message ?? input.message;
    payload.error = {
      name: input.name,
      message: input.message,
      stack: input.stack,
    };
  } else if (input && typeof input === "object") {
    for (const [key, value] of Object.entries(input)) {
      if (value instanceof Error) {
        payload[key] = {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      } else {
        payload[key] = value as unknown;
      }
    }
    if (message) {
      payload.message = message;
    }
  } else if (message) {
    payload.message = message;
  }

  if (!payload.message) {
    payload.message = level.toUpperCase();
  }

  return payload;
}

const minimumLevel = (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info";
const levels: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
const minimumLevelIndex = levels.indexOf(minimumLevel);

function shouldLog(level: LogLevel) {
  const levelIndex = levels.indexOf(level);
  return levelIndex >= minimumLevelIndex;
}

async function forwardToExternal(payload: Record<string, unknown>) {
  if (!externalConfig.provider || !externalConfig.endpoint) {
    return;
  }

  const serialized = JSON.stringify(payload);
  try {
    await fetch(externalConfig.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(externalConfig.apiKey ? { Authorization: `Bearer ${externalConfig.apiKey}` } : {}),
        "x-log-provider": externalConfig.provider,
      },
      body: serialized,
    });
  } catch (error) {
    console.error("Failed to forward log to external provider", error);
  }
}

function createFallbackLogger(): StructuredLogger {
  const emit = (level: LogLevel, input?: LogInput, message?: string) => {
    if (!shouldLog(level)) {
      return;
    }

    const payload = buildStructuredPayload(level, input, message);
    const serialized = JSON.stringify(payload);

    if (level === "error" || level === "fatal") {
      console.error(serialized);
    } else if (level === "warn") {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }

    void forwardToExternal(payload);
  };

  return {
    level: minimumLevel,
    info: (obj, msg) => emit("info", obj, msg),
    error: (obj, msg) => emit("error", obj, msg),
    warn: (obj, msg) => emit("warn", obj, msg),
    debug: (obj, msg) => emit("debug", obj, msg),
  };
}

const logger: StructuredLogger = (() => {
  const requiresExternalStream = Boolean(externalConfig.provider && externalConfig.endpoint);

  if (pinoFactory) {
    const destination = pinoFactory.destination({ sync: false });
    const streams: Array<{ stream: NodeJS.WritableStream }> = [
      { stream: destination },
    ];

    if (requiresExternalStream) {
      streams.push({
        stream: new ExternalProviderStream({
          provider: externalConfig.provider!,
          endpoint: externalConfig.endpoint!,
          apiKey: externalConfig.apiKey,
        }),
      });
    }

    const loggerInstance = pinoFactory({
      level: minimumLevel,
      timestamp: pinoFactory.stdTimeFunctions?.isoTime,
      redact: redactPaths,
      formatters: {
        level(label: string) {
          return { level: label };
        },
      },
    }, streams.length > 1 ? pinoFactory.multistream(streams) : destination);

    return loggerInstance;
  }

  return createFallbackLogger();
})();

export { logger };
export type { StructuredLogger };
