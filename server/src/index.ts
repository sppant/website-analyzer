import "dotenv/config";

import { buildApp } from "./app.js";

const app = await buildApp();

try {
  await app.listen({
    port: Number(process.env.PORT) || 3000,
    host: "127.0.0.1",
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
