import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { runAnalysis } = vi.hoisted(() => ({ runAnalysis: vi.fn() }));

vi.mock("../../analyzer/runAnalysis.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../analyzer/runAnalysis.js")>();
  return { ...actual, runAnalysis };
});

import { buildApp } from "../../app.js";
import { AnalysisError, type AnalysisResult } from "../../analyzer/runAnalysis.js";
import { createInMemoryAuthRepository } from "../../auth/__tests__/in-memory-auth-repository.js";
import {
  AnalysisLimitError,
  createAnalysisService,
  currentMonthStart,
  nextMonthStart,
} from "../analysis-service.js";
import { createInMemoryBillingRepository } from "../../billing/__tests__/in-memory-billing-repository.js";
import { createInMemoryAnalysisRepository } from "./in-memory-analysis-repository.js";

const SESSION_SECRET = "test-session-secret-that-is-long-enough";
const PASSWORD = "a-strong-password";

function fakeResult(
  url: string,
  overrides: Partial<AnalysisResult> = {},
): AnalysisResult {
  return {
    url: new URL(url).href,
    statusCode: 200,
    score: 77,
    issues: [],
    seo: { title: "Example", marker: "round-trip-me" } as unknown as
      AnalysisResult["seo"],
    ...overrides,
  };
}

