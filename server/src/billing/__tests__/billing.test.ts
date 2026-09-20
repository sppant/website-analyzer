import { randomUUID } from "node:crypto";

import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { runAnalysis } = vi.hoisted(() => ({ runAnalysis: vi.fn() }));

vi.mock("../../analyzer/runAnalysis.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../analyzer/runAnalysis.js")>();
  return { ...actual, runAnalysis };
});

import { buildApp } from "../../app.js";
import type { AnalysisResult } from "../../analyzer/runAnalysis.js";
import { createInMemoryAnalysisRepository } from "../../analyses/__tests__/in-memory-analysis-repository.js";
import { createAnalysisService } from "../../analyses/analysis-service.js";
import { createInMemoryAuthRepository } from "../../auth/__tests__/in-memory-auth-repository.js";
import { createStripeGateway } from "../stripe-gateway.js";
import { PRO_STATUSES, resolvePlan } from "../plan.js";
import { createInMemoryBillingRepository } from "./in-memory-billing-repository.js";
import { createFakeStripeGateway } from "./fake-stripe-gateway.js";

const SESSION_SECRET = "test-session-secret-that-is-long-enough";
const PASSWORD = "a-strong-password";
const PRICE_ID = "price_pro_test";
const WEBHOOK_SECRET = "whsec_test_secret";

function fakeResult(url: string): AnalysisResult {
  return {
    url: new URL(url).href,
    statusCode: 200,
    score: 70,
    issues: [],
    seo: { title: "x" } as unknown as AnalysisResult["seo"],
  };
}

beforeEach(() => {
  runAnalysis.mockReset();
  runAnalysis.mockImplementation(async (url: string) => fakeResult(url));
});

// ---------------------------------------------------------------------------
// Plan resolution (pure)
// ---------------------------------------------------------------------------

describe("resolvePlan", () => {
  const proRow = (status: string) => ({ plan: "pro", status });

  it("is Free with no subscription", () => {
    expect(resolvePlan(null)).toBe("free");
  });

  it("is Pro for active and trialing", () => {
    expect(resolvePlan(proRow("active"))).toBe("pro");
    expect(resolvePlan(proRow("trialing"))).toBe("pro");
  });

  it("keeps Pro during past_due (payment retry grace)", () => {
    expect(resolvePlan(proRow("past_due"))).toBe("pro");
  });

  it("is Free for canceled / incomplete / unpaid / expired", () => {
    for (const status of [
      "canceled",
      "incomplete",
      "incomplete_expired",
      "unpaid",
    ]) {
      expect(resolvePlan(proRow(status))).toBe("free");
    }
  });

  it("is Free when the stored plan is not pro", () => {
    expect(resolvePlan({ plan: "free", status: "active" })).toBe("free");
  });

  it("only treats a fixed set of statuses as Pro", () => {
    expect([...PRO_STATUSES].sort()).toEqual([
      "active",
      "past_due",
      "trialing",
    ]);
  });
});

// ---------------------------------------------------------------------------
// HTTP: checkout / portal / webhook
// ---------------------------------------------------------------------------

