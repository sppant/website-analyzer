import * as Sentry from "@sentry/node";
import type { DestinationStream } from "pino";

/** No-op when `dsn` is not configured — Sentry is optional, like Stripe/SMTP. */
export function initSentry(dsn: string | null): void {
  if (!dsn) return;
  Sentry.init({ dsn, tracesSampleRate: 0 });
}

type PinoErrSerialized = {
  type?: string;
  message?: string;
  stack?: string;
};

type PinoLogRecord = {
  level?: number;
  msg?: string;
  reqId?: string;
  err?: PinoErrSerialized;
};

/** Pino logs at or above this level are forwarded to Sentry. */
const PINO_ERROR_LEVEL = 50;

/**
 * A pino destination that reports every error-level log line to Sentry.
 *
 * The app has no single place where errors are thrown through Fastify —
 * every route/plugin catches its own errors and logs them with
 * `request.log.error(err, "message")` (see e.g. the Stripe webhook handler
 * and the analyzer route). Tapping the logger here, as an extra stream
 * alongside stdout, reports all of those without touching each call site.
 */
export function createSentryStream(): DestinationStream {
  return {
    write(line: string) {
      try {
        const record: PinoLogRecord = JSON.parse(line);
        if ((record.level ?? 0) < PINO_ERROR_LEVEL) return;

        if (record.err?.message) {
          const error = new Error(record.err.message);
          error.name = record.err.type ?? "Error";
          error.stack = record.err.stack;
          Sentry.captureException(error, {
            extra: { msg: record.msg, reqId: record.reqId },
          });
        } else {
          Sentry.captureMessage(record.msg ?? line, "error");
        }
      } catch {
        // A malformed log line must never break logging itself.
      }
    },
  };
}
