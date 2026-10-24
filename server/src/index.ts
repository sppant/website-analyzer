import "dotenv/config";

import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { initSentry } from "./observability/sentry.js";

const config = loadConfig();

initSentry(config.sentryDsn);

const app = await buildApp({
  isProduction: config.isProduction,
  databaseUrl: config.databaseUrl,
  sessionSecret: config.sessionSecret,
  appUrl: config.appUrl,
  smtp: config.smtp ?? undefined,
  stripe: config.stripe ?? undefined,
  sentryDsn: config.sentryDsn ?? undefined,
});

try {
  await app.listen({
    port: config.port,
    host: "127.0.0.1",
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