describe("billing over HTTP", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let billingRepo: ReturnType<typeof createInMemoryBillingRepository>;
  let analysisRepo: ReturnType<typeof createInMemoryAnalysisRepository>;
  let fake: ReturnType<typeof createFakeStripeGateway>;

  beforeEach(async () => {
    billingRepo = createInMemoryBillingRepository();
    analysisRepo = createInMemoryAnalysisRepository();
    fake = createFakeStripeGateway();

    app = await buildApp({
      authRepository: createInMemoryAuthRepository(),
      analysisRepository: analysisRepo,
      billingRepository: billingRepo,
      stripeGateway: fake.gateway,
      sessionSecret: SESSION_SECRET,
      isProduction: false,
      appUrl: "http://localhost:5173",
      mailer: { async sendPasswordResetEmail() {} },
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  async function signIn(email: string) {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/signup",
      payload: { email, password: PASSWORD },
    });
    return {
      cookie: response.cookies.find((c) => c.name === "session")!.value,
      userId: response.json().user.id as string,
    };
  }

  const post = (url: string, cookie?: string, payload?: unknown) =>
    app.inject({
      method: "POST",
      url,
      ...(payload === undefined ? {} : { payload: payload as never }),
      ...(cookie ? { cookies: { session: cookie } } : {}),
    });

  const get = (url: string, cookie: string) =>
    app.inject({ method: "GET", url, cookies: { session: cookie } });

  function activeSubEvent(
    type: string,
    opts: {
      userId: string;
      customerId: string;
      subId?: string;
      status?: string;
    },
  ) {
    return {
      id: `evt_${randomUUID()}`,
      type,
      data: {
        object: {
          id: opts.subId ?? "sub_test_1",
          customer: opts.customerId,
          status: opts.status ?? "active",
          cancel_at_period_end: false,
          current_period_end: Math.floor(Date.now() / 1000) + 2_592_000,
          metadata: { user_id: opts.userId },
        },
      },
    };
  }

  const sendWebhook = (event: unknown, signature = "valid") =>
    app.inject({
      method: "POST",
      url: "/api/billing/webhook",
      headers: { "content-type": "application/json", "stripe-signature": signature },
      payload: JSON.stringify(event),
    });

  // --- checkout -----------------------------------------------------------

  it("rejects an unauthenticated checkout", async () => {
    expect((await post("/api/billing/checkout")).statusCode).toBe(401);
  });

  it("creates a Checkout session for an authenticated Free user", async () => {
    const { cookie, userId } = await signIn("buyer@example.com");

    // A malicious client tries to dictate price / plan / amount.
    const response = await post("/api/billing/checkout", cookie, {
      priceId: "price_attacker_chosen",
      plan: "pro",
      amount: 1,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().url).toMatch(/^https:\/\/checkout\.stripe\.test\//);

    expect(fake.calls.createCustomer).toHaveBeenCalledWith({
      email: "buyer@example.com",
      userId,
    });
    // The server passes only its own fields to Stripe — nothing from the body.
    const checkoutArg = fake.calls.createCheckoutSession.mock.calls[0][0];
    expect(checkoutArg).toMatchObject({ userId });
    expect(checkoutArg).not.toHaveProperty("priceId");
    expect(checkoutArg).not.toHaveProperty("plan");
    expect(checkoutArg).not.toHaveProperty("amount");

    expect(await billingRepo.getStripeCustomerId(userId)).toMatch(/^cus_fake_/);
  });

  it("reuses an existing Stripe customer on a second checkout", async () => {
    const { cookie } = await signIn("repeat@example.com");

    await post("/api/billing/checkout", cookie);
    await post("/api/billing/checkout", cookie);

    expect(fake.calls.createCustomer).toHaveBeenCalledTimes(1);
    expect(fake.calls.createCheckoutSession).toHaveBeenCalledTimes(2);
  });

  it("does not let an existing Pro user start another subscription", async () => {
    const { cookie, userId } = await signIn("alreadypro@example.com");
    await billingRepo.linkStripeCustomer(userId, "cus_existing");
    await billingRepo.upsertSubscription({
      userId,
      stripeSubscriptionId: "sub_existing",
      plan: "pro",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 1000),
      cancelAtPeriodEnd: false,
    });

    const response = await post("/api/billing/checkout", cookie);
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("ALREADY_PRO");
    expect(fake.calls.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("returns a safe error when Stripe checkout creation fails", async () => {
    const { cookie } = await signIn("stripefail@example.com");
    fake.calls.createCheckoutSession.mockRejectedValueOnce(
      new Error("stripe: rate limited"),
    );

    const response = await post("/api/billing/checkout", cookie);
    expect(response.statusCode).toBe(502);
    expect(response.json().error).not.toMatch(/stripe/i);
  });

  // --- portal -----------------------------------------------------------

  it("rejects an unauthenticated portal request", async () => {
    expect((await post("/api/billing/portal")).statusCode).toBe(401);
  });

  it("creates a portal session for a user with a Stripe customer", async () => {
    const { cookie, userId } = await signIn("portal@example.com");
    await billingRepo.linkStripeCustomer(userId, "cus_portal");

    const response = await post("/api/billing/portal", cookie);
    expect(response.statusCode).toBe(200);
    expect(response.json().url).toMatch(/billing\.stripe\.test/);
  });

  it("handles a missing Stripe customer safely", async () => {
    const { cookie } = await signIn("nocustomer@example.com");

    const response = await post("/api/billing/portal", cookie);
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("NO_BILLING_ACCOUNT");
  });

  // --- webhook --------------------------------------------------------

  it("rejects a webhook with an invalid signature", async () => {
    const response = await sendWebhook(
      { id: "evt_x", type: "customer.subscription.updated", data: { object: {} } },
      "not-valid",
    );
    expect(response.statusCode).toBe(400);
  });

  it("rejects a webhook with no signature header", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/billing/webhook",
      headers: { "content-type": "application/json" },
      payload: "{}",
    });
    expect(response.statusCode).toBe(400);
  });

  it("makes a user Pro on checkout.session.completed and bumps their limit", async () => {
    const { cookie, userId } = await signIn("upgrader@example.com");
    fake.setSubscription({
      id: "sub_up_1",
      customerId: "cus_up_1",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 2_592_000_000),
      cancelAtPeriodEnd: false,
      userId,
    });

    const response = await sendWebhook({
      id: `evt_${randomUUID()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          customer: "cus_up_1",
          subscription: "sub_up_1",
          metadata: { user_id: userId },
        },
      },
    });
    expect(response.statusCode).toBe(200);

    expect((await get("/api/auth/me", cookie)).json().plan).toBe("pro");
    const usage = (await get("/api/usage", cookie)).json();
    expect(usage).toMatchObject({ plan: "pro", limit: 50 });
  });

  it("syncs subscription created / updated / deleted events", async () => {
    const { cookie, userId } = await signIn("lifecycle@example.com");
    await billingRepo.linkStripeCustomer(userId, "cus_lc");

    await sendWebhook(
      activeSubEvent("customer.subscription.created", {
        userId,
        customerId: "cus_lc",
        subId: "sub_lc",
      }),
    );
    expect((await get("/api/auth/me", cookie)).json().plan).toBe("pro");

    await sendWebhook(
      activeSubEvent("customer.subscription.updated", {
        userId,
        customerId: "cus_lc",
        subId: "sub_lc",
        status: "past_due",
      }),
    );
    expect((await get("/api/auth/me", cookie)).json().plan).toBe("pro");

    await sendWebhook(
      activeSubEvent("customer.subscription.deleted", {
        userId,
        customerId: "cus_lc",
        subId: "sub_lc",
        status: "canceled",
      }),
    );
    expect((await get("/api/auth/me", cookie)).json().plan).toBe("free");
  });

  it("exposes cancel-at-period-end and status on /api/auth/me without dropping Pro", async () => {
    const { cookie, userId } = await signIn("cancelling@example.com");
    await billingRepo.linkStripeCustomer(userId, "cus_cxl");

    const periodEnd = Math.floor(Date.now() / 1000) + 2_592_000;
    await sendWebhook({
      id: `evt_${randomUUID()}`,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_cxl",
          customer: "cus_cxl",
          status: "active",
          cancel_at_period_end: true,
          current_period_end: periodEnd,
          metadata: { user_id: userId },
        },
      },
    });

    const me = (await get("/api/auth/me", cookie)).json();
    expect(me.plan).toBe("pro");
    expect(me.subscription).toMatchObject({
      status: "active",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
    });
    // No Stripe identifiers leak to the client.
    expect(JSON.stringify(me)).not.toMatch(/sub_cxl|cus_cxl/);
  });

  it("ignores a late event for a superseded subscription (keeps Pro)", async () => {
    const { cookie, userId } = await signIn("superseded@example.com");
    await billingRepo.linkStripeCustomer(userId, "cus_sup");

    // Current, entitled subscription.
    await sendWebhook(
      activeSubEvent("customer.subscription.created", {
        userId,
        customerId: "cus_sup",
        subId: "sub_new",
      }),
    );
    expect((await get("/api/auth/me", cookie)).json().plan).toBe("pro");

    // A late "canceled" update arrives for an OLD subscription id.
    await sendWebhook(
      activeSubEvent("customer.subscription.updated", {
        userId,
        customerId: "cus_sup",
        subId: "sub_old",
        status: "canceled",
      }),
    );

    const me = (await get("/api/auth/me", cookie)).json();
    expect(me.plan).toBe("pro");
    expect(me.subscription.status).toBe("active");
  });

  it("ignores a duplicate event and an unknown event type", async () => {
    const { cookie, userId } = await signIn("idempotent@example.com");
    await billingRepo.linkStripeCustomer(userId, "cus_idem");

    const event = activeSubEvent("customer.subscription.created", {
      userId,
      customerId: "cus_idem",
      subId: "sub_idem",
    });

    expect((await sendWebhook(event)).statusCode).toBe(200);
    expect((await get("/api/auth/me", cookie)).json().plan).toBe("pro");

    // Re-deliver the same event; then cancel via a *new* event; then re-deliver
    // the original again. The original must not re-activate the subscription.
    await sendWebhook(
      activeSubEvent("customer.subscription.updated", {
        userId,
        customerId: "cus_idem",
        subId: "sub_idem",
        status: "canceled",
      }),
    );
    expect((await get("/api/auth/me", cookie)).json().plan).toBe("free");

    const replay = await sendWebhook(event);
    expect(replay.statusCode).toBe(200);
    expect((await get("/api/auth/me", cookie)).json().plan).toBe("free");

    const unknown = await sendWebhook({
      id: `evt_${randomUUID()}`,
      type: "payout.created",
      data: { object: {} },
    });
    expect(unknown.statusCode).toBe(200);
  });

  it("returns 500 when webhook processing throws", async () => {
    const { userId } = await signIn("processfail@example.com");
    await billingRepo.linkStripeCustomer(userId, "cus_pf");
    fake.calls.retrieveSubscription.mockRejectedValueOnce(
      new Error("stripe API is down"),
    );

    const response = await sendWebhook({
      id: `evt_${randomUUID()}`,
      type: "invoice.paid",
      data: { object: { id: "in_1", subscription: "sub_pf" } },
    });
    expect(response.statusCode).toBe(500);
  });

  // --- Pro usage limit ----------------------------------------------------

  it("enforces the 50/month Pro limit at the HTTP layer", async () => {
    const { cookie, userId } = await signIn("proheavy@example.com");
    await billingRepo.linkStripeCustomer(userId, "cus_ph");
    await billingRepo.upsertSubscription({
      userId,
      stripeSubscriptionId: "sub_ph",
      plan: "pro",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 1_000_000),
      cancelAtPeriodEnd: false,
    });

    // Pre-fill 50 stored analyses this month (bypasses the /api/analyze IP limit).
    const service = createAnalysisService(analysisRepo);
    for (let i = 0; i < 50; i++) {
      await service.runForUser(userId, "https://example.com", { limit: 50 });
    }

    expect((await get("/api/usage", cookie)).json()).toMatchObject({
      plan: "pro",
      used: 50,
      limit: 50,
      remaining: 0,
    });

    const blocked = await post(
      "/api/analyze",
      cookie,
      { url: "https://example.com" },
    );
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toMatchObject({
      code: "ANALYSIS_LIMIT_REACHED",
      plan: "pro",
    });
  });
});

// ---------------------------------------------------------------------------
// Real Stripe SDK signature verification
// ---------------------------------------------------------------------------

describe("Stripe webhook signature verification (real SDK)", () => {
  const stripe = new Stripe("sk_test_" + "x".repeat(24));
  const gateway = createStripeGateway(stripe, {
    webhookSecret: WEBHOOK_SECRET,
    priceId: PRICE_ID,
  });

  it("accepts a correctly signed payload", () => {
    const payload = JSON.stringify({
      id: "evt_real_1",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_1" } },
    });
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
    });

    const event = gateway.constructWebhookEvent(payload, header);
    expect(event.id).toBe("evt_real_1");
    expect(event.type).toBe("customer.subscription.updated");
  });

  it("rejects a tampered payload / wrong secret", () => {
    const payload = JSON.stringify({ id: "evt_real_2", type: "x", data: { object: {} } });
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_wrong",
    });

    expect(() => gateway.constructWebhookEvent(payload, header)).toThrow();
    expect(() =>
      gateway.constructWebhookEvent(payload + "tampered", header),
    ).toThrow();
  });

  it("creates a subscription-mode Checkout session with the configured price", async () => {
    const create = vi
      .spyOn(stripe.checkout.sessions, "create")
      .mockResolvedValue({ url: "https://checkout.stripe.test/s/1" } as never);

    await gateway.createCheckoutSession({
      customerId: "cus_1",
      userId: "user-1",
      successUrl: "https://app.test/ok",
      cancelUrl: "https://app.test/no",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_1",
        line_items: [{ price: PRICE_ID, quantity: 1 }],
        success_url: "https://app.test/ok",
        cancel_url: "https://app.test/no",
      }),
    );

    create.mockRestore();
  });
});
