import type { Plan } from "./plan";
import type { AnalysisResult } from "./seo";

export type Usage = {
  plan: Plan;
  used: number;
  limit: number;
  remaining: number;
  /** ISO timestamp of the next monthly reset. */
  resetsAt: string;
};

export type AnalysisSummary = {
  id: string;
  url: string;
  score: number;
  statusCode: number;
  projectId: string | null;
  createdAt: string;
};

export type StoredAnalysis = AnalysisSummary & {
  result: AnalysisResult;
};
