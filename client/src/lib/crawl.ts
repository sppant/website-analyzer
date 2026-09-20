import { apiFetch } from "./api";
import type {
  CompetitorComparison,
  CrawlResult,
  CrawlSummaryRow,
  StoredCrawl,
} from "../types/crawl";

export function runCrawl(
  url: string,
  projectId?: string,
): Promise<{ crawl: CrawlSummaryRow; result: CrawlResult }> {
  return apiFetch("/api/crawl", {
    method: "POST",
    body: JSON.stringify(projectId ? { url, projectId } : { url }),
  });
}

export function runComparison(
  url: string,
  competitorUrl: string,
  projectId?: string,
): Promise<{ id: string; comparison: CompetitorComparison }> {
  return apiFetch("/api/compare", {
    method: "POST",
    body: JSON.stringify(
      projectId ? { url, competitorUrl, projectId } : { url, competitorUrl },
    ),
  });
}

export function getCrawl(id: string): Promise<StoredCrawl> {
  return apiFetch(`/api/crawls/${id}`);
}

export function getComparison(
  id: string,
): Promise<{ id: string; result: CompetitorComparison }> {
  return apiFetch(`/api/comparisons/${id}`);
}

export function getProjectCrawls(
  projectId: string,
): Promise<{ crawls: CrawlSummaryRow[] }> {
  return apiFetch(`/api/projects/${projectId}/crawls`);
}
