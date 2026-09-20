import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "./schema.js";

// The managed host blocks outbound TCP 5432, so we reach Neon over its
// WebSocket endpoint on 443 instead of a raw Postgres socket. Node 20 has no
// global WebSocket, so give the driver the `ws` implementation.
neonConfig.webSocketConstructor = ws;

export type Database = ReturnType<typeof createDatabase>;

/**
 * Creates the Drizzle database client. The Neon serverless `Pool` connects
 * lazily on the first query and tunnels the Postgres protocol over a WebSocket
 * (443), which also keeps interactive `db.transaction()` working.
 */
export function createDatabase(connectionString: string) {
  const pool = new Pool({ connectionString, max: 10 });
  return drizzle(pool, { schema });
}
