import express, { type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { registerRoutes } from "./routes";
import { logger } from "./logger";

declare module "http" {
  interface IncomingMessage {
    rawBody?: unknown;
  }
}

declare module "express-serve-static-core" {
  interface Request {
    id: string;
  }
}

function sanitizeHeaders(headers: Request["headers"]) {
  const forbiddenHeaders = new Set([
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
  ]);

  return Object.entries(headers).reduce<Record<string, unknown>>((accumulator, [key, value]) => {
    if (!forbiddenHeaders.has(key.toLowerCase())) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
}

function sanitizeQuery(query: Request["query"]) {
  return Object.entries(query).reduce<Record<string, unknown>>((accumulator, [key, value]) => {
    if (/password|token|secret/i.test(key)) {
      accumulator[key] = "[REDACTED]";
    } else {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
}

export async function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use((req, _res, next) => {
    req.id = randomUUID();
    next();
  });

  app.use(express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }));
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    const requestContext = {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      headers: sanitizeHeaders(req.headers),
      query: sanitizeQuery(req.query),
      userAgent: req.get("user-agent"),
    };
    let finished = false;

    res.on("finish", () => {
      const durationNs = process.hrtime.bigint() - start;
      const durationMs = Number(durationNs) / 1_000_000;
      logger.info({
        ...requestContext,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(3)),
      }, "Request completed");
      finished = true;
    });

    res.on("close", () => {
      if (finished) {
        return;
      }
      const durationNs = process.hrtime.bigint() - start;
      const durationMs = Number(durationNs) / 1_000_000;
      logger.warn({
        ...requestContext,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(3)),
      }, "Request closed before completion");
    });

    next();
  });

  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status ?? err?.statusCode ?? 500;
    const safeMessage = status >= 500 ? "Internal Server Error" : err?.message ?? "Unexpected error";

    logger.error({
      requestId: req.id,
      path: req.originalUrl,
      method: req.method,
      statusCode: status,
      error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
    }, "Unhandled application error");

    res.status(status).json({ message: safeMessage });
  });

  return { app, server };
}
