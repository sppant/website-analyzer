/**
 * Loads and validates the environment configuration the server needs to run.
 *
 * This is intentionally a plain function with hand-written checks rather than a
 * schema library — there are only a handful of variables.
 */
export type StripeConfig = {
  secretKey: string;
  webhookSecret: string;
  priceId: string;
};

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  /** Envelope `From` address. */
  from: string;
};

export type AppConfig = {
  port: number;
  isProduction: boolean;
  databaseUrl: string;
  sessionSecret: string;
  /** Public base URL of the frontend, used to build links in emails/Checkout. */
  appUrl: string;
  /** Stripe billing config, or `null` when Stripe is not configured. */
  stripe: StripeConfig | null;
  /** SMTP config, or `null` when not configured (development only). */
  smtp: SmtpConfig | null;
};

export function loadConfig(): AppConfig {
  const isProduction = process.env.NODE_ENV === "production";

  const databaseUrl = process.env.DATABASE_URL;
  const sessionSecret = process.env.SESSION_SECRET;

  const missing: string[] = [];
  if (!databaseUrl) missing.push("DATABASE_URL");
  if (!sessionSecret) missing.push("SESSION_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `See server/.env.example.`,
    );
  }

  if (sessionSecret!.length < 16) {
    throw new Error("SESSION_SECRET must be at least 16 characters long.");
  }

  const smtp = resolveSmtpConfig();

  if (isProduction && !smtp) {
    throw new Error(
      "SMTP is required in production. Set SMTP_HOST, SMTP_PORT, SMTP_USER and " +
        "SMTP_PASSWORD. The server refuses to start with the development " +
        "console mailer in production.",
    );
  }

  return {
    port: Number(process.env.PORT) || 3000,
    isProduction,
    databaseUrl: databaseUrl!,
    sessionSecret: sessionSecret!,
    appUrl: resolveAppUrl(isProduction),
    stripe: resolveStripeConfig(),
    smtp,
  };
}

export function resolveAppUrl(isProduction: boolean): string {
  return (
    process.env.APP_URL ??
    (isProduction
      ? "https://seo.webxdevelop.com"
      : "http://localhost:5173")
  );
}

/**
 * Stripe is optional: with none of the vars set, billing is disabled and every
 * user is Free. Partial configuration is an error — it is almost always a
 * mistake and would half-enable billing.
 */
export function resolveStripeConfig(): StripeConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const priceId = process.env.STRIPE_PRICE_PRO;

  const present = [secretKey, webhookSecret, priceId].filter(Boolean).length;
  if (present === 0) return null;
  if (present < 3) {
    throw new Error(
      "Stripe is partially configured. Set STRIPE_SECRET_KEY, " +
        "STRIPE_WEBHOOK_SECRET and STRIPE_PRICE_PRO together, or none of them.",
    );
  }

  return {
    secretKey: secretKey!,
    webhookSecret: webhookSecret!,
    priceId: priceId!,
  };
}

/**
 * SMTP is optional in development (no vars → the console mailer). All four
 * required vars must be set together; a partial config is an error. `loadConfig`
 * additionally requires a full config in production.
 */
export function resolveSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  const present = [host, portRaw, user, password].filter(Boolean).length;
  if (present === 0) return null;
  if (present < 4) {
    throw new Error(
      "SMTP is partially configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and " +
        "SMTP_PASSWORD together, or none of them.",
    );
  }

  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port number.");
  }

  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;

  return {
    host: host!,
    port,
    secure,
    user: user!,
    password: password!,
    from: process.env.SMTP_FROM?.trim() || user!,
  };
}
