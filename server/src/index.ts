import "dotenv/config";

import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();

const app = await buildApp({
  isProduction: config.isProduction,
  databaseUrl: config.databaseUrl,
  sessionSecret: config.sessionSecret,
  appUrl: config.appUrl,
  smtp: config.smtp ?? undefined,
  stripe: config.stripe ?? undefined,
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
