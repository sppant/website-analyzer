import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { runAnalysis } = vi.hoisted(() => ({ runAnalysis: vi.fn() }));

vi.mock("../../analyzer/runAnalysis.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../analyzer/runAnalysis.js")>();
  return { ...actual, runAnalysis };
});

import { buildApp } from "../../app.js";
import type { AnalysisResult } from "../../analyzer/runAnalysis.js";
import type { SeoIssue } from "../../analyzer/seoRules.js";
import { createInMemoryAuthRepository } from "../../auth/__tests__/in-memory-auth-repository.js";
import { createInMemoryAnalysisRepository } from "../../analyses/__tests__/in-memory-analysis-repository.js";
import { createInMemoryBillingRepository } from "../../billing/__tests__/in-memory-billing-repository.js";
import { createInMemoryProjectRepository } from "./in-memory-project-repository.js";

const SESSION_SECRET = "test-session-secret-that-is-long-enough";
const PASSWORD = "a-strong-password";

function issue(type: string): SeoIssue {
  return {
    type,
    severity: "important",
    title: type,
    description: "d",
    recommendation: "fix it",
    points: 5,
  };
}

function fakeResult(
  url: string,
  { score = 70, issues = [] as SeoIssue[] } = {},
): AnalysisResult {
  return {
    url: new URL(url).href,
    statusCode: 200,
    score,
    issues,
    seo: {
      title: "t",
      imagesMissingAlt: 0,
      h1Count: 1,
      internalLinks: { internalLinks: 10 },
    } as unknown as AnalysisResult["seo"],
  };
}

beforeEach(() => {
  runAnalysis.mockReset();
  runAnalysis.mockImplementation(async (url: string) => fakeResult(url));
});

