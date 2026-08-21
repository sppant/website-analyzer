import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";

import { analyzeRoute } from "./routes/analyze.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(rateLimit, {
    global: false,
  });

  await app.register(cors, {
    origin: ["http://localhost:5173", "https://seo.webxdevelop.com"],
  });

  app.get("/api/health", async () => {
    return {
      status: "ok",
    };
  });

  await app.register(analyzeRoute);

  return app;
}
