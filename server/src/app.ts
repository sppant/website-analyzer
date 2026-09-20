import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import Stripe from "stripe";

import {
  createDrizzleAnalysisRepository,
  type AnalysisRepository,
} from "./analyses/analysis-repository.js";
import { analysisPlugin } from "./analyses/analysis-plugin.js";
import {
  createDrizzleAuthRepository,
  type AuthRepository,
} from "./auth/auth-repository.js";
import { authPlugin } from "./auth/auth-plugin.js";
import {
  createDrizzleBillingRepository,
  type BillingRepository,
} from "./billing/billing-repository.js";
import { billingPlugin } from "./billing/billing-plugin.js";
import {
  createDrizzleProjectRepository,
  type ProjectRepository,
} from "./projects/project-repository.js";
import { projectPlugin } from "./projects/project-plugin.js";
import {
  createDrizzleCrawlRepository,
  type CrawlRepository,
} from "./crawler/crawl-repository.js";
import { crawlPlugin } from "./crawler/crawl-plugin.js";
import { createBillingService } from "./billing/billing-service.js";
import {
  createStripeGateway,
  type StripeGateway,
} from "./billing/stripe-gateway.js";
import { resolveAppUrl, type SmtpConfig, type StripeConfig } from "./config.js";
import { createDatabase } from "./db/client.js";
import { analyzeRoute } from "./routes/analyze.js";
import { createConsoleMailer, type Mailer } from "./services/mailer.js";
import { createSmtpMailer } from "./services/smtp-mailer.js";

const PRODUCTION_ORIGIN = "https://seo.webxdevelop.com";
const DEV_ORIGIN = "http://localhost:5173";

/** Cross-origin browser callers allowed to send credentials. */
function allowedOrigins(isProduction: boolean): string[] {
  return isProduction
    ? [PRODUCTION_ORIGIN]
    : [DEV_ORIGIN, PRODUCTION_ORIGIN];
}

const DEV_SESSION_SECRET = "insecure-development-session-secret";

export type BuildAppOptions = {
  isProduction?: boolean;
  /**
   * Auth persistence. Provide `authRepository` directly (tests), or
   * `databaseUrl` to use Postgres. If neither is given, the auth routes are not
   * registered — the anonymous analyzer still works.
   */
  authRepository?: AuthRepository;
  analysisRepository?: AnalysisRepository;
  billingRepository?: BillingRepository;
  projectRepository?: ProjectRepository;
  crawlRepository?: CrawlRepository;
  databaseUrl?: string;
  sessionSecret?: string;
  /** Base URL of the frontend, for links in emails / Checkout. Defaults from env. */
  appUrl?: string;
  /**
   * Explicit mailer (tests). When omitted: an SMTP mailer if `smtp` is given,
   * otherwise the development console mailer — which is refused in production.
   */
  mailer?: Mailer;
  /** Real SMTP config (from env). Ignored when `mailer` is provided. */
  smtp?: SmtpConfig;
  /** Real Stripe config (from env). Ignored when `stripeGateway` is provided. */
  stripe?: StripeConfig;
  /** Inject a fake gateway in tests. */
  stripeGateway?: StripeGateway;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const isProduction =
    options.isProduction ?? process.env.NODE_ENV === "production";

  const app = Fastify({
    logger: true,
    // In production the server runs behind a same-host reverse proxy, so trust
    // X-Forwarded-* only from loopback to get the real client IP for rate
    // limiting. External clients cannot spoof a loopback source address.
    trustProxy: isProduction ? "loopback" : false,
    // Bound how long a client may take to send a request (slow-POST defence).
    // Request *handlers* are bounded separately (analyzer/crawl internal
    // timeouts + the crawl wall-clock budget).
    requestTimeout: 60_000,
  });

  await app.register(rateLimit, {
    global: false,
  });

  // Baseline security headers. HSTS only in production (it must not be sent
  // over plain-HTTP dev). CSP is intentionally left to the frontend host —
  // this API only returns JSON.
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: isProduction
      ? { maxAge: 15_552_000, includeSubDomains: true }
      : false,
  });

  await app.register(cors, {
    origin: allowedOrigins(isProduction),
    credentials: true,
  });

  app.get("/api/health", async () => {
    return {
      status: "ok",
    };
  });

  const db = options.databaseUrl
    ? createDatabase(options.databaseUrl)
    : null;

  const authRepository =
    options.authRepository ??
    (db ? createDrizzleAuthRepository(db) : null);

  const analysisRepository =
    options.analysisRepository ??
    (db ? createDrizzleAnalysisRepository(db) : null);

  const billingRepository =
    options.billingRepository ??
    (db ? createDrizzleBillingRepository(db) : null);

  const projectRepository =
    options.projectRepository ??
    (db ? createDrizzleProjectRepository(db) : null);

  const crawlRepository =
    options.crawlRepository ??
    (db ? createDrizzleCrawlRepository(db) : null);

  const appUrl = options.appUrl ?? resolveAppUrl(isProduction);

  const stripeGateway =
    options.stripeGateway ??
    (options.stripe
      ? createStripeGateway(new Stripe(options.stripe.secretKey), {
          webhookSecret: options.stripe.webhookSecret,
          priceId: options.stripe.priceId,
        })
      : null);

  if (authRepository) {
    let sessionSecret =
      options.sessionSecret ?? process.env.SESSION_SECRET ?? "";

    if (!sessionSecret) {
      app.log.warn(
        "SESSION_SECRET is not set; using an insecure development secret.",
      );
      sessionSecret = DEV_SESSION_SECRET;
    }

    const mailer = resolveMailer(options, isProduction, (message) =>
      app.log.info(message),
    );

    await app.register(authPlugin, {
      repository: authRepository,
      sessionSecret,
      isProduction,
      mailer,
      appUrl,
    });

    // Plan resolution (always) + Stripe billing routes (when configured).
    if (billingRepository) {
      const billingService = stripeGateway
        ? createBillingService({
            gateway: stripeGateway,
            repository: billingRepository,
            appUrl,
          })
        : undefined;

      await app.register(billingPlugin, {
        repository: billingRepository,
        billingService,
      });
    }

    // Persistent analyses + usage limits require an authenticated user.
    if (analysisRepository) {
      await app.register(analysisPlugin, { repository: analysisRepository });

      // Projects group analyses into trackable sites (needs both repositories).
      if (projectRepository) {
        await app.register(projectPlugin, {
          projectRepository,
          analysisRepository,
        });
      }

      // Pro website tools: full crawl, competitor comparison, broken links.
      if (crawlRepository) {
        await app.register(crawlPlugin, {
          crawlRepository,
          analysisRepository,
        });
      }
    }
  }

  await app.register(analyzeRoute);

  return app;
}

/**
 * Chooses the mailer:
 *   1. an explicitly injected `mailer` (tests), else
 *   2. an SMTP mailer when `smtp` config is present, else
 *   3. the development console mailer — which is refused in production so a
 *      misconfigured deploy fails fast instead of silently not sending email
 *      (and never writes the reset URL to the structured log).
 */
function resolveMailer(
  options: BuildAppOptions,
  isProduction: boolean,
  log: (message: string) => void,
): Mailer {
  if (options.mailer) {
    return options.mailer;
  }
  if (options.smtp) {
    return createSmtpMailer(options.smtp, log);
  }
  if (isProduction) {
    throw new Error(
      "No mailer is configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and " +
        "SMTP_PASSWORD in production — the development console mailer is not " +
        "allowed to run in production.",
    );
  }
  return createConsoleMailer();
}