describe("projects over HTTP", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let billingRepo: ReturnType<typeof createInMemoryBillingRepository>;

  beforeEach(async () => {
    billingRepo = createInMemoryBillingRepository();
    app = await buildApp({
      authRepository: createInMemoryAuthRepository(),
      analysisRepository: createInMemoryAnalysisRepository(),
      billingRepository: billingRepo,
      projectRepository: createInMemoryProjectRepository(),
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

  async function signInPro(email: string) {
    const session = await signIn(email);
    await billingRepo.upsertSubscription({
      userId: session.userId,
      stripeSubscriptionId: `sub_${session.userId}`,
      plan: "pro",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 2_592_000_000),
      cancelAtPeriodEnd: false,
    });
    return session;
  }

  const req = (
    method: "GET" | "POST" | "PATCH" | "DELETE",
    url: string,
    cookie?: string,
    payload?: unknown,
  ) =>
    app.inject({
      method,
      url,
      ...(payload === undefined ? {} : { payload: payload as never }),
      ...(cookie ? { cookies: { session: cookie } } : {}),
    });

  const createProject = (cookie: string, name: string, url: string) =>
    req("POST", "/api/projects", cookie, { name, url });

  // --- auth -------------------------------------------------------------

  it("requires authentication", async () => {
    expect((await req("GET", "/api/projects")).statusCode).toBe(401);
    expect((await req("POST", "/api/projects")).statusCode).toBe(401);
  });

  // --- creation + limits ----------------------------------------------

  it("lets a Free user create exactly 1 project", async () => {
    const { cookie } = await signIn("free@example.com");

    const first = await createProject(cookie, "Acme", "https://acme.test");
    expect(first.statusCode).toBe(201);
    expect(first.json().project).toMatchObject({
      name: "Acme",
      url: "https://acme.test/",
    });

    const second = await createProject(cookie, "Beta", "https://beta.test");
    expect(second.statusCode).toBe(403);
    expect(second.json().code).toBe("PROJECT_LIMIT_REACHED");

    const list = (await req("GET", "/api/projects", cookie)).json();
    expect(list.projects).toHaveLength(1);
    expect(list.limit).toBe(1);
  });

  it("cannot exceed the project limit under concurrent requests", async () => {
    const { cookie } = await signIn("race@example.com");

    // Fire 12 project creates simultaneously for a Free user (limit 1).
    const responses = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        createProject(cookie, `P${i}`, `https://p${i}.test`),
      ),
    );

    const created = responses.filter((r) => r.statusCode === 201);
    const rejected = responses.filter((r) => r.statusCode === 403);

    expect(created).toHaveLength(1);
    expect(rejected).toHaveLength(11);
    rejected.forEach((r) =>
      expect(r.json().code).toBe("PROJECT_LIMIT_REACHED"),
    );

    // The database really only holds one project.
    expect(
      (await req("GET", "/api/projects", cookie)).json().projects,
    ).toHaveLength(1);
  });

  it("cannot exceed the Pro project limit under concurrent requests", async () => {
    const { cookie } = await signInPro("racepro@example.com");

    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        createProject(cookie, `P${i}`, `https://p${i}.test`),
      ),
    );

    expect(responses.filter((r) => r.statusCode === 201)).toHaveLength(10);
    expect(
      (await req("GET", "/api/projects", cookie)).json().projects,
    ).toHaveLength(10);
  });

  it("lets a Pro user create up to 10 projects", async () => {
    const { cookie } = await signInPro("pro@example.com");

    for (let i = 0; i < 10; i++) {
      expect(
        (await createProject(cookie, `P${i}`, `https://p${i}.test`)).statusCode,
      ).toBe(201);
    }

    const eleventh = await createProject(cookie, "P10", "https://p10.test");
    expect(eleventh.statusCode).toBe(403);
    expect(eleventh.json().code).toBe("PROJECT_LIMIT_REACHED");

    expect((await req("GET", "/api/projects", cookie)).json().limit).toBe(10);
  });

  it("rejects an invalid name or url", async () => {
    const { cookie } = await signIn("invalid@example.com");
    expect((await createProject(cookie, "", "https://x.test")).statusCode).toBe(
      400,
    );
    expect((await createProject(cookie, "X", "not a url")).statusCode).toBe(400);
  });

  // --- ownership -----------------------------------------------------

  it("does not expose another user's project", async () => {
    const a = await signIn("a@example.com");
    const b = await signIn("b@example.com");
    const id = (await createProject(a.cookie, "A", "https://a.test")).json()
      .project.id;

    expect((await req("GET", `/api/projects/${id}`, b.cookie)).statusCode).toBe(
      404,
    );
    expect(
      (await req("PATCH", `/api/projects/${id}`, b.cookie, { name: "hax" }))
        .statusCode,
    ).toBe(404);
    expect(
      (await req("DELETE", `/api/projects/${id}`, b.cookie)).statusCode,
    ).toBe(404);
  });

  it("renames and deletes a project", async () => {
    const { cookie } = await signIn("crud@example.com");
    const id = (await createProject(cookie, "Old", "https://old.test")).json()
      .project.id;

    const renamed = await req("PATCH", `/api/projects/${id}`, cookie, {
      name: "New",
    });
    expect(renamed.json().project.name).toBe("New");

    expect((await req("DELETE", `/api/projects/${id}`, cookie)).statusCode).toBe(
      204,
    );
    expect((await req("GET", `/api/projects/${id}`, cookie)).statusCode).toBe(
      404,
    );
  });

  // --- analysis association + timeline ------------------------------

  it("associates an analysis with a project and builds a timeline", async () => {
    const { cookie } = await signInPro("timeline@example.com");
    const projectId = (
      await createProject(cookie, "Site", "https://site.test")
    ).json().project.id;

    runAnalysis.mockResolvedValueOnce(fakeResult("https://site.test", { score: 68 }));
    await req("POST", "/api/analyze", cookie, {
      url: "https://site.test",
      projectId,
    });

    runAnalysis.mockResolvedValueOnce(fakeResult("https://site.test", { score: 82 }));
    await req("POST", "/api/analyze", cookie, {
      url: "https://site.test",
      projectId,
    });

    const project = (
      await req("GET", `/api/projects/${projectId}`, cookie)
    ).json().project;
    expect(project.stats).toMatchObject({
      analysisCount: 2,
      firstScore: 68,
      latestScore: 82,
      scoreChange: 14,
    });

    const history = (
      await req("GET", `/api/projects/${projectId}/analyses`, cookie)
    ).json().analyses;
    expect(history.map((a: { score: number }) => a.score)).toEqual([82, 68]);
  });

  it("rejects an analyze request for someone else's project", async () => {
    const a = await signIn("owner2@example.com");
    const b = await signIn("intruder@example.com");
    const projectId = (
      await createProject(a.cookie, "A", "https://a.test")
    ).json().project.id;

    const response = await req("POST", "/api/analyze", b.cookie, {
      url: "https://a.test",
      projectId,
    });
    expect(response.statusCode).toBe(404);
  });

  // --- Pro gating -------------------------------------------------

  it("gates project history, comparison and export behind Pro", async () => {
    const { cookie } = await signIn("freegate@example.com");
    const projectId = (
      await createProject(cookie, "S", "https://s.test")
    ).json().project.id;

    for (const url of [
      `/api/projects/${projectId}/analyses`,
      `/api/projects/${projectId}/compare?before=x&after=y`,
      `/api/projects/${projectId}/export.csv`,
    ]) {
      const response = await req("GET", url, cookie);
      expect(response.statusCode).toBe(403);
      expect(response.json().code).toBe("PRO_REQUIRED");
    }
  });

  it("compares two analyses of a project for a Pro user", async () => {
    const { cookie } = await signInPro("compare@example.com");
    const projectId = (
      await createProject(cookie, "S", "https://s.test")
    ).json().project.id;

    runAnalysis.mockResolvedValueOnce(
      fakeResult("https://s.test", {
        score: 60,
        issues: [issue("missing-title"), issue("missing-h1")],
      }),
    );
    await req("POST", "/api/analyze", cookie, {
      url: "https://s.test",
      projectId,
    });

    runAnalysis.mockResolvedValueOnce(
      fakeResult("https://s.test", {
        score: 78,
        issues: [issue("missing-h1"), issue("images-missing-alt")],
      }),
    );
    await req("POST", "/api/analyze", cookie, {
      url: "https://s.test",
      projectId,
    });

    const history = (
      await req("GET", `/api/projects/${projectId}/analyses`, cookie)
    ).json().analyses;
    const [newer, older] = history;

    const cmp = (
      await req(
        "GET",
        `/api/projects/${projectId}/compare?before=${older.id}&after=${newer.id}`,
        cookie,
      )
    ).json().comparison;

    expect(cmp.scoreChange).toBe(18);
    expect(cmp.issues.fixed.map((i: { type: string }) => i.type)).toEqual([
      "missing-title",
    ]);
    expect(cmp.issues.remaining.map((i: { type: string }) => i.type)).toEqual([
      "missing-h1",
    ]);
    expect(cmp.issues.introduced.map((i: { type: string }) => i.type)).toEqual([
      "images-missing-alt",
    ]);
  });

  it("exports project analyses as CSV for a Pro user", async () => {
    const { cookie } = await signInPro("csv@example.com");
    const projectId = (
      await createProject(cookie, "S", "https://s.test")
    ).json().project.id;

    runAnalysis.mockResolvedValueOnce(
      fakeResult("https://s.test", {
        score: 55,
        issues: [issue("missing-title")],
      }),
    );
    await req("POST", "/api/analyze", cookie, {
      url: "https://s.test",
      projectId,
    });

    const response = await req(
      "GET",
      `/api/projects/${projectId}/export.csv`,
      cookie,
    );
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    const lines = response.body.trim().split("\r\n");
    expect(lines[0]).toBe(
      "url,analyzed_at,score,issue_type,severity,recommendation,points",
    );
    expect(lines[1]).toContain("missing-title");
    expect(lines[1]).toContain("55");
  });

  it("does not let a Free user reach Pro history by sending plan in the body", async () => {
    const { cookie } = await signIn("spoof@example.com");
    const projectId = (
      await createProject(cookie, "S", "https://s.test")
    ).json().project.id;

    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/analyses`,
      cookies: { session: cookie },
      // there is no body on a GET, but also try query spoofing
      query: { plan: "pro" },
    });
    expect(response.statusCode).toBe(403);
  });
});
