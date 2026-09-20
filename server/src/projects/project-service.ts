import { projectLimitForPlan, type Plan } from "../billing/plan.js";
import type {
  AnalysisRepository,
  AnalysisSummary,
} from "../analyses/analysis-repository.js";
import { compareAnalyses, type AnalysisComparison } from "./comparison.js";
import type { Project, ProjectRepository } from "./project-repository.js";

const PROJECT_HISTORY_LIMIT = 500;

/** An expected, client-facing project error. Mapped to a status by the route. */
export class ProjectError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = "ProjectError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export type ProjectStats = {
  analysisCount: number;
  latestScore: number | null;
  firstScore: number | null;
  /** latestScore − firstScore, when at least two analyses exist. */
  scoreChange: number | null;
  lastAnalyzedAt: string | null;
  /** Issues in the most recent analysis. */
  currentIssueCount: number | null;
};

export type ProjectSummary = Project & { stats: ProjectStats };

export type ProjectService = ReturnType<typeof createProjectService>;

const EMPTY_STATS: ProjectStats = {
  analysisCount: 0,
  latestScore: null,
  firstScore: null,
  scoreChange: null,
  lastAnalyzedAt: null,
  currentIssueCount: null,
};

export function createProjectService(deps: {
  projects: ProjectRepository;
  analyses: AnalysisRepository;
}) {
  const { projects, analyses } = deps;

  async function statsFor(projectId: string): Promise<ProjectStats> {
    const history = await analyses.listForProject(
      projectId,
      PROJECT_HISTORY_LIMIT,
    );
    if (history.length === 0) return EMPTY_STATS;

    const latest = history[0]!;
    const first = history[history.length - 1]!;
    const latestFull = await analyses.latestForProject(projectId);

    return {
      analysisCount: history.length,
      latestScore: latest.score,
      firstScore: first.score,
      scoreChange:
        history.length > 1 ? latest.score - first.score : null,
      lastAnalyzedAt: latest.createdAt.toISOString(),
      currentIssueCount: latestFull?.result.issues.length ?? null,
    };
  }

  async function withStats(project: Project): Promise<ProjectSummary> {
    return { ...project, stats: await statsFor(project.id) };
  }

  return {
    async list(userId: string): Promise<ProjectSummary[]> {
      const owned = await projects.listForUser(userId);
      return Promise.all(owned.map(withStats));
    },

    async get(userId: string, id: string): Promise<ProjectSummary | null> {
      const project = await projects.getForUser(id, userId);
      return project ? withStats(project) : null;
    },

    async create(
      userId: string,
      plan: Plan,
      input: { name: string; url: string },
    ): Promise<ProjectSummary> {
      const name = input.name?.trim();
      const url = normalizeUrl(input.url);

      if (!name) {
        throw new ProjectError("A project name is required.", 400, "INVALID");
      }
      if (!url) {
        throw new ProjectError(
          "A valid http(s) URL is required.",
          400,
          "INVALID",
        );
      }

      const limit = projectLimitForPlan(plan);
      const project = await projects.createWithinLimit(
        { userId, name, url },
        limit,
      );

      if (!project) {
        throw new ProjectError(
          plan === "pro"
            ? `You've reached the ${limit}-project limit.`
            : "The Free plan includes 1 project. Upgrade to Pro for up to 10.",
          403,
          "PROJECT_LIMIT_REACHED",
        );
      }

      return withStats(project);
    },

    async rename(
      userId: string,
      id: string,
      patch: { name?: string; url?: string },
    ): Promise<ProjectSummary | null> {
      const clean: { name?: string; url?: string } = {};
      if (patch.name !== undefined) {
        const name = patch.name.trim();
        if (!name) {
          throw new ProjectError("A project name is required.", 400, "INVALID");
        }
        clean.name = name;
      }
      if (patch.url !== undefined) {
        const url = normalizeUrl(patch.url);
        if (!url) {
          throw new ProjectError(
            "A valid http(s) URL is required.",
            400,
            "INVALID",
          );
        }
        clean.url = url;
      }

      const updated = await projects.update(id, userId, clean);
      return updated ? withStats(updated) : null;
    },

    async remove(userId: string, id: string): Promise<boolean> {
      return projects.delete(id, userId);
    },

    /** Pro-gated by the route. Returns `null` when the project isn't the user's. */
    async listAnalyses(
      userId: string,
      id: string,
    ): Promise<AnalysisSummary[] | null> {
      const project = await projects.getForUser(id, userId);
      if (!project) return null;
      return analyses.listForProject(id, PROJECT_HISTORY_LIMIT);
    },

    /** Pro-gated by the route. */
    async compare(
      userId: string,
      projectId: string,
      beforeId: string,
      afterId: string,
    ): Promise<AnalysisComparison> {
      const project = await projects.getForUser(projectId, userId);
      if (!project) {
        throw new ProjectError("Project not found.", 404, "NOT_FOUND");
      }

      const [before, after] = await Promise.all([
        analyses.getForUser(beforeId, userId),
        analyses.getForUser(afterId, userId),
      ]);

      if (
        !before ||
        !after ||
        before.projectId !== projectId ||
        after.projectId !== projectId
      ) {
        throw new ProjectError(
          "Both analyses must belong to this project.",
          400,
          "INVALID",
        );
      }

      return compareAnalyses(before.result, after.result);
    },

    /** Pro-gated by the route. CSV of every issue in every analysis of the project. */
    async exportCsv(userId: string, id: string): Promise<string | null> {
      const project = await projects.getForUser(id, userId);
      if (!project) return null;

      const history = await analyses.listForProject(
        id,
        PROJECT_HISTORY_LIMIT,
      );

      const rows: string[][] = [
        [
          "url",
          "analyzed_at",
          "score",
          "issue_type",
          "severity",
          "recommendation",
          "points",
        ],
      ];

      for (const summary of history) {
        const full = await analyses.getForUser(summary.id, userId);
        if (!full) continue;
        const analyzedAt = summary.createdAt.toISOString();
        if (full.result.issues.length === 0) {
          rows.push([
            summary.url,
            analyzedAt,
            String(summary.score),
            "",
            "",
            "No issues detected",
            "0",
          ]);
        }
        for (const issue of full.result.issues) {
          rows.push([
            summary.url,
            analyzedAt,
            String(summary.score),
            issue.type,
            issue.severity,
            issue.recommendation,
            String(issue.points),
          ]);
        }
      }

      return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    },
  };
}

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Accepts a bare host or a full URL; returns a normalized origin+path or "". */
export function normalizeUrl(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  const candidate = /^https?:\/\//i.test(raw.trim())
    ? raw.trim()
    : `https://${raw.trim()}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    url.hash = "";
    return url.href;
  } catch {
    return "";
  }
}
