/**
 * Temporary production diagnostic. Run with `npm run diag` from the Plesk
 * Node.js panel. Prints Node/platform info, which env vars are set (values
 * redacted), whether the native password hasher loads, and whether the
 * database is reachable with the current DATABASE_URL. Safe to delete once
 * the signup 500 is resolved.
 */
import "dotenv/config";

const log = (s: string) => console.log(s);

async function main(): Promise<void> {
  log(`node ${process.version} ${process.platform} ${process.arch}`);
  log(`cwd ${process.cwd()}`);

  const keys = [
    "NODE_ENV",
    "DATABASE_URL",
    "SESSION_SECRET",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_PRO",
    "APP_URL",
  ];
  for (const k of keys) {
    const v = process.env[k];
    if (!v) {
      log(`env ${k}: MISSING`);
    } else if (k === "DATABASE_URL") {
      try {
        const u = new URL(v);
        log(
          `env ${k}: host=${u.host} path=${u.pathname} params=${u.search || "(none)"}`,
        );
      } catch {
        log(`env ${k}: set but unparseable as URL`);
      }
    } else if (k === "NODE_ENV" || k === "SMTP_PORT" || k === "SMTP_SECURE") {
      log(`env ${k}: ${v}`);
    } else {
      log(`env ${k}: set (length ${v.length})`);
    }
  }

  try {
    const argon2 = await import("@node-rs/argon2");
    const h = await argon2.hash("diagnostic");
    log(`argon2: OK (${h.slice(0, 16)}...)`);
  } catch (error) {
    log("argon2: FAIL");
    console.error(error);
  }

  try {
    const postgres = (await import("postgres")).default;
    const sql = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
    const ping = await sql`select 1 as ok`;
    log(`db connect: OK ${JSON.stringify(ping)}`);
    const tables = await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public' order by table_name
    `;
    log(
      `db tables: ${tables.map((t) => t.table_name).join(", ") || "(none)"}`,
    );
    await sql.end();
  } catch (error) {
    log("db: FAIL");
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