beforeEach(() => {
  runAnalysis.mockReset();
  runAnalysis.mockImplementation(async (url: string) => fakeResult(url));
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Service-level tests
// ---------------------------------------------------------------------------

describe("analysis usage service", () => {
  const USER = "11111111-1111-1111-1111-111111111111";
  const FREE = 5;

  function makeService() {
    return createAnalysisService(createInMemoryAnalysisRepository());
  }

  const run = (
    service: ReturnType<typeof makeService>,
    url = "https://example.com",
    limit = FREE,
  ) => service.runForUser(USER, url, { limit });

  it("reports 0 of the given limit for a new user, with a reset date", async () => {
    const usage = await makeService().getUsage(USER, FREE);

    expect(usage).toEqual({
      used: 0,
      limit: 5,
      remaining: 5,
      resetsAt: nextMonthStart().toISOString(),
    });
  });

  it("increments usage after a successful analysis", async () => {
    const service = makeService();

    await run(service);

    expect((await service.getUsage(USER, FREE)).used).toBe(1);
    expect((await service.getUsage(USER, FREE)).remaining).toBe(4);
  });

  it("does not consume usage when the analysis fails", async () => {
    const service = makeService();
    runAnalysis.mockRejectedValueOnce(
      new AnalysisError("This URL cannot be analyzed."),
    );

    await expect(run(service)).rejects.toBeInstanceOf(AnalysisError);

    expect((await service.getUsage(USER, FREE)).used).toBe(0);
  });

  it("rejects the analysis over the limit without running it", async () => {
    const service = makeService();
    for (let i = 0; i < 5; i++) await run(service);
    runAnalysis.mockClear();

    await expect(run(service)).rejects.toBeInstanceOf(AnalysisLimitError);

    expect(runAnalysis).not.toHaveBeenCalled();
    expect((await service.getUsage(USER, FREE)).used).toBe(5);
  });

  it("enforces a higher limit for Pro-sized quotas", async () => {
    const service = makeService();
    for (let i = 0; i < 50; i++) await run(service, "https://example.com", 50);

    expect((await service.getUsage(USER, 50)).used).toBe(50);
    await expect(
      run(service, "https://example.com", 50),
    ).rejects.toBeInstanceOf(AnalysisLimitError);
  });

  it("resets usage at the start of a new calendar month", async () => {
    const service = makeService();

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-20T10:00:00Z"));
    for (let i = 0; i < 5; i++) await run(service);
    expect((await service.getUsage(USER, FREE)).used).toBe(5);

    vi.setSystemTime(new Date("2026-02-01T00:00:01Z"));
    const usage = await service.getUsage(USER, FREE);

    expect(usage.used).toBe(0);
    expect(usage.remaining).toBe(5);
    expect(usage.resetsAt).toBe(new Date("2026-03-01T00:00:00Z").toISOString());
  });

  it("stores the full result, score, url and status code", async () => {
    const service = makeService();
    runAnalysis.mockResolvedValueOnce(
      fakeResult("https://saved.example", { score: 42, statusCode: 201 }),
    );

    const returned = await run(service, "https://saved.example");

    const [summary] = await service.listHistory(USER);
    expect(summary).toMatchObject({
      url: "https://saved.example/",
      score: 42,
      statusCode: 201,
    });

    const stored = await service.getAnalysis(summary!.id, USER);
    expect(stored?.result).toEqual(returned);
  });

  it("uses UTC calendar-month boundaries", () => {
    const jan = new Date("2026-01-15T23:30:00Z");
    expect(currentMonthStart(jan).toISOString()).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(nextMonthStart(jan).toISOString()).toBe(
      "2026-02-01T00:00:00.000Z",
    );
  });
});

// ---------------------------------------------------------------------------
// HTTP-level tests
// ---------------------------------------------------------------------------

describe("analyze + persistence over HTTP", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let billingRepo: ReturnType<typeof createInMemoryBillingRepository>;
  let analysisRepo: ReturnType<typeof createInMemoryAnalysisRepository>;

  beforeEach(async () => {
    billingRepo = createInMemoryBillingRepository();
    analysisRepo = createInMemoryAnalysisRepository();
    app = await buildApp({
      authRepository: createInMemoryAuthRepository(),
      analysisRepository: analysisRepo,
      billingRepository: billingRepo,
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

  async function makePro(userId: string) {
    await billingRepo.upsertSubscription({
      userId,
      stripeSubscriptionId: `sub_${userId}`,
      plan: "pro",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 2_592_000_000),
      cancelAtPeriodEnd: false,
    });
  }

  async function signInPro(email: string) {
    const session = await signIn(email);
    await makePro(session.userId);
    return session;
  }

  function analyze(body: unknown, cookie?: string) {
    return app.inject({
      method: "POST",
      url: "/api/analyze",
      payload: body as never,
      ...(cookie ? { cookies: { session: cookie } } : {}),
    });
  }

  function get(url: string, cookie?: string) {
    return app.inject({
      method: "GET",
      url,
      ...(cookie ? { cookies: { session: cookie } } : {}),
    });
  }

  it("runs an anonymous analysis without persisting it", async () => {
    const response = await analyze({ url: "https://example.com" });
    expect(response.statusCode).toBe(200);
    expect(response.json().url).toBe("https://example.com/");

    const { cookie } = await signInPro("watcher@example.com");
    expect((await get("/api/analyses", cookie)).json()).toEqual({
      analyses: [],
    });
    expect((await get("/api/usage", cookie)).json().used).toBe(0);
  });

  it("persists a Free user's analysis and counts it, but hides history behind Pro", async () => {
    const { cookie } = await signIn("member@example.com");

    const response = await analyze({ url: "https://example.com" }, cookie);
    expect(response.statusCode).toBe(200);

    expect((await get("/api/usage", cookie)).json()).toMatchObject({
      plan: "free",
      used: 1,
      limit: 5,
      remaining: 4,
    });

    const history = await get("/api/analyses", cookie);
    expect(history.statusCode).toBe(403);
    expect(history.json().code).toBe("PRO_REQUIRED");
  });

  it("lets a Pro user browse saved history (payload omitted from the list)", async () => {
    const { cookie } = await signInPro("prohistory@example.com");

    await analyze({ url: "https://example.com" }, cookie);

    const history = (await get("/api/analyses", cookie)).json().analyses;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      url: "https://example.com/",
      score: 77,
      statusCode: 200,
    });
    expect(history[0].result).toBeUndefined();
  });

  it("records each re-analysis as its own history entry", async () => {
    const { cookie } = await signInPro("rerun@example.com");

    await analyze({ url: "https://example.com" }, cookie);
    await analyze({ url: "https://example.com" }, cookie);

    expect((await get("/api/usage", cookie)).json().used).toBe(2);
    expect(
      (await get("/api/analyses", cookie)).json().analyses,
    ).toHaveLength(2);
  });

  it("returns 429 with a machine-readable code once the Free limit (5) is reached", async () => {
    const { cookie, userId } = await signIn("capped@example.com");

    // Pre-fill the month's 5 analyses via the service (bypasses the per-IP
    // limit on /api/analyze, which is a separate anti-abuse control).
    const service = createAnalysisService(analysisRepo);
    for (let i = 0; i < 5; i++) {
      await service.runForUser(userId, "https://example.com", { limit: 5 });
    }

    expect((await get("/api/usage", cookie)).json()).toMatchObject({
      plan: "free",
      used: 5,
      remaining: 0,
    });

    const blocked = await analyze({ url: "https://example.com" }, cookie);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toEqual({
      error: "Monthly analysis limit reached.",
      code: "ANALYSIS_LIMIT_REACHED",
      plan: "free",
    });
  });

  it("does not consume a slot when an authenticated analysis fails", async () => {
    const { cookie } = await signIn("failer@example.com");
    runAnalysis.mockRejectedValueOnce(
      new AnalysisError("The website did not respond within the allowed time."),
    );

    const response = await analyze({ url: "https://broken.example" }, cookie);
    expect(response.statusCode).toBe(400);

    expect((await get("/api/usage", cookie)).json().used).toBe(0);
  });

  it("ignores a userId supplied in the request body", async () => {
    const { cookie: attacker } = await signIn("attacker@example.com");
    const { cookie: victim, userId: victimId } =
      await signIn("victim@example.com");

    await analyze(
      { url: "https://example.com", userId: victimId },
      attacker,
    );

    expect((await get("/api/usage", attacker)).json().used).toBe(1);
    expect((await get("/api/usage", victim)).json().used).toBe(0);
  });

  it("keeps the anonymous IP rate limit", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await analyze({ url: "https://example.com" })).statusCode);
    }

    expect(statuses.filter((s) => s === 200).length).toBe(5);
    expect(statuses.at(-1)).toBe(429);
  });

  describe("ownership (Pro history)", () => {
    it("lets a user read their own analysis in full", async () => {
      const { cookie } = await signInPro("owner@example.com");
      await analyze({ url: "https://example.com" }, cookie);
      const id = (await get("/api/analyses", cookie)).json().analyses[0].id;

      const detail = await get(`/api/analyses/${id}`, cookie);
      expect(detail.statusCode).toBe(200);
      expect(detail.json().result).toMatchObject({
        url: "https://example.com/",
        seo: { marker: "round-trip-me" },
      });
    });

    it("does not reveal another user's analysis", async () => {
      const { cookie: a } = await signInPro("a@example.com");
      const { cookie: b } = await signInPro("b@example.com");
      await analyze({ url: "https://example.com" }, a);
      const aId = (await get("/api/analyses", a)).json().analyses[0].id;

      const asB = await get(`/api/analyses/${aId}`, b);
      expect(asB.statusCode).toBe(404);
      expect(asB.json()).toEqual({ error: "Analysis not found." });
    });

    it("returns 404 for a malformed analysis id", async () => {
      const { cookie } = await signInPro("malformed@example.com");
      expect((await get("/api/analyses/not-a-uuid", cookie)).statusCode).toBe(
        404,
      );
    });

    it("rejects a Free user with 403 PRO_REQUIRED", async () => {
      const { cookie } = await signIn("freehistory@example.com");
      expect((await get("/api/analyses", cookie)).statusCode).toBe(403);
      expect(
        (await get("/api/analyses/11111111-1111-1111-1111-111111111111", cookie))
          .statusCode,
      ).toBe(403);
    });
  });

  describe("authentication required", () => {
    it("rejects unauthenticated access to usage, history and detail", async () => {
      expect((await get("/api/usage")).statusCode).toBe(401);
      expect((await get("/api/analyses")).statusCode).toBe(401);
      expect(
        (await get("/api/analyses/11111111-1111-1111-1111-111111111111"))
          .statusCode,
      ).toBe(401);
    });

    it("treats a request with no valid session as anonymous", async () => {
      const response = await analyze(
        { url: "https://example.com" },
        "garbage-cookie-value",
      );
      expect(response.statusCode).toBe(200);
    });
  });
});
