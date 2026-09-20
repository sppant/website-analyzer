import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Application users.
 *
 * Emails are stored already normalized to lowercase (see `normalizeEmail` in
 * the auth service), so a plain unique constraint gives case-insensitive
 * uniqueness without needing the `citext` extension.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Server-side sessions. `id` is the SHA-256 hash (hex) of the opaque session
 * token that is stored in the client's HTTP-only cookie — the raw token is
 * never persisted.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

/**
 * Single-use password reset tokens. `tokenHash` is the SHA-256 hash (hex) of
 * the random token that goes into the reset link — the raw token is never
 * persisted. A token is spent once `usedAt` is set.
 */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("password_reset_tokens_user_id_idx").on(table.userId),
  ],
);

/**
 * A website the user is tracking. Analyses can be attached to a project to
 * build a score/issue timeline. The per-plan project cap lives in
 * `billing/plan.ts`.
 */
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** The site being tracked (used to prefill "Analyze again"). */
    url: text("url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("projects_user_id_idx").on(table.userId)],
);

/**
 * A completed website analysis belonging to an authenticated user.
 *
 * `result` holds the full `AnalysisResult` as JSONB so the analysis can be
 * reproduced without normalizing every SEO field into columns. `score`, `url`
 * and `statusCode` are stored separately for efficient usage/history queries.
 * `projectId` is set when the analysis was run for a tracked project.
 */
export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    url: text("url").notNull(),
    score: integer("score").notNull(),
    statusCode: integer("status_code").notNull(),
    result: jsonb("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("analyses_user_id_idx").on(table.userId),
    index("analyses_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("analyses_project_id_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
);

/**
 * A full-website crawl (Pro). The per-page analyses, aggregate summary and
 * broken-link report live in `result` as JSON — the columns are just what we
 * need for listing and usage accounting.
 */
export const crawls = pgTable(
  "crawls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    rootUrl: text("root_url").notNull(),
    score: integer("score").notNull(),
    pagesAnalyzed: integer("pages_analyzed").notNull(),
    brokenLinkCount: integer("broken_link_count").notNull(),
    /** Units charged against the monthly allowance. */
    cost: integer("cost").notNull(),
    result: jsonb("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("crawls_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("crawls_project_id_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
);

/** A homepage-vs-competitor comparison (Pro). */
export const comparisons = pgTable(
  "comparisons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    yourUrl: text("your_url").notNull(),
    competitorUrl: text("competitor_url").notNull(),
    yourScore: integer("your_score").notNull(),
    competitorScore: integer("competitor_score").notNull(),
    cost: integer("cost").notNull(),
    result: jsonb("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("comparisons_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

/**
 * Links an application user to their Stripe customer (1:1). Kept as its own
 * table so the `users` table stays free of billing concerns.
 */
export const stripeCustomers = pgTable("stripe_customers", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * The user's current subscription, kept in sync with Stripe by the webhook.
 * One row per user (`user_id` unique) — re-subscribing replaces the row. This
 * is the authoritative source for "is this user Pro?" so the app never has to
 * call Stripe on the request path.
 */
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  plan: text("plan").notNull(),
  status: text("status").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Idempotency ledger for Stripe webhook deliveries. */
export const processedStripeEvents = pgTable("processed_stripe_events", {
  eventId: text("event_id").primaryKey(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type PasswordResetTokenRow = typeof passwordResetTokens.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type AnalysisRow = typeof analyses.$inferSelect;
export type CrawlRow = typeof crawls.$inferSelect;
export type ComparisonRow = typeof comparisons.$inferSelect;
export type StripeCustomerRow = typeof stripeCustomers.$inferSelect;
export type SubscriptionRow = typeof subscriptions.$inferSelect;
