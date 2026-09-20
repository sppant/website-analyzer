export type ProjectStats = {
  analysisCount: number;
  latestScore: number | null;
  firstScore: number | null;
  /** latestScore − firstScore, when at least two analyses exist. */
  scoreChange: number | null;
  lastAnalyzedAt: string | null;
  currentIssueCount: number | null;
};

export type Project = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  stats: ProjectStats;
};

export type ProjectsResponse = {
  projects: Project[];
  /** Projects allowed on the current plan. */
  limit: number;
};

export type IssueRef = {
  type: string;
  severity: "critical" | "important" | "opportunity";
  title: string;
};

export type FieldChange = {
  label: string;
  before: string;
  after: string;
  improved: boolean;
};

export type AnalysisComparison = {
  before: { score: number; url: string };
  after: { score: number; url: string };
  scoreChange: number;
  issues: {
    fixed: IssueRef[];
    remaining: IssueRef[];
    introduced: IssueRef[];
    originalCount: number;
    currentCount: number;
    fixedCount: number;
    newCount: number;
  };
  fields: FieldChange[];
};
